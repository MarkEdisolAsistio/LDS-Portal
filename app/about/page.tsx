import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

// Edit the text below to describe your department.
export default function About() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold">About Us</h1>
        <p className="mt-4 text-slate-600">
          The LDS department designs, builds and supplies educational trainer
          modules for mechatronics, electronics, electrical, instrumentation
          and automation training.
        </p>
        <p className="mt-4 text-slate-600">
          We serve teams inside the company as well as outside clients. You can
          buy a ready-made module or ask us to build a customized one.
        </p>
        <Link href="/inquiry" className="mt-6 inline-block rounded bg-[#0d5a89] px-5 py-2 text-white hover:bg-[#0b446a]">
          Make an inquiry
        </Link>
      </main>
    </SiteShell>
  );
}
