import Link from "next/link";
import { FORM_STATUS_STYLES, type FormStatus } from "@/lib/forms/status";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { CLIENT_TYPE_LABELS, KIND_LABELS, type ClientType, type InquiryPriority, type Kind } from "@/lib/inquiries";
import { LIFECYCLE } from "@/lib/forms/registry";
import { formatDate } from "@/lib/format";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/status";
import { STATUS_STYLES } from "@/lib/status-style";
import { getCategories, getStaff } from "@/lib/lookups";
import { FilterBar, QuickChips, SortHeader, Pager } from "@/components/list-controls";
import { DUE_SOON_DAYS, addDays, manilaToday } from "@/lib/sla";
import { ExportMenu } from "@/components/export-menu";
import { compare, hasFilters, hrefWith, manilaDay, paginate, parseParams, refSortKey } from "@/lib/list-filters";

type Project = {
  id: string;
  status: Status;
  inquiry_id: string | null;
  project_code: string;
  title: string;
  client_type: ClientType;
  client_org: string | null;
  contact_person: string | null;
  created_at: string;
  due_date: string | null;
  inquiries: { kind: Kind; owner_id: string | null; category_id: number | null; priority: InquiryPriority | null } | null;
};
type FormRow = { project_id: string; form_code: string; status: FormStatus };

const MESSAGES: { [code: string]: { ok: boolean; text: string } } = {
  deleted: { ok: true, text: "Project and its ticket deleted." },
  forbidden: { ok: false, text: "You do not have permission to do that." },
  invalid: { ok: false, text: "Please check the form and try again." },
  error: { ok: false, text: "Something went wrong. Check the terminal for details." },
};

const BASE = "/admin/projects";
const SORTS = [
  { value: "date", label: "Date received" },
  { value: "ref", label: "Reference no." },
  { value: "title", label: "Title" },
  { value: "client", label: "Client" },
  { value: "kind", label: "Request or buy" },
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
  { value: "owner", label: "Owner" },
  { value: "due", label: "Due date" },
];

