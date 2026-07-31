-- Atlas — Backfill profiles + re-install auth trigger.
-- Run with: supabase db push  OR  paste into the Supabase SQL editor.
--
-- Reason: when sign-ups happen before this migration is applied, the
-- auth.users rows exist but the corresponding public.profiles rows do not.
-- This script:
--   1. Backfills public.profiles for any auth.users that don't have one.
--   2. (Re)installs the handle_new_user function and trigger so future
--      signups are wired correctly.
--
-- Idempotent: safe to run multiple times.

-- 1. Backfill ----------------------------------------------------------------
insert into public.profiles (id, email, full_name)
select
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name'
from auth.users u
on conflict (id) do nothing;

-- 2. Function ----------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3. Trigger -----------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Sanity check ------------------------------------------------------------
-- (Handy if you paste this into the SQL editor — tells you how many rows
--  were just created.)
do $$
declare
  inserted int;
begin
  -- No-op: just reporting.
  select count(*) into inserted from auth.users;
  raise notice 'Auth users in DB: %', inserted;
end
$$;
