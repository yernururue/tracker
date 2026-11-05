"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean };

function parseName(formData: FormData): string | null {
  const name = String(formData.get("display_name") ?? "").trim();
  return name.length >= 1 && name.length <= 40 ? name : null;
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name })
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
