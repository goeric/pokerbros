-- Add avatar and notification_preferences columns to players table

-- Add avatar column (stores filename like "avatar1.svg")
ALTER TABLE players
ADD COLUMN avatar TEXT DEFAULT 'avatar1.svg';

-- Add notification_preferences column (JSONB for flexibility)
ALTER TABLE players
ADD COLUMN notification_preferences JSONB DEFAULT '{
  "game_created": true,
  "game_updated": true,
  "game_cancelled": true,
  "rsvp_confirmed": true,
  "rsvp_cancelled": false,
  "waitlist_promoted": true,
  "game_reminder_24h": true,
  "game_reminder_3h": true
}'::jsonb;

-- Update existing players with random avatars (1-50)
-- Using a deterministic hash based on player ID to assign avatars
UPDATE players
SET avatar = 'avatar' || (
  (('x' || substring(md5(id::text), 1, 8))::bit(32)::bigint % 50) + 1
)::text || '.svg'
WHERE avatar = 'avatar1.svg';

-- Add comment for documentation
COMMENT ON COLUMN players.avatar IS 'Avatar filename (avatar1.svg to avatar50.svg)';
COMMENT ON COLUMN players.notification_preferences IS 'User notification preferences as JSONB';
