-- =====================================================
-- Add sofascore_id to all player-returning functions
-- For fallback image logic (TM placeholder -> SF image)
-- =====================================================

-- 1. Update get_agent_roster
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
  picture_url TEXT,
  sofascore_id BIGINT,
  player_transfermarkt_url TEXT,
  club_logo_url TEXT,
  club_transfermarkt_url TEXT,
  club_country TEXT,
  club_avg_market_value_eur INTEGER,
  league_id TEXT,
  league_name TEXT,
  league_tier INTEGER,
  league_country TEXT,
  league_transfermarkt_url TEXT,
  original_age INTEGER,
  original_position TEXT,
  original_nationality TEXT,
  original_height INTEGER,
  original_foot TEXT,
  original_contract_expires TEXT,
  original_market_value_eur INTEGER,
  has_age_override BOOLEAN,
  has_position_override BOOLEAN,
  has_nationality_override BOOLEAN,
  has_height_override BOOLEAN,
  has_foot_override BOOLEAN,
  has_contract_override BOOLEAN,
  has_value_override BOOLEAN,
  sf_data JSONB
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
    COALESCE(apo.contract_expires_override, p.contract_expires)::TEXT as contract_expires,
    COALESCE(apo.market_value_override, p.market_value_eur)::INTEGER as market_value_eur,
    p.is_eu_passport,
    ar.notes as agent_notes,
    ar.added_at,
    ar.updated_at,
    p.picture_url::TEXT,
    p.sofascore_id::BIGINT,
    p.transfermarkt_url::TEXT as player_transfermarkt_url,
    c.logo_url::TEXT as club_logo_url,
    c.transfermarkt_url::TEXT as club_transfermarkt_url,
    c.country::TEXT as club_country,
    c.avg_market_value_eur::INTEGER as club_avg_market_value_eur,
    l.id::TEXT as league_id,
    l.name::TEXT as league_name,
    l.tier::INTEGER as league_tier,
    l.country::TEXT as league_country,
    l.transfermarkt_url::TEXT as league_transfermarkt_url,
    p.age::INTEGER as original_age,
    p.main_position::TEXT as original_position,
    p.nationality::TEXT as original_nationality,
    p.height::INTEGER as original_height,
    p.foot::TEXT as original_foot,
    p.contract_expires::TEXT as original_contract_expires,
    p.market_value_eur::INTEGER as original_market_value_eur,
    (apo.age_override IS NOT NULL)::BOOLEAN as has_age_override,
    (apo.position_override IS NOT NULL)::BOOLEAN as has_position_override,
    (apo.nationality_override IS NOT NULL)::BOOLEAN as has_nationality_override,
    (apo.height_override IS NOT NULL)::BOOLEAN as has_height_override,
    (apo.foot_override IS NOT NULL)::BOOLEAN as has_foot_override,
    (apo.contract_expires_override IS NOT NULL)::BOOLEAN as has_contract_override,
    (apo.market_value_override IS NOT NULL)::BOOLEAN as has_value_override,
    p.sf_data::JSONB
  FROM agent_rosters ar
  JOIN players_transfermarkt p ON ar.player_id = p.id
  LEFT JOIN agent_player_overrides apo ON apo.agent_id = ar.agent_id AND apo.player_id = p.id
  LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
  LEFT JOIN leagues_transfermarkt l ON c.league_id = l.id
  WHERE ar.agent_id = p_agent_id
  ORDER BY ar.added_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'get_agent_roster updated with sofascore_id' as status;

