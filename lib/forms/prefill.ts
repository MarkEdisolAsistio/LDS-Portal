import { createAdminClient } from "@/lib/supabase/admin";
import type { FormDef } from "./types";
import { dateManila, initialData, todayManila, type Values } from "./data";
import type { ClientType } from "@/lib/inquiries";

type ProjectRow = {
  id: string;
  project_code: string;
  title: string;
  inquiry_id: string | null;
  client_type: ClientType;
  client_org: string | null;
  contact_person: string | null;
  contact_info: string | null;
};

const APPLICATION_AREAS = ["Electrical", "Electronics", "Automation"];

// What a form starts with when nobody has saved it yet: the project details,
// and for the request form also what the client wrote in the inquiry.
// Call it only after the viewer's permission was checked (it reads with the server-side key).
export async function prefillFor(project: ProjectRow, def: FormDef): Promise<Values> {
  const base = initialData(def, {
    projectCode: project.project_code,
    title: project.title,
    clientOrg: project.client_org ?? "",
    clientType: project.client_type,
    contactPerson: project.contact_person ?? "",
    contactInfo: project.contact_info ?? "",
    today: todayManila(),
  });
  if (def.code !== "F01" || !project.inquiry_id) return base;

  const admin = createAdminClient();
  const { data } = await admin
    .from("inquiries")
    .select("kind, custom_spec, notes, created_at, category_id")
    .eq("id", project.inquiry_id)
    .maybeSingle();
  const inquiry = data as unknown as {
    kind: "buy" | "build";
    custom_spec: string | null;
    notes: string | null;
    created_at: string;
    category_id: number | null;
  } | null;
  if (!inquiry) return base;

  let categoryName = "";
  if (inquiry.category_id) {
    const { data: c } = await admin.from("categories").select("name").eq("id", inquiry.category_id).maybeSingle();
    categoryName = (c as unknown as { name: string } | null)?.name ?? "";
  }

  const extras: Values = {
    dateRequest: dateManila(inquiry.created_at),
    description: [inquiry.custom_spec, inquiry.notes].filter(Boolean).join("\n\n"),
  };
  const area = APPLICATION_AREAS.find((a) => a.toLowerCase() === categoryName.toLowerCase());
  if (area) extras.appArea = [area];
  if (inquiry.kind === "build") extras.deliverables = ["Learnware / Teachware Equipment"];
  return { ...base, ...extras };
}
