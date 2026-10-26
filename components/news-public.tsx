/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { getPublishedPosts, getPublishedPost } from "@/lib/news-public";
import { NEWS_CATEGORY_LABELS, newsDate, type NewsCategory } from "@/lib/news";

// One list page for News & Updates, Events and Blog & Articles.
export async function PostListPage({
  title,
  intro,
  empty,
  categories,
  base,
}: {
  title: string;
  intro: string;
  empty: string;
  categories: NewsCategory[];
  base: string;
}) {
  const posts = await getPublishedPosts(categories);
  return (
    <SiteShell>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-slate-600">{intro}</p>
        {posts.length === 0 ? (
          <p className="mt-8 rounded-lg border border-slate-200 p-6 text-slate-600">{empty}</p>
        ) : (
          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {posts.map((p) => (
              <li key={p.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <Link href={`${base}/${p.id}`} className="block">
                  {p.cover_url && <img src={p.cover_url} alt="" loading="lazy" className="aspect-video w-full object-cover" />}
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {categories.length > 1 && `${NEWS_CATEGORY_LABELS[p.category]} · `}
                      {newsDate(p.published_at ?? p.created_at)}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-[#07559a]">{p.title}</h2>
                    {p.summary && <p className="mt-2 text-slate-700">{p.summary}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </SiteShell>
  );
}

export async function PostDetailPage({
  id,
  categories,
  base,
  backLabel,
}: {
  id: string;
  categories: NewsCategory[];
  base: string;
  backLabel: string;
}) {
  const post = await getPublishedPost(id, categories);
  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href={base} className="text-sm text-slate-500 underline">Back to {backLabel}</Link>
        {!post ? (
          <p className="mt-6 rounded-lg border border-slate-200 p-6 text-slate-600">This post is not available.</p>
        ) : (
          <article className="mt-4">
            {post.cover_url && <img src={post.cover_url} alt="" className="mb-6 max-h-96 w-full rounded-lg object-cover" />}
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {NEWS_CATEGORY_LABELS[post.category]} · {newsDate(post.published_at ?? post.created_at)}
            </p>
            <h1 className="mt-1 text-3xl font-semibold">{post.title}</h1>
            {post.summary && <p className="mt-3 text-lg text-slate-700">{post.summary}</p>}
            {post.body && <div className="mt-6 whitespace-pre-line text-slate-700">{post.body}</div>}
          </article>
        )}
      </main>
    </SiteShell>
  );
}
