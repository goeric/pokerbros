# PokerBros Backend Documentation

This document provides comprehensive documentation of the PokerBros backend architecture, database schema, authentication system, and API structure. Use this as a reference for rebuilding the frontend or understanding the backend implementation.

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [Database Schema](#database-schema)
3. [Authentication System](#authentication-system)
4. [Row Level Security (RLS)](#row-level-security-rls)
5. [API Structure](#api-structure)
6. [Server-Side Rendering (SSR) Architecture](#server-side-rendering-ssr-architecture)
7. [Environment Configuration](#environment-configuration)
8. [Local Development Setup](#local-development-setup)

---

## Technology Stack

- **Database**: PostgreSQL 17 (via Supabase)
- **Authentication**: Supabase Auth with Google OAuth 2.0
- **Frontend**: Next.js 16 with App Router and Server Components
- **Rendering**: Server-Side Rendering (SSR) with Server Actions
- **Auth Pattern**: Server-first architecture (auth state passed as props)
- **API**: Supabase PostgREST (auto-generated REST API)
- **Local Development**: Supabase CLI with Docker
- **Migrations**: SQL migration files in `supabase/migrations/`

---

## Database Schema

### Tables Overview

```
admin_users (authentication & authorization)
├─ players (poker player profiles)
│  └─ game_players (player participation in games)
│     └─ games (poker game events)
│        └─ rsvps (seat reservations)
```

### 1. `admin_users` Table

Stores administrative users who can manage the application.

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  is_superadmin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `id` (UUID, PK, FK to `auth.users`): Links to Supabase Auth user
- `email` (TEXT, UNIQUE, NOT NULL): Admin's email address
- `is_superadmin` (BOOLEAN, DEFAULT FALSE): Elevated permissions flag
- `created_at` (TIMESTAMPTZ): Account creation timestamp

**Indexes:**
- Primary key on `id`
- Unique index on `email`

**Relationships:**
- References `auth.users(id)` with CASCADE delete

---

### 2. `players` Table

Stores poker player profiles and aggregate statistics.

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nickname TEXT,
  email TEXT UNIQUE NOT NULL,
  totalIn NUMERIC DEFAULT 0,
  totalOut NUMERIC DEFAULT 0,
  gamesPlayed INTEGER DEFAULT 0,
  biggestWin NUMERIC DEFAULT 0,
  biggestLoss NUMERIC DEFAULT 0,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `id` (UUID, PK): Unique player identifier
- `first_name` (TEXT, NOT NULL): Player's first name
- `last_name` (TEXT, NOT NULL): Player's last name
- `nickname` (TEXT, NULLABLE): Optional poker nickname
- `email` (TEXT, UNIQUE, NOT NULL): Contact email
- `totalIn` (NUMERIC): Lifetime total buy-ins
- `totalOut` (NUMERIC): Lifetime total cash-outs
- `gamesPlayed` (INTEGER): Number of games participated
- `biggestWin` (NUMERIC): Largest single-game profit
- `biggestLoss` (NUMERIC): Largest single-game loss
- `createdAt` (TIMESTAMPTZ): Player registration date

**Indexes:**
- Primary key on `id`
- Unique index on `email`

**Computed Values:**
- Lifetime P/L: `totalOut - totalIn`

---

### 3. `games` Table

Stores poker game events with lifecycle management.

```sql
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time TIME NOT NULL,
  venue TEXT NOT NULL,
  buyIn NUMERIC NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'in_progress', 'completed')),
  notes TEXT,
  createdAt TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `id` (UUID, PK): Unique game identifier
- `date` (DATE, NOT NULL): Game date
- `time` (TIME, NOT NULL): Game start time
- `venue` (TEXT, NOT NULL): Location description
- `buyIn` (NUMERIC, NOT NULL): Standard buy-in amount
- `status` (TEXT, NOT NULL): Game lifecycle state
- `notes` (TEXT, NULLABLE): Optional game notes
- `createdAt` (TIMESTAMPTZ): Game creation timestamp

**Status Values:**
- `upcoming`: Scheduled but not started
- `in_progress`: Currently active
- `completed`: Finished with final results

**Indexes:**
- Primary key on `id`
- Recommended: Index on `status` and `date` for dashboard queries

---

### 4. `game_players` Table

Junction table tracking player participation and financial transactions.

```sql
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gameId UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  playerId UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  buyIns NUMERIC[] DEFAULT '{}',
  cashOut NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gameId, playerId)
);
```

**Fields:**
- `id` (UUID, PK): Unique participation record
- `gameId` (UUID, FK, NOT NULL): Reference to game
- `playerId` (UUID, FK, NOT NULL): Reference to player
- `buyIns` (NUMERIC[]): Array of buy-in amounts (supports rebuys)
- `cashOut` (NUMERIC): Final cash-out amount
- `profit` (NUMERIC): Calculated profit/loss
- `createdAt` (TIMESTAMPTZ): Join timestamp

**Constraints:**
- Unique constraint on `(gameId, playerId)` - player can only join once per game
- Foreign keys with CASCADE delete

**Indexes:**
- Primary key on `id`
- Recommended: Index on `gameId` for game queries

**Business Logic:**
- `profit = cashOut - SUM(buyIns)`
- Multiple buy-ins supported via array structure

---

### 5. `rsvps` Table

Manages seat reservations with automatic waitlist handling.

```sql
CREATE TABLE rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gameId UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  playerId UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
  position INTEGER,
  createdAt TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gameId, playerId)
);
```

**Fields:**
- `id` (UUID, PK): Unique RSVP identifier
- `gameId` (UUID, FK, NOT NULL): Reference to game
- `playerId` (UUID, FK, NOT NULL): Reference to player
- `status` (TEXT, NOT NULL): Reservation state
- `position` (INTEGER, NULLABLE): Position in confirmed/waitlist order
- `createdAt` (TIMESTAMPTZ): RSVP creation time

**Status Values:**
- `confirmed`: Guaranteed seat (max 8 per game)
- `waitlist`: Waiting for open seat
- `cancelled`: Previously confirmed but cancelled

**Constraints:**
- Unique constraint on `(gameId, playerId)` - one RSVP per player per game
- Foreign keys with CASCADE delete

**Business Rules:**
- Max 8 confirmed RSVPs per game
- Auto-promote first waitlist player when confirmed seat opens

**Indexes:**
- Primary key on `id`
- Recommended: Index on `gameId` and `status` for RSVP lookups

---

### 6. `settings` Table

Stores feature flags and application configuration as key-value pairs.

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `key` (TEXT, PK): Unique setting identifier (e.g., `email_superadmin_only`, `app_version`)
- `value` (JSONB, NOT NULL): Setting value (flexible type: boolean, string, number, object)
- `description` (TEXT, NULLABLE): Human-readable explanation of what the setting controls
- `updated_at` (TIMESTAMPTZ): Last modification timestamp

**Current Settings:**
- `email_superadmin_only` (JSONB boolean): When `true`, emails only sent to superadmins (safety mode)
- `app_version` (JSONB string): Current application version for tracking deployments

**Usage:**
```typescript
// Read feature flag (lib/email/send-email.ts)
const { data } = await supabase
  .from('settings')
  .select('value')
  .eq('key', 'email_superadmin_only')
  .single();

const isEnabled = data?.value === true; // JSONB boolean

// Update setting (app/admin/settings/actions.ts)
await supabase
  .from('settings')
  .update({ value: newValue.toString() })
  .eq('key', settingKey);
```

**Indexes:**
- Primary key on `key`
- Index on `key` for fast lookups

**RLS Policies:**
- Public read access (anyone can check feature flags)
- Admin-only write access (only authenticated admins can modify)

**Trigger:**
- `update_settings_updated_at` trigger automatically updates `updated_at` on modification

---

## Authentication System

### Architecture Overview

PokerBros uses Supabase Auth with Google OAuth for secure authentication.

```
User (Browser)
    ↓ Click "Sign in with Google"
    ↓
Google OAuth (accounts.google.com)
    ↓ Authorize
    ↓
Supabase Auth (localhost:54321/auth/v1/callback)
    ↓ Exchange code for JWT
    ↓
App Callback (/auth/callback)
    ↓ Set session cookies
    ↓
Protected Routes (/admin)
```

### OAuth Configuration

**Google Cloud Console Settings:**
- **Authorized JavaScript origins**: `http://localhost:3000`
- **Authorized redirect URIs**:
  - `http://localhost:54321/auth/v1/callback` (Supabase Auth)
  - `http://localhost:3000/auth/callback` (App callback)

**Supabase Configuration** (`supabase/config.toml`):
```toml
[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
jwt_expiry = 3600
jwt_issuer = "http://localhost:54321/auth/v1"

[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
skip_nonce_check = true
```

### Session Management

**Cookie Storage:**
- Session stored in HTTP-only cookies: `sb-localhost-auth-token.0`, `sb-localhost-auth-token.1`
- Cookie settings: `SameSite=Lax`, `Path=/`, `Secure=false` (local dev)

**JWT Token:**
- Issued by Supabase Auth
- 1 hour expiry (configurable)
- Refresh token rotation enabled
- Contains user ID and metadata

**Client-Side:**
```typescript
// lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

**Server-Side (Auth Helper):**
```typescript
// lib/auth-server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getServerAuth() {
  const cookieStore = await cookies(); // Next.js 16 requires await

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignore errors in read-only Server Components
          }
        },
        remove: (name, options) => {
          try {
            cookieStore.delete(name);
          } catch (error) {
            // Ignore errors in read-only Server Components
          }
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return { user: null, isAdmin: false, isSuperAdmin: false };
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return {
    user: session.user,
    isAdmin: !!adminUser,
    isSuperAdmin: adminUser?.is_superadmin ?? false,
  };
}
```

### Authorization Flow

1. **Route Protection** (`middleware.ts`):
   - Runs on every `/admin/*` request
   - Checks for valid session
   - Verifies user exists in `admin_users` table
   - Redirects to `/login` if unauthorized

2. **Client-Side Auth Context** (`lib/auth-context.tsx`):
   - Provides `useAuth()` hook
   - Manages session state
   - Fetches admin user data
   - Exports: `user`, `session`, `adminUser`, `isAdmin`, `isSuperAdmin`, `loading`

3. **RLS Enforcement**:
   - Database-level security
   - Validates JWT token on every query
   - Uses `auth.uid()` to identify user

---

## Row Level Security (RLS)

All tables have RLS enabled to enforce authorization at the database level.

### `admin_users` Policies

```sql
-- Users can view their own admin record
CREATE POLICY "Users can view own admin record"
  ON admin_users FOR SELECT
  USING (auth.uid() = id);

-- Superadmins can insert new admin users
CREATE POLICY "Superadmins can insert admins"
  ON admin_users FOR INSERT
  WITH CHECK (is_superadmin(auth.uid()));

-- Superadmins can update admin users
CREATE POLICY "Superadmins can update admins"
  ON admin_users FOR UPDATE
  USING (is_superadmin(auth.uid()));
```

**Helper Function:**
```sql
CREATE OR REPLACE FUNCTION is_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = user_id AND is_superadmin = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER;
```

### `players` Policies

```sql
-- Admins can read all players
CREATE POLICY "Admins can view players"
  ON players FOR SELECT
  USING (is_admin(auth.uid()));

-- Admins can insert players
CREATE POLICY "Admins can insert players"
  ON players FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Admins can update players
CREATE POLICY "Admins can update players"
  ON players FOR UPDATE
  USING (is_admin(auth.uid()));

-- Admins can delete players
CREATE POLICY "Admins can delete players"
  ON players FOR DELETE
  USING (is_admin(auth.uid()));
```

**Helper Function:**
```sql
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = user_id
  );
$$ LANGUAGE SQL SECURITY DEFINER;
```

### `games`, `game_players`, `rsvps` Policies

Similar pattern:
- **SELECT**: Public read access (for viewing games)
- **INSERT/UPDATE/DELETE**: Admins only

---

## API Structure

### Primary: Server Actions (Next.js)

The application primarily uses Next.js Server Actions for database interactions. Server Actions provide:
- Type-safe database operations
- Automatic cache revalidation
- Server-side execution
- No exposed API endpoints

See [Server-Side Rendering (SSR) Architecture](#server-side-rendering-ssr-architecture) for implementation details.

### Secondary: Supabase REST API

Supabase PostgREST automatically generates RESTful API endpoints for all tables. These are available for direct database access when needed.

### Base URL
```
http://localhost:54321/rest/v1
```

### Authentication Header
```
Authorization: Bearer <JWT_TOKEN>
apikey: <SUPABASE_ANON_KEY>
```

### Endpoints

#### Admin Users

```http
# Get current admin user
GET /admin_users?id=eq.<user_id>&select=*

# List all admin users (superadmin only)
GET /admin_users?select=*

# Create admin user (superadmin only)
POST /admin_users
Content-Type: application/json
{
  "id": "<auth_user_id>",
  "email": "admin@example.com",
  "is_superadmin": false
}
```

#### Players

```http
# List all players
GET /players?select=*&order=createdAt.desc

# Get player by ID
GET /players?id=eq.<player_id>&select=*

# Create player (admin only)
POST /players
Content-Type: application/json
{
  "first_name": "John",
  "last_name": "Doe",
  "nickname": "The Shark",
  "email": "john@example.com"
}

# Update player (admin only)
PATCH /players?id=eq.<player_id>
Content-Type: application/json
{
  "nickname": "New Nickname"
}

# Delete player (admin only)
DELETE /players?id=eq.<player_id>
```

#### Games

```http
# List upcoming games
GET /games?status=eq.upcoming&order=date.asc&select=*

# Get game with players
GET /games?id=eq.<game_id>&select=*,game_players(player:players(*))

# Create game (admin only)
POST /games
Content-Type: application/json
{
  "date": "2025-12-01",
  "time": "19:00:00",
  "venue": "John's House",
  "buyIn": 100,
  "status": "upcoming",
  "notes": "Bring snacks!"
}

# Update game status
PATCH /games?id=eq.<game_id>
Content-Type: application/json
{
  "status": "in_progress"
}
```

#### RSVPs

```http
# List RSVPs for a game
GET /rsvps?gameId=eq.<game_id>&order=position.asc&select=*,player:players(*)

# Create RSVP
POST /rsvps
Content-Type: application/json
{
  "gameId": "<game_id>",
  "playerId": "<player_id>",
  "status": "confirmed",
  "position": 1
}

# Update RSVP status
PATCH /rsvps?id=eq.<rsvp_id>
Content-Type: application/json
{
  "status": "cancelled"
}
```

### Query Modifiers

PostgREST supports powerful query modifiers:

```http
# Filtering
?status=eq.upcoming
?totalOut=gt.1000
?nickname=is.null

# Sorting
?order=createdAt.desc
?order=date.asc,time.asc

# Limiting
?limit=10
?offset=20

# Selecting fields
?select=id,first_name,last_name
?select=*,game_players(*)

# Counting
?select=count

# Full-text search
?first_name=ilike.*john*
```

---

## Server-Side Rendering (SSR) Architecture

PokerBros uses Next.js Server Components and Server Actions for optimal performance and SEO.

### Architecture Pattern

All dynamic pages follow a three-part SSR pattern:

1. **Server Component (`page.tsx`)** - Fetches data server-side
2. **Client Component (`page-client.tsx`)** - Handles interactivity
3. **Server Actions (`actions.ts`)** - Handles mutations

### Server Component Pattern

Server Components fetch data before rendering, eliminating loading states:

```typescript
// app/game/[id]/live/page.tsx
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import LiveGameClient from './page-client';

export default async function LiveGamePage({ params }: Props) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignore cookie errors in Server Components
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name);
          } catch (error) {
            // Ignore cookie errors in Server Components
          }
        },
      },
    }
  );

  // Fetch data server-side
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', params.id)
    .single();

  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select('*')
    .eq('gameId', params.id);

  const { data: players } = await supabase
    .from('players')
    .select('*');

  // Return Client Component with data
  return (
    <div className="container">
      <LiveGameClient
        game={game}
        initialGamePlayers={gamePlayers}
        players={players}
      />
    </div>
  );
}
```

### Client Component Pattern

Client Components receive data as props and handle UI interactions:

```typescript
// app/game/[id]/live/page-client.tsx
'use client';

import { useTransition } from 'react';
import { addRebuy } from './actions';

export default function LiveGameClient({ game, initialGamePlayers, players }) {
  const [isPending, startTransition] = useTransition();

  const handleAddRebuy = async (gamePlayerId: string) => {
    startTransition(async () => {
      await addRebuy(game.id, gamePlayerId, game.buyIn);
    });
  };

  return (
    <>
      {/* Interactive UI */}
      <button onClick={() => handleAddRebuy(playerId)} disabled={isPending}>
        {isPending ? 'Adding...' : 'Add Rebuy'}
      </button>
    </>
  );
}
```

### Server Actions Pattern

Server Actions handle mutations and trigger revalidation:

```typescript
// app/game/[id]/live/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function addRebuy(
  gameId: string,
  gamePlayerId: string,
  buyInAmount: number
) {
  const supabase = createSupabaseServerClient();

  // Fetch current buy-ins
  const { data: gamePlayer } = await supabase
    .from('game_players')
    .select('buyIns')
    .eq('id', gamePlayerId)
    .single();

  // Update with new buy-in
  const updatedBuyIns = [...gamePlayer.buyIns, buyInAmount];

  await supabase
    .from('game_players')
    .update({ buyIns: updatedBuyIns })
    .eq('id', gamePlayerId);

  // Revalidate the page to show updated data
  revalidatePath(`/game/${gameId}/live`);
}
```

### Cache Revalidation

Next.js caches Server Component output. Use `revalidatePath()` to invalidate cache after mutations:

```typescript
import { revalidatePath } from 'next/cache';

