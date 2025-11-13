# Repository Guidelines

## Project Structure & Module Organization
The Next.js App Router lives under `app/`, with key routes like `/game/[id]`, `/stats`, `/admin`, and `/login`. Shared UI primitives sit in `components/`, domain helpers (`lib/store.ts`, `lib/auth-context.tsx`, `lib/supabase.ts`) and generated types (`types/`) centralize logic, and styling/config files (`app/globals.css`, `tailwind.config.ts`, `postcss.config.js`) back the theme system. Middleware-driven access control stays in `middleware.ts`, while Supabase config and migrations live in `supabase/`.

## Build, Test, and Development Commands
- `npm run dev` – Starts the Next.js dev server on http://localhost:3000.
- `npm run build` / `npm start` – Compile and run the production bundle.
- `npm run lint` – Runs the Next.js ESLint preset; treat warnings as blockers.
- `npx tsc --noEmit` – Type-check strict configs without generating files.
- `supabase start` / `supabase stop` / `supabase db reset` – Manage the local Supabase stack described in `LOCAL_SETUP_SUMMARY.md`.

## Coding Style & Naming Conventions
Use TypeScript strict mode (`tsconfig.json`) and prefer server components, pushing interactive bits into files like `app/page-client.tsx`. Keep route-specific logic colocated within that route tree, but promote reusable UI into `components/` or `lib/`. Name files in kebab-case, components in PascalCase, hooks/utilities in camelCase, and import shared code with the `@/*` alias. Keep Tailwind utility chains short and extract repeat clusters into design-system components.

## Testing Guidelines
No automated suites are committed yet, so every feature must land with tests. Favor `next/jest` + React Testing Library for component logic (co-locate as `<name>.test.tsx`) and add Playwright or Cypress smoke coverage for RSVP transitions, cash-out validation, and admin CRUD. Target ≥80 % statement coverage on touched modules and describe any gaps in the PR body.

## Commit & Pull Request Guidelines
Upstream history follows Conventional Commits—use `type(scope): summary`, e.g., `feat(app): add cash-out validation banner`. Keep commits focused and call out Supabase migration or env changes inside the body. Pull requests must include a purpose summary, screenshots/GIFs for UI shifts, reproduction or test instructions, linked issue, and a checklist confirming lint, type-check, and Supabase lifecycle commands when relevant.

## Security & Configuration Tips
Never commit `.env.local`, Supabase service-role keys, or anything under `supabase/.temp`. Update `SETUP_AUTH.md` when auth flows change, and re-run `supabase db reset` after editing migrations to ensure they still apply. Any new admin endpoints must be registered in `middleware.ts` and backed by updated RLS inside `supabase/migrations/20251112222811_add_auth_and_admin.sql`.
