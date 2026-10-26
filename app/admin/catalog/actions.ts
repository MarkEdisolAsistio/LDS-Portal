"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMe, can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { UUID } from "@/lib/inquiries";
import {
  BUCKET,
  IMAGE_TYPES,
  MAX_IMAGES,
  MAX_IMAGE_BYTES,
  storagePathFromUrl,
  FILE_BUCKET,
  FILE_TYPES,
  MAX_FILES,
  MAX_FILE_BYTES,
  filePathFromUrl,
} from "@/lib/images";
import { asDocuments, type ProductDocument } from "@/lib/catalog";
import { MAX_VIDEOS, MAX_VIDEO_BYTES, VIDEO_TYPES, asVideos, parseVideoLink, type ProductVideo } from "@/lib/video";

const LIST = "/admin/catalog";

function done(path: string, code: string): never {
  redirect(`${path}?msg=${code}`);
}

async function requireEditor() {
  const me = await getMe();
  if (!me || !can(me, "catalog", "edit")) done(LIST, "forbidden");
  return me;
}

const field = (fd: FormData, key: string, max: number) =>
  String(fd.get(key) ?? "").trim().slice(0, max);

// "one per line" boxes -> lists
function lines(fd: FormData, key: string, maxLines: number, maxLen: number): string[] {
  return String(fd.get(key) ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, maxLines);
}

// "Label: value" per line (the first colon splits it)
function parseSpecs(fd: FormData) {
  return lines(fd, "specs", 40, 200).map((l) => {
    const i = l.indexOf(":");
    return i === -1 ? { label: l, value: "" } : { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
  });
}

function parseProduct(fd: FormData) {
  const title = field(fd, "title", 160);
  const categoryId = Number(field(fd, "category_id", 10));
  if (!title || !Number.isInteger(categoryId) || categoryId < 1) return null;
  return {
    title,
    category_id: categoryId,
    summary: field(fd, "summary", 200) || null,
    description: field(fd, "description", 4000) || null,
    features: lines(fd, "features", 30, 160),
    specs: parseSpecs(fd),
    is_purchasable: fd.get("is_purchasable") === "on",
    is_published: fd.get("is_published") === "on",
  };
}

async function loadImages(productId: string): Promise<string[] | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("image_urls")
    .eq("id", productId)
    .maybeSingle();
  if (!data) return null;
  return (data as unknown as { image_urls: string[] | null }).image_urls ?? [];
}

// ---------- Create ----------
export async function createProduct(formData: FormData) {
  const me = await requireEditor();

  const values = parseProduct(formData);
  if (!values) done(`${LIST}/new`, "invalid");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert(values)
    .select("id")
    .single();
  if (error || !data) {
    console.error("createProduct failed:", error?.message);
    done(`${LIST}/new`, "error");
  }

  const id = (data as unknown as { id: string }).id;
  await audit(me.id, "create_product", "product", id, { title: values.title });
  revalidatePath(LIST);
  done(`${LIST}/${id}`, "created");
}

// ---------- Update ----------
export async function updateProduct(formData: FormData) {
  const me = await requireEditor();

  const id = field(formData, "id", 40);
  const values = parseProduct(formData);
  if (!UUID.test(id)) done(LIST, "invalid");
  const page = `${LIST}/${id}`;
  if (!values) done(page, "invalid");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update(values)
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("updateProduct failed:", error?.message);
    done(page, "error");
  }

  await audit(me.id, "update_product", "product", id);
  revalidatePath(LIST);
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
  done(page, "saved");
}

