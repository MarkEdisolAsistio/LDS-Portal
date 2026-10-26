"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseInquiry, saveInquiry } from "@/lib/inquiries";
import { sendMail } from "@/lib/mail";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

export async function submitInquiry(formData: FormData) {
  // Hidden "website" field: people never see it, spam bots fill it in.
  if (String(formData.get("website") ?? "").trim()) {
    redirect("/inquiry/thanks");
  }

  const parsed = parseInquiry(formData);
  if (!parsed.ok) redirect(`/inquiry?error=${parsed.code}`);
  const files = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > 5) redirect("/inquiry?error=too_many_attachments");
  if (files.some((file) => file.size > 10 * 1024 * 1024)) redirect("/inquiry?error=bad_attachment");

  // The public form writes with the server-side key, so visitors never get
  // direct write access to the database.
  const saved = await saveInquiry(createAdminClient(), parsed.data, {
    createdBy: null,
  });
  if (!saved) redirect("/inquiry?error=server");

  const admin = createAdminClient();
  const { data: category } = await admin
    .from("categories")
    .select("name")
    .eq("id", parsed.data.categoryId)
    .maybeSingle();
  const requestType = parsed.data.kind === "buy" ? "Buy a product" : "Request a build";
  const categoryName = (category as unknown as { name: string } | null)?.name ?? `Category ${parsed.data.categoryId}`;

  // Keep the original public inquiry in the Inbox thread. The migration is
  // optional during rollout, so a missing table must not block submissions.
  const messageBody = [
    `Request type: ${requestType}`,
    `Module category: ${categoryName}`,
    `Quantity: ${parsed.data.quantity}`,
    `Description: ${parsed.data.customSpec || "-"}`,
    parsed.data.notes ? `Other notes: ${parsed.data.notes}` : "",
    "",
    "From",
    `Name: ${parsed.data.name}`,
    `Number: ${parsed.data.phone || "-"}`,
    `Company: ${parsed.data.organization || "-"}`,
    `Email: ${parsed.data.email}`,
  ].filter(Boolean).join("\n");
  const inboxEmail = process.env.MAIL_NOTIFY_TO ?? process.env.SMTP_USER ?? "";
  const uploaded: { name: string; path: string; size: number; contentType: string; content: Buffer }[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "attachment";
    const path = `${saved.id}/${randomUUID()}-${safeName}`;
    const content = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from("email-attachments").upload(path, content, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) {
      if (uploaded.length) await admin.storage.from("email-attachments").remove(uploaded.map((item) => item.path));
      redirect("/inquiry?error=attachment_upload_failed");
    }
    uploaded.push({ name: safeName, path, size: file.size, contentType: file.type || "application/octet-stream", content });
  }

  await admin.from("email_messages").insert({
    inquiry_id: saved.id,
    direction: "inbound",
    from_email: parsed.data.email,
    to_email: inboxEmail,
    subject: `New inquiry - ${saved.ticketNo}`,
    body_text: messageBody,
    attachments: uploaded.map(({ name, path, size, contentType }) => ({ name, path, size, contentType })),
    is_read: false,
  });

  // Keep saving the inquiry independent from email delivery. SMTP can be
  // configured later without preventing public submissions.
  if (inboxEmail) {
    const mail = await sendMail({
      to: inboxEmail,
      subject: `New inquiry - ${saved.ticketNo}`,
      text: messageBody,
      html: `<p><strong>New inquiry ${escapeHtml(saved.ticketNo)}</strong></p><p>${escapeHtml(messageBody).replace(/\n/g, "<br>")}</p>`,
      attachments: uploaded.map((file) => ({ filename: file.name, content: file.content, contentType: file.contentType })),
    });
    if (!mail.ok && mail.reason !== "not_configured") {
      console.error("new inquiry notification failed:", mail.reason);
    }
  }

  redirect(`/inquiry/thanks?ticket=${encodeURIComponent(saved.ticketNo)}`);
}
