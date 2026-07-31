# Atlas scripts

Helper scripts and CI glue for the `atlas` monorepo.

## `db-sync.sh`

Keeps the local Supabase migrations and `src/types/database.ts` in lockstep with
the remote Supabase project — both directions.

```bash
# Pull schema from the remote project, regenerate types, ready to commit
npm run db:sync

# Same, but exit 1 if it would change any tracked file.
# This is what CI runs.
npm run db:drift-check
```

### What it does

1. Verifies the Supabase CLI is installed.
2. Runs `supabase db pull` to capture any changes made in the Dashboard as a new
   migration file in `supabase/migrations/`.
3. Runs `supabase gen types typescript --linked` and writes the output to
   `src/types/database.ts`.
4. Prompts you to commit:

```text
git add supabase/migrations/ src/types/database.ts
git commit -m "feat(db): schema sync"
```

### Two-direction sync model

```text
  ┌─────────────────────────────────┐
  │  supabase/migrations/*.sql      │  ◀── source of truth
  │  src/types/database.ts          │      (commit these to git)
  └─────────────────────────────────┘
              ▲        ▲
              │        │
   npm run db:push    npm run db:pull
              │        │
              ▼        ▼
          ┌─────────────────────┐
          │   Supabase project  │
          │   (Dashboard / SQL) │
          └─────────────────────┘
```

`db:sync` always pulls first, so any Dashboard edits become migration files in
your repo. No silent state.

## Required environment

The script assumes `supabase link` has been run once:

```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
```

After linking, a `supabase/config.toml` is written so the script can find the
project automatically.

## CI

`.github/workflows/db-drift.yml` runs `npm run db:drift-check` on every push and PR
that touches `supabase/**` or `src/types/database.ts`. Required GitHub secrets:

- `SUPABASE_ACCESS_TOKEN` — from https://supabase.com/dashboard/account/tokens
- `SUPABASE_PROJECT_ID`   — the project ref from the dashboard URL
- `SUPABASE_DB_URL`       — the direct connection string (used for `db pull`)

When the CI fails, the workflow prints exactly which files changed so you can
fix them locally with `npm run db:sync`, commit, and push.
