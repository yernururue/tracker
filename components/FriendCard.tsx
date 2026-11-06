"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { DAY_TARGET_MIN, WEEK_TARGET_MIN } from "@/lib/stats";
import { formatClock, formatHours, formatMinutes, formatShortDate } from "@/lib/time";
import { GOAL_STATUS_LABEL, type GoalStatus } from "@/lib/types";
import { Ring } from "./Progress";
import { StudyPhrase } from "./StudyPhrase";

export type FriendCardData = {
  id: string;
  name: string;
  todayMin: number;
  weekMin: number;
  /** ISO time the friend's timer has been running since, null if not running */
  liveSince: string | null;
  liveStartedAt: string | null;
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

function LiveStudyStatus({ since, startedAt, accumulated, serverNow }: { since: string; startedAt: string; accumulated: number; serverNow: string }) {
  const [now, setNow] = useState(() => Date.parse(serverNow));
  useEffect(() => {
    const offset = Date.parse(serverNow) - Date.now();
    const id = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(id);
  }, [serverNow]);
  const elapsed = accumulated + Math.max(0, now - Date.parse(since));

  return (
    <>
      <p className="min-w-0 text-right text-sm leading-relaxed">
        <StudyPhrase sessionKey={startedAt} elapsedMs={elapsed} />
      </p>
      <span className="justify-self-start text-sm font-medium text-ink">
        <span className="sr-only">Current session: </span>
        <span className="tabular-nums">{formatClock(elapsed)}</span>
      </span>
    </>
  );
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

export function FriendCard({ f, me, href, serverNow }: { f: FriendCardData; me: boolean; href?: string; serverNow: string }) {
  const [hovered, setHovered] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [detailsFocused, setDetailsFocused] = useState(false);
  const [open, setOpen] = useState<"goal" | "report" | null>(null);
  // Keeps the last panel's content while it collapses.
  const [shown, setShown] = useState<"goal" | "report">("goal");
  const panelId = useId();
  const detailsId = useId();
  const detailsButton = useRef<HTMLButtonElement>(null);
  const detailsVisible = hovered || manualOpen || detailsFocused;

  const toggleDetails = () => {
    const next = !detailsVisible;
    setManualOpen(next);
    if (!next) {
      setHovered(false);
      setDetailsFocused(false);
    }
  };

  const toggle = (which: "goal" | "report") => {
    setShown(which);
    setOpen(open === which ? null : which);
  };

  return (
    <article
      aria-label={`Study status for ${f.name}`}
      className="overflow-hidden rounded-lg border border-line bg-surface"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !detailsVisible) return;
        event.preventDefault();
        event.stopPropagation();
        setManualOpen(false);
        setHovered(false);
        setDetailsFocused(false);
        detailsButton.current?.focus();
      }}
    >
      <div className="grid grid-cols-2 items-center gap-x-3 gap-y-1 px-4 py-3">
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
          {me && <span className="shrink-0 text-xs text-muted">you</span>}
        </span>
        {f.liveSince ? (
          <LiveStudyStatus since={f.liveSince} startedAt={f.liveStartedAt ?? f.liveSince} accumulated={f.liveAccumulatedMs} serverNow={serverNow} />
        ) : (
          <>
            <p className="text-right text-xs text-muted">{f.liveStartedAt ? "paused" : "not studying"}</p>
            <span className="text-sm text-muted">
              {f.liveStartedAt ? (
                <>
                  <span className="sr-only">Paused session: </span>
                  <span className="tabular-nums">{formatClock(f.liveAccumulatedMs)}</span>
                </>
              ) : (
                <>
                  {formatMinutes(f.todayMin)} <span className="text-xs">today</span>
                </>
              )}
            </span>
          </>
        )}
        <button
          ref={detailsButton}
          type="button"
          onClick={toggleDetails}
          aria-label={`${detailsVisible ? "Hide" : "Show"} study details for ${f.name}`}
          aria-expanded={detailsVisible}
          aria-controls={detailsId}
          className="-mr-1 inline-flex min-h-9 items-center justify-self-end gap-1.5 rounded-md px-2 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          Details
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
            className={`transition-transform duration-200 ${detailsVisible ? "rotate-180" : ""}`}
          >
            <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div
        id={detailsId}
        role="region"
        aria-label={`Study details for ${f.name}`}
        aria-hidden={!detailsVisible}
        inert={!detailsVisible}
        onFocusCapture={() => setDetailsFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDetailsFocused(false);
        }}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${detailsVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-line px-4 pb-4 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <Meter label="Today" minutes={f.todayMin} target={DAY_TARGET_MIN} value={formatMinutes(f.todayMin)} />
              <Meter label="This week" minutes={f.weekMin} target={WEEK_TARGET_MIN} value={`${formatHours(f.weekMin)}h`} />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Toggle active={open === "goal"} disabled={!f.goal} onClick={() => toggle("goal")} controls={panelId}>
                {f.goal ? (
                  <>
                    <span className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[f.goal.status]}`} aria-hidden />
                    <span className="truncate">Weekly goal</span>
                  </>
                ) : (
                  "No goal"
                )}
              </Toggle>
              <Toggle active={open === "report"} disabled={!f.last} onClick={() => toggle("report")} controls={panelId}>
                {f.last ? (
                  <>
                    Report
                  </>
                ) : (
                  "No reports"
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
        </div>
      </div>
    </article>
  );
}
