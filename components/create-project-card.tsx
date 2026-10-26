import Link from "next/link";
import { FORM_STATUS_LABELS, FORM_STATUS_STYLES, type FormStatus } from "@/lib/forms/status";

export type TicketProject = {
  id: string;
  code: string;
  dueDate: string | null;
  forms: { code: string; status: FormStatus }[];
};

// Shown on the ticket page: the project created for this ticket and where each of its forms stands.
export function ProjectCard({ project }: { project: TicketProject | null }) {
  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="font-medium">Project and forms</h2>
      {project ? (
        <>
          <p className="text-sm text-slate-600">
            Project <strong>{project.code}</strong>, created automatically from this ticket. They share one status.
          </p>
          <p className="text-sm text-slate-600">
            Deadline: <strong>{project.dueDate ?? "Not set"}</strong>
          </p>
          {project.forms.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {project.forms.map((f) => (
                <li key={f.code}>
                  <Link
                    href={`/admin/projects/${project.id}/forms/${f.code}`}
                    className={`inline-block rounded-full px-3 py-1 text-xs ${FORM_STATUS_STYLES[f.status]}`}
                  >
                    {f.code.replace("-", ".")}: {FORM_STATUS_LABELS[f.status]}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/admin/projects/${project.id}`} className="inline-block rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">
            Open project and forms
          </Link>
        </>
      ) : (
        <p className="text-sm text-slate-500">No project found for this ticket.</p>
      )}
    </section>
  );
}
