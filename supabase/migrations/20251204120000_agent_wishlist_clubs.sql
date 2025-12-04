-- Migration: Add club hierarchy to agent wishlists
-- Clubs contain base filters, positions (wishlists) contain specific filters

-- 1. Create agent_wishlist_clubs table (parent)
CREATE TABLE IF NOT EXISTS agent_wishlist_clubs (
  id SERIAL PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  club_logo_url TEXT,
  base_filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by agent
CREATE INDEX IF NOT EXISTS idx_agent_wishlist_clubs_agent_id ON agent_wishlist_clubs(agent_id);

-- 2. Add club_id to existing agent_wishlists table (nullable for backward compatibility)
ALTER TABLE agent_wishlists
ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES agent_wishlist_clubs(id) ON DELETE CASCADE;

-- Index for club lookups
CREATE INDEX IF NOT EXISTS idx_agent_wishlists_club_id ON agent_wishlists(club_id);

-- 3. RLS policies for agent_wishlist_clubs
ALTER TABLE agent_wishlist_clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own clubs"
  ON agent_wishlist_clubs FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert own clubs"
  ON agent_wishlist_clubs FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update own clubs"
  ON agent_wishlist_clubs FOR UPDATE
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents can delete own clubs"
  ON agent_wishlist_clubs FOR DELETE
  USING (auth.uid() = agent_id);

-- 4. Function to get clubs with their positions and match counts
CREATE OR REPLACE FUNCTION get_agent_wishlist_clubs_with_positions(p_agent_id UUID)
RETURNS TABLE (
  id INTEGER,
  name VARCHAR(255),
  club_logo_url TEXT,
  base_filters JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  positions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.club_logo_url,
    c.base_filters,
    c.created_at,
    c.updated_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', w.id,
            'name', w.name,
            'filters', w.filters,
            'created_at', w.created_at,
            'matching_player_count', (
              SELECT COUNT(*)::INTEGER
              FROM agent_rosters ar
              LEFT JOIN agent_player_overrides apo ON ar.agent_id = apo.agent_id AND ar.player_id = apo.player_id
              LEFT JOIN players_transfermarkt pt ON ar.player_id = pt.id
              WHERE ar.agent_id = p_agent_id
              AND (
                -- Check combined filters (base + position, position overrides)
                (COALESCE(w.filters->>'positions', c.base_filters->>'positions') IS NULL OR
                 COALESCE(apo.position, pt.position) = ANY(
                   SELECT jsonb_array_elements_text(COALESCE(w.filters->'positions', c.base_filters->'positions'))
                 ))
              )
            )
          ) ORDER BY w.created_at
        )
        FROM agent_wishlists w
        WHERE w.club_id = c.id
      ),
      '[]'::JSONB
    ) as positions
  FROM agent_wishlist_clubs c
  WHERE c.agent_id = p_agent_id
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Updated function to get matching players with merged filters
-- Position filters override base filters
CREATE OR REPLACE FUNCTION get_wishlist_matching_players_v2(
  p_agent_id UUID,
  p_base_filters JSONB,
  p_position_filters JSONB
)
RETURNS TABLE (
  player_id INTEGER,
  player_name TEXT,
  player_position TEXT,
  age INTEGER,
  height INTEGER,
  foot TEXT,
  nationality TEXT,
  is_eu_passport BOOLEAN,
  league_tier INTEGER,
  league_name TEXT,
  league_country TEXT,
  contract_expires DATE,
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
  v_merged_filters JSONB;
  v_positions TEXT[];
  v_age_min INTEGER;
  v_age_max INTEGER;
  v_height_min INTEGER;
  v_height_max INTEGER;
  v_foot TEXT;
  v_nationalities TEXT[];
  v_eu_passport BOOLEAN;
  v_league_tiers INTEGER[];
  v_contract_months INTEGER;
  v_value_min BIGINT;
  v_value_max BIGINT;
  v_filter_count INTEGER := 0;
BEGIN
  -- Merge filters: position_filters override base_filters
  v_merged_filters := COALESCE(p_base_filters, '{}'::JSONB) || COALESCE(p_position_filters, '{}'::JSONB);

  -- Extract filter values from merged filters
  IF v_merged_filters->'positions' IS NOT NULL AND jsonb_array_length(v_merged_filters->'positions') > 0 THEN
    SELECT array_agg(pos) INTO v_positions FROM jsonb_array_elements_text(v_merged_filters->'positions') pos;
    v_filter_count := v_filter_count + 1;
  END IF;

  IF v_merged_filters->>'age_min' IS NOT NULL THEN
    v_age_min := (v_merged_filters->>'age_min')::INTEGER;
    v_filter_count := v_filter_count + 1;
  END IF;

  IF v_merged_filters->>'age_max' IS NOT NULL THEN
    v_age_max := (v_merged_filters->>'age_max')::INTEGER;
    v_filter_count := v_filter_count + 1;
  END IF;

  IF v_merged_filters->>'height_min' IS NOT NULL THEN
    v_height_min := (v_merged_filters->>'height_min')::INTEGER;
    v_filter_count := v_filter_count + 1;
  END IF;

  IF v_merged_filters->>'height_max' IS NOT NULL THEN
    v_height_max := (v_merged_filters->>'height_max')::INTEGER;
    v_filter_count := v_filter_count + 1;
  END IF;

  IF v_merged_filters->>'foot' IS NOT NULL THEN
    v_foot := v_merged_filters->>'foot';
    v_filter_count := v_filter_count + 1;
  END IF;

  IF v_merged_filters->'nationalities' IS NOT NULL AND jsonb_array_length(v_merged_filters->'nationalities') > 0 THEN
    SELECT array_agg(nat) INTO v_nationalities FROM jsonb_array_elements_text(v_merged_filters->'nationalities') nat;
    v_filter_count := v_filter_count + 1;
  END IF;

  IF v_merged_filters->>'eu_passport' IS NOT NULL THEN
    v_eu_passport := (v_merged_filters->>'eu_passport')::BOOLEAN;
    v_filter_count := v_filter_count + 1;
  END IF;

  IF v_merged_filters->'league_tiers' IS NOT NULL AND jsonb_array_length(v_merged_filters->'league_tiers') > 0 THEN
    SELECT array_agg(tier::INTEGER) INTO v_league_tiers FROM jsonb_array_elements_text(v_merged_filters->'league_tiers') tier;
    v_filter_count := v_filter_count + 1;
  END IF;

  IF v_merged_filters->>'contract_expiring_months' IS NOT NULL THEN
    v_contract_months := (v_merged_filters->>'contract_expiring_months')::INTEGER;
    v_filter_count := v_filter_count + 1;
  END IF;

  IF v_merged_filters->>'market_value_min' IS NOT NULL THEN
    v_value_min := (v_merged_filters->>'market_value_min')::BIGINT;
    v_filter_count := v_filter_count + 1;
  END IF;

  IF v_merged_filters->>'market_value_max' IS NOT NULL THEN
    v_value_max := (v_merged_filters->>'market_value_max')::BIGINT;
    v_filter_count := v_filter_count + 1;
  END IF;

  RETURN QUERY
  SELECT
    ar.player_id,
    COALESCE(apo.name, pt.name) as player_name,
    COALESCE(apo.position, pt.position) as player_position,
    COALESCE(apo.age, pt.age) as age,
    COALESCE(apo.height, pt.height) as height,
    COALESCE(apo.foot, pt.foot) as foot,
    COALESCE(apo.nationality, pt.nationality) as nationality,
    COALESCE(apo.is_eu_passport, pt.is_eu_passport) as is_eu_passport,
    l.tier as league_tier,
    l.competition as league_name,
    l.country as league_country,
    COALESCE(apo.contract_expires, pt.contract_expires) as contract_expires,
    COALESCE(apo.market_value_eur, pt.market_value_eur) as market_value_eur,
    c.name as club_name,
    c.logo_url as club_logo_url,
    pt.picture_url,
    pt.transfermarkt_url,
    -- Calculate match score
    CASE WHEN v_filter_count = 0 THEN 100 ELSE
      (
        (CASE WHEN v_positions IS NULL OR COALESCE(apo.position, pt.position) = ANY(v_positions) THEN 1 ELSE 0 END) +
        (CASE WHEN v_age_min IS NULL OR COALESCE(apo.age, pt.age) >= v_age_min THEN 1 ELSE 0 END) +
        (CASE WHEN v_age_max IS NULL OR COALESCE(apo.age, pt.age) <= v_age_max THEN 1 ELSE 0 END) +
        (CASE WHEN v_height_min IS NULL OR COALESCE(apo.height, pt.height) >= v_height_min THEN 1 ELSE 0 END) +
        (CASE WHEN v_height_max IS NULL OR COALESCE(apo.height, pt.height) <= v_height_max THEN 1 ELSE 0 END) +
        (CASE WHEN v_foot IS NULL OR COALESCE(apo.foot, pt.foot) = v_foot THEN 1 ELSE 0 END) +
        (CASE WHEN v_nationalities IS NULL OR COALESCE(apo.nationality, pt.nationality) = ANY(v_nationalities) THEN 1 ELSE 0 END) +
        (CASE WHEN v_eu_passport IS NULL OR COALESCE(apo.is_eu_passport, pt.is_eu_passport) = v_eu_passport THEN 1 ELSE 0 END) +
        (CASE WHEN v_league_tiers IS NULL OR l.tier = ANY(v_league_tiers) THEN 1 ELSE 0 END) +
        (CASE WHEN v_contract_months IS NULL OR COALESCE(apo.contract_expires, pt.contract_expires) <= CURRENT_DATE + (v_contract_months || ' months')::INTERVAL THEN 1 ELSE 0 END) +
        (CASE WHEN v_value_min IS NULL OR COALESCE(apo.market_value_eur, pt.market_value_eur) >= v_value_min THEN 1 ELSE 0 END) +
        (CASE WHEN v_value_max IS NULL OR COALESCE(apo.market_value_eur, pt.market_value_eur) <= v_value_max THEN 1 ELSE 0 END)
      ) * 100 / v_filter_count
    END as match_score,
    -- Matched filters breakdown
    jsonb_build_object(
      'position', v_positions IS NULL OR COALESCE(apo.position, pt.position) = ANY(v_positions),
      'age_min', v_age_min IS NULL OR COALESCE(apo.age, pt.age) >= v_age_min,
      'age_max', v_age_max IS NULL OR COALESCE(apo.age, pt.age) <= v_age_max,
      'height_min', v_height_min IS NULL OR COALESCE(apo.height, pt.height) >= v_height_min,
      'height_max', v_height_max IS NULL OR COALESCE(apo.height, pt.height) <= v_height_max,
      'foot', v_foot IS NULL OR COALESCE(apo.foot, pt.foot) = v_foot,
      'nationality', v_nationalities IS NULL OR COALESCE(apo.nationality, pt.nationality) = ANY(v_nationalities),
      'eu_passport', v_eu_passport IS NULL OR COALESCE(apo.is_eu_passport, pt.is_eu_passport) = v_eu_passport,
      'league_tier', v_league_tiers IS NULL OR l.tier = ANY(v_league_tiers),
      'contract_expiring', v_contract_months IS NULL OR COALESCE(apo.contract_expires, pt.contract_expires) <= CURRENT_DATE + (v_contract_months || ' months')::INTERVAL,
      'value_min', v_value_min IS NULL OR COALESCE(apo.market_value_eur, pt.market_value_eur) >= v_value_min,
      'value_max', v_value_max IS NULL OR COALESCE(apo.market_value_eur, pt.market_value_eur) <= v_value_max
    ) as matched_filters,
    v_filter_count as total_filter_count
  FROM agent_rosters ar
  LEFT JOIN agent_player_overrides apo ON ar.agent_id = apo.agent_id AND ar.player_id = apo.player_id
  LEFT JOIN players_transfermarkt pt ON ar.player_id = pt.id
  LEFT JOIN clubs c ON COALESCE(apo.club_id, pt.club_id) = c.id
  LEFT JOIN leagues l ON c.league_id = l.id
  WHERE ar.agent_id = p_agent_id
  ORDER BY match_score DESC, player_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_agent_wishlist_clubs_with_positions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_wishlist_matching_players_v2(UUID, JSONB, JSONB) TO authenticated;
