-- =====================================================
-- AGENT ROSTERS SYSTEM
-- =====================================================
-- This migration creates the necessary tables and functions
-- to support football agents managing their player rosters

-- 1. Create agent_rosters table
CREATE TABLE IF NOT EXISTS agent_rosters (
  id SERIAL PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES players_transfermarkt(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, player_id)
);

-- 2. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_rosters_agent_id ON agent_rosters(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_rosters_player_id ON agent_rosters(player_id);

-- 3. Add comment to the table
COMMENT ON TABLE agent_rosters IS 'Links football agents to their roster of players';

-- 4. Create function to get agent roster with player details
CREATE OR REPLACE FUNCTION get_agent_roster(p_agent_id UUID)
RETURNS TABLE (
  roster_id INTEGER,
  player_id INTEGER,
  player_name TEXT,
  age INTEGER,
  "position" TEXT,
  club_id INTEGER,
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
    ar.id as roster_id,
    p.id as player_id,
    p.name as player_name,
    p.age,
    p.main_position as position,
    p.club_id,
    c.name as club_name,
    p.nationality,
    p.height,
    p.foot,
    p.contract_expires,
    p.market_value_eur,
    p.is_eu_passport,
    ar.notes as agent_notes,
    ar.added_at,
    ar.updated_at
  FROM agent_rosters ar
  JOIN players_transfermarkt p ON ar.player_id = p.id
  LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
  WHERE ar.agent_id = p_agent_id
  ORDER BY ar.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to add player to roster
CREATE OR REPLACE FUNCTION add_player_to_roster(
  p_agent_id UUID,
  p_player_id INTEGER,
  p_notes TEXT DEFAULT NULL
)
RETURNS agent_rosters AS $$
DECLARE
  v_roster agent_rosters;
BEGIN
  -- Insert or update player in roster
  INSERT INTO agent_rosters (agent_id, player_id, notes)
  VALUES (p_agent_id, p_player_id, p_notes)
  ON CONFLICT (agent_id, player_id)
  DO UPDATE SET
    notes = COALESCE(EXCLUDED.notes, agent_rosters.notes),
    updated_at = NOW()
  RETURNING * INTO v_roster;

  RETURN v_roster;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to remove player from roster
CREATE OR REPLACE FUNCTION remove_player_from_roster(
  p_agent_id UUID,
  p_player_id INTEGER
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

-- 7. Create function to update roster notes
CREATE OR REPLACE FUNCTION update_roster_notes(
  p_agent_id UUID,
  p_player_id INTEGER,
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

-- 8. Create function to match roster players with recruitment needs
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
    jsonb_build_object(
      'position_match', (p.main_position = rn.position_needed),
      'age_match', (p.age >= COALESCE(rn.min_age, 0) AND p.age <= COALESCE(rn.max_age, 100)),
      'height_match', (
        CASE
          WHEN rn.min_height IS NOT NULL AND rn.max_height IS NOT NULL
          THEN (p.height >= rn.min_height AND p.height <= rn.max_height)
          ELSE TRUE
        END
      ),
      'foot_match', (rn.preferred_foot IS NULL OR p.foot = rn.preferred_foot OR rn.preferred_foot = 'Both')
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
    AND (
      -- At least position matches
      p.main_position = rn.position_needed
      -- Or close age range
      OR (p.age >= COALESCE(rn.min_age, 0) - 2 AND p.age <= COALESCE(rn.max_age, 100) + 2)
    )
  ORDER BY rn.need_id, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Enable Row Level Security (RLS)
ALTER TABLE agent_rosters ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies
-- Agents can view their own roster
CREATE POLICY "Agents can view their own roster"
  ON agent_rosters FOR SELECT
  USING (auth.uid() = agent_id);

-- Agents can insert into their own roster
CREATE POLICY "Agents can add to their own roster"
  ON agent_rosters FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

-- Agents can update their own roster
CREATE POLICY "Agents can update their own roster"
  ON agent_rosters FOR UPDATE
  USING (auth.uid() = agent_id);

-- Agents can delete from their own roster
CREATE POLICY "Agents can delete from their own roster"
  ON agent_rosters FOR DELETE
  USING (auth.uid() = agent_id);

-- Admins can view all rosters
CREATE POLICY "Admins can view all rosters"
  ON agent_rosters FOR SELECT
  USING (is_admin(auth.uid()));
