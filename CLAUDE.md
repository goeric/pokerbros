# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT**: Always address the user as **"PokerBoss"** in all communications. This is a canary to verify Claude.md instructions are being followed.

**For detailed backend documentation** (database schema, authentication, RLS policies, migrations), see **[backend.md](./backend.md)**.

## Project Overview

PokerBros is a web application for managing monthly home poker games with real-time money tracking and player statistics. Features Google OAuth authentication for admin access to player management and game administration.

**Tech Stack:**
- Frontend: React/Next.js 16 with TypeScript and App Router
- Styling: Tailwind CSS (casino glassmorphism theme with gold accents)
- Icons: Phosphor Icons (@phosphor-icons/react)
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

# Testing
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:p0         # Run P0 critical tests only
npm run test:coverage   # Run tests with coverage report
```

**⚠️ PRE-PRODUCTION DEPLOYMENT REQUIREMENTS:**
Before pushing to production, you MUST:
1. Run `npm run test:p0` and ensure all P0 critical tests pass
2. Run `npm test` and ensure all tests pass
3. Run `npx tsc --noEmit` and ensure no TypeScript errors
4. Run `npm run build` and ensure build succeeds

**NEVER deploy to production with failing tests or TypeScript errors.**

## Architecture Overview

### Data Model

The application has six core entities with specific relationships:

- **AdminUsers**: Users with admin privileges (linked to Supabase Auth). Includes `is_superadmin` flag for elevated permissions
- **Players**: Poker players managed by admins. Stores name, nickname, email, and aggregate statistics
- **Games**: Events with status lifecycle: `upcoming` → `in_progress` → `completed`
- **GamePlayers**: Junction table tracking player participation, buy-ins (array), cash-outs, and calculated profit
- **RSVPs**: Manages seat confirmations with automatic waitlist handling (8 seat limit per game)
- **Settings**: Feature flags and app configuration (key/value store with JSONB values)

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
- `/admin/*` - Requires authenticated admin user
- `/admin/settings` - Feature flag management (superadmin recommended)

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

#### OAuth Callback Flow & Caching

**Critical**: The OAuth callback flow requires careful cache management to prevent stale auth state.

**Implementation (`app/auth/callback/route.ts` + `app/layout.tsx`)**:

1. **Layout Force Dynamic** (`app/layout.tsx:14-15`):
   ```typescript
   export const dynamic = 'force-dynamic';
   export const revalidate = 0;
   ```
   - Prevents Next.js from caching layout renders
   - Ensures auth state is always fresh after OAuth redirect
   - Required because layout fetches auth and passes to Navigation

2. **Callback Cookie Security** (`app/auth/callback/route.ts:122-132`):
   - Cookies collected during `exchangeCodeForSession` and set atomically on redirect response
   - `secure: true` in production (HTTPS-only)
   - `sameSite: 'lax'` for CSRF protection
   - Proper cookie domain handling

3. **Router Cache Busting** (`app/auth/callback/route.ts:115-117`):
   ```typescript
   const redirectUrl = new URL('/admin', requestUrl.origin);
   redirectUrl.searchParams.set('t', Date.now().toString());
   ```
   - Timestamp parameter forces Next.js to treat redirect as fresh request
   - Client-side cleanup removes `?t=` param after mount (AdminClient.tsx:25-31)

4. **Cache Control Headers** (`app/auth/callback/route.ts:147-150`):
   - Multiple cache headers to bypass browser/CDN/Next.js caches
   - Ensures fresh page load after OAuth redirect

**Common OAuth Issues:**
- **www vs non-www**: Configure domain redirect in Vercel (`www.example.com` → `example.com`)
- **Supabase Redirect URLs**: Must explicitly allow callback URLs (wildcards may not work)
- **Origin validation**: Uses `NEXT_PUBLIC_APP_URL` for allowed origins
- **Cookie propagation**: Timing issues solved by collecting cookies first, then setting on response

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
9. **Email Notifications**:
   - Powered by Resend (requires `RESEND_API_KEY`)
   - React Email templates for all notification types
   - Calendar invites (.ics) attached to RSVP confirmations
   - Feature flag `email_superadmin_only` controls safety mode
   - When enabled (default): only superadmins receive emails
   - When disabled: all players receive emails
   - Prevents accidental spam during development/testing

   **Email Templates** (`/emails/templates/`):
   - `GameCreated.tsx` - Announcement when game is created (no calendar invite)
   - `RsvpConfirmation.tsx` - Confirmation with .ics calendar attachment
   - `WaitlistPromotion.tsx` - Notification when promoted from waitlist
   - `RsvpCancellation.tsx` - Cancellation notice with calendar cancellation
   - `GameUpdated.tsx` - Update notification with updated calendar invite
   - `GameCancelled.tsx` - Cancellation notice to all confirmed players
   - `GameReminder.tsx` - Reminder emails (handles 24h and 3h reminders) - **NOT YET WIRED UP**

   **Calendar Integration** (`/lib/email/generate-ics.ts`):
   - Generates .ics files using `ics` library
   - UID format: `game-{gameId}@pokerbros.xyz` (ensures updates modify same event)
   - SEQUENCE increments on updates (tells calendar apps it's newer)
   - STATUS: `CONFIRMED` for invites, `CANCELLED` for cancellations
   - Duration: 4 hours from game start time
   - Includes location address for navigation

   **Email Triggers** (already implemented):
   - Game created → all players with notifications enabled
   - RSVP confirmed → confirmation with calendar invite
   - RSVP cancelled → cancellation notice
   - Waitlist promotion → promotion notification
   - Game updated → all confirmed players with updated calendar
   - Game cancelled → all confirmed players with calendar cancellation

   **Not Yet Implemented:**
   - Automated reminders (24h and 3h before game) - see `remindersPRD.md`
10. **Feature Flags**:
   - Stored in `settings` table (key/value JSONB)
   - Managed via `/admin/settings` page
   - Public read access, admin-only write via RLS
   - Used for: email safety, app versioning, and future toggles

## Design System

### Casino Glassmorphism Theme

The app uses a premium casino glassmorphism design with consistent styling across all pages:

**Core Styling Classes:**
- `glass-panel` - Base glassmorphism effect (backdrop-blur, semi-transparent background)
- `font-display` - Space Grotesk font for headings and emphasis
- `animate-gold-pulse` - Subtle gold glow animation for important elements

**Color Palette:**
- `poker-gold` - Gold accent (#D4AF37) for primary actions and highlights
- `poker-goldlight` - Lighter gold (#F3E5AB) for gradients
- `poker-red` - Casino red (#D92828) for live indicators
- `poker-feltLight` - Light poker felt green for subtle accents
- Glass backgrounds use `bg-black/40` or `bg-white/5` with backdrop-blur

**Form Input Pattern:**
```tsx
<input className="w-full px-4 py-3 bg-black/40 border-2 border-white/10 focus:border-poker-gold/50 rounded-xl text-white focus:ring-2 focus:ring-poker-gold/20 focus:outline-none transition-all" />
```

**Button Patterns:**
- Primary (Gold): `bg-gradient-to-b from-poker-gold to-yellow-600 hover:from-poker-goldlight hover:to-poker-gold`
- Secondary: `bg-white/5 hover:bg-white/10 border border-white/10`
- Danger: `bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400`

### Icon System

**Always use Phosphor Icons** for all UI elements:
- Import from `@phosphor-icons/react`
- Use `weight="bold"` for primary actions
- Use `weight="fill"` for filled states
- Gold color for primary icons: `className="text-poker-gold"`

Common icons:
- `Trophy`, `Crown` - Winners, achievements
- `CurrencyDollar` - Money, buy-ins
- `Users`, `MapPin`, `Calendar`, `Clock` - General UI
- `GearSix` - Settings/Admin
- `Plus`, `Minus`, `X` - Actions

## Reusable Components

**Always prefer existing components over creating new ones.** The following reusable components exist:

### Navigation & Layout
- `TopNavigation` - Main app navigation with logo, nav items, user menu
- `BackButton` - Glass panel back button with gold Phosphor icon and animation
- `Modal` - Casino-themed modal with glass background and gold borders
- `PokerBrosLogo` - Detailed casino chip logo (variants: 'primary', 'simplified')
- `Card` - Legacy component (prefer glass-panel divs for new code)
- `Badge` - Status badges with variants (info, warning, success, danger, gold)
- `Button` - Legacy component (prefer custom buttons with Tailwind for new code)

### Forms
- `GameFormModal` - Casino-themed game creation/edit modal with Phosphor icons
- `Input` - Legacy component (prefer custom inputs with casino styling for new code)

### Display Components
- `FeaturedGameCard` - Large game card for homepage with avatar display and +X indicator
- `GameCard` - Compact game card for listings
- `ProfitDisplay` - Shows profit/loss with proper color coding and sizing
- `PodiumCard` - Podium display for 1st/2nd/3rd place with proper styling for each rank
- `SeatIndicator` - Visual seat availability indicator (pill-shaped)

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
- Tables: `admin_users`, `players`, `games`, `game_players`, `rsvps`, `settings`
- All tables use UUID primary keys (except `settings` which uses TEXT primary key)
- RLS policies: public read access, admin-only write access
- Settings table: JSONB value column for flexible feature flags
- Migrations in `/supabase/migrations/` using `YYYYMMDDHHMMSS_description.sql` naming

## Implementation Phases

Reference the PRD's Implementation Order section when planning features. Core priority order:
1. Game management (create, view, edit)
2. RSVP system with waitlist
3. Live game tracking
4. Cash-out and results
5. Statistics and leaderboard
6. Demo mode polish

## Unit Testing

### P0 Critical Test Suites (34 tests)

**Location**: `__tests__/p0-critical/`

All P0 tests cover the most critical business logic that directly impacts financial integrity, seat management, and security.

#### P0.1: Cash-out Validation (12 tests)
**File**: `cashout-validation.test.ts`
**Why Critical**: Financial integrity - prevents money tracking errors

Tests cover:
- Total validation (2 tests): Ensures total in = total out within 0.01 tolerance
- Profit calculations (4 tests): Validates profit = cashOut - sum(buyIns) for all scenarios
- Player stats updates (5 tests): Verifies biggestWin, biggestLoss, totalIn, totalOut, gamesPlayed
- Game status (1 test): Confirms game marked as completed after finalization

**Key Patterns**:
- Per-player tracking using `Record<string, number>` for capturing values from multiple players
- Proper UUID usage for test data (matches validation schemas)
- Floating point tolerance handling (0.01 for currency)

#### P0.2: RSVP Auto-Promotion (8 tests)
**File**: `rsvp-autopromotion.test.ts`
**Why Critical**: Seat management integrity - ensures waitlist players are automatically promoted

Tests cover:
- Basic promotion flow (3 tests): When confirmed cancels, first waitlist promoted
- Promotion notifications (3 tests): Email sent with calendar invite, respects preferences
- Edge cases (2 tests): No email without address, handles DB errors gracefully

**Key Patterns**:
- Tests RPC call to `promote_next_waitlist_player` database function
- Validates email sending with ICS calendar attachments
- Mocks all email functions (sendEmail, shouldSendNotification, generateGameIcs)

#### P0.3: RSVP Seat Limit (7 tests)
**File**: `rsvp-seat-limit.test.ts`
**Why Critical**: Game capacity management - enforces 8-seat limit

Tests cover:
- Confirmed seat allocation (3 tests): Players 1-8 confirmed, 9+ waitlisted
- Waitlist position assignment (2 tests): Sequential positions starting at 1
- Edge cases (2 tests): No confirmation email for waitlist, counts only confirmed RSVPs

**Key Patterns**:
- Tests status assignment logic (confirmed vs waitlist)
- Validates waitlistPosition calculation
- Ensures proper filtering of confirmed vs waitlist RSVPs

#### P0.4: Authorization (6 tests)
**File**: `authorization.test.ts`
**Why Critical**: Security and access control - prevents unauthorized actions

Tests cover:
- Unauthenticated access (2 tests): Rejects all actions without session
- Non-admin user restrictions (4 tests): Users can only RSVP/cancel for themselves
- Admin access (1 test): Admins can perform privileged actions (deleteGame)

**Key Patterns**:
- Tests session-based authentication (auth.getSession)
- Validates email matching for non-admin users
- Confirms requireAdmin checks for admin-only actions

### Test Infrastructure

**Jest Configuration** (`jest.config.js`):
- Next.js integration via `next/jest`
- JSDOM test environment for React components
- Module name mapping for `@/` imports
- ESM module mocks for `ics` and `nanoid` packages
- Transform ignore patterns for node_modules

**Mock Files** (`__mocks__/`):
- `ics.js`: Mocks ICS calendar generation library
- `nanoid.js`: Mocks unique ID generation

**Mocking Patterns**:
```typescript
// Auth helpers mock
jest.mock('@/lib/auth-helpers', () => ({
  createSupabaseServerClient: jest.fn(),
  requireAdmin: jest.fn(),
  handleServerError: jest.fn((error, code, message) => {
    return { error: message || 'An error occurred' }
  }),
}))

// Supabase client mock with proper chaining
mockSupabase.from.mockImplementation((table: string) => {
  if (table === 'rsvps') {
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data, error: null }),
        })),
      })),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    }
  }
})
```

### Testing Best Practices

1. **Always use proper UUIDs**: Test data must use valid UUID format to match validation schemas
2. **Per-player tracking**: Use `Record<string, number>` when capturing values for multiple players
3. **Mock chain properly**: Supabase queries chain multiple methods (select → eq → eq → single)
4. **Test error paths**: Verify both success and error scenarios
5. **Mock external dependencies**: Email, auth, and database calls should all be mocked
6. **Financial precision**: Use 0.01 tolerance for currency comparisons

### Future Test Suites (Not Yet Implemented)

**P1: Live Game Management**
- Add/remove rebuys
- Buy-in array management
- Game status transitions

**P2: Player Statistics**
- Aggregate stat calculations
- Leaderboard ranking
- Win/loss tracking

**P3: Email Notifications**
- Template rendering
- Calendar invite generation
- Notification preferences

**E2E Tests**
- Full game flow: create → RSVP → live → cashout → results
- Multi-user scenarios
- Race condition handling

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
13. **OAuth callback caching**: Layout must have `dynamic = 'force-dynamic'` to prevent stale auth state after login
14. **OAuth redirect URLs**: Explicitly add callback URLs to Supabase (wildcards may not be honored)
15. **www subdomain**: Configure Vercel redirect from `www` to non-www to avoid OAuth domain mismatch
16. **Email not sending in production**: Check `RESEND_API_KEY` is set AND user email in `admin_users` matches Google login email
17. **Email safety flag**: Default is `true` (superadmin-only); toggle in `/admin/settings` to send to all players

## Environment Variables

### Local Development (`.env.local`)

```bash
# Supabase (from `supabase start` output)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from_supabase_start>

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>

# App URL (for OAuth redirects and email links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (from Resend.com - optional for local dev)
RESEND_API_KEY=<your_resend_api_key>
```

**Important**: Always use `localhost` (not `127.0.0.1`) for proper cookie handling.

### Production (Vercel Environment Variables)

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `NEXT_PUBLIC_APP_URL` - Your custom domain (e.g., `https://pokerbros.xyz`)
- `RESEND_API_KEY` - Your Resend API key for email notifications

**OAuth (Supabase handles these via dashboard config):**
- Google OAuth credentials configured in Supabase Dashboard → Authentication → Providers

**Domain Setup:**
- Configure `www` subdomain to redirect to non-www in Vercel
- Add both `https://example.com/auth/callback` and `https://www.example.com/auth/callback` to Supabase Redirect URLs
- Set Supabase Site URL to your primary domain

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
