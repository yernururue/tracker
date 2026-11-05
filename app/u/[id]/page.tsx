import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Heatmap } from "@/components/Heatmap";
import { Stats } from "@/components/Stats";
import { btnGhost, btnSecondary, card, label } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { buildHeatmap, computeStats, heatmapStartKey, minutesByDay } from "@/lib/stats";
import { dayKey, dayStartUtc } from "@/lib/time";
import type { Profile } from "@/lib/types";
import { signOut } from "../../profile-actions";
import { NameForm } from "./name-form";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProfilePage({ params }: PageProps<"/u/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, user, profile: me } = await requireProfile();
  const isMe = id === user.id;

  const todayKey = dayKey(new Date());
  const heatStart = dayStartUtc(heatmapStartKey(todayKey));

  const [profileRes, heatRes, totalRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>(),
    supabase.from("sessions").select("started_at, minutes").eq("user_id", id).gte("started_at", heatStart).limit(5000),
    supabase.from("user_totals").select("total_minutes").eq("user_id", id).maybeSingle(),
  ]);

  const profile = profileRes.data;
  if (!profile) notFound();

  const byDay = minutesByDay(heatRes.data ?? []);
  const stats = computeStats(byDay, todayKey);
  stats.total = Number(totalRes.data?.total_minutes ?? 0);

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-16 pt-4 sm:px-6 sm:pt-8">
      <Header userId={user.id} name={me.display_name} current={isMe ? "profile" : undefined} />

      <div className="mb-6 flex items-center justify-between gap-4 px-1">
        <h1 className="text-2xl font-semibold tracking-tight">{profile.display_name}</h1>
        {isMe && (
          <form action={signOut}>
            <button type="submit" className={`${btnGhost} -mr-3`}>
              Sign out
            </button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Stats stats={stats} />
        <Heatmap weeks={buildHeatmap(byDay, todayKey)} />
        <Link href={`/reports?tab=doc&u=${profile.id}`} className={`${btnSecondary} self-start`}>
          All reports
        </Link>

        {isMe && (
          <section className={`${card} flex flex-col gap-3`}>
            <span className={label}>Name</span>
            <NameForm name={profile.display_name} />
            <p className="truncate text-sm text-muted">{user.email}</p>
          </section>
        )}
      </div>
    </main>
  );
}
