import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { UUID } from "@/lib/inquiries";
import { formatDate } from "@/lib/format";
import { newsDate, NEWS_CATEGORY_LABELS, PUBLIC_PATH, type NewsPost } from "@/lib/news";
import { NewsFields } from "@/components/news-fields";
import { NewsPreview } from "@/components/news-preview";
import { updatePost, deletePost } from "../actions";

const MESSAGES: Record<string, { ok: boolean; text: string }> = {
  created: { ok: true, text: "Post created." },
  saved: { ok: true, text: "Saved." },
  invalid: { ok: false, text: "Please enter a title and choose a type." },
  forbidden: { ok: false, text: "You do not have permission to do that." },
  bad_type: { ok: false, text: "The cover photo must be JPG, PNG or WebP." },
  too_big: { ok: false, text: "That cover photo is larger than 5 MB." },
  upload_error: { ok: false, text: "The photo upload failed. Run sql/15_news_extras.sql so the news-images storage bucket exists." },
  error: { ok: false, text: "Could not save. Check the terminal for details." },
};

export default async function EditPost({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const { id } = await params;
  const { msg } = await searchParams;
  if (!UUID.test(id)) return notFound();

  const me = await getMe();
  if (!me || !can(me, "news", "view")) return <p className="text-slate-600">You do not have access to this section.</p>;
  const canEdit = can(me, "news", "edit");
  const canDelete = can(me, "news", "full");

  const supabase = await createClient();
  const { data } = await supabase.from("news_posts").select("*").eq("id", id).maybeSingle();
  const post = data as unknown as NewsPost | null;
  if (!post) return notFound();

  const banner = msg ? MESSAGES[msg] : undefined;
  const publicLink = `${PUBLIC_PATH[post.category]}/${post.id}`;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/news" className="text-sm text-slate-500 underline">Back to news</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{post.title}</h1>
          <span className={`rounded-full px-3 py-1 text-sm ${post.is_published ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"}`}>
            {post.is_published ? "Published" : "Draft"}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {NEWS_CATEGORY_LABELS[post.category]} · last updated {formatDate(post.updated_at)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <NewsPreview
            formId="news-form"
            cover={post.cover_url}
            date={newsDate(post.published_at)}
            className="rounded border border-[#0d5a89] px-3 py-1 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]"
          />
          {post.is_published && (
            <Link href={publicLink} target="_blank" className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50">
              Open on website
            </Link>
          )}
        </div>
      </div>

      {banner && (
        <p role="status" className={`rounded p-3 text-sm ${banner.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{banner.text}</p>
      )}

      <form id="news-form" action={updatePost} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <input type="hidden" name="id" value={post.id} />
        <NewsFields post={post} disabled={!canEdit} />
        {canEdit ? (
          <button className="rounded bg-[#0d5a89] px-5 py-2 text-white hover:bg-[#0b446a]">Save changes</button>
        ) : (
          <p className="text-sm text-slate-500">You can view this post but not change it.</p>
        )}
      </form>

      {canDelete && (
        <form action={deletePost} className="rounded-lg border border-red-200 bg-white p-5">
          <input type="hidden" name="id" value={post.id} />
          <h2 className="font-medium text-red-700">Delete this post</h2>
          <p className="mt-1 text-sm text-slate-600">This removes the post and its cover photo for good. To only hide it, untick &quot;Show on the public website&quot; instead.</p>
          <button className="mt-3 rounded border border-red-600 px-4 py-2 text-sm text-red-700 hover:bg-red-50">Delete post</button>
        </form>
      )}
    </div>
  );
}
