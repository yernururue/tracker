"use client";

import { useEffect, useRef, useState } from "react";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Counts from the previous value to `target` with an ease-out curve (idea from React Bits "Count Up"). */
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let id = 0;
    const tick = (t: number) => {
      const k = reducedMotion() ? 1 : Math.min(1, (t - start) / duration);
      const v = Math.round(a + (target - a) * (1 - (1 - k) ** 3));
      from.current = v;
      setValue(v);
      if (k < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return value;
}

/** Circular progress with the percentage in the middle. Turns green at 100%. */
export function Ring({ value, size = 44, stroke = 4 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const percent = Math.round(value * 100);
  const shown = useCountUp(percent);
  // Starts empty and fills on the next frame so the stroke animates in.
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(Math.min(1, Math.max(0, value))));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${percent}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={value >= 1 ? "var(--live)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - drawn)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className={`absolute font-semibold tabular-nums ${shown >= 100 ? "text-[10px]" : "text-[11px]"}`} aria-hidden>
        {shown}%
      </span>
    </span>
  );
}

/** Text whose digits slide in when they change, like an odometer (idea from React Bits "Count Up", roll mode). */
export function RollingText({ text }: { text: string }) {
  return (
    <span className="inline-flex">
      <span className="sr-only">{text}</span>
      {[...text].map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className="inline-block overflow-hidden" aria-hidden>
            <span key={ch} className="inline-block animate-digit-in">
              {ch}
            </span>
          </span>
        ) : (
          <span key={i} aria-hidden>
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
