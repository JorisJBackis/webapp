-- =====================================================
-- Migrate Contact Details to Support Multiple Contacts
-- =====================================================
-- Changes:
-- 1. Replace 4 individual columns with 1 JSONB array column
-- 2. Migrate existing data to new format
-- 3. Update functions to work with array
-- =====================================================

-- Step 1: Add new contacts column (JSONB array)
ALTER TABLE agent_favorite_clubs
ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate existing contact data to new format
UPDATE agent_favorite_clubs
SET contacts =
  CASE
    WHEN contact_name IS NOT NULL
      OR contact_email IS NOT NULL
      OR contact_phone IS NOT NULL
      OR contact_role IS NOT NULL
    THEN jsonb_build_array(
      jsonb_build_object(
        'name', contact_name,
        'email', contact_email,
        'phone', contact_phone,
        'role', contact_role
      )
    )
    ELSE '[]'::jsonb
  END
WHERE contacts = '[]'::jsonb;

-- Step 3: Drop old columns
ALTER TABLE agent_favorite_clubs
DROP COLUMN IF EXISTS contact_name,
DROP COLUMN IF EXISTS contact_email,
DROP COLUMN IF EXISTS contact_phone,
DROP COLUMN IF EXISTS contact_role;

-- Step 4: Update get_agent_favorite_clubs function
DROP FUNCTION IF EXISTS get_agent_favorite_clubs(UUID);

CREATE OR REPLACE FUNCTION get_agent_favorite_clubs(p_agent_id UUID)
RETURNS TABLE (
  favorite_id INTEGER,
  club_id INTEGER,
  club_name TEXT,
  club_logo_url TEXT,
  club_transfermarkt_url TEXT,
  country TEXT,
  league_name TEXT,
  league_tier INTEGER,
  league_transfermarkt_url TEXT,
  total_market_value_eur BIGINT,
  avg_market_value_eur INTEGER,
  squad_avg_age NUMERIC,
  squad_size BIGINT,
  notes TEXT,
  contacts JSONB,
  added_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    afc.id::INTEGER as favorite_id,
    c.id::INTEGER as club_id,
    c.name::TEXT as club_name,
    c.logo_url::TEXT as club_logo_url,
    c.transfermarkt_url::TEXT as club_transfermarkt_url,
    c.country::TEXT,
    l.name::TEXT as league_name,
    l.tier::INTEGER as league_tier,
    l.url::TEXT as league_transfermarkt_url,
    c.total_market_value_eur::BIGINT,
    c.avg_market_value_eur::INTEGER,
    c.squad_avg_age::NUMERIC,
    COUNT(p.id)::BIGINT as squad_size,
    afc.notes::TEXT,
    afc.contacts::JSONB,
    afc.added_at::TIMESTAMPTZ
  FROM agent_favorite_clubs afc
  JOIN clubs_transfermarkt c ON afc.club_id = c.id
  LEFT JOIN leagues_transfermarkt l ON c.league_id = l.id
  LEFT JOIN players_transfermarkt p ON p.club_id = c.id
  WHERE afc.agent_id = p_agent_id
  GROUP BY
    afc.id,
    c.id,
    c.name,
    c.logo_url,
    c.transfermarkt_url,
    c.country,
    l.name,
    l.tier,
    l.url,
    c.total_market_value_eur,
    c.avg_market_value_eur,
    c.squad_avg_age,
    afc.notes,
    afc.contacts,
    afc.added_at
  ORDER BY afc.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_agent_favorite_clubs(UUID) TO authenticated;

-- Step 5: Replace update_club_contact function
DROP FUNCTION IF EXISTS update_club_contact(UUID, BIGINT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION update_club_contacts(
  p_agent_id UUID,
  p_club_id BIGINT,
  p_contacts JSONB
)
RETURNS VOID AS $$
BEGIN
  -- Update contacts array for the agent's favorite club
  UPDATE agent_favorite_clubs
  SET
    contacts = p_contacts,
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

GRANT EXECUTE ON FUNCTION update_club_contacts(UUID, BIGINT, JSONB) TO authenticated;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT '✅ Migrated to multiple contacts system!' as status;
