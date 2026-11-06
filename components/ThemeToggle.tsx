"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";
import { applyTheme, getTheme, setTheme, subscribeToTheme, THEME_STORAGE_KEY } from "@/lib/theme";

const getServerTheme = () => "light" as const;

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, getServerTheme);

  useLayoutEffect(() => {
    // Strict Mode can reset root attributes during a development remount.
    let saved = getTheme();
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark") saved = stored;
    } catch {
      // Keep the current in-memory theme if storage is blocked.
    }
    applyTheme(saved);
  }, []);

  return (
    <button
      type="button"
      role="switch"
      aria-label="Dark theme"
      aria-checked={theme === "dark"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(getTheme() === "dark" ? "light" : "dark")}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface text-ink transition-colors hover:bg-surface-2"
    >
      <svg className="theme-moon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M8 2h4v2H8v2H6v6h2v2h6v-2h2v-2h2v4h-2v2h-2v2H6v-2H4v-2H2V6h2V4h4V2Z" />
        <path d="M15 2h2v2h2v2h-2v2h-2V6h-2V4h2V2Z" />
      </svg>
      <svg className="theme-sun" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M9 0h2v3H9V0ZM9 17h2v3H9v-3ZM0 9h3v2H0V9ZM17 9h3v2h-3V9ZM3 2h2v2h2v2H5V4H3V2ZM13 14h2v2h2v2h-2v-2h-2v-2ZM15 2h2v2h-2v2h-2V4h2V2ZM5 14h2v2H5v2H3v-2h2v-2ZM7 5h6v2h2v6h-2v2H7v-2H5V7h2V5Z" />
      </svg>
    </button>
  );
}
