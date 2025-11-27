-- =====================================================
-- Customizable Recommendation Algorithm v2
-- =====================================================
-- THE killer feature: Each agent can customize weights
-- Based on 50+ agent interviews (Aleksi, Karol, Jerome, Oliver)
-- 22 adjustable weights + 3 hard filters = 25 options
-- =====================================================

-- =====================================================
-- PHASE 1: Create agent_algorithm_weights table
-- =====================================================

CREATE TABLE IF NOT EXISTS agent_algorithm_weights (
  agent_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  preset_name TEXT DEFAULT 'balanced',
  weights JSONB NOT NULL DEFAULT '{
    "sameLeague": 30,
    "contractTimingPerfect": 40,
    "contractTimingGood": 25,
    "imminentFree": 25,
    "squadTurnoverUrgency": 30,
    "multipleOpenings": 20,
    "marketFitPerfect": 30,
    "sameCountry": 20,
    "ageVeryYoung": 30,
    "ageYoung": 20,
    "agePrime": 10,
    "ageFitsSquad": 15,
    "injuryReliability": 25,
    "lowPlayingTime": 15,
    "recentForm": 15,
    "versatility": 20,
    "disciplinePenalty": 20,
    "sofascoreRating": 25,
    "topPercentile": 20,
    "goalContributions": 20,
    "duelDominance": 15,
    "passingQuality": 15
  }'::jsonb,
  hard_filters JSONB NOT NULL DEFAULT '{
    "requireEuPassport": false,
    "minAvailabilityPct": 50,
    "minSofascoreRating": 0
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE agent_algorithm_weights ENABLE ROW LEVEL SECURITY;

-- Agents can only access their own weights
CREATE POLICY "Agents can view own weights" ON agent_algorithm_weights
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Agents can insert own weights" ON agent_algorithm_weights
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents can update own weights" ON agent_algorithm_weights
  FOR UPDATE USING (auth.uid() = agent_id);

SELECT '1/3 agent_algorithm_weights table created' as status;

-- =====================================================
-- PHASE 2: Main Recommendation Function v2
-- =====================================================

DROP FUNCTION IF EXISTS get_smart_recommendations_v2(UUID, JSONB);

