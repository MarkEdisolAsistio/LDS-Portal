"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { audit } from "@/lib/audit";
import { fetchInboxMail, sendMail } from "@/lib/mail";
import { can, getMe } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { UUID } from "@/lib/inquiries";

const field = (formData: FormData, key: string, max: number) =>
  String(formData.get(key) ?? "").trim().slice(0, max);

function back(code: string, ticket?: string, extra?: Record<string, string>): never {
  const query = new URLSearchParams({ msg: code });
  if (ticket) query.set("ticket", ticket);
  for (const [key, value] of Object.entries(extra ?? {})) query.set(key, value);
  redirect(`/admin/inbox?${query.toString()}`);
}

export async function syncMailbox() {
  const me = await getMe();
  if (!me || !can(me, "inbox", "edit")) back("forbidden");

  const supabase = createAdminClient();
  const { data: inquiries, error: inquiryError } = await supabase.from("inquiries").select("id, ticket_no").limit(1000);
  if (inquiryError) back("error");

  const mail = await fetchInboxMail();
  if (!mail.ok) back(mail.reason === "not_configured" ? "mail_sync_not_configured" : "mail_sync_failed");

  let imported = 0;
  for (const message of mail.messages) {
    const subject = message.subject.toLowerCase();
    const inquiry = (inquiries ?? []).find((item) => subject.includes(String(item.ticket_no).toLowerCase()));
    if (!inquiry || !message.text) continue;

    const { data: duplicate } = await supabase
      .from("email_messages")
      .select("id")
      .eq("inquiry_id", inquiry.id)
      .eq("direction", "inbound")
      .eq("from_email", message.from)
      .eq("subject", message.subject)
      .eq("body_text", message.text)
      .maybeSingle();
    if (duplicate) continue;

    const { error } = await supabase.from("email_messages").insert({
      inquiry_id: inquiry.id,
      direction: "inbound",
      from_email: message.from,
      to_email: message.to,
      subject: message.subject,
      body_text: message.text,
      is_read: false,
      received_at: message.receivedAt,
    });
    if (!error) imported += 1;
  }

  await audit(me.id, "sync_email_inbox", "inquiries", me.id, { imported });
  revalidatePath("/admin/inbox");
  back("synced", undefined, { count: String(imported) });
}

export async function markMessageRead(formData: FormData) {
  const me = await getMe();
  if (!me || !can(me, "inbox", "edit")) back("forbidden");

  const id = field(formData, "id", 40);
  if (!UUID.test(id)) back("invalid");

  const { error } = await createAdminClient()
    .from("email_messages")
    .update({ is_read: true })
    .eq("id", id)
    .eq("direction", "inbound");
  if (error) back("error");
  revalidatePath("/admin/inbox");
  back("read");
}

export async function markThreadRead(formData: FormData) {
  const me = await getMe();
  if (!me || !can(me, "inbox", "view")) return;

  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => UUID.test(id));
  if (ids.length === 0) return;

  await createAdminClient()
    .from("email_messages")
    .update({ is_read: true })
    .in("id", ids)
    .eq("direction", "inbound");
  revalidatePath("/admin/inbox");
}

