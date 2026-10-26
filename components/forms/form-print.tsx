/* eslint-disable @next/next/no-img-element */
import type { ChoiceField, Field, FormDef } from "@/lib/forms/types";
import {
  asArray,
  asRows,
  asString,
  formatDateText,
  formatMoneyText,
  type Values,
} from "@/lib/forms/data";
import { PRINT_CSS } from "@/lib/forms/print-css";

const BLANK = " ";

function Choice({ field, data, blank }: { field: ChoiceField; data: Values; blank: boolean }) {
  const selected = blank ? [] : field.type === "radio" ? [asString(data[field.key])] : asArray(data[field.key]);
  const otherText = blank ? "" : asString(data[`${field.key}__other`]);
  return (
    <div className={`lf-opts${field.stack ? " lf-stack" : ""}`}>
      {field.options.map((o) => (
        <span key={o} className="lf-opt">
          <span className="lf-box">{selected.includes(o) ? "☒" : "☐"}</span>
          {o}
        </span>
      ))}
      {field.other && (
        <span className="lf-opt">
          <span className="lf-box">{selected.includes(field.other) ? "☒" : "☐"}</span>
          {field.other}: {otherText ? <u>{otherText}</u> : <span className="lf-blank" />}
        </span>
      )}
    </div>
  );
}

function plain(field: Extract<Field, { type: "text" | "email" | "date" | "money" | "number" }>, raw: string): React.ReactNode {
  if (field.type === "date") {
    return raw ? formatDateText(raw) : "_____ / _____ / ______";
  }
  if (field.type === "money") {
    return raw ? formatMoneyText(raw) : "₱ ____________________";
  }
  return raw || BLANK;
}

function Row({ field, data, blank }: { field: Field; data: Values; blank: boolean }) {
  const raw = blank ? "" : asString(data[field.key]);

  switch (field.type) {
    case "text":
    case "email":
    case "date":
    case "money":
    case "number":
      return (
        <tr>
          <td className="lf-label">{field.label}</td>
          <td className="lf-text">{plain(field, raw)}</td>
        </tr>
      );

    case "textarea":
      if (field.full) {
        return (
          <tr>
            <td colSpan={2} className="lf-full">
              {raw}
            </td>
          </tr>
        );
      }
      return (
        <tr>
          <td className="lf-label">{field.label}</td>
          <td className="lf-text lf-area">{raw}</td>
        </tr>
      );

    case "radio":
    case "checks":
      return (
        <tr>
          <td className="lf-label">{field.label}</td>
          <td>
            <Choice field={field} data={data} blank={blank} />
          </td>
        </tr>
      );

    case "table": {
      const rows = blank ? [] : asRows(data[field.key]);
      const count = field.rowLabels ? field.rowLabels.length : Math.max(rows.length, field.minRows ?? 5);
      return (
        <tr>
          <td colSpan={2} className="lf-tablecell">
            <table className="lf-inner">
              <thead>
                <tr>
                  <th>{field.labelHeader ?? "#"}</th>
                  {field.columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: count }, (_, i) => (
                  <tr key={i}>
                    <td>{field.rowLabels ? field.rowLabels[i] : i + 1}</td>
                    {field.columns.map((c) => {
                      const v = rows[i]?.[c.key] ?? "";
                      return (
                        <td key={c.key}>
                          {c.type === "date" ? (v ? formatDateText(v) : BLANK) : c.type === "money" ? (v ? formatMoneyText(v) : BLANK) : v || BLANK}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      );
    }
  }
}

// The printable page. Same look as the LDS Word form. Signature lines are left blank
// on purpose: people sign the printed or PDF copy by hand.
export function FormPrint({ def, data, blank = false }: { def: FormDef; data: Values; blank?: boolean }) {
  return (
    <div className="lf-sheet">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <table className="lf-head">
        <tbody>
          <tr>
            <td className="lf-logo">
              <img src="/mfi-logo.jpg" alt="MFI Polytechnic Institute" />
            </td>
            <td className="lf-title">{def.title}</td>
            <td className="lf-meta">
              <div>
                <b>Form No</b>: {def.number}
              </div>
              <div>
                <b>Revision No.</b>: {def.revision}
              </div>
              <div>
                <b>Eff. Date</b>: {def.effective}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="lf-body">
        <div className="lf-purpose">
          <span className="lf-blue">Purpose:</span>
          {def.purpose.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>

        <table className="lf-main">
          <thead>
            <tr>
              <th style={{ width: "36%" }}>Section</th>
              <th>Field / Description</th>
            </tr>
          </thead>
          {def.sections.map((s) => (
            <tbody key={s.title} className={s.signatures ? "lf-keep" : undefined}>
              <tr className="lf-bar">
                <td colSpan={2}>{s.title}</td>
              </tr>
              {s.fields?.map((f) => (
                <Row key={f.key} field={f} data={data} blank={blank} />
              ))}
              {s.signatures?.map((label) => (
                <tr key={label} className="lf-sign">
                  <td className="lf-label">{label}</td>
                  <td>
                    <div className="lf-line">Name &amp; Signature: ____________________________</div>
                    <div className="lf-line">Date: &nbsp;&nbsp;_____/_____/______</div>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      <div className="lf-notes">
        <b>Notes</b>
        <ul>
          {def.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
