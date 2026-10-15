import Link from "next/link";
import { InquiryFields } from "@/components/inquiry-fields";
import { getCategories, getProduct } from "@/lib/lookups";
import { UUID } from "@/lib/inquiries";
import { submitInquiry } from "./actions";

const ERRORS: Record<string, string> = {
  invalid_contact: "Please enter your name and a valid email address.",
  invalid_category: "Please choose a module category.",
  invalid_quantity: "Quantity must be a whole number from 1 to 10000.",
  need_description: "Please describe what you need (at least 10 characters).",
  invalid: "Please check the form and try again.",
  server: "We could not save your inquiry. Please try again in a moment.",
};

export default async function InquiryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; product?: string }>;
}) {
  const { error, product } = await searchParams;
  const categories = await getCategories();
  const selected = product && UUID.test(product) ? await getProduct(product) : null;

  return (
    <main className="mx-auto min-h-screen max-w-2xl p-6">
      <Link href="/" className="text-sm text-slate-500 underline">
        Back to home
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

        <InquiryFields categories={categories} />

        {/* Spam trap: leave empty. */}
        <div aria-hidden="true" className="hidden">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <button className="rounded bg-slate-900 px-5 py-2 text-white hover:bg-slate-700">
          Send inquiry
        </button>
      </form>
    </main>
  );
}
