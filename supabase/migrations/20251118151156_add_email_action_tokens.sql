-- Create email_action_tokens table for one-click email actions
-- This enables secure RSVP/Cancel RSVP directly from email links

CREATE TABLE email_action_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('rsvp', 'cancel_rsvp')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

-- Index for fast token lookups
CREATE INDEX idx_email_action_tokens_token ON email_action_tokens(token);
CREATE INDEX idx_email_action_tokens_expires ON email_action_tokens(expires_at);

-- Enable RLS
ALTER TABLE email_action_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Anyone can use a valid token (no auth required for one-click actions)
CREATE POLICY "Anyone can read valid tokens"
  ON email_action_tokens FOR SELECT
  USING (used_at IS NULL AND expires_at > NOW());

CREATE POLICY "Anyone can mark tokens as used"
  ON email_action_tokens FOR UPDATE
  USING (used_at IS NULL AND expires_at > NOW());

-- Admins can manage all tokens
CREATE POLICY "Admins can manage tokens"
  ON email_action_tokens FOR ALL
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- Add comment
COMMENT ON TABLE email_action_tokens IS 'Secure one-time-use tokens for email action links (RSVP, Cancel RSVP). Tokens expire after 30 days and can only be used once.';
