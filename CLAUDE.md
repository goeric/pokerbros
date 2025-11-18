# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**For detailed backend documentation** (database schema, authentication, RLS policies, migrations), see **[backend.md](./backend.md)**.

## Project Overview

PokerBros is a web application for managing monthly home poker games with real-time money tracking and player statistics. Features Google OAuth authentication for admin access to player management and game administration.

**Tech Stack:**
- Frontend: React/Next.js 16 with TypeScript and App Router
- Styling: Tailwind CSS (dark green poker/casino theme)
- Database: Supabase (local development with Docker)
- Authentication: Supabase Auth with Google OAuth (server-first architecture)
- Deployment: Vercel

## Development Commands

```bash
# Install dependencies
npm install

# Start Supabase local instance (Docker required)
supabase start

# Stop Supabase
supabase stop

# Run development server
npm run dev

# Build for production
npm run build

# Run production build locally
npm start

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Database migrations
supabase migration new <migration_name>  # Create new migration file
supabase db push  # Apply pending migrations to local database (PREFERRED - preserves data)

# ⚠️ IMPORTANT: DO NOT use `supabase db reset` unless absolutely necessary!
# db reset will WIPE ALL DATA and should ONLY be used with explicit user permission
# For incremental changes, ALWAYS use `supabase db push` to preserve existing data

# Run tests (when implemented)
npm test
```

## Architecture Overview

### Data Model

The application has five core entities with specific relationships:

- **AdminUsers**: Users with admin privileges (linked to Supabase Auth). Includes `is_superadmin` flag for elevated permissions
- **Players**: Poker players managed by admins. Stores name, nickname, email, and aggregate statistics
- **Games**: Events with status lifecycle: `upcoming` → `in_progress` → `completed`
- **GamePlayers**: Junction table tracking player participation, buy-ins (array), cash-outs, and calculated profit
- **RSVPs**: Manages seat confirmations with automatic waitlist handling (8 seat limit per game)

**Critical Logic:**
- **Authentication**: Google OAuth via Supabase Auth. Admin users must exist in `admin_users` table
- **Authorization**: RLS policies enforce that only authenticated admins can modify data
- **RSVP auto-promotion**: When a confirmed player cancels, first waitlist player automatically promoted
- **Buy-in tracking**: Array structure allows multiple rebuys per player
- **Profit calculation**: `cashOut - sum(buyIns)` computed in real-time
- **Cash-out validation**: Total in must equal total out before game finalization


### Page Flow Architecture

1. **Dashboard (`/`)**: Public homepage aggregating games by status, shows quick stats from all players
2. **Login (`/login`)**: Google OAuth authentication for admin access
3. **Admin Panel (`/admin`)**: Protected route for player management (CRUD operations)
4. **Game Detail (`/game/[id]`)**: Dynamic page handling three states (upcoming with RSVP, in-progress, completed)
5. **Live Tracker (`/game/[id]/live`)**: Only accessible when game status is `in_progress`
6. **Cash-out (`/game/[id]/cashout`)**: Validation-heavy page ensuring balanced books
7. **Results (`/game/[id]/results`)**: Read-only display with calculated statistics
8. **Stats (`/stats`)**: Aggregated player data with filtering and leaderboard logic

**Protected Routes:**
- `/admin/*` - Requires authenticated admin user (enforced by middleware)

### Authentication Architecture (Server-First)

**IMPORTANT**: We use a server-first auth pattern where auth state is determined on the server and passed as props to client components.

#### Auth Pattern

1. **Server Auth Helper** (`lib/auth-server.ts`):
   ```typescript
   import { getServerAuth } from '@/lib/auth-server';

   // In any Server Component:
   const { user, isAdmin, isSuperAdmin } = await getServerAuth();
   ```

2. **Pass Auth as Props** (Server Component → Client Component):
   ```typescript
   // page.tsx (Server Component)
   export default async function Page() {
     const { user, isAdmin } = await getServerAuth();
     return <ClientComponent user={user} isAdmin={isAdmin} />;
   }

   // page-client.tsx (Client Component)
   export default function ClientComponent({ user, isAdmin }: Props) {
     // Use auth from props, not from context
   }
   ```

