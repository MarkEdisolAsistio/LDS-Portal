import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUSES, type Status } from "@/lib/status";

export const KINDS = ["buy", "build"] as const;
export type Kind = (typeof KINDS)[number];
export const KIND_LABELS: Record<Kind, string> = {
  buy: "Buy a product",
  build: "Request a build",
};

export const CLIENT_TYPES = ["internal", "external"] as const;
export type ClientType = (typeof CLIENT_TYPES)[number];
export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  internal: "Inside the company",
  external: "Outside the company",
};

export const INQUIRY_PRIORITIES = ["low", "mid", "high"] as const;
export type InquiryPriority = (typeof INQUIRY_PRIORITIES)[number];
export const INQUIRY_PRIORITY_LABELS: Record<InquiryPriority, string> = {
  low: "Low",
  mid: "Mid",
  high: "High",
};

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type InquiryInput = {
  name: string;
  email: string;
  phone: string;
  clientType: ClientType;
  organization: string;
  kind: Kind;
  categoryId: number;
  productId: string;
  quantity: number;
  customSpec: string;
  notes: string;
};

export type ParseResult =
  | { ok: true; data: InquiryInput }
  | { ok: false; code: string };

const text = (fd: FormData, key: string, max: number) =>
  String(fd.get(key) ?? "").trim().slice(0, max);

// Reads and checks the inquiry fields. Used by the public form and the admin form.
export function parseInquiry(fd: FormData): ParseResult {
  const name = text(fd, "name", 120);
  const email = text(fd, "email", 200).toLowerCase();
  const clientType = text(fd, "client_type", 20) as ClientType;
  const kind = text(fd, "kind", 20) as Kind;
  const categoryId = Number(text(fd, "category_id", 10));
  const quantity = Number(text(fd, "quantity", 6) || "1");
  const productId = text(fd, "product_id", 40);
  const phone = text(fd, "phone", 40);
  const organization = text(fd, "organization", 160);
  const customSpec = text(fd, "custom_spec", 4000);

  if (!name || !EMAIL.test(email)) return { ok: false, code: "invalid_contact" };
  if (!phone || !organization) return { ok: false, code: "missing_contact_details" };
  if (!CLIENT_TYPES.includes(clientType) || !KINDS.includes(kind)) {
    return { ok: false, code: "invalid" };
  }
  if (!Number.isInteger(categoryId) || categoryId < 1) {
    return { ok: false, code: "invalid_category" };
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
    return { ok: false, code: "invalid_quantity" };
  }
  if (productId && !UUID.test(productId)) return { ok: false, code: "invalid" };
  if (customSpec.length < 10) {
    return { ok: false, code: "need_description" };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      phone,
      clientType,
      organization,
      kind,
      categoryId,
      productId,
      quantity,
      customSpec,
      notes: text(fd, "notes", 4000),
    },
  };
}

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

export function isInquiryPriority(value: string): value is InquiryPriority {
  return (INQUIRY_PRIORITIES as readonly string[]).includes(value);
}

// Finds the client by email (or creates one), then creates the inquiry.
// The database gives it a ticket number such as REQ_2026_0001 (request) or PO_2026_0001 (buy).
export async function saveInquiry(
  sb: SupabaseClient,
  data: InquiryInput,
  opts: { createdBy: string | null; status?: Status; ownerId?: string | null }
): Promise<{ id: string; ticketNo: string } | null> {
  let clientId: string | null = null;

  const { data: existing } = await sb
    .from("clients")
    .select("id")
    .eq("email", data.email)
    .limit(1)
    .maybeSingle();
  if (existing) clientId = (existing as unknown as { id: string }).id;

  if (!clientId) {
    const { data: created, error } = await sb
      .from("clients")
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        type: data.clientType,
        organization: data.organization || null,
      })
      .select("id")
      .single();
    if (error || !created) {
      console.error("client insert failed:", error?.message);
      return null;
    }
    clientId = (created as unknown as { id: string }).id;
  }

  const { data: inquiry, error } = await sb
    .from("inquiries")
    .insert({
      client_id: clientId,
      kind: data.kind,
      category_id: data.categoryId,
      product_id: data.productId || null,
      custom_spec: data.customSpec || null,
      quantity: data.quantity,
      notes: data.notes || null,
      status: opts.status ?? "new",
      owner_id: opts.ownerId ?? null,
      created_by: opts.createdBy,
    })
    .select("id, ticket_no")
    .single();
  if (error || !inquiry) {
    console.error("inquiry insert failed:", error?.message);
    return null;
  }
  const row = inquiry as unknown as { id: string; ticket_no: string };
  return { id: row.id, ticketNo: row.ticket_no };
}
