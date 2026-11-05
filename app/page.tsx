import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ExportButton } from "@/components/ExportButton";
import { Feed, type FeedItem } from "@/components/Feed";
import { Heatmap } from "@/components/Heatmap";
import { Leaderboard, type LeaderRow } from "@/components/Leaderboard";
import { Stats } from "@/components/Stats";
import { Timer } from "@/components/Timer";
import { TodayProgress } from "@/components/TodayProgress";
import { btnGhost } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { buildHeatmap, computeStats, heatmapStartKey, minutesByDay } from "@/lib/stats";
import { dayKey, dayStartUtc, weekStartKey } from "@/lib/time";
import type { ActiveTimer, Profile, Session } from "@/lib/types";

export default async function Dashboard() {
  const { supabase, user, profile } = await requireProfile();

  const now = new Date();
  const todayKey = dayKey(now);
  const weekStart = dayStartUtc(weekStartKey(todayKey));
  const heatStart = dayStartUtc(heatmapStartKey(todayKey));

  const [profilesRes, timersRes, mineRes, weekRes, feedRes, totalRes] = await Promise.all([
    supabase.from("profiles").select("*").returns<Profile[]>(),
    supabase.from("active_timers").select("*").returns<ActiveTimer[]>(),
    supabase
      .from("sessions")
      .select("started_at, minutes")
      .eq("user_id", user.id)
      .gte("started_at", heatStart)
      .limit(5000),
    supabase.from("sessions").select("user_id, minutes").gte("started_at", weekStart).limit(5000),
    supabase
      .from("sessions")
      .select("id, user_id, started_at, minutes, report")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<Pick<Session, "id" | "user_id" | "started_at" | "minutes" | "report">[]>(),
    supabase.from("user_totals").select("total_minutes").eq("user_id", user.id).maybeSingle(),
  ]);

  const profiles = profilesRes.data ?? [];
  const timers = timersRes.data ?? [];
  const names = new Map(profiles.map((p) => [p.id, p.display_name]));
  const myTimer = timers.find((t) => t.user_id === user.id) ?? null;

  const byDay = minutesByDay(mineRes.data ?? []);
  const stats = computeStats(byDay, todayKey);
  stats.total = Number(totalRes.data?.total_minutes ?? 0);
  const heatmap = buildHeatmap(byDay, todayKey);

  const weekMinutes = new Map<string, number>();
  for (const s of weekRes.data ?? []) {
    weekMinutes.set(s.user_id, (weekMinutes.get(s.user_id) ?? 0) + s.minutes);
  }
  const live = new Set(timers.filter((t) => t.running_since).map((t) => t.user_id));
  const leaders: LeaderRow[] = profiles
    .map((p) => ({
      id: p.id,
      name: p.display_name,
      minutes: weekMinutes.get(p.id) ?? 0,
      live: live.has(p.id),
      me: p.id === user.id,
    }))
    .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, "ru"));

  const feed: FeedItem[] = (feedRes.data ?? []).map((s) => ({
    id: s.id,
    name: names.get(s.user_id) ?? "—",
    startedAt: s.started_at,
    minutes: s.minutes,
    report: s.report,
  }));

  const loadError = [profilesRes, timersRes, mineRes, weekRes, feedRes, totalRes].find((r) => r.error)?.error;

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <AutoRefresh />
      <header className="mb-6 flex items-center justify-between gap-4">
        <p className="truncate">
          <span className="text-muted">Привет, </span>
          {profile.display_name}
        </p>
        <Link href="/settings" className={btnGhost}>
          Настройки
        </Link>
      </header>

      {loadError && (
        <p className="mb-4 rounded-xl border border-danger/30 px-4 py-3 text-sm text-danger">
          Не все данные загрузились: {loadError.message}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <Timer initialTimer={myTimer} serverNow={now.toISOString()} />
        <TodayProgress minutes={stats.today} goal={profile.daily_goal_minutes} />
        <Stats stats={stats} />
        <Heatmap weeks={heatmap} />
        <Leaderboard rows={leaders} />
        <Feed items={feed} />
        <div className="pt-2">
          <ExportButton />
        </div>
      </div>
    </main>
  );
}
