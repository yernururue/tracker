"use client";

import { useActionState } from "react";
import { btnPrimary, input, label } from "@/components/ui";
import { updateProfile, type FormState } from "../profile-actions";

export function SettingsForm({ name, goal }: { name: string; goal: number }) {
  const [state, action, pending] = useActionState(updateProfile, {} as FormState);
  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-2">
        <span className={label}>Имя</span>
        <input name="display_name" defaultValue={name} required maxLength={40} className={input} />
      </label>
      <label className="flex flex-col gap-2">
        <span className={label}>Дневная цель, минут</span>
        <input
          name="daily_goal_minutes"
          type="number"
          inputMode="numeric"
          min={1}
          max={960}
          step={1}
          defaultValue={goal}
          required
          className={`${input} font-mono`}
        />
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.ok && !pending && <p className="text-sm text-muted">Сохранено</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} self-start`}>
        {pending ? "Сохраняю…" : "Сохранить"}
      </button>
    </form>
  );
}
