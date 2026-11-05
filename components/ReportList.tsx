import { formatMinutes, formatShortDate, formatTime } from "@/lib/time";
import { card, label } from "./ui";

export type ReportItem = { id: string; startedAt: string; minutes: number; report: string };

export function ReportList({ items }: { items: ReportItem[] }) {
  return (
    <section className={card}>
      <span className={label}>Репорты</span>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Пока ни одной сессии.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {items.map((s) => (
            <li key={s.id} className="py-4">
              <p className="text-sm text-muted">
                {formatShortDate(s.startedAt)}, {formatTime(s.startedAt)} ·{" "}
                <span className="font-mono tabular-nums">{formatMinutes(s.minutes)}</span>
              </p>
              <p className="mt-1.5 whitespace-pre-wrap break-words leading-relaxed">{s.report}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
