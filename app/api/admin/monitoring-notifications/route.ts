import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, getMe } from "@/lib/permissions";
import {
  getCalendarNoteOccurrences,
  type CalendarNoteRecord,
} from "@/lib/calendar-recurrence";
import { addDays, DUE_SOON_DAYS, manilaToday } from "@/lib/sla";
import type { Status } from "@/lib/status";

type MonitoringNotification = {
  id: string;
  category: "overdue" | "due_soon" | "calendar" | "new_ticket";
  title: string;
  href: string;
  sortDate: string;
  weight?: number; // how many tickets this row stands for (the "N more" row)
};

export async function GET() {
  const me = await getMe();
  if (!me) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!can(me, "dashboard", "view")) {
    return NextResponse.json({ error: "Dashboard access required." }, { status: 403 });
  }

  const supabase = await createClient();
  const today = manilaToday();
  const dueEnd = addDays(today, DUE_SOON_DAYS);
  const reminderEnd = addDays(today, 8);
  const notifications: MonitoringNotification[] = [];
  let overflowTickets = 0;

  if (can(me, "projects", "view")) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, project_code, title, status, due_date")
      .lte("due_date", dueEnd)
      .neq("status", "done")
      .order("due_date", { ascending: true });

    if (error) {
      console.error("loadProjectMonitoringNotifications failed:", error.message);
      return NextResponse.json(
        { error: "Could not load project due-date notifications." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    for (const project of (data ?? []) as unknown as {
      id: string;
      project_code: string;
      title: string;
      status: Status;
      due_date: string;
    }[]) {
      const overdue = project.due_date < today;
      notifications.push({
        id: `${overdue ? "overdue" : "due"}:${project.id}`,
        category: overdue ? "overdue" : "due_soon",
        title: `${project.project_code} · ${project.title}`,
        href: `/admin/projects/${project.id}`,
        sortDate: project.due_date,
      });
    }
  }

  if (can(me, "inquiries", "view")) {
    const { data, count, error } = await supabase
      .from("inquiries")
      .select("id, ticket_no, created_at", { count: "exact" })
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("loadNewTicketNotifications failed:", error.message);
      return NextResponse.json(
        { error: "Could not load new-ticket notifications." },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    const tickets = (data ?? []) as unknown as {
      id: string;
      ticket_no: string;
      created_at: string;
    }[];
    for (const ticket of tickets) {
      notifications.push({
        id: `ticket:${ticket.id}`,
        category: "new_ticket",
        title: `New inquiry · ${ticket.ticket_no}`,
        href: `/admin/inquiries/${ticket.id}`,
        sortDate: ticket.created_at,
      });
    }
    overflowTickets = Math.max((count ?? tickets.length) - tickets.length, 0);
    if (overflowTickets > 0) {
      notifications.push({
        id: `ticket:more:${overflowTickets}`,
        weight: overflowTickets,
        category: "new_ticket",
        title: `${overflowTickets} more new ${overflowTickets === 1 ? "ticket" : "tickets"}`,
        href: "/admin/inquiries?status=new",
        sortDate: "",
      });
    }
  }

  let calendarError: string | undefined;
  const { data: notes, error: notesError } = await supabase
    .from("calendar_notes")
    .select("id, note_date, body, created_by, repeat_interval, reminder_time")
    .lte("note_date", reminderEnd)
    .or(`note_date.gte.${today},repeat_interval.neq.none`);

  if (notesError) {
    console.error("loadCalendarMonitoringNotifications failed:", notesError.message);
    const migrationRequired =
      notesError.code === "42703" &&
      /repeat_interval|reminder_time/.test(notesError.message);
    calendarError = migrationRequired
      ? "Apply sql/12_recurring_calendar_notes.sql in Supabase to show calendar reminders."
      : "Could not load calendar reminders.";
  } else {
    const reminders = ((notes ?? []) as unknown as CalendarNoteRecord[]).flatMap((note) =>
      getCalendarNoteOccurrences(note, today, reminderEnd).map((date) => ({
        note,
        date,
        occursAt: new Date(
          `${date}T${note.reminder_time.slice(0, 5)}:00+08:00`,
        ).toISOString(),
      })),
    );
    for (const { note, date, occursAt } of reminders) {
      notifications.push({
        id: `calendar:${note.id}:${date}`,
        category: "calendar",
        title: note.body,
        href: `/admin?cal=${date.slice(0, 7)}&day=${date}#calendar`,
        sortDate: occursAt,
      });
    }
  }

  const categoryOrder: Record<MonitoringNotification["category"], number> = {
    overdue: 0,
    due_soon: 1,
    calendar: 2,
    new_ticket: 3,
  };
  notifications.sort(
    (a, b) =>
      categoryOrder[a.category] - categoryOrder[b.category] ||
      (a.category === "new_ticket"
        ? b.sortDate.localeCompare(a.sortDate)
        : a.sortDate.localeCompare(b.sortDate)),
  );

  return NextResponse.json(
    {
      userId: me.id,
      notifications,
      count:
        notifications.length -
        (overflowTickets > 0 ? 1 : 0) +
        overflowTickets,
      calendarError,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
