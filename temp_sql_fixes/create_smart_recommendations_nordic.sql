-- =====================================================
-- Smart Player Recommendations - Nordic Edition
-- =====================================================
-- Built for Fortis Nova Agency:
-- - Focus: Nordic region (FIN, NOR, SWE top 2 leagues)
-- - Players: €0-€150k range (avg ~€25k)
-- - Killer Feature: Perfect contract timing matches
-- - Smart Logic: Uses league market value instead of tier
-- - Transparency: Full point breakdown
-- =====================================================

-- First, create Nordic neighbor mapping table
CREATE TABLE IF NOT EXISTS nordic_neighbors (
  country TEXT PRIMARY KEY,
  neighbors TEXT[]
);

-- Populate neighbor relationships
TRUNCATE nordic_neighbors;
INSERT INTO nordic_neighbors VALUES
  ('Finland', ARRAY['Sweden', 'Estonia', 'Norway']),
  ('Sweden', ARRAY['Finland', 'Norway', 'Denmark']),
  ('Norway', ARRAY['Sweden', 'Denmark', 'Finland']),
  ('Estonia', ARRAY['Finland', 'Latvia']),
  ('Denmark', ARRAY['Sweden', 'Norway', 'Germany']);

SELECT '✅ Nordic neighbors table created!' as status;

