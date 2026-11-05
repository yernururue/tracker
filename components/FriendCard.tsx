"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatClock, formatHours, formatMinutes, formatShortDate } from "@/lib/time";

export type FriendCardData = {
  id: string;
  name: string;
  todayMin: number;
  weekMin: number;
  /** ISO time the friend's timer has been running since, null if not running */
  liveSince: string | null;
  liveAccumulatedMs: number;
  last: { startedAt: string; minutes: number; report: string } | null;
};

function LiveClock({ since, accumulated }: { since: string; accumulated: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums">{formatClock(accumulated + Math.max(0, now - Date.parse(since)))}</span>;
}

export function FriendCard({ f, maxWeek, me, href }: { f: FriendCardData; maxWeek: number; me: boolean; href?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          {f.liveSince && <span className="size-2 shrink-0 rounded-full bg-live" aria-hidden />}
          <span className="truncate font-medium">{f.name}</span>
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
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted">
          <span className="text-ink/70">
            {formatShortDate(f.last.startedAt)} · {formatMinutes(f.last.minutes)} —{" "}
          </span>
          {f.last.report}
        </p>
      )}
    </>
  );

  const cls = "block rounded-2xl border border-line bg-surface p-5";
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:border-ink/20`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
