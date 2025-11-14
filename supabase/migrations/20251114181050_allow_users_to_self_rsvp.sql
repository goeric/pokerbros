-- Allow authenticated users to create RSVPs for their own player account
-- Admins can create RSVPs for anyone, regular users can only create for themselves

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Admins can create rsvps" ON rsvps;
DROP POLICY IF EXISTS "Admins can delete rsvps" ON rsvps;
DROP POLICY IF EXISTS "Admins can update rsvps" ON rsvps;

-- Create new policies that allow users to manage their own RSVPs

-- INSERT: Admins can RSVP anyone, users can RSVP themselves
CREATE POLICY "Users can create rsvps for themselves"
  ON rsvps
  FOR INSERT
  WITH CHECK (
    -- Allow if user is admin
    is_admin_or_higher(auth.uid())
    OR
    -- Allow if user is RSVPing for their own player account (matching email)
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = rsvps."playerId"
      AND players.email = auth.email()
    )
  );

-- DELETE: Admins can delete anyone's RSVP, users can only delete their own
CREATE POLICY "Users can delete their own rsvps"
  ON rsvps
  FOR DELETE
  USING (
    -- Allow if user is admin
    is_admin_or_higher(auth.uid())
    OR
    -- Allow if user is deleting their own RSVP (matching email)
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = rsvps."playerId"
      AND players.email = auth.email()
    )
  );

-- UPDATE: Admins can update anyone's RSVP, users can only update their own
CREATE POLICY "Users can update their own rsvps"
  ON rsvps
  FOR UPDATE
  USING (
    -- Allow if user is updating their own RSVP (matching email)
    is_admin_or_higher(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = rsvps."playerId"
      AND players.email = auth.email()
    )
  );
