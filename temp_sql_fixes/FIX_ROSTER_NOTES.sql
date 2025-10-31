-- =====================================================
-- FIX update_roster_notes and remove_player_from_roster functions
-- Fix: ROW_COUNT returns INTEGER, not BOOLEAN
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS update_roster_notes(UUID, BIGINT, TEXT);
DROP FUNCTION IF EXISTS update_roster_notes(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS remove_player_from_roster(UUID, BIGINT);
DROP FUNCTION IF EXISTS remove_player_from_roster(UUID, INTEGER);

-- 1. Fix update_roster_notes - use INTEGER for row count, then return boolean
CREATE OR REPLACE FUNCTION update_roster_notes(
  p_agent_id UUID,
  p_player_id BIGINT,
  p_notes TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_row_count INTEGER;
BEGIN
  UPDATE agent_rosters
  SET notes = p_notes, updated_at = NOW()
  WHERE agent_id = p_agent_id AND player_id = p_player_id;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix remove_player_from_roster - use INTEGER for row count, then return boolean
CREATE OR REPLACE FUNCTION remove_player_from_roster(
  p_agent_id UUID,
  p_player_id BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_row_count INTEGER;
BEGIN
  DELETE FROM agent_rosters
  WHERE agent_id = p_agent_id AND player_id = p_player_id;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  RETURN v_row_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_roster_notes(UUID, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_player_from_roster(UUID, BIGINT) TO authenticated;

SELECT '✅ Roster notes and remove functions fixed!' as status;