// ---------- Photos ----------
export async function uploadImage(formData: FormData) {
  const me = await requireEditor();

  const id = field(formData, "id", 40);
  if (!UUID.test(id)) done(LIST, "invalid");
  const page = `${LIST}/${id}`;

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) done(page, "no_file");
  if (!IMAGE_TYPES[file.type]) done(page, "bad_type");
  if (file.size > MAX_IMAGE_BYTES) done(page, "too_big");

  const urls = await loadImages(id);
  if (!urls) done(LIST, "invalid");
  if (urls.length >= MAX_IMAGES) done(page, "too_many");

  const admin = createAdminClient();
  const path = `${id}/${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    console.error("upload failed:", uploadError.message);
    done(page, "upload_error");
  }

  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ image_urls: [...urls, url] })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("saving photo link failed:", error?.message);
    await admin.storage.from(BUCKET).remove([path]); // do not leave a stray file
    done(page, "error");
  }

  await audit(me.id, "add_product_photo", "product", id);
  revalidatePath("/projects");
  revalidatePath("/");
  done(page, "photo_added");
}

export async function removeImage(formData: FormData) {
  const me = await requireEditor();

  const id = field(formData, "id", 40);
  const url = field(formData, "url", 600);
  if (!UUID.test(id)) done(LIST, "invalid");
  const page = `${LIST}/${id}`;

  const urls = await loadImages(id);
  if (!urls || !urls.includes(url)) done(page, "invalid");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ image_urls: urls.filter((u) => u !== url) })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) done(page, "error");

  const path = storagePathFromUrl(url);
  if (path) await createAdminClient().storage.from(BUCKET).remove([path]);

  await audit(me.id, "remove_product_photo", "product", id);
  revalidatePath("/projects");
  revalidatePath("/");
  done(page, "photo_removed");
}

export async function makeCover(formData: FormData) {
  const me = await requireEditor();

  const id = field(formData, "id", 40);
  const url = field(formData, "url", 600);
  if (!UUID.test(id)) done(LIST, "invalid");
  const page = `${LIST}/${id}`;

  const urls = await loadImages(id);
  if (!urls || !urls.includes(url)) done(page, "invalid");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ image_urls: [url, ...urls.filter((u) => u !== url)] })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) done(page, "error");

  await audit(me.id, "set_product_cover", "product", id);
  revalidatePath("/projects");
  revalidatePath("/");
  done(page, "saved");
}

// ---------- Downloadable files ----------
async function loadDocuments(productId: string): Promise<ProductDocument[] | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("documents").eq("id", productId).maybeSingle();
  if (!data) return null;
  return asDocuments((data as unknown as { documents: unknown }).documents);
}

export async function uploadDocument(formData: FormData) {
  const me = await requireEditor();

  const id = field(formData, "id", 40);
  if (!UUID.test(id)) done(LIST, "invalid");
  const page = `${LIST}/${id}`;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) done(page, "no_file");
  const ext = FILE_TYPES[file.type];
  if (!ext) done(page, "bad_file_type");
  if (file.size > MAX_FILE_BYTES) done(page, "file_too_big");

  const docs = await loadDocuments(id);
  if (!docs) done(LIST, "invalid");
  if (docs.length >= MAX_FILES) done(page, "too_many_files");

  const label = field(formData, "label", 120) || file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Download";

  const admin = createAdminClient();
  const path = `${id}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from(FILE_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("file upload failed:", uploadError.message);
    done(page, "file_upload_error");
  }
  const url = admin.storage.from(FILE_BUCKET).getPublicUrl(path).data.publicUrl;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ documents: [...docs, { name: label, url, size: file.size }] })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("saving file link failed:", error?.message);
    await admin.storage.from(FILE_BUCKET).remove([path]);
    done(page, "error");
  }

  await audit(me.id, "add_product_file", "product", id, { name: label });
  revalidatePath(`/projects/${id}`);
  done(page, "file_added");
}

export async function removeDocument(formData: FormData) {
  const me = await requireEditor();

  const id = field(formData, "id", 40);
  const url = field(formData, "url", 600);
  if (!UUID.test(id)) done(LIST, "invalid");
  const page = `${LIST}/${id}`;

  const docs = await loadDocuments(id);
  if (!docs || !docs.some((d) => d.url === url)) done(page, "invalid");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .update({ documents: docs.filter((d) => d.url !== url) })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) done(page, "error");

  const path = filePathFromUrl(url);
  if (path) await createAdminClient().storage.from(FILE_BUCKET).remove([path]);

  await audit(me.id, "remove_product_file", "product", id);
  revalidatePath(`/projects/${id}`);
  done(page, "file_removed");
}

// ---------- Videos ----------
async function loadVideos(productId: string): Promise<ProductVideo[] | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("videos").eq("id", productId).maybeSingle();
  if (!data) return null;
  return asVideos((data as unknown as { videos: unknown }).videos);
}

async function saveVideos(id: string, videos: ProductVideo[]): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").update({ videos }).eq("id", id).select("id").maybeSingle();
  if (error || !data) console.error("saving videos failed:", error?.message);
  return Boolean(!error && data);
}

