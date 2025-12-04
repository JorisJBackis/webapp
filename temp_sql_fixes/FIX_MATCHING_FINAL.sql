-- =====================================================
-- FIX match_roster_with_needs function - FINAL VERSION
-- Changes:
-- 1. Remove age ±2 buffer - require exact matches only
-- 2. Show only if at least 3 out of 4 criteria match
-- 3. Fix syntax error - use $$ not $
-- Run this in Supabase SQL Editor
-- =====================================================

DROP FUNCTION IF EXISTS match_roster_with_needs(UUID);

CREATE OR REPLACE FUNCTION match_roster_with_needs(p_agent_id UUID)
RETURNS TABLE (
  need_id INTEGER,
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
  WITH player_matches AS (
    SELECT
      rn.need_id,
      c.name as club_name,
      rn.position_needed,
      rn.min_age,
      rn.max_age,
      rn.min_height,
      rn.max_height,
      rn.preferred_foot,
      p.id as matched_player_id,
      p.name as matched_player_name,
      -- Calculate match booleans
      (p.main_position = rn.position_needed) as position_match,
      (p.age >= COALESCE(rn.min_age, 0) AND p.age <= COALESCE(rn.max_age, 100)) as age_match,
      (
        CASE
          WHEN rn.min_height IS NOT NULL AND rn.max_height IS NOT NULL
          THEN (p.height >= rn.min_height AND p.height <= rn.max_height)
          ELSE TRUE
        END
      ) as height_match,
      (rn.preferred_foot IS NULL OR p.foot = rn.preferred_foot OR rn.preferred_foot = 'Both') as foot_match
    FROM recruitment_needs rn
    JOIN clubs c ON rn.created_by_club_id = c.id
    CROSS JOIN (
      SELECT p.*
      FROM agent_rosters ar
      JOIN players_transfermarkt p ON ar.player_id = p.id
      WHERE ar.agent_id = p_agent_id
    ) p
    WHERE rn.status = 'active'
  )
  SELECT
    pm.need_id,
    pm.club_name,
    pm.position_needed,
    pm.min_age,
    pm.max_age,
    pm.min_height,
    pm.max_height,
    pm.preferred_foot,
    pm.matched_player_id::BIGINT,
    pm.matched_player_name,
    jsonb_build_object(
      'position_match', pm.position_match,
      'age_match', pm.age_match,
      'height_match', pm.height_match,
      'foot_match', pm.foot_match
    ) as match_reasons
  FROM player_matches pm
  WHERE (
    -- Count how many criteria match (convert boolean to int: TRUE = 1, FALSE = 0)
    (CASE WHEN pm.position_match THEN 1 ELSE 0 END) +
    (CASE WHEN pm.age_match THEN 1 ELSE 0 END) +
    (CASE WHEN pm.height_match THEN 1 ELSE 0 END) +
    (CASE WHEN pm.foot_match THEN 1 ELSE 0 END)
  ) >= 3  -- At least 3 out of 4 criteria must match
  ORDER BY pm.need_id, pm.matched_player_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION match_roster_with_needs(UUID) TO authenticated;

SELECT '✅ Matching logic fixed - requires 3+ exact matches!' as status;
