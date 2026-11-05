import type { HeatCell } from "@/lib/stats";
import { formatDayKey, formatMinutes } from "@/lib/time";
import { card, label } from "./ui";

const LEVEL_BG = [
  "bg-[var(--heat-0)]",
  "bg-[var(--heat-1)]",
  "bg-[var(--heat-2)]",
  "bg-[var(--heat-3)]",
  "bg-[var(--heat-4)]",
];

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

export function Heatmap({ weeks }: { weeks: HeatCell[][] }) {
  return (
    <section className={card}>
      <span className={label}>16 weeks</span>
      <div className="mt-4 grid grid-flow-col grid-cols-[auto_repeat(16,minmax(0,1fr))] grid-rows-7 gap-[3px]">
        {DAY_LABELS.map((d, i) => (
          <span key={`l${i}`} className="flex items-center pr-1.5 text-[10px] leading-none text-muted">
            {d}
          </span>
        ))}
        {weeks.flat().map((c) => (
          <div
            key={c.key}
            title={c.future ? undefined : `${formatDayKey(c.key)}: ${c.minutes ? formatMinutes(c.minutes) : "none"}`}
            className={`aspect-square rounded-[3px] ${c.future ? "bg-transparent" : LEVEL_BG[c.level]}`}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted">
        <span>0</span>
        {LEVEL_BG.map((bg, i) => (
          <span key={i} className={`size-2.5 rounded-[2px] ${bg}`} />
        ))}
        <span>2h+</span>
      </div>
    </section>
  );
}
