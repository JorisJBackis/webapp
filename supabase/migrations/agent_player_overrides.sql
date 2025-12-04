-- =====================================================
-- AGENT PLAYER OVERRIDES
-- =====================================================
-- Allows agents to override/fill in missing player data
-- for better matching in their roster

-- 1. Create agent_player_overrides table
CREATE TABLE IF NOT EXISTS agent_player_overrides (
  id SERIAL PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES players_transfermarkt(id) ON DELETE CASCADE,

  -- Override fields (NULL means use original value)
  position_override TEXT,
  age_override INTEGER,
  height_override INTEGER,
  foot_override TEXT,
  nationality_override TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(agent_id, player_id)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_overrides_agent_id ON agent_player_overrides(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_overrides_player_id ON agent_player_overrides(player_id);

-- 3. Add comment
COMMENT ON TABLE agent_player_overrides IS 'Agent-specific overrides for player data to improve matching';

-- 4. Enable Row Level Security
ALTER TABLE agent_player_overrides ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
CREATE POLICY "Agents can view their own overrides"
  ON agent_player_overrides FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert their own overrides"
  ON agent_player_overrides FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update their own overrides"
  ON agent_player_overrides FOR UPDATE
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete their own overrides"
  ON agent_player_overrides FOR DELETE
  USING (auth.uid() = agent_id);

-- 6. Function to upsert player override
CREATE OR REPLACE FUNCTION upsert_player_override(
  p_agent_id UUID,
  p_player_id BIGINT,
  p_position TEXT DEFAULT NULL,
  p_age INTEGER DEFAULT NULL,
  p_height INTEGER DEFAULT NULL,
  p_foot TEXT DEFAULT NULL,
  p_nationality TEXT DEFAULT NULL
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
    nationality_override
  )
  VALUES (
    p_agent_id,
    p_player_id,
    p_position,
    p_age,
    p_height,
    p_foot,
    p_nationality
  )
  ON CONFLICT (agent_id, player_id)
  DO UPDATE SET
    position_override = COALESCE(EXCLUDED.position_override, agent_player_overrides.position_override),
    age_override = COALESCE(EXCLUDED.age_override, agent_player_overrides.age_override),
    height_override = COALESCE(EXCLUDED.height_override, agent_player_overrides.height_override),
    foot_override = COALESCE(EXCLUDED.foot_override, agent_player_overrides.foot_override),
    nationality_override = COALESCE(EXCLUDED.nationality_override, agent_player_overrides.nationality_override),
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update get_agent_roster to include overrides
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
    p.contract_expires::TEXT,
    p.market_value_eur::INTEGER,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION upsert_player_override(UUID, BIGINT, TEXT, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_roster(UUID) TO authenticated;

SELECT '✅ Agent player overrides system created!' as status;
