"use client";

import { useActionState, useState, type ReactNode } from "react";
import { btnGhost, btnPrimary, input } from "@/components/ui";
import { sendMagicLink, signInWithPassword, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

export function LoginForm({ notice, initialMode = "password" }: { notice?: ReactNode; initialMode?: "password" | "link" }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, initial);
  const [linkState, linkAction, linkPending] = useActionState(sendMagicLink, initial);

  if (linkState.status === "sent") {
    return (
      <div className="mt-6 rounded-xl bg-live-soft p-4">
        <p className="font-medium text-live-strong">Email sent</p>
        <p className="mt-1 text-sm text-muted">
          Open the link we sent to {linkState.email} in this browser. If it’s not there, check spam.
        </p>
      </div>
    );
  }

  const isLink = mode === "link";
  const state = isLink ? linkState : pwState;
  const pending = isLink ? linkPending : pwPending;

  return (
    <>
      <p className="mt-1.5 text-muted">
        {isLink
          ? "We’ll email you a sign-in link. Use it the first time, or if you forgot your password."
          : "Sign in with your email and password."}
      </p>
      {notice}
      <form action={isLink ? linkAction : pwAction} className="mt-6 flex flex-col gap-3">
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
        {!isLink && (
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Password"
            className={input}
          />
        )}
        {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
        <button type="submit" disabled={pending} className={btnPrimary}>
          {isLink ? (pending ? "Sending…" : "Email me a link") : pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <button type="button" onClick={() => setMode(isLink ? "password" : "link")} className={`${btnGhost} mt-2 w-full`}>
        {isLink ? "Sign in with password" : "First time or forgot password? Get an email link"}
      </button>
    </>
  );
}
