import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMe, can, MODULES, NAV, type Level, type Module } from "@/lib/permissions";
import {
  createStaff,
  changeRole,
  setActive,
  resetPassword,
  updateRolePermissions,
  createRole,
} from "./actions";

type Profile = {
  id: string;
  full_name: string;
  role_id: string;
  is_active: boolean;
  created_at: string;
};
type Role = { id: string; name: string; is_super: boolean };
type Perm = { role_id: string; module: Module; level: Level };

const LEVELS: Level[] = ["none", "view", "edit", "full"];

const MESSAGES: Record<string, { ok: boolean; text: string }> = {
  created: { ok: true, text: "Staff account created." },
  saved: { ok: true, text: "Saved." },
  invalid: { ok: false, text: "Please check the form and try again." },
  weak_password: { ok: false, text: "Password must be at least 8 characters." },
  exists: { ok: false, text: "That email or role name already exists." },
  forbidden: { ok: false, text: "You do not have permission to do that." },
  self: { ok: false, text: "You cannot change your own role or deactivate yourself." },
  last_super: { ok: false, text: "At least one active Super Admin must remain." },
  error: { ok: false, text: "Something went wrong. Check the terminal for details." },
};

const MODULE_LABELS = Object.fromEntries(
  NAV.map((n) => [n.module, n.label])
) as Record<Module, string>;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const { msg } = await searchParams;
  const banner = msg ? MESSAGES[msg] : undefined;

  const me = await getMe();
  if (!me || !can(me, "users", "view")) {
    return <p className="text-slate-600">You do not have access to this section.</p>;
  }
  const manage = can(me, "users", "full");

  const supabase = await createClient();
  const [profilesRes, rolesRes, permsRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role_id, is_active, created_at").order("created_at"),
    supabase.from("roles").select("id, name, is_super").order("name"),
    supabase.from("role_permissions").select("role_id, module, level"),
  ]);
  const profiles = (profilesRes.data ?? []) as unknown as Profile[];
  const roles = (rolesRes.data ?? []) as unknown as Role[];
  const perms = (permsRes.data ?? []) as unknown as Perm[];

  const roleById = new Map(roles.map((r) => [r.id, r]));
  const permsByRole = new Map<string, Partial<Record<Module, Level>>>();
  for (const p of perms) {
    const current = permsByRole.get(p.role_id) ?? {};
    current[p.module] = p.level;
    permsByRole.set(p.role_id, current);
  }

  // Emails live in the login system, so we read them with the secret key.
  const emails = new Map<string, string>();
  let keyProblem = "";
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const u of data?.users ?? []) emails.set(u.id, u.email ?? "");
  } catch (e) {
    keyProblem = e instanceof Error ? e.message : "Could not read the staff emails.";
  }

  const input = "mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm";
  const button = "rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700";
  const smallButton = "rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100";

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Users and Roles</h1>
        <p className="text-slate-600">Create staff accounts and decide what each role can do.</p>
      </div>

      {banner && (
        <p
          role="status"
          className={`rounded p-3 text-sm ${banner.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}
        >
          {banner.text}
        </p>
      )}

      {keyProblem && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          {keyProblem}. Add <code>SUPABASE_SECRET_KEY</code> to <code>.env.local</code> and restart the server.
        </p>
      )}

      {/* ---------- Staff ---------- */}
      <section>
        <h2 className="mb-3 text-lg font-medium">Staff</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {manage && <th className="px-3 py-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const isMe = p.id === me.id;
                return (
                  <tr key={p.id} className="border-b border-slate-100 align-top last:border-0">
                    <td className="px-3 py-3">
                      {p.full_name}
                      {isMe && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                    </td>
                    <td className="px-3 py-3 text-slate-600">{emails.get(p.id) ?? "-"}</td>
                    <td className="px-3 py-3">
                      {manage && !isMe ? (
                        <form action={changeRole} className="flex items-center gap-2">
                          <input type="hidden" name="user_id" value={p.id} />
                          <select name="role_id" defaultValue={p.role_id} className="rounded border border-slate-300 px-2 py-1 text-sm">
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                          <button className={smallButton}>Save</button>
                        </form>
                      ) : (
                        roleById.get(p.role_id)?.name ?? "-"
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={p.is_active ? "text-green-700" : "text-slate-400"}>
                        {p.is_active ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    {manage && (
                      <td className="space-y-2 px-3 py-3">
                        {!isMe && (
                          <form action={setActive}>
                            <input type="hidden" name="user_id" value={p.id} />
                            <input type="hidden" name="active" value={p.is_active ? "0" : "1"} />
                            <button className={smallButton}>
                              {p.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </form>
                        )}
                        <details>
                          <summary className="cursor-pointer text-xs text-slate-500">Set new password</summary>
                          <form action={resetPassword} className="mt-2 flex gap-2">
                            <input type="hidden" name="user_id" value={p.id} />
                            <input
                              name="password"
                              type="text"
                              minLength={8}
                              required
                              autoComplete="off"
                              placeholder="At least 8 characters"
                              className="w-44 rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                            <button className={smallButton}>Set</button>
                          </form>
                        </details>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Add staff ---------- */}
      {manage && (
        <section>
          <h2 className="mb-3 text-lg font-medium">Add staff</h2>
          <form action={createStaff} className="grid max-w-2xl gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Full name
              <input name="full_name" required className={input} />
            </label>
            <label className="text-sm text-slate-700">
              Email
              <input name="email" type="email" required autoComplete="off" className={input} />
            </label>
            <label className="text-sm text-slate-700">
              Temporary password
              <input name="password" type="text" minLength={8} required autoComplete="off" className={input} />
            </label>
            <label className="text-sm text-slate-700">
              Role
              <select name="role_id" required className={input} defaultValue="">
                <option value="" disabled>Choose a role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </label>
            <div className="md:col-span-2">
              <button className={button}>Create account</button>
              <p className="mt-2 text-xs text-slate-500">
                Give the person their email and temporary password privately. They sign in at the normal login page.
              </p>
            </div>
          </form>
        </section>
      )}

      {/* ---------- Roles ---------- */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium">Roles and permissions</h2>
          <p className="text-sm text-slate-500">
            none = hidden, view = can see, edit = can add and change, full = can also delete and manage.
          </p>
        </div>

        {roles.map((r) => {
          const current = permsByRole.get(r.id) ?? {};
          if (r.is_super) {
            return (
              <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="font-medium">{r.name}</p>
                <p className="text-sm text-slate-500">Full access to everything. This cannot be changed.</p>
              </div>
            );
          }
          return (
            <form key={r.id} action={updateRolePermissions} className="rounded-lg border border-slate-200 bg-white p-4">
              <input type="hidden" name="role_id" value={r.id} />
              <p className="mb-3 font-medium">{r.name}</p>
              <div className="grid gap-3 md:grid-cols-4">
                {MODULES.map((m) => (
                  <label key={m} className="text-sm text-slate-700">
                    {MODULE_LABELS[m]}
                    <select
                      name={`perm_${m}`}
                      defaultValue={current[m] ?? "none"}
                      disabled={!manage}
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {manage && <button className={`${button} mt-4`}>Save {r.name}</button>}
            </form>
          );
        })}

        {manage && (
          <form action={createRole} className="flex max-w-md items-end gap-2">
            <label className="flex-1 text-sm text-slate-700">
              New role name
              <input name="name" required minLength={2} maxLength={40} className={input} />
            </label>
            <button className={button}>Add role</button>
          </form>
        )}
      </section>
    </div>
  );
}
