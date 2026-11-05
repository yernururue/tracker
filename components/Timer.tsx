"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatClock } from "@/lib/time";
import type { ActiveTimer, TimerRpcResult } from "@/lib/types";
import { SECTION_REPORT, useInstructions } from "./Instructions";
import { Modal } from "./Modal";
import { btnGhost, btnPrimary, btnSecondary, card, input, label } from "./ui";

const EIGHT_HOURS = 8 * 60 * 60 * 1000;
const MIN_REPORT = 10;
const DRAFT_KEY = "report-draft";

const QUESTIONS = [
  "Что конкретно сделал? Задачи, ссылки, коммиты.",
  "Где застрял и как разобрался? Что не получилось?",
  "Какую одну новую вещь можешь объяснить своими словами?",
  "Что делаешь дальше?",
];
const QUESTION_HEADINGS = ["Сделал:", "Застрял:", "Понял:", "Дальше:"];

function readDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
}
function writeDraft(text: string) {
  try {
    if (text) localStorage.setItem(DRAFT_KEY, text);
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // storage unavailable (private mode): draft just isn't kept
  }
}

type Mode = "timer" | "report" | "confirm-discard" | "report-confirm-discard";
type Rpc = "start_timer" | "pause_timer" | "resume_timer" | "discard_timer";

function elapsedMs(timer: ActiveTimer | null, nowMs: number): number {
  if (!timer) return 0;
  const running = timer.running_since ? Math.max(0, nowMs - Date.parse(timer.running_since)) : 0;
  return Number(timer.accumulated_ms) + running;
}

/**
 * The UI updates instantly (optimistic) and the change is synced to the
 * database in the background, one request at a time, in click order.
 * The database (active_timers) stays the source of truth across devices.
 */
