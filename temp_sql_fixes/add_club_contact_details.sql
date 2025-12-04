-- =====================================================
-- Add Contact Details to Agent Favorite Clubs
-- =====================================================
-- Allows agents to store private contact information for clubs
-- Similar to agent_player_overrides pattern
-- =====================================================

-- Add contact detail columns to agent_favorite_clubs table
ALTER TABLE agent_favorite_clubs
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_role TEXT;

-- Add comments for documentation
COMMENT ON COLUMN agent_favorite_clubs.contact_name IS 'Name of the contact person at the club (agent-specific)';
COMMENT ON COLUMN agent_favorite_clubs.contact_email IS 'Email of the contact person (agent-specific)';
COMMENT ON COLUMN agent_favorite_clubs.contact_phone IS 'Phone number of the contact person (agent-specific)';
COMMENT ON COLUMN agent_favorite_clubs.contact_role IS 'Role/position of the contact (e.g., Sporting Director, Head Coach)';

-- Update the get_agent_favorite_clubs function to include contact details
DROP FUNCTION IF EXISTS get_agent_favorite_clubs(UUID);

CREATE OR REPLACE FUNCTION get_agent_favorite_clubs(p_agent_id UUID)
RETURNS TABLE (
  favorite_id INTEGER,
  club_id BIGINT,
  club_name TEXT,
  club_logo_url TEXT,
  club_transfermarkt_url TEXT,
  country TEXT,
  league_name TEXT,
  league_tier INTEGER,
  league_transfermarkt_url TEXT,
  total_market_value_eur BIGINT,
  avg_market_value_eur BIGINT,
  squad_avg_age NUMERIC,
  squad_size BIGINT,
  notes TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_role TEXT,
  added_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    afc.id::INTEGER as favorite_id,
    c.id::BIGINT as club_id,
    c.name::TEXT as club_name,
    c.logo_url::TEXT as club_logo_url,
    c.transfermarkt_url::TEXT as club_transfermarkt_url,
    l.country::TEXT,
    l.name::TEXT as league_name,
    l.tier::INTEGER as league_tier,
    l.transfermarkt_url::TEXT as league_transfermarkt_url,
    c.total_market_value_eur::BIGINT,
    c.avg_market_value_eur::BIGINT,
    c.squad_avg_age::NUMERIC,
    c.squad_size::BIGINT,
    afc.notes::TEXT,
    afc.contact_name::TEXT,
    afc.contact_email::TEXT,
    afc.contact_phone::TEXT,
    afc.contact_role::TEXT,
    afc.added_at
  FROM agent_favorite_clubs afc
  JOIN clubs_transfermarkt c ON afc.club_id = c.id
  LEFT JOIN leagues_transfermarkt l ON c.league_id = l.id
  WHERE afc.agent_id = p_agent_id
  ORDER BY afc.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_agent_favorite_clubs(UUID) TO authenticated;

-- =====================================================
-- Function to Update Club Contact Details
-- =====================================================
CREATE OR REPLACE FUNCTION update_club_contact(
  p_agent_id UUID,
  p_club_id BIGINT,
  p_contact_name TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_contact_role TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update contact details for the agent's favorite club
  UPDATE agent_favorite_clubs
  SET
    contact_name = p_contact_name,
    contact_email = p_contact_email,
    contact_phone = p_contact_phone,
    contact_role = p_contact_role,
    updated_at = NOW()
  WHERE
    agent_id = p_agent_id
    AND club_id = p_club_id;

  -- If no rows were updated, the club is not in favorites
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Club not found in favorites for this agent';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_club_contact(UUID, BIGINT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ Club contact details added to agent_favorite_clubs!' as status;
