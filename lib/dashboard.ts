import type { SupabaseClient } from "@supabase/supabase-js";
import type { FriendCardData } from "@/components/FriendCard";
import { dayKey, dayStartUtc, weekStartKey } from "./time";
import type { ActiveTimer, Profile, Session, WeeklyGoal } from "./types";

export type DashboardSnapshot = {
  friends: FriendCardData[];
  timer: ActiveTimer | null;
  goal: WeeklyGoal | null;
  weekStart: string;
  serverNow: string;
  error: string | null;
};

/** Shared by the initial dashboard render and its live data requests. */
export async function loadDashboard(supabase: SupabaseClient, userId: string): Promise<DashboardSnapshot> {
  const now = new Date();
  const todayKey = dayKey(now);
  const todayStart = dayStartUtc(todayKey);
  const weekKey = weekStartKey(todayKey);
  const weekStart = dayStartUtc(weekKey);

  const [profilesRes, timersRes, weekRes, recentRes, goalsRes] = await Promise.all([
    supabase.from("profiles").select("*").returns<Profile[]>(),
    supabase.from("active_timers").select("*").returns<ActiveTimer[]>(),
    supabase
      .from("sessions")
      .select("user_id, started_at, minutes")
      .gte("started_at", weekStart)
      .limit(5000)
      .returns<Pick<Session, "user_id" | "started_at" | "minutes">[]>(),
    supabase
      .from("sessions")
      .select("user_id, started_at, minutes, report")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Pick<Session, "user_id" | "started_at" | "minutes" | "report">[]>(),
    supabase.from("weekly_goals").select("*").eq("week_start", weekKey).returns<WeeklyGoal[]>(),
  ]);

  const timers = timersRes.data ?? [];
  const goals = goalsRes.data ?? [];
  const friends: FriendCardData[] = (profilesRes.data ?? []).map((profile) => {
    const week = (weekRes.data ?? []).filter((session) => session.user_id === profile.id);
    const timer = timers.find((entry) => entry.user_id === profile.id);
    const last = (recentRes.data ?? []).find((session) => session.user_id === profile.id);
    const goal = goals.find((entry) => entry.user_id === profile.id);

    return {
      id: profile.id,
      name: profile.display_name,
      weekMin: week.reduce((total, session) => total + session.minutes, 0),
      todayMin: week.filter((session) => session.started_at >= todayStart).reduce((total, session) => total + session.minutes, 0),
      liveSince: timer?.running_since ?? null,
      liveAccumulatedMs: Number(timer?.accumulated_ms ?? 0),
      last: last ? { startedAt: last.started_at, minutes: last.minutes, report: last.report } : null,
      goal: goal ? { text: goal.goal_text, status: goal.status } : null,
    };
  });

  friends.sort(
    (a, b) =>
      Number(Boolean(b.liveSince)) - Number(Boolean(a.liveSince)) ||
      b.weekMin - a.weekMin ||
      a.name.localeCompare(b.name, "en"),
  );

  const loadError = [profilesRes, timersRes, weekRes, recentRes, goalsRes].find((result) => result.error)?.error;

  return {
    friends,
    timer: timers.find((timer) => timer.user_id === userId) ?? null,
    goal: goals.find((goal) => goal.user_id === userId) ?? null,
    weekStart: weekKey,
    serverNow: now.toISOString(),
    error: loadError?.message ?? null,
  };
}
