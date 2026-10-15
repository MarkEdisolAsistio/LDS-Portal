import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-semibold">LDS Educational Trainer Modules</h1>
      <p className="max-w-md text-slate-600">
        Mechatronics, electronics, electrical, instrumentation and automation
        trainers. Buy a ready module or ask us to build one for you.
      </p>
      <div className="flex gap-3">
        <Link href="/inquiry" className="rounded bg-slate-900 px-4 py-2 text-white">
          Make an inquiry
        </Link>
        <Link href="/login" className="rounded border border-slate-300 px-4 py-2">
          Admin sign in
        </Link>
      </div>
    </main>
  );
}
