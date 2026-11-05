"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatClock } from "@/lib/time";
import type { ActiveTimer, TimerRpcResult } from "@/lib/types";
import { btnGhost, btnPrimary, btnSecondary, card, input, label } from "./ui";

const EIGHT_HOURS = 8 * 60 * 60 * 1000;
const MIN_REPORT = 10;

type Mode = "timer" | "report" | "confirm-discard";

function elapsedMs(timer: ActiveTimer | null, nowMs: number): number {
  if (!timer) return 0;
  const running = timer.running_since ? Math.max(0, nowMs - Date.parse(timer.running_since)) : 0;
  return Number(timer.accumulated_ms) + running;
}

export function Timer({ initialTimer, serverNow }: { initialTimer: ActiveTimer | null; serverNow: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [timer, setTimer] = useState(initialTimer);
  // Server clock minus client clock, so all devices show the same elapsed time.
  const [offset, setOffset] = useState(() => Date.parse(serverNow) - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);
  const [mode, setMode] = useState<Mode>("timer");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [minutes, setMinutes] = useState("");
  const [report, setReport] = useState("");

  // Pick up changes made on another device after router.refresh().
  const [prevServerNow, setPrevServerNow] = useState(serverNow);
  if (serverNow !== prevServerNow) {
    setPrevServerNow(serverNow);
    setTimer(initialTimer);
  }

  const running = Boolean(timer?.running_since);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(id);
  }, [running, offset]);

  const elapsed = elapsedMs(timer, now);

  useEffect(() => {
    const base = "Учёба";
    document.title = running ? `${formatClock(elapsed)} · ${base}` : base;
  }, [running, elapsed]);

  async function call(fn: "start_timer" | "pause_timer" | "resume_timer" | "discard_timer") {
    const { data, error } = await supabase.rpc(fn);
    if (error) throw error;
    const res = data as TimerRpcResult;
    setOffset(Date.parse(res.now) - Date.now());
    setTimer(res.timer);
    return res;
  }

  function run(task: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await task();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Что-то пошло не так. Попробуй ещё раз.");
      }
    });
  }

  const onStart = () => run(async () => { await call("start_timer"); router.refresh(); });
  const onPause = () => run(async () => { await call("pause_timer"); router.refresh(); });
  const onResume = () => run(async () => { await call("resume_timer"); router.refresh(); });

  const onFinish = () =>
    run(async () => {
      const res = await call("pause_timer");
      const ms = elapsedMs(res.timer, Date.parse(res.now));
      setMinutes(String(Math.min(960, Math.max(1, Math.round(ms / 60000)))));
      setMode("report");
      router.refresh();
    });

  const onDiscard = () =>
    run(async () => {
      await call("discard_timer");
      setMode("timer");
      setReport("");
      router.refresh();
    });

  const minutesNum = Number(minutes);
  const minutesValid = Number.isInteger(minutesNum) && minutesNum >= 1 && minutesNum <= 960;
  const reportValid = report.trim().length >= MIN_REPORT;

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!minutesValid || !reportValid) return;
    run(async () => {
      const { error } = await supabase.rpc("finish_session", {
        p_minutes: minutesNum,
        p_report: report.trim(),
      });
      if (error) throw error;
      setTimer(null);
      setReport("");
      setMode("timer");
      router.refresh();
    });
  };

  const state = !timer ? "idle" : running ? "running" : "paused";
  const stateLabel = { idle: "Не запущен", running: "Идёт", paused: "Пауза" }[state];

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <span className={label}>Таймер</span>
        <span className="flex items-center gap-2 text-sm text-muted">
          {state === "running" && <span className="size-2 rounded-full bg-live" aria-hidden />}
          {mode === "report" ? "Отчёт" : stateLabel}
        </span>
      </div>

      <p
        className={`mt-6 text-center font-mono text-5xl font-medium tabular-nums tracking-tight sm:text-7xl ${
          state === "idle" ? "text-muted" : ""
        }`}
        aria-live="off"
      >
        {formatClock(elapsed)}
      </p>

      {mode === "report" ? (
        <form onSubmit={onSave} className="mt-8 flex flex-col gap-5">
          {elapsed > EIGHT_HOURS && (
            <p className="rounded-xl border border-danger/30 px-4 py-3 text-sm text-danger">
              Похоже, таймер забыли выключить — поправь минуты
            </p>
          )}
          <label className="flex flex-col gap-2">
            <span className={label}>Минут</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={960}
              step={1}
              required
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className={`${input} font-mono`}
            />
            {!minutesValid && minutes !== "" && (
              <span className="text-sm text-danger">От 1 до 960 минут</span>
            )}
          </label>
          <label className="flex flex-col gap-2">
            <span className={label}>Что сделал</span>
            <textarea
              required
              rows={5}
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="Что конкретно сделал? Задачи, ссылки, что не получилось"
              className={`${input} resize-y leading-relaxed`}
            />
            <span className={`text-xs ${reportValid ? "text-muted" : "text-muted/80"}`}>
              {reportValid ? " " : `Минимум ${MIN_REPORT} символов, сейчас ${report.trim().length}`}
            </span>
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={pending || !minutesValid || !reportValid} className={btnPrimary}>
              {pending ? "Сохраняю…" : "Сохранить"}
            </button>
            <button type="button" disabled={pending} onClick={() => setMode("timer")} className={btnSecondary}>
              Вернуться к таймеру
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {state === "idle" && (
              <button onClick={onStart} disabled={pending} className={`${btnPrimary} sm:min-w-44`}>
                Начать
              </button>
            )}
            {state === "running" && (
              <button onClick={onPause} disabled={pending} className={`${btnSecondary} sm:min-w-40`}>
                Пауза
              </button>
            )}
            {state === "paused" && (
              <button onClick={onResume} disabled={pending} className={`${btnSecondary} sm:min-w-40`}>
                Продолжить
              </button>
            )}
            {state !== "idle" && (
              <button onClick={onFinish} disabled={pending} className={`${btnPrimary} sm:min-w-40`}>
                Завершить
              </button>
            )}
          </div>

          {error && <p className="mt-4 text-center text-sm text-danger">{error}</p>}

          {state !== "idle" && (
            <div className="mt-6 flex justify-center">
              {mode === "confirm-discard" ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <p className="text-sm text-muted">Сбросить сессию? Время не сохранится.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={onDiscard}
                      disabled={pending}
                      className="rounded-lg border border-danger/40 px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
                    >
                      Да, сбросить
                    </button>
                    <button onClick={() => setMode("timer")} disabled={pending} className={btnGhost}>
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setMode("confirm-discard")} disabled={pending} className={btnGhost}>
                  Сбросить сессию
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
