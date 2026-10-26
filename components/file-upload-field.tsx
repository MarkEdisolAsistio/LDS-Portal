"use client";

import { useId, useState } from "react";

type FileUploadFieldProps = {
  name: string;
  accept: string;
  title: string;
  hint: string;
  className?: string;
};

export function FileUploadField({
  name,
  accept,
  title,
  hint,
  className = "w-full",
}: FileUploadFieldProps) {
  const id = useId();
  const [fileName, setFileName] = useState("");

  return (
    <label
      htmlFor={id}
      className={`group relative flex min-h-[4.5rem] cursor-pointer items-center gap-3 overflow-hidden rounded-lg border-2 border-dashed border-[#8fc4cc] bg-sky-50 px-3 py-2.5 transition-colors hover:border-[#007b96] hover:bg-cyan-50 focus-within:border-[#07559a] focus-within:ring-2 focus-within:ring-[#07559a]/25 ${className}`}
    >
      <input
        id={id}
        name={name}
        type="file"
        accept={accept}
        required
        aria-describedby={`${id}-hint ${id}-filename`}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? "")}
      />
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#07559a] to-[#007b96] text-white shadow-sm" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15V3m-4 4 4-4 4 4" />
          <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#0b446a]">{title}</span>
        <span id={`${id}-hint`} className="block truncate text-xs text-slate-500">{hint}</span>
        <span id={`${id}-filename`} className="block truncate text-xs text-slate-600" aria-live="polite">
          {fileName || "No file selected yet"}
        </span>
      </span>
      <span className="shrink-0 rounded-md border border-[#8fc4cc] bg-white px-3 py-1.5 text-xs font-medium text-[#07559a] transition-colors group-hover:border-[#007b96] group-hover:bg-[#e8f5f5]">
        Browse
      </span>
    </label>
  );
}
