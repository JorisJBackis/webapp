-- =====================================================
-- Update match_roster_with_needs to use agent overrides + semi-matching
-- =====================================================
-- This migration combines:
-- 1. Agent player overrides support
-- 2. Smart position compatibility (exact/semi/none)
-- =====================================================

-- Ensure check_position_compatibility function exists
CREATE OR REPLACE FUNCTION check_position_compatibility(
  p_player_position TEXT,
  p_club_position TEXT
)
RETURNS TEXT AS $$
BEGIN
  -- Exact match
  IF p_player_position = p_club_position THEN
    RETURN 'exact';
  END IF;

  -- Goalkeeper - no semi-matches (very specialized)
  IF p_player_position = 'Goalkeeper' OR p_club_position = 'Goalkeeper' THEN
    RETURN 'none';
  END IF;

  -- Centre-Back semi-matches
  IF p_player_position = 'Centre-Back' THEN
    IF p_club_position IN ('Left-Back', 'Right-Back', 'Defensive Midfield') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Full-Backs (Left-Back / Right-Back)
  IF p_player_position IN ('Left-Back', 'Right-Back') THEN
    IF p_club_position IN ('Centre-Back', 'Left-Back', 'Right-Back', 'Left Winger', 'Right Winger', 'Defensive Midfield') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Defensive Midfield
  IF p_player_position = 'Defensive Midfield' THEN
    IF p_club_position IN ('Central Midfield', 'Centre-Back') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Central Midfield (most versatile position)
  IF p_player_position = 'Central Midfield' THEN
    IF p_club_position IN ('Defensive Midfield', 'Attacking Midfield', 'Left Midfield', 'Right Midfield') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Attacking Midfield
  IF p_player_position = 'Attacking Midfield' THEN
    IF p_club_position IN ('Central Midfield', 'Left Winger', 'Right Winger', 'Centre-Forward') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Left Winger
  IF p_player_position = 'Left Winger' THEN
    IF p_club_position IN ('Right Winger', 'Attacking Midfield', 'Left-Back', 'Centre-Forward', 'Left Midfield') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Right Winger
  IF p_player_position = 'Right Winger' THEN
    IF p_club_position IN ('Left Winger', 'Attacking Midfield', 'Right-Back', 'Centre-Forward', 'Right Midfield') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Centre-Forward
  IF p_player_position = 'Centre-Forward' THEN
    IF p_club_position IN ('Attacking Midfield', 'Left Winger', 'Right Winger') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Left/Right Midfield
  IF p_player_position IN ('Left Midfield', 'Right Midfield') THEN
    IF p_club_position IN ('Central Midfield', 'Left Winger', 'Right Winger', 'Left Midfield', 'Right Midfield') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- No match
  RETURN 'none';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

GRANT EXECUTE ON FUNCTION check_position_compatibility(TEXT, TEXT) TO authenticated;

-- Drop and recreate match_roster_with_needs with overrides + semi-matching
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
  matched_player_id INTEGER,
  matched_player_name TEXT,
  match_reasons JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH player_data AS (
    SELECT
      p.id,
      p.name,
      -- Use override values if available, otherwise use original
      COALESCE(apo.position_override, p.main_position) as position,
      COALESCE(apo.age_override, p.age) as age,
      COALESCE(apo.height_override, p.height) as height,
      COALESCE(apo.foot_override, p.foot) as foot
    FROM agent_rosters ar
    JOIN players_transfermarkt p ON ar.player_id = p.id
    LEFT JOIN agent_player_overrides apo ON apo.agent_id = ar.agent_id AND apo.player_id = p.id
    WHERE ar.agent_id = p_agent_id
  )
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
      'position_match', (check_position_compatibility(p.position, rn.position_needed) IN ('exact', 'semi')),
      'position_match_type', check_position_compatibility(p.position, rn.position_needed),
      'age_match', (p.age >= COALESCE(rn.min_age, 0) AND p.age <= COALESCE(rn.max_age, 100)),
      'age_match_type', CASE
        WHEN p.age >= COALESCE(rn.min_age, 0) AND p.age <= COALESCE(rn.max_age, 100) THEN 'exact'
        ELSE 'none'
      END,
      'height_match', (
        CASE
          WHEN rn.min_height IS NOT NULL AND rn.max_height IS NOT NULL
          THEN (p.height >= rn.min_height AND p.height <= rn.max_height)
          ELSE TRUE
        END
      ),
      'height_match_type', CASE
        WHEN rn.min_height IS NULL OR rn.max_height IS NULL THEN 'exact'
        WHEN p.height >= rn.min_height AND p.height <= rn.max_height THEN 'exact'
        ELSE 'none'
      END,
      'foot_match', (rn.preferred_foot IS NULL OR p.foot = rn.preferred_foot OR rn.preferred_foot = 'Both'),
      'foot_match_type', CASE
        WHEN rn.preferred_foot IS NULL OR rn.preferred_foot = 'Both' THEN 'exact'
        WHEN p.foot = rn.preferred_foot THEN 'exact'
        ELSE 'none'
      END,
      'player_position', p.position,
      'player_age', p.age,
      'player_height', p.height,
      'player_foot', p.foot
    ) as match_reasons
  FROM recruitment_needs rn
  JOIN clubs c ON rn.created_by_club_id = c.id
  CROSS JOIN player_data p
  WHERE rn.status = 'active'
    -- ONLY show matches where position is exact or semi (filter out 'none')
    AND check_position_compatibility(p.position, rn.position_needed) IN ('exact', 'semi')
    -- Apply matching criteria based on position match type
    AND (
      -- For EXACT position match: at least 3 out of 4 criteria must match
      (
        check_position_compatibility(p.position, rn.position_needed) = 'exact'
        AND (
          -- Count how many criteria match (position always matches for exact, so we count the other 3)
          (CASE WHEN p.age >= COALESCE(rn.min_age, 0) AND p.age <= COALESCE(rn.max_age, 100) THEN 1 ELSE 0 END)::INTEGER +
          (CASE
            WHEN rn.min_height IS NOT NULL AND rn.max_height IS NOT NULL
            THEN CASE WHEN p.height >= rn.min_height AND p.height <= rn.max_height THEN 1 ELSE 0 END
            ELSE 1
          END)::INTEGER +
          (CASE WHEN rn.preferred_foot IS NULL OR p.foot = rn.preferred_foot OR rn.preferred_foot = 'Both' THEN 1 ELSE 0 END)::INTEGER
        ) >= 2 -- At least 2 of the other 3 criteria must match (2 + 1 position = 3 total)
      )
      -- For SEMI position match: ALL other 3 criteria MUST match
      OR (
        check_position_compatibility(p.position, rn.position_needed) = 'semi'
        AND p.age >= COALESCE(rn.min_age, 0)
        AND p.age <= COALESCE(rn.max_age, 100)
        AND (
          rn.min_height IS NULL
          OR rn.max_height IS NULL
          OR (p.height >= rn.min_height AND p.height <= rn.max_height)
        )
        AND (rn.preferred_foot IS NULL OR p.foot = rn.preferred_foot OR rn.preferred_foot = 'Both')
      )
    )
  ORDER BY
    -- Sort exact matches first
    CASE WHEN check_position_compatibility(p.position, rn.position_needed) = 'exact' THEN 0 ELSE 1 END,
    rn.need_id,
    p.name;
END;
$$;

GRANT EXECUTE ON FUNCTION match_roster_with_needs(UUID) TO authenticated;
