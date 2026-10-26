"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMe, can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { UUID } from "@/lib/inquiries";
import { NEWS_BUCKET, MAX_COVER_BYTES, COVER_TYPES, coverPathFromUrl, isNewsCategory } from "@/lib/news";

const LIST = "/admin/news";

function done(path: string, code: string): never {
  redirect(`${path}?msg=${code}`);
}

const field = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").trim().slice(0, max);

function refreshPublic() {
  for (const p of ["/news-updates", "/events", "/blog-articles", "/"]) revalidatePath(p);
}

function parsePost(fd: FormData) {
  const title = field(fd, "title", 160);
  const category = field(fd, "category", 20);
  if (!title || !isNewsCategory(category)) return null;
  return {
    title,
    category,
    summary: field(fd, "summary", 240) || null,
    body: field(fd, "body", 20000) || null,
    is_published: fd.get("is_published") === "on",
  };
}

// Saves a chosen cover photo. Returns its public link, "none" if no file chosen, or an error code.
async function storeCover(fd: FormData, id: string): Promise<{ url: string } | { none: true } | { error: string }> {
  const file = fd.get("cover");
  if (!(file instanceof File) || file.size === 0) return { none: true };
  const ext = COVER_TYPES[file.type];
  if (!ext) return { error: "bad_type" };
  if (file.size > MAX_COVER_BYTES) return { error: "too_big" };
  const admin = createAdminClient();
  const path = `${id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from(NEWS_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) {
    console.error("news cover upload failed:", error.message);
    return { error: "upload_error" };
  }
  return { url: admin.storage.from(NEWS_BUCKET).getPublicUrl(path).data.publicUrl };
}

async function removeCoverFile(url: string | null | undefined) {
  const path = url ? coverPathFromUrl(url) : null;
  if (path) await createAdminClient().storage.from(NEWS_BUCKET).remove([path]);
}

async function requireEditor() {
  const me = await getMe();
  if (!me || !can(me, "news", "edit")) done(LIST, "forbidden");
  return me;
}

export async function createPost(formData: FormData) {
  const me = await requireEditor();
  const values = parsePost(formData);
  if (!values) done(`${LIST}/new`, "invalid");

  const id = crypto.randomUUID();
  const cover = await storeCover(formData, id);
  if ("error" in cover) done(`${LIST}/new`, cover.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_posts")
    .insert({
      id,
      ...values,
      cover_url: "url" in cover ? cover.url : null,
      published_at: values.is_published ? new Date().toISOString() : null,
      author_id: me.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createPost failed:", error?.message);
    if ("url" in cover) await removeCoverFile(cover.url);
    done(`${LIST}/new`, "error");
  }

  await audit(me.id, "create_news", "news", id, { title: values.title });
  revalidatePath(LIST);
  refreshPublic();
  done(`${LIST}/${id}`, "created");
}

export async function updatePost(formData: FormData) {
  const me = await requireEditor();
  const id = field(formData, "id", 40);
  const values = parsePost(formData);
  if (!UUID.test(id)) done(LIST, "invalid");
  const page = `${LIST}/${id}`;
  if (!values) done(page, "invalid");

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("news_posts")
    .select("cover_url, published_at")
    .eq("id", id)
    .maybeSingle();
  if (!current) done(LIST, "invalid");
  const old = current as unknown as { cover_url: string | null; published_at: string | null };

  const cover = await storeCover(formData, id);
  if ("error" in cover) done(page, cover.error);

  let coverUrl = old.cover_url;
  if ("url" in cover) coverUrl = cover.url;
  else if (formData.get("remove_cover") === "on") coverUrl = null;

  const { data, error } = await supabase
    .from("news_posts")
    .update({
      ...values,
      cover_url: coverUrl,
      // the date visitors see is set the first time the post goes live
      published_at: values.is_published ? old.published_at ?? new Date().toISOString() : old.published_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("updatePost failed:", error?.message);
    if ("url" in cover) await removeCoverFile(cover.url);
    done(page, "error");
  }

  if (coverUrl !== old.cover_url) await removeCoverFile(old.cover_url);

  await audit(me.id, "update_news", "news", id);
  revalidatePath(LIST);
  refreshPublic();
  done(page, "saved");
}

export async function deletePost(formData: FormData) {
  const me = await getMe();
  if (!me || !can(me, "news", "full")) done(LIST, "forbidden");
  const id = field(formData, "id", 40);
  if (!UUID.test(id)) done(LIST, "invalid");

  const supabase = await createClient();
  const { data: current } = await supabase.from("news_posts").select("cover_url").eq("id", id).maybeSingle();
  const { error } = await supabase.from("news_posts").delete().eq("id", id);
  if (error) {
    console.error("deletePost failed:", error.message);
    done(`${LIST}/${id}`, "error");
  }
  await removeCoverFile((current as unknown as { cover_url: string | null } | null)?.cover_url);

  await audit(me.id, "delete_news", "news", id);
  revalidatePath(LIST);
  refreshPublic();
  done(LIST, "deleted");
}
