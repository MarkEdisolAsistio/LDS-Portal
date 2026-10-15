import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/status";
import { STATUS_STYLES } from "@/lib/status-style";
import { KIND_LABELS, CLIENT_TYPE_LABELS, type Kind, type ClientType } from "@/lib/inquiries";
import { getCategories, getStaff } from "@/lib/lookups";
import { formatDate } from "@/lib/format";

type Row = {
  id: string;
  ticket_no: string;
  kind: Kind;
  status: Status;
  owner_id: string | null;
  category_id: number | null;
  custom_spec: string | null;
  created_at: string;
  clients: { name: string; email: string; type: ClientType; organization: string | null } | null;
};

const MESSAGES: Record<string, string> = {
  forbidden: "You do not have permission to do that.",
  invalid: "Please check the form and try again.",
};

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; msg?: string }>;
}) {
  const { status, q, msg } = await searchParams;

  const me = await getMe();
  if (!me || !can(me, "inquiries", "view")) {
    return <p className="text-slate-600">You do not have access to this section.</p>;
  }
  const canEdit = can(me, "inquiries", "edit");

  const supabase = await createClient();
  const { data } = await supabase
    .from("inquiries")
    .select(
      "id, ticket_no, kind, status, owner_id, category_id, custom_spec, created_at, clients(name, email, type, organization)"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  const all = (data ?? []) as unknown as Row[];

  const [categories, staff] = await Promise.all([getCategories(), getStaff()]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const staffName = new Map(staff.map((s) => [s.id, s.name]));

  const counts: Record<string, number> = {};
  for (const r of all) counts[r.status] = (counts[r.status] ?? 0) + 1;

  const term = (q ?? "").trim().toLowerCase();
  const rows = all.filter((r) => {
    if (status && status !== "all" && r.status !== status) return false;
    if (!term) return true;
    const hay = [
      r.ticket_no,
      r.clients?.name,
      r.clients?.email,
      r.clients?.organization,
      r.custom_spec,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(term);
  });

  const chip = (value: string, label: string, count: number) => {
    const active = (status ?? "all") === value;
    const href = `/admin/inquiries?status=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
    return (
      <Link
        key={value}
        href={href}
        className={`rounded-full border px-3 py-1 text-sm ${
          active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white hover:bg-slate-100"
        }`}
      >
        {label} ({count})
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Inquiries and Tickets</h1>
          <p className="text-slate-600">Every inquiry is a ticket. Open one to update it.</p>
        </div>
        {canEdit && (
          <Link href="/admin/inquiries/new" className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">
            New inquiry
          </Link>
        )}
      </div>

      {msg && MESSAGES[msg] && (
        <p className="rounded bg-red-50 p-3 text-sm text-red-700">{MESSAGES[msg]}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {chip("all", "All", all.length)}
        {STATUSES.map((s) => chip(s, STATUS_LABELS[s], counts[s] ?? 0))}
      </div>

      <form className="flex max-w-md gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search ticket, name, email, company"
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button className="rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">Search</button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Ticket</th>
              <th className="px-3 py-2 font-medium">Client</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Owner</th>
              <th className="px-3 py-2 font-medium">Received</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  No inquiries found.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="px-3 py-3">
                  <Link href={`/admin/inquiries/${r.id}`} className="font-medium text-blue-700 underline">
                    {r.ticket_no}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <p>{r.clients?.name ?? "-"}</p>
                  <p className="text-xs text-slate-500">
                    {[r.clients?.organization, r.clients ? CLIENT_TYPE_LABELS[r.clients.type] : null]
                      .filter(Boolean)
                      .join(" - ")}
                  </p>
                </td>
                <td className="px-3 py-3">{r.category_id ? categoryName.get(r.category_id) ?? "-" : "-"}</td>
                <td className="px-3 py-3">{KIND_LABELS[r.kind]}</td>
                <td className="px-3 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${STATUS_STYLES[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td className="px-3 py-3">{r.owner_id ? staffName.get(r.owner_id) ?? "-" : "Unassigned"}</td>
                <td className="px-3 py-3 text-slate-500">{formatDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
