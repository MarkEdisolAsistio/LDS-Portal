import Link from "next/link";

export default async function Thanks({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { ticket } = await searchParams;
  const valid = ticket && /^LDS-\d{4}-\d{4,}$/.test(ticket);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Thank you!</h1>
      <p className="text-slate-600">We received your inquiry.</p>
      {valid && (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-4">
          <p className="text-sm text-slate-500">Your ticket number</p>
          <p className="text-2xl font-semibold text-slate-900">{ticket}</p>
        </div>
      )}
      <p className="text-sm text-slate-500">
        Please keep this number. Our team will contact you by email.
      </p>
      <Link href="/" className="rounded bg-slate-900 px-4 py-2 text-white">
        Back to home
      </Link>
    </main>
  );
}
