// Product videos: a link to YouTube or Vimeo (shown as an embedded player),
// or a file we host (MP4 / WebM).

export type ProductVideo =
  | { kind: "youtube" | "vimeo"; title: string; url: string; embed: string }
  | { kind: "file"; title: string; url: string; size: number };

export const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // the free Supabase plan allows 50 MB per file
export const MAX_VIDEOS = 6;

// Reads a pasted link. The embed address is built from the video id only,
// so nothing else from the pasted text ever reaches the page.
export function parseVideoLink(input: string): { kind: "youtube" | "vimeo"; url: string; embed: string } | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");

  let yt: string | null = null;
  if (host === "youtu.be") yt = u.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "watch") yt = u.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) yt = parts[1] ?? null;
  }
  if (yt && /^[A-Za-z0-9_-]{11}$/.test(yt)) {
    return { kind: "youtube", url: `https://www.youtube.com/watch?v=${yt}`, embed: `https://www.youtube-nocookie.com/embed/${yt}` };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean).find((p) => /^\d{5,12}$/.test(p));
    if (id) return { kind: "vimeo", url: `https://vimeo.com/${id}`, embed: `https://player.vimeo.com/video/${id}` };
  }
  return null;
}

export function asVideos(v: unknown): ProductVideo[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((x): ProductVideo[] => {
    const o = x as { kind?: unknown; title?: unknown; url?: unknown; embed?: unknown; size?: unknown };
    if (typeof o?.url !== "string" || typeof o.title !== "string") return [];
    if (o.kind === "file") return [{ kind: "file", title: o.title, url: o.url, size: typeof o.size === "number" ? o.size : 0 }];
    if ((o.kind === "youtube" || o.kind === "vimeo") && typeof o.embed === "string") {
      // re-check on the way out, in case the stored value was edited by hand
      const parsed = parseVideoLink(o.url);
      return parsed && parsed.kind === o.kind ? [{ kind: parsed.kind, title: o.title, url: parsed.url, embed: parsed.embed }] : [];
    }
    return [];
  });
}
