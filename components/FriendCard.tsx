"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatClock, formatHours, formatMinutes, formatShortDate } from "@/lib/time";
import { GOAL_STATUS_LABEL, type GoalStatus } from "@/lib/types";

export type FriendCardData = {
  id: string;
  name: string;
  todayMin: number;
  weekMin: number;
  /** ISO time the friend's timer has been running since, null if not running */
  liveSince: string | null;
  liveAccumulatedMs: number;
  last: { startedAt: string; minutes: number; report: string } | null;
  goal: { text: string; status: GoalStatus } | null;
};

function LiveClock({ since, accumulated }: { since: string; accumulated: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums">{formatClock(accumulated + Math.max(0, now - Date.parse(since)))}</span>;
}

function Expandable({ children, className }: { children: React.ReactNode; className: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      className={`block w-full text-left ${open ? "whitespace-pre-wrap" : "line-clamp-2"} ${className}`}
    >
      {children}
    </button>
  );
}

export function FriendCard({ f, maxWeek, me, href }: { f: FriendCardData; maxWeek: number; me: boolean; href?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          {f.liveSince && <span className="size-2 shrink-0 rounded-full bg-live" aria-hidden />}
          {href ? (
            <Link href={href} className="truncate font-medium underline-offset-4 hover:underline">
              {f.name}
            </Link>
          ) : (
            <span className="truncate font-medium">{f.name}</span>
          )}
          {me && <span className="shrink-0 text-xs text-muted">вы</span>}
        </span>
        {f.liveSince ? (
          <span className="shrink-0 text-sm text-live">
            <LiveClock since={f.liveSince} accumulated={f.liveAccumulatedMs} />
          </span>
        ) : (
          <span className="shrink-0 text-sm text-muted">не учится</span>
        )}
      </div>

      {f.goal ? (
        <div className="mt-3 rounded-xl bg-surface-2 px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span>Цель недели</span>
            <span className={f.goal.status === "done" ? "text-live" : f.goal.status === "missed" ? "text-danger" : ""}>
              {GOAL_STATUS_LABEL[f.goal.status]}
            </span>
          </div>
          <Expandable className="mt-1 text-sm leading-relaxed">{f.goal.text}</Expandable>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">Цель на неделю не задана</p>
      )}

      <div className="mt-4 flex items-baseline gap-5 text-sm">
        <span>
          <span className="text-muted">сегодня </span>
          <span className="font-mono tabular-nums">{formatMinutes(f.todayMin)}</span>
        </span>
        <span>
          <span className="text-muted">неделя </span>
          <span className="font-mono tabular-nums">{formatHours(f.weekMin)} ч</span>
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full ${me ? "bg-accent" : "bg-ink/25"}`}
          style={{ width: `${maxWeek ? (f.weekMin / maxWeek) * 100 : 0}%` }}
        />
      </div>

      {f.last && (
        <Expandable className="mt-4 text-sm leading-relaxed text-muted">
          <span className="text-ink/70">
            {formatShortDate(f.last.startedAt)} · {formatMinutes(f.last.minutes)} —{" "}
          </span>
          {f.last.report}
        </Expandable>
      )}
    </div>
  );
}
