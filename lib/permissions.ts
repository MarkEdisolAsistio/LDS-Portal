import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const MODULES = [
  "dashboard",
  "inquiries",
  "inbox",
  "catalog",
  "news",
  "users",
  "reports",
  "audit",
  "projects",
] as const;

export type Module = (typeof MODULES)[number];
export type Level = "none" | "view" | "edit" | "full";

const ORDER: Record<Level, number> = { none: 0, view: 1, edit: 2, full: 3 };

// Menu shown in the admin sidebar (only the ones a person may view).
export const NAV: { module: Module; label: string; href: string }[] = [
  { module: "dashboard", label: "Dashboard", href: "/admin" },
  { module: "inquiries", label: "Inquiries and Tickets", href: "/admin/inquiries" },
  { module: "projects", label: "Projects and Forms", href: "/admin/projects" },
  { module: "inbox", label: "Inbox", href: "/admin/inbox" },
  { module: "catalog", label: "Catalog", href: "/admin/catalog" },
  { module: "news", label: "Contents", href: "/admin/news" },
  { module: "users", label: "Users and Roles", href: "/admin/users" },
  { module: "reports", label: "Reports and Export", href: "/admin/reports" },
  { module: "audit", label: "Audit Log", href: "/admin/audit" },
];

export type Me = {
  id: string;
  email: string;
  fullName: string;
  profilePicturePath: string | null;
  roleName: string;
  isSuper: boolean;
  permissions: Partial<Record<Module, Level>>;
};

// Who is signed in, what role they have, what they may do.
// Returns null when nobody is signed in or the account has no active profile.
export const getMe = cache(async (): Promise<Me | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, is_active, role_id, profile_picture_path")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileData as unknown as {
    full_name: string;
    is_active: boolean;
    role_id: string;
    profile_picture_path: string | null;
  } | null;
  if (!profile || !profile.is_active) return null;

  const { data: roleData } = await supabase
    .from("roles")
    .select("name, is_super")
    .eq("id", profile.role_id)
    .single();
  const role = roleData as unknown as { name: string; is_super: boolean } | null;
  if (!role) return null;

  const { data: permData } = await supabase
    .from("role_permissions")
    .select("module, level")
    .eq("role_id", profile.role_id);

  const permissions: Partial<Record<Module, Level>> = {};
  for (const p of (permData ?? []) as unknown as { module: Module; level: Level }[]) {
    permissions[p.module] = p.level;
  }

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    profilePicturePath: profile.profile_picture_path ?? null,
    roleName: role.name,
    isSuper: role.is_super,
    permissions,
  };
});

export function levelOf(me: Me, module: Module): Level {
  if (me.isSuper) return "full";
  return me.permissions[module] ?? "none";
}

export function can(me: Me, module: Module, needed: Level): boolean {
  return ORDER[levelOf(me, module)] >= ORDER[needed];
}
