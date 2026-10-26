"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]"
    >
      Print / Save as PDF
    </button>
  );
}
