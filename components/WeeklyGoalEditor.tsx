"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { GOAL_STATUS_LABEL, type GoalStatus, type WeeklyGoal as Goal } from "@/lib/types";
import { SECTION_GOALS, useInstructions } from "./Instructions";
import { btnGhost, card, input, label } from "./ui";

export type GoalPatch = Partial<Pick<Goal, "goal_text" | "status">>;

type Draft = { id: string | null; text: string };
type Change =
  | { kind: "save" }
  | { kind: "status"; id: string; status: GoalStatus }
  | { kind: "delete"; id: string };

const STATUS_COLOR: Record<GoalStatus, string> = {
  pending: "text-muted",
  done: "text-live-strong",
  partial: "text-warn",
  missed: "text-danger-strong",
};

const ICON_PATH = {
  plus: "M8 3v10M3 8h10",
  edit: "m3 11-.5 2.5L5 13l7.7-7.7-2-2L3 11Zm6.5-6.5 2 2",
  done: "m3.5 8 3 3L13 4.5",
  missed: "m4.5 4.5 7 7m0-7-7 7",
  delete: "M2.5 4.5h11m-7.5 0V2.75h4V4.5m-6 0 .5 8.75h7l.5-8.75M6.5 7v3.75M9.5 7v3.75",
};

const iconButton = "inline-grid size-8 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-40";
const row = "min-w-0 rounded-lg border border-line bg-surface-2 p-3";

