import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, type Me } from "@/lib/permissions";
import { getCategories, getStaff } from "@/lib/lookups";
import { KIND_LABELS, CLIENT_TYPE_LABELS, INQUIRY_PRIORITY_LABELS, isInquiryPriority, type ClientType, type Kind } from "@/lib/inquiries";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/status";
import { FORM_STATUS_LABELS, type FormStatus } from "@/lib/forms/status";
import { LIFECYCLE } from "@/lib/forms/registry";
import { DUE_SOON_DAYS, addDays, manilaToday } from "@/lib/sla";
import { compare, manilaDay, refSortKey, type ListParams } from "@/lib/list-filters";
import type { Sheet } from "@/lib/xlsx";

// Builds the sheets for the Excel exports of the Inquiries and Projects lists.
// The filtering and sorting below mirrors the two list pages, so "Current list" exports
// exactly the rows you see (all pages of them, not just the one on screen).

const MAX_ROWS = 5000;

export const INQUIRY_SORTS = ["date", "ref", "client", "category", "kind", "status", "owner", "due"];
export const PROJECT_SORTS = ["date", "ref", "title", "client", "kind", "category", "status", "owner", "due"];

export type ExportResult = { sheets: Sheet[]; count: number; total: number };

const filtersText = (p: ListParams, extra: string[]) =>
  [
    p.q && `Search: ${p.q}`,
    p.status !== "all" && `Status: ${STATUS_LABELS[p.status as Status] ?? p.status}`,
    p.kind && `Type: ${KIND_LABELS[p.kind as Kind] ?? p.kind}`,
    p.owner && `Owner: ${p.owner === "none" ? "Unassigned" : "one person"}`,
    p.category && "Category: one category",
    p.due && `Due: ${p.due === "overdue" ? "Overdue" : p.due === "soon" ? `Due in the next ${DUE_SOON_DAYS} days` : "No due date"}`,
    p.open && "Done items hidden",
    p.from && `Received from ${p.from}`,
    p.to && `Received to ${p.to}`,
    ...extra,
  ].filter(Boolean) as string[];

function infoSheet(me: Me, title: string, scopeText: string, filters: string[], count: number, total: number): Sheet {
  return {
    name: "Export info",
    filter: false,
    columns: [{ header: "Item", width: 22 }, { header: "Value", width: 70, type: "wrap" }],
    rows: [
      ["Export", title],
      ["Exported on", new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })],
      ["Exported by", `${me.fullName} (${me.roleName})`],
      ["Rows", scopeText],
      ["Rows exported", count],
      ["Rows in the whole list", total],
      ["Filters", filters.length ? filters.join("; ") : "None"],
      ["Times", "Dates and times are Philippine time"],
    ],
  };
}

// ---------------------------------------------------------------------------
// Inquiries and tickets
// ---------------------------------------------------------------------------
type InqRow = {
  id: string;
  ticket_no: string;
  kind: Kind;
  status: Status;
  priority?: string | null;
  owner_id: string | null;
  category_id: number | null;
  product_id: string | null;
  custom_spec: string | null;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients: { name: string; email: string; phone: string | null; organization: string | null; type: ClientType } | null;
};

