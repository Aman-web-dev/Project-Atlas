# Atlas — Supabase

This folder contains the database migrations and configuration for Project Atlas.

## Quick start

```bash
# 1. Install the Supabase CLI
brew install supabase/tap/supabase    # macOS
# or: https://github.com/supabase/cli

# 2. Link to your project
supabase login
supabase link --project-ref <your-project-ref>

# 3. Push migrations
supabase db push

# 4. Set environment variables in atlas/.env
#    NEXT_PUBLIC_SUPABASE_URL
#    NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Schema

See `migrations/0001_init.sql`. The MVP includes:

| Table            | Purpose                                                  |
| ---------------- | -------------------------------------------------------- |
| `profiles`       | Public mirror of `auth.users` with display fields.       |
| `brand_kits`     | Brand identity (colors, fonts, logos) per user.         |
| `assets`         | Uploaded and generated assets per user.                  |
| `generated_copy` | Audit trail of every AI copy generation.                |

Plus a `assets` storage bucket for uploads.

## Row Level Security

All tables have **strict owner-only** policies. Atlas only ever reads rows
where `auth.uid() = user_id`. This is enforced via Postgres RLS — not just the
front-end.

## Auth

- Use `signInWithPassword()` for email/password login.
- Use `signUp()` with `emailRedirectTo` for sign-up confirmation.
- The `handle_new_user` trigger automatically populates `public.profiles`
  the first time a user signs up.

## Storage

The `assets` bucket is public-read for signed-URL-friendly CDN delivery.
Uploads are restricted to authenticated users via the `asset_uploads_owner`
policy.