export function Timer({ initialTimer, serverNow }: { initialTimer: ActiveTimer | null; serverNow: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [timer, setTimer] = useState(initialTimer);
  // Server clock minus client clock, so all devices show the same elapsed time.
  const [offset, setOffset] = useState(() => Date.parse(serverNow) - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);
  const [mode, setMode] = useState<Mode>("timer");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [saving, setSaving] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const inFlight = useRef(0);

  const [minutes, setMinutes] = useState("");
  const [report, setReportState] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const instructions = useInstructions();

  const setReport = (text: string) => {
    setReportState(text);
    writeDraft(text);
  };

  // Auto-grow the report textarea.
  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 160)}px`;
  }, [report, mode]);

  // Pick up changes from other devices on refresh, unless our own writes are in flight.
  const [prevServerNow, setPrevServerNow] = useState(serverNow);
  if (serverNow !== prevServerNow) {
    setPrevServerNow(serverNow);
    if (pending === 0 && !saving) setTimer(initialTimer);
  }

  const running = Boolean(timer?.running_since);
  useEffect(() => {
    if (!running) return;
    const tick = () => setNow(Date.now() + offset);
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, offset]);

  const elapsed = elapsedMs(timer, running ? now : 0);

  useEffect(() => {
    document.title = running ? `${formatClock(elapsed)} · Учёба` : "Учёба";
  }, [running, elapsed]);

  const nowIso = () => new Date(Date.now() + offset).toISOString();

  function sync(fn: Rpc) {
    setPending((n) => n + 1);
    inFlight.current += 1;
    queue.current = queue.current.then(async () => {
      const { data, error } = await supabase.rpc(fn);
      inFlight.current -= 1;
      setPending((n) => n - 1);
      if (error) {
        setError("Не удалось синхронизировать. Обновляю состояние…");
        router.refresh();
        return;
      }
      const res = data as TimerRpcResult;
      setOffset(Date.parse(res.now) - Date.now());
      // Once the queue is drained, adopt the database state (e.g. a timer started elsewhere).
      if (inFlight.current === 0) setTimer((cur) => (cur === null && fn !== "discard_timer" ? cur : res.timer));
    });
  }

  function start() {
    setError(null);
    const t = nowIso();
    setNow(Date.parse(t));
    setTimer({ user_id: "", started_at: t, accumulated_ms: 0, running_since: t });
    sync("start_timer");
  }

  function pauseLocal(): ActiveTimer | null {
    if (!timer?.running_since) return timer;
    const nowMs = Date.now() + offset;
    const paused = { ...timer, accumulated_ms: elapsedMs(timer, nowMs), running_since: null };
    setTimer(paused);
    return paused;
  }

  function pause() {
    setError(null);
    pauseLocal();
    sync("pause_timer");
  }

  function resume() {
    if (!timer) return;
    setError(null);
    const t = nowIso();
    setNow(Date.parse(t));
    setTimer({ ...timer, running_since: t });
    sync("resume_timer");
  }

  function finish() {
    setError(null);
    const wasRunning = running;
    const paused = pauseLocal();
    if (wasRunning) sync("pause_timer");
    const ms = elapsedMs(paused, 0);
    setMinutes(String(Math.min(960, Math.max(1, Math.round(ms / 60000)))));
    setReportState(readDraft());
    setMode("report");
  }

  function insertQuestions() {
    const block = QUESTION_HEADINGS.join("\n\n") + "\n";
    setReport(report.trim() ? `${report.trimEnd()}\n\n${block}` : block);
    textarea.current?.focus();
  }

  function discard() {
    setError(null);
    setTimer(null);
    setMode("timer");
    setReport("");
    sync("discard_timer");
  }

  const minutesNum = Number(minutes);
  const minutesValid = Number.isInteger(minutesNum) && minutesNum >= 1 && minutesNum <= 960;
  const reportValid = report.trim().length >= MIN_REPORT;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!minutesValid || !reportValid || saving) return;
    setError(null);
    setSaving(true);
    const text = report.trim();
    const prevTimer = timer;
    // Optimistic: clear right away, restore the form if saving fails.
    setTimer(null);
    setMode("timer");
    inFlight.current += 1;
    queue.current = queue.current.then(async () => {
      const { error } = await supabase.rpc("finish_session", { p_minutes: minutesNum, p_report: text });
      inFlight.current -= 1;
      setSaving(false);
      if (error) {
        setTimer(prevTimer);
        setMode("report");
        setError(`Не удалось сохранить: ${error.message}`);
        return;
      }
      setReport("");
      router.refresh();
    });
  }

  const inReport = mode === "report" || mode === "report-confirm-discard";

  const state = !timer ? "idle" : running ? "running" : "paused";
  const stateLabel = { idle: "Готов", running: "Идёт", paused: "Пауза" }[state];

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <span className={label}>Таймер</span>
        <span className="flex items-center gap-2 text-sm text-muted">
          {state === "running" && <span className="size-2 rounded-full bg-live" aria-hidden />}
          {saving ? "Сохраняю…" : inReport ? "Отчёт" : stateLabel}
        </span>
      </div>

      <p
        className={`mt-8 text-center font-mono text-5xl font-medium tabular-nums tracking-tight sm:text-6xl ${
          state === "idle" ? "text-muted/60" : ""
        }`}
      >
        {formatClock(elapsed)}
      </p>

      <div className="mt-8 flex gap-3">
        {state === "idle" && (
          <button onClick={start} className={`${btnPrimary} flex-1`}>
            Начать
          </button>
        )}
        {state === "running" && (
          <button onClick={pause} className={`${btnSecondary} flex-1`}>
            Пауза
          </button>
        )}
        {state === "paused" && (
          <button onClick={resume} className={`${btnSecondary} flex-1`}>
            Продолжить
          </button>
        )}
        {state !== "idle" && (
          <button onClick={finish} className={`${btnPrimary} flex-1`}>
            Завершить
          </button>
        )}
      </div>

      {error && !inReport && <p className="mt-4 text-center text-sm text-danger">{error}</p>}

      {state !== "idle" && (
        <div className="mt-4 flex justify-center">
          {mode === "confirm-discard" ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Время не сохранится.</span>
              <button
                onClick={discard}
                className="rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
              >
                Удалить
              </button>
              <button onClick={() => setMode("timer")} className={btnGhost}>
                Отмена
              </button>
            </div>
          ) : (
            <button onClick={() => setMode("confirm-discard")} className={btnGhost}>
              Удалить сессию
            </button>
          )}
        </div>
      )}

      <Modal open={inReport} onClose={() => setMode("timer")} title="Репорт">
        <form onSubmit={save} className="flex flex-col gap-5">
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
              className={`${input} max-w-36 font-mono`}
            />
            {!minutesValid && minutes !== "" && <span className="text-sm text-danger">От 1 до 960 минут</span>}
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className={label}>Что сделал</span>
              <button
                type="button"
                onClick={() => instructions.open(SECTION_REPORT)}
                className="text-sm text-muted underline decoration-line underline-offset-4 hover:text-ink"
              >
                Как писать репорт
              </button>
            </div>
            <ol className="list-decimal space-y-0.5 pl-5 text-sm leading-relaxed text-muted">
              {QUESTIONS.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
            <textarea
              ref={textarea}
              required
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="Что конкретно сделал? Задачи, ссылки, что не получилось"
              aria-label="Репорт"
              className={`${input} mt-1 resize-none overflow-hidden leading-relaxed`}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted">
                {reportValid ? "" : `Минимум ${MIN_REPORT} символов, сейчас ${report.trim().length}`}
              </span>
              <button type="button" onClick={insertQuestions} className={btnGhost}>
                Вставить вопросы в текст
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={!minutesValid || !reportValid} className={`${btnPrimary} sm:flex-1`}>
              Сохранить
            </button>
            <button type="button" onClick={() => setMode("timer")} className={`${btnSecondary} sm:flex-1`}>
              Вернуться к таймеру
            </button>
          </div>

          <div className="flex justify-center">
            {mode === "report-confirm-discard" ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Сессия и текст удалятся.</span>
                <button
                  type="button"
                  onClick={discard}
                  className="rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
                >
                  Удалить
                </button>
                <button type="button" onClick={() => setMode("report")} className={btnGhost}>
                  Отмена
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setMode("report-confirm-discard")} className={btnGhost}>
                Удалить сессию
              </button>
            )}
          </div>
        </form>
      </Modal>
    </section>
  );
}