// Revalidate specific page
revalidatePath('/game/123/live');

// Revalidate all pages in a route segment
revalidatePath('/game/[id]/live', 'page');

// Revalidate entire route
revalidatePath('/', 'layout');
```

### Benefits of SSR Architecture

1. **Instant Page Loads**: No loading spinners, fully rendered HTML
2. **SEO-Friendly**: Search engines receive complete HTML
3. **Better Performance**: Less JavaScript sent to client
4. **Type Safety**: End-to-end TypeScript with no API layer
5. **Simplified State**: No client-side caching or sync issues

### Migration from Real-time Subscriptions

Previous versions used Supabase Realtime WebSocket subscriptions. This has been replaced with SSR for:

- **Simpler Architecture**: No subscription management or cleanup
- **Better Performance**: Server-rendered pages with no loading states
- **Reduced Complexity**: No need to handle INSERT/UPDATE/DELETE events
- **Automatic Updates**: `revalidatePath()` refreshes server data automatically

### Implemented Server Actions

**Game Management:**
- `app/actions.ts`: Create game, update game status, delete game
- `app/game/[id]/actions.ts`: Update game details, add RSVP, update RSVP status

**Live Game:**
- `app/game/[id]/live/actions.ts`: Initialize game players, add rebuy

**Cash-Out:**
- `app/game/[id]/cashout/actions.ts`: Finalize game results with validation

**Player Management:**
- `app/admin/players/actions.ts`: Create player, update player, delete player

All Server Actions follow the pattern:
1. Create Supabase server client
2. Perform database operations
3. Call `revalidatePath()` to refresh UI
4. Return success/error status

---

## Environment Configuration

### `.env.local` (Application)

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key_from_supabase_start>

# Google OAuth
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
```

