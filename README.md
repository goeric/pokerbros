# PokerBros

**A modern web app for running monthly home poker games — RSVPs, waitlists, live buy-in tracking, balanced cash-outs, and lifetime player stats.**

🃏 **Live:** [pokerbros.xyz](https://pokerbros.xyz)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Features

- **🎴 Game management** — schedule games, edit details, cancel with calendar updates
- **📋 Smart RSVPs** — 8-seat limit with automatic waitlist promotion when someone drops
- **💰 Live buy-in tracking** — admins record buy-ins and rebuys in real time during the game
- **📊 Cash-out validation** — books must balance (total in = total out) before a game can be finalized
- **🏆 Lifetime player stats** — leaderboards, biggest win/loss, profit history, ranking
- **📧 Email notifications** — RSVP confirmations with `.ics` calendar invites, waitlist promotions, game updates, cancellations (powered by Resend + React Email)
- **🔐 Google OAuth** — admin-only access for game/player management; superadmin role for elevated permissions
- **🚩 Feature flags** — runtime toggles via the admin settings page (e.g., email safety mode)
- **📱 Mobile-first** — casino glassmorphism design that works edge-to-edge on phones

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS — casino glassmorphism theme with gold accents |
| Icons | Phosphor Icons |
| Database | Supabase Postgres (with Row Level Security) |
| Auth | Supabase Auth + Google OAuth |
| Email | Resend + React Email + `.ics` calendar invites |
| Testing | Jest + React Testing Library |
| Hosting | Vercel |
| Package manager | pnpm |

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/installation)
- [Docker Desktop](https://docs.docker.com/desktop/) (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### 1. Clone and install

```bash
git clone https://github.com/goeric/pokerbros.git
cd pokerbros
pnpm install
```

### 2. Start local Supabase

```bash
supabase start
```

Copy the `API URL` and `anon key` from the output — you'll need them next.

### 3. Configure environment variables

Create `.env.local` from the template:

```bash
cp .env.local.example .env.local
```

Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321   # use localhost, NOT 127.0.0.1
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<your Google OAuth client id>
GOOGLE_CLIENT_SECRET=<your Google OAuth client secret>
RESEND_API_KEY=<optional — for email>
```

### 4. Create your superadmin

After signing in with Google for the first time, promote yourself in Supabase Studio (http://localhost:54323) by running:

```sql
-- scripts/add-superadmin.sql
-- (edit the email to match your Google login)
```

### 5. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

📖 Full setup walkthrough: [`SETUP_AUTH.md`](./SETUP_AUTH.md) · Quick reference: [`LOCAL_SETUP_SUMMARY.md`](./LOCAL_SETUP_SUMMARY.md) · Backend architecture: [`backend.md`](./backend.md)

## Scripts

```bash
pnpm dev              # Dev server (localhost:3000)
pnpm build            # Production build
pnpm start            # Run production build locally
pnpm lint             # Next.js ESLint
pnpm tsc --noEmit     # Type-check (no emit)

pnpm test             # All tests
pnpm test:watch       # Watch mode
pnpm test:p0          # P0 critical tests (cash-out, RSVPs, auth)
pnpm test:coverage    # Coverage report

supabase start        # Start local Supabase stack (Docker)
supabase stop         # Stop it
supabase db push      # Apply pending migrations (preserves data — preferred)
supabase migration new <name>   # Scaffold a new migration
```

> ⚠️ **Never run `supabase db reset` casually** — it wipes all local data. Use `supabase db push` for incremental changes.

## Project Structure

```
pokerbros/
├── app/                      # Next.js App Router
│   ├── admin/                # Admin CMS (player + game management)
│   ├── auth/callback/        # OAuth callback route
│   ├── game/[id]/            # Game detail
│   │   ├── live/             # Live buy-in tracker
│   │   ├── cashout/          # Cash-out + validation
│   │   ├── results/          # Read-only results
│   │   └── action/           # Server actions for the game flow
│   ├── login/                # OAuth sign-in
│   ├── stats/                # Leaderboard
│   └── layout.tsx            # Root layout (force-dynamic for auth freshness)
├── components/               # Reusable UI (GameCard, PodiumCard, Modal, …)
├── lib/
│   ├── auth-server.ts        # Server-side auth helper (getServerAuth)
│   ├── auth-context.tsx      # Client-side auth actions only
│   ├── supabase.ts           # Browser Supabase client
│   ├── email/                # Resend integration + .ics generation
│   └── utils.ts              # Currency, date, name formatters
├── emails/templates/         # React Email templates
├── supabase/migrations/      # Versioned SQL migrations
├── __tests__/                # Jest test suites (incl. P0 critical)
└── types/                    # Shared TypeScript types
```

## Architecture Highlights

- **Server-first auth.** `getServerAuth()` resolves the session in Server Components and is passed down as props — no client-side flash, no race conditions.
- **Server Actions for mutations.** No REST/RPC layer; mutations live next to the pages that trigger them, with `revalidatePath` for cache invalidation.
- **Row Level Security.** Public read where appropriate; writes gated to authenticated admins at the database level. Auth isn't just a frontend gate.
- **Automatic live detection.** Games flip to "live" once their scheduled start passes, even if the status hasn't been updated explicitly.
- **Calendar integration.** RSVP confirmations include a `.ics` attachment with a stable UID so updates modify the same calendar event.

## Testing

P0 (critical) suites cover the business logic with the highest blast radius:

- **Cash-out validation** — financial integrity (12 tests)
- **RSVP auto-promotion** — waitlist handling (8 tests)
- **RSVP seat limit** — 8-seat cap enforcement (7 tests)
- **Authorization** — session checks and admin-only actions (6 tests)

Before deploying to production, all of the following must pass:

```bash
pnpm test:p0
pnpm test
pnpm tsc --noEmit
pnpm build
```

## Deployment

Deployed to Vercel. The required production env vars are:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` — e.g. `https://pokerbros.xyz`
- `RESEND_API_KEY`

Google OAuth is configured via the Supabase Dashboard → Authentication → Providers. Make sure both `https://pokerbros.xyz/auth/callback` and any preview/`www` variants are in the allowed redirect URLs.

## Contributing

This started as a personal project for monthly home games, but PRs are welcome — bug fixes, polish, new features. Open an issue first for anything substantial.

## License

[MIT](./LICENSE) — use it for your own poker night.
