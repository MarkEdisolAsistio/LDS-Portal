import Link from "next/link";
import { getMe, can } from "@/lib/permissions";
import { NewsFields } from "@/components/news-fields";
import { createPost } from "../actions";

const ERRORS: Record<string, string> = {
  invalid: "Please enter a title and choose a type.",
  bad_type: "The cover photo must be JPG, PNG or WebP.",
  too_big: "That cover photo is larger than 5 MB.",
  upload_error: "The photo upload failed. Run sql/15_news_extras.sql so the news-images storage bucket exists.",
};

export default async function NewPost({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const me = await getMe();
  if (!me || !can(me, "news", "edit")) return <p className="text-slate-600">You do not have access to this section.</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/news" className="text-sm text-slate-500 underline">Back to news</Link>
        <h1 className="mt-2 text-2xl font-semibold">New post</h1>
      </div>
      {msg && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {ERRORS[msg] ?? "Could not save. Check the terminal for details."}
        </p>
      )}
      <form id="news-form" action={createPost} className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
        <NewsFields />
        <button className="rounded bg-[#0d5a89] px-5 py-2 text-white hover:bg-[#0b446a]">Create post</button>
      </form>
    </div>
  );
}
