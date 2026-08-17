-- Track the iCalendar SEQUENCE number for each game.
--
-- Every .ics we send for a game reuses the same UID (game-{id}@pokerbros.xyz) so
-- calendar apps update the existing event instead of creating a duplicate.
-- RFC 5546 (iTIP) §2.1.4 makes the higher SEQUENCE win; when two revisions carry
-- the same SEQUENCE, DTSTAMP is the tiebreaker. In practice Google Calendar and
-- Outlook are stricter than the spec and quietly drop a revision that does not
-- raise SEQUENCE at all. That is how the old hardcoded values produced stale
-- invites: every update shipped SEQUENCE:1, so the second and later reschedules
-- of a game were ignored and attendees kept the original date.
--
-- This column is the per-game counter, and next_game_calendar_sequence() below is
-- the only thing that moves it. Every path that emits an .ics bumps it and sends
-- the returned value, so each revision is strictly higher than anything an
-- attendee already holds. Gaps are expected and harmless — only monotonicity
-- matters.

-- Existing rows start at 1, not 0: they may already have shipped a SEQUENCE:1
-- revision from the old hardcoded update path, so their next emit must reach 2 to
-- supersede it. (Postgres 11+ makes ADD COLUMN ... NOT NULL DEFAULT a
-- metadata-only change, so this does not rewrite the table.)
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS calendar_sequence INTEGER NOT NULL DEFAULT 1;

-- Games created from here on have never sent an invite, so they start at 0.
ALTER TABLE games ALTER COLUMN calendar_sequence SET DEFAULT 0;

COMMENT ON COLUMN games.calendar_sequence IS
  'Highest iCalendar SEQUENCE emitted for this game. Only ever advanced via next_game_calendar_sequence().';

-- Atomic bump. Doing this as a read-modify-write in the application would let two
-- concurrent requests hand out the same SEQUENCE for different revisions, and
-- every calendar client would discard whichever arrived second.
--
-- SECURITY DEFINER because non-admins also trigger invites (self-RSVP, one-click
-- cancel from an email link) and the "Admins can update games" policy would
-- otherwise block the bump. The body only increments one integer on one row and
-- returns it, so it grants no ability to read or change anything else.
CREATE OR REPLACE FUNCTION next_game_calendar_sequence(p_game_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sequence INTEGER;
BEGIN
  UPDATE games
  SET calendar_sequence = calendar_sequence + 1
  WHERE id = p_game_id
  RETURNING calendar_sequence INTO v_sequence;

  -- NULL when the game no longer exists; callers fall back to their own counter.
  RETURN v_sequence;
END;
$$;

GRANT EXECUTE ON FUNCTION next_game_calendar_sequence(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION next_game_calendar_sequence(UUID) TO anon;

COMMENT ON FUNCTION next_game_calendar_sequence IS
'Atomically increments and returns a game''s iCalendar SEQUENCE.
Every .ics emitted for a game must use a value from this function so that each
revision supersedes the one attendees already hold.';
