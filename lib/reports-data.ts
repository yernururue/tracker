import type { SupabaseClient } from "@supabase/supabase-js";
import { groupReports, rangeFromKey, RANGES, type Range, type ReportSession, type WeekGroup } from "./reports";
import { dayKey, dayStartUtc, weekStartKey } from "./time";
import type { Profile, WeeklyGoal } from "./types";

export async function loadProfiles(supabase: SupabaseClient): Promise<Profile[]> {
  const { data } = await supabase.from("profiles").select("*").order("created_at").returns<Profile[]>();
  return data ?? [];
}

/** Data behind the "Combined report" tab and its .md export, so both always match. */
export async function loadReportDoc(
  supabase: SupabaseClient,
  profiles: Profile[],
  range: Range,
  personId: string | null,
): Promise<{ weeks: WeekGroup[]; title: string; error: string | null }> {
  const todayKey = dayKey(new Date());
  const fromKey = rangeFromKey(range, todayKey);

  let sq = supabase
    .from("sessions")
    .select("id, user_id, started_at, ended_at, minutes, report")
    .order("started_at", { ascending: false })
    .limit(10000);
  let gq = supabase
    .from("weekly_goals")
    .select("*")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (fromKey) {
    sq = sq.gte("started_at", dayStartUtc(fromKey));
    gq = gq.gte("week_start", weekStartKey(fromKey));
  }
  if (personId) {
    sq = sq.eq("user_id", personId);
    gq = gq.eq("user_id", personId);
  }
  const [sRes, gRes] = await Promise.all([sq.returns<ReportSession[]>(), gq.returns<WeeklyGoal[]>()]);

  const shown = personId ? profiles.filter((p) => p.id === personId) : profiles;
  const weeks = groupReports(shown, sRes.data ?? [], gRes.data ?? []);
  const who = personId ? (shown[0]?.display_name ?? "—") : "everyone";
  const rangeLabel = RANGES.find((r) => r.value === range)!.label.toLowerCase();
  return {
    weeks,
    title: `Reports: ${who}, ${rangeLabel}`,
    error: sRes.error?.message ?? gRes.error?.message ?? null,
  };
}
