"use client";

import { useEffect, useRef, useState } from "react";

// "Export to Excel" button with two choices: the rows of the current list, or everything.
// The links download a file, so they are plain <a> tags (not Next links).
export function ExportMenu({
  currentHref,
  allHref,
  currentCount,
  totalCount,
  hasFilters,
}: {
  currentHref: string;
  allHref: string;
  currentCount: number;
  totalCount: number;
  hasFilters: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item = "block rounded px-3 py-2 text-left text-sm text-slate-800 hover:bg-[#e8f3f6]";
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded border border-[#0d5a89] px-4 py-0 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m-5-5 5 5 5-5M5 21h14" />
        </svg>
        Export to Excel
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <a role="menuitem" href={currentHref} onClick={() => setOpen(false)} className={item}>
            <span className="font-medium">{hasFilters ? "Current list" : "This list"}</span>
            <span className="block text-xs text-slate-500">
              {currentCount} {currentCount === 1 ? "row" : "rows"}
              {hasFilters ? ", with your filters and sorting (all pages)" : ", all pages"}
            </span>
          </a>
          <a role="menuitem" href={allHref} onClick={() => setOpen(false)} className={item}>
            <span className="font-medium">Everything</span>
            <span className="block text-xs text-slate-500">
              {totalCount} {totalCount === 1 ? "row" : "rows"}, ignoring filters
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
