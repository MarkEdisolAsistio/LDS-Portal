import { PrintButton } from "@/components/forms/print-button";
import { formatDate } from "@/lib/format";
import { getMe, can } from "@/lib/permissions";
import { getStaff } from "@/lib/lookups";
import { createAdminClient } from "@/lib/supabase/admin";
import { INQUIRY_PRIORITY_LABELS, type InquiryPriority } from "@/lib/inquiries";
import { STATUS_LABELS, type Status } from "@/lib/status";

type AuditRow = {
  id: number;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

const input = "mt-1 rounded border border-slate-300 px-3 py-2 text-sm";

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function detailLines(details: Record<string, unknown> | null, staffName: Map<string, string>) {
  if (!details) return [];

  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== "")
    .map(([key, value]) => {
      let displayValue: string;
      if (key === "owner") {
        displayValue = value ? staffName.get(String(value)) ?? "Assigned staff" : "Unassigned";
      } else if (key === "status") {
        displayValue = STATUS_LABELS[String(value) as Status] ?? label(String(value));
      } else if (key === "priority") {
        displayValue = INQUIRY_PRIORITY_LABELS[String(value) as InquiryPriority] ?? label(String(value));
      } else if (typeof value === "boolean") {
        displayValue = value ? "Yes" : "No";
      } else if (typeof value === "object") {
        displayValue = JSON.stringify(value);
      } else {
        displayValue = String(value);
      }
      return `${label(key)}: ${displayValue}`;
    });
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await getMe();
  if (!me || !can(me, "audit", "view")) return <p className="text-slate-600">You do not have access to the Audit Log.</p>;

  const raw = await searchParams;
  const q = (raw.q ?? "").trim().slice(0, 100).toLowerCase();
  const entityFilter = raw.entity ?? "all";
  const staffFilter = raw.user ?? "all";
  const from = /^\d{4}-\d{2}-\d{2}$/.test(raw.from ?? "") ? raw.from : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(raw.to ?? "") ? raw.to : "";
  const admin = createAdminClient();
  const [{ data, error }, staff] = await Promise.all([
    admin.from("audit_log").select("id, user_id, action, entity, entity_id, details, created_at").order("created_at", { ascending: false }).limit(2000),
    getStaff(),
  ]);
  const all = (data ?? []) as unknown as AuditRow[];
  const staffName = new Map(staff.map((person) => [person.id, person.name]));
  const entities = [...new Set(all.map((row) => row.entity))].sort();
  const actions = [...new Set(all.map((row) => row.action))].sort();
  const rows = all.filter((row) => {
    if (entityFilter !== "all" && row.entity !== entityFilter) return false;
    if (staffFilter !== "all" && row.user_id !== staffFilter) return false;
    const day = new Date(row.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (!q) return true;
    return [row.action, row.entity, row.entity_id, staffName.get(row.user_id ?? ""), JSON.stringify(row.details ?? {})].filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 print:max-w-none print:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Audit Log</h1>
          <p className="mt-1 text-sm text-slate-500">A record of administrative changes, exports, and communication actions.</p>
        </div>
        <div className="print:hidden"><PrintButton /></div>
      </div>

      {error && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">Audit storage is not ready. Apply <code>sql/15_audit_log.sql</code> in Supabase.</p>}
      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <label className="text-sm text-slate-700">Search<input name="q" defaultValue={raw.q ?? ""} placeholder="Action, record, details…" className={`${input} block w-56`} /></label>
        <label className="text-sm text-slate-700">Entity<select name="entity" defaultValue={entityFilter} className={`${input} block w-44`}><option value="all">All entities</option>{entities.map((entity) => <option key={entity} value={entity}>{label(entity)}</option>)}</select></label>
        <label className="text-sm text-slate-700">Staff<select name="user" defaultValue={staffFilter} className={`${input} block w-48`}><option value="all">All staff</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
        <label className="text-sm text-slate-700">From<input type="date" name="from" defaultValue={from} className={`${input} block`} /></label>
        <label className="text-sm text-slate-700">To<input type="date" name="to" defaultValue={to} className={`${input} block`} /></label>
        <button className="rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">Filter</button>
        <a href="/admin/audit" className="px-2 py-2 text-sm text-slate-500 underline">Clear</a>
      </form>

      <div className="flex flex-wrap gap-3 text-sm text-slate-600"><span className="rounded-full bg-slate-100 px-3 py-1">Showing {rows.length} of {all.length}</span><span className="rounded-full bg-slate-100 px-3 py-1">Available actions: {actions.length}</span></div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500"><tr><th className="px-3 py-3 font-medium">When</th><th className="px-3 py-3 font-medium">Staff</th><th className="px-3 py-3 font-medium">Action</th><th className="px-3 py-3 font-medium">Entity</th><th className="px-3 py-3 font-medium">Record</th><th className="px-3 py-3 font-medium">Details</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No audit entries found.</td></tr>}
            {rows.map((row) => <tr key={row.id} className="border-b border-slate-100 align-top last:border-0"><td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(row.created_at)}</td><td className="px-3 py-3">{staffName.get(row.user_id ?? "") ?? "System / removed staff"}</td><td className="px-3 py-3 font-medium">{label(row.action)}</td><td className="px-3 py-3">{label(row.entity)}</td><td className="max-w-48 break-all px-3 py-3 font-mono text-xs text-slate-600">{row.entity_id}</td><td className="max-w-96 break-words px-3 py-3 text-xs text-slate-600">{detailLines(row.details, staffName).length ? detailLines(row.details, staffName).map((line) => <div key={line}>{line}</div>) : "-"}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
