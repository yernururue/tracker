"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GOAL_STATUS_LABEL, type GoalStatus, type WeeklyGoal as Goal } from "@/lib/types";
import { SECTION_GOALS, useInstructions } from "./Instructions";
import { btnGhost, btnPrimary, card, input, label } from "./ui";

const STATUSES: GoalStatus[] = ["pending", "done", "partial", "missed"];
const STATUS_ACTIVE: Record<GoalStatus, string> = {
  pending: "bg-surface text-ink",
  done: "bg-live-soft text-live-strong",
  partial: "bg-accent-soft text-accent-hover",
  missed: "bg-[#fbe3df] text-[#9b3a2e]",
};

export function WeeklyGoal({ goal: initial, userId, weekStart }: { goal: Goal | null; userId: string; weekStart: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const instructions = useInstructions();
  const [goal, setGoal] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial?.goal_text ?? "");
  const [error, setError] = useState<string | null>(null);

  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    if (!editing) setGoal(initial);
  }

  async function saveText(e: React.FormEvent) {
    e.preventDefault();
    const goalText = text.trim();
    if (!goalText) return;
    setError(null);
    const prev = goal;
    const now = new Date().toISOString();
    setGoal({
      id: goal?.id ?? "local",
      user_id: userId,
      week_start: weekStart,
      goal_text: goalText,
      status: goal?.status ?? "pending",
      created_at: goal?.created_at ?? now,
      updated_at: now,
    });
    setEditing(false);
    const { error } = await supabase
      .from("weekly_goals")
      .upsert({ user_id: userId, week_start: weekStart, goal_text: goalText }, { onConflict: "user_id,week_start" });
    if (error) {
      setGoal(prev);
      setEditing(true);
      setError(`Не удалось сохранить: ${error.message}`);
      return;
    }
    router.refresh();
  }

  async function setStatus(status: GoalStatus) {
    if (!goal || goal.status === status) return;
    setError(null);
    const prev = goal;
    setGoal({ ...goal, status });
    const { error } = await supabase
      .from("weekly_goals")
      .update({ status })
      .eq("user_id", userId)
      .eq("week_start", weekStart);
    if (error) {
      setGoal(prev);
      setError(`Не удалось сохранить: ${error.message}`);
      return;
    }
    router.refresh();
  }

  const showForm = !goal || editing;

  return (
    <section className={card}>
      <div className="flex items-center justify-between gap-3">
        <span className={label}>Цель недели</span>
        {goal && !editing && (
          <button
            onClick={() => {
              setText(goal.goal_text);
              setEditing(true);
            }}
            className={`${btnGhost} -my-2 -mr-3`}
          >
            Изменить
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={saveText} className="mt-4 flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={2}
            required
            placeholder="К воскресенью я…"
            aria-label="Цель недели"
            className={`${input} resize-none leading-relaxed`}
          />
          <p className="text-sm text-muted">
            Цель, которую можно проверить артефактом: код, задачи, ссылка.{" "}
            <button
              type="button"
              onClick={() => instructions.open(SECTION_GOALS)}
              className="underline decoration-line underline-offset-4 hover:text-ink"
            >
              Как поставить хорошую цель
            </button>
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={!text.trim()} className={`${btnPrimary} h-10 px-5 text-sm`}>
              Сохранить
            </button>
            {editing && (
              <button type="button" onClick={() => setEditing(false)} className={btnGhost}>
                Отмена
              </button>
            )}
          </div>
        </form>
      ) : (
        goal && (
          <>
            <p className="mt-3 whitespace-pre-wrap break-words leading-relaxed">{goal.goal_text}</p>
            <div
              className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-inset ring-line"
              role="radiogroup"
              aria-label="Статус цели"
            >
              {STATUSES.map((s) => (
                <button
                  key={s}
                  role="radio"
                  aria-checked={goal.status === s}
                  onClick={() => setStatus(s)}
                  className={`rounded-lg px-2 py-2 text-sm transition-colors ${
                    goal.status === s ? `font-medium shadow-card ${STATUS_ACTIVE[s]}` : "text-muted hover:bg-surface/70 hover:text-ink"
                  }`}
                >
                  {GOAL_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </>
        )
      )}
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
