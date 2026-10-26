/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { getCategories } from "@/lib/lookups";
import { UUID } from "@/lib/inquiries";
import { MAX_IMAGES, MAX_FILES } from "@/lib/images";
import { asDocuments, asSpecs, asStrings, fileSize } from "@/lib/catalog";
import { STATUS_LABELS, type Status } from "@/lib/status";
import { STATUS_STYLES } from "@/lib/status-style";
import { formatDate } from "@/lib/format";
import { ProductFields } from "@/components/product-fields";
import { ProductPreview } from "@/components/product-preview";
import { FileUploadField } from "@/components/file-upload-field";
import { MAX_VIDEOS, asVideos } from "@/lib/video";
import { updateProduct, uploadImage, removeImage, makeCover, deleteProduct, uploadDocument, removeDocument, addVideoLink, uploadVideo, removeVideo } from "../actions";

type Product = {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  features: unknown;
  specs: unknown;
  documents: unknown;
  videos: unknown;
  category_id: number;
  image_urls: string[] | null;
  is_purchasable: boolean;
  is_published: boolean;
};

const MESSAGES: Record<string, { ok: boolean; text: string }> = {
  created: { ok: true, text: "Product created. Add some photos below." },
  saved: { ok: true, text: "Saved." },
  photo_added: { ok: true, text: "Photo added." },
  photo_removed: { ok: true, text: "Photo removed." },
  invalid: { ok: false, text: "Please check the form and try again." },
  forbidden: { ok: false, text: "You do not have permission to do that." },
  no_file: { ok: false, text: "Choose a file first." },
  bad_type: { ok: false, text: "Photos must be JPG, PNG or WebP." },
  too_big: { ok: false, text: "That photo is larger than 5 MB." },
  too_many: { ok: false, text: `A product can have up to ${MAX_IMAGES} photos.` },
  no_file_chosen: { ok: false, text: "Choose a file first." },
  video_added: { ok: true, text: "Video added." },
  video_removed: { ok: true, text: "Video removed." },
  bad_video_link: { ok: false, text: "That link is not a YouTube or Vimeo video. Paste the address of the video page." },
  bad_video_type: { ok: false, text: "Uploaded videos must be MP4 or WebM." },
  video_too_big: { ok: false, text: "That video is larger than 50 MB. Upload it to YouTube or Vimeo and paste the link instead." },
  too_many_videos: { ok: false, text: `A product can have up to ${MAX_VIDEOS} videos.` },
  video_upload_error: { ok: false, text: "The video upload failed. Check that the product-files storage bucket exists and that the file is under your Supabase file size limit." },
  file_added: { ok: true, text: "File added." },
  file_removed: { ok: true, text: "File removed." },
  bad_file_type: { ok: false, text: "Files must be PDF, Word, Excel, PowerPoint or ZIP." },
  file_too_big: { ok: false, text: "That file is larger than 10 MB." },
  too_many_files: { ok: false, text: `A product can have up to ${MAX_FILES} files.` },
  file_upload_error: { ok: false, text: "The upload failed. Check that the product-files storage bucket exists (run sql/13_catalog_details.sql)." },
  upload_error: { ok: false, text: "The upload failed. Check that the product-images storage bucket exists." },
  in_use: { ok: false, text: "This product is linked to inquiries and cannot be deleted. Untick 'Show on the public website' instead." },
  error: { ok: false, text: "Could not save. Check the terminal for details." },
};