const TOTAL_FORMS = LIFECYCLE.reduce((n, s) => n + s.forms.length, 0);

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = await searchParams;
  const msg = raw.msg;
  const params = parseParams(raw, SORTS.map((x) => x.value), "date");
  const banner = msg ? MESSAGES[msg] : undefined;

  const me = await getMe();
  if (!me || !can(me, "projects", "view")) {
    return <p className="text-slate-600">You do not have access to this section.</p>;
  }

  const supabase = await createClient();
  const [projectsRes, recordsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id, status, inquiry_id, project_code, title, client_type, client_org, contact_person, created_at, due_date, inquiries(kind, owner_id, category_id, priority)")
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase.from("form_records").select("project_id, form_code, status"),
  ]);
  const all = (projectsRes.data ?? []) as unknown as Project[];
  const records = (recordsRes.data ?? []) as unknown as FormRow[];

  const progress = new Map<string, { started: number; completed: number; review: number }>();
  for (const r of records) {
    const p = progress.get(r.project_id) ?? { started: 0, completed: 0, review: 0 };
    p.started += 1;
    if (r.status === "completed") p.completed += 1;
    if (r.status === "submitted") p.review += 1;
    progress.set(r.project_id, p);
  }

  const [categories, staff] = await Promise.all([getCategories(), getStaff()]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const staffName = new Map(staff.map((m) => [m.id, m.name]));

  const today = manilaToday();
  const soonEnd = addDays(today, DUE_SOON_DAYS);
  const term = params.q.toLowerCase();
  const isOverdue = (p: Project) => Boolean(p.due_date && p.due_date < today && p.status !== "done");
  const isSoon = (p: Project) => Boolean(p.due_date && p.due_date >= today && p.due_date <= soonEnd && p.status !== "done");
  const matches = (p: Project, ignoreStatus: boolean, skip?: "due" | "owner") => {
    if (!ignoreStatus && params.status !== "all" && p.status !== params.status) return false;
    if (params.open && p.status === "done") return false;
    if (skip !== "due") {
      if (params.due === "overdue" && !isOverdue(p)) return false;
      if (params.due === "soon" && !isSoon(p)) return false;
      if (params.due === "none" && p.due_date) return false;
    }
    if (params.kind && p.inquiries?.kind !== params.kind) return false;
    if (params.priority && p.inquiries?.priority !== params.priority) return false;
    const owner = p.inquiries?.owner_id ?? null;
    if (skip !== "owner" && (params.owner === "none" ? owner : params.owner && owner !== params.owner)) return false;
    if (params.category && String(p.inquiries?.category_id ?? "") !== params.category) return false;
    const day = manilaDay(p.created_at);
    if (params.from && day < params.from) return false;
    if (params.to && day > params.to) return false;
    if (!term) return true;
    return [p.project_code, p.title, p.client_org, p.contact_person].filter(Boolean).join(" ").toLowerCase().includes(term);
  };

  // The numbers on the status buttons follow the other filters.
  const statusCounts: Record<string, number> = {};
  let countAll = 0;
  for (const p of all) {
    if (!matches(p, true)) continue;
    countAll += 1;
    statusCounts[p.status] = (statusCounts[p.status] ?? 0) + 1;
  }

  const quick = { overdue: 0, soon: 0, unassigned: 0 };
  for (const p of all) {
    if (matches(p, false, "due")) {
      if (isOverdue(p)) quick.overdue += 1;
      if (isSoon(p)) quick.soon += 1;
    }
    if (matches(p, false, "owner") && p.status !== "done" && !p.inquiries?.owner_id) quick.unassigned += 1;
  }

  const sortValue = (p: Project): string | number => {
    switch (params.sort) {
      case "ref": return refSortKey(p.project_code);
      case "title": return p.title;
      case "client": return p.client_org ?? p.contact_person ?? "";
      case "kind": return p.inquiries ? KIND_LABELS[p.inquiries.kind] : "";
      case "category": return p.inquiries?.category_id ? categoryName.get(p.inquiries.category_id) ?? "" : "";
      case "due": return p.due_date ?? "9999-12-31";
      case "status": return STATUSES.indexOf(p.status);
      case "owner": return p.inquiries?.owner_id ? staffName.get(p.inquiries.owner_id) ?? "" : "";
      default: return p.created_at;
    }
  };
  const sorted = all
    .filter((p) => matches(p, false))
    .sort((a, b) => compare(sortValue(a), sortValue(b), params.dir) || compare(a.created_at, b.created_at, "desc"));
  const { slice: rows, pages, current, total } = paginate(sorted, params.page);

  const chip = (value: string, label: string, count: number) => {
    const active = params.status === value;
    const href = hrefWith(BASE, params, { status: value });
    return (
      <Link
        key={value}
        href={href}
        className={`rounded-full border px-3 py-1 text-sm ${active ? "border-[#07559a] bg-gradient-to-r from-[#07559a] to-[#007b96] text-white shadow-sm" : "border-[#0d5a89] bg-white text-[#0d5a89] hover:bg-[#e8f3f6]"}`}
      >
        {label} <span className={active ? "text-white/75" : "text-slate-400"}>{count}</span>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Projects and Forms</h1>
          <p className="text-slate-600">Every inquiry gets a project automatically. Manage and edit its forms here.</p>
        </div>
        <ExportMenu
          currentHref={hrefWith(`${BASE}/export`, params, {})}
          allHref={`${BASE}/export?scope=all`}
          currentCount={sorted.length}
          totalCount={all.length}
          hasFilters={hasFilters(params)}
        />
      </div>

      {banner && (
        <p className={`rounded p-3 text-sm ${banner.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {banner.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {chip("all", "All", countAll)}
        {STATUSES.map((s) => chip(s, STATUS_LABELS[s], statusCounts[s] ?? 0))}
      </div>

      <QuickChips base={BASE} params={params} counts={quick} />

      <FilterBar
        base={BASE}
        params={params}
        placeholder="Reference no., title, client"
        owners={staff.filter((m) => m.active || m.id === params.owner).map((m) => ({ id: m.id, name: m.name }))}
        categories={categories}
        sorts={SORTS}
        showDue
      />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <SortHeader base={BASE} params={params} sortKey="ref">Reference no.</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="title">Title</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="client">Client</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="kind">Type</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="category">Category</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="status">Status</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="owner">Owner</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="due">Due</SortHeader>
              <th className="px-3 py-2 font-medium">Forms</th>
              <SortHeader base={BASE} params={params} sortKey="date">Received</SortHeader>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-slate-500">
                  No projects yet. They appear here automatically when an inquiry comes in.
                </td>
              </tr>
            )}
            {rows.map((p) => {
              const pr = progress.get(p.id) ?? { started: 0, completed: 0, review: 0 };
              return (
                <tr key={p.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="px-3 py-3">
                    <Link href={`/admin/projects/${p.id}`} className="font-medium text-blue-700 underline">
                      {p.project_code}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{p.title}</td>
                  <td className="px-3 py-3">
                    <p>{p.client_org ?? p.contact_person ?? "-"}</p>
                    <p className="text-xs text-slate-500">{CLIENT_TYPE_LABELS[p.client_type]}</p>
                  </td>
                  <td className="px-3 py-3">{p.inquiries ? KIND_LABELS[p.inquiries.kind] : "-"}</td>
                  <td className="px-3 py-3">
                    {p.inquiries?.category_id ? categoryName.get(p.inquiries.category_id) ?? "-" : "-"}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs ${STATUS_STYLES[p.status]}`}>{STATUS_LABELS[p.status]}</span>
                  </td>
                  <td className="px-3 py-3">
                    {p.inquiries ? (p.inquiries.owner_id ? staffName.get(p.inquiries.owner_id) ?? "-" : "Unassigned") : "-"}
                  </td>
                  <td className="px-3 py-3">
                    {p.due_date ? (
                      <span className={p.status !== "done" && p.due_date < today ? "font-medium text-red-700" : "text-slate-700"}>
                        {new Date(`${p.due_date}T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })}
                        {p.status !== "done" && p.due_date < today ? " (overdue)" : ""}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {pr.completed} completed, {pr.started - pr.completed} draft
                    <span className="text-xs text-slate-400"> of {TOTAL_FORMS}</span>
                    {pr.review > 0 && (
                      <p className="mt-1">
                        <span className={`rounded-full px-2 py-1 text-xs ${FORM_STATUS_STYLES.submitted}`}>
                          {pr.review} to review from client
                        </span>
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-500">{formatDate(p.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pager base={BASE} params={params} current={current} pages={pages} total={total} />
    </div>
  );
}
