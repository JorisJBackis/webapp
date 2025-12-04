-- =====================================================
-- Fix get_agent_favorite_clubs with correct schema
-- =====================================================
-- Updates function to work with new clubs_transfermarkt schema
-- - Removes non-existent competition_name column
-- - Joins with leagues_transfermarkt to get league info
-- - Adds logo_url and all club/league stats

DROP FUNCTION IF EXISTS get_agent_favorite_clubs(UUID);

CREATE OR REPLACE FUNCTION get_agent_favorite_clubs(p_agent_id UUID)
RETURNS TABLE (
  favorite_id INTEGER,
  club_id INTEGER,
  club_name TEXT,
  club_logo_url TEXT,
  club_transfermarkt_url TEXT,
  country TEXT,
  league_name TEXT,
  league_tier INTEGER,
  league_transfermarkt_url TEXT,
  total_market_value_eur BIGINT,
  avg_market_value_eur BIGINT,
  squad_avg_age NUMERIC,
  squad_size BIGINT,
  notes TEXT,
  added_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    afc.id::INTEGER as favorite_id,
    c.id::INTEGER as club_id,
    c.name::TEXT as club_name,
    c.logo_url::TEXT as club_logo_url,
    c.transfermarkt_url::TEXT as club_transfermarkt_url,
    c.country::TEXT,
    l.name::TEXT as league_name,
    l.tier::INTEGER as league_tier,
    l.url::TEXT as league_transfermarkt_url,
    c.total_market_value_eur::BIGINT,
    c.avg_market_value_eur::BIGINT,
    c.squad_avg_age::NUMERIC,
    COUNT(p.id)::BIGINT as squad_size,
    afc.notes::TEXT,
    afc.added_at::TIMESTAMPTZ
  FROM agent_favorite_clubs afc
  JOIN clubs_transfermarkt c ON afc.club_id = c.id
  LEFT JOIN leagues_transfermarkt l ON c.league_id = l.id
  LEFT JOIN players_transfermarkt p ON p.club_id = c.id
  WHERE afc.agent_id = p_agent_id
  GROUP BY afc.id, c.id, c.name, c.logo_url, c.transfermarkt_url, c.country,
           l.name, l.tier, l.url, c.total_market_value_eur, c.avg_market_value_eur, c.squad_avg_age, afc.notes, afc.added_at
  ORDER BY afc.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_agent_favorite_clubs(UUID) TO authenticated;

SELECT '✅ get_agent_favorite_clubs fixed with correct schema and all club stats!' as status;
