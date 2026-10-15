import {
  CLIENT_TYPES,
  CLIENT_TYPE_LABELS,
  KINDS,
  KIND_LABELS,
} from "@/lib/inquiries";
import type { Category } from "@/lib/lookups";

export const inputClass =
  "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900";

type Defaults = Partial<{
  name: string;
  email: string;
  phone: string;
  client_type: string;
  organization: string;
  kind: string;
  category_id: string;
  quantity: string;
  custom_spec: string;
  notes: string;
}>;

// The fields of an inquiry. Used by the public form and the admin form.
export function InquiryFields({
  categories,
  defaults = {},
}: {
  categories: Category[];
  defaults?: Defaults;
}) {
  return (
    <>
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 font-medium text-slate-900">About the client</legend>
        <label className="text-sm text-slate-700">
          Full name *
          <input name="name" required maxLength={120} defaultValue={defaults.name} className={inputClass} />
        </label>
        <label className="text-sm text-slate-700">
          Email *
          <input name="email" type="email" required maxLength={200} defaultValue={defaults.email} className={inputClass} />
        </label>
        <label className="text-sm text-slate-700">
          Phone
          <input name="phone" maxLength={40} defaultValue={defaults.phone} className={inputClass} />
        </label>
        <label className="text-sm text-slate-700">
          Company or department
          <input name="organization" maxLength={160} defaultValue={defaults.organization} className={inputClass} />
        </label>
        <label className="text-sm text-slate-700 md:col-span-2">
          Where are you from? *
          <select name="client_type" required defaultValue={defaults.client_type ?? "external"} className={inputClass}>
            {CLIENT_TYPES.map((t) => (
              <option key={t} value={t}>{CLIENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-2 font-medium text-slate-900">What do you need?</legend>
        <label className="text-sm text-slate-700">
          Request type *
          <select name="kind" required defaultValue={defaults.kind ?? "buy"} className={inputClass}>
            {KINDS.map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Module category *
          <select name="category_id" required defaultValue={defaults.category_id ?? ""} className={inputClass}>
            <option value="" disabled>Choose a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Quantity *
          <input name="quantity" type="number" min={1} max={10000} required defaultValue={defaults.quantity ?? "1"} className={inputClass} />
        </label>
        <label className="text-sm text-slate-700 md:col-span-2">
          Describe what you want
          <textarea
            name="custom_spec"
            rows={5}
            maxLength={4000}
            defaultValue={defaults.custom_spec}
            placeholder="Which module, what it should do, any design or size requirements."
            className={inputClass}
          />
        </label>
        <label className="text-sm text-slate-700 md:col-span-2">
          Other notes
          <textarea name="notes" rows={3} maxLength={4000} defaultValue={defaults.notes} className={inputClass} />
        </label>
      </fieldset>
    </>
  );
}
