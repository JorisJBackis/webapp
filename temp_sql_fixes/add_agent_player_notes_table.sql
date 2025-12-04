-- =====================================================
-- Add agent_player_notes table for saving notes
-- without adding players to roster
-- =====================================================

-- Create table for agent player notes
CREATE TABLE IF NOT EXISTS agent_player_notes (
  id BIGSERIAL PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES players_transfermarkt(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, player_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_player_notes_agent_id ON agent_player_notes(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_player_notes_player_id ON agent_player_notes(player_id);

-- Enable RLS
ALTER TABLE agent_player_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own player notes"
  ON agent_player_notes FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Users can insert their own player notes"
  ON agent_player_notes FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Users can update their own player notes"
  ON agent_player_notes FOR UPDATE
  USING (auth.uid() = agent_id);

CREATE POLICY "Users can delete their own player notes"
  ON agent_player_notes FOR DELETE
  USING (auth.uid() = agent_id);

-- Grant permissions
GRANT ALL ON agent_player_notes TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE agent_player_notes_id_seq TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ Created agent_player_notes table!' as status;