CREATE OR REPLACE FUNCTION get_smart_recommendations_v2(
  p_agent_id UUID,
  p_temp_weights JSONB DEFAULT NULL  -- For live preview (optional)
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
    -- Use saved hard_filters if available, else defaults
    SELECT COALESCE(aaw.hard_filters, '{
      "requireEuPassport": false,
      "minAvailabilityPct": 50,
      "minSofascoreRating": 0
    }'::jsonb)
    INTO hard_filters
    FROM agent_algorithm_weights aaw
    WHERE aaw.agent_id = p_agent_id;

    IF hard_filters IS NULL THEN
      hard_filters := '{"requireEuPassport": false, "minAvailabilityPct": 50, "minSofascoreRating": 0}'::jsonb;
    END IF;
  ELSE
    -- Load from saved preferences
    SELECT
      COALESCE(aaw.weights, '{
        "sameLeague": 30,
        "contractTimingPerfect": 40,
        "contractTimingGood": 25,
        "imminentFree": 25,
        "squadTurnoverUrgency": 30,
        "multipleOpenings": 20,
        "marketFitPerfect": 30,
        "sameCountry": 20,
        "ageVeryYoung": 30,
        "ageYoung": 20,
        "agePrime": 10,
        "ageFitsSquad": 15,
        "injuryReliability": 25,
        "lowPlayingTime": 15,
        "recentForm": 15,
        "versatility": 20,
        "disciplinePenalty": 20,
        "sofascoreRating": 25,
        "topPercentile": 20,
        "goalContributions": 20,
        "duelDominance": 15,
        "passingQuality": 15
      }'::jsonb),
      COALESCE(aaw.hard_filters, '{
        "requireEuPassport": false,
        "minAvailabilityPct": 50,
        "minSofascoreRating": 0
      }'::jsonb)
    INTO weights, hard_filters
    FROM agent_algorithm_weights aaw
    WHERE aaw.agent_id = p_agent_id;

    -- Default weights if no saved preferences
    IF weights IS NULL THEN
      weights := '{
        "sameLeague": 30,
        "contractTimingPerfect": 40,
        "contractTimingGood": 25,
        "imminentFree": 25,
        "squadTurnoverUrgency": 30,
        "multipleOpenings": 20,
        "marketFitPerfect": 30,
        "sameCountry": 20,
        "ageVeryYoung": 30,
        "ageYoung": 20,
        "agePrime": 10,
        "ageFitsSquad": 15,
        "injuryReliability": 25,
        "lowPlayingTime": 15,
        "recentForm": 15,
        "versatility": 20,
        "disciplinePenalty": 20,
        "sofascoreRating": 25,
        "topPercentile": 20,
        "goalContributions": 20,
        "duelDominance": 15,
        "passingQuality": 15
      }'::jsonb;
    END IF;

    IF hard_filters IS NULL THEN
      hard_filters := '{"requireEuPassport": false, "minAvailabilityPct": 50, "minSofascoreRating": 0}'::jsonb;
    END IF;
  END IF;

  RETURN QUERY
  WITH agent_roster AS (
    -- Get agent's roster with overrides applied + performance data
    SELECT
      ar.player_id,
      p.name,
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
      -- EU passport check (nationality contains EU country)
      CASE WHEN p.nationality ~* 'Germany|France|Spain|Italy|Netherlands|Belgium|Portugal|Poland|Sweden|Austria|Denmark|Finland|Ireland|Greece|Czech|Hungary|Romania|Bulgaria|Croatia|Slovakia|Slovenia|Lithuania|Latvia|Estonia|Luxembourg|Malta|Cyprus'
        THEN true ELSE false
      END as is_eu_passport,
      -- sf_data performance metrics
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'rating')::NUMERIC, 0) as sofascore_rating,
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'goals')::INTEGER, 0) as sf_goals,
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'assists')::INTEGER, 0) as sf_assists,
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'appearances')::INTEGER, 1) as sf_appearances,
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'minutesPlayed')::INTEGER, 0) as sf_minutes,
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'accuratePassesPercentage')::NUMERIC, 0) as sf_pass_accuracy,
      COALESCE((p.sf_data->'seasons'->0->'statistics'->>'totalDuelsWonPercentage')::NUMERIC, 0) as sf_duel_pct,
      -- tm_data performance metrics
      COALESCE((p.tm_data->'performance'->>'games_played')::INTEGER, 0) as tm_games,
      COALESCE((p.tm_data->'performance'->>'games_started')::INTEGER, 0) as tm_games_started,
      COALESCE((p.tm_data->'performance'->>'goals')::INTEGER, 0) as tm_goals,
      COALESCE((p.tm_data->'performance'->>'assists')::INTEGER, 0) as tm_assists,
      COALESCE((p.tm_data->'performance'->>'yellow_cards')::INTEGER, 0) as tm_yellows,
      COALESCE((p.tm_data->'performance'->>'red_cards')::INTEGER, 0) as tm_reds,
      COALESCE((p.tm_data->'performance'->>'minutes_played')::INTEGER, 0) as tm_minutes,
      -- Calculate availability % (games played / max possible games in season ~34)
      CASE
        WHEN COALESCE((p.tm_data->'performance'->>'games_played')::INTEGER, 0) > 0
        THEN LEAST(100, ROUND((COALESCE((p.tm_data->'performance'->>'games_played')::INTEGER, 0)::NUMERIC / 34.0) * 100))
        ELSE 100  -- Default to 100% if no data
      END as availability_pct,
      -- Count positions played (from tm_data)
      COALESCE(jsonb_array_length(p.tm_data->'positions'), 1) as positions_count
    FROM agent_rosters ar
    JOIN players_transfermarkt p ON ar.player_id = p.id
    LEFT JOIN agent_player_overrides apo ON apo.agent_id = ar.agent_id AND apo.player_id = p.id
    LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
    LEFT JOIN leagues_transfermarkt cl ON c.league_id = cl.id
    WHERE ar.agent_id = p_agent_id
      -- Contract must expire within 6 months
      AND COALESCE(apo.contract_expires_override, p.contract_expires) IS NOT NULL
      AND COALESCE(apo.contract_expires_override, p.contract_expires)::DATE <= (NOW() + INTERVAL '6 months')::DATE
      AND COALESCE(apo.contract_expires_override, p.contract_expires)::DATE >= NOW()::DATE
      -- Market value filter (Fortis Nova range)
      AND COALESCE(apo.market_value_override, p.market_value_eur, 0) <= 150000
  ),

  club_squad_analysis AS (
    -- Analyze each favorite club's squad by position
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
      -- Count expiring contracts
      COUNT(CASE
        WHEN p.contract_expires IS NOT NULL
        AND p.contract_expires::DATE <= (NOW() + INTERVAL '6 months')::DATE
        THEN 1
      END) as expiring_in_position,
      -- Get expiring players details
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'name', p.name,
          'age', p.age,
          'contract_expires', p.contract_expires::TEXT,
          'market_value', p.market_value_eur,
          'months_diff', ROUND((p.contract_expires::DATE - NOW()::DATE)::NUMERIC / 30.44)
        )
        ORDER BY jsonb_build_object(
          'name', p.name,
          'age', p.age,
          'contract_expires', p.contract_expires::TEXT,
          'market_value', p.market_value_eur,
          'months_diff', ROUND((p.contract_expires::DATE - NOW()::DATE)::NUMERIC / 30.44)
        )
      ) FILTER (
        WHERE p.contract_expires IS NOT NULL
        AND p.contract_expires::DATE <= (NOW() + INTERVAL '6 months')::DATE
      ) as expiring_players
    FROM agent_favorite_clubs afc
    JOIN clubs_transfermarkt c ON afc.club_id = c.id
    LEFT JOIN leagues_transfermarkt l ON c.league_id = l.id
    LEFT JOIN players_transfermarkt p ON p.club_id = c.id
    WHERE afc.agent_id = p_agent_id
    GROUP BY afc.club_id, c.name, c.logo_url, c.transfermarkt_url, c.country, c.league_id,
             l.name, l.tier, l.avg_market_value_eur, c.avg_market_value_eur, p.main_position
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

      -- =====================================================
      -- MATCH SCORE - DYNAMIC WEIGHTS
      -- =====================================================
      (
        -- SAME LEAGUE
        CASE WHEN ar.league_id = csa.league_id
          THEN COALESCE((weights->>'sameLeague')::INTEGER, 30) ELSE 0 END +

        -- PERFECT CONTRACT TIMING - Within +/-1 month
        CASE
          WHEN EXISTS (
            SELECT 1 FROM players_transfermarkt cp
            WHERE cp.club_id = csa.club_id
              AND cp.main_position = ar.main_position
              AND cp.contract_expires IS NOT NULL
              AND ABS((cp.contract_expires::DATE - ar.contract_expires_date::DATE)::NUMERIC / 30.44) <= 1
          ) THEN COALESCE((weights->>'contractTimingPerfect')::INTEGER, 40)
          ELSE 0
        END +

        -- GOOD CONTRACT TIMING - Within +/-2 months
        CASE
          WHEN EXISTS (
            SELECT 1 FROM players_transfermarkt cp
            WHERE cp.club_id = csa.club_id
              AND cp.main_position = ar.main_position
              AND cp.contract_expires IS NOT NULL
              AND ABS((cp.contract_expires::DATE - ar.contract_expires_date::DATE)::NUMERIC / 30.44) BETWEEN 1.01 AND 2
          ) THEN COALESCE((weights->>'contractTimingGood')::INTEGER, 25)
          ELSE 0
        END +

        -- SQUAD TURNOVER URGENCY
        CASE
          WHEN csa.expiring_in_position = csa.position_count
            THEN COALESCE((weights->>'squadTurnoverUrgency')::INTEGER, 30) + 10
          WHEN (csa.expiring_in_position::NUMERIC / NULLIF(csa.position_count, 0)::NUMERIC) >= 0.66
            THEN COALESCE((weights->>'squadTurnoverUrgency')::INTEGER, 30)
          WHEN (csa.expiring_in_position::NUMERIC / NULLIF(csa.position_count, 0)::NUMERIC) >= 0.50
            THEN COALESCE((weights->>'squadTurnoverUrgency')::INTEGER, 30) - 15
          ELSE 0
        END +

        -- MULTIPLE OPENINGS
        CASE
          WHEN csa.expiring_in_position >= 5
            THEN COALESCE((weights->>'multipleOpenings')::INTEGER, 20) + 5
          WHEN csa.expiring_in_position = 4
            THEN COALESCE((weights->>'multipleOpenings')::INTEGER, 20)
          WHEN csa.expiring_in_position = 3
            THEN COALESCE((weights->>'multipleOpenings')::INTEGER, 20) - 5
          ELSE 0
        END +

        -- PERFECT MARKET FIT - Player value 0.5x-1.5x club average
        CASE
          WHEN ar.market_value_eur BETWEEN (csa.club_avg_market_value * 0.5) AND (csa.club_avg_market_value * 1.5)
          THEN COALESCE((weights->>'marketFitPerfect')::INTEGER, 30)
          ELSE 0
        END +

        -- SAME COUNTRY
        CASE WHEN ar.nationality ILIKE '%' || csa.country || '%'
          THEN COALESCE((weights->>'sameCountry')::INTEGER, 20) ELSE 0 END +

        -- AGE: VERY YOUNG (16-19) - Highest bonus for resale value
        CASE WHEN ar.age BETWEEN 16 AND 19
          THEN COALESCE((weights->>'ageVeryYoung')::INTEGER, 30) ELSE 0 END +

        -- AGE: YOUNG (20-22) - Good development upside
        CASE WHEN ar.age BETWEEN 20 AND 22
          THEN COALESCE((weights->>'ageYoung')::INTEGER, 20) ELSE 0 END +

        -- AGE: PRIME (23-28) - Proven but less upside
        CASE WHEN ar.age BETWEEN 23 AND 28
          THEN COALESCE((weights->>'agePrime')::INTEGER, 10) ELSE 0 END +

        -- AGE FITS SQUAD - Within +/-3 years of position average
        CASE
          WHEN csa.avg_age_in_position IS NOT NULL
          AND ar.age BETWEEN (csa.avg_age_in_position - 3) AND (csa.avg_age_in_position + 3)
          THEN COALESCE((weights->>'ageFitsSquad')::INTEGER, 15)
          ELSE 0
        END +

        -- IMMINENT FREE AGENT - Contract expires <= 3 months
        CASE
          WHEN (ar.contract_expires_date::DATE - NOW()::DATE)::NUMERIC / 30.44 <= 3
          THEN COALESCE((weights->>'imminentFree')::INTEGER, 25)
          ELSE 0
        END +

        -- =====================================================
        -- NEW: PERFORMANCE METRICS FROM tm_data
        -- =====================================================

        -- INJURY RELIABILITY - High availability %
        CASE WHEN ar.availability_pct >= 75
          THEN COALESCE((weights->>'injuryReliability')::INTEGER, 25) ELSE 0 END +

        -- LOW PLAYING TIME - Bench warmers seeking opportunities
        CASE WHEN ar.tm_games_started > 0
          AND (ar.tm_minutes::NUMERIC / (ar.tm_games_started * 90)) < 0.5
          THEN COALESCE((weights->>'lowPlayingTime')::INTEGER, 15) ELSE 0 END +

        -- RECENT FORM - Goal contributions
        CASE WHEN (ar.tm_goals + ar.tm_assists) >= 5
          THEN COALESCE((weights->>'recentForm')::INTEGER, 15) ELSE 0 END +

        -- VERSATILITY - 3+ positions played
        CASE WHEN ar.positions_count >= 3
          THEN COALESCE((weights->>'versatility')::INTEGER, 20) ELSE 0 END +

        -- DISCIPLINE PENALTY - 2+ red cards
        CASE WHEN ar.tm_reds >= 2
          THEN -COALESCE((weights->>'disciplinePenalty')::INTEGER, 20) ELSE 0 END +

        -- =====================================================
        -- NEW: PERFORMANCE METRICS FROM sf_data (SofaScore)
        -- =====================================================

        -- HIGH SOFASCORE RATING - >= 7.0
        CASE WHEN ar.sofascore_rating >= 7.0
          THEN COALESCE((weights->>'sofascoreRating')::INTEGER, 25) ELSE 0 END +

        -- TOP PERCENTILE - Rating >= 7.5 (top performers)
        CASE WHEN ar.sofascore_rating >= 7.5
          THEN COALESCE((weights->>'topPercentile')::INTEGER, 20) ELSE 0 END +

        -- GOAL CONTRIBUTIONS PER 90 - Efficiency metric
        CASE
          WHEN ar.sf_minutes > 0
          AND ((ar.sf_goals + ar.sf_assists)::NUMERIC / (ar.sf_minutes / 90.0)) >= 0.4
          THEN COALESCE((weights->>'goalContributions')::INTEGER, 20) ELSE 0 END +

        -- DUEL DOMINANCE - >= 55% duels won
        CASE WHEN ar.sf_duel_pct >= 55
          THEN COALESCE((weights->>'duelDominance')::INTEGER, 15) ELSE 0 END +

        -- PASSING QUALITY - >= 80% pass accuracy
        CASE WHEN ar.sf_pass_accuracy >= 80
          THEN COALESCE((weights->>'passingQuality')::INTEGER, 15) ELSE 0 END

      )::INTEGER as match_score,

      -- =====================================================
      -- MATCH REASONS (Detailed Breakdown)
      -- =====================================================
      jsonb_build_object(
        'same_league', (ar.league_id = csa.league_id),
        'same_country', (ar.nationality ILIKE '%' || csa.country || '%'),
        'position_match', true,
        'position_count', csa.position_count,
        'expiring_contracts_in_position', csa.expiring_in_position,
        'turnover_percentage', ROUND((csa.expiring_in_position::NUMERIC / NULLIF(csa.position_count, 0)::NUMERIC) * 100),
        'urgency_total_replacement', (csa.expiring_in_position = csa.position_count),
        'urgency_most_leaving', ((csa.expiring_in_position::NUMERIC / NULLIF(csa.position_count, 0)::NUMERIC) >= 0.66 AND csa.expiring_in_position != csa.position_count),
        'urgency_half_leaving', ((csa.expiring_in_position::NUMERIC / NULLIF(csa.position_count, 0)::NUMERIC) >= 0.50 AND (csa.expiring_in_position::NUMERIC / NULLIF(csa.position_count, 0)::NUMERIC) < 0.66),
        'multiple_openings_massive', (csa.expiring_in_position >= 5),
        'multiple_openings_great', (csa.expiring_in_position = 4),
        'multiple_openings_good', (csa.expiring_in_position = 3),
        'expiring_players', COALESCE(csa.expiring_players, '[]'::jsonb),
        'contract_timing_perfect', EXISTS (
          SELECT 1 FROM players_transfermarkt cp
          WHERE cp.club_id = csa.club_id
            AND cp.main_position = ar.main_position
            AND cp.contract_expires IS NOT NULL
            AND ABS((cp.contract_expires::DATE - ar.contract_expires_date::DATE)::NUMERIC / 30.44) <= 1
        ),
        'contract_timing_good', EXISTS (
          SELECT 1 FROM players_transfermarkt cp
          WHERE cp.club_id = csa.club_id
            AND cp.main_position = ar.main_position
            AND cp.contract_expires IS NOT NULL
            AND ABS((cp.contract_expires::DATE - ar.contract_expires_date::DATE)::NUMERIC / 30.44) BETWEEN 1.01 AND 2
        ),
        'market_fit_perfect', (
          ar.market_value_eur BETWEEN (csa.club_avg_market_value * 0.5) AND (csa.club_avg_market_value * 1.5)
        ),
        'age_very_young', (ar.age BETWEEN 16 AND 19),
        'age_young', (ar.age BETWEEN 20 AND 22),
        'age_prime', (ar.age BETWEEN 23 AND 28),
        'age_fits_profile', (
          csa.avg_age_in_position IS NOT NULL
          AND ar.age BETWEEN (csa.avg_age_in_position - 3) AND (csa.avg_age_in_position + 3)
        ),
        'squad_avg_age_in_position', csa.avg_age_in_position,
        'imminent_free', (
          (ar.contract_expires_date::DATE - NOW()::DATE)::NUMERIC / 30.44 <= 3
        ),
        'club_avg_market_value', csa.club_avg_market_value,
        'league_avg_market_value', csa.league_avg_market_value,
        'player_current_league_value', ar.current_league_market_value,
        -- Performance data
        'injury_reliability', (ar.availability_pct >= 75),
        'availability_pct', ar.availability_pct,
        'low_playing_time', (ar.tm_games_started > 0 AND (ar.tm_minutes::NUMERIC / (ar.tm_games_started * 90)) < 0.5),
        'recent_form', ((ar.tm_goals + ar.tm_assists) >= 5),
        'versatility', (ar.positions_count >= 3),
        'positions_count', ar.positions_count,
        'discipline_issue', (ar.tm_reds >= 2),
        'red_cards', ar.tm_reds,
        'sofascore_rating', ar.sofascore_rating,
        'high_rating', (ar.sofascore_rating >= 7.0),
        'top_percentile', (ar.sofascore_rating >= 7.5),
        'goal_contributions', ar.sf_goals + ar.sf_assists,
        'duel_dominance', (ar.sf_duel_pct >= 55),
        'duel_pct', ar.sf_duel_pct,
        'passing_quality', (ar.sf_pass_accuracy >= 80),
        'pass_accuracy', ar.sf_pass_accuracy,
        'is_eu_passport', ar.is_eu_passport,
        'details', jsonb_build_object(
          'player_contract_expires', ar.contract_expires,
          'months_until_free', ROUND((ar.contract_expires_date::DATE - NOW()::DATE)::NUMERIC / 30.44)
        )
      ) as match_reasons
    FROM agent_roster ar
    CROSS JOIN club_squad_analysis csa
    WHERE
      -- =====================================================
      -- HARD FILTERS
      -- =====================================================

      -- Not moving to current club
      ar.current_club_id != csa.club_id

      -- Exact position match
      AND ar.main_position = csa.main_position

      -- League compatibility (same league OR realistic step up)
      AND (
        ar.league_id = csa.league_id
        OR (
          csa.league_avg_market_value > ar.current_league_market_value * 1.2
          AND csa.country = ar.current_country
          AND ar.current_tier <= csa.tier + 1
        )
      )

      -- Market value compatibility
      AND CASE
        WHEN ar.market_value_eur = 0 THEN
          csa.club_avg_market_value <= 50000
        WHEN ar.market_value_eur <= 150000 THEN
          ar.market_value_eur <= (csa.club_avg_market_value * 3)
          AND csa.club_avg_market_value >= (ar.market_value_eur * 0.2)
        ELSE FALSE
      END

      -- Contract timing match
      AND EXISTS (
        SELECT 1 FROM players_transfermarkt cp
        WHERE cp.club_id = csa.club_id
          AND cp.main_position = ar.main_position
          AND cp.contract_expires IS NOT NULL
          AND ABS((cp.contract_expires::DATE - ar.contract_expires_date::DATE)::NUMERIC / 30.44) <= 2
      )

      -- =====================================================
      -- DYNAMIC HARD FILTERS (from agent preferences)
      -- =====================================================

      -- EU Passport filter
      AND (
        NOT COALESCE((hard_filters->>'requireEuPassport')::BOOLEAN, false)
        OR ar.is_eu_passport = true
      )

      -- Minimum availability filter
      AND ar.availability_pct >= COALESCE((hard_filters->>'minAvailabilityPct')::INTEGER, 50)

      -- Minimum SofaScore rating filter
      AND ar.sofascore_rating >= COALESCE((hard_filters->>'minSofascoreRating')::NUMERIC, 0)
  )
  SELECT * FROM recommendations
  WHERE recommendations.match_score >= 80
  ORDER BY recommendations.match_score DESC, recommendations.player_market_value DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_smart_recommendations_v2(UUID, JSONB) TO authenticated;

SELECT '2/3 get_smart_recommendations_v2 function created' as status;

-- =====================================================
-- PHASE 3: Paginated version for v2
-- =====================================================

DROP FUNCTION IF EXISTS get_smart_recommendations_v2_paginated(UUID, INTEGER, INTEGER, JSONB);

CREATE OR REPLACE FUNCTION get_smart_recommendations_v2_paginated(
  p_agent_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
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
  SELECT * FROM get_smart_recommendations_v2(p_agent_id, p_temp_weights)
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_smart_recommendations_v2_paginated(UUID, INTEGER, INTEGER, JSONB) TO authenticated;

SELECT '3/3 Paginated version created - DONE!' as status;
