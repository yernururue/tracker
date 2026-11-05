import Link from "next/link";
import { DAY_TARGET_MIN, WEEK_TARGET_MIN } from "@/lib/stats";
import { FriendCard, type FriendCardData } from "./FriendCard";

/** One white panel with a row per friend instead of a stack of separate cards. */
export function FriendsPanel({ friends, meId, demo }: { friends: FriendCardData[]; meId: string; demo: boolean }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-semibold tracking-tight">Друзья</h2>
          <p className="mt-0.5 text-xs text-muted">
            Норма: {DAY_TARGET_MIN / 60} ч в день, {WEEK_TARGET_MIN / 60} ч в неделю
          </p>
        </div>
        <Link
          href={demo ? "/" : "/?demo"}
          className="-mr-2 rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {demo ? "скрыть демо" : "демо"}
        </Link>
      </div>
      <ul className="divide-y divide-line">
        {friends.map((f) => (
          <li key={f.id}>
            <FriendCard f={f} me={f.id === meId} href={f.id.startsWith("demo-") ? undefined : `/u/${f.id}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
