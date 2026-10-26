import Link from "next/link";
import { formatDate } from "@/lib/format";
import { can, getMe } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { mondayOf, isMonday } from "@/lib/weekly-reports";

type Report = { id: string; staff_id: string; week_monday: string; activities: string; activity_categories: string[]; total_expenses: number; status: string; created_at: string; updated_at: string };
const statusClass: Record<string, string> = { submitted: "bg-amber-100 text-amber-800", reviewed: "bg-emerald-100 text-emerald-800", returned: "bg-red-100 text-red-800" };

export default async function WeeklyReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await getMe();
  if (!me || !can(me, "reports", "view")) return <p className="text-slate-600">You do not have access to Weekly LDS Reports.</p>;
  const isSuperAdmin = me.isSuper;
  const raw = await searchParams;
  const week = isMonday(raw.week ?? "") ? raw.week! : mondayOf(new Date());
  const admin = createAdminClient();
  const query = admin.from("weekly_staff_reports").select("id, staff_id, week_monday, activities, activity_categories, total_expenses, status, created_at, updated_at").eq("week_monday", week).order("created_at", { ascending: false });
  const { data, error } = isSuperAdmin ? await query : await query.eq("staff_id", me.id);
  const reports = (data ?? []) as unknown as Report[];
  const { data: profiles } = reports.length
    ? await admin.from("profiles").select("id, full_name").in("id", reports.map((report) => report.staff_id))
    : { data: [] };
  const names = new Map(((profiles ?? []) as unknown as { id: string; full_name: string }[]).map((profile) => [profile.id, profile.full_name]));
  const previous = new Date(`${week}T00:00:00Z`); previous.setUTCDate(previous.getUTCDate() - 7);
  const next = new Date(`${week}T00:00:00Z`); next.setUTCDate(next.getUTCDate() + 7);
  const previousWeek = previous.toISOString().slice(0, 10); const nextWeek = next.toISOString().slice(0, 10);
  const message: Record<string, string> = { saved: "Weekly report submitted.", reviewed: "Report review saved.", returned: "Report returned to staff.", forbidden: "You do not have permission to do that.", invalid: "Please check the report fields.", locked: "Reviewed reports are locked.", too_many_files: "You can attach up to 5 files.", bad_file: "Each receipt must be a supported file under 10 MB.", upload_error: "Receipt upload failed. Check the storage bucket migration.", error: "Could not save the weekly report." };
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Weekly LDS Reports</h1><p className="mt-1 text-sm text-slate-500">Week of Monday, {week}. {isSuperAdmin ? "Review all staff submissions." : "Submit and track your own report. Only you can see your report."}</p></div><Link href={`/admin/reports/weekly/new?week=${week}`} className="rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">{reports.some((report) => report.staff_id === me.id) ? "Edit my report" : "Submit my report"}</Link></div>
      {raw.msg && message[raw.msg] && <p role="status" className={`rounded p-3 text-sm ${["saved", "reviewed"].includes(raw.msg) ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-900"}`}>{message[raw.msg]}</p>}
      {error && <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">Weekly report storage is not ready. Apply <code>sql/16_weekly_staff_reports.sql</code> in Supabase.</p>}
      <div className="flex flex-wrap items-center gap-3"><Link href={`?week=${previousWeek}`} className="text-sm text-blue-700 underline">Previous week</Link><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{reports.length} submission{reports.length === 1 ? "" : "s"}</span><Link href={`?week=${nextWeek}`} className="text-sm text-blue-700 underline">Next week</Link></div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-slate-500"><tr><th className="px-3 py-3 font-medium">Staff</th><th className="px-3 py-3 font-medium">Activities</th><th className="px-3 py-3 font-medium">Categories</th><th className="px-3 py-3 font-medium">Expenses</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Updated</th><th className="px-3 py-3 font-medium">Action</th></tr></thead><tbody>{reports.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No report submitted for this week yet.</td></tr>}{reports.map((report) => <tr key={report.id} className="border-b border-slate-100 align-top last:border-0"><td className="px-3 py-3 font-medium">{names.get(report.staff_id) ?? "Staff"}</td><td className="max-w-72 whitespace-pre-wrap px-3 py-3 text-slate-700">{report.activities}</td><td className="max-w-60 px-3 py-3 text-xs text-slate-600">{report.activity_categories.join(", ") || "-"}</td><td className="whitespace-nowrap px-3 py-3">₱{Number(report.total_expenses).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs ${statusClass[report.status] ?? "bg-slate-100 text-slate-700"}`}>{report.status}</span></td><td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(report.updated_at)}</td><td className="px-3 py-3"><Link href={`/admin/reports/weekly/${report.id}`} className="text-blue-700 underline">Open</Link></td></tr>)}</tbody></table></div>
    </div>
  );
}
