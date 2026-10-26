import type { Category } from "@/lib/lookups";
import type { ProductSpec } from "@/lib/catalog";
import { inputClass } from "@/components/inquiry-fields";

type Defaults = {
  title?: string;
  category_id?: number;
  summary?: string | null;
  description?: string | null;
  features?: string[];
  specs?: ProductSpec[];
  is_purchasable?: boolean;
  is_published?: boolean;
};

// The fields of a product. Used by the New product and Edit product screens.
export function ProductFields({ categories, defaults = {} }: { categories: Category[]; defaults?: Defaults }) {
  const specText = (defaults.specs ?? []).map((s) => (s.value ? `${s.label}: ${s.value}` : s.label)).join("\n");
  return (
    <>
      <label className="block text-sm text-slate-700">
        Title <span className="text-red-600">*</span>
        <input name="title" required maxLength={160} defaultValue={defaults.title} className={inputClass} />
      </label>
      <label className="block text-sm text-slate-700">
        Category <span className="text-red-600">*</span>
        {defaults.category_id ? (
          <select name="category_id" required defaultValue={defaults.category_id} className={inputClass}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        ) : (
          <select name="category_id" required defaultValue="" className={inputClass}>
            <option value="" disabled>Choose a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </label>
      <label className="block text-sm text-slate-700">
        Short summary
        <input
          name="summary"
          maxLength={200}
          defaultValue={defaults.summary ?? ""}
          placeholder="One line shown on the product card"
          className={inputClass}
        />
      </label>
      <label className="block text-sm text-slate-700">
        Description
        <textarea name="description" rows={6} maxLength={4000} defaultValue={defaults.description ?? ""} className={inputClass} />
      </label>
      <label className="block text-sm text-slate-700">
        Features <span className="text-slate-400">(one per line)</span>
        <textarea
          name="features"
          rows={5}
          defaultValue={(defaults.features ?? []).join("\n")}
          placeholder={"Covers basic wiring and troubleshooting\nIncludes instructor manual"}
          className={inputClass}
        />
      </label>
      <label className="block text-sm text-slate-700">
        Specifications <span className="text-slate-400">(one per line, as Label: value)</span>
        <textarea
          name="specs"
          rows={6}
          defaultValue={specText}
          placeholder={"Power supply: 220 V AC\nDimensions: 60 x 40 x 30 cm\nWeight: 12 kg"}
          className={`${inputClass} font-mono`}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="is_purchasable" defaultChecked={defaults.is_purchasable ?? true} />
        Can be bought (turn off for build-on-request modules)
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="is_published" defaultChecked={defaults.is_published ?? false} />
        Show on the public website
      </label>
    </>
  );
}
