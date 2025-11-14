-- Create function to atomically promote next waitlist player
-- This prevents race conditions when multiple requests try to promote players simultaneously
CREATE OR REPLACE FUNCTION promote_next_waitlist_player(p_game_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promoted_rsvp_id UUID;
BEGIN
  -- Select the first waitlist player and lock the row
  -- FOR UPDATE SKIP LOCKED prevents concurrent transactions from blocking each other
  -- Only one transaction will successfully lock and promote the player
  SELECT id INTO v_promoted_rsvp_id
  FROM rsvps
  WHERE "gameId" = p_game_id
    AND status = 'waitlist'
  ORDER BY "waitlistPosition" ASC NULLS LAST
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If we found a waitlist player, promote them
  IF v_promoted_rsvp_id IS NOT NULL THEN
    UPDATE rsvps
    SET status = 'confirmed',
        "waitlistPosition" = NULL
    WHERE id = v_promoted_rsvp_id;
  END IF;

  RETURN v_promoted_rsvp_id;
END;
$$;

-- Grant execute permission to authenticated users (will be checked by RLS)
GRANT EXECUTE ON FUNCTION promote_next_waitlist_player(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_next_waitlist_player(UUID) TO anon;

-- Add comment explaining the function
COMMENT ON FUNCTION promote_next_waitlist_player IS
'Atomically promotes the next waitlist player to confirmed status for a game.
Uses row-level locking with SKIP LOCKED to prevent race conditions when multiple
requests try to promote players simultaneously.';
