import { createAdminClient } from "@/lib/supabase/admin";
import { asVideos, type ProductVideo } from "@/lib/video";

// Public website reads. They use the server-side key and only return
// products that are marked "published", so drafts never leak.

export type ProductSpec = { label: string; value: string };
export type ProductDocument = { name: string; url: string; size: number };

export type PublicProduct = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  features: string[];
  specs: ProductSpec[];
  documents: ProductDocument[];
  videos: ProductVideo[];
  category_id: number;
  image_urls: string[];
  is_purchasable: boolean;
  created_at: string;
};

const COLUMNS =
  "id, title, summary, description, features, specs, documents, videos, category_id, image_urls, is_purchasable, created_at";

export async function getPublishedProducts(opts?: {
  categoryId?: number;
  limit?: number;
}): Promise<PublicProduct[]> {
  const admin = createAdminClient();
  let query = admin
    .from("products")
    .select(COLUMNS)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (opts?.categoryId) query = query.eq("category_id", opts.categoryId);
  if (opts?.limit) query = query.limit(opts.limit);
  const { data } = await query;
  return (data ?? []).map(normalize);
}

export async function getPublishedProduct(id: string): Promise<PublicProduct | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .select(COLUMNS)
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  return data ? normalize(data) : null;
}

// jsonb columns come back as whatever was stored, so read them defensively.
export function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
export function asSpecs(v: unknown): ProductSpec[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x) => {
    const o = x as { label?: unknown; value?: unknown };
    return typeof o?.label === "string" ? [{ label: o.label, value: typeof o.value === "string" ? o.value : "" }] : [];
  });
}
export function asDocuments(v: unknown): ProductDocument[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x) => {
    const o = x as { name?: unknown; url?: unknown; size?: unknown };
    return typeof o?.name === "string" && typeof o?.url === "string"
      ? [{ name: o.name, url: o.url, size: typeof o.size === "number" ? o.size : 0 }]
      : [];
  });
}
export const fileSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function normalize(row: unknown): PublicProduct {
  const r = row as PublicProduct;
  return { ...r, features: asStrings(r.features), specs: asSpecs(r.specs), documents: asDocuments(r.documents), videos: asVideos(r.videos), image_urls: r.image_urls ?? [] };
}
