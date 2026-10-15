"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMe, can, MODULES, type Level, type Module } from "@/lib/permissions";

const BACK = "/admin/users";
const LEVELS: Level[] = ["none", "view", "edit", "full"];

type Sb = Awaited<ReturnType<typeof createClient>>;

// Go back to the page with a short message code (see MESSAGES in page.tsx).
function done(code: string): never {
  redirect(`${BACK}?msg=${code}`);
}

// Only people with FULL access to "Users and Roles" may change anything here.
async function requireManager() {
  const me = await getMe();
  if (!me || !can(me, "users", "full")) done("forbidden");
  return me;
}

async function audit(
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

async function isActiveSuper(supabase: Sb, userId: string) {
  const { data: p } = await supabase
    .from("profiles")
    .select("is_active, role_id")
    .eq("id", userId)
    .maybeSingle();
  const profile = p as unknown as { is_active: boolean; role_id: string } | null;
  if (!profile || !profile.is_active) return false;

  const { data: r } = await supabase
    .from("roles")
    .select("is_super")
    .eq("id", profile.role_id)
    .maybeSingle();
  return Boolean((r as unknown as { is_super: boolean } | null)?.is_super);
}

async function otherActiveSupers(supabase: Sb, excludeUserId: string) {
  const { data: roles } = await supabase
    .from("roles")
    .select("id")
    .eq("is_super", true);
  const ids = ((roles ?? []) as unknown as { id: string }[]).map((r) => r.id);

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("role_id", ids)
    .eq("is_active", true)
    .neq("id", excludeUserId);
  return count ?? 0;
}

// ---------- Add a staff account ----------
export async function createStaff(formData: FormData) {
  const me = await requireManager();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleId = String(formData.get("role_id") ?? "");

  if (!fullName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !roleId) {
    done("invalid");
  }
  if (password.length < 8) done("weak_password");

  const supabase = await createClient();
  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("id", roleId)
    .maybeSingle();
  if (!role) done("invalid");

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  const user = created?.user;
  if (error || !user) {
    console.error("createUser failed:", error?.message);
    done(error?.message?.toLowerCase().includes("already") ? "exists" : "error");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: user.id, full_name: fullName, role_id: roleId });
  if (profileError) {
    console.error("profile insert failed:", profileError.message);
    await admin.auth.admin.deleteUser(user.id); // undo, so nothing is half-created
    done("error");
  }

  await audit(me.id, "create_staff", "profile", user.id, { email, roleId });
  revalidatePath(BACK);
  done("created");
}

// ---------- Change someone's role ----------
export async function changeRole(formData: FormData) {
  const me = await requireManager();

  const userId = String(formData.get("user_id") ?? "");
  const roleId = String(formData.get("role_id") ?? "");
  if (!userId || !roleId) done("invalid");
  if (userId === me.id) done("self");

  const supabase = await createClient();
  const { data: roleData } = await supabase
    .from("roles")
    .select("id, is_super")
    .eq("id", roleId)
    .maybeSingle();
  const role = roleData as unknown as { id: string; is_super: boolean } | null;
  if (!role) done("invalid");

  // Never leave the portal without an active Super Admin.
  if (
    !role.is_super &&
    (await isActiveSuper(supabase, userId)) &&
    (await otherActiveSupers(supabase, userId)) === 0
  ) {
    done("last_super");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role_id: roleId })
    .eq("id", userId);
  if (error) {
    console.error("changeRole failed:", error.message);
    done("error");
  }

  await audit(me.id, "change_role", "profile", userId, { roleId });
  revalidatePath(BACK);
  done("saved");
}

// ---------- Activate or deactivate ----------
export async function setActive(formData: FormData) {
  const me = await requireManager();

  const userId = String(formData.get("user_id") ?? "");
  const active = String(formData.get("active") ?? "") === "1";
  if (!userId) done("invalid");
  if (userId === me.id) done("self");

  const supabase = await createClient();

  if (
    !active &&
    (await isActiveSuper(supabase, userId)) &&
    (await otherActiveSupers(supabase, userId)) === 0
  ) {
    done("last_super");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: active })
    .eq("id", userId);
  if (error) {
    console.error("setActive failed:", error.message);
    done("error");
  }

  // Also block (or allow) the login itself at Supabase.
  const admin = createAdminClient();
  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : "876000h",
  });
  if (banError) console.error("ban update failed:", banError.message);

  await audit(me.id, active ? "activate_staff" : "deactivate_staff", "profile", userId);
  revalidatePath(BACK);
  done("saved");
}

// ---------- Set a new password for someone ----------
export async function resetPassword(formData: FormData) {
  const me = await requireManager();

  const userId = String(formData.get("user_id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!userId) done("invalid");
  if (password.length < 8) done("weak_password");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) {
    console.error("resetPassword failed:", error.message);
    done("error");
  }

  await audit(me.id, "reset_password", "profile", userId);
  done("saved");
}

// ---------- Edit what a role may do ----------
export async function updateRolePermissions(formData: FormData) {
  const me = await requireManager();

  const roleId = String(formData.get("role_id") ?? "");
  if (!roleId) done("invalid");

  const supabase = await createClient();
  const { data: roleData } = await supabase
    .from("roles")
    .select("id, is_super")
    .eq("id", roleId)
    .maybeSingle();
  const role = roleData as unknown as { id: string; is_super: boolean } | null;
  if (!role || role.is_super) done("invalid"); // Super Admin always has full access

  const rows = MODULES.map((m: Module) => {
    const raw = String(formData.get(`perm_${m}`) ?? "none") as Level;
    return { role_id: roleId, module: m, level: LEVELS.includes(raw) ? raw : "none" };
  });

  const { error } = await supabase
    .from("role_permissions")
    .upsert(rows, { onConflict: "role_id,module" });
  if (error) {
    console.error("updateRolePermissions failed:", error.message);
    done("error");
  }

  await audit(me.id, "update_role_permissions", "role", roleId);
  revalidatePath(BACK);
  done("saved");
}

// ---------- Add a new role ----------
export async function createRole(formData: FormData) {
  const me = await requireManager();

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 40) done("invalid");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .insert({ name, is_super: false })
    .select("id")
    .single();
  if (error || !data) {
    done(error?.code === "23505" ? "exists" : "error");
  }
  const roleId = (data as unknown as { id: string }).id;

  const rows = MODULES.map((m: Module) => ({
    role_id: roleId,
    module: m,
    level: m === "dashboard" ? "view" : "none",
  }));
  await supabase.from("role_permissions").upsert(rows, { onConflict: "role_id,module" });

  await audit(me.id, "create_role", "role", roleId, { name });
  revalidatePath(BACK);
  done("saved");
}
