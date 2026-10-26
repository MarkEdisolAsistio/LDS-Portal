import Link from "next/link";
import { getMe, can } from "@/lib/permissions";
import { STATUSES, STATUS_LABELS } from "@/lib/status";
import { getCategories, getStaff } from "@/lib/lookups";
import { InquiryFields, inputClass } from "@/components/inquiry-fields";
import { createInquiryAdmin } from "../actions";

const ERRORS: Record<string, string> = {
  invalid_contact: "Please enter a name and a valid email address.",
  missing_contact_details: "Please enter a phone number and company or department.",
  invalid_category: "Please choose a module category.",
  invalid_quantity: "Quantity must be a whole number from 1 to 10000.",
  need_description: "Please describe the request (at least 10 characters).",
  invalid: "Please check the form and try again.",
  error: "Could not save. Check the terminal for details.",
};

export default async function NewInquiry({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const { msg } = await searchParams;

  const me = await getMe();
  if (!me || !can(me, "inquiries", "edit")) {
    return <p className="text-slate-600">You do not have access to this section.</p>;
  }

  const [categories, staff] = await Promise.all([getCategories(), getStaff()]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/inquiries" className="text-sm text-slate-500 underline">
          Back to inquiries
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New inquiry</h1>
        <p className="text-slate-600">
          Enter a request received by phone, in person, or from somewhere else.
        </p>
      </div>

      {msg && ERRORS[msg] && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{ERRORS[msg]}</p>
      )}

      <form action={createInquiryAdmin} className="space-y-8 rounded-lg border border-slate-200 bg-white p-5">
        <InquiryFields categories={categories} />

        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-2 font-medium text-slate-900">Ticket</legend>
          <label className="text-sm text-slate-700">
            Status
            <select name="status" defaultValue="new" className={inputClass}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700">
            Owner
            <select name="owner_id" defaultValue="" className={inputClass}>
              <option value="">Unassigned</option>
              {staff.filter((s) => s.active).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
        </fieldset>

        <button className="rounded bg-[#0d5a89] px-5 py-2 text-white hover:bg-[#0b446a]">
          Create inquiry
        </button>
      </form>
    </div>
  );
}