3. **Auth Context** (`lib/auth-context.tsx`):
   - **Only provides auth actions**: `signIn`, `signInWithGoogle`, `signOut`
   - **Does NOT provide state**: No `user`, `isAdmin`, `loading`, etc.
   - Only used in components that trigger auth actions (like login page)

**Benefits**:
- No navigation flash on page load
- Server and client agree on auth state from initial render
- Eliminates race conditions and timing issues
- Simpler, more reliable code

**Key Points**:
- Never call `useAuth()` to get user or isAdmin state
- Always pass auth state as props from server components
- Auth context is only for sign-in/sign-out actions

### Server-Side Rendering (SSR) Architecture

**Default Approach**: All pages use Server Components with SSR unless they are static marketing pages.

#### SSR Pattern (Required for all dynamic pages)

1. **Server Component (`page.tsx`)** - Fetch data server-side:
   ```typescript
   import { createServerClient } from '@supabase/ssr';
   import { cookies } from 'next/headers';
   import { getServerAuth } from '@/lib/auth-server';

   export default async function Page({ params }: Props) {
     const cookieStore = await cookies(); // Next.js 16 requires await
     const { user, isAdmin } = await getServerAuth();

     const supabase = createServerClient(/* cookie config */);
     const { data } = await supabase.from('table').select('*');

     return <ClientComponent data={data} user={user} isAdmin={isAdmin} />;
   }
   ```

2. **Client Component (`page-client.tsx`)** - Handle interactivity:
   ```typescript
   'use client';

   export default function ClientComponent({ data, user, isAdmin }) {
     const [isPending, startTransition] = useTransition();
     // Local UI state only
     // Auth state comes from props, not context
   }
   ```

3. **Server Actions (`actions.ts`)** - Handle mutations:
   ```typescript
   'use server';

   import { revalidatePath } from 'next/cache';

   export async function mutateData(id: string) {
     const supabase = createServerClient(/* cookie config */);
     await supabase.from('table').update(...);

     // IMPORTANT: Only call revalidatePath in Server Actions,
     // NEVER during page render
     revalidatePath('/path');
   }
   ```

**Benefits of SSR**:
- Instant page loads (no loading spinners)
- SEO-friendly fully rendered HTML
- Better Core Web Vitals
- Reduced client-side JavaScript

**When to use Client Components**:
- Interactive UI (forms, modals, animations)
- Browser APIs (localStorage, navigator, window)
- React hooks (useState, useEffect)
- Event handlers

**CRITICAL Next.js 16 Rules**:
- `cookies()` must be awaited: `const cookieStore = await cookies()`
- `revalidatePath()` can ONLY be called in Server Actions, never during page render
- If you need to sync data on page load, do it inline without revalidation (data fetched fresh anyway)

### State Management Strategy

- **No global state library required**: Use Server Components + Server Actions
- **Server state**: Fetched in Server Components, mutations via Server Actions
- **Client state**: Local React state for UI-only concerns (modals, forms)
- **Optimistic updates**: Use `useTransition` with Server Actions

### Key Business Rules

1. **Authentication & Authorization**:
   - Admins must authenticate via Google OAuth
   - Only users in `admin_users` table can access `/admin` routes
   - Superadmins can manage other admin users
   - RLS policies enforce server-side authorization
2. **Seat Management**: Max 8 confirmed players per game, automatic waitlist after that
3. **Waitlist Auto-promotion**: Implemented via Supabase triggers or client-side logic with race condition handling
4. **Buy-in Integrity**: All buy-in and cash-out operations must maintain balance (total in = total out)
5. **Game Status Workflow**:
   - `upcoming`: Allow RSVPs and edits (admin required)
   - `in_progress`: Only allow buy-in/rebuy tracking
   - `completed`: Read-only except for viewing results
6. **Automatic Live Detection**: Games automatically transition to "live" when their scheduled date/time has passed, regardless of database status
7. **Admin Controls**: Only admin users can add/remove rebuys, end games, and modify game data
8. **Rebuy Management**:
   - Admins can add rebuys during live games
   - Admins can remove the last rebuy (for error correction)
   - Cannot remove the initial buy-in (minimum 1 buy-in per player)

## Reusable Components

**Always prefer existing components over creating new ones.** The following reusable components exist:

