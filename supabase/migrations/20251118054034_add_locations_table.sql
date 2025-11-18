-- Create locations table for managing game venues with addresses
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add location reference to games table
ALTER TABLE games ADD COLUMN location_id UUID REFERENCES locations(id);

-- Migrate existing venue data to locations table
-- Extract unique venues and create location records
INSERT INTO locations (name, address)
SELECT DISTINCT
  venue as name,
  'Address TBD' as address  -- Admin will need to update with real addresses
FROM games
WHERE venue IS NOT NULL AND venue != '';

-- Link existing games to their corresponding locations
UPDATE games
SET location_id = (
  SELECT id FROM locations WHERE locations.name = games.venue LIMIT 1
)
WHERE venue IS NOT NULL AND venue != '';

-- RLS policies for locations table
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can see locations)
CREATE POLICY "Anyone can view locations"
  ON locations
  FOR SELECT
  USING (true);

-- Admins can create locations
CREATE POLICY "Admins can create locations"
  ON locations
  FOR INSERT
  WITH CHECK (is_admin_or_higher(auth.uid()));

-- Admins can update locations
CREATE POLICY "Admins can update locations"
  ON locations
  FOR UPDATE
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

-- Admins can delete locations (only if not referenced by any games)
CREATE POLICY "Admins can delete locations"
  ON locations
  FOR DELETE
  USING (
    is_admin_or_higher(auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM games WHERE games.location_id = locations.id
    )
  );

-- Add index for performance
CREATE INDEX idx_games_location_id ON games(location_id);

-- Note: We're keeping the venue column for now for backwards compatibility
-- It can be dropped in a future migration once email system is stable
