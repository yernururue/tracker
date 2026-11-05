// Day boundaries use Asia/Almaty. Timestamps are stored in UTC.
// A "day key" is a YYYY-MM-DD string for a calendar day in Almaty.

export const TZ = "Asia/Almaty";

const dayKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function dayKey(date: Date | string | number): string {
  return dayKeyFmt.format(new Date(date));
}

function keyToUtcMidnight(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  return new Date(keyToUtcMidnight(key) + n * 86_400_000).toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayMon0(key: string): number {
  return (new Date(keyToUtcMidnight(key)).getUTCDay() + 6) % 7;
}

export function weekStartKey(key: string): string {
  return addDays(key, -weekdayMon0(key));
}

function tzOffsetMs(at: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "longOffset",
  }).formatToParts(new Date(at));
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] ?? 0)) * 60_000;
}

/** UTC instant (ISO) at which the given Almaty day starts. */
export function dayStartUtc(key: string): string {
  const guess = keyToUtcMidnight(key);
  return new Date(guess - tzOffsetMs(guess)).toISOString();
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

export function formatHours(min: number): string {
  return (min / 60).toLocaleString("ru-RU", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

const longDateFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "long",
});

/** "пн, 3 ноября" for a day key */
export function formatDayKey(key: string): string {
  return longDateFmt.format(new Date(keyToUtcMidnight(key)));
}

const timeFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

export function formatTime(date: string | Date): string {
  return timeFmt.format(new Date(date));
}

const shortDateFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
});

export function formatShortDate(date: string | Date): string {
  return shortDateFmt.format(new Date(date));
}
