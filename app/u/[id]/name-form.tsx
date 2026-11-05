"use client";

import { useActionState } from "react";
import { btnSecondary, input } from "@/components/ui";
import { updateProfile, type FormState } from "../../profile-actions";

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateProfile, {} as FormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          name="display_name"
          defaultValue={name}
          required
          maxLength={40}
          aria-label="Имя"
          className={input}
        />
        <button type="submit" disabled={pending} className={`${btnSecondary} shrink-0`}>
          {pending ? "…" : "Сохранить"}
        </button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.ok && !pending && <p className="text-sm text-muted">Сохранено</p>}
    </form>
  );
}
