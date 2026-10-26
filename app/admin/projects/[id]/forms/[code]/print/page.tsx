import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, can } from "@/lib/permissions";
import { UUID, type ClientType } from "@/lib/inquiries";
import { getFormDef } from "@/lib/forms/definitions";
import { type Values } from "@/lib/forms/data";
import { prefillFor } from "@/lib/forms/prefill";
import { FormPrint } from "@/components/forms/form-print";
import { PrintButton } from "@/components/forms/print-button";

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

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; code: string }>;
  searchParams: Promise<{ blank?: string }>;
}) {
  const { id, code } = await params;
  const { blank } = await searchParams;
  const def = getFormDef(code);
  if (!UUID.test(id) || !def) return notFound();

  const me = await getMe();
  if (!me || !can(me, "projects", "view")) {
    return <p className="text-slate-600">You do not have access to this section.</p>;
  }

  const supabase = await createClient();
  const { data: p } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  const project = p as unknown as Project | null;
  if (!project) return notFound();

  const { data: r } = await supabase
    .from("form_records")
    .select("data")
    .eq("project_id", id)
    .eq("form_code", code)
    .maybeSingle();
  const saved = (r as unknown as { data: Values } | null)?.data;

  const isBlank = blank === "1";
  const data: Values =
    saved ??
    (await prefillFor(project, def));

  return (
    <div>
      <div className="lf-noprint mx-auto mb-4 flex max-w-[794px] flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/projects/${project.id}/forms/${def.code}`} className="text-sm text-slate-500 underline">
          Back to the form
        </Link>
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500">
            {isBlank ? "Blank form" : saved ? "Saved answers" : "Not saved yet: showing the details we already know"} - in
            the print window choose &quot;Save as PDF&quot;, and turn off &quot;Headers and footers&quot;.
          </p>
          <PrintButton />
        </div>
      </div>
      <FormPrint def={def} data={data} blank={isBlank} />
    </div>
  );
}