-- =====================================================
-- Main Recommendation Function
-- =====================================================

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
  WITH agent_roster AS (
    -- Get agent's roster with overrides applied
    SELECT
      ar.player_id,
      p.name,
      -- Apply overrides using COALESCE (override takes priority)
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
      cl.tier as current_tier
    FROM agent_rosters ar
    JOIN players_transfermarkt p ON ar.player_id = p.id
    LEFT JOIN agent_player_overrides apo ON apo.agent_id = ar.agent_id AND apo.player_id = p.id
    LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
    LEFT JOIN leagues_transfermarkt cl ON c.league_id = cl.id
    WHERE ar.agent_id = p_agent_id
      -- FILTER 1: Contract must expire within 6 months
      AND COALESCE(apo.contract_expires_override, p.contract_expires) IS NOT NULL
      AND COALESCE(apo.contract_expires_override, p.contract_expires)::DATE <= (NOW() + INTERVAL '6 months')::DATE
      AND COALESCE(apo.contract_expires_override, p.contract_expires)::DATE >= NOW()::DATE
      -- FILTER 2: Market value must be ≤€150k (Fortis Nova range)
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
      -- FILTER 3: Nordic leagues only (top 2 tiers)
      AND c.league_id IN ('FI1', 'FI2', 'NO1', 'NO2', 'SE1', 'SE2')
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
      -- MATCH SCORE CALCULATION
      -- =====================================================
      (
        -- 🏆 SAME LEAGUE (+30 points) - 60% of transfers are same league
        CASE WHEN ar.league_id = csa.league_id THEN 30 ELSE 0 END +

        -- ⏰ PERFECT CONTRACT TIMING (+40 points) - Within ±1 month
        CASE
          WHEN EXISTS (
            SELECT 1 FROM players_transfermarkt cp
            WHERE cp.club_id = csa.club_id
              AND cp.main_position = ar.main_position
              AND cp.contract_expires IS NOT NULL
              AND ABS((cp.contract_expires::DATE - ar.contract_expires_date::DATE)::NUMERIC / 30.44) <= 1
          ) THEN 40
          ELSE 0
        END +

        -- ⏰ GOOD CONTRACT TIMING (+25 points) - Within ±2 months
        CASE
          WHEN EXISTS (
            SELECT 1 FROM players_transfermarkt cp
            WHERE cp.club_id = csa.club_id
              AND cp.main_position = ar.main_position
              AND cp.contract_expires IS NOT NULL
              AND ABS((cp.contract_expires::DATE - ar.contract_expires_date::DATE)::NUMERIC / 30.44) BETWEEN 1.01 AND 2
          ) THEN 25
          ELSE 0
        END +

        -- 🔥 SQUAD TURNOVER URGENCY (Percentage-based)
        CASE
          -- 100% leaving - Total squad replacement needed
          WHEN csa.expiring_in_position = csa.position_count THEN 40
          -- 66-99% leaving - Most of squad leaving
          WHEN (csa.expiring_in_position::NUMERIC / csa.position_count::NUMERIC) >= 0.66 THEN 25
          -- 50-66% leaving - Half squad needs replacement
          WHEN (csa.expiring_in_position::NUMERIC / csa.position_count::NUMERIC) >= 0.50 THEN 15
          -- <50% leaving - Not urgent
          ELSE 0
        END +

        -- 🔄 MULTIPLE OPENINGS (Based on absolute number leaving)
        CASE
          -- 5+ players leaving - massive opportunity
          WHEN csa.expiring_in_position >= 5 THEN 25
          -- 4 players leaving - great opportunity
          WHEN csa.expiring_in_position = 4 THEN 20
          -- 3 players leaving - good opportunity
          WHEN csa.expiring_in_position = 3 THEN 15
          -- 1-2 players leaving - standard
          ELSE 0
        END +

        -- 💰 PERFECT MARKET FIT (+30 points) - Player value 0.5x-1.5x club average
        CASE
          WHEN ar.market_value_eur BETWEEN (csa.club_avg_market_value * 0.5) AND (csa.club_avg_market_value * 1.5)
          THEN 30
          ELSE 0
        END +

        -- 🌍 SAME COUNTRY (+20 points) - Nationality contains club country (handles double nationalities)
        CASE WHEN ar.nationality ILIKE '%' || csa.country || '%' THEN 20 ELSE 0 END +

        -- 🌍 NORDIC NEIGHBOR (+10 points) - Neighboring Nordic country (handles double nationalities)
        CASE
          WHEN EXISTS (
            SELECT 1 FROM nordic_neighbors nn, unnest(nn.neighbors) AS neighbor
            WHERE nn.country = csa.country
              AND ar.nationality ILIKE '%' || neighbor || '%'
          ) THEN 10
          ELSE 0
        END +

        -- 👤 PRIME AGE (+15 points) - Age 23-28
        CASE WHEN ar.age BETWEEN 23 AND 28 THEN 15 ELSE 0 END +

        -- 👤 YOUNG PROSPECT (+10 points) - Age 19-22
        CASE WHEN ar.age BETWEEN 19 AND 22 THEN 10 ELSE 0 END +

        -- 👥 AGE FITS SQUAD PROFILE (+15 points) - Within ±4 years of position average
        CASE
          WHEN csa.avg_age_in_position IS NOT NULL
          AND ar.age BETWEEN (csa.avg_age_in_position - 4) AND (csa.avg_age_in_position + 4)
          THEN 15
          ELSE 0
        END +

        -- 🆓 IMMINENT FREE AGENT (+25 points) - Contract expires ≤3 months
        CASE
          WHEN (ar.contract_expires_date::DATE - NOW()::DATE)::NUMERIC / 30.44 <= 3
          THEN 25
          ELSE 0
        END

      )::INTEGER as match_score,

      -- =====================================================
      -- MATCH REASONS (Detailed Breakdown)
      -- =====================================================
      jsonb_build_object(
        'same_league', (ar.league_id = csa.league_id),
        'same_country', (ar.nationality ILIKE '%' || csa.country || '%'),
        'nordic_neighbor', EXISTS (
          SELECT 1 FROM nordic_neighbors nn, unnest(nn.neighbors) AS neighbor
          WHERE nn.country = csa.country AND ar.nationality ILIKE '%' || neighbor || '%'
        ),
        'position_match', true,
        'position_count', csa.position_count,
        'expiring_contracts_in_position', csa.expiring_in_position,
        'turnover_percentage', ROUND((csa.expiring_in_position::NUMERIC / csa.position_count::NUMERIC) * 100),
        'urgency_total_replacement', (csa.expiring_in_position = csa.position_count),
        'urgency_most_leaving', ((csa.expiring_in_position::NUMERIC / csa.position_count::NUMERIC) >= 0.66 AND csa.expiring_in_position != csa.position_count),
        'urgency_half_leaving', ((csa.expiring_in_position::NUMERIC / csa.position_count::NUMERIC) >= 0.50 AND (csa.expiring_in_position::NUMERIC / csa.position_count::NUMERIC) < 0.66),
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
        'age_prime', (ar.age BETWEEN 23 AND 28),
        'age_prospect', (ar.age BETWEEN 19 AND 22),
        'age_fits_profile', (
          csa.avg_age_in_position IS NOT NULL
          AND ar.age BETWEEN (csa.avg_age_in_position - 4) AND (csa.avg_age_in_position + 4)
        ),
        'squad_avg_age_in_position', csa.avg_age_in_position,
        'imminent_free', (
          (ar.contract_expires_date::DATE - NOW()::DATE)::NUMERIC / 30.44 <= 3
        ),
        'club_avg_market_value', csa.club_avg_market_value,
        'league_avg_market_value', csa.league_avg_market_value,
        'player_current_league_value', ar.current_league_market_value,
        'details', jsonb_build_object(
          'player_contract_expires', ar.contract_expires,
          'months_until_free', ROUND((ar.contract_expires_date::DATE - NOW()::DATE)::NUMERIC / 30.44)
        )
      ) as match_reasons
    FROM agent_roster ar
    CROSS JOIN club_squad_analysis csa
    WHERE
      -- =====================================================
      -- HARD FILTERS (Must Pass All)
      -- =====================================================

      -- FILTER 4: Not moving to current club
      ar.current_club_id != csa.club_id

      -- FILTER 5: Exact position match
      AND ar.main_position = csa.main_position

      -- FILTER 6: League must be same OR realistic step up
      AND (
        ar.league_id = csa.league_id  -- Same league (60% of transfers)
        OR
        (
          -- Step up: Target league has 20%+ higher avg market value
          csa.league_avg_market_value > ar.current_league_market_value * 1.2
          AND csa.country = ar.current_country  -- Same country for step up
          -- Tier restriction: Max 1 tier jump in same country
          -- Lower tier number = higher division (Tier 1 is top, Tier 4 is bottom)
          -- Player in Tier 4 can move to Tier 4 or Tier 3, NOT Tier 1 or 2
          AND ar.current_tier <= csa.tier + 1  -- Player tier can be at most 1 higher (worse) than target
        )
      )

      -- FILTER 7: Market Value Compatibility
      AND CASE
        -- For €0 players: only match with very low-value clubs (≤€50k avg)
        WHEN ar.market_value_eur = 0 THEN
          csa.club_avg_market_value <= 50000

        -- For €1-€150k players: player value must be ≤3x club average
        -- AND club average must be ≥20% of player value
        WHEN ar.market_value_eur <= 150000 THEN
          ar.market_value_eur <= (csa.club_avg_market_value * 3)
          AND csa.club_avg_market_value >= (ar.market_value_eur * 0.2)

        ELSE FALSE -- No matches for >€150k
      END

      -- FILTER 8: CONTRACT TIMING - KILLER FEATURE
      -- Club MUST have at least 1 player in position with contract expiring within ±2 months
      AND EXISTS (
        SELECT 1 FROM players_transfermarkt cp
        WHERE cp.club_id = csa.club_id
          AND cp.main_position = ar.main_position
          AND cp.contract_expires IS NOT NULL
          AND ABS((cp.contract_expires::DATE - ar.contract_expires_date::DATE)::NUMERIC / 30.44) <= 2
      )
  )
  SELECT * FROM recommendations
  WHERE recommendations.match_score >= 80  -- Quality over quantity: only high-quality matches
  ORDER BY recommendations.match_score DESC, recommendations.player_market_value DESC
  LIMIT 50;  -- Cap at 50 best recommendations per agent
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_smart_recommendations_nordic(UUID) TO authenticated;

SELECT '✅ Nordic smart recommendations algorithm created!' as status;
