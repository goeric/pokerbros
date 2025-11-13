-- Add public read access to games, players, game_players, and rsvps
-- This allows anyone to view games and stats, but only admins can modify

-- Public can read all players
CREATE POLICY "Public can view players"
  ON players
  FOR SELECT
  TO public
  USING (true);

-- Public can read all games
CREATE POLICY "Public can view games"
  ON games
  FOR SELECT
  TO public
  USING (true);

-- Public can read all game_players
CREATE POLICY "Public can view game_players"
  ON game_players
  FOR SELECT
  TO public
  USING (true);

-- Public can read all rsvps
CREATE POLICY "Public can view rsvps"
  ON rsvps
  FOR SELECT
  TO public
  USING (true);
