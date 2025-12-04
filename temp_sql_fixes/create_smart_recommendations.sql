-- =====================================================
-- Smart Player Recommendations - Killer Algorithm
-- =====================================================
-- Matches players with club needs based on realistic criteria:
-- 1. Same league/country/tier (realistic moves)
-- 2. Contract expiring within 6 months (free transfer available)
-- 3. Exact position match
-- 4. Club has real need (gap OR expiring contracts in position)
-- 5. Age fits squad profile (+/- 5 years)
-- 6. Bonus points for same nationality
-- =====================================================

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
  player_transfermarkt_url TEXT,
  club_id BIGINT,
  club_name TEXT,
  club_logo_url TEXT,
  club_transfermarkt_url TEXT,
  league_name TEXT,
  league_tier INTEGER,
  match_score INTEGER,
  match_reasons JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH agent_roster AS (
    -- Get agent's roster players
    SELECT
      ar.player_id,
      p.name,
      p.age,
      p.main_position,
      p.nationality,
      p.contract_expires::TEXT as contract_expires,
      p.contract_expires::DATE as contract_expires_date,
      p.market_value_eur,
      p.picture_url,
      p.transfermarkt_url,
      p.club_id as current_club_id,
      c.league_id,
      l.tier as current_tier,
      l.country as current_country
    FROM agent_rosters ar
    JOIN players_transfermarkt p ON ar.player_id = p.id
    LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
    LEFT JOIN leagues_transfermarkt l ON c.league_id = l.id
    WHERE ar.agent_id = p_agent_id
      AND p.contract_expires IS NOT NULL
      AND p.contract_expires::DATE <= (NOW() + INTERVAL '6 months')::DATE
      AND p.contract_expires::DATE >= NOW()::DATE
  ),
  club_squad_analysis AS (
    -- Analyze each favorite club's squad by position
    SELECT
      afc.club_id,
      c.name as club_name,
      c.logo_url as club_logo_url,
      c.transfermarkt_url as club_transfermarkt_url,
      c.league_id,
      l.name as league_name,
      l.tier,
      l.country,
      p.main_position,
      COUNT(p.id) as position_count,
      ROUND(AVG(p.age), 1) as avg_age_in_position,
      COUNT(CASE
        WHEN p.contract_expires IS NOT NULL
        AND p.contract_expires::DATE <= (NOW() + INTERVAL '6 months')::DATE
        THEN 1
      END) as expiring_in_position,
      -- Get details of players with expiring contracts in this position
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'name', p.name,
          'age', p.age,
          'contract_expires', p.contract_expires::TEXT,
          'market_value', p.market_value_eur
        )
        ORDER BY jsonb_build_object(
          'name', p.name,
          'age', p.age,
          'contract_expires', p.contract_expires::TEXT,
          'market_value', p.market_value_eur
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
    GROUP BY afc.club_id, c.name, c.logo_url, c.transfermarkt_url, c.league_id, l.name, l.tier, l.country, p.main_position
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
      csa.league_name::TEXT,
      csa.tier::INTEGER as league_tier,
      -- MATCH SCORE CALCULATION
      (
        -- Base score for having a need (30 points)
        CASE WHEN (csa.position_count <= 2 OR csa.expiring_in_position >= 1) THEN 30 ELSE 0 END +

        -- Same nationality (25 points)
        CASE WHEN ar.nationality = csa.country THEN 25 ELSE 0 END +

        -- Urgent need - position has expiring contracts (20 points)
        CASE WHEN csa.expiring_in_position >= 1 THEN 20 ELSE 0 END +

        -- Age fits squad profile +/- 5 years (15 points)
        CASE
          WHEN csa.avg_age_in_position IS NOT NULL
          AND ar.age BETWEEN (csa.avg_age_in_position - 5) AND (csa.avg_age_in_position + 5)
          THEN 15
          ELSE 0
        END +

        -- Critical shortage - only 1 player in position (10 points)
        CASE WHEN csa.position_count = 1 THEN 10 ELSE 0 END
      )::INTEGER as match_score,

      -- MATCH REASONS (detailed explanation)
      jsonb_build_object(
        'same_league', true,
        'same_tier', true,
        'same_country', true,
        'exact_position', true,
        'contract_expiring_soon', true,
        'has_squad_need', (csa.position_count <= 2 OR csa.expiring_in_position >= 1),
        'same_nationality', (ar.nationality = csa.country),
        'age_fits_profile', (
          csa.avg_age_in_position IS NOT NULL
          AND ar.age BETWEEN (csa.avg_age_in_position - 5) AND (csa.avg_age_in_position + 5)
        ),
        'position_shortage', csa.position_count,
        'expiring_contracts_in_position', csa.expiring_in_position,
        'squad_avg_age_in_position', csa.avg_age_in_position,
        'expiring_players', COALESCE(csa.expiring_players, '[]'::jsonb),
        'details', jsonb_build_object(
          'player_contract_expires', ar.contract_expires,
          'months_until_free', EXTRACT(MONTH FROM AGE(ar.contract_expires_date, NOW()::DATE))
        )
      ) as match_reasons
    FROM agent_roster ar
    CROSS JOIN club_squad_analysis csa
    WHERE
      -- STRICT CRITERIA:
      -- 1. Same league (realistic move)
      ar.league_id = csa.league_id

      -- 2. Same tier (level appropriate)
      AND ar.current_tier = csa.tier

      -- 3. Same country (domestic move)
      AND ar.current_country = csa.country

      -- 4. Exact position match
      AND ar.main_position = csa.main_position

      -- 5. Not moving to current club
      AND ar.current_club_id != csa.club_id

      -- 6. Club has a real need (low count OR expiring contracts in position)
      AND (csa.position_count <= 2 OR csa.expiring_in_position >= 1)
  )
  SELECT * FROM recommendations
  WHERE recommendations.match_score >= 30  -- Only show high-quality matches
  ORDER BY recommendations.match_score DESC, recommendations.player_market_value DESC
  LIMIT 50;  -- Cap at 50 best recommendations
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_smart_recommendations(UUID) TO authenticated;

SELECT '✅ Smart recommendations algorithm created!' as status;
