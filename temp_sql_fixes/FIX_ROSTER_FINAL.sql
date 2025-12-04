-- =====================================================
-- FINAL FIX FOR get_agent_roster - Handle date column properly
-- Run this in Supabase SQL Editor
-- =====================================================

DROP FUNCTION IF EXISTS get_agent_roster(UUID);

CREATE FUNCTION get_agent_roster(p_agent_id UUID)
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
  contract_expires TEXT,  -- Will cast to TEXT in query
  market_value_eur INTEGER,
  is_eu_passport BOOLEAN,
  agent_notes TEXT,
  added_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id::BIGINT as roster_id,
    p.id::BIGINT as player_id,
    p.name as player_name,
    p.age,
    p.main_position as position,
    p.club_id::BIGINT,
    c.name as club_name,
    p.nationality,
    p.height,
    p.foot,
    p.contract_expires::TEXT,  -- Cast date to text
    p.market_value_eur,
    p.is_eu_passport,
    ar.notes as agent_notes,
    ar.added_at,
    ar.updated_at
  FROM agent_rosters ar
  JOIN players_transfermarkt p ON ar.player_id = p.id
  LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
  WHERE ar.agent_id = p_agent_id
  ORDER BY ar.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_agent_roster(UUID) TO authenticated;

SELECT '✅ get_agent_roster fixed with proper date casting!' as status;
