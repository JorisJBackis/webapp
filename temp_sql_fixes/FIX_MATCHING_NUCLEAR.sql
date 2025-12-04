-- =====================================================
-- NUCLEAR FIX - Completely destroy and rebuild function
-- =====================================================

-- Drop the function with all possible signatures
DROP FUNCTION IF EXISTS match_roster_with_needs(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.match_roster_with_needs(UUID) CASCADE;
DROP FUNCTION IF EXISTS match_roster_with_needs CASCADE;
DROP FUNCTION IF EXISTS public.match_roster_with_needs CASCADE;

-- List any remaining versions (for debugging)
SELECT
    'Found function: ' || p.proname || ' with signature: ' || pg_get_function_identity_arguments(p.oid) as debug_info
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'match_roster_with_needs';

-- Now create the NEW version with correct types
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
      'foot_match', pm.foot_match
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION match_roster_with_needs(UUID) TO authenticated;

-- Verify the function signature
SELECT
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_signature,
    pg_get_functiondef(p.oid) as full_definition
FROM pg_proc p
WHERE p.proname = 'match_roster_with_needs';

SELECT '✅ Function NUCLEAR RESET complete!' as status;
