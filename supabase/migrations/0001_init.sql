-- Atlas initial schema (Phase 1 — MVP)
-- Run with: supabase db push
-- Or paste into the Supabase SQL editor.

-- ============================================================================
-- profiles: a public mirror of auth.users with display fields
-- ============================================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  company     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_self_select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_self_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create index if not exists profiles_email_idx on public.profiles (email);

-- Trigger to keep a profile row in sync with auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- brand_kits: logos, fonts, colors per user
-- ============================================================================
create table if not exists public.brand_kits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  primary_color   text,
  secondary_color text,
  accent_color    text,
  font_heading    text,
  font_body       text,
  logo_url        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.brand_kits enable row level security;

create policy "brand_kits_owner_all"
  on public.brand_kits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists brand_kits_user_idx on public.brand_kits (user_id, created_at desc);

-- ============================================================================
-- assets: every image, video, template, generated creative
-- ============================================================================
create type public.asset_type as enum ('image', 'video', 'logo', 'template', 'generated');

create table if not exists public.assets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  type            public.asset_type not null,
  url             text not null,
  thumbnail_url   text,
  size_bytes      bigint,
  width           int,
  height          int,
  format          text,
  tags            text[] not null default '{}',
  prompt          text,
  created_at      timestamptz not null default now()
);

alter table public.assets enable row level security;

create policy "assets_owner_all"
  on public.assets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists assets_user_idx on public.assets (user_id, created_at desc);
create index if not exists assets_type_idx on public.assets (user_id, type);
create index if not exists assets_tags_idx on public.assets using gin (tags);

-- ============================================================================
-- generated_copy: ad-copy outputs from the AI Copy generator
-- ============================================================================
create table if not exists public.generated_copy (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  product_name         text not null,
  product_description  text,
  target_audience      text,
  budget               numeric,
  platform             text not null,
  headlines            text[] not null default '{}',
  descriptions         text[] not null default '{}',
  ctas                 text[] not null default '{}',
  created_at           timestamptz not null default now()
);

alter table public.generated_copy enable row level security;

create policy "generated_copy_owner_all"
  on public.generated_copy for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists generated_copy_user_idx on public.generated_copy (user_id, created_at desc);

-- ============================================================================
-- Supabase Storage: bucket for assets
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

create policy "asset_uploads_owner"
  on storage.objects for insert
  with check (bucket_id = 'assets' and auth.uid() = owner);

create policy "asset_uploads_read"
  on storage.objects for select
  using (bucket_id = 'assets');

-- ============================================================================
-- updated_at trigger
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger touch_brand_kits
  before update on public.brand_kits
  for each row execute function public.touch_updated_at();
