import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { FriendCard, type FriendCardData } from "@/components/FriendCard";
import { Timer } from "@/components/Timer";
import { btnGhost, label } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { demoFriends } from "@/lib/demo";
import { dayKey, dayStartUtc, weekStartKey } from "@/lib/time";
import type { ActiveTimer, Profile, Session } from "@/lib/types";

export default async function Dashboard({ searchParams }: PageProps<"/">) {
  const { supabase, user, profile } = await requireProfile();
  const demo = (await searchParams).demo !== undefined;

  const now = new Date();
  const nowIso = now.toISOString();
  const todayKey = dayKey(now);
  const todayStart = dayStartUtc(todayKey);
  const weekStart = dayStartUtc(weekStartKey(todayKey));

  const [profilesRes, timersRes, weekRes, recentRes] = await Promise.all([
    supabase.from("profiles").select("*").returns<Profile[]>(),
    supabase.from("active_timers").select("*").returns<ActiveTimer[]>(),
    supabase.from("sessions").select("user_id, started_at, minutes").gte("started_at", weekStart).limit(5000),
    supabase
      .from("sessions")
      .select("user_id, started_at, minutes, report")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Pick<Session, "user_id" | "started_at" | "minutes" | "report">[]>(),
  ]);

  const timers = timersRes.data ?? [];
  const myTimer = timers.find((t) => t.user_id === user.id) ?? null;

  const friends: FriendCardData[] = (profilesRes.data ?? []).map((p) => {
    const week = (weekRes.data ?? []).filter((s) => s.user_id === p.id);
    const t = timers.find((x) => x.user_id === p.id);
    const last = (recentRes.data ?? []).find((s) => s.user_id === p.id);
    return {
      id: p.id,
      name: p.display_name,
      weekMin: week.reduce((a, s) => a + s.minutes, 0),
      todayMin: week.filter((s) => s.started_at >= todayStart).reduce((a, s) => a + s.minutes, 0),
      liveSince: t?.running_since ?? null,
      liveAccumulatedMs: Number(t?.accumulated_ms ?? 0),
      last: last ? { startedAt: last.started_at, minutes: last.minutes, report: last.report } : null,
    };
  });
  if (demo) friends.push(...demoFriends(nowIso));

  friends.sort(
    (a, b) =>
      Number(Boolean(b.liveSince)) - Number(Boolean(a.liveSince)) ||
      b.weekMin - a.weekMin ||
      a.name.localeCompare(b.name, "ru"),
  );
  const maxWeek = Math.max(0, ...friends.map((f) => f.weekMin));

  const loadError = [profilesRes, timersRes, weekRes, recentRes].find((r) => r.error)?.error;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <AutoRefresh />
      <header className="mb-6 flex items-center justify-between gap-4">
        <span className="font-semibold tracking-tight">Учёба</span>
        <Link href={`/u/${user.id}`} className={btnGhost}>
          {profile.display_name}
        </Link>
      </header>

      {loadError && (
        <p className="mb-4 rounded-xl border border-danger/30 px-4 py-3 text-sm text-danger">
          Не все данные загрузились: {loadError.message}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-8">
        <div className="md:sticky md:top-8">
          <Timer initialTimer={myTimer} serverNow={nowIso} />
        </div>

        <section>
          <div className="mb-3 flex items-baseline justify-between px-1">
            <span className={label}>Друзья · неделя</span>
            <Link href={demo ? "/" : "/?demo"} className="text-xs text-muted hover:text-ink">
              {demo ? "скрыть демо" : "демо"}
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {friends.map((f) => (
              <FriendCard
                key={f.id}
                f={f}
                maxWeek={maxWeek}
                me={f.id === user.id}
                href={f.id.startsWith("demo-") ? undefined : `/u/${f.id}`}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
