import type { Status } from "@/lib/status";

// How "on time" is measured on the dashboard.
// - A project has a due date.
// - Open projects (any status except Done) are grouped by how healthy they are.
// - Finished projects count as on time when they were set to Done on or before the due date.

export const DUE_SOON_DAYS = 3;

export type SlaBucket = "overdue" | "soon" | "unassigned" | "on_track" | "no_due";

export type SlaProject = {
  status: Status;
  due_date: string | null; // YYYY-MM-DD
  done_at: string | null; // timestamp
  owner_id: string | null; // owner of the ticket
};

export const manilaToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
const manilaDay = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// The one group an open project belongs to. Worst first, so nothing is counted twice.
export function bucketOf(p: SlaProject, today: string): SlaBucket {
  if (p.due_date && p.due_date < today) return "overdue";
  if (p.due_date && p.due_date <= addDays(today, DUE_SOON_DAYS)) return "soon";
  if (!p.owner_id) return "unassigned";
  return p.due_date ? "on_track" : "no_due";
}

export type SlaSummary = {
  counts: Record<SlaBucket, number>;
  open: number;
  doneOnTime: number;
  doneLate: number;
  doneNoDue: number;
  onTimeRate: number | null; // 0-100, of finished projects that had a due date
};

export function summarize(projects: SlaProject[], today: string): SlaSummary {
  const s: SlaSummary = {
    counts: { overdue: 0, soon: 0, unassigned: 0, on_track: 0, no_due: 0 },
    open: 0,
    doneOnTime: 0,
    doneLate: 0,
    doneNoDue: 0,
    onTimeRate: null,
  };
  for (const p of projects) {
    if (p.status !== "done") {
      s.open += 1;
      s.counts[bucketOf(p, today)] += 1;
    } else if (!p.due_date) {
      s.doneNoDue += 1;
    } else if (p.done_at && manilaDay(p.done_at) <= p.due_date) {
      s.doneOnTime += 1;
    } else {
      s.doneLate += 1;
    }
  }
  const judged = s.doneOnTime + s.doneLate;
  s.onTimeRate = judged ? Math.round((s.doneOnTime / judged) * 100) : null;
  return s;
}
