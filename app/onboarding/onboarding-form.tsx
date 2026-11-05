"use client";

import { useActionState } from "react";
import { btnPrimary, input } from "@/components/ui";
import { createProfile, type FormState } from "../profile-actions";

export function OnboardingForm() {
  const [state, action, pending] = useActionState(createProfile, {} as FormState);
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <input
        name="display_name"
        required
        maxLength={40}
        autoComplete="nickname"
        placeholder="Имя"
        className={input}
      />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Сохраняю…" : "Продолжить"}
      </button>
    </form>
  );
}
