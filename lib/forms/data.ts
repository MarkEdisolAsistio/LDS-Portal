import type { Column, Field, FormDef, Prefill } from "./types";

export type Values = Record<string, unknown>;
export type Row = Record<string, string>;

export type PrefillContext = {
  projectCode: string;
  title: string;
  clientOrg: string;
  clientType: "internal" | "external";
  contactPerson: string;
  contactInfo: string;
  today: string;
};

// Names of the HTML inputs (kept in one place so the screen and the saver agree).
export const inputName = (key: string) => `f_${key}`;
export const otherName = (key: string) => `f_${key}__other`;
export const cellName = (key: string, row: number, col: string) => `f_${key}__${row}__${col}`;

export const MAX_TABLE_ROWS = 40;

// ---------- Dates and text ----------
export function todayManila(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

export function dateManila(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDateText(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  return `${Number(m[3])} ${MONTHS.at(Number(m[2]) - 1) ?? m[2]} ${m[1]}`;
}

export function formatMoneyText(value: string): string {
  const n = Number(value);
  if (!value || !Number.isFinite(n)) return value;
  return "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------- Reading stored JSON safely ----------
export const asString = (v: unknown): string => (typeof v === "string" ? v : "");

export const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

export function asRows(v: unknown): Row[] {
  if (!Array.isArray(v)) return [];
  return v.map((r) => {
    const out: Row = {};
    if (r && typeof r === "object") {
      for (const [k, val] of Object.entries(r as Record<string, unknown>)) {
        if (typeof val === "string") out[k] = val;
      }
    }
    return out;
  });
}

// ---------- Starting values ----------
function prefillValue(p: Prefill, ctx: PrefillContext): string {
  switch (p) {
    case "projectCode":
      return ctx.projectCode;
    case "title":
      return ctx.title;
    case "clientOrg":
      return ctx.clientOrg;
    case "clientType":
      return ctx.clientType === "internal" ? "Internal" : "External";
    case "contactPerson":
      return ctx.contactPerson;
    case "contactInfo":
      return ctx.contactInfo;
    case "today":
      return ctx.today;
  }
}

export function fieldsOf(def: FormDef): Field[] {
  return def.sections.flatMap((s) => s.fields ?? []);
}

// Values for a form that has not been saved yet: carried over from the project.
export function initialData(def: FormDef, ctx: PrefillContext): Values {
  const out: Values = {};
  for (const f of fieldsOf(def)) {
    if (f.type === "table" || f.type === "textarea") continue;
    if (!f.prefill) continue;
    const v = prefillValue(f.prefill, ctx);
    if (!v) continue;
    out[f.key] = f.type === "checks" ? [v] : v;
  }
  return out;
}

// ---------- Cleaning what the person typed ----------
function cleanText(v: FormDataEntryValue | null | undefined, max: number): string {
  return String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
}

function cleanNumber(v: FormDataEntryValue | null | undefined): string {
  const s = cleanText(v, 24).replace(/[,\s₱]/g, "");
  return /^\d+(\.\d+)?$/.test(s) ? s : "";
}

function cleanDate(v: FormDataEntryValue | null | undefined): string {
  const s = cleanText(v, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  return Number.isNaN(Date.parse(s)) ? "" : s;
}

function cleanByType(type: Column["type"] | "email" | "textarea", v: FormDataEntryValue | null | undefined): string {
  switch (type) {
    case "date":
      return cleanDate(v);
    case "money":
    case "number":
      return cleanNumber(v);
    case "textarea":
      return cleanText(v, 5000);
    case "email":
      return cleanText(v, 200);
    default:
      return cleanText(v, 300);
  }
}

// Reads every field of the form from the submitted HTML form.
// Only fields that belong to the form are kept; anything else is ignored.
export function parseFormValues(def: FormDef, fd: FormData): Values {
  const out: Values = {};

  for (const f of fieldsOf(def)) {
    switch (f.type) {
      case "text":
      case "email":
      case "date":
      case "money":
      case "number":
      case "textarea":
        out[f.key] = cleanByType(f.type, fd.get(inputName(f.key)));
        break;

      case "radio": {
        const allowed = f.other ? [...f.options, f.other] : f.options;
        const picked = cleanText(fd.get(inputName(f.key)), 120);
        out[f.key] = allowed.includes(picked) ? picked : "";
        if (f.other) out[`${f.key}__other`] = out[f.key] === f.other ? cleanText(fd.get(otherName(f.key)), 200) : "";
        break;
      }

      case "checks": {
        const allowed = f.other ? [...f.options, f.other] : f.options;
        const picked = fd.getAll(inputName(f.key)).map((x) => cleanText(x, 120));
        // keep the order of the form, drop duplicates and unknown values
        const clean = allowed.filter((o) => picked.includes(o));
        out[f.key] = clean;
        if (f.other) out[`${f.key}__other`] = clean.includes(f.other) ? cleanText(fd.get(otherName(f.key)), 200) : "";
        break;
      }

      case "table": {
        const pattern = new RegExp(`^${inputName(f.key)}__(\\d+)__([A-Za-z0-9_]+)$`);
        const cells = new Map<number, Row>();
        for (const name of fd.keys()) {
          const m = pattern.exec(name);
          if (!m) continue;
          const rowIndex = Number(m[1]);
          const col = f.columns.find((c) => c.key === m[2]);
          if (!col || rowIndex >= MAX_TABLE_ROWS) continue;
          const row = cells.get(rowIndex) ?? {};
          row[col.key] = cleanByType(col.type, fd.get(name));
          cells.set(rowIndex, row);
        }

        if (f.rowLabels) {
          // fixed rows: keep every row so each stays beside its label
          out[f.key] = f.rowLabels.map((_, i) => {
            const row: Row = {};
            for (const c of f.columns) row[c.key] = cells.get(i)?.[c.key] ?? "";
            return row;
          });
        } else {
          const rows: Row[] = [];
          for (const i of [...cells.keys()].sort((a, b) => a - b)) {
            const row = cells.get(i) as Row;
            if (Object.values(row).some((v) => v !== "")) {
              const full: Row = {};
              for (const c of f.columns) full[c.key] = row[c.key] ?? "";
              rows.push(full);
            }
          }
          out[f.key] = rows;
        }
        break;
      }
    }
  }
  return out;
}
