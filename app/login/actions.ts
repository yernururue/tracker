"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAllowed } from "@/lib/allowlist";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

/** Returns an error state for a bad or non-member email, or null if it can sign in. */
function checkEmail(email: string): LoginState | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Enter a valid email.", email };
  }
  if (!isAllowed(email)) {
    return {
      status: "error",
      message: "This email isn’t on the member list. Ask to have it added to ALLOWED_EMAILS.",
      email,
    };
  }
  return null;
}

const isRateLimit = (e: { status?: number; message: string }) => e.status === 429 || /rate|seconds/i.test(e.message);

export async function signInWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const bad = checkEmail(email);
  if (bad) return bad;
  if (!password) return { status: "error", message: "Enter your password.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      status: "error",
      message: isRateLimit(error)
        ? "Too many attempts. Wait a minute and try again."
        : "Wrong email or password. No password yet? Sign in with an email link once and set one.",
      email,
    };
  }

  redirect("/");
}

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const bad = checkEmail(email);
  if (bad) return bad;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm`, shouldCreateUser: true },
  });

  if (error) {
    return {
      status: "error",
      message: isRateLimit(error)
        ? "Too many attempts. Wait a minute and try again."
        : `Couldn’t send the email: ${error.message}`,
      email,
    };
  }

  return { status: "sent", email };
}
