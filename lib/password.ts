export const PASSWORD_RULE = "Password must be 8 to 72 characters.";

/** Returns the password field if it fits Supabase's limits, else null. */
export function parsePassword(formData: FormData): string | null {
  const password = String(formData.get("password") ?? "");
  return password.length >= 8 && password.length <= 72 ? password : null;
}
