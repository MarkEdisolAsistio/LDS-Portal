/* eslint-disable @next/next/no-img-element */
import { NEWS_CATEGORIES, NEWS_CATEGORY_LABELS, type NewsPost } from "@/lib/news";

const input = "w-full rounded border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-50";

// The fields shared by the New post and Edit post screens.
export function NewsFields({ post, disabled = false }: { post?: NewsPost; disabled?: boolean }) {
  return (
    <>
      <label className="block text-sm">
        Title
        <input name="title" required maxLength={160} defaultValue={post?.title} disabled={disabled} className={input} />
      </label>

      <label className="block text-sm">
        Type
        <select name="category" defaultValue={post?.category ?? "news"} disabled={disabled} className={input}>
          {NEWS_CATEGORIES.map((c) => (
            <option key={c} value={c}>{NEWS_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-slate-500">
          News and Update show on News &amp; Updates. Event shows on Events. Article / Blog shows on Blog &amp; Articles.
        </span>
      </label>

      <label className="block text-sm">
        Short summary <span className="text-slate-400">(shown in the list, up to 240 characters)</span>
        <textarea name="summary" rows={2} maxLength={240} defaultValue={post?.summary ?? ""} disabled={disabled} className={input} />
      </label>

      <label className="block text-sm">
        Full text <span className="text-slate-400">(a blank line starts a new paragraph)</span>
        <textarea name="body" rows={12} maxLength={20000} defaultValue={post?.body ?? ""} disabled={disabled} className={input} />
      </label>

      <div className="space-y-2 text-sm">
        <p>Cover photo <span className="text-slate-400">(JPG, PNG or WebP, up to 5 MB)</span></p>
        {post?.cover_url && (
          <div className="flex items-start gap-3">
            <img src={post.cover_url} alt="" className="h-24 w-40 rounded object-cover" />
            <label className="flex items-center gap-2 text-slate-600">
              <input type="checkbox" name="remove_cover" disabled={disabled} /> Remove this photo
            </label>
          </div>
        )}
        <input type="file" name="cover" accept="image/jpeg,image/png,image/webp" disabled={disabled} className="block text-sm" />
        {post?.cover_url && <p className="text-xs text-slate-500">Choosing a new photo replaces the current one.</p>}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_published" defaultChecked={post?.is_published ?? false} disabled={disabled} />
        Show on the public website
      </label>
    </>
  );
}