-- 2. Update search_available_players
DROP FUNCTION IF EXISTS search_available_players(TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, BOOLEAN, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION search_available_players(
  p_search_term TEXT DEFAULT NULL,
  p_position TEXT DEFAULT NULL,
  p_min_age INTEGER DEFAULT NULL,
  p_max_age INTEGER DEFAULT NULL,
  p_min_height INTEGER DEFAULT NULL,
  p_max_height INTEGER DEFAULT NULL,
  p_foot TEXT DEFAULT NULL,
  p_eu_only BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  player_id BIGINT,
  player_name TEXT,
  age INTEGER,
  position TEXT,
  nationality TEXT,
  height INTEGER,
  foot TEXT,
  contract_expires TEXT,
  market_value_eur INTEGER,
  is_eu_passport BOOLEAN,
  picture_url TEXT,
  sofascore_id BIGINT,
  transfermarkt_url TEXT,
  club_id BIGINT,
  club_name TEXT,
  club_logo_url TEXT,
  league_name TEXT,
  league_tier INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id::BIGINT as player_id,
    p.name::TEXT as player_name,
    p.age::INTEGER,
    p.main_position::TEXT as position,
    p.nationality::TEXT,
    p.height::INTEGER,
    p.foot::TEXT,
    p.contract_expires::TEXT,
    p.market_value_eur::INTEGER,
    p.is_eu_passport::BOOLEAN,
    p.picture_url::TEXT,
    p.sofascore_id::BIGINT,
    p.transfermarkt_url::TEXT,
    c.id::BIGINT as club_id,
    c.name::TEXT as club_name,
    c.logo_url::TEXT as club_logo_url,
    l.name::TEXT as league_name,
    l.tier::INTEGER as league_tier
  FROM players_transfermarkt p
  LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
  LEFT JOIN leagues_transfermarkt l ON c.league_id = l.id
  WHERE
    (p_search_term IS NULL OR p.name ILIKE '%' || p_search_term || '%')
    AND (p_position IS NULL OR p.main_position = p_position)
    AND (p_min_age IS NULL OR p.age >= p_min_age)
    AND (p_max_age IS NULL OR p.age <= p_max_age)
    AND (p_min_height IS NULL OR p.height >= p_min_height)
    AND (p_max_height IS NULL OR p.height <= p_max_height)
    AND (p_foot IS NULL OR p.foot = p_foot)
    AND (NOT p_eu_only OR p.is_eu_passport = TRUE)
  ORDER BY p.market_value_eur DESC NULLS LAST, p.name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'search_available_players updated with sofascore_id' as status;

-- 3. Update get_smart_recommendations to add sofascore_id
-- First check current signature and recreate with sofascore_id
DROP FUNCTION IF EXISTS get_smart_recommendations(UUID);

CREATE OR REPLACE FUNCTION get_smart_recommendations(p_agent_id UUID)
RETURNS TABLE (
  recommendation_id TEXT,
  player_id BIGINT,
  player_name TEXT,
  player_age INTEGER,
  player_position TEXT,
  player_nationality TEXT,
  player_contract_expires TEXT,
  player_market_value INTEGER,
  player_picture_url TEXT,
  player_sofascore_id BIGINT,
  player_transfermarkt_url TEXT,
  club_id BIGINT,
  club_name TEXT,
  club_logo_url TEXT,
  club_transfermarkt_url TEXT,
  club_country TEXT,
  club_avg_market_value INTEGER,
  league_name TEXT,
  league_tier INTEGER,
  league_avg_market_value INTEGER,
  match_score INTEGER,
  match_reasons JSONB
) AS $$
BEGIN
  -- Delegate to v2 with default weights
  RETURN QUERY
  SELECT
    r.recommendation_id,
    r.player_id,
    r.player_name,
    r.player_age,
    r.player_position,
    r.player_nationality,
    r.player_contract_expires,
    r.player_market_value,
    r.player_picture_url,
    r.player_sofascore_id,
    r.player_transfermarkt_url,
    r.club_id,
    r.club_name,
    r.club_logo_url,
    r.club_transfermarkt_url,
    r.club_country,
    r.club_avg_market_value,
    r.league_name,
    r.league_tier,
    r.league_avg_market_value,
    r.match_score,
    r.match_reasons
  FROM get_smart_recommendations_v2(p_agent_id, NULL) r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'get_smart_recommendations updated with sofascore_id' as status;

-- 4. Update get_smart_recommendations_v2
DROP FUNCTION IF EXISTS get_smart_recommendations_v2(UUID, JSONB);

CREATE OR REPLACE FUNCTION get_smart_recommendations_v2(
  p_agent_id UUID,
  p_temp_weights JSONB DEFAULT NULL
)
RETURNS TABLE (
  recommendation_id TEXT,
  player_id BIGINT,
  player_name TEXT,
  player_age INTEGER,
  player_position TEXT,
  player_nationality TEXT,
  player_contract_expires TEXT,
  player_market_value INTEGER,
  player_picture_url TEXT,
  player_sofascore_id BIGINT,
  player_transfermarkt_url TEXT,
  club_id BIGINT,
  club_name TEXT,
  club_logo_url TEXT,
  club_transfermarkt_url TEXT,
  club_country TEXT,
  club_avg_market_value INTEGER,
  league_name TEXT,
  league_tier INTEGER,
  league_avg_market_value INTEGER,
  match_score INTEGER,
  match_reasons JSONB
) AS $$
DECLARE
  weights JSONB;
  hard_filters JSONB;
BEGIN
  -- Load weights: temp weights (for preview) > saved weights > defaults
  IF p_temp_weights IS NOT NULL THEN
    weights := p_temp_weights;
    SELECT COALESCE(aaw.hard_filters, '{"requireEuPassport": false, "minAvailabilityPct": 50, "minSofascoreRating": 0}'::jsonb)
    INTO hard_filters
    FROM agent_algorithm_weights aaw
    WHERE aaw.agent_id = p_agent_id;
    IF hard_filters IS NULL THEN
      hard_filters := '{"requireEuPassport": false, "minAvailabilityPct": 50, "minSofascoreRating": 0}'::jsonb;
    END IF;
  ELSE
    SELECT
      COALESCE(aaw.weights, '{"sameLeague": 30, "contractTimingPerfect": 40, "contractTimingGood": 25, "imminentFree": 25, "squadTurnoverUrgency": 30, "multipleOpenings": 20, "marketFitPerfect": 30, "sameCountry": 20, "ageVeryYoung": 30, "ageYoung": 20, "agePrime": 10, "ageFitsSquad": 15, "injuryReliability": 25, "lowPlayingTime": 15, "recentForm": 15, "versatility": 20, "disciplinePenalty": 20, "sofascoreRating": 25, "topPercentile": 20, "goalContributions": 20, "duelDominance": 15, "passingQuality": 15}'::jsonb),
      COALESCE(aaw.hard_filters, '{"requireEuPassport": false, "minAvailabilityPct": 50, "minSofascoreRating": 0}'::jsonb)
    INTO weights, hard_filters
    FROM agent_algorithm_weights aaw
    WHERE aaw.agent_id = p_agent_id;
    IF weights IS NULL THEN
      weights := '{"sameLeague": 30, "contractTimingPerfect": 40, "contractTimingGood": 25, "imminentFree": 25, "squadTurnoverUrgency": 30, "multipleOpenings": 20, "marketFitPerfect": 30, "sameCountry": 20, "ageVeryYoung": 30, "ageYoung": 20, "agePrime": 10, "ageFitsSquad": 15, "injuryReliability": 25, "lowPlayingTime": 15, "recentForm": 15, "versatility": 20, "disciplinePenalty": 20, "sofascoreRating": 25, "topPercentile": 20, "goalContributions": 20, "duelDominance": 15, "passingQuality": 15}'::jsonb;
    END IF;
    IF hard_filters IS NULL THEN
      hard_filters := '{"requireEuPassport": false, "minAvailabilityPct": 50, "minSofascoreRating": 0}'::jsonb;
    END IF;
  END IF;

  RETURN QUERY
  WITH agent_roster AS (
    SELECT
      ar.player_id,
      p.name,
      p.sofascore_id,
      COALESCE(apo.age_override, p.age) as age,
      COALESCE(apo.position_override, p.main_position) as main_position,
      COALESCE(apo.nationality_override, p.nationality) as nationality,
      COALESCE(apo.contract_expires_override, p.contract_expires)::DATE as contract_expires_date,
      COALESCE(apo.contract_expires_override, p.contract_expires)::TEXT as contract_expires,
      COALESCE(apo.market_value_override, p.market_value_eur) as market_value_eur,
      p.picture_url,
      p.transfermarkt_url,
      p.club_id as current_club_id,
      c.league_id,
      c.country as current_country,
      cl.avg_market_value_eur as current_league_market_value,
      cl.tier as current_tier,
      CASE WHEN p.nationality ~* 'Germany|France|Spain|Italy|Netherlands|Belgium|Portugal|Poland|Sweden|Austria|Denmark|Finland|Ireland|Greece|Czech|Hungary|Romania|Bulgaria|Croatia|Slovakia|Slovenia|Lithuania|Latvia|Estonia|Luxembourg|Malta|Cyprus'
        THEN true ELSE false
      END as is_eu_passport,
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'rating')::NUMERIC, 0) as sofascore_rating,
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'goals')::INTEGER, 0) as sf_goals,
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'assists')::INTEGER, 0) as sf_assists,
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'appearances')::INTEGER, 1) as sf_appearances,
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'minutesPlayed')::INTEGER, 0) as sf_minutes,
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'accuratePassesPercentage')::NUMERIC, 0) as sf_pass_accuracy,
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'totalDuelsWonPercentage')::NUMERIC, 0) as sf_duel_pct,
      COALESCE((p.tm_data->'performance'->>'games_played')::INTEGER, 0) as tm_games,
      COALESCE((p.tm_data->'performance'->>'games_started')::INTEGER, 0) as tm_games_started,
      COALESCE((p.tm_data->'performance'->>'goals')::INTEGER, 0) as tm_goals,
      COALESCE((p.tm_data->'performance'->>'assists')::INTEGER, 0) as tm_assists,
      COALESCE((p.tm_data->'performance'->>'yellow_cards')::INTEGER, 0) as tm_yellows,
      COALESCE((p.tm_data->'performance'->>'red_cards')::INTEGER, 0) as tm_reds,
      COALESCE((p.tm_data->'performance'->>'minutes_played')::INTEGER, 0) as tm_minutes,
      CASE
        WHEN COALESCE((p.tm_data->'performance'->>'games_played')::INTEGER, 0) > 0
        THEN LEAST(100, ROUND((COALESCE((p.tm_data->'performance'->>'games_played')::INTEGER, 0)::NUMERIC / 34.0) * 100))
        ELSE 100
      END as availability_pct,
      COALESCE(jsonb_array_length(p.tm_data->'positions'), 1) as positions_count
    FROM agent_rosters ar
    JOIN players_transfermarkt p ON ar.player_id = p.id
    LEFT JOIN agent_player_overrides apo ON apo.agent_id = ar.agent_id AND apo.player_id = p.id
    LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
    LEFT JOIN leagues_transfermarkt cl ON c.league_id = cl.id
    WHERE ar.agent_id = p_agent_id
      AND COALESCE(apo.contract_expires_override, p.contract_expires) IS NOT NULL
      AND COALESCE(apo.contract_expires_override, p.contract_expires)::DATE <= (NOW() + INTERVAL '6 months')::DATE
      AND COALESCE(apo.contract_expires_override, p.contract_expires)::DATE >= NOW()::DATE
      AND COALESCE(apo.market_value_override, p.market_value_eur, 0) <= 150000
  ),
  club_squad_analysis AS (
    SELECT
      afc.club_id,
      c.name as club_name,
      c.logo_url as club_logo_url,
      c.transfermarkt_url as club_transfermarkt_url,
      c.country,
      c.league_id,
      l.name as league_name,
      l.tier,
      l.avg_market_value_eur as league_avg_market_value,
      c.avg_market_value_eur as club_avg_market_value,
      p.main_position,
      COUNT(p.id) as position_count,
      ROUND(AVG(p.age), 1) as avg_age_in_position,
      COUNT(CASE WHEN p.contract_expires IS NOT NULL AND p.contract_expires::DATE <= (NOW() + INTERVAL '6 months')::DATE THEN 1 END) as expiring_in_position,
      jsonb_agg(DISTINCT jsonb_build_object('name', p.name, 'age', p.age, 'contract_expires', p.contract_expires::TEXT, 'market_value', p.market_value_eur, 'months_diff', ROUND((p.contract_expires::DATE - NOW()::DATE)::NUMERIC / 30.44)) ORDER BY jsonb_build_object('name', p.name, 'age', p.age, 'contract_expires', p.contract_expires::TEXT, 'market_value', p.market_value_eur, 'months_diff', ROUND((p.contract_expires::DATE - NOW()::DATE)::NUMERIC / 30.44))) FILTER (WHERE p.contract_expires IS NOT NULL AND p.contract_expires::DATE <= (NOW() + INTERVAL '6 months')::DATE) as expiring_players
    FROM agent_favorite_clubs afc
    JOIN clubs_transfermarkt c ON afc.club_id = c.id
    LEFT JOIN leagues_transfermarkt l ON c.league_id = l.id
    LEFT JOIN players_transfermarkt p ON p.club_id = c.id
    WHERE afc.agent_id = p_agent_id
    GROUP BY afc.club_id, c.name, c.logo_url, c.transfermarkt_url, c.country, c.league_id, l.name, l.tier, l.avg_market_value_eur, c.avg_market_value_eur, p.main_position
  ),
  recommendations AS (
    SELECT
      CONCAT(ar.player_id, '-', csa.club_id)::TEXT as recommendation_id,
      ar.player_id::BIGINT,
      ar.name::TEXT as player_name,
      ar.age::INTEGER as player_age,
      ar.main_position::TEXT as player_position,
      ar.nationality::TEXT as player_nationality,
      ar.contract_expires as player_contract_expires,
      ar.market_value_eur::INTEGER as player_market_value,
      ar.picture_url::TEXT as player_picture_url,
      ar.sofascore_id::BIGINT as player_sofascore_id,
      ar.transfermarkt_url::TEXT as player_transfermarkt_url,
      csa.club_id::BIGINT,
      csa.club_name::TEXT,
      csa.club_logo_url::TEXT,
      csa.club_transfermarkt_url::TEXT,
      csa.country::TEXT as club_country,
      csa.club_avg_market_value::INTEGER,
      csa.league_name::TEXT,
      csa.tier::INTEGER as league_tier,
      csa.league_avg_market_value::INTEGER,
      (
        CASE WHEN ar.league_id = csa.league_id THEN COALESCE((weights->>'sameLeague')::INTEGER, 30) ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM players_transfermarkt cp WHERE cp.club_id = csa.club_id AND cp.main_position = ar.main_position AND cp.contract_expires IS NOT NULL AND ABS((cp.contract_expires::DATE - ar.contract_expires_date::DATE)::NUMERIC / 30.44) <= 1) THEN COALESCE((weights->>'contractTimingPerfect')::INTEGER, 40) ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM players_transfermarkt cp WHERE cp.club_id = csa.club_id AND cp.main_position = ar.main_position AND cp.contract_expires IS NOT NULL AND ABS((cp.contract_expires::DATE - ar.contract_expires_date::DATE)::NUMERIC / 30.44) BETWEEN 1.01 AND 2) THEN COALESCE((weights->>'contractTimingGood')::INTEGER, 25) ELSE 0 END +
        CASE WHEN csa.expiring_in_position = csa.position_count THEN COALESCE((weights->>'squadTurnoverUrgency')::INTEGER, 30) + 10 WHEN (csa.expiring_in_position::NUMERIC / NULLIF(csa.position_count, 0)::NUMERIC) >= 0.66 THEN COALESCE((weights->>'squadTurnoverUrgency')::INTEGER, 30) WHEN (csa.expiring_in_position::NUMERIC / NULLIF(csa.position_count, 0)::NUMERIC) >= 0.50 THEN COALESCE((weights->>'squadTurnoverUrgency')::INTEGER, 30) - 15 ELSE 0 END +
        CASE WHEN csa.expiring_in_position >= 5 THEN COALESCE((weights->>'multipleOpenings')::INTEGER, 20) + 5 WHEN csa.expiring_in_position = 4 THEN COALESCE((weights->>'multipleOpenings')::INTEGER, 20) WHEN csa.expiring_in_position = 3 THEN COALESCE((weights->>'multipleOpenings')::INTEGER, 20) - 5 ELSE 0 END +
        CASE WHEN ar.market_value_eur BETWEEN (csa.club_avg_market_value * 0.5) AND (csa.club_avg_market_value * 1.5) THEN COALESCE((weights->>'marketFitPerfect')::INTEGER, 30) ELSE 0 END +
        CASE WHEN ar.nationality ILIKE '%' || csa.country || '%' THEN COALESCE((weights->>'sameCountry')::INTEGER, 20) ELSE 0 END +
        CASE WHEN ar.age BETWEEN 16 AND 19 THEN COALESCE((weights->>'ageVeryYoung')::INTEGER, 30) ELSE 0 END +
        CASE WHEN ar.age BETWEEN 20 AND 22 THEN COALESCE((weights->>'ageYoung')::INTEGER, 20) ELSE 0 END +
        CASE WHEN ar.age BETWEEN 23 AND 28 THEN COALESCE((weights->>'agePrime')::INTEGER, 10) ELSE 0 END +
        CASE WHEN csa.avg_age_in_position IS NOT NULL AND ar.age BETWEEN (csa.avg_age_in_position - 3) AND (csa.avg_age_in_position + 3) THEN COALESCE((weights->>'ageFitsSquad')::INTEGER, 15) ELSE 0 END +
        CASE WHEN (ar.contract_expires_date::DATE - NOW()::DATE)::NUMERIC / 30.44 <= 3 THEN COALESCE((weights->>'imminentFree')::INTEGER, 25) ELSE 0 END +
        CASE WHEN ar.availability_pct >= 75 THEN COALESCE((weights->>'injuryReliability')::INTEGER, 25) ELSE 0 END +
        CASE WHEN ar.tm_games_started > 0 AND (ar.tm_minutes::NUMERIC / (ar.tm_games_started * 90)) < 0.5 THEN COALESCE((weights->>'lowPlayingTime')::INTEGER, 15) ELSE 0 END +
        CASE WHEN (ar.tm_goals + ar.tm_assists) >= 5 THEN COALESCE((weights->>'recentForm')::INTEGER, 15) ELSE 0 END +
        CASE WHEN ar.positions_count >= 3 THEN COALESCE((weights->>'versatility')::INTEGER, 20) ELSE 0 END +
        CASE WHEN ar.tm_reds >= 2 THEN -COALESCE((weights->>'disciplinePenalty')::INTEGER, 20) ELSE 0 END +
        CASE WHEN ar.sofascore_rating >= 7.0 THEN COALESCE((weights->>'sofascoreRating')::INTEGER, 25) ELSE 0 END +
        CASE WHEN ar.sofascore_rating >= 7.5 THEN COALESCE((weights->>'topPercentile')::INTEGER, 20) ELSE 0 END +
        CASE WHEN ar.sf_minutes > 0 AND ((ar.sf_goals + ar.sf_assists)::NUMERIC / (ar.sf_minutes / 90.0)) >= 0.4 THEN COALESCE((weights->>'goalContributions')::INTEGER, 20) ELSE 0 END +
        CASE WHEN ar.sf_duel_pct >= 55 THEN COALESCE((weights->>'duelDominance')::INTEGER, 15) ELSE 0 END +
        CASE WHEN ar.sf_pass_accuracy >= 80 THEN COALESCE((weights->>'passingQuality')::INTEGER, 15) ELSE 0 END
      )::INTEGER as match_score,
      jsonb_build_object(
        'same_league', (ar.league_id = csa.league_id),
        'same_country', (ar.nationality ILIKE '%' || csa.country || '%'),
        'position_match', true,
        'position_count', csa.position_count,
        'expiring_contracts_in_position', csa.expiring_in_position,
        'expiring_players', COALESCE(csa.expiring_players, '[]'::jsonb)
      ) as match_reasons
    FROM agent_roster ar
    CROSS JOIN club_squad_analysis csa
    WHERE ar.current_club_id != csa.club_id
      AND ar.main_position = csa.main_position
      AND (ar.league_id = csa.league_id OR (csa.league_avg_market_value > ar.current_league_market_value * 1.2 AND csa.country = ar.current_country AND ar.current_tier <= csa.tier + 1))
      AND CASE WHEN ar.market_value_eur = 0 THEN csa.club_avg_market_value <= 50000 WHEN ar.market_value_eur <= 150000 THEN ar.market_value_eur <= (csa.club_avg_market_value * 3) AND csa.club_avg_market_value >= (ar.market_value_eur * 0.2) ELSE FALSE END
      AND EXISTS (SELECT 1 FROM players_transfermarkt cp WHERE cp.club_id = csa.club_id AND cp.main_position = ar.main_position AND cp.contract_expires IS NOT NULL AND ABS((cp.contract_expires::DATE - ar.contract_expires_date::DATE)::NUMERIC / 30.44) <= 2)
      AND (NOT COALESCE((hard_filters->>'requireEuPassport')::BOOLEAN, false) OR ar.is_eu_passport = true)
      AND ar.availability_pct >= COALESCE((hard_filters->>'minAvailabilityPct')::INTEGER, 50)
      AND ar.sofascore_rating >= COALESCE((hard_filters->>'minSofascoreRating')::NUMERIC, 0)
  )
  SELECT * FROM recommendations
  WHERE recommendations.match_score >= 80
  ORDER BY recommendations.match_score DESC, recommendations.player_market_value DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_smart_recommendations_v2(UUID, JSONB) TO authenticated;

SELECT 'get_smart_recommendations_v2 updated with sofascore_id' as status;

-- 5. Update get_smart_recommendations_nordic
DROP FUNCTION IF EXISTS get_smart_recommendations_nordic(UUID);

CREATE OR REPLACE FUNCTION get_smart_recommendations_nordic(p_agent_id UUID)
RETURNS TABLE (
  recommendation_id TEXT,
  player_id BIGINT,
  player_name TEXT,
  player_age INTEGER,
  player_position TEXT,
  player_nationality TEXT,
  player_contract_expires TEXT,
  player_market_value INTEGER,
  player_picture_url TEXT,
  player_sofascore_id BIGINT,
  player_transfermarkt_url TEXT,
  club_id BIGINT,
  club_name TEXT,
  club_logo_url TEXT,
  club_transfermarkt_url TEXT,
  club_country TEXT,
  club_avg_market_value INTEGER,
  league_name TEXT,
  league_tier INTEGER,
  league_avg_market_value INTEGER,
  match_score INTEGER,
  match_reasons JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM get_smart_recommendations_v2(p_agent_id, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'get_smart_recommendations_nordic updated with sofascore_id' as status;

SELECT 'ALL FUNCTIONS UPDATED WITH sofascore_id - DONE!' as status;
