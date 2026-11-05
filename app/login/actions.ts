"use server";

import { headers } from "next/headers";
import { isAllowed } from "@/lib/allowlist";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

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
    const rate = error.status === 429 || /rate|seconds/i.test(error.message);
    return {
      status: "error",
      message: rate
        ? "Too many attempts. Wait a minute and try again."
        : `Couldn’t send the email: ${error.message}`,
      email,
    };
  }

  return { status: "sent", email };
}
