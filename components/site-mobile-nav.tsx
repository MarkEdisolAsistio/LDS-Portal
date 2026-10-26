"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { SiteSearch } from "@/components/site-search";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/about-lds", label: "About LDS" },
  { href: "/about-mfi", label: "About MFI" },
  { href: "/news-updates", label: "News & Updates" },
  { href: "/blog-articles", label: "Blog Articles" },
  { href: "/events", label: "Events" },
  { href: "/inquiry", label: "Inquiry" },
];

export function SiteMobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      className="relative md:hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setIsOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={isOpen ? "Close site navigation" : "Open site navigation"}
        aria-expanded={isOpen}
        aria-controls="site-mobile-navigation"
        onClick={() => setIsOpen((open) => !open)}
        className="grid h-11 w-11 flex-none place-items-center rounded border border-white/35 text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
          {isOpen ? (
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          ) : (
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div
          id="site-mobile-navigation"
          className="site-mobile-nav-panel absolute -right-6 top-[calc(100%+0.5rem)] z-[60] max-h-[min(75vh,40rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-white/15 bg-[#0b446a] p-4 shadow-[0_12px_28px_rgba(8,38,60,0.3)]"
        >
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="rounded px-3 py-2 text-sm text-slate-100 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:outline-none"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center gap-2 border-t border-white/20 px-2 pt-3">
            <div className="min-w-0 flex-1">
              <SiteSearch />
            </div>
            <ThemeToggle />
          </div>
        </div>
      )}
    </div>
  );
}
