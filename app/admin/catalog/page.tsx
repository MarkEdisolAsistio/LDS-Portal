/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { getCategories } from "@/lib/lookups";
import { formatDate } from "@/lib/format";
import { SortHeader, Pager } from "@/components/list-controls";
import { CatalogFilterBar } from "@/components/catalog-controls";
import { compare, hrefWith, paginate, parseParams } from "@/lib/list-filters";

type Row = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  category_id: number;
  is_purchasable: boolean;
  is_published: boolean;
  image_urls: string[] | null;
  updated_at: string;
};

const BASE = "/admin/catalog";
const SORTS = [
  { value: "updated", label: "Last updated" },
  { value: "title", label: "Title" },
  { value: "category", label: "Category" },
  { value: "sale", label: "Sale" },
  { value: "site", label: "Website" },
  { value: "inquiries", label: "Inquiries" },
];

const MESSAGES: Record<string, { ok: boolean; text: string }> = {
  deleted: { ok: true, text: "Product deleted." },
  forbidden: { ok: false, text: "You do not have permission to do that." },
  invalid: { ok: false, text: "Please check the form and try again." },
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const raw = await searchParams;
  const banner = raw.msg ? MESSAGES[raw.msg] : undefined;
  const params = parseParams(raw, SORTS.map((x) => x.value), "updated");

  const me = await getMe();
  if (!me || !can(me, "catalog", "view")) {
    return <p className="text-slate-600">You do not have access to this section.</p>;
  }
  const canEdit = can(me, "catalog", "edit");

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, title, summary, description, category_id, is_purchasable, is_published, image_urls, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5000);
  const all = (data ?? []) as unknown as Row[];

  // How many tickets mention each product (open ones are not Done)
  const seesInquiries = can(me, "inquiries", "view");
  const asked = new Map<string, { total: number; open: number }>();
  if (seesInquiries) {
    const { data: inq } = await supabase.from("inquiries").select("product_id, status").not("product_id", "is", null).limit(20000);
    for (const i of (inq ?? []) as unknown as { product_id: string; status: string }[]) {
      const c = asked.get(i.product_id) ?? { total: 0, open: 0 };
      c.total += 1;
      if (i.status !== "done") c.open += 1;
      asked.set(i.product_id, c);
    }
  }

  const categories = await getCategories();
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const term = params.q.toLowerCase();
  const matches = (r: Row, ignoreSite: boolean) => {
    if (!ignoreSite && params.site && (params.site === "published") !== r.is_published) return false;
    if (params.kind === "buy" && !r.is_purchasable) return false;
    if (params.kind === "build" && r.is_purchasable) return false;
    if (params.category && String(r.category_id) !== params.category) return false;
    if (!term) return true;
    return [r.title, r.summary, r.description].filter(Boolean).join(" ").toLowerCase().includes(term);
  };

  // The numbers on the buttons follow the other filters.
  let countAll = 0;
  let countPublished = 0;
  let countDraft = 0;
  for (const r of all) {
    if (!matches(r, true)) continue;
    countAll += 1;
    if (r.is_published) countPublished += 1;
    else countDraft += 1;
  }

  const sortValue = (r: Row): string | number => {
    switch (params.sort) {
      case "title": return r.title.toLowerCase();
      case "category": return categoryName.get(r.category_id) ?? "";
      case "sale": return r.is_purchasable ? 1 : 0;
      case "site": return r.is_published ? 1 : 0;
      case "inquiries": return asked.get(r.id)?.total ?? 0;
      default: return r.updated_at;
    }
  };
  const sorted = all
    .filter((r) => matches(r, false))
    .sort((a, b) => compare(sortValue(a), sortValue(b), params.dir) || compare(a.updated_at, b.updated_at, "desc"));
  const { slice: rows, pages, current, total } = paginate(sorted, params.page);

  const chip = (value: string, label: string, count: number) => {
    const active = params.site === value;
    return (
      <Link
        key={label}
        href={hrefWith(BASE, params, { site: value })}
        className={`rounded-full border px-3 py-1 text-sm ${
          active ? "border-[#07559a] bg-gradient-to-r from-[#07559a] to-[#007b96] text-white shadow-sm" : "border-[#0d5a89] bg-white text-[#0d5a89] hover:bg-[#e8f3f6]"
        }`}
      >
        {label} {count}
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Catalog</h1>
          <p className="text-slate-600">The trainer modules shown on the public Projects page.</p>
        </div>
        {canEdit && (
          <Link href="/admin/catalog/new" className="rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">
            New product
          </Link>
        )}
      </div>

      {banner && (
        <p className={`rounded p-3 text-sm ${banner.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {banner.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {chip("", "All", countAll)}
        {chip("published", "Published", countPublished)}
        {chip("draft", "Draft", countDraft)}
      </div>

      <CatalogFilterBar base={BASE} params={params} categories={categories} sorts={SORTS} />

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Photo</th>
              <SortHeader base={BASE} params={params} sortKey="title">Title</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="category">Category</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="sale">Sale</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="site">Website</SortHeader>
              {seesInquiries && <SortHeader base={BASE} params={params} sortKey="inquiries">Inquiries</SortHeader>}
              <SortHeader base={BASE} params={params} sortKey="updated">Updated</SortHeader>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                  No products found.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const n = asked.get(r.id);
              return (
                <tr key={r.id} className="border-b border-slate-100 align-middle last:border-0">
                  <td className="px-3 py-2">
                    <div className="h-12 w-16 overflow-hidden rounded bg-slate-100">
                      {r.image_urls?.[0] && (
                        <img src={r.image_urls[0]} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/catalog/${r.id}`} className="font-medium text-blue-700 underline">
                      {r.title}
                    </Link>
                    {r.summary && <p className="max-w-xs truncate text-xs text-slate-500">{r.summary}</p>}
                  </td>
                  <td className="px-3 py-2">{categoryName.get(r.category_id) ?? "-"}</td>
                  <td className="px-3 py-2">{r.is_purchasable ? "Can be bought" : "Build on request"}</td>
                  <td className="px-3 py-2">
                    <span className={r.is_published ? "text-green-700" : "text-slate-400"}>
                      {r.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  {seesInquiries && (
                    <td className="px-3 py-2">
                      {n ? (
                        <Link href={`/admin/inquiries?product=${r.id}`} className="text-blue-700 underline">
                          {n.total}
                          {n.open > 0 && <span className="text-slate-500 no-underline"> ({n.open} open)</span>}
                        </Link>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2 text-slate-500">{formatDate(r.updated_at)}</td>
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
