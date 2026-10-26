import JSZip from "jszip";

// A small Excel (.xlsx) writer, so exports need only the tiny "jszip" package.
// Features: several sheets, bold coloured header row, frozen header, filter buttons,
// column widths, real Excel dates, wrapped text.

export type ColType = "text" | "wrap" | "datetime" | "date" | "number";
export type Cell = string | number | Date | null | undefined;
export type Column = { header: string; width?: number; type?: ColType };
export type Sheet = { name: string; columns: Column[]; rows: Cell[][]; filter?: boolean };

const MANILA_OFFSET_MS = 8 * 3600 * 1000;

const colName = (i: number) => {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// XML does not allow most control characters; drop them, then escape the rest
const esc = (v: string) =>
  v
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Excel stores dates as days since 1899-12-30. We write the Manila wall-clock time.
const serial = (d: Date) => (d.getTime() + MANILA_OFFSET_MS) / 86400000 + 25569;
const dayOnly = (ymd: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 + 25569 : null;
};

// style ids in styles.xml below
const STYLE = { header: 1, datetime: 2, date: 3, wrap: 4, text: 0, number: 0 } as const;

const safeSheetName = (name: string, used: Set<string>) => {
  let base = name.replace(/[\[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Sheet";
  let out = base;
  let n = 2;
  while (used.has(out.toLowerCase())) out = `${base.slice(0, 28)} ${n++}`;
  used.add(out.toLowerCase());
  return out;
};

function sheetXml(sheet: Sheet): string {
  const cols = sheet.columns;
  const lastCol = colName(Math.max(cols.length - 1, 0));
  const lastRow = sheet.rows.length + 1;

  const colsXml = cols
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width ?? 16}" customWidth="1"/>`)
    .join("");

  const head =
    `<row r="1" ht="22" customHeight="1">` +
    cols.map((c, i) => `<c r="${colName(i)}1" s="${STYLE.header}" t="inlineStr"><is><t xml:space="preserve">${esc(c.header)}</t></is></c>`).join("") +
    `</row>`;

  const body = sheet.rows
    .map((row, r) => {
      const rn = r + 2;
      const cells = cols
        .map((c, i) => {
          const v = row[i];
          const ref = `${colName(i)}${rn}`;
          if (v === null || v === undefined || v === "") return "";
          const type = c.type ?? "text";
          if (type === "datetime" || type === "date") {
            let n: number | null = null;
            if (v instanceof Date) n = type === "date" ? Math.floor(serial(v)) : serial(v);
            else if (typeof v === "string") n = type === "date" ? dayOnly(v) : isNaN(Date.parse(v)) ? null : serial(new Date(v));
            if (n !== null && Number.isFinite(n)) return `<c r="${ref}" s="${type === "date" ? STYLE.date : STYLE.datetime}"><v>${n}</v></c>`;
            return `<c r="${ref}" t="inlineStr"><is><t>${esc(String(v))}</t></is></c>`;
          }
          if (type === "number" && typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
          const s = v instanceof Date ? v.toISOString() : String(v);
          return `<c r="${ref}" s="${type === "wrap" ? STYLE.wrap : STYLE.text}" t="inlineStr"><is><t xml:space="preserve">${esc(s)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rn}">${cells}</row>`;
    })
    .join("");

  const filter = sheet.filter !== false && cols.length > 0 ? `<autoFilter ref="A1:${lastCol}${Math.max(lastRow, 1)}"/>` : "";

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${colsXml}</cols>` +
    `<sheetData>${head}${body}</sheetData>` +
    filter +
    `</worksheet>`
  );
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd\\ hh:mm"/><numFmt numFmtId="165" formatCode="yyyy\\-mm\\-dd"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0D5A89"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export async function buildWorkbook(sheets: Sheet[]): Promise<Buffer> {
  const used = new Set<string>();
  const names = sheets.map((s) => safeSheetName(s.name, used));

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
      `</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
      names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
      `</sheets></workbook>`
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
      `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  );
  zip.file("xl/styles.xml", STYLES);
  sheets.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)));

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
