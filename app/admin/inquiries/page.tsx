import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/status";
import { STATUS_STYLES } from "@/lib/status-style";
import { KIND_LABELS, CLIENT_TYPE_LABELS, type InquiryPriority, type Kind, type ClientType } from "@/lib/inquiries";
import { getCategories, getStaff } from "@/lib/lookups";
import { formatDate } from "@/lib/format";
import { DUE_SOON_DAYS, addDays, manilaToday } from "@/lib/sla";
import { FilterBar, QuickChips, SortHeader, Pager } from "@/components/list-controls";
import { ExportMenu } from "@/components/export-menu";
import { compare, hasFilters, hrefWith, manilaDay, paginate, parseParams, refSortKey } from "@/lib/list-filters";

type Row = {
  id: string;
  ticket_no: string;
  kind: Kind;
  status: Status;
  priority: InquiryPriority | null;
  owner_id: string | null;
  category_id: number | null;
  product_id: string | null;
  custom_spec: string | null;
  created_at: string;
  clients: { name: string; email: string; type: ClientType; organization: string | null } | null;
};

const BASE = "/admin/inquiries";
const SORTS = [
  { value: "date", label: "Date received" },
  { value: "ref", label: "Reference no." },
  { value: "client", label: "Client" },
  { value: "category", label: "Category" },
  { value: "kind", label: "Request or buy" },
  { value: "status", label: "Status" },
  { value: "owner", label: "Owner" },
  { value: "due", label: "Due date" },
];

