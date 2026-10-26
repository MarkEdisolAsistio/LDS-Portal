"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/login/actions";
import { AdminHeaderActions } from "@/components/admin-header-actions";
import { ThemeToggle } from "@/components/theme-toggle";
import ProfilePictureEditor from "@/components/profile-picture-editor";

type AdminNavItem = {
  href: string;
  label: string;
};

export function AdminPortalShell({
  children,
  items,
  fullName,
  roleName,
  profilePictureUrl = "",
  inboxUnread = 0,
}: {
  children: React.ReactNode;
  items: AdminNavItem[];
  fullName: string;
  roleName: string;
  profilePictureUrl?: string;
  inboxUnread?: number;
}) {
  const pathname = usePathname();
  const showInbox = items.some((item) => item.href === "/admin/inbox");
  const showNotifications = items.some((item) => item.href === "/admin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const sidebarCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const mobileViewport = window.matchMedia("(max-width: 767px)");
    const previousOverflow = document.body.style.overflow;
    const updateBodyOverflow = () => {
      document.body.style.overflow = mobileViewport.matches
        ? "hidden"
        : previousOverflow;
    };

    updateBodyOverflow();
    mobileViewport.addEventListener("change", updateBodyOverflow);
    return () => {
      mobileViewport.removeEventListener("change", updateBodyOverflow);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  function keepDesktopSidebarOpen() {
    if (sidebarCloseTimer.current) clearTimeout(sidebarCloseTimer.current);
    sidebarCloseTimer.current = null;
    setDesktopSidebarOpen(true);
  }

  function scheduleDesktopSidebarClose() {
    if (sidebarCloseTimer.current) clearTimeout(sidebarCloseTimer.current);
    sidebarCloseTimer.current = setTimeout(() => {
      setDesktopSidebarOpen(false);
      sidebarCloseTimer.current = null;
    }, 350);
  }

  const navigation = (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            aria-current={isActive ? "page" : undefined}
            className={`rounded px-3 py-2 text-sm transition-colors ${
              isActive
                ? "admin-nav-active bg-[#e8f3f6] font-medium text-[#07559a]"
                : "admin-nav-link text-slate-700 hover:bg-[#f0f7f8] hover:text-[#07559a]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const profileBlock = <ProfilePictureEditor name={fullName} roleName={roleName} imageUrl={profilePictureUrl} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 print:block print:bg-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/25 bg-gradient-to-r from-[#0d4775] via-[#0b5c87] to-[#0a8190] text-white shadow-[0_6px_24px_rgba(8,38,60,0.18)] print:hidden">
        <div className="flex w-full items-center justify-between gap-3 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="admin-menu-toggle admin-menu-toggle-desktop"
              aria-label={desktopSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-expanded={desktopSidebarOpen}
              aria-controls="admin-sidebar"
              onClick={() => setDesktopSidebarOpen((open) => !open)}
              onPointerEnter={(event) => {
                if (event.pointerType !== "touch") keepDesktopSidebarOpen();
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== "touch") scheduleDesktopSidebarClose();
              }}
              onFocus={keepDesktopSidebarOpen}
            >
              <svg
                className="admin-menu-icon"
                data-open={desktopSidebarOpen}
                viewBox="0 0 24 24"
                width="28"
                height="28"
                aria-hidden="true"
              >
                <path
                  className="admin-menu-icon-line admin-menu-icon-top"
                  d="M3 6h18"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  className="admin-menu-icon-line admin-menu-icon-middle"
                  d="M3 12h18"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  className="admin-menu-icon-line admin-menu-icon-bottom"
                  d="M3 18h18"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="admin-menu-toggle admin-menu-toggle-mobile"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-mobile-navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <svg
                className="admin-menu-icon"
                data-open={mobileMenuOpen}
                viewBox="0 0 24 24"
                width="28"
                height="28"
                aria-hidden="true"
              >
                <path
                  className="admin-menu-icon-line admin-menu-icon-top"
                  d="M3 6h18"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  className="admin-menu-icon-line admin-menu-icon-middle"
                  d="M3 12h18"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  className="admin-menu-icon-line admin-menu-icon-bottom"
                  d="M3 18h18"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <Link href="/" className="site-brand admin-header-brand min-w-0">
              <Image
                src="/mfi-logo.png"
                alt=""
                width={768}
                height={768}
                className="site-brand-logo admin-header-brand-logo"
                style={{ width: "clamp(28px, 8vw, 48px)", height: "clamp(28px, 8vw, 48px)" }}
              />
              <span className="site-brand-copy">
                <span
                  className="site-brand-institute"
                  style={{ fontSize: "clamp(0.54rem, 2.5vw, 0.84rem)" }}
                >
                  MFI Polytechnic
                  <br />
                  Institute Inc.
                </span>
              </span>
              <span className="site-brand-divider" aria-hidden="true">
                |
              </span>
              <span className="site-brand-details">
                <span
                  className="site-brand-formerly"
                  style={{ fontSize: "clamp(0.46rem, 1.55vw, 0.66rem)" }}
                >
                  Formerly Meralco Foundation
                </span>
                <span
                  className="site-brand-motto"
                  style={{ fontSize: "clamp(0.52rem, 1.8vw, 0.76rem)" }}
                >
                  Beyond Skills, A Better Life
                </span>
              </span>
            </Link>
          </div>
          <div className="flex shrink-0">
            <AdminHeaderActions
              showInbox={showInbox}
              showNotifications={showNotifications}
              inboxUnread={inboxUnread}
            />
          </div>
        </div>

        <div
          id="admin-mobile-navigation"
          className="admin-mobile-navigation md:hidden"
          data-open={mobileMenuOpen}
          aria-hidden={!mobileMenuOpen}
          inert={!mobileMenuOpen}
        >
          <div className="mb-4 border-b border-slate-200 px-3 pb-3">
            {profileBlock}
          </div>
          {navigation}
          <form action={logout} className="mt-4 border-t border-slate-200 pt-3">
            <button className="px-3 py-2 text-sm text-red-300 underline hover:text-red-200">
              Sign out
            </button>
          </form>
          <div className="mt-4 flex justify-center">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4.5rem)] pt-[4.05rem] print:block print:pt-0">
        {desktopSidebarOpen && (
          <aside
            id="admin-sidebar"
            className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-slate-200 bg-white p-4 shadow-lg print:hidden md:top-[4.05rem] md:flex md:h-[calc(100vh-4.05rem)] md:flex-col md:overflow-y-auto"
            onPointerEnter={keepDesktopSidebarOpen}
            onPointerLeave={scheduleDesktopSidebarClose}
          >
            <div className="mb-6">
              {profileBlock}
            </div>

            {navigation}

            <form action={logout} className="relative mt-6 flex items-center">
              <button className="text-sm text-red-600 underline hover:text-red-700">
                Sign out
              </button>
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <ThemeToggle variant="admin" />
              </span>
            </form>
          </aside>
        )}

        <main className="min-w-0 flex-1 p-5 md:p-8 print:p-0">{children}</main>
      </div>
    </div>
  );
}
