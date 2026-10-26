"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NotificationCategory = "overdue" | "due_soon" | "calendar" | "new_ticket";

type NotificationItem = {
  id: string;
  category: NotificationCategory;
  title: string;
  href: string;
  weight?: number;
};

type NotificationsResponse = {
  userId?: string;
  notifications?: NotificationItem[];
  count?: number;
  calendarError?: string;
  error?: string;
};

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  overdue: "Overdue",
  due_soon: "Upcoming due",
  calendar: "Calendar reminder",
  new_ticket: "New ticket",
};

const CATEGORY_STYLES: Record<NotificationCategory, string> = {
  overdue: "bg-red-100 text-red-800",
  due_soon: "bg-amber-100 text-amber-800",
  calendar: "bg-blue-100 text-blue-800",
  new_ticket: "bg-emerald-100 text-emerald-800",
};

// Which notifications this person has already seen. It is kept in this browser, per person,
// so a number only shows for things that are new since the bell was last opened.
const readKey = (userId: string) => `lds-read-notifications:${userId}`;

function loadRead(userId: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(readKey(userId)) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function saveRead(userId: string, ids: Set<string>) {
  try {
    window.localStorage.setItem(readKey(userId), JSON.stringify([...ids]));
  } catch {
    // storage blocked: the number then simply comes back after a reload
  }
}

function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userId, setUserId] = useState("");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set()); // unread when the bell was opened
  const [calendarError, setCalendarError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    let loadingRequest = false;

    let interval = 0;
    const refresh = async () => {
      if (!active || loadingRequest) return;
      loadingRequest = true;
      try {
        const response = await fetch("/api/admin/monitoring-notifications", {
          cache: "no-store",
        });
        // Signed out (the session ran out) or not allowed: this is not an error to show.
        // Stop asking, and for a signed-out person reload so they are taken to the sign-in page.
        if (response.status === 401 || response.status === 403) {
          active = false;
          window.clearInterval(interval);
          if (response.status === 401) window.location.reload();
          return;
        }
        const payload = (await response.json()) as NotificationsResponse;
        if (!response.ok) {
          throw new Error(
            payload.error ?? `Notifications request failed (${response.status}).`,
          );
        }
        if (!active) return;
        setNotifications(payload.notifications ?? []);
        if (payload.userId) setUserId(payload.userId);
        setCalendarError(payload.calendarError ?? "");
        setError("");
      } catch (cause) {
        console.error("refreshMonitoringNotifications failed:", cause);
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load monitoring notifications.",
          );
        }
      } finally {
        loadingRequest = false;
        setLoading(false);
      }
    };

    interval = window.setInterval(() => void refresh(), 60_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    void refresh();

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshVersion]);

  // Read what this person has already seen, once we know who they are
  useEffect(() => {
    if (userId) setReadIds(loadRead(userId));
  }, [userId]);

  // Opening the bell marks everything in it as read
  useEffect(() => {
    if (!open || !userId || loading) return;
    const unread = notifications.filter((n) => !readIds.has(n.id)).map((n) => n.id);
    if (unread.length === 0) return;
    setFreshIds((before) => new Set([...before, ...unread]));
    const next = new Set(notifications.map((n) => n.id)); // also forgets items that are gone
    setReadIds(next);
    saveRead(userId, next);
  }, [open, userId, loading, notifications, readIds]);

  useEffect(() => {
    if (!open) setFreshIds(new Set());
  }, [open]);

  const count = notifications.reduce((sum, n) => (readIds.has(n.id) ? sum : sum + (n.weight ?? 1)), 0);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${count ? `, ${count} unread` : ""}`}
        aria-expanded={open}
        aria-controls="admin-notifications"
        aria-haspopup="dialog"
        title="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#59b6f2] to-[#0759a9] text-white shadow-sm transition hover:brightness-110 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <path d="M12 3.2a2 2 0 0 0-2 2v.4A7.2 7.2 0 0 0 5.2 12v3.1c0 1.3-.5 2.5-1.3 3.4h16.2c-.8-.9-1.3-2.1-1.3-3.4V12A7.2 7.2 0 0 0 14 5.6v-.4a2 2 0 0 0-2-2Z" fill="#e4f3ff" />
          <path d="M9.5 20a2.7 2.7 0 0 0 5 0Z" fill="#e4f3ff" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <section
          id="admin-notifications"
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-[60] mt-2 flex max-h-[min(70dvh,32rem)] w-[min(22rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-900 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="font-semibold">Notifications</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setRefreshVersion((version) => version + 1);
              }}
              className="rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Refresh
            </button>
          </div>
          <div className="overflow-y-auto">
            {error && (
              <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </p>
            )}
            {calendarError && (
              <p role="status" className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {calendarError}
              </p>
            )}
            {loading && notifications.length === 0 && !error ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Loading notifications…</p>
            ) : notifications.length === 0 ? (
              !error && (
                <p className="px-4 py-6 text-center text-sm text-slate-500">
                  No items need your attention right now.
                </p>
              )
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <Link
                      href={notification.href}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CATEGORY_STYLES[notification.category]}`}>
                          {CATEGORY_LABELS[notification.category]}
                        </span>
                        {freshIds.has(notification.id) && (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none text-white">New</span>
                        )}
                      </span>
                      <span className="mt-1 block text-sm font-medium leading-snug">
                        {notification.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export function AdminHeaderActions({
  showInbox,
  showNotifications,
  inboxUnread = 0,
}: {
  showInbox: boolean;
  showNotifications: boolean;
  // Number of unread messages. The number shows only while it is above 0, and goes away once they are read.
  inboxUnread?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {showNotifications && <NotificationsPopover />}
      {showInbox && (
        <Link
          href="/admin/inbox"
          aria-label={`Open inbox${inboxUnread ? `, ${inboxUnread} unread` : ""}`}
          title="Open inbox"
          className="relative hidden h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#1858ed] via-[#1678f4] to-[#08b6ef] text-white shadow-sm transition hover:brightness-110 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:grid"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <defs>
              <linearGradient id="admin-inbox-envelope" x1="4" y1="5" x2="19" y2="20" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fff" />
                <stop offset="1" stopColor="#dfe4eb" />
              </linearGradient>
              <filter id="admin-inbox-envelope-shadow" x="1" y="2" width="22" height="21" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="1" stdDeviation=".65" floodColor="#043d81" floodOpacity=".45" />
              </filter>
            </defs>
            <path d="M5.3 5.5h13.4A2.3 2.3 0 0 1 21 7.8v8.8a2.3 2.3 0 0 1-2.3 2.3H5.3A2.3 2.3 0 0 1 3 16.6V7.8a2.3 2.3 0 0 1 2.3-2.3Z" fill="url(#admin-inbox-envelope)" filter="url(#admin-inbox-envelope-shadow)" />
            <path d="m3.5 7.4 7.2 5.7a2.1 2.1 0 0 0 2.6 0l7.2-5.7" fill="none" stroke="#a9afb8" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4.3 17.8 9.2 12m10.5 5.8L14.8 12" fill="none" stroke="#c4c9d0" strokeWidth=".8" strokeLinecap="round" />
            <path d="M5.2 6.2h13.6a1.9 1.9 0 0 1 1.7 1L13.1 13a1.8 1.8 0 0 1-2.2 0L3.5 7.2a1.9 1.9 0 0 1 1.7-1Z" fill="#f9fafb" stroke="#c4c9d0" strokeWidth=".5" filter="url(#admin-inbox-envelope-shadow)" />
          </svg>
          {inboxUnread > 0 && (
            <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {inboxUnread > 99 ? "99+" : inboxUnread}
            </span>
          )}
        </Link>
      )}
    </div>
  );
}
