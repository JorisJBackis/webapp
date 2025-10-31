-- =====================================================
-- FIX match_roster_with_needs with overrides
-- =====================================================

DROP FUNCTION IF EXISTS match_roster_with_needs(UUID) CASCADE;

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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH roster_players AS (
    -- Get all roster players with their overrides
    SELECT
      ar.agent_id,
      p.id as player_id,
      p.name as player_name,
      COALESCE(apo.position_override, p.main_position) as position,
      COALESCE(apo.age_override, p.age) as age,
      COALESCE(apo.height_override, p.height) as height,
      COALESCE(apo.foot_override, p.foot) as foot
    FROM agent_rosters ar
    JOIN players_transfermarkt p ON ar.player_id = p.id
    LEFT JOIN agent_player_overrides apo ON apo.agent_id = ar.agent_id AND apo.player_id = p.id
    WHERE ar.agent_id = p_agent_id
  ),
  player_matches AS (
    SELECT
      rn.need_id,
      c.name as club_name,
      rn.position_needed,
      rn.min_age,
      rn.max_age,
      rn.min_height,
      rn.max_height,
      rn.preferred_foot,
      rp.player_id as matched_player_id,
      rp.player_name as matched_player_name,
      rp.position as player_position,
      rp.age as player_age,
      rp.height as player_height,
      rp.foot as player_foot,
      -- Calculate match booleans
      (rp.position = rn.position_needed) as position_match,
      (rp.age >= COALESCE(rn.min_age, 0) AND rp.age <= COALESCE(rn.max_age, 100)) as age_match,
      (
        CASE
          WHEN rn.min_height IS NOT NULL AND rn.max_height IS NOT NULL
          THEN (rp.height >= rn.min_height AND rp.height <= rn.max_height)
          ELSE TRUE
        END
      ) as height_match,
      (rn.preferred_foot IS NULL OR rp.foot = rn.preferred_foot OR rn.preferred_foot = 'Both') as foot_match
    FROM recruitment_needs rn
    JOIN clubs c ON rn.created_by_club_id = c.id
    CROSS JOIN roster_players rp
    WHERE rn.status = 'active'
  )
  SELECT
    pm.need_id::INTEGER,
    pm.club_name::TEXT,
    pm.position_needed::TEXT,
    pm.min_age::INTEGER,
    pm.max_age::INTEGER,
    pm.min_height::INTEGER,
    pm.max_height::INTEGER,
    pm.preferred_foot::TEXT,
    pm.matched_player_id::BIGINT,
    pm.matched_player_name::TEXT,
    jsonb_build_object(
      'position_match', pm.position_match,
      'age_match', pm.age_match,
      'height_match', pm.height_match,
      'foot_match', pm.foot_match,
      'player_position', pm.player_position,
      'player_age', pm.player_age,
      'player_height', pm.player_height,
      'player_foot', pm.player_foot
    )::JSONB as match_reasons
  FROM player_matches pm
  WHERE (
    -- Count how many criteria match
    (CASE WHEN pm.position_match THEN 1 ELSE 0 END) +
    (CASE WHEN pm.age_match THEN 1 ELSE 0 END) +
    (CASE WHEN pm.height_match THEN 1 ELSE 0 END) +
    (CASE WHEN pm.foot_match THEN 1 ELSE 0 END)
  ) >= 3  -- Require at least 3 matches
  ORDER BY pm.need_id, pm.matched_player_name;
END;
$$;

GRANT EXECUTE ON FUNCTION match_roster_with_needs(UUID) TO authenticated;

SELECT '✅ Matching function fixed with proper override support!' as status;
