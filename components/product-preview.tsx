"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import type { ProductVideo } from "@/lib/video";

type Doc = { name: string; url: string; size: number };

type Draft = {
  title: string;
  category: string;
  summary: string;
  description: string;
  features: string[];
  specs: { label: string; value: string }[];
  purchasable: boolean;
  published: boolean;
};

const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const lines = (v: string) =>
  v.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

// A pop-up that shows the product page the way visitors will see it, using what is
// currently typed in the form (even if it is not saved yet). It never leaves the admin.
export function ProductPreview({
  formId,
  categories,
  images,
  videos,
  documents,
  className,
}: {
  formId: string;
  categories: { id: number; name: string }[];
  images: string[];
  videos: ProductVideo[];
  documents: Doc[];
  className: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [photo, setPhoto] = useState(0);

  const open = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    // Read the fields directly (FormData would skip them for view-only staff, whose fields are disabled)
    const text = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "";
    const checked = (name: string) => Boolean((form.elements.namedItem(name) as HTMLInputElement | null)?.checked);
    const catId = Number(text("category_id"));
    setDraft({
      title: text("title").trim() || "Untitled product",
      category: categories.find((c) => c.id === catId)?.name ?? "",
      summary: text("summary").trim(),
      description: text("description").trim(),
      features: lines(text("features")),
      specs: lines(text("specs")).map((l) => {
        const i = l.indexOf(":");
        return i === -1 ? { label: l, value: "" } : { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() };
      }),
      purchasable: checked("is_purchasable"),
      published: checked("is_published"),
    });
    setPhoto(0);
    dialog.current?.showModal();
  };

  const main = images[photo];

  return (
    <>
      <button type="button" onClick={open} className={className}>
        Preview
      </button>

      <dialog
        ref={dialog}
        aria-label="Product preview"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close(); // click on the dark area
        }}
        className="m-auto max-h-[92vh] w-[min(64rem,95vw)] overflow-y-auto rounded-lg bg-white p-0 shadow-xl backdrop:bg-black/50"
      >
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <p className="text-sm text-slate-600">
            <strong>Preview</strong> - your current edits as visitors will see them. Nothing is saved until you click Save changes.
          </p>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded border border-[#0d5a89] px-3 py-1 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]"
          >
            Close
          </button>
        </div>

        {draft && (
          <div className="px-6 py-8">
            {!draft.published && (
              <p className="mb-6 rounded bg-amber-50 p-3 text-sm text-amber-800">
                This product is set as a draft, so visitors cannot see it yet. Tick &quot;Show on the public website&quot; and save to publish it.
              </p>
            )}

            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <div className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-100">
                  {main ? (
                    <img src={main} alt={draft.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">No photo yet</div>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {images.map((url, i) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setPhoto(i)}
                        aria-label={`Show photo ${i + 1} of ${images.length}`}
                        aria-current={i === photo}
                        className={`block aspect-square overflow-hidden rounded border-2 ${i === photo ? "border-[#0d5a89]" : "border-transparent hover:border-[#8fc4cc]"}`}
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                {draft.category && <p className="text-xs uppercase tracking-wide text-slate-500">{draft.category}</p>}
                <h2 className="mt-1 text-3xl font-semibold">{draft.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{draft.purchasable ? "Available to buy" : "Built on request"}</p>
                {draft.summary && <p className="mt-4 text-lg text-slate-700">{draft.summary}</p>}
                {draft.description && <p className="mt-4 whitespace-pre-line text-slate-700">{draft.description}</p>}
                <div className="mt-8 flex flex-wrap gap-3">
                  {draft.purchasable && (
                    <span className="rounded bg-[#0d5a89] px-5 py-2 text-white">Buy this module</span>
                  )}
                  <span className="rounded border border-[#0d5a89] px-5 py-2 text-[#0d5a89]">
                    {draft.purchasable ? "Request a custom version" : "Request this build"}
                  </span>
                </div>
              </div>
            </div>

            {(draft.features.length > 0 || draft.specs.length > 0) && (
              <div className="mt-10 grid gap-8 md:grid-cols-2">
                {draft.features.length > 0 && (
                  <section>
                    <h3 className="text-lg font-medium">What it covers</h3>
                    <ul className="mt-3 space-y-2 text-slate-700">
                      {draft.features.map((f, i) => (
                        <li key={`${f}-${i}`} className="flex gap-2">
                          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0d5a89]" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {draft.specs.length > 0 && (
                  <section>
                    <h3 className="text-lg font-medium">Specifications</h3>
                    <table className="mt-3 w-full text-left text-sm">
                      <tbody>
                        {draft.specs.map((s, i) => (
                          <tr key={`${s.label}-${i}`} className="border-b border-slate-200">
                            {s.value ? (
                              <>
                                <th scope="row" className="w-2/5 py-2 pr-3 font-medium text-slate-600">{s.label}</th>
                                <td className="py-2 text-slate-800">{s.value}</td>
                              </>
                            ) : (
                              <td colSpan={2} className="py-2 text-slate-800">{s.label}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                )}
              </div>
            )}

            {videos.length > 0 && (
              <section className="mt-10">
                <h3 className="text-lg font-medium">{videos.length === 1 ? "Video" : "Videos"}</h3>
                <div className="mt-3 grid gap-6 md:grid-cols-2">
                  {videos.map((v) => (
                    <figure key={v.url} className="space-y-2">
                      <div className="aspect-video overflow-hidden rounded-lg bg-black">
                        {v.kind === "file" ? (
                          <video controls preload="metadata" playsInline className="h-full w-full" src={v.url} />
                        ) : (
                          <iframe
                            src={v.embed}
                            title={v.title}
                            loading="lazy"
                            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                            referrerPolicy="strict-origin-when-cross-origin"
                            className="h-full w-full border-0"
                          />
                        )}
                      </div>
                      <figcaption className="text-sm text-slate-600">{v.title}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {documents.length > 0 && (
              <section className="mt-10">
                <h3 className="text-lg font-medium">Downloads</h3>
                <ul className="mt-3 flex flex-wrap gap-3">
                  {documents.map((d) => (
                    <li key={d.url} className="rounded border border-[#0d5a89] px-4 py-2 text-sm text-[#0d5a89]">
                      {d.name} {d.size > 0 && <span className="text-slate-500">({size(d.size)})</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
