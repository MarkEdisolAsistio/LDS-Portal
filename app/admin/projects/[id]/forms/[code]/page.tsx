import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { UUID, type ClientType } from "@/lib/inquiries";
import { getFormDef } from "@/lib/forms/definitions";
import { type Values } from "@/lib/forms/data";
import { prefillFor } from "@/lib/forms/prefill";
import { getStaff } from "@/lib/lookups";
import { formatDate } from "@/lib/format";
import { FormFields } from "@/components/forms/form-fields";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMailConfigured, siteUrl } from "@/lib/mail";
import { FORM_STATUS_LABELS, FORM_STATUS_STYLES, type FormStatus } from "@/lib/forms/status";
import { inputClass } from "@/components/inquiry-fields";
import { saveForm } from "../../../actions";
import { sendToClient, returnToClient, cancelClientRequest } from "../../../client-actions";

type Project = {
  id: string;
  inquiry_id: string | null;
  project_code: string;
  title: string;
  client_type: ClientType;
  client_org: string | null;
  contact_person: string | null;
  contact_info: string | null;
};
type Record_ = {
  data: Values;
  status: FormStatus;
  updated_by: string | null;
  updated_at: string;
};

const MESSAGES: { [code: string]: { ok: boolean; text: string } } = {
  created: { ok: true, text: "Project created from the inquiry. The request form is filled in with what the client sent." },
  saved: { ok: true, text: "Saved." },
  sent: { ok: true, text: "Email sent to the client with a private link." },
  sent_manual: { ok: true, text: "Email is not set up yet, so nothing was sent. Copy the private link below and send it to the client yourself." },
  returned: { ok: true, text: "Returned to the client. They received an email with your note." },
  returned_manual: { ok: true, text: "Returned to the client, but email is not set up. Copy the private link below and send it with your note." },
  mail_failed: { ok: false, text: "The link was created but the email could not be sent. Copy the link below and send it yourself. Check SMTP settings in .env.local." },
  bad_email: { ok: false, text: "Please enter a valid email address." },
  note_required: { ok: false, text: "Please write the reason for returning the form." },
  cancelled: { ok: true, text: "The form was taken back from the client." },
  completed: { ok: true, text: "Saved and marked as completed." },
  error: { ok: false, text: "Could not save. Check the terminal for details." },
};

