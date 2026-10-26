"use client";

export default function PrintPdfButton() {
  return <button type="button" onClick={() => window.print()} className="no-print rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">Export PDF</button>;
}
