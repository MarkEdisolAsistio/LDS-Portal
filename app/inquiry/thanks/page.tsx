import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export default async function Thanks({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { ticket } = await searchParams;
  const valid = ticket && /^(REQ|PO)_\d{4}_\d{4,}$/.test(ticket);

  return (
    <SiteShell>
      <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Thank you!</h1>
        <p className="text-slate-600">We received your inquiry.</p>
        {valid && (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-4">
            <p className="text-sm text-slate-500">Your reference number</p>
            <p className="text-2xl font-semibold text-slate-900">{ticket}</p>
          </div>
        )}
        <p className="text-sm text-slate-500">
          Please keep this number. Our team will contact you by email.
        </p>
        <Link href="/" className="rounded bg-[#0d5a89] px-4 py-2 text-white hover:bg-[#0b446a]">
          Back to home
        </Link>
      </main>
    </SiteShell>
  );
}
