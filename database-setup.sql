-- ============================================================================
-- PokerBros Database Setup
-- Complete database schema for PokerBros application
-- Run this in your Supabase SQL Editor to set up everything from scratch
-- ============================================================================

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- Players table - stores all poker players
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nickname TEXT,
  email TEXT UNIQUE NOT NULL,
  "totalIn" NUMERIC DEFAULT 0,
  "totalOut" NUMERIC DEFAULT 0,
  "gamesPlayed" INTEGER DEFAULT 0,
  "biggestWin" NUMERIC DEFAULT 0,
  "biggestLoss" NUMERIC DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users table - links to Supabase Auth users
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  is_superadmin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games table - stores poker game events
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  "buyIn" NUMERIC NOT NULL,
  venue TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'in_progress', 'completed')),
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Game players table - junction table for games and players
CREATE TABLE IF NOT EXISTS game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "gameId" UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  "playerId" UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  "buyIns" NUMERIC[] DEFAULT '{}',
  "cashOut" NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  position INTEGER,
  UNIQUE("gameId", "playerId")
);

-- RSVPs table - manages player confirmations for upcoming games
CREATE TABLE IF NOT EXISTS rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "gameId" UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  "playerId" UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'declined', 'waitlist')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  "waitlistPosition" INTEGER,
  UNIQUE("gameId", "playerId")
);

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE id = user_id AND is_superadmin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. RLS POLICIES - ADMIN_USERS TABLE
-- ============================================================================

-- Allow any authenticated user to view admin_users
-- (Middleware enforces /admin route access)
CREATE POLICY "Authenticated users can view admin_users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Only superadmins can insert new admins
CREATE POLICY "Superadmins can insert admins"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (is_superadmin(auth.uid()));

-- Only superadmins can update admin_users
CREATE POLICY "Superadmins can update admins"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (is_superadmin(auth.uid()));

-- Only superadmins can delete admins
CREATE POLICY "Superadmins can delete admins"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (is_superadmin(auth.uid()));

-- ============================================================================
-- 5. RLS POLICIES - PLAYERS TABLE
-- ============================================================================

-- Public can view all players (for leaderboards and stats)
CREATE POLICY "Public can view players"
  ON players
  FOR SELECT
  TO public
  USING (true);

-- Only admins can create players
CREATE POLICY "Admins can create players"
  ON players
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can update players
CREATE POLICY "Admins can update players"
  ON players
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Only admins can delete players
CREATE POLICY "Admins can delete players"
  ON players
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================================================
-- 6. RLS POLICIES - GAMES TABLE
-- ============================================================================

-- Public can view all games
CREATE POLICY "Public can view games"
  ON games
  FOR SELECT
  TO public
  USING (true);

-- Only admins can create games
CREATE POLICY "Admins can create games"
  ON games
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can update games
CREATE POLICY "Admins can update games"
  ON games
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Only admins can delete games
CREATE POLICY "Admins can delete games"
  ON games
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================================================
-- 7. RLS POLICIES - GAME_PLAYERS TABLE
-- ============================================================================

-- Public can view all game_players (for results and stats)
CREATE POLICY "Public can view game_players"
  ON game_players
  FOR SELECT
  TO public
  USING (true);

-- Only admins can create game_players
CREATE POLICY "Admins can create game_players"
  ON game_players
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can update game_players
CREATE POLICY "Admins can update game_players"
  ON game_players
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Only admins can delete game_players
CREATE POLICY "Admins can delete game_players"
  ON game_players
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================================================
-- 8. RLS POLICIES - RSVPS TABLE
-- ============================================================================

-- Public can view all rsvps (for game attendance display)
CREATE POLICY "Public can view rsvps"
  ON rsvps
  FOR SELECT
  TO public
  USING (true);

-- Only admins can create rsvps
CREATE POLICY "Admins can create rsvps"
  ON rsvps
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can update rsvps
CREATE POLICY "Admins can update rsvps"
  ON rsvps
  FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Only admins can delete rsvps
CREATE POLICY "Admins can delete rsvps"
  ON rsvps
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================================================
-- 9. SETUP INSTRUCTIONS
-- ============================================================================

-- After running this script, you need to add your first superadmin user:
--
-- 1. Sign up via Google OAuth in your application at /login
-- 2. Copy your user ID from the auth.users table
-- 3. Run this SQL command (replace YOUR_USER_ID and YOUR_EMAIL):
--
-- INSERT INTO admin_users (id, email, is_superadmin)
-- VALUES ('YOUR_USER_ID', 'YOUR_EMAIL', true);
--
-- Example:
-- INSERT INTO admin_users (id, email, is_superadmin)
-- VALUES ('123e4567-e89b-12d3-a456-426614174000', 'admin@example.com', true);
--
-- After this, you can add more admins through the /admin interface.

-- ============================================================================
-- DONE! Your database is ready to use.
-- ============================================================================
