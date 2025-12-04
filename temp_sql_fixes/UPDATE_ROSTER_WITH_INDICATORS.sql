-- =====================================================
-- Update get_agent_roster to include override indicators and original values
-- =====================================================

DROP FUNCTION IF EXISTS get_agent_roster(UUID);

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
  updated_at TIMESTAMPTZ,
  -- Original values for reset/display
  original_age INTEGER,
  original_position TEXT,
  original_nationality TEXT,
  original_height INTEGER,
  original_foot TEXT,
  original_contract_expires TEXT,
  original_market_value_eur INTEGER,
  -- Override indicators
  has_age_override BOOLEAN,
  has_position_override BOOLEAN,
  has_nationality_override BOOLEAN,
  has_height_override BOOLEAN,
  has_foot_override BOOLEAN,
  has_contract_override BOOLEAN,
  has_value_override BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id::BIGINT as roster_id,
    p.id::BIGINT as player_id,
    p.name as player_name,
    COALESCE(apo.age_override, p.age)::INTEGER as age,
    COALESCE(apo.position_override, p.main_position)::TEXT as position,
    p.club_id::BIGINT,
    c.name as club_name,
    COALESCE(apo.nationality_override, p.nationality)::TEXT as nationality,
    COALESCE(apo.height_override, p.height)::INTEGER as height,
    COALESCE(apo.foot_override, p.foot)::TEXT as foot,
    COALESCE(apo.contract_expires_override::TEXT, p.contract_expires::TEXT)::TEXT as contract_expires,
    COALESCE(apo.market_value_override, p.market_value_eur)::INTEGER as market_value_eur,
    p.is_eu_passport,
    ar.notes as agent_notes,
    ar.added_at,
    ar.updated_at,
    -- Original values
    p.age::INTEGER as original_age,
    p.main_position::TEXT as original_position,
    p.nationality::TEXT as original_nationality,
    p.height::INTEGER as original_height,
    p.foot::TEXT as original_foot,
    p.contract_expires::TEXT as original_contract_expires,
    p.market_value_eur::INTEGER as original_market_value_eur,
    -- Override indicators
    (apo.age_override IS NOT NULL)::BOOLEAN as has_age_override,
    (apo.position_override IS NOT NULL)::BOOLEAN as has_position_override,
    (apo.nationality_override IS NOT NULL)::BOOLEAN as has_nationality_override,
    (apo.height_override IS NOT NULL)::BOOLEAN as has_height_override,
    (apo.foot_override IS NOT NULL)::BOOLEAN as has_foot_override,
    (apo.contract_expires_override IS NOT NULL)::BOOLEAN as has_contract_override,
    (apo.market_value_override IS NOT NULL)::BOOLEAN as has_value_override
  FROM agent_rosters ar
  JOIN players_transfermarkt p ON ar.player_id = p.id
  LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
  LEFT JOIN agent_player_overrides apo ON apo.agent_id = ar.agent_id AND apo.player_id = p.id
  WHERE ar.agent_id = p_agent_id
  ORDER BY ar.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset a specific field override
CREATE OR REPLACE FUNCTION reset_player_override_field(
  p_agent_id UUID,
  p_player_id BIGINT,
  p_field TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_row_count INTEGER;
BEGIN
  -- Set specific field to NULL
  IF p_field = 'position' THEN
    UPDATE agent_player_overrides
    SET position_override = NULL, updated_at = NOW()
    WHERE agent_id = p_agent_id AND player_id = p_player_id;
  ELSIF p_field = 'age' THEN
    UPDATE agent_player_overrides
    SET age_override = NULL, updated_at = NOW()
    WHERE agent_id = p_agent_id AND player_id = p_player_id;
  ELSIF p_field = 'height' THEN
    UPDATE agent_player_overrides
    SET height_override = NULL, updated_at = NOW()
    WHERE agent_id = p_agent_id AND player_id = p_player_id;
  ELSIF p_field = 'foot' THEN
    UPDATE agent_player_overrides
    SET foot_override = NULL, updated_at = NOW()
    WHERE agent_id = p_agent_id AND player_id = p_player_id;
  ELSIF p_field = 'nationality' THEN
    UPDATE agent_player_overrides
    SET nationality_override = NULL, updated_at = NOW()
    WHERE agent_id = p_agent_id AND player_id = p_player_id;
  ELSIF p_field = 'contract' THEN
    UPDATE agent_player_overrides
    SET contract_expires_override = NULL, updated_at = NOW()
    WHERE agent_id = p_agent_id AND player_id = p_player_id;
  ELSIF p_field = 'value' THEN
    UPDATE agent_player_overrides
    SET market_value_override = NULL, updated_at = NOW()
    WHERE agent_id = p_agent_id AND player_id = p_player_id;
  END IF;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;

  -- Delete the override record if all fields are NULL
  DELETE FROM agent_player_overrides
  WHERE agent_id = p_agent_id
    AND player_id = p_player_id
    AND position_override IS NULL
    AND age_override IS NULL
    AND height_override IS NULL
    AND foot_override IS NULL
    AND nationality_override IS NULL
    AND contract_expires_override IS NULL
    AND market_value_override IS NULL;

  RETURN v_row_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_agent_roster(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_player_override_field(UUID, BIGINT, TEXT) TO authenticated;

SELECT '✅ Roster updated with indicators and reset functionality!' as status;
