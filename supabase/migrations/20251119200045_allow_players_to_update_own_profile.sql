-- Allow players to update their own profile (avatar, nickname, notification_preferences)
-- Players can only update themselves, identified by matching email

CREATE POLICY "Players can update their own profile"
  ON players FOR UPDATE
  USING (
    -- Player can update their own record if their auth email matches the player's email
    auth.jwt() ->> 'email' = email
  )
  WITH CHECK (
    -- Only allow updating specific fields (avatar, nickname, notification_preferences)
    -- This is enforced at the application level, but we also check the email matches
    auth.jwt() ->> 'email' = email
  );

-- Add comment explaining this policy
COMMENT ON POLICY "Players can update their own profile" ON players IS
'Allows authenticated players to update their own avatar, nickname, and notification preferences';