export async function sendReply(formData: FormData) {
  const me = await getMe();
  if (!me || !can(me, "inbox", "edit")) back("forbidden");

  const inquiryId = field(formData, "inquiry_id", 40);
  const body = field(formData, "body", 8000);
  const files = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
  if (!UUID.test(inquiryId) || (body.length < 1 && files.length === 0)) back("invalid");
  if (files.length > 5) back("too_many_attachments", inquiryId);
  if (files.some((file) => file.size > 10 * 1024 * 1024)) back("bad_attachment", inquiryId);

  const supabase = createAdminClient();
  const { data: inquiry, error: inquiryError } = await supabase
    .from("inquiries")
    .select("id, ticket_no, clients(name, email)")
    .eq("id", inquiryId)
    .maybeSingle();
  const client = (inquiry as unknown as { id: string; ticket_no: string; clients: { name: string; email: string } | null } | null)?.clients;
  if (inquiryError || !inquiry || !client?.email) back("not_found");

  const subject = `LDS update - ${(inquiry as unknown as { ticket_no: string }).ticket_no}`;
  const uploaded: { name: string; path: string; size: number; contentType: string; content: Buffer }[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "attachment";
    const path = `${inquiryId}/${randomUUID()}-${safeName}`;
    const content = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from("email-attachments").upload(path, content, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) {
      if (uploaded.length) await supabase.storage.from("email-attachments").remove(uploaded.map((item) => item.path));
      back("attachment_upload_failed", inquiryId);
    }
    uploaded.push({ name: safeName, path, size: file.size, contentType: file.type || "application/octet-stream", content });
  }
  const mail = await sendMail({
    to: client.email,
    subject,
    text: body,
    html: `<p>${body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`,
    attachments: uploaded.map((file) => ({ filename: file.name, content: file.content, contentType: file.contentType })),
  });
  if (!mail.ok) {
    if (uploaded.length) await supabase.storage.from("email-attachments").remove(uploaded.map((item) => item.path));
    back(mail.reason === "not_configured" ? "mail_not_configured" : "mail_failed", inquiryId);
  }

  const { error } = await supabase.from("email_messages").insert({
    inquiry_id: inquiryId,
    direction: "outbound",
    from_email: process.env.MAIL_FROM ?? process.env.SMTP_USER ?? "",
    to_email: client.email,
    subject,
    body_text: body,
    attachments: uploaded.map(({ name, path, size, contentType }) => ({ name, path, size, contentType })),
    sent_by: me.id,
    is_read: true,
  });
  if (error) {
    if (uploaded.length) await supabase.storage.from("email-attachments").remove(uploaded.map((item) => item.path));
    back("saved_mail_failed", inquiryId);
  }

  await audit(me.id, "send_email_reply", "inquiry", inquiryId, { to: client.email });
  revalidatePath("/admin/inbox");
  revalidatePath(`/admin/inquiries/${inquiryId}`);
  back("sent", inquiryId);
}

export async function sendStaffMessage(formData: FormData) {
  const me = await getMe();
  if (!me || !can(me, "inbox", "edit")) back("forbidden");

  const recipientId = field(formData, "recipient_id", 40);
  const subject = field(formData, "subject", 200);
  const body = field(formData, "body", 8000);
  const isTeamMessage = recipientId === "all";
  if ((!isTeamMessage && (!UUID.test(recipientId) || recipientId === me.id)) || !subject || !body) back("invalid_staff_message");

  const supabase = createAdminClient();
  const { data: recipients } = await supabase.from("profiles").select("id").eq("is_active", true).neq("id", me.id);
  const recipientIds = isTeamMessage ? (recipients ?? []).map((recipient) => recipient.id) : (recipients ?? []).filter((recipient) => recipient.id === recipientId).map((recipient) => recipient.id);
  if (recipientIds.length === 0) back(isTeamMessage ? "no_staff_recipients" : "staff_not_found");

  const { error } = await supabase.from("staff_messages").insert(recipientIds.map((recipient) => ({
    sender_id: me.id,
    recipient_id: recipient,
    subject,
    body_text: body,
    is_read: false,
  })));
  if (error) {
    console.error("sendStaffMessage failed:", error.message);
    back("staff_message_failed");
  }

  await audit(me.id, "send_staff_message", "staff_message", isTeamMessage ? me.id : recipientId, { subject, team: isTeamMessage, recipients: recipientIds.length });
  revalidatePath("/admin/inbox");
  back("staff_sent");
}

export async function markStaffMessagesRead(formData: FormData) {
  const me = await getMe();
  if (!me || !can(me, "inbox", "view")) return;
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => UUID.test(id));
  if (ids.length === 0) return;
  await createAdminClient().from("staff_messages").update({ is_read: true }).in("id", ids).eq("recipient_id", me.id);
  revalidatePath("/admin/inbox");
}
