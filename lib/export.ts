import type { Profile, Session } from "./types";
import { dayKey, formatDayKey, formatMinutes, formatTime } from "./time";

function indent(text: string): string {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => (line.trim() ? `  ${line}` : ""))
    .join("\n");
}

function fmtKey(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}.${m}.${y}`;
}

export function buildReportMarkdown(
  profiles: Profile[],
  sessions: Session[],
  fromKey: string,
  toKey: string,
  days: number,
): string {
  const out: string[] = [];
  out.push(`# Репорты за ${days} дней (${fmtKey(fromKey)} – ${fmtKey(toKey)})`);
  out.push("");
  out.push("Часовой пояс: Asia/Almaty. Время указано как начало–конец сессии.");
  out.push("");

  const byUser = new Map<string, Session[]>();
  for (const s of sessions) {
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }

  const ordered = [...profiles].sort((a, b) => {
    const ma = (byUser.get(a.id) ?? []).reduce((t, s) => t + s.minutes, 0);
    const mb = (byUser.get(b.id) ?? []).reduce((t, s) => t + s.minutes, 0);
    return mb - ma || a.display_name.localeCompare(b.display_name, "ru");
  });

  for (const p of ordered) {
    const list = (byUser.get(p.id) ?? []).sort((a, b) => a.started_at.localeCompare(b.started_at));
    const total = list.reduce((t, s) => t + s.minutes, 0);
    const activeDays = new Set(list.map((s) => dayKey(s.started_at))).size;

    out.push(`## ${p.display_name}`);
    out.push("");
    out.push(`Всего: ${formatMinutes(total)}, активных дней: ${activeDays} из ${days}, сессий: ${list.length}`);
    out.push("");

    if (list.length === 0) {
      out.push("_Нет сессий за период._");
      out.push("");
      continue;
    }

    const byDay = new Map<string, Session[]>();
    for (const s of list) {
      const k = dayKey(s.started_at);
      const arr = byDay.get(k) ?? [];
      arr.push(s);
      byDay.set(k, arr);
    }

    for (const [k, daySessions] of [...byDay].sort(([a], [b]) => a.localeCompare(b))) {
      const dayTotal = daySessions.reduce((t, s) => t + s.minutes, 0);
      out.push(`### ${fmtKey(k)}, ${formatDayKey(k)} — ${formatMinutes(dayTotal)}`);
      out.push("");
      for (const s of daySessions) {
        out.push(`- **${formatMinutes(s.minutes)}** (${formatTime(s.started_at)}–${formatTime(s.ended_at)})`);
        out.push(indent(s.report));
        out.push("");
      }
    }
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
