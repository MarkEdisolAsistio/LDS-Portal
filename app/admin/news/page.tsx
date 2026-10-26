/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { SortHeader, Pager } from "@/components/list-controls";
import { compare, hrefWith, paginate, parseParams, hasFilters } from "@/lib/list-filters";
import { NEWS_CATEGORIES, NEWS_CATEGORY_LABELS, isNewsCategory, type NewsPost } from "@/lib/news";

const BASE = "/admin/news";
const SORTS = [
  { value: "updated", label: "Last updated" },
  { value: "title", label: "Title" },
  { value: "type", label: "Type" },
  { value: "site", label: "Website" },
  { value: "published", label: "Publish date" },
];

const MESSAGES: Record<string, { ok: boolean; text: string }> = {
  deleted: { ok: true, text: "Post deleted." },
  forbidden: { ok: false, text: "You do not have permission to do that." },
  invalid: { ok: false, text: "Please check the form and try again." },
};

const field = "w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm";

export default async function NewsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const raw = await searchParams;
  const banner = raw.msg ? MESSAGES[raw.msg] : undefined;
  const params = parseParams(raw, SORTS.map((x) => x.value), "updated");

  const me = await getMe();
  if (!me || !can(me, "news", "view")) return <p className="text-slate-600">You do not have access to this section.</p>;
  const canEdit = can(me, "news", "edit");

  const supabase = await createClient();
  const { data } = await supabase
    .from("news_posts")
    .select("id, title, summary, body, category, cover_url, is_published, published_at, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5000);
  const all = (data ?? []) as unknown as NewsPost[];

  const term = params.q.toLowerCase();
  const matches = (r: NewsPost, ignoreSite: boolean) => {
    if (!ignoreSite && params.site && (params.site === "published") !== r.is_published) return false;
    if (params.type && r.category !== params.type) return false;
    if (!term) return true;
    return [r.title, r.summary, r.body].filter(Boolean).join(" ").toLowerCase().includes(term);
  };

  let countAll = 0;
  let countPublished = 0;
  let countDraft = 0;
  for (const r of all) {
    if (!matches(r, true)) continue;
    countAll += 1;
    if (r.is_published) countPublished += 1;
    else countDraft += 1;
  }

  const sortValue = (r: NewsPost): string | number => {
    switch (params.sort) {
      case "title": return r.title.toLowerCase();
      case "type": return NEWS_CATEGORY_LABELS[r.category] ?? r.category;
      case "site": return r.is_published ? 1 : 0;
      case "published": return r.published_at ?? "";
      default: return r.updated_at;
    }
  };
  const sorted = all
    .filter((r) => matches(r, false))
    .sort((a, b) => compare(sortValue(a), sortValue(b), params.dir) || compare(a.updated_at, b.updated_at, "desc"));
  const { slice: rows, pages, current, total } = paginate(sorted, params.page);

  const chip = (value: string, label: string, count: number) => (
    <Link
      key={label}
      href={hrefWith(BASE, params, { site: value })}
      className={`rounded-full border px-3 py-1 text-sm ${
        params.site === value ? "border-[#07559a] bg-gradient-to-r from-[#07559a] to-[#007b96] text-white shadow-sm" : "border-[#0d5a89] bg-white text-[#0d5a89] hover:bg-[#e8f3f6]"
      }`}
    >
      {label} {count}
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Contents</h1>
          <p className="text-slate-600">News, updates, events and articles shown on the public website.</p>
        </div>
        {canEdit && (
          <Link href="/admin/news/new" className="rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">New post</Link>
        )}
      </div>

      {banner && (
        <p className={`rounded p-3 text-sm ${banner.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{banner.text}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {chip("", "All", countAll)}
        {chip("published", "Published", countPublished)}
        {chip("draft", "Draft", countDraft)}
      </div>

      <form action={BASE} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 lg:max-w-4xl">
        {params.site && <input type="hidden" name="site" value={params.site} />}
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-slate-500 lg:col-span-2">
            Search
            <input name="q" defaultValue={params.q} placeholder="Title, summary, text" className={field} />
          </label>
          <label className="text-xs text-slate-500">
            Type
            <select name="type" defaultValue={isNewsCategory(params.type) ? params.type : ""} className={field}>
              <option value="">All</option>
              {NEWS_CATEGORIES.map((c) => (
                <option key={c} value={c}>{NEWS_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-500">
            Sort by
            <select name="sort" defaultValue={params.sort} className={field}>
              {SORTS.map((s) => (
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
            <Link href={`${BASE}?sort=${params.sort}&dir=${params.dir}`} className="rounded border border-[#0d5a89] px-3 py-1.5 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]">
              Clear filters
            </Link>
          )}
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Cover</th>
              <SortHeader base={BASE} params={params} sortKey="title">Title</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="type">Type</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="site">Website</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="published">Published</SortHeader>
              <SortHeader base={BASE} params={params} sortKey="updated">Updated</SortHeader>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No posts found.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 align-middle last:border-0">
                <td className="px-3 py-2">
                  <div className="h-12 w-16 overflow-hidden rounded bg-slate-100">
                    {r.cover_url && <img src={r.cover_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/news/${r.id}`} className="font-medium text-blue-700 underline">{r.title}</Link>
                  {r.summary && <p className="max-w-xs truncate text-xs text-slate-500">{r.summary}</p>}
                </td>
                <td className="px-3 py-2">{NEWS_CATEGORY_LABELS[r.category] ?? r.category}</td>
                <td className="px-3 py-2">
                  <span className={r.is_published ? "text-green-700" : "text-slate-400"}>{r.is_published ? "Published" : "Draft"}</span>
                </td>
                <td className="px-3 py-2 text-slate-500">{r.published_at ? formatDate(r.published_at) : "-"}</td>
                <td className="px-3 py-2 text-slate-500">{formatDate(r.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pager base={BASE} params={params} current={current} pages={pages} total={total} />
    </div>
  );
}
