import { createClient } from "@/lib/supabase/server";
import { getMe, can, levelOf, NAV } from "@/lib/permissions";
import { STATUSES, STATUS_LABELS } from "@/lib/status";

export default async function AdminHome() {
  const me = await getMe();
  if (!me) return null; // the layout already shows the "No access" screen

  const counts: Record<string, number> = {};
  const seesInquiries = can(me, "inquiries", "view");

  if (seesInquiries) {
    const supabase = await createClient();
    const { data } = await supabase.from("inquiries").select("status");
    for (const row of (data ?? []) as unknown as { status: string }[]) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {me.fullName}</h1>
        <p className="text-slate-600">Signed in as {me.roleName}.</p>
      </div>

      {seesInquiries && (
        <section>
          <h2 className="mb-3 text-lg font-medium">Tickets by status</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {STATUSES.map((s) => (
              <div key={s} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">{STATUS_LABELS[s]}</p>
                <p className="text-2xl font-semibold">{counts[s] ?? 0}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium">Your access</h2>
        <table className="w-full max-w-md rounded-lg border border-slate-200 bg-white text-sm">
          <tbody>
            {NAV.map((n) => (
              <tr key={n.module} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2">{n.label}</td>
                <td className="px-3 py-2 text-slate-500">{levelOf(me, n.module)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
