"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFormDef } from "@/lib/forms/definitions";
import { parseFormValues } from "@/lib/forms/data";
import { TOKEN } from "@/lib/forms/token";
import { moveProject } from "@/lib/forms/project-status";

// The client saves or submits the form. No login: the secret link is the key.
export async function submitClientForm(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!TOKEN.test(token)) redirect("/");
  const page = `/fill/${token}`;

  const admin = createAdminClient();
  const { data: r } = await admin
    .from("form_requests")
    .select("id, project_id, form_code, expires_at, closed_at")
    .eq("token", token)
    .maybeSingle();
  const request = r as unknown as {
    id: string;
    project_id: string;
    form_code: string;
    expires_at: string;
    closed_at: string | null;
  } | null;
  if (!request || request.closed_at || new Date(request.expires_at) < new Date()) redirect(page);

  const def = getFormDef(request.form_code);
  if (!def) redirect(page);

  // Only a form that is waiting for the client can be changed.
  const { data: rec } = await admin
    .from("form_records")
    .select("id, status")
    .eq("project_id", request.project_id)
    .eq("form_code", request.form_code)
    .maybeSingle();
  const record = rec as unknown as { id: string; status: string } | null;
  if (!record || (record.status !== "with_client" && record.status !== "returned")) redirect(page);

  const values = parseFormValues(def, formData);
  const submit = String(formData.get("intent") ?? "") === "submit";

  const { error } = await admin
    .from("form_records")
    .update({ data: values, ...(submit ? { status: "submitted" } : {}) })
    .eq("id", record.id);
  if (error) {
    console.error("submitClientForm failed:", error.message);
    redirect(`${page}?msg=error`);
  }

  if (submit) {
    await admin.from("form_requests").update({ submitted_at: new Date().toISOString() }).eq("id", request.id);
    await moveProject(admin, request.project_id, "pending_lds"); // now LDS has to review it
  }

  // The target completion date on the request form becomes the due date (if none is set yet).
  if (request.form_code === "F01" && typeof values.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(values.endDate)) {
    await admin.from("projects").update({ due_date: values.endDate }).eq("id", request.project_id).is("due_date", null);
  }

  // Keep the project title in step with the request form.
  if (def.syncTitleKey) {
    const title = String(values[def.syncTitleKey] ?? "").trim();
    if (title) await admin.from("projects").update({ title }).eq("id", request.project_id);
  }

  revalidatePath(`/admin/projects/${request.project_id}`);
  revalidatePath("/admin/projects");
  redirect(`${page}?msg=${submit ? "submitted" : "saved"}`);
}
