-- Add email_notifications column to players table
-- Default to TRUE so existing players are opted in by default
-- Players can opt out from their profile settings

ALTER TABLE players
ADD COLUMN email_notifications BOOLEAN NOT NULL DEFAULT TRUE;

-- Add comment explaining the column
COMMENT ON COLUMN players.email_notifications IS 'Whether the player wants to receive email notifications for games and RSVPs';