export default async function FormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; code: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const { id, code } = await params;
  const { msg } = await searchParams;
  const def = getFormDef(code);
  if (!UUID.test(id) || !def) return notFound();

  const me = await getMe();
  if (!me || !can(me, "projects", "view")) {
    return <p className="text-slate-600">You do not have access to this section.</p>;
  }
  const canEdit = can(me, "projects", "edit");

  const supabase = await createClient();
  const { data: p } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  const project = p as unknown as Project | null;
  if (!project) return notFound();

  const { data: r } = await supabase
    .from("form_records")
    .select("data, status, updated_by, updated_at")
    .eq("project_id", id)
    .eq("form_code", code)
    .maybeSingle();
  const record = r as unknown as Record_ | null;

  // A form that was not saved yet starts with the details we already know.
  const data: Values =
    record?.data ??
    (await prefillFor(project, def));

  // Who to email: the client on the ticket, or the contact on the project.
  const admin = createAdminClient();
  let clientEmail = /@/.test(project.contact_info ?? "") ? (project.contact_info ?? "") : "";
  if (project.inquiry_id) {
    const { data: inq } = await admin
      .from("inquiries")
      .select("clients(email)")
      .eq("id", project.inquiry_id)
      .maybeSingle();
    const e = (inq as unknown as { clients: { email: string } | null } | null)?.clients?.email;
    if (e) clientEmail = e;
  }

  const { data: reqData } = await supabase
    .from("form_requests")
    .select("token, sent_to, return_note, expires_at, last_sent_at, submitted_at")
    .eq("project_id", id)
    .eq("form_code", code)
    .is("closed_at", null)
    .maybeSingle();
  const request = reqData as unknown as {
    token: string;
    sent_to: string;
    return_note: string | null;
    expires_at: string;
    last_sent_at: string | null;
    submitted_at: string | null;
  } | null;
  const link = request ? `${await siteUrl()}/fill/${request.token}` : "";
  const mailReady = isMailConfigured();
  const status: FormStatus | "none" = record?.status ?? "none";

  const staff = record?.updated_by ? await getStaff() : [];
  const updatedBy = staff.find((s) => s.id === record?.updated_by)?.name;
  const banner = msg ? MESSAGES[msg] : undefined;
  const base = `/admin/projects/${project.id}/forms/${def.code}`;
  const button = "rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]";

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href={`/admin/projects/${project.id}`} className="text-sm text-slate-500 underline">
          Back to {project.project_code}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{def.title}</h1>
          <span className={`rounded-full px-3 py-1 text-sm ${FORM_STATUS_STYLES[status]}`}>
            {status === "none" ? "Not saved yet" : FORM_STATUS_LABELS[status]}
          </span>
        </div>
        <p className="text-sm text-slate-500">
          {def.number} - {project.project_code}
          {record && ` - last saved ${formatDate(record.updated_at)}${updatedBy ? ` by ${updatedBy}` : ""}`}
        </p>
      </div>

      {banner && (
        <p role="status" className={`rounded p-3 text-sm ${banner.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {banner.text}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={`${base}/print`} className="rounded border border-[#0d5a89] px-3 py-1 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]">
          Print / PDF
        </Link>
        <Link href={`${base}/print?blank=1`} className="rounded border border-[#0d5a89] px-3 py-1 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]">
          Print blank form
        </Link>
      </div>

      {/* Client */}
      {canEdit && (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
          <div>
            <h2 className="font-medium">Client</h2>
            <p className="text-sm text-slate-500">
              {status === "submitted"
                ? "The client submitted this form. The answers below are what they entered. Edit anything that needs changing, then complete it, or return it with a reason."
                : status === "with_client"
                  ? "Waiting for the client to fill in and submit."
                  : status === "returned"
                    ? "Returned to the client. Waiting for them to update and submit again."
                    : "Let the client fill in this form themselves. They get a private link by email, no account needed."}
            </p>
          </div>

          {request && (
            <div className="space-y-1 text-sm">
              <p className="text-slate-600">
                Sent to <strong>{request.sent_to}</strong>
                {request.last_sent_at ? ` on ${formatDate(request.last_sent_at)}` : " (email not sent)"}
                {request.submitted_at ? ` - submitted ${formatDate(request.submitted_at)}` : ""}
                {" - link valid until "}{formatDate(request.expires_at)}
              </p>
              <input readOnly value={link} className={`${inputClass} font-mono text-xs`} />
              <p className="text-xs text-slate-400">Copy this link to send it yourself, for example by chat.</p>
            </div>
          )}

          {!mailReady && (
            <p className="rounded bg-amber-50 p-2 text-sm text-amber-800">
              Email sending is not set up yet. The link is still created, and you can copy it and send it yourself.
            </p>
          )}

          {status !== "submitted" && status !== "completed" && (
            <form action={sendToClient} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="form_code" value={def.code} />
              <label className="text-sm text-slate-700">
                Client email
                <input name="email" type="email" required defaultValue={request?.sent_to ?? clientEmail} className={inputClass} />
              </label>
              <label className="text-sm text-slate-700">
                Message to the client (optional)
                <input name="message" maxLength={500} className={inputClass} />
              </label>
              <div className="md:col-span-2">
                <button className={button}>{request ? "Send again with a new link" : "Email the form to the client"}</button>
              </div>
            </form>
          )}

          {(status === "submitted" || status === "completed") && (
            <form action={returnToClient} className="space-y-3 border-t border-slate-100 pt-4">
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="form_code" value={def.code} />
              <p className="text-sm font-medium">Not approved? Return it to the client</p>
              <label className="block text-sm text-slate-700">
                Client email
                <input name="email" type="email" required defaultValue={request?.sent_to ?? clientEmail} className={inputClass} />
              </label>
              <label className="block text-sm text-slate-700">
                Why are you returning it? The client will see this.
                <textarea name="note" rows={3} required maxLength={1000} className={inputClass} />
              </label>
              <button className="rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">Return to client</button>
            </form>
          )}

          {request && (
            <form action={cancelClientRequest}>
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="form_code" value={def.code} />
              <button className="text-sm text-[#0d5a89] underline hover:text-[#0b446a]">Take it back from the client (cancel the link)</button>
            </form>
          )}
        </section>
      )}

      <form action={saveForm} className="space-y-6">
        <input type="hidden" name="project_id" value={project.id} />
        <input type="hidden" name="form_code" value={def.code} />

        <fieldset disabled={!canEdit} className="contents">
          <FormFields def={def} data={data} />
        </fieldset>

        {canEdit ? (
          <div className="flex flex-wrap gap-3">
            <button name="intent" value="draft" className="rounded border border-[#0d5a89] bg-white px-4 py-2 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]">
              {status === "draft" || status === "none" ? "Save draft" : "Save changes"}
            </button>
            <button name="intent" value="complete" className={button}>
              {status === "submitted" ? "Approve and mark completed" : "Save and mark completed"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">You can view this form but not change it.</p>
        )}
      </form>
    </div>
  );
}
