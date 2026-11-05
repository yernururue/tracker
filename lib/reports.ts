import { addDays, dayKey, formatDayKey, formatMinutes, formatTime, weekStartKey } from "./time";
import { GOAL_STATUS_LABEL, type Profile, type Session, type WeeklyGoal } from "./types";

export type ReportSession = Pick<Session, "id" | "user_id" | "started_at" | "ended_at" | "minutes" | "report">;

export type Range = "7" | "14" | "30" | "all";
export const RANGES: { value: Range; label: string }[] = [
  { value: "7", label: "7 дней" },
  { value: "14", label: "14 дней" },
  { value: "30", label: "30 дней" },
  { value: "all", label: "Всё время" },
];

export function parseRange(v: unknown): Range {
  return v === "14" || v === "30" || v === "all" ? v : "7";
}

/** First Almaty day included in the range, or null for all time. */
export function rangeFromKey(range: Range, todayKey: string): string | null {
  return range === "all" ? null : addDays(todayKey, -(Number(range) - 1));
}

export type PersonDay = { profile: Profile; sessions: ReportSession[]; minutes: number };
export type DayGroup = { key: string; people: PersonDay[] };
export type PersonWeek = { profile: Profile; goal: WeeklyGoal | null; minutes: number };
export type WeekGroup = { weekStart: string; people: PersonWeek[]; days: DayGroup[] };

const byName = (a: Profile, b: Profile) => a.display_name.localeCompare(b.display_name, "ru");

/** Newest week first → newest day first → person (by name) → sessions oldest first. */
export function groupReports(profiles: Profile[], sessions: ReportSession[], goals: WeeklyGoal[]): WeekGroup[] {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const weeks = new Map<string, { sessions: ReportSession[]; goals: WeeklyGoal[] }>();
  const week = (k: string) => {
    let w = weeks.get(k);
    if (!w) weeks.set(k, (w = { sessions: [], goals: [] }));
    return w;
  };
  for (const s of sessions) if (profileById.has(s.user_id)) week(weekStartKey(dayKey(s.started_at))).sessions.push(s);
  for (const g of goals) if (profileById.has(g.user_id)) week(g.week_start).goals.push(g);

  return [...weeks.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekStart, w]) => {
      const ids = new Set([...w.sessions.map((s) => s.user_id), ...w.goals.map((g) => g.user_id)]);
      const people = [...ids]
        .map((id) => profileById.get(id)!)
        .sort(byName)
        .map((profile) => ({
          profile,
          goal: w.goals.find((g) => g.user_id === profile.id) ?? null,
          minutes: w.sessions.filter((s) => s.user_id === profile.id).reduce((t, s) => t + s.minutes, 0),
        }));

      const dayMap = new Map<string, ReportSession[]>();
      for (const s of w.sessions) {
        const k = dayKey(s.started_at);
        dayMap.set(k, [...(dayMap.get(k) ?? []), s]);
      }
      const days = [...dayMap.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([key, list]) => ({ key, people: groupByPerson(list, profileById) }));

      return { weekStart, people, days };
    });
}

export function groupByPerson(list: ReportSession[], profileById: Map<string, Profile>): PersonDay[] {
  const map = new Map<string, ReportSession[]>();
  for (const s of list) map.set(s.user_id, [...(map.get(s.user_id) ?? []), s]);
  return [...map.entries()]
    .map(([id, ss]) => ({
      profile: profileById.get(id)!,
      sessions: ss.sort((a, b) => a.started_at.localeCompare(b.started_at)),
      minutes: ss.reduce((t, s) => t + s.minutes, 0),
    }))
    .filter((p) => p.profile)
    .sort((a, b) => byName(a.profile, b.profile));
}

const monthDay = new Intl.DateTimeFormat("ru-RU", { timeZone: "UTC", day: "numeric", month: "long" });
export function formatWeekRange(weekStart: string): string {
  const a = new Date(`${weekStart}T00:00:00Z`);
  const b = new Date(`${addDays(weekStart, 6)}T00:00:00Z`);
  return `${monthDay.format(a)} – ${monthDay.format(b)}`;
}

function indent(text: string): string {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => (line.trim() ? `  ${line}` : ""))
    .join("\n");
}

export function reportsToMarkdown(weeks: WeekGroup[], title: string): string {
  const out: string[] = [`# ${title}`, "", "Часовой пояс: Asia/Almaty.", ""];
  if (weeks.length === 0) out.push("_Нет репортов за период._", "");

  for (const w of weeks) {
    out.push(`## Неделя ${formatWeekRange(w.weekStart)}`, "");
    for (const p of w.people) {
      const goal = p.goal ? `«${p.goal.goal_text.trim()}» — ${GOAL_STATUS_LABEL[p.goal.status].toLowerCase()}` : "не задана";
      out.push(`- **${p.profile.display_name}**: ${formatMinutes(p.minutes)}. Цель: ${goal}`);
    }
    out.push("");
    for (const d of w.days) {
      out.push(`### ${formatDayKey(d.key)}`, "");
      for (const p of d.people) {
        out.push(`#### ${p.profile.display_name} — ${formatMinutes(p.minutes)}`, "");
        for (const s of p.sessions) {
          out.push(`- ${formatTime(s.started_at)}–${formatTime(s.ended_at)}, ${formatMinutes(s.minutes)}`);
          out.push(indent(s.report), "");
        }
      }
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
