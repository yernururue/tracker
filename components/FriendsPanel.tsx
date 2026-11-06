import { FriendCard, type FriendCardData } from "./FriendCard";

export function FriendsPanel({ friends, meId, serverNow }: { friends: FriendCardData[]; meId: string; serverNow: string }) {
  return (
    <section aria-labelledby="friends-heading" className="space-y-3">
      <h2 id="friends-heading" className="font-semibold tracking-tight">Friends</h2>
      <ul className="grid gap-3">
        {friends.map((f) => (
          <li key={f.id}>
            <FriendCard f={f} me={f.id === meId} href={`/u/${f.id}`} serverNow={serverNow} />
          </li>
        ))}
      </ul>
    </section>
  );
}