export async function addVideoLink(formData: FormData) {
  const me = await requireEditor();

  const id = field(formData, "id", 40);
  if (!UUID.test(id)) done(LIST, "invalid");
  const page = `${LIST}/${id}`;

  const parsed = parseVideoLink(field(formData, "link", 300));
  if (!parsed) done(page, "bad_video_link");

  const videos = await loadVideos(id);
  if (!videos) done(LIST, "invalid");
  if (videos.length >= MAX_VIDEOS) done(page, "too_many_videos");

  const title = field(formData, "title", 120) || "Video";
  if (!(await saveVideos(id, [...videos, { kind: parsed.kind, title, url: parsed.url, embed: parsed.embed }]))) done(page, "error");

  await audit(me.id, "add_product_video", "product", id, { kind: parsed.kind });
  revalidatePath(`/projects/${id}`);
  done(page, "video_added");
}

export async function uploadVideo(formData: FormData) {
  const me = await requireEditor();

  const id = field(formData, "id", 40);
  if (!UUID.test(id)) done(LIST, "invalid");
  const page = `${LIST}/${id}`;

  const file = formData.get("video");
  if (!(file instanceof File) || file.size === 0) done(page, "no_file");
  const ext = VIDEO_TYPES[file.type];
  if (!ext) done(page, "bad_video_type");
  if (file.size > MAX_VIDEO_BYTES) done(page, "video_too_big");

  const videos = await loadVideos(id);
  if (!videos) done(LIST, "invalid");
  if (videos.length >= MAX_VIDEOS) done(page, "too_many_videos");

  const title = field(formData, "title", 120) || file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Video";

  const admin = createAdminClient();
  const path = `${id}/videos/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from(FILE_BUCKET)
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("video upload failed:", uploadError.message);
    done(page, "video_upload_error");
  }
  const url = admin.storage.from(FILE_BUCKET).getPublicUrl(path).data.publicUrl;

  if (!(await saveVideos(id, [...videos, { kind: "file", title, url, size: file.size }]))) {
    await admin.storage.from(FILE_BUCKET).remove([path]);
    done(page, "error");
  }

  await audit(me.id, "add_product_video", "product", id, { kind: "file" });
  revalidatePath(`/projects/${id}`);
  done(page, "video_added");
}

export async function removeVideo(formData: FormData) {
  const me = await requireEditor();

  const id = field(formData, "id", 40);
  const url = field(formData, "url", 600);
  if (!UUID.test(id)) done(LIST, "invalid");
  const page = `${LIST}/${id}`;

  const videos = await loadVideos(id);
  const target = videos?.find((v) => v.url === url);
  if (!videos || !target) done(page, "invalid");

  if (!(await saveVideos(id, videos.filter((v) => v.url !== url)))) done(page, "error");

  if (target.kind === "file") {
    const path = filePathFromUrl(target.url);
    if (path) await createAdminClient().storage.from(FILE_BUCKET).remove([path]);
  }

  await audit(me.id, "remove_product_video", "product", id);
  revalidatePath(`/projects/${id}`);
  done(page, "video_removed");
}

// ---------- Delete ----------
export async function deleteProduct(formData: FormData) {
  const me = await getMe();
  if (!me || !can(me, "catalog", "full")) done(LIST, "forbidden");

  const id = field(formData, "id", 40);
  if (!UUID.test(id)) done(LIST, "invalid");

  const urls = (await loadImages(id)) ?? [];
  const docs = (await loadDocuments(id)) ?? [];
  const videoFiles = ((await loadVideos(id)) ?? []).filter((v) => v.kind === "file");

  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    console.error("deleteProduct failed:", error.message);
    // 23503 = still linked to inquiries
    done(`${LIST}/${id}`, error.code === "23503" ? "in_use" : "error");
  }

  const paths = urls.map(storagePathFromUrl).filter((p): p is string => Boolean(p));
  if (paths.length) await createAdminClient().storage.from(BUCKET).remove(paths);
  const filePaths = [...docs, ...videoFiles].map((d) => filePathFromUrl(d.url)).filter((p): p is string => Boolean(p));
  if (filePaths.length) await createAdminClient().storage.from(FILE_BUCKET).remove(filePaths);

  await audit(me.id, "delete_product", "product", id);
  revalidatePath(LIST);
  revalidatePath("/projects");
  revalidatePath("/");
  done(LIST, "deleted");
}
