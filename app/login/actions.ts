"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAllowed } from "@/lib/allowlist";
import { PASSWORD_RULE, parsePassword } from "@/lib/password";
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

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const isRateLimit = (e: { status?: number; message: string }) => e.status === 429 || /rate|seconds/i.test(e.message);
const RATE_LIMITED = "Too many attempts. Try again later.";

export async function signInWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const bad = checkEmail(email);
  if (bad) return bad;
  if (!password) return { status: "error", message: "Enter your password.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { status: "error", message: isRateLimit(error) ? RATE_LIMITED : "Wrong email or password.", email };
  }

  redirect("/");
}

export async function signUp(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const bad = checkEmail(email);
  if (bad) return bad;
  const password = parsePassword(formData);
  if (!password) return { status: "error", message: PASSWORD_RULE, email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { has_password: true }, emailRedirectTo: `${await siteOrigin()}/auth/confirm` },
  });
  if (error) {
    return {
      status: "error",
      message:
        error.code === "user_already_exists"
          ? "This email already has an account. Sign in instead."
          : isRateLimit(error)
            ? RATE_LIMITED
            : `Couldn’t create the account: ${error.message}`,
      email,
    };
  }
  // No session means Supabase still requires email confirmation and sent a link.
  if (!data.session) return { status: "sent", email };

  redirect("/");
}

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const bad = checkEmail(email);
  if (bad) return bad;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm`, shouldCreateUser: true },
  });

  if (error) {
    return {
      status: "error",
      message: isRateLimit(error) ? RATE_LIMITED : `Couldn’t send the email: ${error.message}`,
      email,
    };
  }

  return { status: "sent", email };
}
