import Link from "next/link";
import { hrefWith, hasFilters, type ListParams } from "@/lib/list-filters";

const field = "w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm";

// Search + filters + sorting for the catalog list (a plain GET form, like the other lists).
export function CatalogFilterBar({
  base,
  params,
  categories,
  sorts,
}: {
  base: string;
  params: ListParams;
  categories: { id: number; name: string }[];
  sorts: { value: string; label: string }[];
}) {
  const flip = params.dir === "asc" ? "desc" : "asc";
  return (
    <form action={base} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 lg:max-w-4xl">
      {params.site && <input type="hidden" name="site" value={params.site} />}
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-slate-500 lg:col-span-2">
          Search
          <input name="q" defaultValue={params.q} placeholder="Title, summary, description" className={field} />
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
          Sale
          <select name="kind" defaultValue={params.kind} className={field}>
            <option value="">All</option>
            <option value="buy">Can be bought</option>
            <option value="build">Build on request</option>
          </select>
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
          title={`Switch to ${flip === "asc" ? "ascending" : "descending"} order`}
          className="inline-flex h-9 w-9 items-center justify-center rounded border border-[#0d5a89] text-[#0d5a89] hover:bg-[#e8f3f6]"
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
