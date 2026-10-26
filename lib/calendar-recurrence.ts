export const CALENDAR_RECURRENCES = [
  "none",
  "daily",
  "weekly",
  "monthly",
  "yearly",
] as const;

export type CalendarRecurrence = (typeof CALENDAR_RECURRENCES)[number];

export type CalendarNoteRecord = {
  id: string;
  note_date: string;
  body: string;
  created_by: string | null;
  repeat_interval: CalendarRecurrence;
  reminder_time: string;
};

export function getCalendarNoteOccurrences(
  note: Pick<CalendarNoteRecord, "note_date" | "repeat_interval">,
  start: string,
  end: string,
): string[] {
  const first = note.note_date > start ? note.note_date : start;
  if (first > end || note.note_date > end) return [];
  if (note.repeat_interval === "none") {
    return note.note_date >= start ? [note.note_date] : [];
  }

  const occurrences: string[] = [];
  const startDate = new Date(`${first}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  if (note.repeat_interval === "daily") {
    for (const date = new Date(startDate); date <= endDate; date.setUTCDate(date.getUTCDate() + 1)) {
      occurrences.push(date.toISOString().slice(0, 10));
    }
  } else if (note.repeat_interval === "weekly") {
    const sourceWeekday = new Date(`${note.note_date}T00:00:00Z`).getUTCDay();
    const firstWeekday = startDate.getUTCDay();
    const offset = (sourceWeekday - firstWeekday + 7) % 7;
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + offset);
    for (; date <= endDate; date.setUTCDate(date.getUTCDate() + 7)) {
      occurrences.push(date.toISOString().slice(0, 10));
    }
  } else if (note.repeat_interval === "monthly") {
    const dayOfMonth = new Date(`${note.note_date}T00:00:00Z`).getUTCDate();
    const firstMonth = startDate.getUTCFullYear() * 12 + startDate.getUTCMonth();
    const lastMonth = endDate.getUTCFullYear() * 12 + endDate.getUTCMonth();
    for (let currentMonth = firstMonth; currentMonth <= lastMonth; currentMonth++) {
      const year = Math.floor(currentMonth / 12);
      const month = currentMonth % 12;
      const date = new Date(Date.UTC(year, month, dayOfMonth));
      if (
        date.getUTCMonth() === month &&
        date >= startDate &&
        date <= endDate
      ) {
        occurrences.push(date.toISOString().slice(0, 10));
      }
    }
  } else if (note.repeat_interval === "yearly") {
    const source = new Date(`${note.note_date}T00:00:00Z`);
    for (let year = startDate.getUTCFullYear(); year <= endDate.getUTCFullYear(); year++) {
      const date = new Date(Date.UTC(year, source.getUTCMonth(), source.getUTCDate()));
      if (
        date.getUTCMonth() === source.getUTCMonth() &&
        date >= startDate &&
        date <= endDate
      ) {
        occurrences.push(date.toISOString().slice(0, 10));
      }
    }
  }

  return occurrences;
}

export function formatReminderTime(time: string): string {
  const [hoursValue, minutes] = time.split(":").map(Number);
  const suffix = hoursValue >= 12 ? "PM" : "AM";
  const hours = hoursValue % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