### `supabase/config.toml` (Supabase)

Key configurations:

```toml
[api]
port = 54321

[db]
port = 54322

[studio]
port = 54323
api_url = "http://localhost"

[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
jwt_expiry = 3600
jwt_issuer = "http://localhost:54321/auth/v1"

[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"
skip_nonce_check = true
```

---

## Local Development Setup

### Prerequisites

- Docker Desktop installed and running
- Node.js 18+ and npm
- Supabase CLI installed: `npm install -g supabase`

### Initial Setup

```bash
# 1. Clone repository
git clone <repository_url>
cd pokerbros

# 2. Install dependencies
npm install

# 3. Start Supabase
supabase start
# Note the anon key and service role key

# 4. Configure environment
cp .env.example .env.local
# Add Supabase keys and Google OAuth credentials

# 5. Run migrations (if needed)
supabase db reset

# 6. Start Next.js dev server
npm run dev
```

### Database Access

**Supabase Studio:**
```
http://localhost:54323
```

**Direct psql access:**
```bash
docker exec -it supabase_db_pokerbros psql -U postgres -d postgres
```

**Common psql commands:**
```sql
-- List tables
\dt

-- Describe table
\d players

-- Query data
SELECT * FROM admin_users;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'players';
```

### Creating Migrations

```bash
# Generate new migration file
supabase migration new add_new_feature

# Edit the generated file in supabase/migrations/

# Apply migration
supabase db reset

# Or push to remote
supabase db push
```