export async function buildInquiryExport(me: Me, p: ListParams, all: boolean): Promise<ExportResult> {
  const supabase = await createClient();
  const base = "id, ticket_no, kind, status, owner_id, category_id, product_id, custom_spec, quantity, notes, created_at, updated_at, clients(name, email, phone, organization, type)";
  // "priority" comes from sql/13_inquiry_priority.sql. If that was not applied yet, export without it.
  const withPriority = await supabase.from("inquiries").select(`${base}, priority`).order("created_at", { ascending: false }).limit(MAX_ROWS);
  const rawRows = withPriority.error
    ? (await supabase.from("inquiries").select(base).order("created_at", { ascending: false }).limit(MAX_ROWS)).data ?? []
    : withPriority.data ?? [];
  const rows = rawRows as unknown as InqRow[];
  const hasPriority = rows.some((r) => typeof r.priority === "string");

  const [categories, staff] = await Promise.all([getCategories(), getStaff()]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const staffName = new Map(staff.map((s) => [s.id, s.name]));

  const seesProjects = can(me, "projects", "view");
  const projectOf = new Map<string, { code: string; due: string | null }>();
  if (seesProjects) {
    const { data: pj } = await supabase.from("projects").select("project_code, inquiry_id, due_date").not("inquiry_id", "is", null);
    for (const x of (pj ?? []) as unknown as { project_code: string; inquiry_id: string; due_date: string | null }[]) {
      projectOf.set(x.inquiry_id, { code: x.project_code, due: x.due_date });
    }
  }
  const productIds = [...new Set(rows.map((r) => r.product_id).filter((x): x is string => Boolean(x)))];
  const productTitle = new Map<string, string>();
  if (productIds.length) {
    const { data: prods } = await createAdminClient().from("products").select("id, title").in("id", productIds);
    for (const x of (prods ?? []) as unknown as { id: string; title: string }[]) productTitle.set(x.id, x.title);
  }

  const today = manilaToday();
  const soonEnd = addDays(today, DUE_SOON_DAYS);
  const dueOf = (r: InqRow) => projectOf.get(r.id)?.due ?? null;
  const term = p.q.toLowerCase();
  const matches = (r: InqRow) => {
    if (p.status !== "all" && r.status !== p.status) return false;
    if (p.open && r.status === "done") return false;
    const d = dueOf(r);
    if (p.due === "overdue" && !(d && d < today && r.status !== "done")) return false;
    if (p.due === "soon" && !(d && d >= today && d <= soonEnd && r.status !== "done")) return false;
    if (p.due === "none" && d) return false;
    if (p.kind && r.kind !== p.kind) return false;
    if (p.product && r.product_id !== p.product) return false;
    if (p.owner === "none" ? r.owner_id : p.owner && r.owner_id !== p.owner) return false;
    if (p.category && String(r.category_id ?? "") !== p.category) return false;
    const day = manilaDay(r.created_at);
    if (p.from && day < p.from) return false;
    if (p.to && day > p.to) return false;
    if (!term) return true;
    return [r.ticket_no, r.clients?.name, r.clients?.email, r.clients?.organization, r.custom_spec].filter(Boolean).join(" ").toLowerCase().includes(term);
  };

  const sortValue = (r: InqRow): string | number => {
    switch (p.sort) {
      case "ref": return refSortKey(r.ticket_no);
      case "client": return r.clients?.name ?? "";
      case "category": return r.category_id ? categoryName.get(r.category_id) ?? "" : "";
      case "kind": return KIND_LABELS[r.kind];
      case "status": return STATUSES.indexOf(r.status);
      case "owner": return r.owner_id ? staffName.get(r.owner_id) ?? "" : "";
      case "due": return dueOf(r) ?? "9999-12-31";
      default: return r.created_at;
    }
  };
  const chosen = all
    ? [...rows].sort((a, b) => compare(a.created_at, b.created_at, "desc"))
    : rows.filter(matches).sort((a, b) => compare(sortValue(a), sortValue(b), p.dir) || compare(a.created_at, b.created_at, "desc"));

  const columns: Sheet["columns"] = [
    { header: "Reference no.", width: 16 },
    { header: "Received", type: "datetime", width: 18 },
    { header: "Client", width: 24 },
    { header: "Email", width: 28 },
    { header: "Phone", width: 16 },
    { header: "Company or department", width: 26 },
    { header: "Client is", width: 20 },
    { header: "Type", width: 16 },
    { header: "Category", width: 18 },
    { header: "Product", width: 26 },
    { header: "Quantity", type: "number", width: 10 },
    { header: "Description", type: "wrap", width: 50 },
    { header: "Notes", type: "wrap", width: 40 },
    { header: "Status", width: 20 },
    ...(hasPriority ? [{ header: "Priority", width: 10 }] : []),
    { header: "Owner", width: 20 },
    ...(seesProjects ? [{ header: "Project ref.", width: 16 }, { header: "Due date", type: "date" as const, width: 13 }] : []),
    { header: "Last updated", type: "datetime", width: 18 },
  ];
  const sheetRows = chosen.map((r) => [
    r.ticket_no,
    r.created_at,
    r.clients?.name ?? "",
    r.clients?.email ?? "",
    r.clients?.phone ?? "",
    r.clients?.organization ?? "",
    r.clients ? CLIENT_TYPE_LABELS[r.clients.type] : "",
    KIND_LABELS[r.kind],
    r.category_id ? categoryName.get(r.category_id) ?? "" : "",
    r.product_id ? productTitle.get(r.product_id) ?? "" : "",
    r.quantity,
    r.custom_spec ?? "",
    r.notes ?? "",
    STATUS_LABELS[r.status],
    ...(hasPriority ? [r.priority && isInquiryPriority(r.priority) ? INQUIRY_PRIORITY_LABELS[r.priority] : ""] : []),
    r.owner_id ? staffName.get(r.owner_id) ?? "" : "Unassigned",
    ...(seesProjects ? [projectOf.get(r.id)?.code ?? "", dueOf(r)] : []),
    r.updated_at,
  ]);

  return {
    count: chosen.length,
    total: rows.length,
    sheets: [
      { name: "Inquiries and Tickets", columns, rows: sheetRows },
      infoSheet(me, "Inquiries and Tickets", all ? "Everything" : "Current list (filters applied)", all ? [] : filtersText(p, p.product ? ["One product"] : []), chosen.length, rows.length),
    ],
  };
}

// ---------------------------------------------------------------------------
// Projects and forms
// ---------------------------------------------------------------------------
type ProjRow = {
  id: string;
  status: Status;
  inquiry_id: string | null;
  project_code: string;
  title: string;
  client_type: ClientType;
  client_org: string | null;
  contact_person: string | null;
  contact_info: string | null;
  created_at: string;
  due_date: string | null;
  done_at: string | null;
  inquiries: { kind: Kind; owner_id: string | null; category_id: number | null } | null;
};

export async function buildProjectExport(me: Me, p: ListParams, all: boolean): Promise<ExportResult> {
  const supabase = await createClient();
  const [pRes, fRes] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, status, inquiry_id, project_code, title, client_type, client_org, contact_person, contact_info, created_at, due_date, done_at, inquiries(kind, owner_id, category_id)"
      )
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
    supabase.from("form_records").select("project_id, form_code, status, updated_at"),
  ]);
  const rows = (pRes.data ?? []) as unknown as ProjRow[];
  const records = (fRes.data ?? []) as unknown as { project_id: string; form_code: string; status: FormStatus; updated_at: string }[];

  const [categories, staff] = await Promise.all([getCategories(), getStaff()]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const staffName = new Map(staff.map((s) => [s.id, s.name]));

  const formsOf = new Map<string, Map<string, FormStatus>>();
  for (const r of records) {
    const m = formsOf.get(r.project_id) ?? new Map<string, FormStatus>();
    m.set(r.form_code, r.status);
    formsOf.set(r.project_id, m);
  }
  const allForms = LIFECYCLE.flatMap((s) => s.forms);

  const today = manilaToday();
  const soonEnd = addDays(today, DUE_SOON_DAYS);
  const term = p.q.toLowerCase();
  const matches = (x: ProjRow) => {
    if (p.status !== "all" && x.status !== p.status) return false;
    if (p.open && x.status === "done") return false;
    if (p.due === "overdue" && !(x.due_date && x.due_date < today && x.status !== "done")) return false;
    if (p.due === "soon" && !(x.due_date && x.due_date >= today && x.due_date <= soonEnd && x.status !== "done")) return false;
    if (p.due === "none" && x.due_date) return false;
    if (p.kind && x.inquiries?.kind !== p.kind) return false;
    const owner = x.inquiries?.owner_id ?? null;
    if (p.owner === "none" ? owner : p.owner && owner !== p.owner) return false;
    if (p.category && String(x.inquiries?.category_id ?? "") !== p.category) return false;
    const day = manilaDay(x.created_at);
    if (p.from && day < p.from) return false;
    if (p.to && day > p.to) return false;
    if (!term) return true;
    return [x.project_code, x.title, x.client_org, x.contact_person].filter(Boolean).join(" ").toLowerCase().includes(term);
  };
  const sortValue = (x: ProjRow): string | number => {
    switch (p.sort) {
      case "ref": return refSortKey(x.project_code);
      case "title": return x.title;
      case "client": return x.client_org ?? x.contact_person ?? "";
      case "kind": return x.inquiries ? KIND_LABELS[x.inquiries.kind] : "";
      case "category": return x.inquiries?.category_id ? categoryName.get(x.inquiries.category_id) ?? "" : "";
      case "due": return x.due_date ?? "9999-12-31";
      case "status": return STATUSES.indexOf(x.status);
      case "owner": return x.inquiries?.owner_id ? staffName.get(x.inquiries.owner_id) ?? "" : "";
      default: return x.created_at;
    }
  };
  const chosen = all
    ? [...rows].sort((a, b) => compare(a.created_at, b.created_at, "desc"))
    : rows.filter(matches).sort((a, b) => compare(sortValue(a), sortValue(b), p.dir) || compare(a.created_at, b.created_at, "desc"));

  const projectRows = chosen.map((x) => {
    const done = [...(formsOf.get(x.id)?.values() ?? [])].filter((s) => s === "completed").length;
    const started = formsOf.get(x.id)?.size ?? 0;
    const overdue = x.due_date && x.due_date < today && x.status !== "done";
    return [
      x.project_code,
      x.title,
      x.client_org ?? "",
      x.contact_person ?? "",
      x.contact_info ?? "",
      CLIENT_TYPE_LABELS[x.client_type],
      x.inquiries ? KIND_LABELS[x.inquiries.kind] : "",
      x.inquiries?.category_id ? categoryName.get(x.inquiries.category_id) ?? "" : "",
      STATUS_LABELS[x.status],
      x.inquiries ? (x.inquiries.owner_id ? staffName.get(x.inquiries.owner_id) ?? "" : "Unassigned") : "",
      x.due_date,
      overdue ? "Overdue" : "",
      x.done_at,
      done,
      started - done,
      allForms.length,
      x.created_at,
    ];
  });

  const projectCols: Sheet["columns"] = [
    { header: "Reference no.", width: 16 },
    { header: "Title", width: 34 },
    { header: "Client / company", width: 26 },
    { header: "Contact person", width: 22 },
    { header: "Contact info", width: 26 },
    { header: "Client is", width: 20 },
    { header: "Type", width: 16 },
    { header: "Category", width: 18 },
    { header: "Status", width: 20 },
    { header: "Owner", width: 20 },
    { header: "Due date", type: "date", width: 13 },
    { header: "SLA", width: 10 },
    { header: "Done on", type: "datetime", width: 18 },
    { header: "Forms completed", type: "number", width: 12 },
    { header: "Forms in progress", type: "number", width: 12 },
    { header: "Forms in total", type: "number", width: 12 },
    { header: "Received", type: "datetime", width: 18 },
  ];

  // One row per project, one column per form: its status ("Not started" when it has not been opened)
  const formCols: Sheet["columns"] = [
    { header: "Reference no.", width: 16 },
    { header: "Title", width: 34 },
    { header: "Project status", width: 20 },
    ...allForms.map((f) => ({ header: `${f.code} ${f.title}`, width: 22 })),
  ];
  const formRows = chosen.map((x) => [
    x.project_code,
    x.title,
    STATUS_LABELS[x.status],
    ...allForms.map((f) => {
      const s = formsOf.get(x.id)?.get(f.code);
      return s ? FORM_STATUS_LABELS[s] : "Not started";
    }),
  ]);

  return {
    count: chosen.length,
    total: rows.length,
    sheets: [
      { name: "Projects", columns: projectCols, rows: projectRows },
      { name: "Forms progress", columns: formCols, rows: formRows },
      infoSheet(me, "Projects and Forms", all ? "Everything" : "Current list (filters applied)", all ? [] : filtersText(p, []), chosen.length, rows.length),
    ],
  };
}
