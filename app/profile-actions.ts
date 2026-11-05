"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean };

function parseName(formData: FormData): string | null {
  const name = String(formData.get("display_name") ?? "").trim();
  return name.length >= 1 && name.length <= 40 ? name : null;
}

function parseGoal(formData: FormData): number | null {
  const goal = Number(formData.get("daily_goal_minutes"));
  return Number.isInteger(goal) && goal >= 1 && goal <= 960 ? goal : null;
}

export async function createProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = parseName(formData);
  if (!name) return { error: "Имя должно быть от 1 до 40 символов." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: name }, { onConflict: "id", ignoreDuplicates: true });
  if (error) return { error: `Не удалось сохранить: ${error.message}` };

  redirect("/");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = parseName(formData);
  if (!name) return { error: "Имя должно быть от 1 до 40 символов." };
  const goal = parseGoal(formData);
  if (!goal) return { error: "Цель должна быть от 1 до 960 минут." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name, daily_goal_minutes: goal })
    .eq("id", user.id);
  if (error) return { error: `Не удалось сохранить: ${error.message}` };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
