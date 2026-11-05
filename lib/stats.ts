import { addDays, dayKey, weekStartKey } from "./time";

type MinuteRow = { started_at: string; minutes: number };

export function minutesByDay(rows: MinuteRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = dayKey(r.started_at);
    map.set(k, (map.get(k) ?? 0) + r.minutes);
  }
  return map;
}

export type MyStats = {
  today: number;
  week: number;
  streak: number;
  total: number;
};

export function computeStats(byDay: Map<string, number>, todayKey: string): MyStats {
  const weekStart = weekStartKey(todayKey);
  let week = 0;
  let total = 0;
  for (const [k, v] of byDay) {
    total += v;
    if (k >= weekStart && k <= todayKey) week += v;
  }

  // Consecutive days with >0 minutes. If today is empty, count from yesterday.
  let cursor = (byDay.get(todayKey) ?? 0) > 0 ? todayKey : addDays(todayKey, -1);
  let streak = 0;
  while ((byDay.get(cursor) ?? 0) > 0) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  return { today: byDay.get(todayKey) ?? 0, week, streak, total };
}

export const HEATMAP_WEEKS = 16;

/** Levels: 0 = none, 1 = <30m, 2 = <60m, 3 = <2h, 4 = 2h+ */
export function heatLevel(min: number): 0 | 1 | 2 | 3 | 4 {
  if (min <= 0) return 0;
  if (min < 30) return 1;
  if (min < 60) return 2;
  if (min < 120) return 3;
  return 4;
}

export type HeatCell = { key: string; minutes: number; level: 0 | 1 | 2 | 3 | 4; future: boolean };

/** Columns = weeks (oldest first), each with 7 cells Monday→Sunday. */
export function buildHeatmap(byDay: Map<string, number>, todayKey: string): HeatCell[][] {
  const firstMonday = addDays(weekStartKey(todayKey), -(HEATMAP_WEEKS - 1) * 7);
  const weeks: HeatCell[][] = [];
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = addDays(firstMonday, w * 7 + d);
      const minutes = byDay.get(key) ?? 0;
      col.push({ key, minutes, level: heatLevel(minutes), future: key > todayKey });
    }
    weeks.push(col);
  }
  return weeks;
}

export function heatmapStartKey(todayKey: string): string {
  return addDays(weekStartKey(todayKey), -(HEATMAP_WEEKS - 1) * 7);
}
