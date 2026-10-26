import type { Status } from "@/lib/status";

// Minimal shape shared by the signed-in and the server-side Supabase clients.
type Db = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

// Moves a project (and, through the database, its ticket) to a new status.
// A project marked Done is left alone, so a late client click does not reopen it.
export async function moveProject(db: Db, projectId: string, to: Status) {
  const { data } = await db.from("projects").select("status").eq("id", projectId).maybeSingle();
  const current = (data as { status: Status } | null)?.status;
  if (!current || current === to || current === "done") return;
  const { error } = await db.from("projects").update({ status: to }).eq("id", projectId);
  if (error) console.error("moveProject failed:", error.message);
}
