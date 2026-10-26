import { createAdminClient } from "@/lib/supabase/admin";
import { UUID } from "@/lib/inquiries";
import type { NewsCategory, NewsPost } from "@/lib/news";

const COLUMNS = "id, title, summary, body, category, cover_url, is_published, published_at, created_at, updated_at";

// Published posts only, newest first. The public pages must not break, so errors give an empty list.
export async function getPublishedPosts(categories: NewsCategory[], limit = 60): Promise<NewsPost[]> {
  try {
    const { data } = await createAdminClient()
      .from("news_posts")
      .select(COLUMNS)
      .eq("is_published", true)
      .in("category", categories)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    return (data ?? []) as unknown as NewsPost[];
  } catch (e) {
    console.error("getPublishedPosts failed:", e);
    return [];
  }
}

export async function getPublishedPost(id: string, categories: NewsCategory[]): Promise<NewsPost | null> {
  if (!UUID.test(id)) return null;
  try {
    const { data } = await createAdminClient()
      .from("news_posts")
      .select(COLUMNS)
      .eq("id", id)
      .eq("is_published", true)
      .in("category", categories)
      .maybeSingle();
    return (data as unknown as NewsPost | null) ?? null;
  } catch (e) {
    console.error("getPublishedPost failed:", e);
    return null;
  }
}
