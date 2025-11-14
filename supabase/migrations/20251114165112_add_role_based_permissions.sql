-- Add role-based permissions to admin_users table
-- Roles: superadmin (full access), admin (manage games/players), viewer (read-only)

-- 1. Create enum type for user roles
CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'viewer');

-- 2. Add role column to admin_users table
ALTER TABLE admin_users
ADD COLUMN role user_role DEFAULT 'admin';

-- 3. Migrate existing data: sync role with is_superadmin flag
UPDATE admin_users
SET role = CASE
  WHEN is_superadmin = TRUE THEN 'superadmin'::user_role
  ELSE 'admin'::user_role
END;

-- 4. Make role NOT NULL after data migration
ALTER TABLE admin_users
ALTER COLUMN role SET NOT NULL;

-- 5. Create helper functions for role checking
CREATE OR REPLACE FUNCTION has_role(user_id UUID, required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = user_id
    AND (
      -- Superadmin has access to everything
      role = 'superadmin'::user_role
      OR
      -- User has the exact required role
      role = required_role
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_viewer_or_higher(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_higher(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = user_id
    AND role IN ('admin'::user_role, 'superadmin'::user_role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update RLS policies to differentiate between viewers and admins

-- Players: viewers can read, admins can write
DROP POLICY IF EXISTS "Admins can view players" ON players;
DROP POLICY IF EXISTS "Admins can create players" ON players;
DROP POLICY IF EXISTS "Admins can update players" ON players;
DROP POLICY IF EXISTS "Admins can delete players" ON players;

CREATE POLICY "All authenticated users can view players"
  ON players FOR SELECT
  USING (is_viewer_or_higher(auth.uid()));

CREATE POLICY "Admins can create players"
  ON players FOR INSERT
  WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can update players"
  ON players FOR UPDATE
  USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can delete players"
  ON players FOR DELETE
  USING (is_admin_or_higher(auth.uid()));

-- Games: viewers can read, admins can write
DROP POLICY IF EXISTS "Admins can view games" ON games;
DROP POLICY IF EXISTS "Admins can create games" ON games;
DROP POLICY IF EXISTS "Admins can update games" ON games;
DROP POLICY IF EXISTS "Admins can delete games" ON games;

CREATE POLICY "All authenticated users can view games"
  ON games FOR SELECT
  USING (is_viewer_or_higher(auth.uid()));

CREATE POLICY "Admins can create games"
  ON games FOR INSERT
  WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can update games"
  ON games FOR UPDATE
  USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can delete games"
  ON games FOR DELETE
  USING (is_admin_or_higher(auth.uid()));

-- Game Players: viewers can read, admins can write
DROP POLICY IF EXISTS "Admins can view game_players" ON game_players;
DROP POLICY IF EXISTS "Admins can create game_players" ON game_players;
DROP POLICY IF EXISTS "Admins can update game_players" ON game_players;
DROP POLICY IF EXISTS "Admins can delete game_players" ON game_players;

CREATE POLICY "All authenticated users can view game_players"
  ON game_players FOR SELECT
  USING (is_viewer_or_higher(auth.uid()));

CREATE POLICY "Admins can create game_players"
  ON game_players FOR INSERT
  WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can update game_players"
  ON game_players FOR UPDATE
  USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can delete game_players"
  ON game_players FOR DELETE
  USING (is_admin_or_higher(auth.uid()));

-- RSVPs: viewers can read, admins can write
DROP POLICY IF EXISTS "Admins can view rsvps" ON rsvps;
DROP POLICY IF EXISTS "Admins can create rsvps" ON rsvps;
DROP POLICY IF EXISTS "Admins can update rsvps" ON rsvps;
DROP POLICY IF EXISTS "Admins can delete rsvps" ON rsvps;

CREATE POLICY "All authenticated users can view rsvps"
  ON rsvps FOR SELECT
  USING (is_viewer_or_higher(auth.uid()));

CREATE POLICY "Admins can create rsvps"
  ON rsvps FOR INSERT
  WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can update rsvps"
  ON rsvps FOR UPDATE
  USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Admins can delete rsvps"
  ON rsvps FOR DELETE
  USING (is_admin_or_higher(auth.uid()));

-- Admin users: only superadmins can manage other admins
DROP POLICY IF EXISTS "Superadmins can insert admins" ON admin_users;
DROP POLICY IF EXISTS "Superadmins can update admins" ON admin_users;

CREATE POLICY "Superadmins can insert admins"
  ON admin_users FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM admin_users WHERE role = 'superadmin'::user_role)
  );

CREATE POLICY "Superadmins can update admins"
  ON admin_users FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM admin_users WHERE role = 'superadmin'::user_role)
  );

-- Add comment explaining the role system
COMMENT ON COLUMN admin_users.role IS
'User role: superadmin (full access), admin (manage games/players), viewer (read-only access)';

COMMENT ON TYPE user_role IS
'Three-tier role system: superadmin > admin > viewer';
