import { NextResponse } from "next/server";
import { searchSiteContent } from "@/lib/site-search";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length > 100) {
    return NextResponse.json(
      { error: "Search text must be 100 characters or fewer." },
      { status: 400 }
    );
  }

  const results = query ? await searchSiteContent(query) : [];
  return NextResponse.json({ results });
}
