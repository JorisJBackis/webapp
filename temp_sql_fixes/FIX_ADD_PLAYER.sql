-- =====================================================
-- FIX add_player_to_roster function - Remove ambiguous columns
-- Run this in Supabase SQL Editor
-- =====================================================

DROP FUNCTION IF EXISTS add_player_to_roster(UUID, BIGINT, TEXT);

-- Simplified version that just returns the roster record
CREATE FUNCTION add_player_to_roster(
  p_agent_id UUID,
  p_player_id BIGINT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Insert or update player in roster
  INSERT INTO agent_rosters (agent_id, player_id, notes)
  VALUES (p_agent_id, p_player_id, p_notes)
  ON CONFLICT (agent_id, player_id)
  DO UPDATE SET
    notes = COALESCE(EXCLUDED.notes, agent_rosters.notes),
    updated_at = NOW()
  RETURNING jsonb_build_object(
    'id', id,
    'agent_id', agent_id,
    'player_id', player_id,
    'added_at', added_at,
    'notes', notes,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION add_player_to_roster(UUID, BIGINT, TEXT) TO authenticated;

SELECT '✅ add_player_to_roster fixed!' as status;