### Troubleshooting

**Issue: Cookies not working**
- Ensure using `localhost` (not `127.0.0.1`) everywhere
- Check browser allows cookies from localhost
- Verify `SameSite=Lax` in cookie settings

**Issue: RLS blocking queries**
- Check if user is authenticated: `SELECT auth.uid();`
- Verify user in `admin_users` table
- Test policies with service role key (bypasses RLS)

**Issue: OAuth redirect mismatch**
- Verify Google Cloud Console redirect URIs match exactly
- Wait 5+ minutes for Google changes to propagate
- Check Supabase logs: `docker logs supabase_auth_pokerbros`

**Issue: Database connection failed**
- Ensure Docker is running
- Restart Supabase: `supabase stop && supabase start`
- Check port conflicts (54321, 54322, 54323)

---

## API Rate Limits

Default local development limits (from `config.toml`):

- Email sent: 2/hour
- Sign in/Sign ups: 30/5min per IP
- Token refresh: 150/5min per IP
- Anonymous users: 30/hour per IP

---

## Security Best Practices

1. **Never commit secrets**: Use environment variables
2. **Always use RLS**: Never disable for production tables
3. **Validate on server**: Don't trust client-side validation alone
4. **Use parameterized queries**: Prevent SQL injection
5. **Audit admin actions**: Log all admin operations
6. **Rotate secrets regularly**: Update OAuth credentials periodically
7. **Monitor auth logs**: Check for suspicious login attempts

