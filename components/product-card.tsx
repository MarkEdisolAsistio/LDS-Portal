/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { PublicProduct } from "@/lib/catalog";

export function ProductCard({
  product,
  categoryName,
}: {
  product: PublicProduct;
  categoryName?: string;
}) {
  const cover = product.image_urls[0];
  return (
    <Link
      href={`/projects/${product.id}`}
      className="group block overflow-hidden rounded-lg border border-[#8fc4cc] bg-white transition active:border-[#007b96] active:shadow-md hover:border-[#007b96] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07559a]"
    >
      <div className="aspect-[4/3] bg-slate-100">
        {cover ? (
          <img src={cover} alt={product.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No photo yet
          </div>
        )}
      </div>
      <div className="space-y-1 p-4">
        {categoryName && <p className="text-xs uppercase tracking-wide text-slate-500">{categoryName}</p>}
        <h3 className="font-medium group-hover:underline">{product.title}</h3>
        {product.summary && <p className="line-clamp-2 text-sm text-slate-600">{product.summary}</p>}
        <p className="text-sm text-slate-500">
          {product.is_purchasable ? "Available to buy" : "Built on request"}
        </p>
      </div>
    </Link>
  );
}
