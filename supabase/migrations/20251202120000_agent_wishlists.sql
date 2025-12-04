-- =====================================================
-- AGENT WISHLISTS SYSTEM
-- =====================================================
-- This migration creates the agent wishlists feature, allowing
-- agents to create custom wishlists with filters that match
-- against their player roster with a matching score.

-- =====================================================
-- 1. CREATE AGENT_WISHLISTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_wishlists (
  id SERIAL PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  club_logo_url TEXT,
  filters JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_agent_wishlists_agent_id ON agent_wishlists(agent_id);

-- =====================================================
-- 3. ADD TABLE COMMENT
-- =====================================================
COMMENT ON TABLE agent_wishlists IS 'Stores custom wishlists with filter criteria that agents use to match against their roster';

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE agent_wishlists ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================
-- Agents can view their own wishlists
CREATE POLICY "Agents can view their own wishlists"
  ON agent_wishlists FOR SELECT
  USING (auth.uid() = agent_id);

-- Agents can create their own wishlists
CREATE POLICY "Agents can create their own wishlists"
  ON agent_wishlists FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

-- Agents can update their own wishlists
CREATE POLICY "Agents can update their own wishlists"
  ON agent_wishlists FOR UPDATE
  USING (auth.uid() = agent_id);

-- Agents can delete their own wishlists
CREATE POLICY "Agents can delete their own wishlists"
  ON agent_wishlists FOR DELETE
  USING (auth.uid() = agent_id);

-- Admins can view all wishlists
CREATE POLICY "Admins can view all wishlists"
  ON agent_wishlists FOR SELECT
  USING (is_admin(auth.uid()));

-- =====================================================
-- 6. FUNCTION: Get matching players with scores
-- =====================================================
-- Returns roster players with their match score percentage
-- based on the provided filter criteria
CREATE OR REPLACE FUNCTION get_wishlist_matching_players(
  p_agent_id UUID,
  p_filters JSONB
)
RETURNS TABLE (
  player_id BIGINT,
  player_name TEXT,
  "position" TEXT,
  age INTEGER,
  height INTEGER,
  foot TEXT,
  nationality TEXT,
  is_eu_passport BOOLEAN,
  league_tier INTEGER,
  league_name TEXT,
  league_country TEXT,
  contract_expires TEXT,
  market_value_eur BIGINT,
  club_name TEXT,
  club_logo_url TEXT,
  picture_url TEXT,
  transfermarkt_url TEXT,
  match_score INTEGER,
  matched_filters JSONB,
  total_filter_count INTEGER
) AS $$
DECLARE
  v_positions TEXT[];
  v_nationalities TEXT[];
  v_league_tiers INTEGER[];
BEGIN
  -- Parse array filters from JSONB
  IF p_filters ? 'positions' AND jsonb_typeof(p_filters->'positions') = 'array' AND jsonb_array_length(p_filters->'positions') > 0 THEN
    SELECT array_agg(elem::TEXT) INTO v_positions
    FROM jsonb_array_elements_text(p_filters->'positions') AS elem;
  END IF;

  IF p_filters ? 'nationalities' AND jsonb_typeof(p_filters->'nationalities') = 'array' AND jsonb_array_length(p_filters->'nationalities') > 0 THEN
    SELECT array_agg(elem::TEXT) INTO v_nationalities
    FROM jsonb_array_elements_text(p_filters->'nationalities') AS elem;
  END IF;

  IF p_filters ? 'league_tiers' AND jsonb_typeof(p_filters->'league_tiers') = 'array' AND jsonb_array_length(p_filters->'league_tiers') > 0 THEN
    SELECT array_agg(elem::INTEGER) INTO v_league_tiers
    FROM jsonb_array_elements_text(p_filters->'league_tiers') AS elem;
  END IF;

  RETURN QUERY
  WITH player_data AS (
    -- Get roster players with their overridden data
    SELECT
      p.id as p_id,
      p.name as p_name,
      COALESCE(apo.position_override, p.main_position)::TEXT as p_position,
      COALESCE(apo.age_override, p.age)::INTEGER as p_age,
      COALESCE(apo.height_override, p.height)::INTEGER as p_height,
      COALESCE(apo.foot_override, p.foot)::TEXT as p_foot,
      COALESCE(apo.nationality_override, p.nationality)::TEXT as p_nationality,
      p.is_eu_passport as p_eu_passport,
      lt.tier::INTEGER as p_league_tier,
      lt.name::TEXT as p_league_name,
      lt.country::TEXT as p_league_country,
      p.contract_expires::TEXT as p_contract_expires,
      p.market_value_eur::BIGINT as p_market_value,
      c.name::TEXT as p_club_name,
      c.logo_url::TEXT as p_club_logo,
      p.picture_url::TEXT as p_picture_url,
      p.transfermarkt_url::TEXT as p_transfermarkt_url
    FROM agent_rosters ar
    JOIN players_transfermarkt p ON ar.player_id = p.id
    LEFT JOIN agent_player_overrides apo ON apo.player_id = p.id AND apo.agent_id = p_agent_id
    LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
    LEFT JOIN leagues_transfermarkt lt ON c.league_id = lt.id
    WHERE ar.agent_id = p_agent_id
  ),
  filter_matches AS (
    SELECT
      pd.*,
      -- Calculate individual filter matches (1 = match, 0 = no match)
      -- Position filter
      CASE
        WHEN v_positions IS NOT NULL THEN
          CASE WHEN pd.p_position = ANY(v_positions) THEN 1 ELSE 0 END
        ELSE NULL
      END as pos_match,
      -- Age min filter
      CASE
        WHEN (p_filters->>'age_min') IS NOT NULL THEN
          CASE WHEN pd.p_age >= (p_filters->>'age_min')::INTEGER THEN 1 ELSE 0 END
        ELSE NULL
      END as age_min_match,
      -- Age max filter
      CASE
        WHEN (p_filters->>'age_max') IS NOT NULL THEN
          CASE WHEN pd.p_age <= (p_filters->>'age_max')::INTEGER THEN 1 ELSE 0 END
        ELSE NULL
      END as age_max_match,
      -- Height min filter
      CASE
        WHEN (p_filters->>'height_min') IS NOT NULL THEN
          CASE WHEN pd.p_height >= (p_filters->>'height_min')::INTEGER THEN 1 ELSE 0 END
        ELSE NULL
      END as height_min_match,
      -- Height max filter
      CASE
        WHEN (p_filters->>'height_max') IS NOT NULL THEN
          CASE WHEN pd.p_height <= (p_filters->>'height_max')::INTEGER THEN 1 ELSE 0 END
        ELSE NULL
      END as height_max_match,
      -- Foot filter
      CASE
        WHEN p_filters->>'foot' IS NOT NULL AND p_filters->>'foot' != '' THEN
          CASE WHEN LOWER(pd.p_foot) = LOWER(p_filters->>'foot') OR p_filters->>'foot' = 'both' THEN 1 ELSE 0 END
        ELSE NULL
      END as foot_match,
      -- Nationality filter
      CASE
        WHEN v_nationalities IS NOT NULL THEN
          CASE WHEN pd.p_nationality = ANY(v_nationalities) THEN 1 ELSE 0 END
        ELSE NULL
      END as nationality_match,
      -- EU passport filter
      CASE
        WHEN (p_filters->>'eu_passport') IS NOT NULL THEN
          CASE WHEN pd.p_eu_passport = (p_filters->>'eu_passport')::BOOLEAN THEN 1 ELSE 0 END
        ELSE NULL
      END as eu_match,
      -- League tier filter
      CASE
        WHEN v_league_tiers IS NOT NULL THEN
          CASE WHEN pd.p_league_tier = ANY(v_league_tiers) THEN 1 ELSE 0 END
        ELSE NULL
      END as tier_match,
      -- Market value min filter
      CASE
        WHEN (p_filters->>'market_value_min') IS NOT NULL THEN
          CASE WHEN pd.p_market_value >= (p_filters->>'market_value_min')::BIGINT THEN 1 ELSE 0 END
        ELSE NULL
      END as value_min_match,
      -- Market value max filter
      CASE
        WHEN (p_filters->>'market_value_max') IS NOT NULL THEN
          CASE WHEN pd.p_market_value <= (p_filters->>'market_value_max')::BIGINT THEN 1 ELSE 0 END
        ELSE NULL
      END as value_max_match,
      -- Contract expiring filter (within X months from now)
      CASE
        WHEN (p_filters->>'contract_expiring_months') IS NOT NULL AND pd.p_contract_expires IS NOT NULL THEN
          CASE
            WHEN pd.p_contract_expires::DATE <= (CURRENT_DATE + ((p_filters->>'contract_expiring_months')::INTEGER || ' months')::INTERVAL)
                 AND pd.p_contract_expires::DATE >= CURRENT_DATE
            THEN 1
            ELSE 0
          END
        ELSE NULL
      END as contract_match
    FROM player_data pd
  ),
  scored_players AS (
    SELECT
      fm.*,
      -- Count active filters (non-NULL matches)
      (
        CASE WHEN fm.pos_match IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fm.age_min_match IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fm.age_max_match IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fm.height_min_match IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fm.height_max_match IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fm.foot_match IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fm.nationality_match IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fm.eu_match IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fm.tier_match IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fm.value_min_match IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fm.value_max_match IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN fm.contract_match IS NOT NULL THEN 1 ELSE 0 END
      ) as filter_count,
      -- Count matched filters
      (
        COALESCE(fm.pos_match, 0) +
        COALESCE(fm.age_min_match, 0) +
        COALESCE(fm.age_max_match, 0) +
        COALESCE(fm.height_min_match, 0) +
        COALESCE(fm.height_max_match, 0) +
        COALESCE(fm.foot_match, 0) +
        COALESCE(fm.nationality_match, 0) +
        COALESCE(fm.eu_match, 0) +
        COALESCE(fm.tier_match, 0) +
        COALESCE(fm.value_min_match, 0) +
        COALESCE(fm.value_max_match, 0) +
        COALESCE(fm.contract_match, 0)
      ) as matched_count
    FROM filter_matches fm
  )
  SELECT
    sp.p_id as player_id,
    sp.p_name as player_name,
    sp.p_position as position,
    sp.p_age as age,
    sp.p_height as height,
    sp.p_foot as foot,
    sp.p_nationality as nationality,
    sp.p_eu_passport as is_eu_passport,
    sp.p_league_tier as league_tier,
    sp.p_league_name as league_name,
    sp.p_league_country as league_country,
    sp.p_contract_expires as contract_expires,
    sp.p_market_value as market_value_eur,
    sp.p_club_name as club_name,
    sp.p_club_logo as club_logo_url,
    sp.p_picture_url as picture_url,
    sp.p_transfermarkt_url as transfermarkt_url,
    -- Calculate match score as percentage (0-100)
    CASE
      WHEN sp.filter_count > 0 THEN ROUND((sp.matched_count::NUMERIC / sp.filter_count) * 100)::INTEGER
      ELSE 100  -- If no filters, all players match 100%
    END as match_score,
    -- Build matched filters object for UI display
    jsonb_build_object(
      'position', COALESCE(sp.pos_match = 1, false),
      'age_min', COALESCE(sp.age_min_match = 1, false),
      'age_max', COALESCE(sp.age_max_match = 1, false),
      'height_min', COALESCE(sp.height_min_match = 1, false),
      'height_max', COALESCE(sp.height_max_match = 1, false),
      'foot', COALESCE(sp.foot_match = 1, false),
      'nationality', COALESCE(sp.nationality_match = 1, false),
      'eu_passport', COALESCE(sp.eu_match = 1, false),
      'league_tier', COALESCE(sp.tier_match = 1, false),
      'market_value_min', COALESCE(sp.value_min_match = 1, false),
      'market_value_max', COALESCE(sp.value_max_match = 1, false),
      'contract_expiring', COALESCE(sp.contract_match = 1, false)
    ) as matched_filters,
    sp.filter_count as total_filter_count
  FROM scored_players sp
  ORDER BY
    -- Sort by match score descending, then by name
    CASE
      WHEN sp.filter_count > 0 THEN (sp.matched_count::NUMERIC / sp.filter_count)
      ELSE 1
    END DESC,
    sp.p_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNCTION: Get agent wishlists with match counts
-- =====================================================
-- Returns all wishlists for an agent with the count of matching players
CREATE OR REPLACE FUNCTION get_agent_wishlists_with_counts(p_agent_id UUID)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  club_logo_url TEXT,
  filters JSONB,
  matching_player_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.name::TEXT,
    w.club_logo_url::TEXT,
    w.filters,
    (
      SELECT COUNT(*)::INTEGER
      FROM get_wishlist_matching_players(p_agent_id, w.filters) mp
      WHERE mp.match_score > 0
    ) as matching_player_count,
    w.created_at,
    w.updated_at
  FROM agent_wishlists w
  WHERE w.agent_id = p_agent_id
  ORDER BY w.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_wishlist_matching_players(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_agent_wishlists_with_counts(UUID) TO authenticated;

-- =====================================================
-- 9. SUCCESS MESSAGE
-- =====================================================
SELECT 'Agent wishlists system created successfully!' as status;
