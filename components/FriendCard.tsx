"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { DAY_TARGET_MIN, WEEK_TARGET_MIN } from "@/lib/stats";
import { formatClock, formatHours, formatMinutes, formatShortDate } from "@/lib/time";
import { GOAL_STATUS_LABEL, type GoalStatus } from "@/lib/types";
import { Ring } from "./Progress";

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

const STATUS_DOT: Record<GoalStatus, string> = {
  pending: "bg-accent",
  done: "bg-live",
  partial: "bg-warn",
  missed: "bg-danger",
};

const STATUS_TEXT: Record<GoalStatus, string> = {
  pending: "text-accent",
  done: "text-live-strong",
  partial: "text-warn",
  missed: "text-danger",
};

function LiveClock({ since, accumulated }: { since: string; accumulated: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="tabular-nums">{formatClock(accumulated + Math.max(0, now - Date.parse(since)))}</span>;
}

function Meter({ label, minutes, target, value }: { label: string; minutes: number; target: number; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-surface-2 p-2 ring-1 ring-inset ring-line/70 sm:gap-2.5 sm:p-2.5">
      <Ring value={target ? minutes / target : 0} size={40} />
      <div className="min-w-0">
        <div className="text-xs text-muted">{label}</div>
        <div className="truncate text-[13px] font-semibold sm:text-sm">{value}</div>
      </div>
    </div>
  );
}

function Toggle({
  active,
  disabled,
  onClick,
  controls,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  controls: string;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="flex items-center rounded-lg border border-dashed border-line-strong px-3 py-1.5 text-sm text-muted">
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      aria-controls={controls}
      className={`flex min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        active ? "border-accent/25 bg-accent-soft text-accent" : "border-line-strong bg-surface hover:bg-surface-2"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">{children}</span>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        aria-hidden
        className={`shrink-0 text-muted transition-transform duration-200 ${active ? "rotate-180" : ""}`}
      >
        <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function FriendCard({ f, me, href }: { f: FriendCardData; me: boolean; href?: string }) {
  const [open, setOpen] = useState<"goal" | "report" | null>(null);
  // Keeps the last panel's content while it collapses.
  const [shown, setShown] = useState<"goal" | "report">("goal");
  const panelId = useId();

  const toggle = (which: "goal" | "report") => {
    setShown(which);
    setOpen(open === which ? null : which);
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
              me ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted ring-1 ring-line"
            }`}
            aria-hidden
          >
            {f.name.trim().charAt(0).toUpperCase()}
          </span>
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
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live-soft px-2.5 py-1 text-xs font-medium text-live-strong">
            <span className="size-1.5 rounded-full bg-live" aria-hidden />
            <LiveClock since={f.liveSince} accumulated={f.liveAccumulatedMs} />
          </span>
        ) : (
          <span className="shrink-0 text-xs text-muted">не учится</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Meter label="Сегодня" minutes={f.todayMin} target={DAY_TARGET_MIN} value={formatMinutes(f.todayMin)} />
        <Meter label="Неделя" minutes={f.weekMin} target={WEEK_TARGET_MIN} value={`${formatHours(f.weekMin)} ч`} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Toggle active={open === "goal"} disabled={!f.goal} onClick={() => toggle("goal")} controls={panelId}>
          {f.goal ? (
            <>
              <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[f.goal.status]}`} aria-hidden />
              <span className="truncate">Цель недели</span>
            </>
          ) : (
            "Цели нет"
          )}
        </Toggle>
        <Toggle active={open === "report"} disabled={!f.last} onClick={() => toggle("report")} controls={panelId}>
          {f.last ? (
            <>
              Репорт
            </>
          ) : (
            "Репортов нет"
          )}
        </Toggle>
      </div>

      <div
        id={panelId}
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="mt-3 rounded-xl bg-surface-2 px-4 py-3 text-sm leading-relaxed ring-1 ring-inset ring-line/70">
            {shown === "goal" && f.goal && (
              <>
                <p className={`mb-1 text-xs font-medium ${STATUS_TEXT[f.goal.status]}`}>{GOAL_STATUS_LABEL[f.goal.status]}</p>
                <p className="whitespace-pre-wrap break-words">{f.goal.text}</p>
              </>
            )}
            {shown === "report" && f.last && (
              <>
                <p className="mb-1 text-xs text-muted">
                  {formatShortDate(f.last.startedAt)} · {formatMinutes(f.last.minutes)}
                </p>
                <p className="whitespace-pre-wrap break-words">{f.last.report}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
