"use client";

import { useState } from "react";
import type { Column } from "@/lib/forms/types";
import { cellName } from "@/lib/forms/data";

type Row = Record<string, string>;

const cell =
  "w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-900";

// A grid where the person can add rows (item lists and similar).
export function TableInput({
  fieldKey,
  columns,
  initialRows,
  minRows,
  maxRows,
}: {
  fieldKey: string;
  columns: Column[];
  initialRows: Row[];
  minRows: number;
  maxRows: number;
}) {
  const [count, setCount] = useState(Math.max(initialRows.length, minRows, 1));

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="w-8 px-1 py-1 font-medium">#</th>
              {columns.map((c) => (
                <th key={c.key} className="px-1 py-1 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: count }, (_, r) => (
              <tr key={r}>
                <td className="px-1 py-1 text-slate-400">{r + 1}</td>
                {columns.map((c) => (
                  <td key={c.key} className="px-1 py-1">
                    <input
                      name={cellName(fieldKey, r, c.key)}
                      type={c.type === "date" ? "date" : c.type === "number" || c.type === "money" ? "number" : "text"}
                      step={c.type === "money" ? "0.01" : undefined}
                      min={c.type === "money" || c.type === "number" ? 0 : undefined}
                      defaultValue={initialRows[r]?.[c.key] ?? ""}
                      className={cell}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {count < maxRows && (
        <button
          type="button"
          onClick={() => setCount((n) => Math.min(n + 1, maxRows))}
          className="rounded border border-[#0d5a89] px-3 py-1 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]"
        >
          Add row
        </button>
      )}
    </div>
  );
}
