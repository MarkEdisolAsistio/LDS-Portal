import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { ProductCard } from "@/components/product-card";
import { getCategories } from "@/lib/lookups";
import { getPublishedProducts } from "@/lib/catalog";

export default async function Projects({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; sale?: string }>;
}) {
  const { category, q: qRaw, sale: saleRaw } = await searchParams;
  const q = (qRaw ?? "").trim().slice(0, 80);
  const sale = saleRaw === "buy" || saleRaw === "build" ? saleRaw : "";
  const categoryId = Number(category);
  const activeId = Number.isInteger(categoryId) && categoryId > 0 ? categoryId : undefined;

  const [categories, found] = await Promise.all([
    getCategories(),
    getPublishedProducts({ categoryId: activeId }),
  ]);
  const needle = q.toLowerCase();
  const products = found.filter((p) => {
    if (sale === "buy" && !p.is_purchasable) return false;
    if (sale === "build" && p.is_purchasable) return false;
    if (!needle) return true;
    return [p.title, p.summary, p.description, ...p.features].filter(Boolean).join(" ").toLowerCase().includes(needle);
  });
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  const link = (change: { category?: number | null; sale?: string }) => {
    const qs = new URLSearchParams();
    const cat = "category" in change ? change.category : activeId;
    const sl = "sale" in change ? change.sale : sale;
    if (cat) qs.set("category", String(cat));
    if (sl) qs.set("sale", sl);
    if (q) qs.set("q", q);
    const text = qs.toString();
    return text ? `/projects?${text}` : "/projects";
  };

  const chip = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full border px-3 py-1 text-sm transition-all ${
        active
          ? "border-[#07559a] bg-gradient-to-r from-[#07559a] to-[#007b96] text-white shadow-sm"
          : "border-[#8fc4cc] text-[#07559a] hover:border-[#007b96] hover:bg-[#e8f5f5] active:bg-white active:text-[#07559a] focus-visible:bg-[#e8f5f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07559a]"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <SiteShell>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Projects</h1>
        <p className="mt-2 text-slate-600">
          Choose a module to see details, then buy it or ask us for a custom build.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {chip(link({ category: null }), "All", !activeId)}
          {categories.map((c) => chip(link({ category: c.id }), c.name, activeId === c.id))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {chip(link({ sale: "" }), "Any", !sale)}
          {chip(link({ sale: "buy" }), "Available to buy", sale === "buy")}
          {chip(link({ sale: "build" }), "Built on request", sale === "build")}
        </div>

        <form action="/projects" className="mt-4 flex max-w-md gap-2">
          {activeId && <input type="hidden" name="category" value={activeId} />}
          {sale && <input type="hidden" name="sale" value={sale} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search modules"
            maxLength={80}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">Search</button>
        </form>

        {products.length === 0 ? (
          <p className="mt-10 text-slate-500">{q || sale || activeId ? "No modules match. Try clearing a filter." : "No projects here yet. Check back soon."}</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} categoryName={categoryName.get(p.category_id)} />
            ))}
          </div>
        )}

        <div className="mt-12 rounded-lg bg-slate-50 p-6">
          <h2 className="font-medium">Need something that is not listed?</h2>
          <p className="mt-1 text-sm text-slate-600">
            We can design a customized trainer module for your project.
          </p>
          <Link href="/inquiry?kind=build" className="mt-3 inline-block rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">
            Request a custom build
          </Link>
        </div>
      </main>
    </SiteShell>
  );
}
