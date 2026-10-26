"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { CALENDAR_RECURRENCES } from "@/lib/calendar-recurrence";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;

function back(day: string, cal: string, code: string): never {
  const qs = new URLSearchParams();
  if (MONTH.test(cal)) qs.set("cal", cal);
  if (DAY.test(day)) qs.set("day", day);
  qs.set("msg", code);
  redirect(`/admin?${qs.toString()}#calendar`);
}

const text = (fd: FormData, key: string, max: number) => String(fd.get(key) ?? "").trim().slice(0, max);

// Anyone who can see the dashboard may add a note to the shared calendar.
export async function addCalendarNote(formData: FormData) {
  const me = await getMe();
  const day = text(formData, "day", 10);
  const cal = text(formData, "cal", 7);
  if (!me || !can(me, "dashboard", "view")) back(day, cal, "note_forbidden");

  const body = text(formData, "body", 300);
  const repeatInterval = text(formData, "repeat_interval", 10);
  const reminderTime = text(formData, "reminder_time", 5);
  const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(reminderTime);
  if (
    !DAY.test(day) ||
    !body ||
    Number.isNaN(Date.parse(`${day}T00:00:00Z`)) ||
    !CALENDAR_RECURRENCES.includes(repeatInterval as (typeof CALENDAR_RECURRENCES)[number]) ||
    !validTime
  ) {
    back(day, cal, "note_invalid");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("calendar_notes").insert({
    note_date: day,
    body,
    created_by: me.id,
    repeat_interval: repeatInterval,
    reminder_time: reminderTime,
  });
  if (error) {
    console.error("addCalendarNote failed:", error.message);
    if (
      error.code === "42703" &&
      /repeat_interval|reminder_time/.test(error.message)
    ) {
      back(day, cal, "note_setup_required");
    }
    back(day, cal, "note_error");
  }

  revalidatePath("/admin");
  back(day, cal, repeatInterval === "none" ? "note_added" : "reminder_added");
}

// You can delete your own notes. Full access to the dashboard can delete any note.
// (The database enforces this too.)
export async function deleteCalendarNote(formData: FormData) {
  const me = await getMe();
  const day = text(formData, "day", 10);
  const cal = text(formData, "cal", 7);
  if (!me || !can(me, "dashboard", "view")) back(day, cal, "note_forbidden");

  const id = text(formData, "id", 40);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) back(day, cal, "note_invalid");

  const supabase = await createClient();
  const { error } = await supabase.from("calendar_notes").delete().eq("id", id);
  if (error) {
    console.error("deleteCalendarNote failed:", error.message);
    back(day, cal, "note_error");
  }

  revalidatePath("/admin");
  back(day, cal, "note_deleted");
}
