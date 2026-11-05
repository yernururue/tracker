import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Header } from "@/components/Header";
import { btnSecondary, card, pill } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { formatWeekRange, groupByPerson, parseRange, RANGES, type Range, type ReportSession } from "@/lib/reports";
import { loadProfiles, loadReportDoc } from "@/lib/reports-data";
import {
  addDays,
  dayKey,
  dayStartUtc,
  formatDayKey,
  formatHours,
  formatMinutes,
  formatTime,
  weekStartKey,
} from "@/lib/time";
import { GOAL_STATUS_LABEL, type GoalStatus, type Profile } from "@/lib/types";

type Tab = "calendar" | "doc";
type Params = { tab: Tab; u: string | null; m: string; d: string | null; range: Range };

const PERSON_COLORS = ["var(--p1)", "var(--p2)", "var(--p3)", "var(--p4)"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" });

function href(p: Params, over: Partial<Params>): string {
  const n = { ...p, ...over };
  const q = new URLSearchParams();
  if (n.tab !== "calendar") q.set("tab", n.tab);
  if (n.u) q.set("u", n.u);
  if (n.tab === "calendar") {
    q.set("m", n.m);
    if (n.d) q.set("d", n.d);
  } else if (n.range !== "7") q.set("range", n.range);
  const s = q.toString();
  return s ? `/reports?${s}` : "/reports";
}

function shiftMonth(m: string, delta: number): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const { supabase, user, profile: me } = await requireProfile();
  const sp = await searchParams;
  const profiles = await loadProfiles(supabase);
  const color = new Map(profiles.map((p, i) => [p.id, PERSON_COLORS[i % PERSON_COLORS.length]]));

  const todayKey = dayKey(new Date());
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const u = str(sp.u);
  const m = str(sp.m);
  const d = str(sp.d);
  const params: Params = {
    tab: sp.tab === "doc" ? "doc" : "calendar",
    u: u && profiles.some((p) => p.id === u) ? u : null,
    m: m && /^\d{4}-\d{2}$/.test(m) ? m : todayKey.slice(0, 7),
    d: d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null,
    range: parseRange(sp.range),
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4 sm:px-6 sm:pt-8">
      <Header userId={user.id} name={me.display_name} current="reports" />
      <h1 className="mb-5 px-1 text-2xl font-semibold tracking-tight">Reports</h1>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <Link href={href(params, { u: null, d: null })} className={pill(!params.u)} scroll={false}>
          All
        </Link>
        {profiles.map((p) => (
          <Link key={p.id} href={href(params, { u: p.id, d: null })} className={pill(params.u === p.id)} scroll={false}>
            {p.display_name}
          </Link>
        ))}
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-line bg-surface p-1 shadow-card" role="tablist">
        {(
          [
            ["calendar", "Calendar"],
            ["doc", "Combined report"],
          ] as const
        ).map(([t, title]) => (
          <Link
            key={t}
            role="tab"
            aria-selected={params.tab === t}
            href={href(params, { tab: t })}
            scroll={false}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-sm transition-colors ${
              params.tab === t ? "bg-accent-soft font-medium text-accent-hover" : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {title}
          </Link>
        ))}
      </div>

      {params.tab === "calendar" ? (
        <Calendar supabase={supabase} params={params} profiles={profiles} color={color} todayKey={todayKey} />
      ) : (
        <Doc supabase={supabase} params={params} profiles={profiles} />
      )}
    </main>
  );
}

async function Calendar({
  supabase,
  params,
  profiles,
  color,
  todayKey,
}: {
  supabase: SupabaseClient;
  params: Params;
  profiles: Profile[];
  color: Map<string, string>;
  todayKey: string;
}) {
  const first = `${params.m}-01`;
  const gridStart = weekStartKey(first);
  const nextMonthFirst = `${shiftMonth(params.m, 1)}-01`;
  const gridEnd = addDays(weekStartKey(addDays(nextMonthFirst, -1)), 7); // exclusive

  let q = supabase
    .from("sessions")
    .select("id, user_id, started_at, ended_at, minutes, report")
    .gte("started_at", dayStartUtc(gridStart))
    .lt("started_at", dayStartUtc(gridEnd))
    .limit(5000);
  if (params.u) q = q.eq("user_id", params.u);
  const { data, error } = await q.returns<ReportSession[]>();
  const sessions = data ?? [];

  const byDay = new Map<string, ReportSession[]>();
  for (const s of sessions) {
    const k = dayKey(s.started_at);
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }

  const days: string[] = [];
  for (let k = gridStart; k < gridEnd; k = addDays(k, 1)) days.push(k);

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const selected = params.d ? groupByPerson(byDay.get(params.d) ?? [], profileById) : null;

  return (
    <>
      <section className={card}>
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={href(params, { m: shiftMonth(params.m, -1), d: null })}
            scroll={false}
            className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Previous month"
          >
            ←
          </Link>
          <span className="font-medium capitalize">{monthFmt.format(new Date(`${first}T00:00:00Z`))}</span>
          <Link
            href={href(params, { m: shiftMonth(params.m, 1), d: null })}
            scroll={false}
            className="rounded-lg px-3 py-1.5 text-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Next month"
          >
            →
          </Link>
        </div>
        {error && <p className="mb-3 text-sm text-danger">{error.message}</p>}
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
          {WEEKDAYS.map((w) => (
            <span key={w} className="pb-1">
              {w}
            </span>
          ))}
          {days.map((k) => {
            const list = byDay.get(k) ?? [];
            const minutes = list.reduce((t, s) => t + s.minutes, 0);
            const people = [...new Set(list.map((s) => s.user_id))];
            const inMonth = k.startsWith(params.m);
            const isToday = k === todayKey;
            const isSel = k === params.d;
            return (
              <Link
                key={k}
                href={href(params, { d: isSel ? null : k })}
                scroll={false}
                className={`flex aspect-square flex-col items-center justify-between rounded-lg border p-1 transition-colors sm:p-1.5 ${
                  isSel ? "border-accent ring-2 ring-accent/15" : isToday ? "border-accent/60" : "border-transparent hover:border-line-strong"
                } ${minutes ? "bg-surface-2" : ""} ${inMonth ? "" : "opacity-35"}`}
              >
                <span className={`self-start text-[11px] leading-none ${isToday ? "font-semibold text-accent" : "text-ink/70"}`}>
                  {Number(k.slice(8))}
                </span>
                {minutes > 0 && (
                  <span className="text-[11px] font-medium leading-none tabular-nums text-ink sm:text-xs">{formatHours(minutes)}</span>
                )}
                <span className="flex h-1.5 gap-0.5">
                  {people.map((id) => (
                    <span key={id} className="size-1.5 rounded-full" style={{ background: color.get(id) }} />
                  ))}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {profiles.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: color.get(p.id) }} />
              {p.display_name}
            </span>
          ))}
        </div>
      </section>

      {params.d && selected && (
        <section className={`${card} mt-4`}>
          <h2 className="mb-4 text-lg font-semibold capitalize">{formatDayKey(params.d)}</h2>
          {selected.length === 0 ? (
            <p className="text-muted">Nobody studied this day.</p>
          ) : (
            <div className="flex max-w-[65ch] flex-col gap-6">
              {selected.map((p) => (
                <PersonBlock key={p.profile.id} name={p.profile.display_name} minutes={p.minutes} sessions={p.sessions} />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function PersonBlock({ name, minutes, sessions }: { name: string; minutes: number; sessions: ReportSession[] }) {
  return (
    <div>
      <p className="font-medium">
        {name} <span className="font-normal text-muted">· {formatMinutes(minutes)}</span>
      </p>
      {sessions.map((s) => (
        <div key={s.id} className="mt-2">
          <p className="text-sm text-muted">
            {formatTime(s.started_at)}–{formatTime(s.ended_at)} · {formatMinutes(s.minutes)}
          </p>
          <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed">{s.report}</p>
        </div>
      ))}
    </div>
  );
}

const STATUS_CLASS: Record<GoalStatus, string> = {
  pending: "text-muted",
  done: "text-live",
  partial: "text-warn",
  missed: "text-danger",
};

async function Doc({ supabase, params, profiles }: { supabase: SupabaseClient; params: Params; profiles: Profile[] }) {
  const { weeks, error } = await loadReportDoc(supabase, profiles, params.range, params.u);
  const exportHref = `/api/export?range=${params.range}${params.u ? `&u=${params.u}` : ""}`;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <Link key={r.value} href={href(params, { range: r.value })} scroll={false} className={pill(params.range === r.value)}>
              {r.label}
            </Link>
          ))}
        </div>
        <a href={exportHref} download className={`${btnSecondary} h-10 px-4 text-sm`}>
          Download .md
        </a>
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <article className="flex flex-col gap-4">
        {weeks.length === 0 && <p className={`${card} text-muted`}>No reports for this period.</p>}
        {weeks.map((w) => (
          <section key={w.weekStart} className={`${card} max-w-none [&>*]:max-w-[65ch]`}>
            <h2 className="border-b border-line pb-3 text-xl font-semibold tracking-tight">
              Week of {formatWeekRange(w.weekStart)}
            </h2>
            <ul className="mt-4 space-y-3">
              {w.people.map((p) => (
                <li key={p.profile.id} className="leading-relaxed">
                  <span className="font-medium">{p.profile.display_name}</span>
                  <span className="text-muted"> · {formatHours(p.minutes)}h</span>
                  <br />
                  {p.goal ? (
                    <>
                      <span className="text-ink/80">Goal: {p.goal.goal_text}</span>{" "}
                      <span className={`text-sm ${STATUS_CLASS[p.goal.status]}`}>
                        ({GOAL_STATUS_LABEL[p.goal.status].toLowerCase()})
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted">No goal set</span>
                  )}
                </li>
              ))}
            </ul>

            {w.days.map((d) => (
              <div key={d.key} className="mt-8">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">{formatDayKey(d.key)}</h3>
                <div className="flex flex-col gap-5">
                  {d.people.map((p) => (
                    <PersonBlock key={p.profile.id} name={p.profile.display_name} minutes={p.minutes} sessions={p.sessions} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </article>
    </>
  );
}
