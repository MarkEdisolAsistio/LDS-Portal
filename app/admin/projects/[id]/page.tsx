import Link from "next/link";
import { FORM_STATUS_LABELS, FORM_STATUS_STYLES, type FormStatus } from "@/lib/forms/status";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { CLIENT_TYPES, CLIENT_TYPE_LABELS, UUID, type ClientType } from "@/lib/inquiries";
import { LIFECYCLE } from "@/lib/forms/registry";
import { FORMS } from "@/lib/forms/definitions";
import { formatDate } from "@/lib/format";
import { inputClass } from "@/components/inquiry-fields";
import { STATUSES, STATUS_LABELS, type Status } from "@/lib/status";
import { STATUS_STYLES } from "@/lib/status-style";
import { updateProject, deleteProject, setProjectStatus } from "../actions";

type Project = {
  id: string;
  project_code: string;
  title: string;
  inquiry_id: string | null;
  status: Status;
  client_type: ClientType;
  client_org: string | null;
  contact_person: string | null;
  contact_info: string | null;
  created_at: string;
  due_date: string | null;
};
type FormRow = { form_code: string; status: FormStatus; updated_at: string };

const MESSAGES: { [code: string]: { ok: boolean; text: string } } = {
  created: { ok: true, text: "Project created. Start with the request form below." },
  saved: { ok: true, text: "Saved." },
  invalid: { ok: false, text: "Please check the form and try again." },
  forbidden: { ok: false, text: "You do not have permission to do that." },
  error: { ok: false, text: "Could not save. Check the terminal for details." },
};

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const { id } = await params;
  const { msg } = await searchParams;
  if (!UUID.test(id)) return notFound();

  const me = await getMe();
  if (!me || !can(me, "projects", "view")) {
    return <p className="text-slate-600">You do not have access to this section.</p>;
  }
  const canEdit = can(me, "projects", "edit");
  const canDelete = can(me, "projects", "full");

  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  const project = data as unknown as Project | null;
  if (!project) return notFound();

  const { data: recordData } = await supabase
    .from("form_records")
    .select("form_code, status, updated_at")
    .eq("project_id", id);
  const records = new Map(((recordData ?? []) as unknown as FormRow[]).map((r) => [r.form_code, r]));

  let ticket: { ticket_no: string } | null = null;
  if (project.inquiry_id && can(me, "inquiries", "view")) {
    const { data: t } = await supabase.from("inquiries").select("ticket_no").eq("id", project.inquiry_id).maybeSingle();
    ticket = t as unknown as { ticket_no: string } | null;
  }

  const banner = msg ? MESSAGES[msg] : undefined;
  const card = "rounded-lg border border-slate-200 bg-white p-5";
  const button = "rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]";
  const small = "rounded border border-[#0d5a89] px-3 py-1 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]";
  const startSmall = "rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700";
  const printSmall = "rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700";

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/admin/projects" className="text-sm text-slate-500 underline">
          Back to projects
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{project.project_code}</h1>
        <p className="text-slate-600">{project.title}</p>
        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm ${STATUS_STYLES[project.status]}`}>
          {STATUS_LABELS[project.status]}
        </span>
        <p className="text-sm text-slate-500">
          Created {formatDate(project.created_at)}
          {ticket && project.inquiry_id && (
            <>
              {" - "}from ticket{" "}
              <Link href={`/admin/inquiries/${project.inquiry_id}`} className="text-blue-700 underline">
                {ticket.ticket_no}
              </Link>
            </>
          )}
        </p>
      </div>

      {banner && (
        <p role="status" className={`rounded p-3 text-sm ${banner.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {banner.text}
        </p>
      )}

      {/* Status */}
      <form action={setProjectStatus} className={`${card} grid gap-4 md:max-w-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-end`}>
        <input type="hidden" name="id" value={project.id} />
        <label className="text-sm text-slate-700">
          Status
          <select name="status" defaultValue={project.status} disabled={!canEdit} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        {canEdit && <button className={button}>Update status</button>}
      </form>

      {/* Forms */}
      <section className={`${card} space-y-5 md:max-w-3xl`}>
        <div>
          <h2 className="font-medium">Forms</h2>
          <p className="text-sm text-slate-500">
            Type each form here. When it is done, print it or save it as PDF and sign it by hand.
          </p>
        </div>

        {LIFECYCLE.map((stage) => (
          <div key={stage.stage}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{stage.stage}</p>
            <ul className="divide-y divide-slate-100 rounded border border-slate-200">
              {stage.forms.map((f) => {
                const built = Boolean(FORMS[f.code]);
                const record = records.get(f.code);
                const base = `/admin/projects/${project.id}/forms/${f.code}`;
                return (
                  <li key={f.code} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="mr-2 font-medium text-slate-900">{f.code.replace("-", ".")}</span>
                        {f.title}
                      </p>
                      {record && <p className="text-xs text-slate-400">Updated {formatDate(record.updated_at)}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {!built ? (
                        <span className="text-xs text-slate-400">Coming soon</span>
                      ) : (
                        <>
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${FORM_STATUS_STYLES[record?.status ?? "none"]}`}
                          >
                            {record ? FORM_STATUS_LABELS[record.status] : "Not started"}
                          </span>
                          <Link
                            href={base}
                            className={!record && canEdit ? startSmall : small}
                          >
                            {record ? (canEdit ? "Open" : "View") : canEdit ? "Start" : "View"}
                          </Link>
                          <Link href={`${base}/print`} className={printSmall}>
                            Print
                          </Link>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      {/* Project details */}
      <form action={updateProject} className={`${card} grid gap-4 md:max-w-3xl md:grid-cols-2`}>
        <input type="hidden" name="id" value={project.id} />
        <h2 className="font-medium md:col-span-2">Project details</h2>
        <fieldset disabled={!canEdit} className="contents">
          <label className="text-sm text-slate-700">
            Reference no. (same as the ticket)
            <input value={project.project_code} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
          </label>
          <label className="text-sm text-slate-700">
            Client type
            <select name="client_type" defaultValue={project.client_type} className={inputClass}>
              {CLIENT_TYPES.map((t) => (
                <option key={t} value={t}>{CLIENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700">
            Due date (for the SLA and the calendar)
            <input type="date" name="due_date" defaultValue={project.due_date ?? ""} className={inputClass} />
          </label>
          <label className="text-sm text-slate-700 md:col-span-2">
            Project title / learnware name
            <input name="title" required maxLength={160} defaultValue={project.title} className={inputClass} />
          </label>
          <label className="text-sm text-slate-700">
            Department / company
            <input name="client_org" maxLength={160} defaultValue={project.client_org ?? ""} className={inputClass} />
          </label>
          <label className="text-sm text-slate-700">
            Contact person
            <input name="contact_person" maxLength={120} defaultValue={project.contact_person ?? ""} className={inputClass} />
          </label>
          <label className="text-sm text-slate-700 md:col-span-2">
            Contact no. / email
            <input name="contact_info" maxLength={200} defaultValue={project.contact_info ?? ""} className={inputClass} />
          </label>
        </fieldset>
        {canEdit && (
          <div className="md:col-span-2">
            <button className={button}>Save details</button>
            <p className="mt-2 text-xs text-slate-500">
              Forms already filled in keep their own copy of these details. Change them in the form too if needed.
            </p>
          </div>
        )}
      </form>

      {canDelete && (
        <section className={card}>
          <details>
            <summary className="cursor-pointer text-sm text-red-700">Delete this project</summary>
            <form action={deleteProject} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={project.id} />
              <p className="text-sm text-slate-600">
                This deletes the project, all of its forms and its inquiry ticket (with the status history), for good. The client record stays.
              </p>
              <button className="rounded bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-800">Yes, delete it</button>
            </form>
          </details>
        </section>
      )}
    </div>
  );
}
