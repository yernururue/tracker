import { formatHours } from "@/lib/time";
import { card, label } from "./ui";

export type LeaderRow = { id: string; name: string; minutes: number; live: boolean; me: boolean };

export function Leaderboard({ rows }: { rows: LeaderRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  return (
    <section className={card}>
      <span className={label}>Неделя</span>
      <ol className="mt-4 flex flex-col gap-4">
        {rows.map((r) => (
          <li key={r.id}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className={`truncate ${r.me ? "font-medium" : ""}`}>{r.name}</span>
                {r.live && (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-live">
                    <span className="size-2 rounded-full bg-live" aria-hidden />
                    сейчас учится
                  </span>
                )}
              </span>
              <span className="shrink-0 font-mono text-sm tabular-nums">{formatHours(r.minutes)} ч</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full ${r.me ? "bg-accent" : "bg-muted/50"}`}
                style={{ width: `${(r.minutes / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
