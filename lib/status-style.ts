import type { Status } from "@/lib/status";

// Badge colours for each ticket status.
export const STATUS_STYLES: Record<Status, string> = {
  uncategorized: "bg-slate-200 text-slate-800",
  new: "bg-blue-100 text-blue-800",
  wip: "bg-indigo-100 text-indigo-800",
  pending_customer: "bg-amber-100 text-amber-800",
  pending_lds: "bg-orange-100 text-orange-800",
  pending_3rd_party: "bg-purple-100 text-purple-800",
  done: "bg-green-100 text-green-800",
};
