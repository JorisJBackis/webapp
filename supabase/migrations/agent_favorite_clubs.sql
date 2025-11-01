-- =====================================================
-- Agent Favorite Clubs & Smart Matching Feature
-- =====================================================
-- This migration creates:
-- 1. agent_favorite_clubs table
-- 2. Squad analysis functions
-- 3. Smart matching/recommendations functions
-- 4. RLS policies
-- =====================================================

-- =====================================================
-- 1. CREATE agent_favorite_clubs TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_favorite_clubs (
  id SERIAL PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id INTEGER NOT NULL REFERENCES clubs_transfermarkt(id) ON DELETE CASCADE,
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, club_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_favorite_clubs_agent_id ON agent_favorite_clubs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_favorite_clubs_club_id ON agent_favorite_clubs(club_id);

-- Enable RLS
ALTER TABLE agent_favorite_clubs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Agents can view own favorite clubs" ON agent_favorite_clubs;
DROP POLICY IF EXISTS "Agents can add favorite clubs" ON agent_favorite_clubs;
DROP POLICY IF EXISTS "Agents can update own favorite clubs" ON agent_favorite_clubs;
DROP POLICY IF EXISTS "Agents can delete own favorite clubs" ON agent_favorite_clubs;
DROP POLICY IF EXISTS "Admins can view all favorite clubs" ON agent_favorite_clubs;

-- RLS Policies
-- Agents can view their own favorite clubs
CREATE POLICY "Agents can view own favorite clubs"
  ON agent_favorite_clubs FOR SELECT
  USING (auth.uid() = agent_id);

-- Agents can insert their own favorite clubs
CREATE POLICY "Agents can add favorite clubs"
  ON agent_favorite_clubs FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

-- Agents can update their own favorite clubs
CREATE POLICY "Agents can update own favorite clubs"
  ON agent_favorite_clubs FOR UPDATE
  USING (auth.uid() = agent_id);

-- Agents can delete their own favorite clubs
CREATE POLICY "Agents can delete own favorite clubs"
  ON agent_favorite_clubs FOR DELETE
  USING (auth.uid() = agent_id);

-- Admins can view all favorite clubs
CREATE POLICY "Admins can view all favorite clubs"
  ON agent_favorite_clubs FOR SELECT
  USING (is_admin(auth.uid()));

-- =====================================================
-- 2. BASIC CRUD FUNCTIONS
-- =====================================================

-- Add a club to favorites
CREATE OR REPLACE FUNCTION add_favorite_club(
  p_agent_id UUID,
  p_club_id INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verify the user is the agent making the request
  IF auth.uid() != p_agent_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only add clubs to your own favorites';
  END IF;

  -- Insert the favorite club
  INSERT INTO agent_favorite_clubs (agent_id, club_id, notes)
  VALUES (p_agent_id, p_club_id, p_notes)
  ON CONFLICT (agent_id, club_id) DO UPDATE
    SET notes = EXCLUDED.notes,
        updated_at = NOW();

  -- Return success
  SELECT json_build_object(
    'success', true,
    'message', 'Club added to favorites'
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_favorite_club(UUID, INTEGER, TEXT) TO authenticated;

-- Remove a club from favorites
CREATE OR REPLACE FUNCTION remove_favorite_club(
  p_agent_id UUID,
  p_club_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_row_count INTEGER;
BEGIN
  -- Verify the user is the agent making the request
  IF auth.uid() != p_agent_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only remove clubs from your own favorites';
  END IF;

  -- Delete the favorite club
  DELETE FROM agent_favorite_clubs
  WHERE agent_id = p_agent_id AND club_id = p_club_id;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  RETURN v_row_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION remove_favorite_club(UUID, INTEGER) TO authenticated;

-- Get agent's favorite clubs with club details
CREATE OR REPLACE FUNCTION get_agent_favorite_clubs(p_agent_id UUID)
RETURNS TABLE (
  favorite_id INTEGER,
  club_id INTEGER,
  club_name TEXT,
  competition_name TEXT,
  country TEXT,
  notes TEXT,
  added_at TIMESTAMPTZ,
  squad_size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    afc.id::INTEGER as favorite_id,
    c.id::INTEGER as club_id,
    c.name::TEXT as club_name,
    c.competition_name::TEXT,
    c.country::TEXT,
    afc.notes::TEXT,
    afc.added_at::TIMESTAMPTZ,
    COUNT(p.id)::BIGINT as squad_size
  FROM agent_favorite_clubs afc
  JOIN clubs_transfermarkt c ON afc.club_id = c.id
  LEFT JOIN players_transfermarkt p ON p.club_id = c.id
  WHERE afc.agent_id = p_agent_id
  GROUP BY afc.id, c.id, c.name, c.competition_name, c.country, afc.notes, afc.added_at
  ORDER BY afc.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_agent_favorite_clubs(UUID) TO authenticated;

-- =====================================================
-- 3. SQUAD ANALYSIS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION analyze_club_squad_by_position(p_club_id INTEGER)
RETURNS TABLE (
  "position" TEXT,
  player_count BIGINT,
  avg_age NUMERIC,
  avg_market_value NUMERIC,
  players_with_expiring_contracts BIGINT, -- contracts expiring within 12 months
  player_details JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p.main_position, 'Unknown') as "position",
    COUNT(p.id) as player_count,
    ROUND(AVG(p.age), 1) as avg_age,
    ROUND(AVG(p.market_value_eur), 0) as avg_market_value,
    COUNT(CASE
      WHEN p.contract_expires IS NOT NULL
        AND p.contract_expires::DATE <= (NOW() + INTERVAL '12 months')::DATE
      THEN 1
    END) as players_with_expiring_contracts,
    jsonb_agg(
      jsonb_build_object(
        'player_id', p.id,
        'name', p.name,
        'age', p.age,
        'market_value', p.market_value_eur,
        'contract_expires', p.contract_expires,
        'foot', p.foot,
        'height', p.height
      )
      ORDER BY p.market_value_eur DESC NULLS LAST
    ) as player_details
  FROM players_transfermarkt p
  WHERE p.club_id = p_club_id
  GROUP BY "position"
  ORDER BY player_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION analyze_club_squad_by_position(INTEGER) TO authenticated;

-- =====================================================
-- 4. SMART MATCHING/RECOMMENDATIONS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_smart_recommendations(p_agent_id UUID)
RETURNS TABLE (
  club_id INTEGER,
  club_name TEXT,
  competition_name TEXT,
  country TEXT,
  squad_analysis JSONB,
  recommended_players JSONB,
  not_recommended_players JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- Get agent's favorite clubs
  favorite_clubs AS (
    SELECT afc.club_id, c.name as club_name, c.competition_name, c.country
    FROM agent_favorite_clubs afc
    JOIN clubs_transfermarkt c ON afc.club_id = c.id
    WHERE afc.agent_id = p_agent_id
  ),
  -- Get agent's roster
  agent_roster AS (
    SELECT
      p.id as player_id,
      p.name as player_name,
      p.main_position,
      p.age,
      p.height,
      p.foot,
      p.market_value_eur,
      p.contract_expires,
      p.nationality
    FROM agent_rosters ar
    JOIN players_transfermarkt p ON ar.player_id = p.id
    WHERE ar.agent_id = p_agent_id
  ),
  -- Analyze squad composition for each favorite club
  club_squad_positions AS (
    SELECT
      fc.club_id,
      fc.club_name,
      fc.competition_name,
      fc.country,
      COALESCE(p.main_position, 'Unknown') as "position",
      COUNT(p.id) as player_count,
      ROUND(AVG(p.age), 1) as avg_age,
      ROUND(AVG(p.market_value_eur), 0) as avg_market_value,
      -- Count players with contracts expiring within 12 months
      COUNT(CASE
        WHEN p.contract_expires IS NOT NULL
          AND p.contract_expires::DATE <= (NOW() + INTERVAL '12 months')::DATE
        THEN 1
      END) as expiring_contracts,
      -- Get highest market value in this position
      MAX(p.market_value_eur) as max_market_value
    FROM favorite_clubs fc
    LEFT JOIN players_transfermarkt p ON p.club_id = fc.club_id
    GROUP BY fc.club_id, fc.club_name, fc.competition_name, fc.country, "position"
  ),
  -- Match roster players to clubs with recommendations
  player_recommendations AS (
    SELECT
      csp.club_id,
      csp.club_name,
      csp.competition_name,
      csp.country,
      ar.player_id,
      ar.player_name,
      ar.main_position,
      ar.age,
      ar.market_value_eur,
      ar.contract_expires,
      ar.height,
      ar.foot,
      ar.nationality,
      csp.player_count,
      csp.avg_age as position_avg_age,
      csp.avg_market_value as position_avg_value,
      csp.expiring_contracts,
      csp.max_market_value as position_max_value,
      -- Determine if recommended
      CASE
        -- RECOMMEND if: Position has 0-1 players
        WHEN csp.player_count <= 1 THEN true
        -- RECOMMEND if: Position has players with expiring contracts
        WHEN csp.expiring_contracts > 0 THEN true
        -- RECOMMEND if: Agent's player has significantly higher value (2x)
        WHEN ar.market_value_eur >= (csp.max_market_value * 2) THEN true
        -- RECOMMEND if: Agent's player is younger and similar/higher value
        WHEN ar.age < csp.avg_age AND ar.market_value_eur >= (csp.avg_market_value * 0.8) THEN true
        -- Otherwise, NOT recommended
        ELSE false
      END as is_recommended,
      -- Generate reason
      CASE
        WHEN csp.player_count = 0 THEN 'Squad gap - no players in this position'
        WHEN csp.player_count = 1 THEN 'Limited depth - only 1 player in this position'
        WHEN csp.expiring_contracts > 0 THEN 'Opportunity - ' || csp.expiring_contracts || ' player(s) with expiring contracts'
        WHEN ar.market_value_eur >= (csp.max_market_value * 2) THEN 'Higher value - your player worth 2x more than current squad'
        WHEN ar.age < csp.avg_age AND ar.market_value_eur >= (csp.avg_market_value * 0.8) THEN 'Younger & valuable - good long-term investment'
        WHEN csp.player_count >= 2 THEN 'Position saturated - ' || csp.player_count || ' players already in squad'
        ELSE 'Current squad players have better terms'
      END as recommendation_reason
    FROM agent_roster ar
    LEFT JOIN club_squad_positions csp
      ON csp."position" = ar.main_position
      OR csp."position" = 'Unknown' -- Handle clubs with no squad data
  )
  -- Aggregate recommendations by club
  SELECT
    fc.club_id as club_id,
    fc.club_name as club_name,
    fc.competition_name as competition_name,
    fc.country as country,
    -- Squad analysis summary
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'position', "position",
          'player_count', player_count,
          'avg_age', avg_age,
          'avg_market_value', avg_market_value,
          'expiring_contracts', expiring_contracts
        )
        ORDER BY player_count DESC
      )
      FROM club_squad_positions csp2
      WHERE csp2.club_id = fc.club_id
    ) as squad_analysis,
    -- Recommended players
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'player_id', pr.player_id,
        'player_name', pr.player_name,
        'position', pr.main_position,
        'age', pr.age,
        'market_value', pr.market_value_eur,
        'contract_expires', pr.contract_expires,
        'height', pr.height,
        'foot', pr.foot,
        'nationality', pr.nationality,
        'reason', pr.recommendation_reason
      )
      ORDER BY jsonb_build_object(
        'player_id', pr.player_id,
        'player_name', pr.player_name,
        'position', pr.main_position,
        'age', pr.age,
        'market_value', pr.market_value_eur,
        'contract_expires', pr.contract_expires,
        'height', pr.height,
        'foot', pr.foot,
        'nationality', pr.nationality,
        'reason', pr.recommendation_reason
      )
    ) FILTER (WHERE pr.is_recommended = true) as recommended_players,
    -- Not recommended players
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'player_id', pr.player_id,
        'player_name', pr.player_name,
        'position', pr.main_position,
        'age', pr.age,
        'market_value', pr.market_value_eur,
        'reason', pr.recommendation_reason
      )
      ORDER BY jsonb_build_object(
        'player_id', pr.player_id,
        'player_name', pr.player_name,
        'position', pr.main_position,
        'age', pr.age,
        'market_value', pr.market_value_eur,
        'reason', pr.recommendation_reason
      )
    ) FILTER (WHERE pr.is_recommended = false) as not_recommended_players
  FROM favorite_clubs fc
  LEFT JOIN player_recommendations pr ON pr.club_id = fc.club_id
  GROUP BY fc.club_id, fc.club_name, fc.competition_name, fc.country
  ORDER BY fc.club_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_smart_recommendations(UUID) TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ Agent Favorite Clubs feature migration completed!' as status;
