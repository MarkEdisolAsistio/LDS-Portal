"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import {
  CLIENT_TYPES,
  KINDS,
  UUID,
  isStatus,
  parseInquiry,
  saveInquiry,
  type ClientType,
  type Kind,
} from "@/lib/inquiries";
import type { SupabaseClient } from "@supabase/supabase-js";

const LIST = "/admin/inquiries";

function done(path: string, code: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}msg=${code}`);
}

// Only people with EDIT access to Inquiries may change anything.
async function requireEditor() {
  const me = await getMe();
  if (!me || !can(me, "inquiries", "edit")) done(LIST, "forbidden");
  return me;
}

const field = (fd: FormData, key: string, max: number) =>
  String(fd.get(key) ?? "").trim().slice(0, max);

// ---------- Status and owner ----------
export async function updateTicket(formData: FormData) {
  const me = await requireEditor();

  const id = field(formData, "id", 40);
  const status = field(formData, "status", 30);
  const owner = field(formData, "owner_id", 40);
  const page = `${LIST}/${id}`;

  if (!UUID.test(id) || !isStatus(status) || (owner && !UUID.test(owner))) {
    done(LIST, "invalid");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .update({ status, owner_id: owner || null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("updateTicket failed:", error?.message);
    done(page, "error");
  }

  await audit(me.id, "update_ticket", "inquiry", id, { status, owner });
  revalidatePath(LIST);
  done(page, "saved");
}

// ---------- Request details ----------
export async function updateDetails(formData: FormData) {
  const me = await requireEditor();

  const id = field(formData, "id", 40);
  const kind = field(formData, "kind", 20) as Kind;
  const categoryId = Number(field(formData, "category_id", 10));
  const quantity = Number(field(formData, "quantity", 6));
  const page = `${LIST}/${id}`;

  if (
    !UUID.test(id) ||
    !KINDS.includes(kind) ||
    !Number.isInteger(categoryId) ||
    categoryId < 1 ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 10000
  ) {
    done(UUID.test(id) ? page : LIST, "invalid");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .update({
      kind,
      category_id: categoryId,
      quantity,
      custom_spec: field(formData, "custom_spec", 4000) || null,
      notes: field(formData, "notes", 4000) || null,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("updateDetails failed:", error?.message);
    done(page, "error");
  }

  await audit(me.id, "update_inquiry_details", "inquiry", id);
  revalidatePath(LIST);
  done(page, "saved");
}

// ---------- Client information ----------
export async function updateClient(formData: FormData) {
  const me = await requireEditor();

  const inquiryId = field(formData, "inquiry_id", 40);
  const clientId = field(formData, "client_id", 40);
  const name = field(formData, "name", 120);
  const email = field(formData, "email", 200).toLowerCase();
  const clientType = field(formData, "client_type", 20) as ClientType;
  const page = `${LIST}/${inquiryId}`;

  if (
    !UUID.test(inquiryId) ||
    !UUID.test(clientId) ||
    !name ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    !CLIENT_TYPES.includes(clientType)
  ) {
    done(UUID.test(inquiryId) ? page : LIST, "invalid");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({
      name,
      email,
      phone: field(formData, "phone", 40) || null,
      organization: field(formData, "organization", 160) || null,
      type: clientType,
    })
    .eq("id", clientId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("updateClient failed:", error?.message);
    done(page, "error");
  }

  await audit(me.id, "update_client", "client", clientId);
  revalidatePath(LIST);
  done(page, "saved");
}

// ---------- New inquiry entered by an admin ----------
export async function createInquiryAdmin(formData: FormData) {
  const me = await requireEditor();

  const parsed = parseInquiry(formData);
  if (!parsed.ok) done("/admin/inquiries/new", parsed.code);

  const status = field(formData, "status", 30);
  const owner = field(formData, "owner_id", 40);
  if (!isStatus(status) || (owner && !UUID.test(owner))) {
    done("/admin/inquiries/new", "invalid");
  }

  const supabase = await createClient();
  const saved = await saveInquiry(supabase as unknown as SupabaseClient, parsed.data, {
    createdBy: me.id,
    status,
    ownerId: owner || null,
  });
  if (!saved) done("/admin/inquiries/new", "error");

  await audit(me.id, "create_inquiry", "inquiry", saved.id, { ticket: saved.ticketNo });
  revalidatePath(LIST);
  done(`${LIST}/${saved.id}`, "created");
}
