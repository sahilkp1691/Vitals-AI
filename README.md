# Vital — Personal Health Intelligence

An AI-powered health logger with 3 specialist agents: Nutritionist, Trainer, and Health Consultant.

**Live app:** https://vitals-phaewqeh1-sahilkp1691-4194s-projects.vercel.app/auth/login

---

## What it does

- Log food, workouts, and symptoms in plain text — AI parses it silently in the background
- Dashboard with goal progress gauge, weekly streak, and last consult summary
- On-demand **Consult** — runs 3 Claude agents in parallel and gives structured advice per domain
- Body composition check-in tracker
- Full log history with filtering

## Tech stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database + Auth:** Supabase (magic link, RLS)
- **AI:** Anthropic Claude (claude-sonnet-4-6)
- **Hosting:** Vercel

## Local setup

```bash
npm install
cp .env.local.example .env.local  # fill in your keys
npm run dev
```

**Required env vars:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

Run `supabase-schema.sql` in your Supabase SQL Editor before first use.
