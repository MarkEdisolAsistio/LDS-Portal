"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { NEWS_CATEGORY_LABELS, isNewsCategory } from "@/lib/news";

type Draft = { title: string; category: string; summary: string; body: string; published: boolean; cover: string | null };

// A pop-up showing the post the way visitors will see it, using what is typed in the form
// (even if not saved yet). A newly chosen cover photo is shown from the file on the computer.
export function NewsPreview({ formId, cover, date, className }: { formId: string; cover: string | null; date: string; className: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const blob = useRef<string | null>(null);

  const open = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const el = (n: string) => form.elements.namedItem(n) as HTMLInputElement | null;
    if (blob.current) URL.revokeObjectURL(blob.current);
    blob.current = null;
    let image = cover;
    if (el("remove_cover")?.checked) image = null;
    const file = el("cover")?.files?.[0];
    if (file) {
      blob.current = URL.createObjectURL(file);
      image = blob.current;
    }
    const cat = el("category")?.value ?? "news";
    setDraft({
      title: el("title")?.value.trim() || "Untitled post",
      category: isNewsCategory(cat) ? NEWS_CATEGORY_LABELS[cat] : "",
      summary: el("summary")?.value.trim() ?? "",
      body: el("body")?.value.trim() ?? "",
      published: Boolean(el("is_published")?.checked),
      cover: image,
    });
    dialog.current?.showModal();
  };

  return (
    <>
      <button type="button" onClick={open} className={className}>Preview</button>
      <dialog
        ref={dialog}
        aria-label="Post preview"
        onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}
        className="m-auto max-h-[92vh] w-[min(48rem,95vw)] overflow-y-auto rounded-lg bg-white p-0 shadow-xl backdrop:bg-black/50"
      >
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <p className="text-sm text-slate-600"><strong>Preview</strong> - your current edits as visitors will see them. Nothing is saved until you click Save.</p>
          <button type="button" onClick={() => dialog.current?.close()} className="rounded border border-[#0d5a89] px-3 py-1 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]">Close</button>
        </div>
        {draft && (
          <article className="px-6 py-8">
            {!draft.published && (
              <p className="mb-6 rounded bg-amber-50 p-3 text-sm text-amber-800">
                This post is a draft, so visitors cannot see it yet. Tick &quot;Show on the public website&quot; and save to publish it.
              </p>
            )}
            {draft.cover && <img src={draft.cover} alt="" className="mb-6 max-h-80 w-full rounded-lg object-cover" />}
            <p className="text-xs uppercase tracking-wide text-slate-500">{draft.category}{date && ` · ${date}`}</p>
            <h2 className="mt-1 text-3xl font-semibold">{draft.title}</h2>
            {draft.summary && <p className="mt-3 text-lg text-slate-700">{draft.summary}</p>}
            {draft.body && <div className="mt-6 whitespace-pre-line text-slate-700">{draft.body}</div>}
          </article>
        )}
      </dialog>
    </>
  );
}
