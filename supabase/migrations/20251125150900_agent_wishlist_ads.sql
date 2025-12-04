-- =====================================================
-- Agent Wishlist Ads Feature
-- =====================================================
-- This migration enables agents to:
-- 1. View watchlists from their favorite clubs
-- 2. Create player listings (ads) for players in those watchlists
-- =====================================================

-- =====================================================
-- 1. MODIFY player_listings TABLE
-- =====================================================
-- Add support for agent-created listings
ALTER TABLE player_listings
ADD COLUMN IF NOT EXISTS listed_by_agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make listed_by_club_id nullable (agents don't have a club)
ALTER TABLE player_listings
ALTER COLUMN listed_by_club_id DROP NOT NULL;

-- Add constraint: either club_id or agent_id must be set
ALTER TABLE player_listings
DROP CONSTRAINT IF EXISTS player_listings_listed_by_check;

ALTER TABLE player_listings
ADD CONSTRAINT player_listings_listed_by_check 
CHECK (
  (listed_by_club_id IS NOT NULL AND listed_by_agent_id IS NULL) OR
  (listed_by_club_id IS NULL AND listed_by_agent_id IS NOT NULL)
);

-- Add index for agent lookups
CREATE INDEX IF NOT EXISTS idx_player_listings_agent_id ON player_listings(listed_by_agent_id);

-- =====================================================
-- 2. UPDATE RLS POLICIES FOR player_listings
-- =====================================================
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clubs can view their own listings" ON player_listings;
DROP POLICY IF EXISTS "Clubs can create their own listings" ON player_listings;
DROP POLICY IF EXISTS "Clubs can update their own listings" ON player_listings;
DROP POLICY IF EXISTS "Clubs can delete their own listings" ON player_listings;
DROP POLICY IF EXISTS "Agents can view their own listings" ON player_listings;
DROP POLICY IF EXISTS "Agents can create their own listings" ON player_listings;
DROP POLICY IF EXISTS "Agents can update their own listings" ON player_listings;
DROP POLICY IF EXISTS "Agents can delete their own listings" ON player_listings;

-- Clubs can view their own listings
CREATE POLICY "Clubs can view their own listings"
  ON player_listings FOR SELECT
  USING (
    listed_by_club_id IS NOT NULL AND
    listed_by_club_id IN (
      SELECT club_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Clubs can create their own listings
CREATE POLICY "Clubs can create their own listings"
  ON player_listings FOR INSERT
  WITH CHECK (
    listed_by_club_id IS NOT NULL AND
    listed_by_club_id IN (
      SELECT club_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Clubs can update their own listings
CREATE POLICY "Clubs can update their own listings"
  ON player_listings FOR UPDATE
  USING (
    listed_by_club_id IS NOT NULL AND
    listed_by_club_id IN (
      SELECT club_id FROM profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    listed_by_club_id IS NOT NULL AND
    listed_by_club_id IN (
      SELECT club_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Clubs can delete their own listings
CREATE POLICY "Clubs can delete their own listings"
  ON player_listings FOR DELETE
  USING (
    listed_by_club_id IS NOT NULL AND
    listed_by_club_id IN (
      SELECT club_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Agents can view their own listings
CREATE POLICY "Agents can view their own listings"
  ON player_listings FOR SELECT
  USING (
    listed_by_agent_id IS NOT NULL AND
    listed_by_agent_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'agent'
    )
  );

-- Agents can create their own listings
CREATE POLICY "Agents can create their own listings"
  ON player_listings FOR INSERT
  WITH CHECK (
    listed_by_agent_id IS NOT NULL AND
    listed_by_agent_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'agent'
    )
  );

-- Agents can update their own listings
CREATE POLICY "Agents can update their own listings"
  ON player_listings FOR UPDATE
  USING (
    listed_by_agent_id IS NOT NULL AND
    listed_by_agent_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'agent'
    )
  )
  WITH CHECK (
    listed_by_agent_id IS NOT NULL AND
    listed_by_agent_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'agent'
    )
  );

-- Agents can delete their own listings
CREATE POLICY "Agents can delete their own listings"
  ON player_listings FOR DELETE
  USING (
    listed_by_agent_id IS NOT NULL AND
    listed_by_agent_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'agent'
    )
  );

-- Everyone can view active listings (for marketplace browsing)
CREATE POLICY "Everyone can view active listings"
  ON player_listings FOR SELECT
  USING (status = 'active');

-- =====================================================
-- 3. FUNCTION: Get watchlists from favorite clubs
-- =====================================================
CREATE OR REPLACE FUNCTION get_agent_favorite_club_watchlists(p_agent_id UUID)
RETURNS TABLE (
  watchlist_id INTEGER,
  club_id INTEGER,
  club_name TEXT,
  player_id INTEGER,
  player_name TEXT,
  player_position TEXT,
  wyscout_player_id INTEGER,
  player_club_id INTEGER,
  player_club_name TEXT,
  added_to_watchlist_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id::INTEGER as watchlist_id,
    c_tm.id::INTEGER as club_id,
    c_tm.name::TEXT as club_name,
    p.id::INTEGER as player_id,
    p.name::TEXT as player_name,
    p.position::TEXT as player_position,
    p.wyscout_player_id::INTEGER,
    pc.id::INTEGER as player_club_id,
    pc.name::TEXT as player_club_name,
    w.created_at::TIMESTAMPTZ as added_to_watchlist_at
  FROM agent_favorite_clubs afc
  JOIN clubs_transfermarkt c_tm ON afc.club_id = c_tm.id
  JOIN clubs c ON c.name = c_tm.name  -- Join by name to match watchlist clubs
  JOIN watchlist w ON w.club_id = c.id
  JOIN players p ON w.player_id = p.id
  LEFT JOIN clubs pc ON p.club_id = pc.id
  WHERE afc.agent_id = p_agent_id
  ORDER BY c_tm.name, w.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_agent_favorite_club_watchlists(UUID) TO authenticated;

-- =====================================================
-- 4. FUNCTION: Check if player is in agent's roster
-- =====================================================
CREATE OR REPLACE FUNCTION is_player_in_agent_roster(
  p_agent_id UUID,
  p_player_id INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM agent_rosters
    WHERE agent_id = p_agent_id
    AND player_id = p_player_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_player_in_agent_roster(UUID, INTEGER) TO authenticated;

-- =====================================================
-- 5. FUNCTION: Get watchlist players that are in agent's roster
-- =====================================================
CREATE OR REPLACE FUNCTION get_watchlist_players_in_roster(p_agent_id UUID)
RETURNS TABLE (
  watchlist_id INTEGER,
  club_id INTEGER,
  club_name TEXT,
  player_id INTEGER,
  player_name TEXT,
  player_position TEXT,
  wyscout_player_id INTEGER,
  player_club_id INTEGER,
  player_club_name TEXT,
  added_to_watchlist_at TIMESTAMPTZ,
  is_in_roster BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id::INTEGER as watchlist_id,
    c_tm.id::INTEGER as club_id,
    c_tm.name::TEXT as club_name,
    p.id::INTEGER as player_id,
    p.name::TEXT as player_name,
    p.position::TEXT as player_position,
    p.wyscout_player_id::INTEGER,
    pc.id::INTEGER as player_club_id,
    pc.name::TEXT as player_club_name,
    w.created_at::TIMESTAMPTZ as added_to_watchlist_at,
    EXISTS (
      SELECT 1 FROM agent_rosters ar
      WHERE ar.agent_id = p_agent_id
      AND ar.player_id = p.id
    )::BOOLEAN as is_in_roster
  FROM agent_favorite_clubs afc
  JOIN clubs_transfermarkt c_tm ON afc.club_id = c_tm.id
  JOIN clubs c ON c.name = c_tm.name  -- Join by name to match watchlist clubs
  JOIN watchlist w ON w.club_id = c.id
  JOIN players p ON w.player_id = p.id
  LEFT JOIN clubs pc ON p.club_id = pc.id
  WHERE afc.agent_id = p_agent_id
  ORDER BY c_tm.name, w.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_watchlist_players_in_roster(UUID) TO authenticated;

