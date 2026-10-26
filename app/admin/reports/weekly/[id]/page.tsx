import Link from "next/link";
import { notFound } from "next/navigation";
import { reviewWeeklyReport } from "../actions";
import { can, getMe } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { RECEIPT_BUCKET } from "@/lib/weekly-reports";
import PrintPdfButton from "@/components/print-pdf-button";

type Report = { id: string; staff_id: string; week_monday: string; activities: string; activity_categories: string[]; other_category: string | null; total_expenses: number; expense_breakdown: string | null; receipt_paths: string[]; remarks: string; status: string; review_notes: string | null };
const label = "text-sm font-medium text-slate-700";

export default async function WeeklyReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me || !can(me, "reports", "view")) return <p className="text-slate-600">You do not have access to this report.</p>;
  const isSuperAdmin = me.isSuper;
  const id = (await params).id;
  const admin = createAdminClient();
  const { data } = await admin.from("weekly_staff_reports").select("id, staff_id, week_monday, activities, activity_categories, other_category, total_expenses, expense_breakdown, receipt_paths, remarks, status, review_notes").eq("id", id).maybeSingle();
  if (!data) notFound();
  const report = data as unknown as Report;
  if (!isSuperAdmin && report.staff_id !== me.id) return <p className="text-slate-600">You do not have access to this report.</p>;
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", report.staff_id).maybeSingle();
  const signed = report.receipt_paths.length ? await admin.storage.from(RECEIPT_BUCKET).createSignedUrls(report.receipt_paths, 3600) : { data: [] };
  return (
    <>
      <div className="no-print mx-auto mb-4 flex max-w-3xl justify-end"><PrintPdfButton /></div>
    <div className="mx-auto max-w-3xl space-y-6"><div><Link href={`/admin/reports/weekly?week=${report.week_monday}`} className="text-sm text-slate-500 underline">Back to weekly reports</Link><h1 className="mt-2 text-2xl font-semibold">Weekly Report · {profile?.full_name ?? "Staff"}</h1><p className="text-sm text-slate-500">Week of Monday, {report.week_monday}</p></div><section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div><p className={label}>Activities / Task Completed</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{report.activities}</p></div><div><p className={label}>Activity Categories</p><p className="mt-1 text-sm text-slate-700">{report.activity_categories.join(", ") || "-"}{report.other_category ? `; Other: ${report.other_category}` : ""}</p></div><div><p className={label}>Total Expenses</p><p className="mt-1 text-sm text-slate-700">₱{Number(report.total_expenses).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p></div><div><p className={label}>Expense Breakdown</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{report.expense_breakdown || "N/A"}</p></div><div><p className={label}>Receipts</p>{report.receipt_paths.length ? <ul className="mt-1 list-disc pl-5 text-sm text-blue-700">{(signed.data ?? []).map((file, index) => file?.signedUrl && <li key={file.path ?? index}><a href={file.signedUrl} target="_blank" rel="noreferrer" className="underline">Receipt {index + 1}</a></li>)}</ul> : <p className="mt-1 text-sm text-slate-700">None</p>}</div><div><p className={label}>Remarks / Concerns</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{report.remarks}</p></div></section>{isSuperAdmin && report.status !== "reviewed" && <form action={reviewWeeklyReport} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><input type="hidden" name="id" value={report.id} /><label className={label}>Review notes<textarea name="review_notes" rows={4} defaultValue={report.review_notes ?? ""} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" /></label><div className="flex gap-2"><button name="status" value="reviewed" className="rounded bg-emerald-700 px-4 py-2 text-sm text-white">Mark reviewed</button><button name="status" value="returned" className="rounded bg-amber-600 px-4 py-2 text-sm text-white">Return to staff</button></div></form>}</div>
    </>
  );
}
