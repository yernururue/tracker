import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { btnSecondary, card } from "@/components/ui";
import { signOut } from "../profile-actions";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { user, profile } = await requireProfile();

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← Назад
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Настройки</h1>

      <section className={`${card} mt-8`}>
        <SettingsForm name={profile.display_name} goal={profile.daily_goal_minutes} />
      </section>

      <section className={`${card} mt-4 flex flex-wrap items-center justify-between gap-4`}>
        <div className="min-w-0">
          <p className="text-sm text-muted">Вы вошли как</p>
          <p className="truncate">{user.email}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className={btnSecondary}>
            Выйти
          </button>
        </form>
      </section>
    </main>
  );
}
