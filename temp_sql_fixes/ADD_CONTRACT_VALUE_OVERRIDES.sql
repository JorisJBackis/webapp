-- =====================================================
-- Add contract and value overrides to agent_player_overrides
-- =====================================================

-- Add new columns to agent_player_overrides table
ALTER TABLE agent_player_overrides
ADD COLUMN IF NOT EXISTS contract_expires_override DATE,
ADD COLUMN IF NOT EXISTS market_value_override INTEGER;

-- Update the upsert function to include contract and value
DROP FUNCTION IF EXISTS upsert_player_override(UUID, BIGINT, TEXT, INTEGER, INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION upsert_player_override(
  p_agent_id UUID,
  p_player_id BIGINT,
  p_position TEXT DEFAULT NULL,
  p_age INTEGER DEFAULT NULL,
  p_height INTEGER DEFAULT NULL,
  p_foot TEXT DEFAULT NULL,
  p_nationality TEXT DEFAULT NULL,
  p_contract_expires DATE DEFAULT NULL,
  p_market_value INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO agent_player_overrides (
    agent_id,
    player_id,
    position_override,
    age_override,
    height_override,
    foot_override,
    nationality_override,
    contract_expires_override,
    market_value_override
  )
  VALUES (
    p_agent_id,
    p_player_id,
    p_position,
    p_age,
    p_height,
    p_foot,
    p_nationality,
    p_contract_expires,
    p_market_value
  )
  ON CONFLICT (agent_id, player_id)
  DO UPDATE SET
    position_override = COALESCE(EXCLUDED.position_override, agent_player_overrides.position_override),
    age_override = COALESCE(EXCLUDED.age_override, agent_player_overrides.age_override),
    height_override = COALESCE(EXCLUDED.height_override, agent_player_overrides.height_override),
    foot_override = COALESCE(EXCLUDED.foot_override, agent_player_overrides.foot_override),
    nationality_override = COALESCE(EXCLUDED.nationality_override, agent_player_overrides.nationality_override),
    contract_expires_override = COALESCE(EXCLUDED.contract_expires_override, agent_player_overrides.contract_expires_override),
    market_value_override = COALESCE(EXCLUDED.market_value_override, agent_player_overrides.market_value_override),
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_agent_roster to use contract and value overrides
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
  updated_at TIMESTAMPTZ
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
    ar.updated_at
  FROM agent_rosters ar
  JOIN players_transfermarkt p ON ar.player_id = p.id
  LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
  LEFT JOIN agent_player_overrides apo ON apo.agent_id = ar.agent_id AND apo.player_id = p.id
  WHERE ar.agent_id = p_agent_id
  ORDER BY ar.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_player_override(UUID, BIGINT, TEXT, INTEGER, INTEGER, TEXT, TEXT, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_roster(UUID) TO authenticated;

SELECT '✅ Contract and market value are now editable!' as status;
