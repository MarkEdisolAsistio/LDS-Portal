import { createClient } from "@/lib/supabase/server";

export async function audit(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  details?: Record<string, unknown>
) {
  const supabase = await createClient();
  await supabase.from("audit_log").insert({
    user_id: userId,
    action,
    entity,
    entity_id: entityId,
    details: details ?? null,
  });
}
