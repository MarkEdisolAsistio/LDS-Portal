export const STATUSES = [
  "uncategorized",
  "new",
  "wip",
  "pending_customer",
  "pending_lds",
  "pending_3rd_party",
  "done",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  uncategorized: "Uncategorized",
  new: "New",
  wip: "Work in Progress",
  pending_customer: "Pending to Customer",
  pending_lds: "Pending to LDS",
  pending_3rd_party: "Pending to 3rd Party",
  done: "Done",
};