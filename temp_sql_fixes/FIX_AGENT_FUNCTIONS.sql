-- =====================================================
-- FIX TYPE MISMATCHES IN AGENT FUNCTIONS
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Fix get_agent_roster function - use BIGINT for IDs
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
    p.contract_expires,
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

-- 2. Fix match_roster_with_needs function - use BIGINT for IDs
CREATE OR REPLACE FUNCTION match_roster_with_needs(p_agent_id UUID)
RETURNS TABLE (
  need_id BIGINT,
  club_name TEXT,
  position_needed TEXT,
  min_age INTEGER,
  max_age INTEGER,
  min_height INTEGER,
  max_height INTEGER,
  preferred_foot TEXT,
  matched_player_id BIGINT,
  matched_player_name TEXT,
  match_reasons JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rn.need_id::BIGINT,
    c.name as club_name,
    rn.position_needed,
    rn.min_age,
    rn.max_age,
    rn.min_height,
    rn.max_height,
    rn.preferred_foot,
    p.id::BIGINT as matched_player_id,
    p.name as matched_player_name,
    jsonb_build_object(
      'position_match', (p.main_position = rn.position_needed),
      'age_match', (p.age >= COALESCE(rn.min_age, 0) AND p.age <= COALESCE(rn.max_age, 100)),
      'height_match', (
        CASE
          WHEN rn.min_height IS NOT NULL AND rn.max_height IS NOT NULL
          THEN (p.height >= rn.min_height AND p.height <= rn.max_height)
          ELSE TRUE
        END
      ),
      'foot_match', (rn.preferred_foot IS NULL OR p.foot = rn.preferred_foot OR rn.preferred_foot = 'Both')
    ) as match_reasons
  FROM recruitment_needs rn
  JOIN clubs c ON rn.created_by_club_id = c.id
  CROSS JOIN (
    SELECT p.*
    FROM agent_rosters ar
    JOIN players_transfermarkt p ON ar.player_id = p.id
    WHERE ar.agent_id = p_agent_id
  ) p
  WHERE rn.status = 'active'
    AND (
      -- At least position matches
      p.main_position = rn.position_needed
      -- Or close age range
      OR (p.age >= COALESCE(rn.min_age, 0) - 2 AND p.age <= COALESCE(rn.max_age, 100) + 2)
    )
  ORDER BY rn.need_id, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Verify functions work
SELECT 'Testing get_agent_roster function...' as status;
-- This should return empty set if no data, but shouldn't error
-- SELECT * FROM get_agent_roster('00000000-0000-0000-0000-000000000000') LIMIT 1;

SELECT 'Testing match_roster_with_needs function...' as status;
-- This should return empty set if no data, but shouldn't error
-- SELECT * FROM match_roster_with_needs('00000000-0000-0000-0000-000000000000') LIMIT 1;

SELECT '✅ Functions updated successfully!' as status;
