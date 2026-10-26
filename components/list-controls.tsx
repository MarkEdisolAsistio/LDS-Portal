import Link from "next/link";
import { hrefWith, hasFilters, type ListParams } from "@/lib/list-filters";
import { INQUIRY_PRIORITIES, INQUIRY_PRIORITY_LABELS, KINDS, KIND_LABELS } from "@/lib/inquiries";
import { DUE_SOON_DAYS } from "@/lib/sla";

const field = "w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm";

// Search + filters + sorting for a list. It is a plain GET form, so the address of the page
// holds the filters and the page can be bookmarked or shared.
export function FilterBar({
  base,
  params,
  placeholder,
  owners,
  categories,
  sorts,
  showDue = false,
}: {
  base: string;
  params: ListParams;
  placeholder: string;
  owners: { id: string; name: string }[];
  categories: { id: number; name: string }[];
  sorts: { value: string; label: string }[];
  showDue?: boolean;
}) {
  const flip = params.dir === "asc" ? "desc" : "asc";
  return (
    <form action={base} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 lg:max-w-4xl">
      {params.status !== "all" && <input type="hidden" name="status" value={params.status} />}
      {params.product && <input type="hidden" name="product" value={params.product} />}
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-slate-500 lg:col-span-2">
          Search
          <input name="q" defaultValue={params.q} placeholder={placeholder} className={field} />
        </label>
        <label className="text-xs text-slate-500">
          Request or buy
          <select name="kind" defaultValue={params.kind} className={field}>
            <option value="">All</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Owner
          <select name="owner" defaultValue={params.owner} className={field}>
            <option value="">Anyone</option>
            <option value="none">Unassigned</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Category
          <select name="category" defaultValue={params.category} className={field}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Priority
          <select name="priority" defaultValue={params.priority} className={field}>
            <option value="">All</option>
            {INQUIRY_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority === "low" ? "🟡" : priority === "mid" ? "🟠" : "🔴"} {INQUIRY_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </label>
        {showDue && (
          <label className="text-xs text-slate-500">
            Due date
            <select name="due" defaultValue={params.due} className={field}>
              <option value="">Any</option>
              <option value="overdue">Overdue</option>
              <option value="soon">Due in the next {DUE_SOON_DAYS} days</option>
              <option value="none">No due date set</option>
            </select>
          </label>
        )}
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
          <input type="checkbox" name="open" value="1" defaultChecked={params.open} className="h-4 w-4" />
          Hide done
        </label>
        <label className="text-xs text-slate-500">
          Received from
          <input type="date" name="from" defaultValue={params.from} className={field} />
        </label>
        <label className="text-xs text-slate-500">
          Received to
          <input type="date" name="to" defaultValue={params.to} className={field} />
        </label>
        <label className="text-xs text-slate-500">
          Sort by
          <select name="sort" defaultValue={params.sort} className={field}>
            {sorts.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Order
          <select name="dir" defaultValue={params.dir} className={field}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="rounded bg-[#0d5a89] px-3 py-1.5 text-sm text-white hover:bg-[#0b446a]">Apply</button>
        {hasFilters(params) && (
          <Link href={`${base}?sort=${params.sort}&dir=${params.dir}`} className="rounded border border-[#0d5a89] px-3 py-1.5 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]">
            Clear filters
          </Link>
        )}
        <Link
          href={hrefWith(base, params, { dir: flip })}
          aria-label={`${params.dir === "asc" ? "Ascending" : "Descending"} order. Switch to ${flip === "asc" ? "ascending" : "descending"}.`}
          className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#0d5a89] text-[#0d5a89] hover:bg-[#e8f3f6]"
          title={`Switch to ${flip === "asc" ? "ascending" : "descending"} order`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <g transform={params.dir === "asc" ? "translate(0 24) scale(1 -1)" : undefined}>
              <rect x="2" y="3" width="8" height="4" rx="1" />
              <rect x="2" y="10" width="10" height="4" rx="1" />
              <rect x="2" y="17" width="12" height="4" rx="1" />
              <rect x="17.4" y="2" width="2.2" height="14" rx="1.1" />
              <path d="M14.2 14.6a1 1 0 0 1 1.4-.2l2.9 2.6 2.9-2.6a1 1 0 0 1 1.3 1.5l-3.6 4.6a1 1 0 0 1-1.2 0l-3.5-4.6a1 1 0 0 1 .1-1.3z" />
            </g>
          </svg>
        </Link>
      </div>
    </form>
  );
}

// Column title that sorts the list when clicked; click again to reverse.
export function SortHeader({
  base,
  params,
  sortKey,
  children,
}: {
  base: string;
  params: ListParams;
  sortKey: string;
  children: React.ReactNode;
}) {
  const active = params.sort === sortKey;
  const href = hrefWith(base, params, { sort: sortKey, dir: active && params.dir === "asc" ? "desc" : "asc" });
  return (
    <th className="px-3 py-2 font-medium" aria-sort={active ? (params.dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={href} className={`inline-flex items-center gap-1 hover:text-slate-900 ${active ? "text-slate-900" : ""}`}>
        {children}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g opacity={active && params.dir === "desc" ? 0.25 : active ? 1 : 0.55}>
            <path d="M16 15V3" />
            <path d="M11.5 7.5 16 3l4.5 4.5" />
          </g>
          <g opacity={active && params.dir === "asc" ? 0.25 : active ? 1 : 0.55}>
            <path d="M8 9v12" />
            <path d="M3.5 16.5 8 21l4.5-4.5" />
          </g>
        </svg>
      </Link>
    </th>
  );
}

export function Pager({ base, params, current, pages, total }: { base: string; params: ListParams; current: number; pages: number; total: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      <p>{total} {total === 1 ? "result" : "results"}{pages > 1 ? ` - page ${current} of ${pages}` : ""}</p>
      {pages > 1 && (
        <div className="flex gap-2">
          {current > 1 ? (
            <Link href={hrefWith(base, params, { page: current - 1 })} className="rounded border border-[#0d5a89] px-3 py-1 text-[#0d5a89] hover:bg-[#e8f3f6]">Previous</Link>
          ) : (
            <span className="rounded border border-slate-200 px-3 py-1 text-slate-300">Previous</span>
          )}
          {current < pages ? (
            <Link href={hrefWith(base, params, { page: current + 1 })} className="rounded border border-[#0d5a89] px-3 py-1 text-[#0d5a89] hover:bg-[#e8f3f6]">Next</Link>
          ) : (
            <span className="rounded border border-slate-200 px-3 py-1 text-slate-300">Next</span>
          )}
        </div>
      )}
    </div>
  );
}

// One-click shortcuts under the status buttons: Overdue / Due in the next 3 days / Unassigned.
// Click again to switch it off. The numbers follow the other filters.
export function QuickChips({
  base,
  params,
  counts,
  showDue = true,
}: {
  base: string;
  params: ListParams;
  counts: { overdue: number; soon: number; unassigned: number };
  showDue?: boolean;
}) {
  const unassignedOn = params.owner === "none" && params.open;
  const items: { key: string; label: string; count: number; active: boolean; change: Partial<ListParams>; tone: string }[] = [];
  items.push({
    key: "unassigned",
    label: "Unassigned",
    count: counts.unassigned,
    active: unassignedOn,
    change: unassignedOn ? { owner: "" } : { owner: "none", open: true },
    tone: "slate",
  });
  if (showDue) {
    items.push({
      key: "soon",
      label: `Due in the next ${DUE_SOON_DAYS} days`,
      count: counts.soon,
      active: params.due === "soon",
      change: { due: params.due === "soon" ? "" : "soon" },
      tone: "amber",
    });
    items.push({
      key: "overdue",
      label: "Overdue",
      count: counts.overdue,
      active: params.due === "overdue",
      change: { due: params.due === "overdue" ? "" : "overdue" },
      tone: "red",
    });
  }
  const on: Record<string, string> = {
    red: "border-red-700 bg-red-700 text-white",
    amber: "border-amber-600 bg-amber-600 text-white",
    slate: "border-slate-700 bg-slate-700 text-white",
  };
  const off: Record<string, string> = {
    red: "border-red-700 bg-white text-red-700 hover:bg-red-50",
    amber: "border-amber-600 bg-white text-amber-700 hover:bg-amber-50",
    slate: "border-slate-600 bg-white text-slate-700 hover:bg-slate-100",
  };
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Link
          key={i.key}
          href={hrefWith(base, params, i.change)}
          aria-pressed={i.active}
          className={`rounded-full border px-3 py-1 text-sm ${i.active ? on[i.tone] : off[i.tone]}`}
        >
          {i.label} {i.count}
        </Link>
      ))}
    </div>
  );
}
