import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { InquiryFields } from "@/components/inquiry-fields";
import { getCategories, getProduct } from "@/lib/lookups";
import { UUID } from "@/lib/inquiries";
import { submitInquiry } from "./actions";

const ERRORS: Record<string, string> = {
  invalid_contact: "Please enter your name and a valid email address.",
  missing_contact_details: "Please enter your phone number and company or department.",
  invalid_category: "Please choose a module category.",
  invalid_quantity: "Quantity must be a whole number from 1 to 10000.",
  need_description: "Please describe what you need (at least 10 characters).",
  too_many_attachments: "Attach up to 5 files.",
  bad_attachment: "Each attachment must be 10 MB or smaller.",
  attachment_upload_failed: "We could not upload the attachment. Please try again.",
  invalid: "Please check the form and try again.",
  server: "We could not save your inquiry. Please try again in a moment.",
};

export default async function InquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; product?: string; kind?: string; category?: string }>;
}) {
  const { error, product, kind, category } = await searchParams;
  const categories = await getCategories();
  const selected = product && UUID.test(product) ? await getProduct(product) : null;

  const defaults = {
    kind: kind === "buy" || kind === "build" ? kind : undefined,
    category_id: selected
      ? String(selected.category_id)
      : /^\d+$/.test(category ?? "")
        ? category
        : undefined,
  };

  return (
    <SiteShell>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/projects" className="text-sm text-slate-500 underline">
          Back to projects
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Make an inquiry</h1>
        <p className="mt-1 text-slate-600">
          Buy one of our trainer modules or ask us to build a custom one. You will
          get a ticket number so you can follow up with us.
        </p>

        {error && ERRORS[error] && (
          <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {ERRORS[error]}
          </p>
        )}

        {selected && (
          <p className="mt-4 rounded bg-blue-50 p-3 text-sm text-blue-800">
            About: <strong>{selected.title}</strong>
          </p>
        )}

        <form action={submitInquiry} className="mt-6 space-y-8">
          {selected && <input type="hidden" name="product_id" value={selected.id} />}

          <InquiryFields categories={categories} defaults={defaults} />

          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-lg text-blue-700" aria-hidden="true">📎</span>
              <div className="min-w-0 flex-1">
                <label htmlFor="inquiry-attachments" className="block text-sm font-medium text-slate-800">Attach supporting files <span className="font-normal text-slate-500">(optional)</span></label>
                <p className="mt-1 text-xs text-slate-500">Add documents or images that help explain your request. Up to 5 files, 10 MB each.</p>
                <input id="inquiry-attachments" type="file" name="attachments" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt" className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#0d5a89] file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#0b446a]" />
              </div>
            </div>
          </div>

          {/* Spam trap: leave empty. */}
          <div aria-hidden="true" className="hidden">
            <label>
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <button className="rounded bg-[#0d5a89] px-5 py-2 text-white hover:bg-[#0b446a]">
            Send inquiry
          </button>
        </form>
      </main>
    </SiteShell>
  );
}