---

## Production Deployment Considerations

### Supabase Production

1. Create Supabase project at supabase.com
2. Run migrations: `supabase db push`
3. Configure production OAuth redirect URIs
4. Set production environment variables
5. Enable email confirmations
6. Configure custom SMTP for emails
7. Set up database backups

### Environment Variables (Production)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production_anon_key>
GOOGLE_CLIENT_ID=<production_client_id>
GOOGLE_CLIENT_SECRET=<production_client_secret>
```

### Google OAuth (Production)

Update authorized redirect URIs:
- `https://<project>.supabase.co/auth/v1/callback`
- `https://yourdomain.com/auth/callback`

---

## Appendix: SQL Functions

### Helper Functions

```sql
-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = user_id
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = user_id AND is_superadmin = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Calculate player profit for a game
CREATE OR REPLACE FUNCTION calculate_profit(player_id UUID, game_id UUID)
RETURNS NUMERIC AS $$
  SELECT
    COALESCE(cashOut, 0) - COALESCE((
      SELECT SUM(x) FROM unnest(buyIns) x
    ), 0)
  FROM game_players
  WHERE playerId = player_id AND gameId = game_id;
$$ LANGUAGE SQL;
```

### Triggers (Future Enhancement)

```sql
-- Auto-promote waitlist on cancellation
CREATE OR REPLACE FUNCTION auto_promote_waitlist()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
    -- Promote first waitlist player
    UPDATE rsvps
    SET status = 'confirmed', position = OLD.position
    WHERE gameId = NEW.gameId
      AND status = 'waitlist'
    ORDER BY createdAt ASC
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rsvp_cancellation_trigger
  AFTER UPDATE ON rsvps
  FOR EACH ROW
  EXECUTE FUNCTION auto_promote_waitlist();
```

---

**Last Updated**: 2025-11-13
**Database Version**: PostgreSQL 17
**Supabase Version**: Latest (Docker)
**Frontend Architecture**: Next.js 14+ with Server-Side Rendering (SSR)
**Key Migrations**:
- `20241113043807_init.sql` - Initial schema
- `20251113052528_add_public_read_policies.sql` - Public read access
- `20251113061035_fix_admin_users_rls_recursion.sql` - Fixed RLS infinite recursion
