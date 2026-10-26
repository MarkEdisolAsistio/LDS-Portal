/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { ProductCard } from "@/components/product-card";
import { fileSize, getPublishedProduct, getPublishedProducts } from "@/lib/catalog";
import { getCategories } from "@/lib/lookups";
import { UUID } from "@/lib/inquiries";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ photo?: string }>;
}) {
  const { id } = await params;
  const { photo } = await searchParams;
  if (!UUID.test(id)) return notFound();

  const product = await getPublishedProduct(id);
  if (!product) return notFound();

  const [categories, sameCategory] = await Promise.all([
    getCategories(),
    getPublishedProducts({ categoryId: product.category_id, limit: 4 }),
  ]);
  const category = categories.find((c) => c.id === product.category_id);
  const related = sameCategory.filter((p) => p.id !== product.id).slice(0, 3);

  const images = product.image_urls;
  const n = Number(photo);
  const current = Number.isInteger(n) && n >= 0 && n < images.length ? n : 0;
  const main = images[current];

  return (
    <SiteShell>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link href={category ? `/projects?category=${category.id}` : "/projects"} className="text-sm text-slate-500 underline">
          Back to projects
        </Link>

        <div className="mt-4 grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <div className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
              {main ? (
                <img src={main} alt={product.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  No photo yet
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((url, i) => (
                  <Link
                    key={url}
                    href={`/projects/${product.id}?photo=${i}`}
                    scroll={false}
                    aria-label={`Show photo ${i + 1} of ${images.length}`}
                    aria-current={i === current}
                    className={`block aspect-square overflow-hidden rounded border-2 ${i === current ? "border-[#0d5a89]" : "border-transparent hover:border-[#8fc4cc]"}`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            {category && (
              <p className="text-xs uppercase tracking-wide text-slate-500">{category.name}</p>
            )}
            <h1 className="mt-1 text-3xl font-semibold">{product.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {product.is_purchasable ? "Available to buy" : "Built on request"}
            </p>

            {product.summary && <p className="mt-4 text-lg text-slate-700">{product.summary}</p>}

            {product.description && (
              <p className="mt-4 whitespace-pre-line text-slate-700">{product.description}</p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {product.is_purchasable && (
                <Link
                  href={`/inquiry?product=${product.id}&kind=buy`}
                  className="rounded bg-[#0d5a89] px-5 py-2 text-white hover:bg-[#0b446a]"
                >
                  Buy this module
                </Link>
              )}
              <Link
                href={`/inquiry?product=${product.id}&kind=build`}
                className="rounded border border-[#0d5a89] px-5 py-2 text-[#0d5a89] hover:bg-[#e8f3f6]"
              >
                {product.is_purchasable ? "Request a custom version" : "Request this build"}
              </Link>
            </div>
          </div>
        </div>

        {(product.features.length > 0 || product.specs.length > 0) && (
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {product.features.length > 0 && (
              <section>
                <h2 className="text-lg font-medium">What it covers</h2>
                <ul className="mt-3 space-y-2 text-slate-700">
                  {product.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0d5a89]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {product.specs.length > 0 && (
              <section>
                <h2 className="text-lg font-medium">Specifications</h2>
                <table className="mt-3 w-full text-left text-sm">
                  <tbody>
                    {product.specs.map((s, i) => (
                      <tr key={`${s.label}-${i}`} className="border-b border-slate-200">
                        {s.value ? (
                          <>
                            <th scope="row" className="w-2/5 py-2 pr-3 font-medium text-slate-600">{s.label}</th>
                            <td className="py-2 text-slate-800">{s.value}</td>
                          </>
                        ) : (
                          <td colSpan={2} className="py-2 text-slate-800">{s.label}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>
        )}

        {product.videos.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-medium">{product.videos.length === 1 ? "Video" : "Videos"}</h2>
            <div className="mt-3 grid gap-6 md:grid-cols-2">
              {product.videos.map((v) => (
                <figure key={v.url} className="space-y-2">
                  <div className="aspect-video overflow-hidden rounded-lg bg-black">
                    {v.kind === "file" ? (
                      <video controls preload="metadata" playsInline className="h-full w-full" src={v.url}>
                        Your browser cannot play this video.
                      </video>
                    ) : (
                      <iframe
                        src={v.embed}
                        title={v.title}
                        loading="lazy"
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        className="h-full w-full border-0"
                      />
                    )}
                  </div>
                  <figcaption className="text-sm text-slate-600">{v.title}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {product.documents.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-medium">Downloads</h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {product.documents.map((d) => (
                <li key={d.url}>
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded border border-[#0d5a89] px-4 py-2 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]"
                  >
                    {d.name}
                    {d.size > 0 && <span className="text-slate-500">({fileSize(d.size)})</span>}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-medium">More in {category?.name ?? "this category"}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} categoryName={category?.name} />
              ))}
            </div>
          </section>
        )}
      </main>
    </SiteShell>
  );
}
