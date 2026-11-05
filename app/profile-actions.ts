"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; ok?: boolean };

function parseName(formData: FormData): string | null {
  const name = String(formData.get("display_name") ?? "").trim();
  return name.length >= 1 && name.length <= 40 ? name : null;
}

const PASSWORD_RULE = "Password must be 8 to 72 characters.";

function parsePassword(formData: FormData): string | null {
  const password = String(formData.get("password") ?? "");
  return password.length >= 8 && password.length <= 72 ? password : null;
}

/** Sets the signed-in user's password. Re-sending the current one counts as success. */
async function setPassword(supabase: Awaited<ReturnType<typeof createClient>>, password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  return error && error.code !== "same_password" ? `Couldn’t set the password: ${error.message}` : null;
}

export async function createProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = parseName(formData);
  if (!name) return { error: "Name must be 1 to 40 characters." };
  const password = parsePassword(formData);
  if (!password) return { error: PASSWORD_RULE };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pwError = await setPassword(supabase, password);
  if (pwError) return { error: pwError };

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: name }, { onConflict: "id", ignoreDuplicates: true });
  if (error) return { error: `Couldn’t save: ${error.message}` };

  redirect("/");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = parseName(formData);
  if (!name) return { error: "Name must be 1 to 40 characters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name })
    .eq("id", user.id);
  if (error) return { error: `Couldn’t save: ${error.message}` };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = parsePassword(formData);
  if (!password) return { error: PASSWORD_RULE };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const error = await setPassword(supabase, password);
  return error ? { error } : { ok: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function markInstructionsSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ seen_instructions: true }).eq("id", user.id);
}
