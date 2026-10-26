"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { can, getMe } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMonday, MAX_RECEIPTS, MAX_RECEIPT_BYTES, RECEIPT_BUCKET, RECEIPT_TYPES, WEEKLY_ACTIVITY_CATEGORIES } from "@/lib/weekly-reports";

const LIST = "/admin/reports/weekly";
const field = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").trim().slice(0, max);
function done(code: string, week?: string): never {
  redirect(`${LIST}?msg=${encodeURIComponent(code)}${week ? `&week=${encodeURIComponent(week)}` : ""}`);
}

export async function saveWeeklyReport(formData: FormData) {
  const me = await getMe();
  if (!me || !can(me, "reports", "edit")) done("forbidden");

  const week = field(formData, "week_monday", 10);
  const activities = field(formData, "activities", 12000);
  const remarks = field(formData, "remarks", 4000);
  const breakdown = field(formData, "expense_breakdown", 4000);
  const other = field(formData, "other_category", 200);
  const total = Number(field(formData, "total_expenses", 30));
  const categories = formData.getAll("activity_categories").map(String).filter((value) => (WEEKLY_ACTIVITY_CATEGORIES as readonly string[]).includes(value));
  if (!isMonday(week) || activities.length < 1 || remarks.length < 1 || !Number.isFinite(total) || total < 0 || total > 100000000) done("invalid", week);

  const admin = createAdminClient();
  const { data: existing } = await admin.from("weekly_staff_reports").select("id, status, receipt_paths").eq("staff_id", me.id).eq("week_monday", week).maybeSingle();
  if (existing && (existing as unknown as { status: string }).status === "reviewed") done("locked", week);

  const files = formData.getAll("receipts").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > MAX_RECEIPTS) done("too_many_files", week);
  for (const file of files) if (file.size > MAX_RECEIPT_BYTES || !RECEIPT_TYPES.has(file.type)) done("bad_file", week);

  const paths = [...(((existing as unknown as { receipt_paths: string[] } | null)?.receipt_paths ?? []))];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const path = `${me.id}/${week}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await admin.storage.from(RECEIPT_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (error) done("upload_error", week);
    paths.push(path);
  }

  const values = {
    staff_id: me.id,
    week_monday: week,
    activities,
    activity_categories: categories,
    other_category: other || null,
    total_expenses: total,
    expense_breakdown: breakdown || null,
    receipt_paths: paths,
    remarks,
    status: "submitted",
    review_notes: null,
    reviewed_by: null,
    reviewed_at: null,
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error } = await admin.from("weekly_staff_reports").upsert(values, { onConflict: "staff_id,week_monday" }).select("id").single();
  if (error || !saved) done("error", week);
  await audit(me.id, existing ? "update_weekly_report" : "submit_weekly_report", "weekly_report", (saved as unknown as { id: string }).id, { week, total_expenses: total });
  revalidatePath(LIST);
  revalidatePath(`${LIST}/new`);
  done("saved", week);
}

export async function reviewWeeklyReport(formData: FormData) {
  const me = await getMe();
  if (!me || !me.isSuper) done("forbidden");
  const id = field(formData, "id", 40);
  const status = field(formData, "status", 20);
  const notes = field(formData, "review_notes", 4000);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["reviewed", "returned"].includes(status)) done("invalid");
  const { error } = await createAdminClient().from("weekly_staff_reports").update({ status, review_notes: notes || null, reviewed_by: me.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id);
  if (error) done("error");
  await audit(me.id, status === "reviewed" ? "review_weekly_report" : "return_weekly_report", "weekly_report", id, { notes: Boolean(notes) });
  revalidatePath(LIST);
  done("reviewed");
}
