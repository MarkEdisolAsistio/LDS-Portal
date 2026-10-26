import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFormDef } from "@/lib/forms/definitions";
import { type Values } from "@/lib/forms/data";
import { FormFields } from "@/components/forms/form-fields";
import { FormPrint } from "@/components/forms/form-print";
import { PrintButton } from "@/components/forms/print-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { TOKEN } from "@/lib/forms/token";
import { submitClientForm } from "./actions";

export const metadata: Metadata = {
  title: "LDS form",
  robots: { index: false, follow: false },
};

function Message({ title, text }: { title: string; text: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="fixed right-4 top-4 z-40">
        <ThemeToggle variant="floating" />
      </div>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-slate-600">{text}</p>
    </main>
  );
}

const BANNERS: Record<string, { ok: boolean; text: string }> = {
  submitted: { ok: true, text: "Thank you. Your form was submitted to LDS. You can print it below." },
  saved: { ok: true, text: "Saved. You can come back to this link later to finish and submit." },
  error: { ok: false, text: "Could not save. Please try again." },
};

export default async function FillPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ msg?: string }>;
}) {
  const { token } = await params;
  const { msg } = await searchParams;
  const unavailable = (
    <Message
      title="This link is not available"
      text="It may have expired or been replaced by a newer one. Please contact the Learnware Development Section."
    />
  );
  if (!TOKEN.test(token)) return unavailable;

  const admin = createAdminClient();
  const { data: r } = await admin
    .from("form_requests")
    .select("project_id, form_code, return_note, expires_at, closed_at")
    .eq("token", token)
    .maybeSingle();
  const request = r as unknown as {
    project_id: string;
    form_code: string;
    return_note: string | null;
    expires_at: string;
    closed_at: string | null;
  } | null;
  if (!request) return unavailable;

  const def = getFormDef(request.form_code);
  const { data: rec } = await admin
    .from("form_records")
    .select("data, status")
    .eq("project_id", request.project_id)
    .eq("form_code", request.form_code)
    .maybeSingle();
  const record = rec as unknown as { data: Values; status: string } | null;
  const { data: pr } = await admin.from("projects").select("project_code").eq("id", request.project_id).maybeSingle();
  const projectCode = (pr as unknown as { project_code: string } | null)?.project_code ?? "";
  if (!def || !record) return unavailable;

  const expired = new Date(request.expires_at) < new Date();
  const editable = !request.closed_at && !expired && (record.status === "with_client" || record.status === "returned");
  const banner = msg ? BANNERS[msg] : undefined;

  // Cancelled or expired before it was ever submitted
  if (!editable && record.status !== "submitted" && record.status !== "completed") return unavailable;

  if (!editable) {
    const completed = record.status === "completed";
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 print:bg-white print:p-0">
        <div className="fixed right-4 top-4 z-40 lf-noprint">
          <ThemeToggle variant="floating" />
        </div>
        <div className="lf-noprint mx-auto mb-4 flex max-w-[794px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{def.title}</p>
            <p className="text-sm text-slate-500">
              {projectCode} - {completed ? "Completed by LDS" : "Submitted. LDS will review it and contact you if anything needs fixing."}
            </p>
          </div>
          <PrintButton />
        </div>
        {banner && (
          <p role="status" className="lf-noprint mx-auto mb-4 max-w-[794px] rounded bg-green-50 p-3 text-sm text-green-800">
            {banner.text}
          </p>
        )}
        <FormPrint def={def} data={record.data} />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="fixed right-4 top-4 z-40">
        <ThemeToggle variant="floating" />
      </div>
      <div>
        <p className="text-sm text-slate-500">Learnware Development Section - {projectCode}</p>
        <h1 className="text-2xl font-semibold">{def.title}</h1>
        <p className="text-sm text-slate-500">
          Please fill in the form and press Submit. You can also save it and finish later with the same link.
          Signatures are added by hand after you print.
        </p>
      </div>

      {request.return_note && record.status === "returned" && (
        <div className="rounded border-l-4 border-amber-500 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">LDS sent this form back to you</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">{request.return_note}</p>
        </div>
      )}

      {banner && (
        <p role="status" className={`rounded p-3 text-sm ${banner.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {banner.text}
        </p>
      )}

      <form action={submitClientForm} className="space-y-6">
        <input type="hidden" name="token" value={token} />
        <FormFields def={def} data={record.data} />
        <div className="flex flex-wrap gap-3">
          <button name="intent" value="save" className="rounded border border-[#0d5a89] bg-white px-4 py-2 text-sm text-[#0d5a89] hover:bg-[#e8f3f6]">
            Save and finish later
          </button>
          <button name="intent" value="submit" className="rounded bg-[#0d5a89] px-4 py-2 text-sm text-white hover:bg-[#0b446a]">
            Submit to LDS
          </button>
        </div>
      </form>
    </main>
  );
}
