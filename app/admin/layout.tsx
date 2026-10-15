import Link from "next/link";
import { getMe, can, NAV } from "@/lib/permissions";
import { logout } from "@/app/login/actions";

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
          <button className="rounded bg-slate-900 px-4 py-2 text-white">
            Sign out
          </button>
        </form>
      </main>
    );
  }

  const items = NAV.filter((n) => can(me, n.module, "view"));

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6">
          <p className="text-lg font-semibold">LDS Portal</p>
          <p className="text-sm text-slate-600">{me.fullName}</p>
          <p className="text-xs text-slate-400">{me.roleName}</p>
        </div>

        <nav className="flex flex-col gap-1">
          {items.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded px-3 py-2 text-sm hover:bg-slate-100"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <form action={logout} className="mt-6">
          <button className="text-sm text-slate-500 underline">Sign out</button>
        </form>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
