"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function subscribeToTheme(onStoreChange: () => void) {
  const onStorageChange = (event: StorageEvent) => {
    if (event.key !== "lds-theme") return;
    document.documentElement.dataset.theme = event.newValue === "dark" ? "dark" : "light";
    onStoreChange();
  };

  window.addEventListener("lds-theme-change", onStoreChange);
  window.addEventListener("storage", onStorageChange);
  return () => {
    window.removeEventListener("lds-theme-change", onStoreChange);
    window.removeEventListener("storage", onStorageChange);
  };
}

function getThemeSnapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerThemeSnapshot(): Theme {
  return "light";
}

export function ThemeToggle({ variant = "header" }: { variant?: "header" | "floating" | "admin" }) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("lds-theme", nextTheme);
    window.dispatchEvent(new Event("lds-theme-change"));
  }

  return (
    <button
      type="button"
      className={`theme-toggle${variant === "floating" ? " theme-toggle-floating" : variant === "admin" ? " theme-toggle-admin" : ""}`}
      data-theme-state={theme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-pressed={theme === "dark"}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      onClick={toggleTheme}
    >
      <svg viewBox="0 0 72 40" className="theme-toggle-scene" aria-hidden="true">
        <g className="theme-toggle-day-art">
          <circle cx="15" cy="20" r="10" className="theme-toggle-sun" />
          <g className="theme-toggle-clouds">
            <path d="M32 25.5h27a5 5 0 0 0 .2-10 8.5 8.5 0 0 0-15.8-1.4A6.1 6.1 0 0 0 39 17a4.3 4.3 0 0 0-7 3.3 4.7 4.7 0 0 0 0 5.2Z" />
            <path d="M43 12.5h10a4 4 0 0 0 .1-8 6.4 6.4 0 0 0-11.8-.5A4.8 4.8 0 0 0 37 8.6a4 4 0 0 0 6 3.9Z" />
          </g>
        </g>
        <g className="theme-toggle-night-art">
          <path className="theme-toggle-night-horizon" d="M0 29c12-7 24-5 35 3 8 6 18 7 37 3v5H0Z" />
          <circle cx="57" cy="20" r="10" className="theme-toggle-moon" />
          <g className="theme-toggle-moon-craters">
            <circle cx="53" cy="16" r="1.5" /><circle cx="61" cy="17" r="1.2" />
            <circle cx="57" cy="23" r="1.8" /><circle cx="62" cy="24" r=".8" />
          </g>
          <g className="theme-toggle-stars">
            <circle cx="11" cy="10" r=".8" /><circle cx="23" cy="17" r=".65" />
            <circle cx="31" cy="8" r=".7" /><circle cx="43" cy="12" r=".6" />
            <circle cx="8" cy="23" r=".55" /><circle cx="37" cy="28" r=".7" />
          </g>
        </g>
      </svg>
    </button>
  );
}
