import Link from "next/link";
import { SiteShell } from "@/components/site-shell";

export default function AboutLdsPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold">About LDS</h1>
        <p className="mt-4 text-slate-600">
          The LDS department designs, builds, and supplies educational trainer
          modules for mechatronics, electronics, electrical, instrumentation,
          and automation training.
        </p>
        <p className="mt-4 text-slate-600">
          We serve teams inside the company as well as outside clients. You can
          buy a ready-made module or ask us to build a customized one.
        </p>
        <Link
          href="/inquiry"
          className="mt-6 inline-block rounded-md bg-gradient-to-r from-[#07559a] to-[#007b96] px-5 py-2.5 font-medium text-white shadow-sm transition hover:from-[#064579] hover:to-[#00677d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07559a]"
        >
          Make an inquiry
        </Link>
      </main>
    </SiteShell>
  );
}
