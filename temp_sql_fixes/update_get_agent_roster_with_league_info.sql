-- =====================================================
-- Update get_agent_roster with League/Tier Information
-- =====================================================
-- Adds player picture, transfermarkt URL, league tier, competition info

DROP FUNCTION IF EXISTS get_agent_roster(UUID);

CREATE OR REPLACE FUNCTION get_agent_roster(p_agent_id UUID)
RETURNS TABLE (
  roster_id BIGINT,
  player_id BIGINT,
  player_name TEXT,
  age INTEGER,
  "position" TEXT,
  club_id BIGINT,
  club_name TEXT,
  nationality TEXT,
  height INTEGER,
  foot TEXT,
  contract_expires TEXT,
  market_value_eur INTEGER,
  is_eu_passport BOOLEAN,
  agent_notes TEXT,
  added_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- NEW FIELDS
  picture_url TEXT,
  player_transfermarkt_url TEXT,
  club_logo_url TEXT,
  club_transfermarkt_url TEXT,
  club_country TEXT,
  league_id TEXT,
  league_name TEXT,
  league_tier INTEGER,
  league_country TEXT,
  league_transfermarkt_url TEXT,
  -- ORIGINAL VALUES (for overrides)
  original_age INTEGER,
  original_position TEXT,
  original_nationality TEXT,
  original_height INTEGER,
  original_foot TEXT,
  original_contract_expires TEXT,
  original_market_value_eur INTEGER,
  -- OVERRIDE INDICATORS
  has_age_override BOOLEAN,
  has_position_override BOOLEAN,
  has_nationality_override BOOLEAN,
  has_height_override BOOLEAN,
  has_foot_override BOOLEAN,
  has_contract_override BOOLEAN,
  has_value_override BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id::BIGINT as roster_id,
    p.id::BIGINT as player_id,
    p.name as player_name,
    COALESCE(apo.age_override, p.age)::INTEGER as age,
    COALESCE(apo.position_override, p.main_position)::TEXT as position,
    p.club_id::BIGINT,
    c.name as club_name,
    COALESCE(apo.nationality_override, p.nationality)::TEXT as nationality,
    COALESCE(apo.height_override, p.height)::INTEGER as height,
    COALESCE(apo.foot_override, p.foot)::TEXT as foot,
    COALESCE(apo.contract_expires_override, p.contract_expires)::TEXT as contract_expires,
    COALESCE(apo.market_value_override, p.market_value_eur)::INTEGER as market_value_eur,
    p.is_eu_passport,
    ar.notes as agent_notes,
    ar.added_at,
    ar.updated_at,
    -- NEW FIELDS
    p.picture_url::TEXT,
    p.transfermarkt_url::TEXT as player_transfermarkt_url,
    c.logo_url::TEXT as club_logo_url,
    c.transfermarkt_url::TEXT as club_transfermarkt_url,
    c.country::TEXT as club_country,
    c.league_id::TEXT,
    l.name::TEXT as league_name,
    l.tier::INTEGER as league_tier,
    l.country::TEXT as league_country,
    l.url::TEXT as league_transfermarkt_url,
    -- ORIGINAL VALUES
    p.age::INTEGER as original_age,
    p.main_position::TEXT as original_position,
    p.nationality::TEXT as original_nationality,
    p.height::INTEGER as original_height,
    p.foot::TEXT as original_foot,
    p.contract_expires::TEXT as original_contract_expires,
    p.market_value_eur::INTEGER as original_market_value_eur,
    -- OVERRIDE INDICATORS
    (apo.age_override IS NOT NULL)::BOOLEAN as has_age_override,
    (apo.position_override IS NOT NULL)::BOOLEAN as has_position_override,
    (apo.nationality_override IS NOT NULL)::BOOLEAN as has_nationality_override,
    (apo.height_override IS NOT NULL)::BOOLEAN as has_height_override,
    (apo.foot_override IS NOT NULL)::BOOLEAN as has_foot_override,
    (apo.contract_expires_override IS NOT NULL)::BOOLEAN as has_contract_override,
    (apo.market_value_override IS NOT NULL)::BOOLEAN as has_value_override
  FROM agent_rosters ar
  JOIN players_transfermarkt p ON ar.player_id = p.id
  LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
  LEFT JOIN leagues_transfermarkt l ON c.league_id = l.id
  LEFT JOIN agent_player_overrides apo ON apo.agent_id = ar.agent_id AND apo.player_id = p.id
  WHERE ar.agent_id = p_agent_id
  ORDER BY
    -- Sort by market value (highest first), nulls last
    COALESCE(apo.market_value_override, p.market_value_eur) DESC NULLS LAST,
    -- Then by most recently added
    ar.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_agent_roster(UUID) TO authenticated;

SELECT '✅ get_agent_roster updated with league and tier information!' as status;
