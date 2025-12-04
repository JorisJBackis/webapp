-- =====================================================
-- FIX REMAINING ROSTER FUNCTIONS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop and recreate add_player_to_roster
DROP FUNCTION IF EXISTS add_player_to_roster(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS add_player_to_roster(UUID, BIGINT, TEXT);

CREATE FUNCTION add_player_to_roster(
  p_agent_id UUID,
  p_player_id BIGINT,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  agent_id UUID,
  player_id BIGINT,
  added_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Insert or update player in roster
  INSERT INTO agent_rosters (agent_id, player_id, notes)
  VALUES (p_agent_id, p_player_id, p_notes)
  ON CONFLICT (agent_id, player_id)
  DO UPDATE SET
    notes = COALESCE(EXCLUDED.notes, agent_rosters.notes),
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN QUERY
  SELECT
    v_result.id::BIGINT,
    v_result.agent_id,
    v_result.player_id::BIGINT,
    v_result.added_at,
    v_result.notes,
    v_result.created_at,
    v_result.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate remove_player_from_roster
DROP FUNCTION IF EXISTS remove_player_from_roster(UUID, INTEGER);
DROP FUNCTION IF EXISTS remove_player_from_roster(UUID, BIGINT);

CREATE FUNCTION remove_player_from_roster(
  p_agent_id UUID,
  p_player_id BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM agent_rosters
  WHERE agent_id = p_agent_id AND player_id = p_player_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate update_roster_notes
DROP FUNCTION IF EXISTS update_roster_notes(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS update_roster_notes(UUID, BIGINT, TEXT);

CREATE FUNCTION update_roster_notes(
  p_agent_id UUID,
  p_player_id BIGINT,
  p_notes TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE agent_rosters
  SET notes = p_notes, updated_at = NOW()
  WHERE agent_id = p_agent_id AND player_id = p_player_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_player_to_roster(UUID, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_player_from_roster(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_roster_notes(UUID, BIGINT, TEXT) TO authenticated;

SELECT '✅ All roster functions fixed!' as status;
