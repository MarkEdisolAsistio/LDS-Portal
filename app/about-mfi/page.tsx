import { SiteShell } from "@/components/site-shell";

export default function AboutMfiPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold">About MFI</h1>
        <p className="mt-4 text-slate-600">
          MFI Polytechnic Institute Inc., formerly Meralco Foundation, is
          represented by the motto “Beyond Skills, A Better Life.”
        </p>
      </main>
    </SiteShell>
  );
}