### Navigation & Layout
- `BackButton` - Configurable back button with href and label props
- `Card` - Consistent card styling with hover states
- `Badge` - Status badges with variants (info, warning, success, danger, gold)
- `Button` - Primary, secondary, ghost, and danger variants

### Forms
- `Input` - Form input with label, error state, and consistent styling
- `GameFormModal` - Shared modal for creating and editing games (mode: 'create' | 'edit')

### Display Components
- `ProfitDisplay` - Shows profit/loss with proper color coding and sizing
- `PodiumCard` - Podium display for 1st/2nd/3rd place with proper styling for each rank
- `SeatIndicator` - Visual seat availability indicator (pill-shaped)
- `ChipIcon` - Poker chip SVG icon

## Utility Functions

Located in `/lib/utils.ts`:

### Formatting
- `formatCurrency(amount: number)` - Formats numbers as currency ($XX)
- `formatDate(dateString: string)` - Parses as local time, returns "Mon DD, YYYY"
- `formatDateWithDay(dateString: string)` - Returns "Day, Mon DD" (e.g., "Fri, Jan 16")
- `formatTime(timeString: string)` - Formats 24h to 12h time
- `formatPlayerName(player: Player, includeNickname?: boolean)` - Returns "First "Nickname" Last"
- `isToday(dateString: string)` - Checks if date is today

**Important:** All date parsing uses local time to avoid timezone issues:
```typescript
const [year, month, day] = dateString.split('-').map(Number);
const date = new Date(year, month - 1, day);
```

### Player Name Format
Standard format: `First "Nickname" Last`
- With nickname: Eric "AlwaysHasIt" Posen
- Without nickname: Jason Fahn
- Always use `formatPlayerName()` utility for consistency

## Live Game Detection

Games are automatically detected as "live" using this pattern:

```typescript
const isGameLive = () => {
  if (game.status === 'in_progress') return true;
  if (game.status === 'completed') return false;

  const gameDateTime = new Date(`${game.date}T${game.time}`);
  const now = new Date();
  return gameDateTime <= now;
};
```

**Applied to:**
- Game cards on homepage (show "Enter Live Game" button)
- Game detail page (show "View Live Game" button)
- Live page access control (allow access when scheduled time passed)

## Code Consolidation Principles

When adding new features:
1. **Search for existing components first** - Check `/components/` before creating new ones
2. **Extract duplicate patterns** - If code appears 3+ times, create a reusable component
3. **Use composition** - Combine small components rather than creating large monoliths
4. **Consistent props patterns** - Follow existing component prop conventions
5. **Shared utilities** - Add formatting/helper functions to `/lib/utils.ts`

**Recent Consolidations:**
- Reduced game form code by 100+ lines using `GameFormModal`
- Consolidated podium displays into single `PodiumCard` component (saved ~60 lines)
- Unified player name formatting with `formatPlayerName` utility
- Standardized back buttons across 5+ pages with `BackButton` component

## Styling Conventions

