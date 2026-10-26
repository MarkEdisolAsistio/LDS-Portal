import { SiteShell } from "@/components/site-shell";
import { ProductCard } from "@/components/product-card";
import Link from "next/link";
import { searchSiteContent } from "@/lib/site-search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const results = query ? await searchSiteContent(query) : [];

  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold">Search results</h1>
        {query ? (
          <>
            <p className="mt-2 text-slate-600">
              Results for <span className="font-medium text-slate-900">{query}</span>
            </p>
            {results.length ? (
              <ul className="mt-6 space-y-4">
                {results.map((result) => (
                  <li key={`${result.type}:${result.href}`}>
                    {result.type === "product" ? (
                      <ProductCard
                        product={result.product}
                        categoryName={result.categoryName}
                      />
                    ) : (
                      <Link
                        href={result.href}
                        className="block rounded-lg border border-[#8fc4cc] p-4 transition-colors hover:border-[#007b96] hover:bg-[#f2f9fa]"
                      >
                        <span className="font-semibold text-[#07559a]">
                          {result.title}
                        </span>
                        <span className="mt-1 block text-sm text-slate-600">
                          {result.description}
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-slate-600">
                No results matched your search. Try another word or phrase.
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-slate-600">
            Enter a word or phrase to search pages and published products.
          </p>
        )}
      </main>
    </SiteShell>
  );
}