export default async function EditProduct({
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
  if (!me || !can(me, "catalog", "view")) {
    return <p className="text-slate-600">You do not have access to this section.</p>;
  }
  const canEdit = can(me, "catalog", "edit");
  const canDelete = can(me, "catalog", "full");

  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  const product = data as unknown as Product | null;
  if (!product) return notFound();

  const categories = await getCategories();
  const images = product.image_urls ?? [];
  const documents = asDocuments(product.documents);
  const videos = asVideos(product.videos);

  // Tickets that are about this product
  const seesInquiries = can(me, "inquiries", "view");
  let tickets: { id: string; ticket_no: string; status: Status; created_at: string; clients: { name: string } | null }[] = [];
  let ticketTotal = 0;
  if (seesInquiries) {
    const { data: t, count } = await supabase
      .from("inquiries")
      .select("id, ticket_no, status, created_at, clients(name)", { count: "exact" })
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(8);
    tickets = (t ?? []) as unknown as typeof tickets;
    ticketTotal = count ?? tickets.length;
  }
  const banner = msg ? MESSAGES[msg] : undefined;
  const card = "rounded-lg border border-slate-200 bg-white p-5";
  const button = "rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]";
  const small = "rounded border border-[#0d5a89] px-2 py-1 text-xs text-[#0d5a89] hover:bg-[#e8f3f6]";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/catalog" className="text-sm text-slate-500 underline">
          Back to catalog
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{product.title}</h1>
          <span className={`rounded-full px-3 py-1 text-sm ${product.is_published ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-700"}`}>
            {product.is_published ? "Published" : "Draft"}
          </span>
        </div>
        <div className="mt-2">
          <ProductPreview
            formId="product-form"
            categories={categories}
            images={images}
            videos={videos}
            documents={documents}
            className="rounded border border-[#0d5a89] px-3 py-1 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]"
          />
        </div>
      </div>

      {banner && (
        <p role="status" className={`rounded p-3 text-sm ${banner.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {banner.text}
        </p>
      )}

      <form id="product-form" action={updateProduct} className={`${card} space-y-4`}>
        <input type="hidden" name="id" value={product.id} />
        <fieldset disabled={!canEdit} className="space-y-4">
          <ProductFields
            categories={categories}
            defaults={{
              title: product.title,
              category_id: product.category_id,
              summary: product.summary,
              description: product.description,
              features: asStrings(product.features),
              specs: asSpecs(product.specs),
              is_purchasable: product.is_purchasable,
              is_published: product.is_published,
            }}
          />
        </fieldset>
        {canEdit && <button className={button}>Save changes</button>}
      </form>

      <section className={`${card} space-y-4`}>
        <div>
          <h2 className="font-medium">Photos</h2>
          <p className="text-sm text-slate-500">
            The first photo is the cover. JPG, PNG or WebP, up to 5 MB each, up to {MAX_IMAGES} photos.
          </p>
        </div>

        {images.length === 0 && <p className="text-sm text-slate-500">No photos yet.</p>}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {images.map((url, i) => (
            <div key={url} className="space-y-2">
              <div className="aspect-[4/3] overflow-hidden rounded bg-slate-100">
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center gap-2">
                {i === 0 ? (
                  <span className="text-xs text-green-700">Cover</span>
                ) : (
                  canEdit && (
                    <form action={makeCover}>
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="url" value={url} />
                      <button className={small}>Make cover</button>
                    </form>
                  )
                )}
                {canEdit && (
                  <form action={removeImage}>
                    <input type="hidden" name="id" value={product.id} />
                    <input type="hidden" name="url" value={url} />
                    <button className={small}>Remove</button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>

        {canEdit && images.length < MAX_IMAGES && (
          <form action={uploadImage} className="space-y-3">
            <input type="hidden" name="id" value={product.id} />
            <FileUploadField
              name="image"
              accept="image/jpeg,image/png,image/webp"
              title="Choose a photo to upload"
              hint="JPG, PNG, or WebP · Up to 5 MB"
            />
            <button className={button}>Upload photo</button>
          </form>
        )}
      </section>

      <section className={`${card} space-y-4`}>
        <div>
          <h2 className="font-medium">Videos</h2>
          <p className="text-sm text-slate-500">
            Best way: paste a YouTube or Vimeo link, so the video plays on the product page without using our storage.
            You can also upload an MP4 or WebM file up to 50 MB. Up to {MAX_VIDEOS} videos.
          </p>
        </div>
        {videos.length === 0 && <p className="text-sm text-slate-500">No videos yet.</p>}
        <ul className="divide-y divide-slate-100 text-sm">
          {videos.map((v) => (
            <li key={v.url} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{v.title}</a>
                <span className="text-slate-500">
                  {" - "}
                  {v.kind === "youtube" ? "YouTube" : v.kind === "vimeo" ? "Vimeo" : v.kind === "file" ? `Uploaded file (${fileSize(v.size)})` : "Video"}
                </span>
              </span>
              {canEdit && (
                <form action={removeVideo}>
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="url" value={v.url} />
                  <button className={small}>Remove</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {canEdit && videos.length < MAX_VIDEOS && (
          <div className="space-y-4">
            <form action={addVideoLink} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={product.id} />
              <label className="text-xs text-slate-500">
                Title
                <input name="title" maxLength={120} placeholder="Demo video" className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
              </label>
              <label className="min-w-64 flex-1 text-xs text-slate-500">
                YouTube or Vimeo link
                <input name="link" required maxLength={300} placeholder="https://www.youtube.com/watch?v=..." className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
              </label>
              <button className={button}>Add link</button>
            </form>
            <form action={uploadVideo} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={product.id} />
              <label className="text-xs text-slate-500">
                Title
                <input name="title" maxLength={120} placeholder="Demo video" className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
              </label>
              <FileUploadField
                name="video"
                accept="video/mp4,video/webm"
                title="Choose a video to upload"
                hint="MP4 or WebM · Up to 50 MB"
                className="min-w-[14rem] flex-1"
              />
              <button className={button}>Upload video</button>
            </form>
          </div>
        )}
      </section>

      <section className={`${card} space-y-4`}>
        <div>
          <h2 className="font-medium">Downloads</h2>
          <p className="text-sm text-slate-500">
            Datasheets or manuals shown on the public product page. PDF, Word, Excel, PowerPoint or ZIP, up to 10 MB each, up to {MAX_FILES} files.
          </p>
        </div>
        {documents.length === 0 && <p className="text-sm text-slate-500">No files yet.</p>}
        <ul className="divide-y divide-slate-100 text-sm">
          {documents.map((d) => (
            <li key={d.url} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                {d.name} <span className="text-slate-400 no-underline">({fileSize(d.size)})</span>
              </a>
              {canEdit && (
                <form action={removeDocument}>
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="url" value={d.url} />
                  <button className={small}>Remove</button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {canEdit && documents.length < MAX_FILES && (
          <form action={uploadDocument} className="space-y-3">
            <input type="hidden" name="id" value={product.id} />
            <label className="text-xs text-slate-500">
              Name shown to visitors
              <input name="label" maxLength={120} placeholder="Datasheet" className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-900" />
            </label>
            <FileUploadField
              name="file"
              accept=".pdf,.docx,.xlsx,.pptx,.zip"
              title="Choose a document to upload"
              hint="PDF, Word, Excel, PowerPoint, or ZIP · Up to 10 MB"
            />
            <button className={button}>Upload file</button>
          </form>
        )}
      </section>

      {seesInquiries && (
        <section className={`${card} space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-medium">Inquiries about this product ({ticketTotal})</h2>
            {ticketTotal > 0 && (
              <Link href={`/admin/inquiries?product=${product.id}`} className="text-sm text-blue-700 underline">
                View all in Inquiries
              </Link>
            )}
          </div>
          {tickets.length === 0 ? (
            <p className="text-sm text-slate-500">No one has asked about this product yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {tickets.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <Link href={`/admin/inquiries/${t.id}`} className="font-medium text-blue-700 underline">{t.ticket_no}</Link>
                    <span className="text-slate-500"> - {t.clients?.name ?? "-"} - {formatDate(t.created_at)}</span>
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs ${STATUS_STYLES[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                </li>
              ))}
            </ul>
          )}
          {ticketTotal > tickets.length && (
            <p className="text-xs text-slate-500">Showing the latest {tickets.length}.</p>
          )}
        </section>
      )}

      {canDelete && (
        <section className={card}>
          <details>
            <summary className="cursor-pointer text-sm text-red-700">Delete this product</summary>
            <form action={deleteProduct} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={product.id} />
              <p className="text-sm text-slate-600">
                This removes the product and its photos for good. Products that have inquiries cannot be deleted.
              </p>
              <button className="rounded bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-800">
                Yes, delete it
              </button>
            </form>
          </details>
        </section>
      )}
    </div>
  );
}
