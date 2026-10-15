"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseInquiry, saveInquiry } from "@/lib/inquiries";

export async function submitInquiry(formData: FormData) {
  // Hidden "website" field: people never see it, spam bots fill it in.
  if (String(formData.get("website") ?? "").trim()) {
    redirect("/inquiry/thanks");
  }

  const parsed = parseInquiry(formData);
  if (!parsed.ok) redirect(`/inquiry?error=${parsed.code}`);

  // The public form writes with the server-side key, so visitors never get
  // direct write access to the database.
  const saved = await saveInquiry(createAdminClient(), parsed.data, {
    createdBy: null,
  });
  if (!saved) redirect("/inquiry?error=server");

  redirect(`/inquiry/thanks?ticket=${encodeURIComponent(saved.ticketNo)}`);
}
