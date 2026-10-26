import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMe, can, levelOf, NAV } from "@/lib/permissions";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/status";
import { STATUS_STYLES } from "@/lib/status-style";
import { getFormDef } from "@/lib/forms/definitions";
import { formatDate } from "@/lib/format";
import { getStaff } from "@/lib/lookups";
import { SlaDonut } from "@/components/sla-donut";
import { DashboardCalendar, monthBounds, type DueItem, type NoteItem } from "@/components/dashboard-calendar";
import { DUE_SOON_DAYS, manilaToday, summarize } from "@/lib/sla";
import {
  getCalendarNoteOccurrences,
  type CalendarNoteRecord,
} from "@/lib/calendar-recurrence";

type ProjectRow = {
  id: string;
  project_code: string;
  title: string;
  status: Status;
  due_date: string | null;
  done_at: string | null;
  inquiries: { owner_id: string | null } | null;
};

const NOTE_MESSAGES: Record<string, { ok: boolean; text: string }> = {
  note_added: { ok: true, text: "Note added." },
  reminder_added: { ok: true, text: "Recurring reminder added." },
  note_deleted: { ok: true, text: "Note deleted." },
  note_invalid: { ok: false, text: "Enter a valid note, repeat schedule, and reminder time." },
  note_setup_required: { ok: false, text: "Apply sql/12_recurring_calendar_notes.sql in Supabase before adding reminders." },
  note_forbidden: { ok: false, text: "You do not have permission to do that." },
  note_error: { ok: false, text: "Could not save the note. Check the terminal for details." },
};
type FormRow = { project_id: string; form_code: string; status: string; updated_at: string };

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<{ cal?: string; day?: string; msg?: string }>;
}) {
  const { cal, day, msg } = await searchParams;
  const me = await getMe();
  if (!me) return null; // the layout already shows the "No access" screen

  const supabase = await createClient();
  const seesInquiries = can(me, "inquiries", "view");
  const seesProjects = can(me, "projects", "view");

  const ticketCounts: Record<string, number> = {};
  let ticketsWithoutProject = 0;
  let unassignedTickets = 0;
  if (seesInquiries) {
    const { data } = await supabase.from("inquiries").select("id, status, owner_id");
    const tickets = (data ?? []) as unknown as { id: string; status: string; owner_id: string | null }[];
    unassignedTickets = tickets.filter((t) => t.status !== "done" && !t.owner_id).length;
    for (const t of tickets) ticketCounts[t.status] = (ticketCounts[t.status] ?? 0) + 1;

    if (seesProjects) {
      const { data: linked } = await supabase.from("projects").select("inquiry_id").not("inquiry_id", "is", null);
      const has = new Set(((linked ?? []) as unknown as { inquiry_id: string }[]).map((p) => p.inquiry_id));
      ticketsWithoutProject = tickets.filter((t) => t.status !== "done" && !has.has(t.id)).length;
    }
  }

  const projectCounts: Record<string, number> = {};
  let projects: ProjectRow[] = [];
  let toReview: (FormRow & { project?: ProjectRow })[] = [];
  let waitingOnClient = 0;
  if (seesProjects) {
    const [pRes, fRes] = await Promise.all([
      supabase.from("projects").select("id, project_code, title, status, due_date, done_at, inquiries(owner_id)"),
      supabase.from("form_records").select("project_id, form_code, status, updated_at"),
    ]);
    projects = (pRes.data ?? []) as unknown as ProjectRow[];
    for (const p of projects) projectCounts[p.status] = (projectCounts[p.status] ?? 0) + 1;
    const byId = new Map(projects.map((p) => [p.id, p]));
    const forms = (fRes.data ?? []) as unknown as FormRow[];
    toReview = forms
      .filter((f) => f.status === "submitted")
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((f) => ({ ...f, project: byId.get(f.project_id) }));
    waitingOnClient = forms.filter((f) => f.status === "with_client" || f.status === "returned").length;
  }

  // ---------- SLA numbers ----------
  const today = manilaToday();
  const sla = summarize(
    projects.map((p) => ({ status: p.status, due_date: p.due_date, done_at: p.done_at, owner_id: p.inquiries?.owner_id ?? null })),
    today
  );

  // ---------- Calendar ----------
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(cal ?? "") ? (cal as string) : today.slice(0, 7);
  const bounds = monthBounds(month);
  const selectedDay =
    /^\d{4}-\d{2}-\d{2}$/.test(day ?? "") && (day as string).slice(0, 7) === month
      ? (day as string)
      : today.slice(0, 7) === month
        ? today
        : `${month}-01`;

  const dues: DueItem[] = projects
    .filter((p) => p.due_date && p.due_date >= bounds.start && p.due_date <= bounds.end)
    .map((p) => ({ id: p.id, code: p.project_code, title: p.title, date: p.due_date as string, status: p.status }));

  const { data: noteRows, error: notesError } = await supabase
    .from("calendar_notes")
    .select("id, note_date, body, created_by, repeat_interval, reminder_time")
    .lte("note_date", bounds.end)
    .order("created_at");
  let calendarRecurrenceReady = true;
  let calendarNotes: CalendarNoteRecord[];
  if (notesError) {
    console.error("loadCalendarNotes failed:", notesError.message);
    if (
      notesError.code === "42703" &&
      /repeat_interval|reminder_time/.test(notesError.message)
    ) {
      calendarRecurrenceReady = false;
      const { data: legacyRows, error: legacyError } = await supabase
        .from("calendar_notes")
        .select("id, note_date, body, created_by")
        .lte("note_date", bounds.end)
        .order("created_at");
      if (legacyError) {
        console.error("loadLegacyCalendarNotes failed:", legacyError.message);
        throw new Error("Could not load dashboard calendar notes.");
      }
      calendarNotes = ((legacyRows ?? []) as unknown as Omit<
        CalendarNoteRecord,
        "repeat_interval" | "reminder_time"
      >[]).map((note) => ({
        ...note,
        repeat_interval: "none",
        reminder_time: "09:00",
      }));
    } else {
      throw new Error("Could not load dashboard calendar notes.");
    }
  } else {
    calendarNotes = (noteRows ?? []) as unknown as CalendarNoteRecord[];
  }
  const staff = await getStaff();
  const staffName = new Map(staff.map((m) => [m.id, m.name]));
  const notes: NoteItem[] = calendarNotes.flatMap((n) =>
    getCalendarNoteOccurrences(n, bounds.start, bounds.end).map((date) => ({
      id: n.id,
      date,
      body: n.body,
      by: n.created_by ? staffName.get(n.created_by) ?? "Staff" : "Staff",
      mine: n.created_by === me.id,
      repeatInterval: n.repeat_interval,
      reminderTime: n.reminder_time,
    })),
  );
  const noteBanner = msg ? NOTE_MESSAGES[msg] : undefined;

  const cardBase = "rounded-lg border border-slate-200 bg-white";
  const card = `${cardBase} p-4`;
  const attentionCard = `${card} md:aspect-square md:flex md:w-48 md:flex-col`;
  const statusCard =
    "aspect-square w-full rounded-lg border border-slate-200 p-3 transition-colors hover:border-slate-300 md:w-48";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {me.fullName}</h1>
        <p className="text-slate-600">Signed in as {me.roleName}.</p>
      </div>

      <div className={seesProjects ? "grid items-start gap-6 xl:grid-cols-[repeat(auto-fit,minmax(min(100%,600px),600px))]" : "space-y-8"}>
        {seesProjects && (
          <section className="min-w-0">
            <h2 className="mb-3 text-lg font-medium">Needs your attention</h2>
            <div className="grid grid-cols-1 gap-3 md:flex md:flex-wrap">
              <div className={attentionCard}>
                <p className="text-sm text-slate-500">Forms submitted by clients, to review</p>
                <p className="mt-1 text-2xl font-semibold">{toReview.length}</p>
              </div>
              <div className={attentionCard}>
                <p className="text-sm text-slate-500">Forms waiting for the client</p>
                <p className="mt-1 text-2xl font-semibold">{waitingOnClient}</p>
              </div>
              {seesInquiries && (
                <div className={attentionCard}>
                  <p className="text-sm text-slate-500">Open tickets with no project yet</p>
                  <p className="mt-1 text-2xl font-semibold">{ticketsWithoutProject}</p>
                </div>
              )}
            </div>

            {toReview.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
                {toReview.slice(0, 8).map((f) => (
                  <li key={`${f.project_id}/${f.form_code}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                    <span>
                      <strong>{f.project?.project_code ?? "Project"}</strong>
                      {" - "}
                      {getFormDef(f.form_code)?.title ?? f.form_code}
                      <span className="text-slate-400"> - submitted {formatDate(f.updated_at)}</span>
                    </span>
                    <Link href={`/admin/projects/${f.project_id}/forms/${f.form_code}`} className="rounded border border-[#0d5a89] px-3 py-1 text-[#0d5a89] hover:bg-[#e8f3f6]">
                      Review
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <section className="mt-6 min-w-0 lg:w-full lg:max-w-[600px]">
              <h2 className="mb-3 text-lg font-medium">Deadlines and SLA</h2>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/admin/projects?due=overdue&open=1" className={`${cardBase} min-h-[88px] p-3 hover:border-slate-300`}>
                  <p className="text-sm text-slate-500">Overdue projects</p>
                  <p className="mt-1 text-2xl font-semibold text-red-700">{sla.counts.overdue}</p>
                </Link>
                <Link href="/admin/projects?due=soon&open=1" className={`${cardBase} min-h-[88px] p-3 hover:border-slate-300`}>
                  <p className="text-sm text-slate-500">Due in the next {DUE_SOON_DAYS} days</p>
                  <p className="mt-1 text-2xl font-semibold">{sla.counts.soon}</p>
                </Link>
                {seesInquiries && (
                  <Link href="/admin/inquiries?owner=none&open=1" className={`${cardBase} min-h-[88px] p-3 hover:border-slate-300`}>
                    <p className="text-sm text-slate-500">Unassigned tickets</p>
                    <p className="mt-1 text-2xl font-semibold">{unassignedTickets}</p>
                  </Link>
                )}
                <div className={`${cardBase} min-h-[88px] p-3`}>
                  <p className="text-sm text-slate-500">On-time rate</p>
                  <p className="mt-1 text-2xl font-semibold">{sla.onTimeRate === null ? "-" : `${sla.onTimeRate}%`}</p>
                </div>
              </div>

              <div className={`${cardBase} mt-3 p-3`}>
                <h3 className="mb-2 text-lg font-medium">LDS projects SLA</h3>
                <SlaDonut summary={sla} compact />
                <p className="mt-2 text-xs text-slate-500">
                  Projects are counted once, worst status first. Add a due date on the project page or request form.
                </p>
              </div>
            </section>
          </section>
        )}

        <section className="min-w-0">
          <h2 className="mb-3 text-lg font-medium">Calendar</h2>
          {noteBanner && (
            <p role="status" className={`mb-3 rounded p-3 text-sm ${noteBanner.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
              {noteBanner.text}
            </p>
          )}
          {!calendarRecurrenceReady && (
            <p role="alert" className="mb-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Apply <code>sql/12_recurring_calendar_notes.sql</code> in Supabase to enable recurring notes and reminders.
            </p>
          )}
          <div className={`${cardBase} ${seesProjects ? "p-3" : "p-4"}`}>
            <DashboardCalendar
              month={month}
              today={today}
              selectedDay={selectedDay}
              dues={dues}
              notes={notes}
              canAdd={can(me, "dashboard", "view") && calendarRecurrenceReady}
              canDeleteAny={can(me, "dashboard", "full")}
              compact={seesProjects}
            />
          </div>
        </section>
      </div>

      {(seesProjects || seesInquiries) && (
        <section>
          <h2 className="mb-3 text-lg font-medium">LDS Project Status</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:flex-wrap md:gap-3">
            {STATUSES.map((s) => (
              <Link
                key={s}
                href={`${seesProjects ? "/admin/projects" : "/admin/inquiries"}?status=${s}`}
                className={statusCard}
              >
                <span className={`whitespace-nowrap rounded-full px-1.5 py-1 text-[10px] sm:px-2 sm:text-xs ${STATUS_STYLES[s]}`}>{STATUS_LABELS[s]}</span>
                <p className="mt-2 text-2xl font-semibold">{(seesProjects ? projectCounts : ticketCounts)[s] ?? 0}</p>
              </Link>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Each request has one ticket and one project, and they share one status, so each is counted once here.
          </p>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium">Your access</h2>
        <table className="w-full max-w-md rounded-lg border border-slate-200 bg-white text-sm">
          <tbody>
            {NAV.map((n) => (
              <tr key={n.module} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">{n.label}</td>
                <td className="px-3 py-2 text-slate-500">{levelOf(me, n.module)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