const MESSAGES: Record<string, string> = {
  deleted: "Ticket and its project deleted.",
  forbidden: "You do not have permission to do that.",
  invalid: "Please check the form and try again.",
};

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = await searchParams;
  const msg = raw.msg;
  const params = parseParams(raw, SORTS.map((x) => x.value), "date");

  const me = await getMe();
  if (!me || !can(me, "inquiries", "view")) {
    return <p className="text-slate-600">You do not have access to this section.</p>;
  }
  const canEdit = can(me, "inquiries", "edit");

  const supabase = await createClient();
  const { data } = await supabase
    .from("inquiries")
    .select(
      "id, ticket_no, kind, status, priority, owner_id, category_id, product_id, custom_spec, created_at, clients(name, email, type, organization)"
    )
    .order("created_at", { ascending: false })
    .limit(5000);
  const all = (data ?? []) as unknown as Row[];

  const [categories, staff] = await Promise.all([getCategories(), getStaff()]);
  const projectOf = new Map<string, { id: string; code: string; due: string | null }>();
  const seesProjects = can(me, "projects", "view");
  if (seesProjects) {
    const { data: pj } = await supabase.from("projects").select("id, project_code, inquiry_id, due_date").not("inquiry_id", "is", null);
    for (const p of (pj ?? []) as unknown as { id: string; project_code: string; inquiry_id: string; due_date: string | null }[]) {
      projectOf.set(p.inquiry_id, { id: p.id, code: p.project_code, due: p.due_date });
    }
  }
  // The due date of a ticket is the due date of its project.
  const today = manilaToday();
  const soonEnd = addDays(today, DUE_SOON_DAYS);
  const dueOf = (r: Row) => projectOf.get(r.id)?.due ?? null;
  const isOverdue = (r: Row) => { const d = dueOf(r); return Boolean(d && d < today && r.status !== "done"); };
  const isSoon = (r: Row) => { const d = dueOf(r); return Boolean(d && d >= today && d <= soonEnd && r.status !== "done"); };
  let productTitle: string | null = null;
  if (params.product) {
    const { data: prod } = await supabase.from("products").select("title").eq("id", params.product).maybeSingle();
    productTitle = (prod as unknown as { title: string } | null)?.title ?? null;
  }
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const staffName = new Map(staff.map((s) => [s.id, s.name]));

  const term = params.q.toLowerCase();
  const matches = (r: Row, ignoreStatus: boolean, skip?: "due" | "owner") => {
    if (!ignoreStatus && params.status !== "all" && r.status !== params.status) return false;
    if (params.open && r.status === "done") return false;
    if (skip !== "due") {
      if (params.due === "overdue" && !isOverdue(r)) return false;
      if (params.due === "soon" && !isSoon(r)) return false;
      if (params.due === "none" && dueOf(r)) return false;
    }
    if (params.kind && r.kind !== params.kind) return false;
    if (params.priority && r.priority !== params.priority) return false;
    if (params.product && r.product_id !== params.product) return false;
    if (skip !== "owner" && (params.owner === "none" ? r.owner_id : params.owner && r.owner_id !== params.owner)) return false;
    if (params.category && String(r.category_id ?? "") !== params.category) return false;
    const day = manilaDay(r.created_at);
    if (params.from && day < params.from) return false;
    if (params.to && day > params.to) return false;
    if (!term) return true;
    const hay = [r.ticket_no, r.clients?.name, r.clients?.email, r.clients?.organization, r.custom_spec]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(term);
  };

  // The numbers on the status buttons follow the other filters.
  const counts: Record<string, number> = {};
  let countAll = 0;
  for (const r of all) {
    if (!matches(r, true)) continue;
    countAll += 1;
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }

  const quick = { overdue: 0, soon: 0, unassigned: 0 };
  for (const r of all) {
    if (matches(r, false, "due")) {
      if (isOverdue(r)) quick.overdue += 1;
      if (isSoon(r)) quick.soon += 1;
    }
    if (matches(r, false, "owner") && r.status !== "done" && !r.owner_id) quick.unassigned += 1;
  }

  const sortValue = (r: Row): string | number => {
    switch (params.sort) {
      case "ref": return refSortKey(r.ticket_no);
      case "client": return r.clients?.name ?? "";
      case "category": return r.category_id ? categoryName.get(r.category_id) ?? "" : "";
      case "kind": return KIND_LABELS[r.kind];
      case "status": return STATUSES.indexOf(r.status);
      case "due": return dueOf(r) ?? "9999-12-31";
      case "owner": return r.owner_id ? staffName.get(r.owner_id) ?? "" : "";
      default: return r.created_at;
    }
  };
  const sorted = all
    .filter((r) => matches(r, false))
    .sort((a, b) => compare(sortValue(a), sortValue(b), params.dir) || compare(a.created_at, b.created_at, "desc"));
  const { slice: rows, pages, current, total } = paginate(sorted, params.page);

  const chip = (value: string, label: string, count: number) => {
    const active = params.status === value;
    const href = hrefWith(BASE, params, { status: value });
    return (
      <Link
        key={value}
        href={href}
        className={`rounded-full border px-3 py-1 text-sm ${
          active ? "border-[#07559a] bg-gradient-to-r from-[#07559a] to-[#007b96] text-white shadow-sm" : "border-[#0d5a89] bg-white text-[#0d5a89] hover:bg-[#e8f3f6]"
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ExportMenu
            currentHref={hrefWith(`${BASE}/export`, params, {})}
            allHref={`${BASE}/export?scope=all`}
            currentCount={sorted.length}
            totalCount={all.length}
            hasFilters={hasFilters(params)}
          />
          {canEdit && (
            <Link href="/admin/inquiries/new" className="rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">
              New inquiry
            </Link>
          )}
        </div>
      </div>

      {msg && MESSAGES[msg] && (
        <p className={`rounded p-3 text-sm ${msg === "deleted" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{MESSAGES[msg]}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {chip("all", "All", countAll)}
        {STATUSES.map((s) => chip(s, STATUS_LABELS[s], counts[s] ?? 0))}
      </div>

      {params.product && (
        <p className="flex flex-wrap items-center gap-2 rounded bg-blue-50 p-3 text-sm text-blue-800">
          Showing tickets about: <strong>{productTitle ?? "one product"}</strong>
          <Link href={hrefWith(BASE, params, { product: "" })} className="underline">Show all tickets</Link>
        </p>
      )}

      <QuickChips base={BASE} params={params} counts={quick} showDue={seesProjects} />

      <FilterBar
        base={BASE}
        params={params}
        placeholder="Reference no., name, email, company"
        owners={staff.filter((m) => m.active || m.id === params.owner).map((m) => ({ id: m.id, name: m.name }))}
        categories={categories}
        sorts={SORTS}
        showDue={seesProjects}
      />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <SortHeader base={BASE} params={params} sortKey="ref">Reference no.</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="client">Client</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="category">Category</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="kind">Type</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="status">Status</SortHeader>
              <th className="px-3 py-2 font-medium">Project</th>
              <SortHeader base={BASE} params={params} sortKey="owner">Owner</SortHeader>
              {seesProjects && <SortHeader base={BASE} params={params} sortKey="due">Due</SortHeader>}
              <SortHeader base={BASE} params={params} sortKey="date">Received</SortHeader>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
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
                <td className="px-3 py-3">
                  {projectOf.get(r.id) ? (
                    <Link href={`/admin/projects/${projectOf.get(r.id)!.id}`} className="text-blue-700 underline">
                      {projectOf.get(r.id)!.code}
                    </Link>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-3 py-3">{r.owner_id ? staffName.get(r.owner_id) ?? "-" : "Unassigned"}</td>
                {seesProjects && (
                  <td className="px-3 py-3">
                    {dueOf(r) ? (
                      <span className={isOverdue(r) ? "font-medium text-red-700" : "text-slate-700"}>
                        {new Date(`${dueOf(r)}T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })}
                        {isOverdue(r) ? " (overdue)" : ""}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                )}
                <td className="px-3 py-3 text-slate-500">{formatDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pager base={BASE} params={params} current={current} pages={pages} total={total} />
    </div>
  );
}
