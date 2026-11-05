import type { MyStats } from "@/lib/stats";
import { formatHours } from "@/lib/time";
import { card, label } from "./ui";

function daysWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "день";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "дня";
  return "дней";
}

export function Stats({ stats }: { stats: MyStats }) {
  const items = [
    { title: "Сегодня", value: formatHours(stats.today), unit: "ч" },
    { title: "Неделя", value: formatHours(stats.week), unit: "ч" },
    { title: "Серия", value: String(stats.streak), unit: daysWord(stats.streak) },
    { title: "Всего", value: formatHours(stats.total), unit: "ч" },
  ];
  return (
    <section className={card}>
      <span className={label}>Статистика</span>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        {items.map((it) => (
          <div key={it.title}>
            <dt className="text-sm text-muted">{it.title}</dt>
            <dd className="mt-1 font-mono text-xl tabular-nums">
              {it.value}
              <span className="ml-1 font-sans text-sm text-muted">{it.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
