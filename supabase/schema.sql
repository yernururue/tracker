-- Study tracker schema. Paste into Supabase → SQL Editor → Run.
-- Safe to re-run: drops and recreates functions and policies, creates tables if missing.

-- ============ Tables ============

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.active_timers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  accumulated_ms bigint not null default 0 check (accumulated_ms >= 0),
  running_since timestamptz -- null = paused
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  minutes integer not null check (minutes between 1 and 960),
  report text not null check (char_length(btrim(report)) >= 10),
  created_at timestamptz not null default now()
);

create table if not exists public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null, -- Monday of the week, Asia/Almaty
  goal_text text not null check (char_length(btrim(goal_text)) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'done', 'partial', 'missed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists weekly_goals_touch on public.weekly_goals;
create trigger weekly_goals_touch before update on public.weekly_goals
  for each row execute function public.touch_updated_at();

create index if not exists sessions_user_started_idx on public.sessions (user_id, started_at desc);
create index if not exists sessions_started_idx on public.sessions (started_at desc);
create index if not exists sessions_created_idx on public.sessions (created_at desc);

-- All-time minutes per user (security_invoker so RLS of sessions applies).
create or replace view public.user_totals
with (security_invoker = true) as
  select user_id, sum(minutes)::bigint as total_minutes
  from public.sessions
  group by user_id;

grant select on public.user_totals to authenticated;
revoke select on public.user_totals from anon;

-- Instructions modal is shown automatically once.
alter table public.profiles add column if not exists seen_instructions boolean not null default false;

-- Daily goal was removed from the app.
alter table public.profiles drop column if exists daily_goal_minutes;

-- ============ Row Level Security ============
-- Everyone signed in can read everything; each user writes only their own rows.

alter table public.profiles enable row level security;
alter table public.active_timers enable row level security;
alter table public.sessions enable row level security;
alter table public.weekly_goals enable row level security;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles_delete" on public.profiles for delete to authenticated using (id = (select auth.uid()));

drop policy if exists "timers_select" on public.active_timers;
drop policy if exists "timers_insert" on public.active_timers;
drop policy if exists "timers_update" on public.active_timers;
drop policy if exists "timers_delete" on public.active_timers;
create policy "timers_select" on public.active_timers for select to authenticated using (true);
create policy "timers_insert" on public.active_timers for insert to authenticated with check (user_id = (select auth.uid()));
create policy "timers_update" on public.active_timers for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "timers_delete" on public.active_timers for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "sessions_select" on public.sessions;
drop policy if exists "sessions_insert" on public.sessions;
drop policy if exists "sessions_update" on public.sessions;
drop policy if exists "sessions_delete" on public.sessions;
create policy "sessions_select" on public.sessions for select to authenticated using (true);
create policy "sessions_insert" on public.sessions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "sessions_update" on public.sessions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sessions_delete" on public.sessions for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "goals_select" on public.weekly_goals;
drop policy if exists "goals_insert" on public.weekly_goals;
drop policy if exists "goals_update" on public.weekly_goals;
drop policy if exists "goals_delete" on public.weekly_goals;
create policy "goals_select" on public.weekly_goals for select to authenticated using (true);
create policy "goals_insert" on public.weekly_goals for insert to authenticated with check (user_id = (select auth.uid()));
create policy "goals_update" on public.weekly_goals for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "goals_delete" on public.weekly_goals for delete to authenticated using (user_id = (select auth.uid()));

-- ============ Timer functions ============
-- All timestamps come from the database clock (now()), so devices with skewed
-- clocks agree. Functions run as the caller (security invoker) so RLS applies.
-- Each returns { timer: <active_timers row or null>, now: <server time> }.

drop function if exists public.start_timer();
drop function if exists public.pause_timer();
drop function if exists public.resume_timer();
drop function if exists public.discard_timer();
drop function if exists public.finish_session(integer, text);

create function public.start_timer()
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t public.active_timers;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.active_timers (user_id, started_at, accumulated_ms, running_since)
  values (uid, now(), 0, now())
  on conflict (user_id) do nothing;
  select * into t from public.active_timers where user_id = uid;
  return json_build_object('timer', row_to_json(t), 'now', now());
end;
$$;

create function public.pause_timer()
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t public.active_timers;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.active_timers
     set accumulated_ms = accumulated_ms
           + greatest(0, floor(extract(epoch from (now() - running_since)) * 1000))::bigint,
         running_since = null
   where user_id = uid and running_since is not null;
  select * into t from public.active_timers where user_id = uid;
  return json_build_object('timer', row_to_json(t), 'now', now());
end;
$$;

create function public.resume_timer()
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t public.active_timers;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  update public.active_timers
     set running_since = now()
   where user_id = uid and running_since is null;
  select * into t from public.active_timers where user_id = uid;
  return json_build_object('timer', row_to_json(t), 'now', now());
end;
$$;

create function public.discard_timer()
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  delete from public.active_timers where user_id = uid;
  return json_build_object('timer', null, 'now', now());
end;
$$;

-- Saves the session and removes the active timer in one transaction.
create function public.finish_session(p_minutes integer, p_report text)
returns json
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  t public.active_timers;
  sid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into t from public.active_timers where user_id = uid for update;
  if not found then raise exception 'no active timer'; end if;

  insert into public.sessions (user_id, started_at, ended_at, minutes, report)
  values (uid, t.started_at, now(), p_minutes, btrim(p_report))
  returning id into sid;

  delete from public.active_timers where user_id = uid;
  return json_build_object('timer', null, 'now', now(), 'session_id', sid);
end;
$$;

revoke execute on function public.start_timer() from public, anon;
revoke execute on function public.pause_timer() from public, anon;
revoke execute on function public.resume_timer() from public, anon;
revoke execute on function public.discard_timer() from public, anon;
revoke execute on function public.finish_session(integer, text) from public, anon;
grant execute on function public.start_timer() to authenticated;
grant execute on function public.pause_timer() to authenticated;
grant execute on function public.resume_timer() to authenticated;
grant execute on function public.discard_timer() to authenticated;
grant execute on function public.finish_session(integer, text) to authenticated;
