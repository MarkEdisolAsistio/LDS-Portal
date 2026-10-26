"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

export type MenuProject = {
  id: string;
  title: string;
  blurb: string;
  category: string;
  image: string | null;
};

// "Projects" in the header: the label still goes to the Projects page, and hovering
// (or pressing the arrow) opens a panel with the 3 latest modules.
export function ProjectsMenu({ projects }: { projects: MenuProject[] }) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(0);
  const panelId = useId();
  const open = hovered || pinned;

  // Centre the panel under the Projects label, but never let it run off the screen.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = panel.current;
      const label = root.current;
      const parent = el?.offsetParent as HTMLElement | null;
      if (!el || !label || !parent) return;
      const l = label.getBoundingClientRect();
      const margin = 8;
      const wanted = l.left + l.width / 2 - el.offsetWidth / 2;
      const clamped = Math.max(margin, Math.min(wanted, window.innerWidth - el.offsetWidth - margin));
      setLeft(clamped - parent.getBoundingClientRect().left);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, projects.length]);

  const enter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHovered(true);
  };
  // A short delay so the pointer can cross the gap between the label and the panel
  const leave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setHovered(false);
      setPinned(false);
    }, 180);
  };
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  return (
    <div
      ref={root}
      onPointerEnter={(e) => { if (e.pointerType !== "touch") enter(); }}
      onPointerLeave={(e) => { if (e.pointerType !== "touch") leave(); }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPinned(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setHovered(false);
          setPinned(false);
          button.current?.focus();
        }
      }}
      className="inline-flex items-center gap-1"
    >
      <Link href="/projects" className="text-slate-100 transition-colors hover:text-white">
        Projects
      </Link>
      <button
        ref={button}
        type="button"
        aria-label="Show the latest projects"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setPinned((p) => !p)}
        className="inline-flex items-center rounded text-slate-100 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-3 w-3 fill-none stroke-current transition-transform duration-150"
          style={{ transform: open ? "rotate(180deg)" : undefined, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" }}
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div
          id={panelId}
          ref={panel}
          style={{ left }}
          className="absolute top-[calc(100%+0.25rem)] z-[60] w-[min(40rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-white/15 bg-gradient-to-br from-[#0b446a] via-[#0d5a89] to-[#0b7d8d] shadow-[0_12px_28px_rgba(8,38,60,0.3)]"
        >
          <div className="p-3">

            {projects.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-100">No projects yet. Check back soon.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-3">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      onClick={() => { setHovered(false); setPinned(false); }}
                      className="group block h-full overflow-hidden rounded-md border border-white/15 bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
                    >
                      <div className="aspect-[16/10] bg-black/20">
                        {p.image ? (
                          <img src={p.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[11px] text-slate-300">No photo yet</div>
                        )}
                      </div>
                      <div className="space-y-0.5 p-2 text-left">
                        {p.category && <p className="truncate text-[10px] uppercase tracking-wide text-slate-300">{p.category}</p>}
                        <p className="line-clamp-1 text-sm font-semibold text-white group-hover:underline">{p.title}</p>
                        {p.blurb && <p className="line-clamp-2 text-[11px] leading-snug text-slate-200">{p.blurb}</p>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex justify-end border-t border-white/15 pt-3">
              <Link
                href="/projects"
                onClick={() => { setHovered(false); setPinned(false); }}
                className="rounded bg-white px-3 py-1.5 text-sm font-medium text-[#0b446a] transition-colors hover:bg-[#0b446a] hover:text-white focus-visible:bg-[#0b446a] focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                See More Projects &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
