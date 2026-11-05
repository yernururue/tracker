// Fake friends shown with ?demo=1 to preview the dashboard with several people.
// Nothing is written to the database.
import type { FriendCardData } from "@/components/FriendCard";

export function demoFriends(nowIso: string): FriendCardData[] {
  const now = Date.parse(nowIso);
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  return [
    {
      id: "demo-1",
      name: "Алия (демо)",
      todayMin: 95,
      weekMin: 610,
      liveSince: ago(42),
      liveAccumulatedMs: 0,
      last: { startedAt: ago(300), minutes: 55, report: "Линейная алгебра: собственные векторы, решила 12 задач из Стрэнга." },
    },
    {
      id: "demo-2",
      name: "Тимур (демо)",
      todayMin: 0,
      weekMin: 185,
      liveSince: null,
      liveAccumulatedMs: 0,
      last: { startedAt: ago(1500), minutes: 70, report: "LeetCode: 3 медиума на графы, один не добил — разобрал решение." },
    },
  ];
}
