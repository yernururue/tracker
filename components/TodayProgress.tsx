import { formatMinutes } from "@/lib/time";
import { card, label } from "./ui";

export function TodayProgress({ minutes, goal }: { minutes: number; goal: number }) {
  const pct = Math.min(100, Math.round((minutes / goal) * 100));
  const done = minutes >= goal;
  return (
    <section className={card}>
      <div className="flex items-baseline justify-between gap-4">
        <span className={label}>Сегодня</span>
        <span className="text-sm text-muted">{done ? "Цель выполнена" : `${pct}%`}</span>
      </div>
      <p className="mt-3 font-mono text-2xl tabular-nums">
        {minutes}
        <span className="text-muted"> / {goal} мин</span>
      </p>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={minutes}
        aria-label={`Сегодня ${formatMinutes(minutes)} из ${formatMinutes(goal)}`}
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}
