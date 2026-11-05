import Link from "next/link";
import { notFound } from "next/navigation";
import { ExportButton } from "@/components/ExportButton";
import { Heatmap } from "@/components/Heatmap";
import { ReportList } from "@/components/ReportList";
import { Stats } from "@/components/Stats";
import { btnGhost, card, label } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { buildHeatmap, computeStats, heatmapStartKey, minutesByDay } from "@/lib/stats";
import { dayKey, dayStartUtc } from "@/lib/time";
import type { Profile, Session } from "@/lib/types";
import { signOut } from "../../profile-actions";
import { NameForm } from "./name-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProfilePage({ params }: PageProps<"/u/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, user } = await requireProfile();
  const isMe = id === user.id;

  const todayKey = dayKey(new Date());
  const heatStart = dayStartUtc(heatmapStartKey(todayKey));

  const [profileRes, heatRes, totalRes, reportsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>(),
    supabase.from("sessions").select("started_at, minutes").eq("user_id", id).gte("started_at", heatStart).limit(5000),
    supabase.from("user_totals").select("total_minutes").eq("user_id", id).maybeSingle(),
    supabase
      .from("sessions")
      .select("id, started_at, minutes, report")
      .eq("user_id", id)
      .order("started_at", { ascending: false })
      .limit(50)
      .returns<Pick<Session, "id" | "started_at" | "minutes" | "report">[]>(),
  ]);

  const profile = profileRes.data;
  if (!profile) notFound();

  const byDay = minutesByDay(heatRes.data ?? []);
  const stats = computeStats(byDay, todayKey);
  stats.total = Number(totalRes.data?.total_minutes ?? 0);
  const reports = (reportsRes.data ?? []).map((s) => ({
    id: s.id,
    startedAt: s.started_at,
    minutes: s.minutes,
    report: s.report,
  }));

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <Link href="/" className={btnGhost}>
          ← Назад
        </Link>
        {isMe && (
          <form action={signOut}>
            <button type="submit" className={btnGhost}>
              Выйти
            </button>
          </form>
        )}
      </header>

      <h1 className="mb-6 px-1 text-2xl font-semibold tracking-tight">{profile.display_name}</h1>

      <div className="flex flex-col gap-4">
        <Stats stats={stats} />
        <Heatmap weeks={buildHeatmap(byDay, todayKey)} />
        <ReportList items={reports} />

        {isMe && (
          <>
            <section className={`${card} flex flex-col gap-3`}>
              <span className={label}>Выгрузка для разбора</span>
              <p className="text-sm text-muted">Репорты всех за период одним .md файлом.</p>
              <ExportButton />
            </section>
            <section className={`${card} flex flex-col gap-3`}>
              <span className={label}>Имя</span>
              <NameForm name={profile.display_name} />
              <p className="truncate text-sm text-muted">{user.email}</p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
