-- =====================================================
-- SEARCH AVAILABLE PLAYERS - OPTIMIZED SERVER-SIDE SEARCH
-- =====================================================
-- This migration creates indexes and functions for fast
-- player search in the Add Roster Player modal

-- 1. Create indexes for search performance
-- Note: Trigram index requires pg_trgm extension, using LOWER index instead
CREATE INDEX IF NOT EXISTS idx_players_transfermarkt_name_lower
  ON players_transfermarkt (LOWER(name));

CREATE INDEX IF NOT EXISTS idx_players_transfermarkt_position
  ON players_transfermarkt (main_position);

CREATE INDEX IF NOT EXISTS idx_players_transfermarkt_nationality
  ON players_transfermarkt (nationality);

CREATE INDEX IF NOT EXISTS idx_players_transfermarkt_agent
  ON players_transfermarkt (player_agent);

CREATE INDEX IF NOT EXISTS idx_players_transfermarkt_club_id
  ON players_transfermarkt (club_id);

-- 2. Create function to get filter options (cached on client)
CREATE OR REPLACE FUNCTION get_player_filter_options()
RETURNS TABLE (
  positions TEXT[],
  nationalities TEXT[],
  agencies TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT ARRAY_AGG(DISTINCT main_position ORDER BY main_position)
     FROM players_transfermarkt
     WHERE main_position IS NOT NULL AND main_position != '') as positions,
    (SELECT ARRAY_AGG(DISTINCT nationality ORDER BY nationality)
     FROM players_transfermarkt
     WHERE nationality IS NOT NULL AND nationality != '') as nationalities,
    (SELECT ARRAY_AGG(DISTINCT player_agent ORDER BY player_agent)
     FROM players_transfermarkt
     WHERE player_agent IS NOT NULL AND player_agent != '') as agencies;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Create main search function with pagination
CREATE OR REPLACE FUNCTION search_available_players(
  p_agent_id UUID,
  p_search TEXT DEFAULT NULL,
  p_position TEXT DEFAULT NULL,
  p_nationality TEXT DEFAULT NULL,
  p_agency TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  age INTEGER,
  main_position TEXT,
  nationality TEXT,
  height INTEGER,
  foot TEXT,
  contract_expires TEXT,
  market_value_eur INTEGER,
  is_eu_passport BOOLEAN,
  picture_url TEXT,
  transfermarkt_url TEXT,
  player_agent TEXT,
  club_id BIGINT,
  club_name TEXT,
  club_logo_url TEXT,
  league_name TEXT,
  league_country TEXT,
  has_saved_note BOOLEAN,
  saved_note TEXT,
  total_count BIGINT
) AS $$
DECLARE
  v_total_count BIGINT;
BEGIN
  -- Get total count for pagination info
  SELECT COUNT(*) INTO v_total_count
  FROM players_transfermarkt p
  WHERE
    -- Exclude already rostered players
    NOT EXISTS (
      SELECT 1 FROM agent_rosters ar
      WHERE ar.agent_id = p_agent_id AND ar.player_id = p.id
    )
    -- Search filter (name, club name via join, or agency)
    AND (
      p_search IS NULL
      OR p_search = ''
      OR LOWER(p.name) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(p.player_agent) LIKE '%' || LOWER(p_search) || '%'
      OR EXISTS (
        SELECT 1 FROM clubs_transfermarkt c
        WHERE c.id = p.club_id
        AND LOWER(c.name) LIKE '%' || LOWER(p_search) || '%'
      )
    )
    -- Position filter
    AND (p_position IS NULL OR p_position = 'all' OR p.main_position = p_position)
    -- Nationality filter (handles dual nationalities like "Lithuania / France")
    AND (
      p_nationality IS NULL
      OR p_nationality = 'all'
      OR p.nationality LIKE '%' || p_nationality || '%'
    )
    -- Agency filter
    AND (p_agency IS NULL OR p_agency = 'all' OR p.player_agent = p_agency);

  -- Return paginated results
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.age,
    p.main_position,
    p.nationality,
    p.height,
    p.foot,
    p.contract_expires::TEXT,
    p.market_value_eur,
    p.is_eu_passport,
    p.picture_url,
    p.transfermarkt_url,
    p.player_agent,
    p.club_id,
    c.name::TEXT as club_name,
    c.logo_url::TEXT as club_logo_url,
    l.name::TEXT as league_name,
    l.country::TEXT as league_country,
    (apn.notes IS NOT NULL) as has_saved_note,
    apn.notes as saved_note,
    v_total_count as total_count
  FROM players_transfermarkt p
  LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
  LEFT JOIN leagues_transfermarkt l ON c.league_id = l.id
  LEFT JOIN agent_player_notes apn ON apn.player_id = p.id AND apn.agent_id = p_agent_id
  WHERE
    -- Exclude already rostered players
    NOT EXISTS (
      SELECT 1 FROM agent_rosters ar
      WHERE ar.agent_id = p_agent_id AND ar.player_id = p.id
    )
    -- Search filter
    AND (
      p_search IS NULL
      OR p_search = ''
      OR LOWER(p.name) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(p.player_agent) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(c.name) LIKE '%' || LOWER(p_search) || '%'
    )
    -- Position filter
    AND (p_position IS NULL OR p_position = 'all' OR p.main_position = p_position)
    -- Nationality filter
    AND (
      p_nationality IS NULL
      OR p_nationality = 'all'
      OR p.nationality LIKE '%' || p_nationality || '%'
    )
    -- Agency filter
    AND (p_agency IS NULL OR p_agency = 'all' OR p.player_agent = p_agency)
  ORDER BY
    -- Players with saved notes first
    (apn.notes IS NOT NULL) DESC,
    p.name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_player_filter_options() TO authenticated;
GRANT EXECUTE ON FUNCTION search_available_players(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

-- 5. Add comments
COMMENT ON FUNCTION get_player_filter_options() IS 'Returns distinct filter options for player search dropdowns';
COMMENT ON FUNCTION search_available_players(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) IS 'Server-side paginated search for available players with filters';
