import Link from "next/link";
import { saveWeeklyReport } from "../actions";
import { can, getMe } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { mondayOf, isMonday, WEEKLY_ACTIVITY_CATEGORIES } from "@/lib/weekly-reports";

type Report = { id: string; week_monday: string; activities: string; activity_categories: string[]; other_category: string | null; total_expenses: number; expense_breakdown: string | null; receipt_paths: string[]; remarks: string; status: string };
const input = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";

export default async function NewWeeklyReportPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const me = await getMe();
  if (!me || !can(me, "reports", "edit")) return <p className="text-slate-600">You do not have permission to submit weekly reports.</p>;
  const raw = (await searchParams).week ?? mondayOf(new Date());
  const week = isMonday(raw) ? raw : mondayOf(new Date());
  const { data } = await createAdminClient().from("weekly_staff_reports").select("id, week_monday, activities, activity_categories, other_category, total_expenses, expense_breakdown, receipt_paths, remarks, status").eq("staff_id", me.id).eq("week_monday", week).maybeSingle();
  const report = data as unknown as Report | null;
  const locked = report?.status === "reviewed";
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div><Link href="/admin/reports/weekly" className="text-sm text-slate-500 underline">Back to weekly reports</Link><h1 className="mt-2 text-2xl font-semibold">Weekly Activity and Expense Report</h1><p className="mt-1 text-sm text-slate-500">Submitting as {me.fullName}. The report week starts on Monday.</p></div>
      {locked && <p className="rounded bg-blue-50 p-3 text-sm text-blue-900">This report has been reviewed and is locked.</p>}
      <form action={saveWeeklyReport} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm text-slate-700">Week covered (Monday)<input type="date" name="week_monday" required defaultValue={week} disabled={locked} className={input} /></label>
        <label className="block text-sm text-slate-700">Activities / Task Completed<textarea name="activities" required rows={7} maxLength={12000} disabled={locked} defaultValue={report?.activities ?? ""} placeholder="List your main activities this week, one per line" className={input} /></label>
        <fieldset disabled={locked}><legend className="text-sm text-slate-700">Activity Category</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{WEEKLY_ACTIVITY_CATEGORIES.map((category) => <label key={category} className="flex items-start gap-2 text-sm"><input type="checkbox" name="activity_categories" value={category} defaultChecked={report?.activity_categories?.includes(category)} className="mt-1" />{category}</label>)}</div></fieldset>
        <label className="block text-sm text-slate-700">Other category<input name="other_category" maxLength={200} disabled={locked} defaultValue={report?.other_category ?? ""} className={input} /></label>
        <label className="block text-sm text-slate-700">Total Expenses<input name="total_expenses" type="number" min="0" step="0.01" required disabled={locked} defaultValue={report?.total_expenses ?? 0} className={input} /><span className="mt-1 block text-xs text-slate-500">Enter 0 if there were no expenses.</span></label>
        <label className="block text-sm text-slate-700">Expense Breakdown<textarea name="expense_breakdown" rows={4} maxLength={4000} disabled={locked} defaultValue={report?.expense_breakdown ?? ""} placeholder="Transportation – 350, Meals – 100. Write N/A if none." className={input} /></label>
        {!locked && <label className="block text-sm text-slate-700">Receipt Photos / Files<input name="receipts" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp,.doc,.docx" className={`${input} file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1`} /><span className="mt-1 block text-xs text-slate-500">Up to 5 files, 10 MB each. PDF, Word, JPG, PNG, or WebP.</span></label>}
        {report?.receipt_paths?.length ? <p className="text-xs text-slate-500">{report.receipt_paths.length} receipt file(s) already attached. New files will be added when you save.</p> : null}
        <label className="block text-sm text-slate-700">Remarks / Concerns<textarea name="remarks" required rows={5} maxLength={4000} disabled={locked} defaultValue={report?.remarks ?? ""} className={input} /></label>
        {!locked && <button className="rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">Submit weekly report</button>}
      </form>
    </div>
  );
}
