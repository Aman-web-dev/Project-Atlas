-- Atlas — BYOK (Bring Your Own Key) + self-managed usage & caps.
-- Run with: supabase db push  OR  paste into the Supabase SQL editor.
--
-- Idempotent: safe to run multiple times.

-- ============================================================================
-- user_api_keys: per-user API keys, encrypted via Supabase Vault.
-- We never store plaintext in this table — only a handle (secret_id) into
-- vault.secrets plus safe display metadata (last4, verify status).
-- ============================================================================
create table if not exists public.user_api_keys (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  provider         text not null check (provider in ('openai','anthropic','google','minimax')),
  label            text,
  secret_id        uuid not null,
  key_last4        text,
  verify_status    text not null default 'unknown'
                     check (verify_status in ('unknown','ok','invalid')),
  verify_message   text,
  created_at       timestamptz not null default now(),
  last_used_at     timestamptz,
  last_verified_at timestamptz,
  unique (user_id, provider)
);

create index if not exists user_api_keys_user_idx
  on public.user_api_keys (user_id);

alter table public.user_api_keys enable row level security;

drop policy if exists "user_api_keys_self_select" on public.user_api_keys;
create policy "user_api_keys_self_select"
  on public.user_api_keys for select
  using (auth.uid() = user_id);

drop policy if exists "user_api_keys_self_delete" on public.user_api_keys;
create policy "user_api_keys_self_delete"
  on public.user_api_keys for delete
  using (auth.uid() = user_id);

-- Inserts/updates happen via service-role client only (we can't write to
-- vault.secrets with an anon JWT), so no INSERT/UPDATE policy is needed.
-- The action verifies auth.uid() === user_id before writing.

-- ============================================================================
-- user_quotas: per-user caps. One row per user, defaults created by trigger.
-- ============================================================================
create table if not exists public.user_quotas (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  monthly_budget_usd   numeric(10,4) not null default 25.0000,
  copy_budget_usd      numeric(10,4) not null default 10.0000,
  image_budget_usd     numeric(10,4) not null default 15.0000,
  monthly_request_cap  int          not null default 1000,
  enforce_caps         boolean      not null default true,
  updated_at           timestamptz  not null default now()
);

alter table public.user_quotas enable row level security;

drop policy if exists "user_quotas_self_select" on public.user_quotas;
create policy "user_quotas_self_select"
  on public.user_quotas for select
  using (auth.uid() = user_id);

drop policy if exists "user_quotas_self_update" on public.user_quotas;
create policy "user_quotas_self_update"
  on public.user_quotas for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_quotas_self_insert" on public.user_quotas;
create policy "user_quotas_self_insert"
  on public.user_quotas for insert
  with check (auth.uid() = user_id);

-- ============================================================================
-- usage_events: append-only log of every AI call. Drives both the dashboard
-- counters and the user's self-managed usage view.
-- ============================================================================
create table if not exists public.usage_events (
  id            bigserial primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  feature       text not null check (feature in ('copy','image')),
  provider      text not null,
  model         text not null,
  status        text not null check (status in ('ok','error','denied')),
  http_status   int,
  input_tokens  int          not null default 0,
  output_tokens int          not null default 0,
  image_count   int          not null default 0,
  est_cost_usd  numeric(10,6) not null default 0,
  prompt_chars  int,
  error_code    text,
  created_at    timestamptz  not null default now()
);

create index if not exists usage_events_user_created_idx
  on public.usage_events (user_id, created_at desc);
create index if not exists usage_events_user_feature_created_idx
  on public.usage_events (user_id, feature, created_at desc);
create index if not exists usage_events_user_status_created_idx
  on public.usage_events (user_id, status, created_at desc);

alter table public.usage_events enable row level security;

drop policy if exists "usage_events_self_read" on public.usage_events;
create policy "usage_events_self_read"
  on public.usage_events for select
  using (auth.uid() = user_id);

-- Writes happen from server actions (service-role client).

-- ============================================================================
-- user_usage_monthly: per-user, per-feature rollup of OK events.
-- ============================================================================
create or replace view public.user_usage_monthly as
select
  user_id,
  date_trunc('month', created_at) as month,
  feature,
  count(*)                              as requests,
  coalesce(sum(image_count),0)         as images,
  coalesce(sum(input_tokens),0)        as input_tokens,
  coalesce(sum(output_tokens),0)       as output_tokens,
  coalesce(sum(est_cost_usd),0)        as est_cost_usd
from public.usage_events
where status = 'ok'
group by user_id, date_trunc('month', created_at), feature;

-- ============================================================================
-- Default quota row on signup
-- ============================================================================
create or replace function public.handle_new_user_quotas()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_quotas (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_quotas on auth.users;
create trigger on_auth_user_created_quotas
  after insert on auth.users
  for each row execute function public.handle_new_user_quotas();

-- Backfill quotas for any existing users that don't have one.
insert into public.user_quotas (user_id)
select id from auth.users
on conflict (user_id) do nothing;
