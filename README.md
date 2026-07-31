# Project Atlas

> **One interface for the entire advertising ecosystem.**

Project Atlas is an AI-powered advertising platform for businesses and creators.
Generate copy, design creatives, manage assets, and let autonomous agents optimize
your spend — without ever leaving the dashboard.

This repository holds the **Phase 1 (MVP)** implementation:

- ✅ AI copy generation
- ✅ AI image generation
- ✅ Brand kit
- ✅ Asset library

Future phases (visual editor, multi-platform publishing, analytics, autonomous
agents) are scaffolded but not yet implemented.

## Repository layout

The Next.js app lives at the repository root (no subdirectory) so paths are short
and tooling just works.

```text
.
├── src/                      # Next.js 15 frontend (App Router)
│   ├── app/                  # Pages
│   │   ├── (auth)/           # /login, /signup
│   │   ├── dashboard/        # Authenticated app shell
│   │   │   ├── generate/     # AI copy & image generators
│   │   │   ├── brand-kit/    # Brand identity editor
│   │   │   ├── assets/       # Asset library
│   │   │   ├── layout.tsx    # Authenticated shell (sidebar + header)
│   │   │   └── page.tsx      # Overview
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Landing page
│   ├── components/           # Reusable UI (shadcn/ui based)
│   │   ├── ui/               # Base components
│   │   └── dashboard/        # Sidebar, header, etc.
│   ├── lib/
│   │   ├── ai/               # AI client wrappers (call Lambda functions)
│   │   ├── supabase/         # Supabase clients (client/server/middleware)
│   │   └── utils.ts          # cn() and helpers
│   └── types/                # Database types
├── middleware.ts             # Next.js middleware (auth)
├── next.config.ts
├── supabase/
│   ├── migrations/           # SQL migrations applied via `supabase db push`
│   └── README.md
├── lambda/                   # AI Lambda functions (deployed via AWS SAM)
│   ├── ai-copy/              # POST /copy   — generate ad copy
│   ├── ai-image/             # POST /image  — generate ad creatives
│   ├── template.yaml         # SAM template
│   └── README.md
├── idea.md                   # Original product spec (vision, phases, agents)
├── theme.md                  # Visual / stack rules every agent must follow
├── .env.example              # Environment variables template
└── README.md
```

## Tech stack (per `theme.md`)

| Layer       | Choice                                                  |
| ----------- | ------------------------------------------------------- |
| Framework   | **Next.js 15** (App Router, RSC, Server Actions)        |
| Language    | **TypeScript**                                          |
| Styling     | **Tailwind CSS v4** + the project color system          |
| Components  | **shadcn/ui** (Radix + Lucide)                          |
| State       | **Zustand** + React Server Components                    |
| Forms       | **React Hook Form** + **Zod**                           |
| AI backend  | **AWS Lambda** (Node 24) called from the front-end      |
| Database    | **Supabase** (Postgres + Auth + Storage + RLS)          |

Forbidden libraries are listed in `theme.md` — do not introduce them.

## Local development

### 1. Configure environment

```bash
cp .env.example .env
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
# Leave the LAMBDA_*_URL blank during early dev — the front-end falls back
# to a built-in heuristic generator.
```

### 2. Set up Supabase

```bash
cd supabase
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste `supabase/migrations/0001_init.sql` into the Supabase SQL editor.

### 3. Start the app

```bash
npm install
npm run dev
# → http://localhost:3000
```

### 4. (Optional) Deploy the AI Lambdas

```bash
cd lambda
sam build
sam deploy --guided
# After deploy, copy the API URLs into .env
```

## Order of operations (per `idea.md`)

1. **AI ad generation**     — ✅ done
2. **Creative editor**      — ⏳ Phase 2 (Fabric.js + dnd-kit)
3. **Asset management**     — ✅ done
4. **Campaign management**  — ⏳ upcoming
5. **Platform integrations** — ⏳ Phase 3
6. **Analytics**            — ⏳ Phase 5 (Recharts)
7. **Autonomous agents**    — ⏳ Phase 6

## Agent rules

Every contributor (human or AI) must follow:

1. Be cost-conscious.
2. Never expose credentials.
3. Log every action.
4. Avoid duplicate work.
5. Retry failed operations.
6. Respect rate limits.
7. Request human approval for destructive actions.
8. Maintain complete audit logs.

See `theme.md` for the full design & implementation rules.
