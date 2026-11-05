"use client";

import { useActionState } from "react";
import { btnSecondary, input } from "@/components/ui";
import { updatePassword, type FormState } from "../../profile-actions";

export function PasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(updatePassword, {} as FormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      {/* Lets password managers save the new password under this email. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className="flex gap-2">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          placeholder="New password"
          aria-label="New password"
          className={input}
        />
        <button type="submit" disabled={pending} className={`${btnSecondary} shrink-0`}>
          {pending ? "…" : "Save"}
        </button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.ok && !pending && <p className="text-sm text-muted">Password saved. Sign in with it next time.</p>}
    </form>
  );
}
