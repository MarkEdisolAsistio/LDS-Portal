"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { CLIENT_TYPES, UUID, isStatus, type ClientType } from "@/lib/inquiries";
import { getFormDef } from "@/lib/forms/definitions";
import { parseFormValues } from "@/lib/forms/data";

const LIST = "/admin/projects";

function done(path: string, code: string): never {
  redirect(`${path}?msg=${code}`);
}

async function requireEditor() {
  const me = await getMe();
  if (!me || !can(me, "projects", "edit")) done(LIST, "forbidden");
  return me;
}

const field = (fd: FormData, key: string, max: number) =>
  String(fd.get(key) ?? "").trim().slice(0, max);

// ---------- Edit the project header ----------
export async function updateProject(formData: FormData) {
  const me = await requireEditor();

  const id = field(formData, "id", 40);
  if (!UUID.test(id)) done(LIST, "invalid");
  const page = `${LIST}/${id}`;

  const title = field(formData, "title", 160);
  const clientType = field(formData, "client_type", 20) as ClientType;
  const dueRaw = field(formData, "due_date", 10);
  if (dueRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dueRaw)) done(page, "invalid");
  if (!title || !CLIENT_TYPES.includes(clientType)) {
    done(page, "invalid");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({
      title,
      due_date: dueRaw || null,
      client_type: clientType,
      client_org: field(formData, "client_org", 160) || null,
      contact_person: field(formData, "contact_person", 120) || null,
      contact_info: field(formData, "contact_info", 200) || null,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("updateProject failed:", error?.message);
    done(page, "error");
  }

  await audit(me.id, "update_project", "project", id);
  revalidatePath(LIST);
  revalidatePath("/admin");
  revalidatePath("/admin/inquiries");
  done(page, "saved");
}

// ---------- Save a form ----------
export async function saveForm(formData: FormData) {
  const me = await requireEditor();

  const projectId = field(formData, "project_id", 40);
  const code = field(formData, "form_code", 10);
  const def = getFormDef(code);
  if (!UUID.test(projectId) || !def) done(LIST, "invalid");
  const page = `${LIST}/${projectId}/forms/${code}`;

  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (!project) done(LIST, "invalid");

  const values = parseFormValues(def, formData);
  const { data: existing } = await supabase
    .from("form_records")
    .select("id, status")
    .eq("project_id", projectId)
    .eq("form_code", code)
    .maybeSingle();

  // "Save changes" keeps the client-related status; only "completed" ends it.
  const previous = (existing as unknown as { status: string } | null)?.status;
  const wantsComplete = field(formData, "intent", 20) === "complete";
  const status = wantsComplete
    ? "completed"
    : previous === "with_client" || previous === "submitted" || previous === "returned"
      ? previous
      : "draft";

  const { error } = existing
    ? await supabase
        .from("form_records")
        .update({ data: values, status, updated_by: me.id })
        .eq("id", (existing as unknown as { id: string }).id)
    : await supabase.from("form_records").insert({
        project_id: projectId,
        form_code: code,
        data: values,
        status,
        created_by: me.id,
        updated_by: me.id,
      });
  if (error) {
    console.error("saveForm failed:", error.message);
    done(page, "error");
  }

  // Completing a form closes the client link for it.
  if (status === "completed") {
    await supabase
      .from("form_requests")
      .update({ closed_at: new Date().toISOString() })
      .eq("project_id", projectId)
      .eq("form_code", code)
      .is("closed_at", null);
  }

  // The dates written on the forms feed the project's due date:
  // the target completion on the request form (only if no due date is set yet),
  // and the proposed completion on the evaluation form (the agreed date, so it replaces it).
  const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (code === "F01" && isDay(values.endDate)) {
    await supabase.from("projects").update({ due_date: values.endDate }).eq("id", projectId).is("due_date", null);
  } else if (code === "F02" && isDay(values.proposedEnd)) {
    await supabase.from("projects").update({ due_date: values.proposedEnd }).eq("id", projectId);
  }

  // Keep the project title in step with the request form.
  if (def.syncTitleKey) {
    const newTitle = String(values[def.syncTitleKey] ?? "").trim();
    if (newTitle) await supabase.from("projects").update({ title: newTitle }).eq("id", projectId);
  }

  await audit(me.id, "save_form", "form", `${projectId}/${code}`, { status });
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${projectId}`);
  revalidatePath("/admin");
  done(page, status === "completed" ? "completed" : "saved");
}

// ---------- Change the status of a project (and its ticket) ----------
export async function setProjectStatus(formData: FormData) {
  const me = await requireEditor();
  const id = field(formData, "id", 40);
  const status = field(formData, "status", 30);
  if (!UUID.test(id) || !isStatus(status)) done(LIST, "invalid");

  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update({ status }).eq("id", id).select("id").maybeSingle();
  if (error || !data) {
    console.error("setProjectStatus failed:", error?.message);
    done(`${LIST}/${id}`, "error");
  }

  await audit(me.id, "set_project_status", "project", id, { status });
  revalidatePath(LIST);
  revalidatePath("/admin/inquiries");
  revalidatePath("/admin");
  done(`${LIST}/${id}`, "saved");
}

// ---------- Delete a project ----------
export async function deleteProject(formData: FormData) {
  const me = await getMe();
  if (!me || !can(me, "projects", "full")) done(LIST, "forbidden");

  const id = field(formData, "id", 40);
  if (!UUID.test(id)) done(LIST, "invalid");

  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) {
    console.error("deleteProject failed:", error.message);
    done(`${LIST}/${id}`, "error");
  }

  await audit(me.id, "delete_project", "project", id);
  revalidatePath(LIST);
  revalidatePath("/admin");
  revalidatePath("/admin/inquiries");
  done(LIST, "deleted");
}
