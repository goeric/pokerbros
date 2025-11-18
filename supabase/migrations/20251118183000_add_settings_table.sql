-- Create settings table for feature flags and app configuration
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public read access (so we can check flags without auth)
CREATE POLICY "Anyone can read settings"
  ON settings FOR SELECT
  USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- Insert default feature flags
INSERT INTO settings (key, value, description) VALUES
  ('email_superadmin_only', 'true', 'When enabled, only superadmins receive emails (safety mode for production)'),
  ('app_version', '"1.0.0"', 'Current application version');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_settings_updated_at_trigger
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_settings_key ON settings(key);
