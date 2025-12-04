-- Fix: Use correct column names from agent_player_overrides (with _override suffix)

-- Fix get_agent_wishlist_clubs_with_positions
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
              WHERE ar.agent_id = p_agent_id
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

-- Fix get_wishlist_matching_players_v2
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
  v_merged_filters := COALESCE(p_base_filters, '{}'::JSONB) || COALESCE(p_position_filters, '{}'::JSONB);

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
    ar.player_id::INTEGER,
    COALESCE(pt.name, 'Unknown')::TEXT as player_name,
    COALESCE(apo.position_override, pt.main_position)::TEXT as player_position,
    COALESCE(apo.age_override, pt.age)::INTEGER as age,
    COALESCE(apo.height_override, pt.height)::INTEGER as height,
    COALESCE(apo.foot_override, pt.foot)::TEXT as foot,
    COALESCE(apo.nationality_override, pt.nationality)::TEXT as nationality,
    pt.is_eu_passport::BOOLEAN as is_eu_passport,
    l.tier::INTEGER as league_tier,
    l.name::TEXT as league_name,
    l.country::TEXT as league_country,
    COALESCE(apo.contract_expires_override, pt.contract_expires)::DATE as contract_expires,
    COALESCE(apo.market_value_override::BIGINT, pt.market_value_eur) as market_value_eur,
    c.name::TEXT as club_name,
    c.logo_url::TEXT as club_logo_url,
    COALESCE(apo.picture_url_override, pt.picture_url)::TEXT as picture_url,
    pt.transfermarkt_url::TEXT,
    CASE WHEN v_filter_count = 0 THEN 100 ELSE
      (
        (CASE WHEN v_positions IS NOT NULL AND COALESCE(apo.position_override, pt.main_position) = ANY(v_positions) THEN 1 ELSE 0 END) +
        (CASE WHEN v_age_min IS NOT NULL AND COALESCE(apo.age_override, pt.age) >= v_age_min THEN 1 ELSE 0 END) +
        (CASE WHEN v_age_max IS NOT NULL AND COALESCE(apo.age_override, pt.age) <= v_age_max THEN 1 ELSE 0 END) +
        (CASE WHEN v_height_min IS NOT NULL AND COALESCE(apo.height_override, pt.height) >= v_height_min THEN 1 ELSE 0 END) +
        (CASE WHEN v_height_max IS NOT NULL AND COALESCE(apo.height_override, pt.height) <= v_height_max THEN 1 ELSE 0 END) +
        (CASE WHEN v_foot IS NOT NULL AND COALESCE(apo.foot_override, pt.foot) = v_foot THEN 1 ELSE 0 END) +
        (CASE WHEN v_nationalities IS NOT NULL AND COALESCE(apo.nationality_override, pt.nationality) = ANY(v_nationalities) THEN 1 ELSE 0 END) +
        (CASE WHEN v_eu_passport IS NOT NULL AND pt.is_eu_passport = v_eu_passport THEN 1 ELSE 0 END) +
        (CASE WHEN v_league_tiers IS NOT NULL AND l.tier = ANY(v_league_tiers) THEN 1 ELSE 0 END) +
        (CASE WHEN v_contract_months IS NOT NULL AND COALESCE(apo.contract_expires_override, pt.contract_expires) <= CURRENT_DATE + (v_contract_months || ' months')::INTERVAL THEN 1 ELSE 0 END) +
        (CASE WHEN v_value_min IS NOT NULL AND COALESCE(apo.market_value_override::BIGINT, pt.market_value_eur) >= v_value_min THEN 1 ELSE 0 END) +
        (CASE WHEN v_value_max IS NOT NULL AND COALESCE(apo.market_value_override::BIGINT, pt.market_value_eur) <= v_value_max THEN 1 ELSE 0 END)
      ) * 100 / v_filter_count
    END::INTEGER as match_score,
    jsonb_build_object(
      'position', v_positions IS NULL OR COALESCE(apo.position_override, pt.main_position) = ANY(v_positions),
      'age_min', v_age_min IS NULL OR COALESCE(apo.age_override, pt.age) >= v_age_min,
      'age_max', v_age_max IS NULL OR COALESCE(apo.age_override, pt.age) <= v_age_max,
      'height_min', v_height_min IS NULL OR COALESCE(apo.height_override, pt.height) >= v_height_min,
      'height_max', v_height_max IS NULL OR COALESCE(apo.height_override, pt.height) <= v_height_max,
      'foot', v_foot IS NULL OR COALESCE(apo.foot_override, pt.foot) = v_foot,
      'nationality', v_nationalities IS NULL OR COALESCE(apo.nationality_override, pt.nationality) = ANY(v_nationalities),
      'eu_passport', v_eu_passport IS NULL OR pt.is_eu_passport = v_eu_passport,
      'league_tier', v_league_tiers IS NULL OR l.tier = ANY(v_league_tiers),
      'contract_expiring', v_contract_months IS NULL OR COALESCE(apo.contract_expires_override, pt.contract_expires) <= CURRENT_DATE + (v_contract_months || ' months')::INTERVAL,
      'value_min', v_value_min IS NULL OR COALESCE(apo.market_value_override::BIGINT, pt.market_value_eur) >= v_value_min,
      'value_max', v_value_max IS NULL OR COALESCE(apo.market_value_override::BIGINT, pt.market_value_eur) <= v_value_max
    ) as matched_filters,
    v_filter_count as total_filter_count
  FROM agent_rosters ar
  LEFT JOIN agent_player_overrides apo ON ar.agent_id = apo.agent_id AND ar.player_id = apo.player_id
  LEFT JOIN players_transfermarkt pt ON ar.player_id = pt.id
  LEFT JOIN clubs c ON pt.club_id = c.id
  LEFT JOIN leagues l ON c.league_id = l.id
  WHERE ar.agent_id = p_agent_id
  ORDER BY match_score DESC, player_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_agent_wishlist_clubs_with_positions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_wishlist_matching_players_v2(UUID, JSONB, JSONB) TO authenticated;
