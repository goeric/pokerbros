-- Migration: Add Auth and Admin System
-- This migration adds authentication and admin functionality to PokerBros

-- 1. Create players table with new structure
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

-- 2. Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  is_superadmin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for admin_users
-- Only admins can view admin_users table
CREATE POLICY "Admins can view admin_users"
  ON admin_users
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Only superadmins can insert new admins
CREATE POLICY "Superadmins can insert admins"
  ON admin_users
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM admin_users WHERE is_superadmin = TRUE)
  );

-- Only superadmins can update admin_users
CREATE POLICY "Superadmins can update admins"
  ON admin_users
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM admin_users WHERE is_superadmin = TRUE)
  );

-- 5. Create RLS policies for players table (admin-only access)
-- Admins can read players
CREATE POLICY "Admins can view players"
  ON players
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Admins can create players
CREATE POLICY "Admins can create players"
  ON players
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Admins can update players
CREATE POLICY "Admins can update players"
  ON players
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- Admins can delete players
CREATE POLICY "Admins can delete players"
  ON players
  FOR DELETE
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  );

-- 6. Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to check if user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE id = user_id AND is_superadmin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create games table
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

-- Enable RLS for games
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Admins can manage games
CREATE POLICY "Admins can view games"
  ON games FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can create games"
  ON games FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can update games"
  ON games FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can delete games"
  ON games FOR DELETE
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- 9. Create game_players junction table
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

-- Enable RLS for game_players
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view game_players"
  ON game_players FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can create game_players"
  ON game_players FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can update game_players"
  ON game_players FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can delete game_players"
  ON game_players FOR DELETE
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- 10. Create rsvps table
CREATE TABLE IF NOT EXISTS rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "gameId" UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  "playerId" UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'declined', 'waitlist')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  "waitlistPosition" INTEGER,
  UNIQUE("gameId", "playerId")
);

-- Enable RLS for rsvps
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rsvps"
  ON rsvps FOR SELECT
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can create rsvps"
  ON rsvps FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can update rsvps"
  ON rsvps FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Admins can delete rsvps"
  ON rsvps FOR DELETE
  USING (auth.uid() IN (SELECT id FROM admin_users));
