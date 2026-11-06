-- Individual weekly goals. Run once in Supabase SQL Editor before deploying the UI.
-- Safe to re-run: only the original one-goal schema needs a backfill.
begin;

set local lock_timeout = '5s';
lock table public.weekly_goals in access exclusive mode;

do $$
declare
  legacy public.weekly_goals%rowtype;
  line text;
  marker text[];
  items text[];
  item_text text;
  expected_number integer;
  valid_list boolean;
  item_number integer;
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.weekly_goals'::regclass
      and conname = 'weekly_goals_user_id_week_start_key'
      and contype = 'u'
  ) then
    return;
  end if;

  alter table public.weekly_goals
    drop constraint weekly_goals_user_id_week_start_key;

  -- Preserve historical updated_at values while replacing legacy numbered text.
  -- This trigger is restored before commit; a failed migration rolls everything back.
  alter table public.weekly_goals disable trigger weekly_goals_touch;

  for legacy in
    select * from public.weekly_goals
    where goal_text like '%' || chr(10) || '%'
    order by created_at, id
    for update
  loop
    items := array[]::text[];
    item_text := null;
    expected_number := 1;
    valid_list := true;

    foreach line in array string_to_array(replace(legacy.goal_text, E'\r\n', E'\n'), E'\n')
    loop
      marker := regexp_match(line, '^[[:blank:]]*([0-9]+)[.](?![0-9])[[:blank:]]*(.*)$');

      if marker is not null then
        -- Only an uninterrupted 1., 2., ... sequence is an unambiguous list.
        -- Compare text instead of casting user-entered numbers to integers.
        if marker[1] <> expected_number::text then
          valid_list := false;
          exit;
        end if;

        if item_text is not null then
          item_text := btrim(item_text, E' \t\n\r');
          if item_text = '' then
            valid_list := false;
            exit;
          end if;
          items := array_append(items, item_text);
        end if;

        item_text := marker[2];
        expected_number := expected_number + 1;
      elsif item_text is null then
        -- Ignore blank leading lines, but never discard introductory prose.
        if btrim(line, E' \t\r') <> '' then
          valid_list := false;
          exit;
        end if;
      else
        -- Continuation lines stay with the goal they belong to.
        item_text := item_text || E'\n' || line;
      end if;
    end loop;

    if not valid_list or item_text is null then
      continue;
    end if;

    item_text := btrim(item_text, E' \t\n\r');
    if item_text = '' then
      continue;
    end if;
    items := array_append(items, item_text);
    if cardinality(items) < 2 then
      continue;
    end if;

    -- Keep the original ID and timestamps for the first goal.
    update public.weekly_goals set goal_text = items[1] where id = legacy.id;

    for item_number in 2..cardinality(items)
    loop
      insert into public.weekly_goals
        (user_id, week_start, goal_text, status, created_at, updated_at)
      values
        (legacy.user_id, legacy.week_start, items[item_number], legacy.status,
         legacy.created_at + (item_number - 1) * interval '1 microsecond', legacy.updated_at);
    end loop;
  end loop;

  alter table public.weekly_goals enable trigger weekly_goals_touch;
end;
$$;

create index if not exists weekly_goals_user_week_created_idx
  on public.weekly_goals (user_id, week_start, created_at, id);

commit;
