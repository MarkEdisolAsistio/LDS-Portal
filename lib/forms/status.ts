export const FORM_STATUSES = ["draft", "with_client", "submitted", "returned", "completed"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  draft: "Draft",
  with_client: "With client",
  submitted: "Submitted by client",
  returned: "Returned to client",
  completed: "Completed",
};

export const FORM_STATUS_STYLES: Record<FormStatus | "none", string> = {
  none: "bg-slate-100 text-slate-600",
  draft: "bg-amber-100 text-amber-800",
  with_client: "bg-blue-100 text-blue-800",
  submitted: "bg-purple-100 text-purple-800",
  returned: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
};
