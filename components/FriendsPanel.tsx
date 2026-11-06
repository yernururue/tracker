import { FriendCard, type FriendCardData } from "./FriendCard";

/** One white panel with a row per friend instead of a stack of separate cards. */
export function FriendsPanel({ friends, meId }: { friends: FriendCardData[]; meId: string }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="border-b border-line px-5 py-4">
        <h2 className="font-semibold tracking-tight">Friends</h2>
      </div>
      <ul className="divide-y divide-line">
        {friends.map((f) => (
          <li key={f.id}>
            <FriendCard f={f} me={f.id === meId} href={`/u/${f.id}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
