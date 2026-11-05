import { formatMinutes, formatShortDate, formatTime } from "@/lib/time";
import { card, label } from "./ui";

export type FeedItem = {
  id: string;
  name: string;
  startedAt: string;
  minutes: number;
  report: string;
};

export function Feed({ items }: { items: FeedItem[] }) {
  return (
    <section className={card}>
      <span className={label}>Лента</span>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Пока ни одной сессии.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {items.map((s) => (
            <li key={s.id} className="py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-medium">{s.name}</span>
                <span className="text-sm text-muted">
                  {formatShortDate(s.startedAt)}, {formatTime(s.startedAt)} ·{" "}
                  <span className="font-mono tabular-nums">{formatMinutes(s.minutes)}</span>
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{s.report}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
