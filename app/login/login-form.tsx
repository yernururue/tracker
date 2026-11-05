"use client";

import { useActionState } from "react";
import { btnPrimary, input } from "@/components/ui";
import { sendMagicLink, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

export function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  if (state.status === "sent") {
    return (
      <div className="mt-6 rounded-xl bg-live-soft p-4">
        <p className="font-medium text-live-strong">Email sent</p>
        <p className="mt-1 text-sm text-muted">
          Open the link we sent to {state.email}. If it’s not there, check spam.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <input
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        defaultValue={state.email}
        className={input}
      />
      {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Sending…" : "Get link"}
      </button>
    </form>
  );
}
