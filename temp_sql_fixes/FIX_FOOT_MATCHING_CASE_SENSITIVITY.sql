-- =====================================================
-- FIX: Foot matching case sensitivity bug
-- =====================================================
-- Problem: Foot comparison is case-sensitive, so 'left' != 'Left'
-- causing false negatives when player has lowercase foot but requirement has capitalized
-- Solution: Use LOWER() to make comparison case-insensitive
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
  matched_player_id INTEGER,
  matched_player_name TEXT,
  match_reasons JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rn.need_id::INTEGER,
    c.name::TEXT as club_name,
    rn.position_needed::TEXT,
    rn.min_age::INTEGER,
    rn.max_age::INTEGER,
    rn.min_height::INTEGER,
    rn.max_height::INTEGER,
    rn.preferred_foot::TEXT,
    p.id::INTEGER as matched_player_id,
    p.name::TEXT as matched_player_name,
    jsonb_build_object(
      'position_match', (check_position_compatibility(p.main_position, rn.position_needed) IN ('exact', 'semi')),
      'position_match_type', check_position_compatibility(p.main_position, rn.position_needed),
      'age_match', (p.age >= COALESCE(rn.min_age, 0) AND p.age <= COALESCE(rn.max_age, 100)),
      'height_match', (
        CASE
          WHEN rn.min_height IS NOT NULL AND rn.max_height IS NOT NULL
          THEN (p.height >= rn.min_height AND p.height <= rn.max_height)
          ELSE TRUE
        END
      ),
      -- FIX: Use LOWER() for case-insensitive comparison
      'foot_match', (rn.preferred_foot IS NULL OR LOWER(p.foot) = LOWER(rn.preferred_foot) OR LOWER(rn.preferred_foot) = 'both'),
      'player_position', p.main_position,
      'player_age', p.age,
      'player_height', p.height,
      'player_foot', p.foot
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
    -- ONLY show matches where position is exact or semi (filter out 'none')
    AND check_position_compatibility(p.main_position, rn.position_needed) IN ('exact', 'semi')
    -- Apply matching criteria based on position match type
    AND (
      -- For EXACT position match: at least 3 out of 4 criteria must match
      (
        check_position_compatibility(p.main_position, rn.position_needed) = 'exact'
        AND (
          -- Count how many criteria match (position always matches for exact, so we count the other 3)
          (CASE WHEN p.age >= COALESCE(rn.min_age, 0) AND p.age <= COALESCE(rn.max_age, 100) THEN 1 ELSE 0 END)::INTEGER +
          (CASE
            WHEN rn.min_height IS NOT NULL AND rn.max_height IS NOT NULL
            THEN CASE WHEN p.height >= rn.min_height AND p.height <= rn.max_height THEN 1 ELSE 0 END
            ELSE 1
          END)::INTEGER +
          -- FIX: Use LOWER() for case-insensitive comparison
          (CASE WHEN rn.preferred_foot IS NULL OR LOWER(p.foot) = LOWER(rn.preferred_foot) OR LOWER(rn.preferred_foot) = 'both' THEN 1 ELSE 0 END)::INTEGER
        ) >= 2 -- At least 2 of the other 3 criteria must match (2 + 1 position = 3 total)
      )
      -- For SEMI position match: ALL other 3 criteria MUST match
      OR (
        check_position_compatibility(p.main_position, rn.position_needed) = 'semi'
        AND p.age >= COALESCE(rn.min_age, 0)
        AND p.age <= COALESCE(rn.max_age, 100)
        AND (
          rn.min_height IS NULL
          OR rn.max_height IS NULL
          OR (p.height >= rn.min_height AND p.height <= rn.max_height)
        )
        -- FIX: Use LOWER() for case-insensitive comparison
        AND (rn.preferred_foot IS NULL OR LOWER(p.foot) = LOWER(rn.preferred_foot) OR LOWER(rn.preferred_foot) = 'both')
      )
    )
  ORDER BY
    -- Sort exact matches first
    CASE WHEN check_position_compatibility(p.main_position, rn.position_needed) = 'exact' THEN 0 ELSE 1 END,
    rn.need_id,
    p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION match_roster_with_needs(UUID) TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ Foot matching case sensitivity fixed!' as status;