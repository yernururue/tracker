import type { MyStats } from "@/lib/stats";
import { formatHours } from "@/lib/time";
import { card, label } from "./ui";

function daysWord(n: number): string {
  return n === 1 ? "day" : "days";
}

export function Stats({ stats }: { stats: MyStats }) {
  const items = [
    { title: "Today", value: formatHours(stats.today), unit: "h" },
    { title: "This week", value: formatHours(stats.week), unit: "h" },
    { title: "Streak", value: String(stats.streak), unit: daysWord(stats.streak) },
    { title: "Total", value: formatHours(stats.total), unit: "h" },
  ];
  return (
    <section className={card}>
      <span className={label}>Stats</span>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        {items.map((it) => (
          <div key={it.title}>
            <dt className="text-sm text-muted">{it.title}</dt>
            <dd className="mt-1 text-2xl font-semibold tracking-tight">
              {it.value}
              <span className="ml-1 text-sm font-normal text-muted">{it.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
