import { STATUSES } from "@/lib/status";
import { INQUIRY_PRIORITIES, KINDS, UUID } from "@/lib/inquiries";

// Shared by the Inquiries and Projects lists: reading the filters from the address bar,
// building links that keep them, and cutting the result into pages.

export const PAGE_SIZE = 25;

export type ListParams = {
  q: string;
  status: string; // "all" or a status
  kind: string; // "" or buy / build
  owner: string; // "" or a staff id or "none" (unassigned)
  priority: string; // "" or an inquiry priority
  category: string; // "" or a category id
  due: string; // "" or overdue / soon / none (projects list)
  open: boolean; // hide Done
  site: string; // "" or published / draft (catalog and news lists)
  type: string; // "" or a news category (news list)
  product: string; // "" or a product id (tickets of one product)
  from: string; // YYYY-MM-DD or ""
  to: string;
  sort: string;
  dir: "asc" | "desc";
  page: number;
};

type Raw = Record<string, string | undefined>;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseParams(raw: Raw, sorts: readonly string[], defaultSort: string): ListParams {
  const status = raw.status ?? "all";
  const sort = sorts.includes(raw.sort ?? "") ? (raw.sort as string) : defaultSort;
  return {
    q: (raw.q ?? "").trim().slice(0, 100),
    status: status === "all" || (STATUSES as readonly string[]).includes(status) ? status : "all",
    kind: (KINDS as readonly string[]).includes(raw.kind ?? "") ? (raw.kind as string) : "",
    owner: raw.owner === "none" || UUID.test(raw.owner ?? "") ? (raw.owner as string) : "",
    priority: (INQUIRY_PRIORITIES as readonly string[]).includes(raw.priority ?? "") ? (raw.priority as string) : "",
    category: /^\d{1,6}$/.test(raw.category ?? "") ? (raw.category as string) : "",
    due: ["overdue", "soon", "none"].includes(raw.due ?? "") ? (raw.due as string) : "",
    open: raw.open === "1",
    type: /^[a-z]{1,20}$/.test(raw.type ?? "") ? (raw.type as string) : "",
    site: raw.site === "published" || raw.site === "draft" ? raw.site : "",
    product: UUID.test(raw.product ?? "") ? (raw.product as string) : "",
    from: DATE.test(raw.from ?? "") ? (raw.from as string) : "",
    to: DATE.test(raw.to ?? "") ? (raw.to as string) : "",
    sort,
    dir: raw.dir === "asc" ? "asc" : raw.dir === "desc" ? "desc" : sort === defaultSort ? "desc" : "asc",
    page: Math.max(1, Math.min(10000, Number(raw.page) || 1)),
  };
}

// A link to the same list with some filters changed. Changing a filter goes back to page 1.
export function hrefWith(base: string, p: ListParams, change: Partial<ListParams>): string {
  const next = { ...p, ...change };
  if (!("page" in change)) next.page = 1;
  const qs = new URLSearchParams();
  if (next.q) qs.set("q", next.q);
  if (next.status && next.status !== "all") qs.set("status", next.status);
  if (next.kind) qs.set("kind", next.kind);
  if (next.owner) qs.set("owner", next.owner);
  if (next.priority) qs.set("priority", next.priority);
  if (next.category) qs.set("category", next.category);
  if (next.due) qs.set("due", next.due);
  if (next.open) qs.set("open", "1");
  if (next.site) qs.set("site", next.site);
  if (next.type) qs.set("type", next.type);
  if (next.product) qs.set("product", next.product);
  if (next.from) qs.set("from", next.from);
  if (next.to) qs.set("to", next.to);
  qs.set("sort", next.sort);
  qs.set("dir", next.dir);
  if (next.page > 1) qs.set("page", String(next.page));
  return `${base}?${qs.toString()}`;
}

export function hasFilters(p: ListParams): boolean {
  return Boolean(p.q || p.kind || p.owner || p.priority || p.category || p.due || p.open || p.site || p.type || p.product || p.from || p.to || p.status !== "all");
}

// Date of a timestamp in Manila, as YYYY-MM-DD
export const manilaDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

// "REQ_2026_0007" -> sortable number (year first, then the running number)
export function refSortKey(ref: string): number {
  const m = /^[A-Z]+_(\d{4})_(\d+)$/.exec(ref);
  return m ? Number(m[1]) * 1_000_000 + Number(m[2]) : 0;
}

export function compare<T extends string | number>(a: T, b: T, dir: "asc" | "desc"): number {
  const r = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "en", { sensitivity: "base" });
  return dir === "asc" ? r : -r;
}

export function paginate<T>(rows: T[], page: number) {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  return { slice: rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE), pages, current, total: rows.length };
}
