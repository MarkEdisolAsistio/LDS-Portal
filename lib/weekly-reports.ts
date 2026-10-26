export const WEEKLY_ACTIVITY_CATEGORIES = [
  "Training Delivery - Formal",
  "Training Delivery - Short Course",
  "Program Development",
  "Trainer/Module Design",
  "Trainer/Module Fabrication",
  "Support Works - Internal MFI",
  "Learning Materials / Documentation",
  "Purchasing / Procurement",
  "Meetings / Coordination",
] as const;

export const RECEIPT_BUCKET = "weekly-report-receipts";
export const MAX_RECEIPTS = 5;
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export const RECEIPT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function mondayOf(value: string | Date): string {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : new Date(value);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function isMonday(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && mondayOf(value) === value;
}
