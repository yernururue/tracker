"use server";

import { headers } from "next/headers";
import { isAllowed } from "@/lib/allowlist";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Введи корректный email.", email };
  }
  if (!isAllowed(email)) {
    return {
      status: "error",
      message: "Этого email нет в списке участников. Попроси добавить его в ALLOWED_EMAILS.",
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
        ? "Слишком много попыток. Подожди минуту и попробуй снова."
        : `Не получилось отправить письмо: ${error.message}`,
      email,
    };
  }

  return { status: "sent", email };
}
