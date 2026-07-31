-- Atlas — Personas (Ideal Customer Profiles) for copywriting.
-- Run with: supabase db push  OR  paste into the Supabase SQL editor.
--
-- Stores per-user ICPs that are fed to the AI Copy generator so every
-- generation speaks to a specific customer (per Paul Ajao's "How I Use an
-- Ideal Customer Profile for Copywriting" framework).
--
-- Idempotent: safe to run multiple times.

create table if not exists public.personas (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  name               text not null,
  demographics       text,
  desires            text not null default '',
  problems           text not null default '',
  voice_of_customer  text not null default '',
  notes              text,
  is_default         boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists personas_user_idx
  on public.personas (user_id, updated_at desc);

alter table public.personas enable row level security;

drop policy if exists "personas_self_select" on public.personas;
create policy "personas_self_select"
  on public.personas for select
  using (auth.uid() = user_id);

drop policy if exists "personas_self_insert" on public.personas;
create policy "personas_self_insert"
  on public.personas for insert
  with check (auth.uid() = user_id);

drop policy if exists "personas_self_update" on public.personas;
create policy "personas_self_update"
  on public.personas for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "personas_self_delete" on public.personas;
create policy "personas_self_delete"
  on public.personas for delete
  using (auth.uid() = user_id);

-- Touch updated_at on row changes.
create or replace function public.touch_personas_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_personas on public.personas;
create trigger touch_personas
  before update on public.personas
  for each row execute function public.touch_personas_updated_at();

-- When a persona is marked default, clear the flag on the user's other
-- personas so there's at most one default per user.
create or replace function public.personas_single_default()
returns trigger language plpgsql as $$
begin
  if new.is_default is true then
    update public.personas
       set is_default = false
     where user_id = new.user_id
       and id <> new.id
       and is_default is true;
  end if;
  return new;
end;
$$;

drop trigger if exists personas_single_default_trigger on public.personas;
create trigger personas_single_default_trigger
  after insert or update of is_default on public.personas
  for each row execute function public.personas_single_default();
