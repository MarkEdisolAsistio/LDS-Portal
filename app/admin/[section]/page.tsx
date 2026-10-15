import { notFound } from "next/navigation";
import { getMe, can, NAV } from "@/lib/permissions";

// Placeholder for every admin section we have not built yet.
// It already enforces the role permission for that section.
export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const item = NAV.find((n) => n.href === `/admin/${section}`);
  if (!item) notFound();

  const me = await getMe();
  if (!me || !can(me, item.module, "view")) {
    return <p className="text-slate-600">You do not have access to this section.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">{item.label}</h1>
      <p className="mt-2 text-slate-600">This section is built in a later step.</p>
    </div>
  );
}
