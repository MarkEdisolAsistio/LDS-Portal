import { getMe, can, NAV } from "@/lib/permissions";
import { AdminPortalShell } from "@/components/admin-portal-shell";
import { logout } from "@/app/login/actions";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getMe();

  // Signed in, but no active admin profile.
  if (!me) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold">No access</h1>
        <p className="text-slate-600">
          This account is signed in but has no active admin profile. Ask a Super
          Admin to set up your access.
        </p>
        <form action={logout}>
          <button className="rounded bg-[#0d5a89] px-4 py-2 text-white hover:bg-[#0b446a]">
            Sign out
          </button>
        </form>
      </main>
    );
  }

  const items = NAV.filter((n) => can(me, n.module, "view"));
  let inboxUnread = 0;
  let profilePictureUrl = "";
  if (me.profilePicturePath) {
    const { data } = await createAdminClient().storage.from("staff-profile-pictures").createSignedUrl(me.profilePicturePath, 3600);
    profilePictureUrl = data?.signedUrl ?? "";
  }
  if (can(me, "inbox", "view")) {
    const { count } = await createAdminClient()
      .from("email_messages")
      .select("id", { count: "exact", head: true })
      .eq("direction", "inbound")
      .eq("is_read", false);
    inboxUnread = count ?? 0;
  }

  return (
    <AdminPortalShell
      items={items.map(({ href, label }) => ({ href, label }))}
      fullName={me.fullName}
      roleName={me.roleName}
      profilePictureUrl={profilePictureUrl}
      inboxUnread={inboxUnread}
    >
      {children}
    </AdminPortalShell>
  );
}
