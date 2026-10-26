export const NEWS_BUCKET = "news-images";
export const MAX_COVER_BYTES = 5 * 1024 * 1024;
export const COVER_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Which public page shows each kind of post
export const NEWS_CATEGORIES = ["news", "update", "event", "article"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];
export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  news: "News",
  update: "Update",
  event: "Event",
  article: "Article / Blog",
};
export const isNewsCategory = (v: string): v is NewsCategory => (NEWS_CATEGORIES as readonly string[]).includes(v);

export type NewsPost = {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  category: NewsCategory;
  cover_url: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export function coverPathFromUrl(url: string): string | null {
  const marker = `/${NEWS_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  return path && !path.includes("..") ? path : null;
}

export const PUBLIC_PATH: Record<NewsCategory, string> = {
  news: "/news-updates",
  update: "/news-updates",
  event: "/events",
  article: "/blog-articles",
};

export const newsDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", dateStyle: "long" }) : "";