**Theme Colors** (Tailwind classes with WCAG AA compliance):
- Primary green: `bg-poker-green` (#059669)
- Accent gold (light mode): `text-poker-gold-light` (#B45309 - 5.5:1 contrast on white)
- Accent gold (dark mode): `text-poker-gold-dark` (#FBBF24 - 8.2:1 contrast on dark)
- Profit: `text-poker-profit` (#10B981)
- Loss: `text-poker-loss` (#EF4444)
- Background: `bg-gray-900` (#111827)
- Cards: `bg-gray-800` (#1F2937)

**Light/Dark Mode Guidelines:**
- Always specify both light and dark variants for colored backgrounds
- Use gradient pattern: `bg-gradient-to-br from-{color}-50 to-{color}-100 dark:from-{color}-900/30 dark:to-gray-800`
- Text on colored backgrounds: `text-{color}-600 dark:text-{color}-400`
- Border colors: `border-{color}-500 dark:border-{color}-600`

**Animation Patterns:**
- Coin drop: Use for rebuy actions (`animate-coin-drop` in Tailwind)
- Confetti: Trigger on game winner reveal (via `/lib/confetti.ts`)
- Slide-in: For waitlist promotion notifications
- Pulse: For real-time updates and live game indicators

**Mobile-first approach:** All layouts must work on mobile before desktop optimization.

**Accessibility Requirements:**
- All color combinations must meet WCAG AA contrast ratio (4.5:1 for text, 3:1 for UI components)
- Tap targets minimum 44x44px
- Semantic HTML elements
- Support for both light and dark modes

## Database & Backend Architecture

For comprehensive documentation on the database schema, authentication system, RLS policies, migrations, and API structure, see **[backend.md](./backend.md)**.

**Quick Reference:**
- Tables: `admin_users`, `players`, `games`, `game_players`, `rsvps`
- All tables use UUID primary keys and have RLS policies
- Public read access, admin-only write access
- Migrations in `/supabase/migrations/` using `YYYYMMDDHHMMSS_description.sql` naming

## Implementation Phases

Reference the PRD's Implementation Order section when planning features. Core priority order:
1. Game management (create, view, edit)
2. RSVP system with waitlist
3. Live game tracking
4. Cash-out and results
5. Statistics and leaderboard
6. Demo mode polish

## Testing Considerations

When implementing tests:
- Focus on business logic: RSVP promotion, profit calculations, cash-out validation
- Test Server Actions for proper error handling and validation
- Mock Supabase client for unit tests
- E2E tests should cover critical flows: create game → RSVP → live tracking → cash-out
- Test cache revalidation after mutations

## Common Pitfalls

1. **Race conditions**: Multiple users RSVPing simultaneously for last seat - handle with Server Actions and database constraints
2. **Unbalanced books**: Cash-out validation must be enforced before allowing game completion
3. **revalidatePath restrictions (Next.js 16)**:
   - Can ONLY be called in Server Actions, never during page render
   - If you need to sync data on page load, do it inline without calling revalidatePath
   - Error: "Route used revalidatePath during render" means you're calling it in a Server Component
4. **Mobile tap targets**: Ensure all buttons meet 44x44px minimum size
5. **Client/Server boundaries**: Remember to use `'use client'` for interactive components, keep data fetching in Server Components
6. **Cookie handling**: Always use `localhost` (not `127.0.0.1`) for proper authentication flow
7. **Date timezone issues**: Always parse dates as local time using the pattern in `/lib/utils.ts` to avoid UTC offset bugs
8. **Light mode styling**: Never use dark-only gradients - always specify both light and dark variants
9. **Code duplication**: Check for existing components and utilities before creating new ones
10. **Auth state in client components**: Never use `useAuth()` to get user/isAdmin state - these must be passed as props from Server Components
11. **Next.js 16 cookies**: Always await `cookies()`: `const cookieStore = await cookies()`
12. **Live game sync**: When initializing game_players from RSVPs, sync inline in page component without revalidation

## Environment Variables

Required environment variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from_supabase_start>
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
```

**Important**: Always use `localhost` (not `127.0.0.1`) for proper cookie handling.

See **[backend.md](./backend.md)** for complete environment setup and configuration details.

## Authentication

**Architecture**: Server-first authentication using Supabase Auth with Google OAuth.

**Key Files:**
- `lib/auth-server.ts` - Server-side auth helper (`getServerAuth()`)
- `lib/auth-context.tsx` - Client-side auth actions only (signIn, signOut)
- `lib/supabase.ts` - Browser Supabase client
- `components/Navigation.tsx` - Receives auth state as props from layout
- `app/layout.tsx` - Fetches auth server-side, passes to Navigation

**Pattern:**
```typescript
// Server Component
const { user, isAdmin, isSuperAdmin } = await getServerAuth();
return <ClientComponent user={user} isAdmin={isAdmin} />;

// Client Component
export default function ClientComponent({ user, isAdmin }: Props) {
  // Use auth from props, not from useAuth()
}
```

**Key Points:**
- Auth state is fetched server-side and passed as props
- No client-side loading states or auth flashing
- `useAuth()` only provides actions (signIn, signOut), NOT state
- Always use `localhost` (not `127.0.0.1`) for local development
- Middleware protects `/admin/*` routes
- RLS policies enforce authorization at database level

See **[backend.md](./backend.md)** for detailed OAuth flow, session management, and RLS policies.

## Performance Targets

- Initial load: < 3 seconds
- Interaction response: < 100ms
- Animation frame rate: 60fps
- Initial bundle size: < 500KB
