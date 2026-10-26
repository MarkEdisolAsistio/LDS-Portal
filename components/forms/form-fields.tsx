import type { Field, FormDef } from "@/lib/forms/types";
import {
  asArray,
  asRows,
  asString,
  cellName,
  inputName,
  otherName,
  MAX_TABLE_ROWS,
  type Values,
} from "@/lib/forms/data";
import { TableInput } from "./table-input";

const input = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900";

function Choice({ field, data }: { field: Extract<Field, { type: "radio" | "checks" }>; data: Values }) {
  const type = field.type === "radio" ? "radio" : "checkbox";
  const selected = field.type === "radio" ? [asString(data[field.key])] : asArray(data[field.key]);
  const options = field.other ? [...field.options, field.other] : field.options;

  return (
    <fieldset className="md:col-span-2">
      <legend className="text-sm text-slate-700">
        {field.label}
        {field.type === "checks" && <span className="ml-2 text-xs text-slate-400">tick all that apply</span>}
      </legend>
      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm text-slate-800">
            <input type={type} name={inputName(field.key)} value={o} defaultChecked={selected.includes(o)} />
            {o}
          </label>
        ))}
      </div>
      {field.other && (
        <input
          name={otherName(field.key)}
          defaultValue={asString(data[`${field.key}__other`])}
          placeholder={`${field.other}: type here`}
          maxLength={200}
          className={`${input} max-w-md`}
        />
      )}
    </fieldset>
  );
}

function One({ field, data }: { field: Field; data: Values }) {
  switch (field.type) {
    case "text":
    case "email":
    case "date":
    case "number":
      return (
        <label className="text-sm text-slate-700">
          {field.label}
          {field.hint && <span className="ml-2 text-xs text-slate-400">{field.hint}</span>}
          <input
            name={inputName(field.key)}
            type={field.type}
            defaultValue={asString(data[field.key])}
            maxLength={field.type === "date" ? undefined : 300}
            className={input}
          />
        </label>
      );

    case "money":
      return (
        <label className="text-sm text-slate-700">
          {field.label} (₱)
          <input
            name={inputName(field.key)}
            type="number"
            step="0.01"
            min="0"
            defaultValue={asString(data[field.key])}
            className={input}
          />
        </label>
      );

    case "textarea":
      return (
        <label className="text-sm text-slate-700 md:col-span-2">
          {field.label}
          {field.hint && <span className="ml-2 text-xs text-slate-400">{field.hint}</span>}
          <textarea
            name={inputName(field.key)}
            rows={field.rows ?? 4}
            maxLength={5000}
            defaultValue={asString(data[field.key])}
            className={input}
          />
        </label>
      );

    case "radio":
    case "checks":
      return <Choice field={field} data={data} />;

    case "table": {
      const rows = asRows(data[field.key]);
      return (
        <div className="md:col-span-2">
          <p className="text-sm text-slate-700">{field.label}</p>
          {field.rowLabels ? (
            <table className="mt-1 w-full max-w-xl text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-1 py-1 font-medium">{field.labelHeader ?? ""}</th>
                  {field.columns.map((c) => (
                    <th key={c.key} className="px-1 py-1 font-medium">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {field.rowLabels.map((label, r) => (
                  <tr key={label}>
                    <td className="px-1 py-1 text-slate-800">{label}</td>
                    {field.columns.map((c) => (
                      <td key={c.key} className="px-1 py-1">
                        <input
                          name={cellName(field.key, r, c.key)}
                          type={c.type === "date" ? "date" : c.type === "number" || c.type === "money" ? "number" : "text"}
                          defaultValue={rows[r]?.[c.key] ?? ""}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <TableInput
              fieldKey={field.key}
              columns={field.columns}
              initialRows={rows}
              minRows={field.minRows ?? 3}
              maxRows={field.maxRows ?? MAX_TABLE_ROWS}
            />
          )}
        </div>
      );
    }
  }
}

// The typing screen for any form definition.
export function FormFields({ def, data }: { def: FormDef; data: Values }) {
  return (
    <div className="space-y-6">
      {def.sections.map((s) => (
        <section key={s.title} className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-medium text-slate-900">{s.title}</h2>
          {s.fields && (
            <div className="grid gap-4 md:grid-cols-2">
              {s.fields.map((f) => (
                <One key={f.key} field={f} data={data} />
              ))}
            </div>
          )}
          {s.signatures && (
            <p className="text-sm text-slate-500">
              Nothing to type here. The printed form has blank signature lines for:{" "}
              {s.signatures.join(", ")}.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
