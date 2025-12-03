-- =====================================================
-- SEARCH PLAYERS PUBLIC - For player signup flow
-- =====================================================
-- Simplified player search without agent context
-- Used by player-selection-modal during signup

-- Create public player search function (no agent context needed)
CREATE OR REPLACE FUNCTION search_players_public(
  p_search TEXT DEFAULT NULL,
  p_position TEXT DEFAULT NULL,
  p_nationality TEXT DEFAULT NULL,
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
  club_id BIGINT,
  club_name TEXT,
  club_logo_url TEXT,
  league_name TEXT,
  league_country TEXT,
  total_count BIGINT
) AS $$
DECLARE
  v_total_count BIGINT;
BEGIN
  -- Get total count for pagination info
  SELECT COUNT(*) INTO v_total_count
  FROM players_transfermarkt p
  LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
  WHERE
    -- Only players with a club
    p.club_id IS NOT NULL
    -- Search filter (name or club name)
    AND (
      p_search IS NULL
      OR p_search = ''
      OR LOWER(p.name) LIKE '%' || LOWER(p_search) || '%'
      OR LOWER(c.name) LIKE '%' || LOWER(p_search) || '%'
    )
    -- Position filter
    AND (p_position IS NULL OR p_position = 'all' OR p.main_position = p_position)
    -- Nationality filter (handles dual nationalities like "Lithuania / France")
    AND (
      p_nationality IS NULL
      OR p_nationality = 'all'
      OR p.nationality LIKE '%' || p_nationality || '%'
    );

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
    p.club_id,
    c.name::TEXT as club_name,
    c.logo_url::TEXT as club_logo_url,
    l.name::TEXT as league_name,
    l.country::TEXT as league_country,
    v_total_count as total_count
  FROM players_transfermarkt p
  LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
  LEFT JOIN leagues_transfermarkt l ON c.league_id = l.id
  WHERE
    -- Only players with a club
    p.club_id IS NOT NULL
    -- Search filter
    AND (
      p_search IS NULL
      OR p_search = ''
      OR LOWER(p.name) LIKE '%' || LOWER(p_search) || '%'
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
  ORDER BY p.name ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_players_public(TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_players_public(TEXT, TEXT, TEXT, INTEGER, INTEGER) TO anon;

-- Add comment
COMMENT ON FUNCTION search_players_public(TEXT, TEXT, TEXT, INTEGER, INTEGER) IS 'Public player search for signup flow - no agent context needed';
