-- =====================================================
-- Fix get_agent_favorite_clubs function
-- =====================================================
-- Issues fixed:
-- 1. Wrong column name: l.transfermarkt_url -> l.url
-- 2. Wrong data type: club_id should be INTEGER not BIGINT
-- 3. Wrong data type: avg_market_value_eur should be INTEGER not BIGINT
-- 4. Missing GROUP BY for contact fields
-- =====================================================

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
  avg_market_value_eur INTEGER,
  squad_avg_age NUMERIC,
  squad_size BIGINT,
  notes TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_role TEXT,
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
    c.avg_market_value_eur::INTEGER,
    c.squad_avg_age::NUMERIC,
    COUNT(p.id)::BIGINT as squad_size,
    afc.notes::TEXT,
    afc.contact_name::TEXT,
    afc.contact_email::TEXT,
    afc.contact_phone::TEXT,
    afc.contact_role::TEXT,
    afc.added_at::TIMESTAMPTZ
  FROM agent_favorite_clubs afc
  JOIN clubs_transfermarkt c ON afc.club_id = c.id
  LEFT JOIN leagues_transfermarkt l ON c.league_id = l.id
  LEFT JOIN players_transfermarkt p ON p.club_id = c.id
  WHERE afc.agent_id = p_agent_id
  GROUP BY
    afc.id,
    c.id,
    c.name,
    c.logo_url,
    c.transfermarkt_url,
    c.country,
    l.name,
    l.tier,
    l.url,
    c.total_market_value_eur,
    c.avg_market_value_eur,
    c.squad_avg_age,
    afc.notes,
    afc.contact_name,
    afc.contact_email,
    afc.contact_phone,
    afc.contact_role,
    afc.added_at
  ORDER BY afc.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_agent_favorite_clubs(UUID) TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ get_agent_favorite_clubs fixed with contact details!' as status;
