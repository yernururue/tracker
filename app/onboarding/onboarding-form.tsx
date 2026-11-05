"use client";

import { useActionState } from "react";
import { btnPrimary, input } from "@/components/ui";
import { createProfile, type FormState } from "../profile-actions";

export function OnboardingForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(createProfile, {} as FormState);
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      {/* Lets password managers save the new password under this email. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <input
        name="display_name"
        required
        maxLength={40}
        autoComplete="nickname"
        placeholder="Name"
        className={input}
      />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        maxLength={72}
        autoComplete="new-password"
        placeholder="Password, 8+ characters"
        className={input}
      />
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
