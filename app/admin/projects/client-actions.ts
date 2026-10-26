"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { UUID, type ClientType } from "@/lib/inquiries";
import { getFormDef } from "@/lib/forms/definitions";
import { prefillFor } from "@/lib/forms/prefill";
import { clientFormEmail, sendMail, siteUrl } from "@/lib/mail";
import { moveProject } from "@/lib/forms/project-status";

const LIST = "/admin/projects";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function done(path: string, code: string): never {
  redirect(`${path}?msg=${code}`);
}

const field = (fd: FormData, key: string, max: number) =>
  String(fd.get(key) ?? "").trim().slice(0, max);

type ProjectRow = {
  id: string;
  inquiry_id: string | null;
  project_code: string;
  title: string;
  client_type: ClientType;
  client_org: string | null;
  contact_person: string | null;
  contact_info: string | null;
};
type RequestRow = { id: string; token: string };

// Shared by "send" and "return": find the project and form, make sure the form row exists.
async function prepare(formData: FormData) {
  const me = await getMe();
  if (!me || !can(me, "projects", "edit")) done(LIST, "forbidden");

  const projectId = field(formData, "project_id", 40);
  const code = field(formData, "form_code", 10);
  const def = getFormDef(code);
  if (!UUID.test(projectId) || !def) done(LIST, "invalid");
  const page = `${LIST}/${projectId}/forms/${code}`;

  const supabase = await createClient();
  const { data: p } = await supabase.from("projects").select("*").eq("id", projectId).maybeSingle();
  const project = p as unknown as ProjectRow | null;
  if (!project) done(LIST, "invalid");

  const email = field(formData, "email", 200).toLowerCase();
  if (!EMAIL.test(email)) done(page, "bad_email");

  return { me, supabase, project, def, code, page, email };
}

async function mailTheClient(args: {
  to: string;
  formTitle: string;
  projectCode: string;
  token: string;
  message?: string;
  returnNote?: string;
}) {
  const link = `${await siteUrl()}/fill/${args.token}`;
  const mail = clientFormEmail({
    formTitle: args.formTitle,
    projectCode: args.projectCode,
    link,
    message: args.message,
    returnNote: args.returnNote,
  });
  return sendMail({ to: args.to, ...mail });
}

// ---------- Send a form to the client ----------
export async function sendToClient(formData: FormData) {
  const { me, supabase, project, def, code, page, email } = await prepare(formData);
  const message = field(formData, "message", 500);

  // One open request per form. Sending again gives a fresh link and replaces the old one.
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

  const { data: open } = await supabase
    .from("form_requests")
    .select("id, token")
    .eq("project_id", project.id)
    .eq("form_code", code)
    .is("closed_at", null)
    .maybeSingle();

  const { error } = open
    ? await supabase
        .from("form_requests")
        .update({ token, sent_to: email, message: message || null, return_note: null, expires_at: expires, submitted_at: null })
        .eq("id", (open as unknown as RequestRow).id)
    : await supabase.from("form_requests").insert({
        project_id: project.id,
        form_code: code,
        token,
        sent_to: email,
        message: message || null,
        expires_at: expires,
        created_by: me.id,
      });
  if (error) {
    console.error("sendToClient failed:", error.message);
    done(page, "error");
  }

  // The form in the portal now waits for the client.
  const { data: record } = await supabase
    .from("form_records")
    .select("id")
    .eq("project_id", project.id)
    .eq("form_code", code)
    .maybeSingle();
  if (record) {
    await supabase
      .from("form_records")
      .update({ status: "with_client", updated_by: me.id })
      .eq("id", (record as unknown as { id: string }).id);
  } else {
    await supabase.from("form_records").insert({
      project_id: project.id,
      form_code: code,
      status: "with_client",
      created_by: me.id,
      updated_by: me.id,
      data: await prefillFor(project, def),
    });
  }

  const sent = await mailTheClient({
    to: email,
    formTitle: def.title,
    projectCode: project.project_code,
    token,
    message,
  });
  if (sent.ok) await supabase.from("form_requests").update({ last_sent_at: new Date().toISOString() }).eq("token", token);

  await moveProject(supabase, project.id, "pending_customer"); // waiting for the client
  await audit(me.id, "send_form_to_client", "form", `${project.id}/${code}`, { to: email, emailed: sent.ok });
  revalidatePath(`${LIST}/${project.id}`);
  done(page, sent.ok ? "sent" : sent.reason === "not_configured" ? "sent_manual" : "mail_failed");
}

// ---------- Return a submitted form to the client with a reason ----------
export async function returnToClient(formData: FormData) {
  const { me, supabase, project, def, code, page, email } = await prepare(formData);
  const note = field(formData, "note", 1000);
  if (!note) done(page, "note_required");

  const expires = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  const { data: open } = await supabase
    .from("form_requests")
    .select("id, token")
    .eq("project_id", project.id)
    .eq("form_code", code)
    .is("closed_at", null)
    .maybeSingle();

  let token: string;
  if (open) {
    // Same link keeps working, now with the note on top.
    token = (open as unknown as RequestRow).token;
    const { error } = await supabase
      .from("form_requests")
      .update({ sent_to: email, return_note: note, submitted_at: null, expires_at: expires })
      .eq("id", (open as unknown as RequestRow).id);
    if (error) {
      console.error("returnToClient failed:", error.message);
      done(page, "error");
    }
  } else {
    // The request was already closed (for example the form was completed). Open a new one.
    token = randomBytes(32).toString("hex");
    const { error } = await supabase.from("form_requests").insert({
      project_id: project.id,
      form_code: code,
      token,
      sent_to: email,
      return_note: note,
      expires_at: expires,
      created_by: me.id,
    });
    if (error) {
      console.error("returnToClient failed:", error.message);
      done(page, "error");
    }
  }

  await supabase
    .from("form_records")
    .update({ status: "returned", updated_by: me.id })
    .eq("project_id", project.id)
    .eq("form_code", code);

  const sent = await mailTheClient({
    to: email,
    formTitle: def.title,
    projectCode: project.project_code,
    token,
    returnNote: note,
  });
  if (sent.ok) await supabase.from("form_requests").update({ last_sent_at: new Date().toISOString() }).eq("token", token);

  await moveProject(supabase, project.id, "pending_customer"); // waiting for the client
  await audit(me.id, "return_form_to_client", "form", `${project.id}/${code}`, { to: email, emailed: sent.ok, note });
  revalidatePath(`${LIST}/${project.id}`);
  done(page, sent.ok ? "returned" : sent.reason === "not_configured" ? "returned_manual" : "mail_failed");
}

// ---------- Cancel: take the form back from the client ----------
export async function cancelClientRequest(formData: FormData) {
  const me = await getMe();
  if (!me || !can(me, "projects", "edit")) done(LIST, "forbidden");
  const projectId = field(formData, "project_id", 40);
  const code = field(formData, "form_code", 10);
  if (!UUID.test(projectId) || !getFormDef(code)) done(LIST, "invalid");
  const page = `${LIST}/${projectId}/forms/${code}`;

  const supabase = await createClient();
  await supabase
    .from("form_requests")
    .update({ closed_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("form_code", code)
    .is("closed_at", null);
  await supabase
    .from("form_records")
    .update({ status: "draft", updated_by: me.id })
    .eq("project_id", projectId)
    .eq("form_code", code)
    .in("status", ["with_client", "returned", "submitted"]);

  await audit(me.id, "cancel_client_request", "form", `${projectId}/${code}`);
  revalidatePath(`${LIST}/${projectId}`);
  done(page, "cancelled");
}
