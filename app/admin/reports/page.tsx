import Link from "next/link";
import { PrintButton } from "@/components/forms/print-button";
import { getCategories } from "@/lib/lookups";
import { can, getMe } from "@/lib/permissions";
import { STATUS_LABELS, STATUSES, type Status } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

type InquiryRow = { status: Status; category_id: number | null; created_at: string };
type ProjectRow = { status: Status; due_date: string | null; done_at: string | null; created_at: string };

const card = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";
const statusColor: Record<Status, string> = {
  uncategorized: "bg-slate-100 text-slate-700",
  new: "bg-blue-100 text-blue-800",
  wip: "bg-amber-100 text-amber-800",
  pending_customer: "bg-orange-100 text-orange-800",
  pending_lds: "bg-violet-100 text-violet-800",
  pending_3rd_party: "bg-pink-100 text-pink-800",
  done: "bg-emerald-100 text-emerald-800",
};

const monthlyBarColors = ["#0d5a89", "#007b96", "#168a78", "#7a6bb5", "#c17835", "#b95770"];

function monthKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit" }).format(date);
}

function monthName(key: string) {
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: "UTC", month: "short" });
}

export default async function ReportsPage() {
  const me = await getMe();
  if (!me || !can(me, "reports", "view")) return <p className="text-slate-600">You do not have access to Reports and Export.</p>;

  const supabase = await createClient();
  const seesInquiries = can(me, "inquiries", "view");
  const seesProjects = can(me, "projects", "view");
  const [inquiryResult, projectResult, categories] = await Promise.all([
    seesInquiries ? supabase.from("inquiries").select("status, category_id, created_at") : Promise.resolve({ data: [] }),
    seesProjects ? supabase.from("projects").select("status, due_date, done_at, created_at") : Promise.resolve({ data: [] }),
    getCategories(),
  ]);
  const inquiries = (inquiryResult.data ?? []) as unknown as InquiryRow[];
  const projects = (projectResult.data ?? []) as unknown as ProjectRow[];
  const today = monthKey(new Date());
  const statusCounts = (rows: { status: Status }[]) => Object.fromEntries(STATUSES.map((status) => [status, rows.filter((row) => row.status === status).length])) as Record<Status, number>;
  const inquiryStatus = statusCounts(inquiries);
  const projectStatus = statusCounts(projects);
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const categoryCounts = new Map<number, number>();
  for (const inquiry of inquiries) if (inquiry.category_id) categoryCounts.set(inquiry.category_id, (categoryCounts.get(inquiry.category_id) ?? 0) + 1);
  const topCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const overdue = projects.filter((project) => project.due_date && project.due_date < `${today}-01` && project.status !== "done").length;
  const dueWithoutDate = projects.filter((project) => !project.due_date && project.status !== "done").length;
  const completedProjects = projects.filter((project) => project.status === "done" || project.done_at).length;
  const monthKeys = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index), 1);
    return monthKey(date);
  });
  const monthlyInquiries = monthKeys.map((key) => inquiries.filter((inquiry) => monthKey(new Date(inquiry.created_at)) === key).length);
  const maxMonthly = Math.max(...monthlyInquiries, 1);

  return (
    <div className="mx-auto max-w-7xl space-y-6 print:max-w-none print:space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 print:block">
        <div>
          <h1 className="text-2xl font-semibold">Reports and Export</h1>
          <p className="mt-1 text-sm text-slate-500">Operational summaries for LDS inquiries, projects, and forms.</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <PrintButton />
          {seesInquiries && <a href="/admin/inquiries/export?scope=all" className="report-export-action rounded border border-[#0d5a89] px-4 py-2 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]">Export inquiries to Excel</a>}
          {seesProjects && <a href="/admin/projects/export?scope=all" className="report-export-action rounded border border-[#0d5a89] px-4 py-2 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]">Export projects to Excel</a>}
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={card}><p className="text-sm text-slate-500">Total inquiries</p><p className="mt-1 text-3xl font-semibold">{inquiries.length}</p><Link href="/admin/inquiries" className="mt-2 inline-block text-sm text-blue-700 underline">Open inquiries</Link></div>
        <div className={card}><p className="text-sm text-slate-500">Total projects</p><p className="mt-1 text-3xl font-semibold">{projects.length}</p><Link href="/admin/projects" className="mt-2 inline-block text-sm text-blue-700 underline">Open projects</Link></div>
        <div className={card}><p className="text-sm text-slate-500">Completed projects</p><p className="mt-1 text-3xl font-semibold text-emerald-700">{completedProjects}</p><p className="mt-2 text-xs text-slate-500">{projects.length ? Math.round((completedProjects / projects.length) * 100) : 0}% of all projects</p></div>
        <div className={card}><p className="text-sm text-slate-500">Overdue projects</p><p className="mt-1 text-3xl font-semibold text-red-700">{overdue}</p><p className="mt-2 text-xs text-slate-500">{dueWithoutDate} open projects have no due date</p></div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="font-medium">Inquiry status</h2>
          <div className="mt-4 space-y-3">
            {STATUSES.map((status) => <div key={status} className="flex items-center gap-3 text-sm"><span className={`min-w-36 rounded-full px-2 py-1 text-center text-xs ${statusColor[status]}`}>{STATUS_LABELS[status]}</span><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#0d5a89]" style={{ width: `${inquiries.length ? Math.max((inquiryStatus[status] / inquiries.length) * 100, inquiryStatus[status] ? 3 : 0) : 0}%` }} /></div><span className="w-8 text-right font-medium">{inquiryStatus[status]}</span></div>)}
          </div>
        </section>
        <section className={card}>
          <h2 className="font-medium">Project status</h2>
          <div className="mt-4 space-y-3">
            {STATUSES.map((status) => <div key={status} className="flex items-center gap-3 text-sm"><span className={`min-w-36 rounded-full px-2 py-1 text-center text-xs ${statusColor[status]}`}>{STATUS_LABELS[status]}</span><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#0d5a89]" style={{ width: `${projects.length ? Math.max((projectStatus[status] / projects.length) * 100, projectStatus[status] ? 3 : 0) : 0}%` }} /></div><span className="w-8 text-right font-medium">{projectStatus[status]}</span></div>)}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className="font-medium">Inquiries received by month</h2>
          <div className="mt-5 flex h-44 items-end justify-between gap-3 border-b border-slate-200 px-2">
            {monthKeys.map((key, index) => <div key={key} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs text-slate-500">{monthlyInquiries[index]}</span><div className="w-full max-w-10 rounded-t" style={{ height: `${Math.max((monthlyInquiries[index] / maxMonthly) * 100, monthlyInquiries[index] ? 8 : 2)}%`, backgroundColor: monthlyBarColors[index % monthlyBarColors.length] }} /><span className="text-xs text-slate-500">{monthName(key)}</span></div>)}
          </div>
        </section>
        <section className={card}>
          <h2 className="font-medium">Most requested module categories</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {topCategories.length === 0 && <p className="py-3 text-sm text-slate-500">No categorized inquiries yet.</p>}
            {topCategories.map(([id, count]) => <div key={id} className="flex justify-between gap-4 py-3 text-sm"><span>{categoryName.get(id) ?? `Category ${id}`}</span><strong>{count}</strong></div>)}
          </div>
        </section>
      </div>

      <section className={`${card} print:break-before-page`}>
        <h2 className="font-medium">Export options</h2>
        <p className="mt-1 text-sm text-slate-500">Excel files include detailed rows, filters, and an export information sheet. Use Print / Save as PDF for a readable snapshot of this report.</p>
        <div className="mt-4 flex flex-wrap gap-3 print:hidden">
          {seesInquiries ? <a href="/admin/inquiries/export?scope=all" className="rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">Download all inquiries (.xlsx)</a> : <span className="text-sm text-slate-500">You do not have inquiry export access.</span>}
          {seesProjects ? <a href="/admin/projects/export?scope=all" className="rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">Download all projects (.xlsx)</a> : <span className="text-sm text-slate-500">You do not have project export access.</span>}
        </div>
      </section>

      <section className={`${card} print:hidden`}>
        <h2 className="font-medium">Weekly staff reports</h2>
        <p className="mt-1 text-sm text-slate-500">Collect the LDS Weekly Activity and Expense Log from each staff member, review submissions, and keep receipt files with the report.</p>
        <Link href="/admin/reports/weekly" className="mt-3 inline-block text-sm text-blue-700 underline">Open Weekly LDS Reports</Link>
      </section>
    </div>
  );
}
