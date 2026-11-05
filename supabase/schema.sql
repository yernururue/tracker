-- Study tracker schema. Paste into Supabase → SQL Editor → Run.
-- Safe to re-run: drops and recreates functions and policies, creates tables if missing.

-- ============ Tables ============

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  daily_goal_minutes integer not null default 120 check (daily_goal_minutes between 1 and 960),
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

create index if not exists sessions_user_started_idx on public.sessions (user_id, started_at desc);
create index if not exists sessions_started_idx on public.sessions (started_at desc);
create index if not exists sessions_created_idx on public.sessions (created_at desc);

-- ============ Row Level Security ============
-- Everyone signed in can read everything; each user writes only their own rows.

alter table public.profiles enable row level security;
alter table public.active_timers enable row level security;
alter table public.sessions enable row level security;

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
