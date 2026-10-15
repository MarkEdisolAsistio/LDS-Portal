import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/status";
import { STATUS_STYLES } from "@/lib/status-style";
import {
  CLIENT_TYPES,
  CLIENT_TYPE_LABELS,
  KINDS,
  KIND_LABELS,
  UUID,
  type ClientType,
  type Kind,
} from "@/lib/inquiries";
import { getCategories, getProduct, getStaff } from "@/lib/lookups";
import { formatDate } from "@/lib/format";
import { inputClass } from "@/components/inquiry-fields";
import { updateTicket, updateDetails, updateClient } from "../actions";

type Inquiry = {
  id: string;
  ticket_no: string;
  kind: Kind;
  status: Status;
  owner_id: string | null;
  category_id: number | null;
  product_id: string | null;
  custom_spec: string | null;
  quantity: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  clients: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    organization: string | null;
    type: ClientType;
  } | null;
};

type History = {
  id: number;
  from_status: Status | null;
  to_status: Status;
  changed_by: string | null;
  changed_at: string;
};

const MESSAGES: Record<string, { ok: boolean; text: string }> = {
  saved: { ok: true, text: "Saved." },
  created: { ok: true, text: "Inquiry created." },
  invalid: { ok: false, text: "Please check the form and try again." },
  forbidden: { ok: false, text: "You do not have permission to do that." },
  error: { ok: false, text: "Could not save. Check the terminal for details." },
};

export default async function InquiryDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const { id } = await params;
  const { msg } = await searchParams;
  if (!UUID.test(id)) return notFound();

  const me = await getMe();
  if (!me || !can(me, "inquiries", "view")) {
    return <p className="text-slate-600">You do not have access to this section.</p>;
  }
  const canEdit = can(me, "inquiries", "edit");

  const supabase = await createClient();
  const { data } = await supabase
    .from("inquiries")
    .select("*, clients(id, name, email, phone, organization, type)")
    .eq("id", id)
    .maybeSingle();
  const inquiry = data as unknown as Inquiry | null;
  if (!inquiry) return notFound();

  const { data: historyData } = await supabase
    .from("status_history")
    .select("id, from_status, to_status, changed_by, changed_at")
    .eq("inquiry_id", id)
    .order("changed_at", { ascending: false });
  const history = (historyData ?? []) as unknown as History[];

  const [categories, staff, product] = await Promise.all([
    getCategories(),
    getStaff(),
    inquiry.product_id ? getProduct(inquiry.product_id) : Promise.resolve(null),
  ]);
  const staffName = new Map(staff.map((s) => [s.id, s.name]));
  const ownerChoices = staff.filter((s) => s.active || s.id === inquiry.owner_id);
  const client = inquiry.clients;
  const banner = msg ? MESSAGES[msg] : undefined;

  const card = "rounded-lg border border-slate-200 bg-white p-5";
  const button = "rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700";

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/inquiries" className="text-sm text-slate-500 underline">
          Back to inquiries
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{inquiry.ticket_no}</h1>
          <span className={`rounded-full px-3 py-1 text-sm ${STATUS_STYLES[inquiry.status]}`}>
            {STATUS_LABELS[inquiry.status]}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Received {formatDate(inquiry.created_at)}
          {inquiry.created_by && ` - entered by ${staffName.get(inquiry.created_by) ?? "staff"}`}
          {" - "}Last updated {formatDate(inquiry.updated_at)}
        </p>
      </div>

      {banner && (
        <p role="status" className={`rounded p-3 text-sm ${banner.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {banner.text}
        </p>
      )}

      {/* Status and owner */}
      <form action={updateTicket} className={`${card} grid gap-4 md:grid-cols-3 md:items-end`}>
        <input type="hidden" name="id" value={inquiry.id} />
        <label className="text-sm text-slate-700">
          Status
          <select name="status" defaultValue={inquiry.status} disabled={!canEdit} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Owner
          <select name="owner_id" defaultValue={inquiry.owner_id ?? ""} disabled={!canEdit} className={inputClass}>
            <option value="">Unassigned</option>
            {ownerChoices.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.active ? "" : " (inactive)"}</option>
            ))}
          </select>
        </label>
        {canEdit && <button className={button}>Update ticket</button>}
      </form>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Client */}
        <form action={updateClient} className={`${card} space-y-3`}>
          <h2 className="font-medium">Client</h2>
          <input type="hidden" name="inquiry_id" value={inquiry.id} />
          <input type="hidden" name="client_id" value={client?.id ?? ""} />
          <fieldset disabled={!canEdit} className="space-y-3">
            <label className="block text-sm text-slate-700">
              Name
              <input name="name" required defaultValue={client?.name} className={inputClass} />
            </label>
            <label className="block text-sm text-slate-700">
              Email
              <input name="email" type="email" required defaultValue={client?.email} className={inputClass} />
            </label>
            <label className="block text-sm text-slate-700">
              Phone
              <input name="phone" defaultValue={client?.phone ?? ""} className={inputClass} />
            </label>
            <label className="block text-sm text-slate-700">
              Company or department
              <input name="organization" defaultValue={client?.organization ?? ""} className={inputClass} />
            </label>
            <label className="block text-sm text-slate-700">
              Client type
              <select name="client_type" defaultValue={client?.type ?? "external"} className={inputClass}>
                {CLIENT_TYPES.map((t) => (
                  <option key={t} value={t}>{CLIENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </label>
          </fieldset>
          {canEdit && <button className={button}>Save client</button>}
        </form>

        {/* Request */}
        <form action={updateDetails} className={`${card} space-y-3`}>
          <h2 className="font-medium">Request</h2>
          <input type="hidden" name="id" value={inquiry.id} />
          {product && (
            <p className="rounded bg-blue-50 p-2 text-sm text-blue-800">
              Product: <strong>{product.title}</strong>
            </p>
          )}
          <fieldset disabled={!canEdit} className="space-y-3">
            <label className="block text-sm text-slate-700">
              Request type
              <select name="kind" defaultValue={inquiry.kind} className={inputClass}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>{KIND_LABELS[k]}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-700">
              Module category
              <select name="category_id" defaultValue={inquiry.category_id ?? ""} className={inputClass}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-700">
              Quantity
              <input name="quantity" type="number" min={1} max={10000} required defaultValue={inquiry.quantity} className={inputClass} />
            </label>
            <label className="block text-sm text-slate-700">
              Description
              <textarea name="custom_spec" rows={5} defaultValue={inquiry.custom_spec ?? ""} className={inputClass} />
            </label>
            <label className="block text-sm text-slate-700">
              Notes
              <textarea name="notes" rows={3} defaultValue={inquiry.notes ?? ""} className={inputClass} />
            </label>
          </fieldset>
          {canEdit && <button className={button}>Save request</button>}
        </form>
      </div>

      {/* History */}
      <section className={card}>
        <h2 className="mb-3 font-medium">Status history</h2>
        <ul className="space-y-2 text-sm">
          {history.length === 0 && <li className="text-slate-500">No history yet.</li>}
          {history.map((h) => (
            <li key={h.id} className="flex flex-wrap gap-x-3 text-slate-700">
              <span className="text-slate-500">{formatDate(h.changed_at)}</span>
              <span>
                {h.from_status ? `${STATUS_LABELS[h.from_status]} to ` : "Created as "}
                <strong>{STATUS_LABELS[h.to_status]}</strong>
              </span>
              {h.changed_by && <span className="text-slate-500">by {staffName.get(h.changed_by) ?? "staff"}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} text-sm text-slate-500`}>
        Email conversation for this ticket will appear here once the Inbox is connected.
      </section>
    </div>
  );
}
