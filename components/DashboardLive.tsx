"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { DashboardSnapshot } from "@/lib/dashboard";
import { subscribeToStudyUpdates } from "@/lib/study-updates";
import { FriendsPanel } from "./FriendsPanel";
import { Timer } from "./Timer";
import { WeeklyGoal } from "./WeeklyGoal";

/** Refresh only dashboard data; keep forms, expanded cards, and scroll in place. */
export function DashboardLive({ initial, userId }: { initial: DashboardSnapshot; userId: string }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const [previousInitial, setPreviousInitial] = useState(initial);
  if (initial !== previousInitial) {
    setPreviousInitial(initial);
    setSnapshot(initial);
  }

  useEffect(() => {
    let disposed = false;
    let fetching = false;
    let dirty = false;
    let controller: AbortController | undefined;

    async function refresh() {
      dirty = true;
      if (fetching) return;
      fetching = true;
      try {
        // A change arriving during a request always gets a subsequent fresh read.
        while (dirty && !disposed) {
          dirty = false;
          controller = new AbortController();
          const timeout = setTimeout(() => controller?.abort(), 15_000);
          try {
            const response = await fetch("/api/dashboard", { cache: "no-store", signal: controller.signal });
            if (response.status === 401) {
              router.replace("/login");
              return;
            }
            if (!response.ok) throw new Error("Dashboard data unavailable");
            const next: DashboardSnapshot = await response.json();
            if (!disposed && !dirty) setSnapshot(next);
          } catch {
            // Preserve the last good snapshot during transient network failures.
          } finally {
            clearTimeout(timeout);
          }
        }
      } finally {
        fetching = false;
      }
    }

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const unsubscribe = subscribeToStudyUpdates(() => void refresh());
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("online", refreshWhenVisible);
    // Recovery for missed notifications and day/week rollovers, without route refreshes.
    const interval = setInterval(refreshWhenVisible, 60_000);

    return () => {
      disposed = true;
      controller?.abort();
      unsubscribe();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("online", refreshWhenVisible);
    };
  }, [router]);

  return (
    <>
      {snapshot.error && (
        <p className="mb-4 rounded-xl border border-danger/25 bg-surface px-4 py-3 text-sm text-danger shadow-card">
          Some data didn’t load: {snapshot.error}
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-8">
        <div className="flex flex-col gap-4 md:sticky md:top-8">
          <Timer initialTimer={snapshot.timer} serverNow={snapshot.serverNow} />
          <WeeklyGoal key={`${userId}:${snapshot.weekStart}`} goals={snapshot.goals} userId={userId} weekStart={snapshot.weekStart} />
        </div>
        <FriendsPanel friends={snapshot.friends} meId={userId} serverNow={snapshot.serverNow} />
      </div>
    </>
  );
}
