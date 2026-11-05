"use client";

import { useActionState, useState, type ReactNode } from "react";
import { btnGhost, btnPrimary, input } from "@/components/ui";
import { sendMagicLink, signInWithPassword, signUp, type LoginState } from "./actions";

type Mode = "signin" | "signup" | "link";

const initial: LoginState = { status: "idle" };

const COPY: Record<Mode, { intro: string; submit: string; pending: string }> = {
  signin: { intro: "Sign in with your email and password.", submit: "Sign in", pending: "Signing in…" },
  signup: {
    intro: "Create an account with your email and a password. The email must be on the member list.",
    submit: "Create account",
    pending: "Creating…",
  },
  link: { intro: "Forgot your password? We’ll email you a sign-in link.", submit: "Email me a link", pending: "Sending…" },
};

export function LoginForm({ notice, initialMode = "signin" }: { notice?: ReactNode; initialMode?: Mode }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const forms = {
    signin: useActionState(signInWithPassword, initial),
    signup: useActionState(signUp, initial),
    link: useActionState(sendMagicLink, initial),
  };
  const [state, action, pending] = forms[mode];

  if (state.status === "sent") {
    return (
      <div className="mt-6 rounded-xl bg-live-soft p-4">
        <p className="font-medium text-live-strong">Email sent</p>
        <p className="mt-1 text-sm text-muted">
          Open the link we sent to {state.email} in this browser. If it’s not there, check spam.
        </p>
      </div>
    );
  }

  const copy = COPY[mode];
  const switchTo = (next: Mode, text: string) => (
    <button type="button" onClick={() => setMode(next)} className={`${btnGhost} w-full`}>
      {text}
    </button>
  );

  return (
    <>
      <p className="mt-1.5 text-muted">{copy.intro}</p>
      {notice}
      <form action={action} className="mt-6 flex flex-col gap-3">
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
        {mode !== "link" && (
          <input
            key={mode}
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            maxLength={72}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? "Password, 8+ characters" : "Password"}
            className={input}
          />
        )}
        {state.status === "error" && <p className="text-sm text-danger">{state.message}</p>}
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? copy.pending : copy.submit}
        </button>
      </form>
      <div className="mt-2 flex flex-col">
        {mode === "signin" ? (
          <>
            {switchTo("signup", "New here? Create an account")}
            {switchTo("link", "Forgot password?")}
          </>
        ) : (
          switchTo("signin", "Back to sign in")
        )}
      </div>
    </>
  );
}
