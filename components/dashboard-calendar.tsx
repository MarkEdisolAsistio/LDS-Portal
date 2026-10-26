import Link from "next/link";
import { addCalendarNote, deleteCalendarNote } from "@/app/admin/dashboard-actions";
import { STATUS_LABELS, type Status } from "@/lib/status";
import {
  CALENDAR_RECURRENCES,
  formatReminderTime,
  type CalendarRecurrence,
} from "@/lib/calendar-recurrence";

export type DueItem = { id: string; code: string; title: string; date: string; status: Status };
export type NoteItem = {
  id: string;
  date: string;
  body: string;
  by: string;
  mine: boolean;
  repeatInterval: CalendarRecurrence;
  reminderTime: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const RECURRENCE_LABELS: Record<CalendarRecurrence, string> = {
  none: "Does not repeat",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const ymd = (d: Date) => d.toISOString().slice(0, 10);

export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay()); // back to the Sunday on or before the 1st
  const weeks = Math.ceil((first.getUTCDay() + new Date(Date.UTC(y, m, 0)).getUTCDate()) / 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + weeks * 7 - 1);
  return { y, m, start: ymd(start), end: ymd(end), weeks };
}

const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

export function DashboardCalendar({
  month,
  today,
  selectedDay,
  dues,
  notes,
  canAdd,
  canDeleteAny,
  compact = false,
}: {
  month: string;
  today: string;
  selectedDay: string;
  dues: DueItem[];
  notes: NoteItem[];
  canAdd: boolean;
  canDeleteAny: boolean;
  compact?: boolean;
}) {
  const { y, m, start, weeks } = monthBounds(month);
  const link = (cal: string, day?: string) => `/admin?cal=${cal}${day ? `&day=${day}` : ""}#calendar`;
  const thisMonth = today.slice(0, 7);

  const duesByDay = new Map<string, DueItem[]>();
  for (const d of dues) duesByDay.set(d.date, [...(duesByDay.get(d.date) ?? []), d]);
  const notesByDay = new Map<string, NoteItem[]>();
  for (const n of notes) notesByDay.set(n.date, [...(notesByDay.get(n.date) ?? []), n]);

  const cells: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < weeks * 7; i++) {
    cells.push(ymd(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const dueTone = (d: DueItem) =>
    d.status === "done"
      ? "bg-slate-100 text-slate-500 line-through"
      : d.date < today
        ? "bg-red-100 text-red-800"
        : "bg-blue-100 text-blue-800";

  const dayDues = duesByDay.get(selectedDay) ?? [];
  const dayNotes = notesByDay.get(selectedDay) ?? [];

  return (
    <div id="calendar" className={`scroll-mt-24 ${compact ? "space-y-2" : "space-y-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-medium">
          {MONTHS[m - 1]} {y}
        </h3>
        <div className="flex gap-2 text-sm">
          <Link href={link(shiftMonth(month, -1))} className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100" aria-label="Previous month">
            ← Prev
          </Link>
          {month !== thisMonth && (
            <Link href={link(thisMonth, today)} className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100">
              Today
            </Link>
          )}
          <Link href={link(shiftMonth(month, 1))} className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100" aria-label="Next month">
            Next →
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className={`grid ${compact ? "min-w-0" : "min-w-[640px]"} grid-cols-7 border-l border-t border-slate-200 text-xs`}>
          {WEEKDAYS.map((w) => (
            <div key={w} className="border-b border-r border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-500">
              {w}
            </div>
          ))}
          {cells.map((day) => {
            const inMonth = day.slice(0, 7) === month;
            const ds = duesByDay.get(day) ?? [];
            const ns = notesByDay.get(day) ?? [];
            const shown = [
              ...ds.map((d) => ({ key: d.id, text: d.code, tone: dueTone(d) })),
              ...ns.map((n) => ({ key: n.id, text: n.body, tone: "bg-amber-100 text-amber-900" })),
            ];
            const isSel = day === selectedDay;
            return (
              <Link
                key={day}
                href={link(month, day)}
                aria-label={`${day}: ${ds.length} deadlines, ${ns.length} notes`}
                aria-current={day === today ? "date" : undefined}
                className={`block ${compact ? "min-h-14" : "min-h-[84px]"} border-b border-r border-slate-200 p-1 hover:bg-slate-50 ${
                  inMonth ? "bg-white" : "bg-slate-50/60 text-slate-400"
                } ${isSel ? "outline outline-2 -outline-offset-2 outline-[#0d5a89]" : ""}`}
              >
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 ${
                    day === today ? "bg-[#0d5a89] font-semibold text-white" : ""
                  }`}
                >
                  {Number(day.slice(8))}
                </span>
                <span className="mt-1 block space-y-0.5">
                  {shown.slice(0, 2).map((s) => (
                    <span key={s.key} className={`block truncate rounded px-1 py-0.5 ${s.tone}`}>
                      {s.text}
                    </span>
                  ))}
                  {shown.length > 2 && <span className="block px-1 text-slate-500">+{shown.length - 2} more</span>}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-blue-200 align-middle" />Project due</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-200 align-middle" />Overdue</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-slate-200 align-middle" />Done</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-200 align-middle" />Note</span>
      </p>

      {/* The selected day */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h4 className="font-medium">
          {new Date(`${selectedDay}T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </h4>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Deadlines</p>
            {dayDues.length === 0 ? (
              <p className="text-sm text-slate-500">No project is due on this day.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {dayDues.map((d) => (
                  <li key={d.id}>
                    <Link href={`/admin/projects/${d.id}`} className="font-medium text-blue-700 underline">{d.code}</Link>
                    <span className="text-slate-700"> {d.title}</span>
                    <span className="text-xs text-slate-500"> ({STATUS_LABELS[d.status]})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Notes</p>
            {dayNotes.length === 0 ? (
              <p className="text-sm text-slate-500">No notes on this day.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {dayNotes.map((n) => (
                  <li key={n.id} className="flex items-start justify-between gap-2 rounded bg-amber-50 p-2">
                    <span>
                      <span className="whitespace-pre-wrap text-slate-800">{n.body}</span>
                      <span className="block text-xs text-slate-500">
                        {n.by} · {RECURRENCE_LABELS[n.repeatInterval]} · {formatReminderTime(n.reminderTime)} Manila time
                      </span>
                    </span>
                    {(n.mine || canDeleteAny) && (
                      <form action={deleteCalendarNote}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="day" value={selectedDay} />
                        <input type="hidden" name="cal" value={month} />
                        <button
                          className="text-xs text-red-700 underline"
                          aria-label={n.repeatInterval === "none" ? "Delete this note" : "Delete this recurring reminder"}
                          title={n.repeatInterval === "none" ? "Delete this note" : "Delete the entire recurring reminder"}
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canAdd && (
              <form action={addCalendarNote} className="mt-3 space-y-2">
                <input type="hidden" name="day" value={selectedDay} />
                <input type="hidden" name="cal" value={month} />
                <label className="block text-xs text-slate-500">
                  Add a note for this day
                  <textarea
                    name="body"
                    required
                    maxLength={300}
                    rows={2}
                    placeholder="Example: Call the client about the PLC trainer quote"
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900"
                  />
                </label>
                <div className="grid gap-2">
                  <label className="block text-xs text-slate-500">
                    Repeat
                    <select
                      name="repeat_interval"
                      defaultValue="none"
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
                    >
                      {CALENDAR_RECURRENCES.map((recurrence) => (
                        <option key={recurrence} value={recurrence}>
                          {RECURRENCE_LABELS[recurrence]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-slate-500">
                    Set reminder
                    <input
                      type="time"
                      name="reminder_time"
                      defaultValue="09:00"
                      required
                      className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
                    />
                  </label>
                </div>
                <p className="text-xs text-slate-500">
                  Browser reminders require notifications enabled and the admin site open.
                </p>
                <button className="rounded bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-700">Add note</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
