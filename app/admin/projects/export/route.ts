import { NextResponse, type NextRequest } from "next/server";
import { getMe, can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { parseParams } from "@/lib/list-filters";
import { buildProjectExport, PROJECT_SORTS } from "@/lib/export-data";
import { buildWorkbook, XLSX_MIME } from "@/lib/xlsx";

// GET /admin/projects/export?scope=all           -> every row
// GET /admin/projects/export?<list filters>      -> the rows of the current list (same filters and sorting as the page)
export async function GET(request: NextRequest) {
  const me = await getMe();
  if (!me) return new NextResponse("Please sign in.", { status: 401 });
  if (!can(me, "projects", "view")) return new NextResponse("You do not have permission to export this list.", { status: 403 });

  const query = request.nextUrl.searchParams;
  const raw: Record<string, string | undefined> = {};
  for (const [k, v] of query.entries()) raw[k] = v;
  const params = parseParams(raw, PROJECT_SORTS, "date");
  const all = query.get("scope") === "all";

  const result = await buildProjectExport(me, params, all);
  const file = await buildWorkbook(result.sheets);

  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const name = `LDS-projects-and-forms-${day}${all ? "-all" : "-filtered"}.xlsx`;

  await audit(me.id, "export_excel", "projects", me.id, { scope: all ? "all" : "filtered", rows: result.count });

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
