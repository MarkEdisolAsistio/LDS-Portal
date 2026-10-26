import Link from "next/link";
import type { SlaBucket, SlaSummary } from "@/lib/sla";
import { DUE_SOON_DAYS } from "@/lib/sla";

// Fixed status colours (they carry meaning, so they are never themed).
// Every slice also has an icon and a label, so colour is never the only clue.
const SLICES: { key: SlaBucket; label: string; color: string; icon: string; hint: string; href?: string }[] = [
  { key: "overdue", label: "Overdue", color: "#d03b3b", icon: "✕", hint: "Due date has passed", href: "/admin/projects?due=overdue&open=1" },
  { key: "soon", label: "Due soon", color: "#fab219", icon: "!", hint: `Due within ${DUE_SOON_DAYS} days`, href: "/admin/projects?due=soon&open=1" },
  { key: "unassigned", label: "Unassigned", color: "#ec835a", icon: "?", hint: "No owner yet", href: "/admin/projects?owner=none&open=1" },
  { key: "on_track", label: "On track", color: "#0ca30c", icon: "✓", hint: "Has an owner and a later due date" },
  { key: "no_due", label: "No due date", color: "#898781", icon: "–", hint: "Owner set, but no due date yet", href: "/admin/projects?due=none&open=1" },
];

const R = 80; // ring radius
const C = 100; // centre
const W = 26; // ring thickness
const GAP = 2; // space between slices (same as the page, so slices never touch)

function arcPath(start: number, end: number): string {
  // angles in radians, 0 = top, clockwise
  const p = (a: number, r: number) => [C + r * Math.sin(a), C - r * Math.cos(a)];
  const [x1, y1] = p(start, R + W / 2);
  const [x2, y2] = p(end, R + W / 2);
  const [x3, y3] = p(end, R - W / 2);
  const [x4, y4] = p(start, R - W / 2);
  const large = end - start > Math.PI ? 1 : 0;
  const o = R + W / 2;
  const i = R - W / 2;
  return `M${x1} ${y1} A${o} ${o} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${i} ${i} 0 ${large} 0 ${x4} ${y4} Z`;
}

export function SlaDonut({ summary, compact = false }: { summary: SlaSummary; compact?: boolean }) {
  const total = summary.open;
  const active = SLICES.filter((s) => summary.counts[s.key] > 0);

  let angle = 0;
  const paths = active.map((s) => {
    const share = summary.counts[s.key] / total;
    const span = share * Math.PI * 2;
    const gap = active.length > 1 ? GAP / R : 0; // convert the pixel gap to an angle
    const start = angle + gap / 2;
    const end = angle + span - gap / 2;
    angle += span;
    return { ...s, d: active.length === 1 ? "" : arcPath(start, Math.max(end, start + 0.01)), share };
  });

  const rate = summary.onTimeRate;

  return (
    <div className={`grid items-center ${compact ? "grid-cols-[minmax(0,1fr)_min(38%,208px)] gap-2 xl:gap-3" : "gap-6 md:grid-cols-[220px_1fr]"}`}>
      <div className={compact ? "order-2 mx-auto w-full max-w-52" : "mx-auto w-52 md:w-full"}>
        <svg className="block h-auto w-full" viewBox="0 0 200 200" role="img" aria-label={`Open projects by SLA health: ${total} in total`}>
          {total === 0 ? (
            <circle cx={C} cy={C} r={R} fill="none" stroke="#e1e0d9" strokeWidth={W} />
          ) : active.length === 1 ? (
            <circle cx={C} cy={C} r={R} fill="none" stroke={active[0].color} strokeWidth={W}>
              <title>{`${active[0].label}: ${total} (100%)`}</title>
            </circle>
          ) : (
            paths.map((s) => (
              <path key={s.key} d={s.d} fill={s.color}>
                <title>{`${s.label}: ${summary.counts[s.key]} (${Math.round(s.share * 100)}%) - ${s.hint}`}</title>
              </path>
            ))
          )}
          <text x={C} y={C - 2} textAnchor="middle" fontSize="34" fontWeight="600" fill="var(--foreground)">{total}</text>
          <text x={C} y={C + 18} textAnchor="middle" fontSize="11" fill="var(--foreground)" opacity="0.65">open projects</text>
        </svg>
      </div>

      <div className={compact ? "order-1 min-w-0" : "space-y-4"}>
        <table className={`w-full ${compact ? "table-fixed text-xs" : "text-sm"}`}>
          {compact && (
            <colgroup>
              <col className="w-[62%] xl:w-[65%]" />
              <col className="w-[18%] xl:w-[22.5%]" />
              <col className="w-[20%] xl:w-[12.5%]" />
            </colgroup>
          )}
          <thead className="sr-only">
            <tr><th>Group</th><th>Projects</th><th>Share</th></tr>
          </thead>
          <tbody>
            {SLICES.map((s) => {
              const n = summary.counts[s.key];
              const pct = total ? Math.round((n / total) * 100) : 0;
              const label = (
                <span className="flex items-center gap-2" title={compact ? s.hint : undefined}>
                  <span
                    aria-hidden="true"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: s.color, color: s.key === "soon" ? "#0b0b0b" : "#fff" }}
                  >
                    {s.icon}
                  </span>
                  <span className={`${compact ? "text-[13px] xl:text-sm" : ""} text-slate-900`}>{s.label}</span>
                  {!compact && <span className="hidden text-xs text-slate-400 sm:inline">{s.hint}</span>}
                </span>
              );
              return (
                <tr key={s.key} className="border-b border-slate-100 last:border-0">
                  <td className={`${compact ? "py-1 pr-1" : "py-2 pr-3"}`}>
                    {s.href && n > 0 ? (
                      <Link href={s.href} className="hover:underline">{label}</Link>
                    ) : (
                      label
                    )}
                  </td>
                  <td className={`${compact ? "py-1 pr-1 whitespace-nowrap text-center" : "py-2 pr-3 text-right"} font-semibold text-slate-900`}>{n}</td>
                  <td className={`${compact ? "py-1 whitespace-nowrap text-center" : "w-14 py-2 text-right"} text-slate-500`}>{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!compact && <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            <span className="font-semibold text-slate-900">On-time rate: {rate === null ? "-" : `${rate}%`}</span>
            {rate === null
              ? " (no finished project with a due date yet)"
              : ` - ${summary.doneOnTime} of ${summary.doneOnTime + summary.doneLate} finished projects were done by their due date`}
          </p>
          {summary.doneNoDue > 0 && (
            <p className="mt-1 text-xs text-slate-500">{summary.doneNoDue} finished without a due date, so they are not counted.</p>
          )}
        </div>}
      </div>
    </div>
  );
}