function Icon({ name }: { name: keyof typeof ICON_PATH }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" width="16" height="16" className="shrink-0">
      <path d={ICON_PATH[name]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WeeklyGoalEditor({
  goals: initial,
  onCreate,
  onUpdate,
  onDelete,
}: {
  goals: Goal[];
  onCreate: (text: string) => Promise<Goal>;
  onUpdate: (id: string, patch: GoalPatch) => Promise<Goal>;
  onDelete: (id: string) => Promise<void>;
}) {
  const instructions = useInstructions();
  const idPrefix = useId();
  const [previousInitial, setPreviousInitial] = useState(initial);
  const [goals, setGoals] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [change, setChange] = useState<Change | null>(null);
  const [error, setError] = useState<string | null>(null);
  const writing = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const focusAfter = useRef<string | null>(null);
  const addId = `${idPrefix}-add`;
  const editId = (id: string) => `${idPrefix}-edit-${id}`;
  const statusId = (id: string, status: "done" | "missed") => `${idPrefix}-${status}-${id}`;

  if (initial !== previousInitial) {
    setPreviousInitial(initial);
    setGoals(initial);
  }

  const draftTarget = draft ? draft.id ?? "new" : null;
  const busy = change !== null;
  const disableRowActions = busy || draft !== null;

  useEffect(() => {
    if (draftTarget !== null) textarea.current?.focus();
  }, [draftTarget]);

  useEffect(() => {
    if (busy || draftTarget !== null || !focusAfter.current) return;
    const target = document.getElementById(focusAfter.current) ?? document.getElementById(addId);
    focusAfter.current = null;
    target?.focus();
  }, [addId, busy, draftTarget, goals]);

  // Keep optimistic changes separate so a failed write shows the latest server list again.
  const visibleGoals = change?.kind === "delete"
    ? goals.filter((goal) => goal.id !== change.id)
    : change?.kind === "status"
      ? goals.map((goal) => goal.id === change.id ? { ...goal, status: change.status } : goal)
      : goals;

  function storeGoal(goal: Goal) {
    setGoals((current) => current.some((item) => item.id === goal.id)
      ? current.map((item) => item.id === goal.id ? goal : item)
      : [...current, goal]);
  }

  async function write(optimistic: Change, operation: () => Promise<void>, failure: string) {
    if (writing.current) return;
    writing.current = true;
    setChange(optimistic);
    setError(null);
    try {
      await operation();
    } catch {
      setError(failure);
      if (optimistic.kind === "save") textarea.current?.focus();
    } finally {
      writing.current = false;
      setChange(null);
    }
  }

  function openEditor(goal?: Goal) {
    if (disableRowActions || writing.current) return;
    setError(null);
    setDraft({ id: goal?.id ?? null, text: goal?.goal_text ?? "" });
  }

  function closeEditor() {
    focusAfter.current = draft?.id ? editId(draft.id) : addId;
    setDraft(null);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft?.text.trim();
    if (!draft || !text || text.length > 500) return;
    const id = draft.id;
    void write({ kind: "save" }, async () => {
      const saved = id ? await onUpdate(id, { goal_text: text }) : await onCreate(text);
      storeGoal(saved);
      closeEditor();
    }, id ? "Couldn’t save the goal. Try again." : "Couldn’t add the goal. Try again.");
  }

  function toggleStatus(goal: Goal, status: "done" | "missed") {
    const next = goal.status === status ? "pending" : status;
    focusAfter.current = statusId(goal.id, status);
    void write({ kind: "status", id: goal.id, status: next }, async () => {
      storeGoal(await onUpdate(goal.id, { status: next }));
    }, "Couldn’t update the goal. Try again.");
  }

  function remove(goal: Goal, index: number) {
    const neighbor = visibleGoals[index + 1] ?? visibleGoals[index - 1];
    focusAfter.current = neighbor ? editId(neighbor.id) : addId;
    void write({ kind: "delete", id: goal.id }, async () => {
      await onDelete(goal.id);
      setGoals((current) => current.filter((item) => item.id !== goal.id));
    }, "Couldn’t delete the goal. Try again.");
  }

  function editor(number: number) {
    return (
      <form onSubmit={save} className="space-y-2">
        <label htmlFor={`${idPrefix}-text`} className={label}>{draft?.id ? `Edit goal ${number}` : `Goal ${number}`}</label>
        <textarea
          id={`${idPrefix}-text`}
          ref={textarea}
          value={draft?.text ?? ""}
          onChange={(event) => {
            const text = event.currentTarget.value;
            setDraft((current) => current ? { ...current, text } : null);
          }}
          rows={2}
          maxLength={500}
          required
          readOnly={busy}
          placeholder="By Sunday I will…"
          className={`${input} block resize-y leading-relaxed`}
        />
        <button type="button" onClick={() => instructions.open(SECTION_GOALS)} className="text-left text-xs text-muted underline decoration-line underline-offset-4 hover:text-ink">
          How to set a good goal
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={busy || !draft?.text.trim()} className="inline-flex min-h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-45">
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" disabled={busy} onClick={() => { setError(null); closeEditor(); }} className={btnGhost}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const draftHasRow = draft?.id != null && visibleGoals.some((goal) => goal.id === draft.id);

  return (
    <section className={card} aria-labelledby={`${idPrefix}-heading`}>
      <div className="flex items-center justify-between gap-2">
        <h2 id={`${idPrefix}-heading`} className={label}>Weekly goals</h2>
        <button id={addId} type="button" disabled={disableRowActions} onClick={() => openEditor()} className={`${btnGhost} -my-2 -mr-2 min-h-9 shrink-0 gap-1.5`}>
          <Icon name="plus" />
          Add goal
        </button>
      </div>

      {visibleGoals.length === 0 && !draft && <p className="mt-3 text-sm text-muted">No goals this week.</p>}
      {(visibleGoals.length > 0 || draft) && (
        <ol role="list" className="mt-4 space-y-2">
          {visibleGoals.map((goal, index) => {
            const number = index + 1;
            const done = goal.status === "done";
            const missed = goal.status === "missed";
            return (
              <li className={row} key={goal.id}>
                {draft?.id === goal.id ? editor(number) : (
                  <>
                    <div className="flex min-w-0 items-start gap-2">
                      <span aria-hidden="true" className="shrink-0 text-sm leading-relaxed tabular-nums text-muted">{number}.</span>
                      <p className={`min-w-0 flex-1 whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed ${done ? "text-muted line-through" : ""}`}>{goal.goal_text}</p>
                      <button id={editId(goal.id)} type="button" className={`${iconButton} -mt-1 -mr-1 text-muted hover:bg-surface hover:text-ink`} disabled={disableRowActions} onClick={() => openEditor(goal)} aria-label={`Edit goal ${number}`} title="Edit goal">
                        <Icon name="edit" />
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2">
                      <span className={`text-xs ${STATUS_COLOR[goal.status]}`}>{GOAL_STATUS_LABEL[goal.status]}</span>
                      <div className="ml-auto flex items-center gap-1">
                        <button id={statusId(goal.id, "done")} type="button" disabled={disableRowActions} onClick={() => toggleStatus(goal, "done")} aria-pressed={done} aria-label={`Mark goal ${number} done`} title={done ? "Undo done" : "Mark done"} className={`${iconButton} ${done ? "bg-live-soft text-live-strong" : "text-muted hover:bg-surface hover:text-live-strong"}`}>
                          <Icon name="done" />
                        </button>
                        <button id={statusId(goal.id, "missed")} type="button" disabled={disableRowActions} onClick={() => toggleStatus(goal, "missed")} aria-pressed={missed} aria-label={`Mark goal ${number} missed`} title={missed ? "Undo missed" : "Mark missed"} className={`${iconButton} ${missed ? "bg-danger-soft text-danger-strong" : "text-muted hover:bg-surface hover:text-danger-strong"}`}>
                          <Icon name="missed" />
                        </button>
                        <button type="button" disabled={disableRowActions} onClick={() => remove(goal, index)} aria-label={`Delete goal ${number}`} title="Delete goal" className={`${iconButton} text-muted hover:bg-danger-soft hover:text-danger-strong`}>
                          <Icon name="delete" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            );
          })}
          {draft && !draftHasRow && <li className={row}>{editor(visibleGoals.length + 1)}</li>}
        </ol>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
