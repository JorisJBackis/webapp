-- =====================================================
-- GET PLAYERS FOR PERCENTILES - Optimized for performance
-- =====================================================
-- Filters players directly in SQL using JSONB operators
-- Much faster than fetching all players and filtering in JS

CREATE OR REPLACE FUNCTION get_players_for_percentiles(
  p_tournament_id TEXT,
  p_season_id TEXT,
  p_position TEXT
)
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  age INTEGER,
  picture_url TEXT,
  main_position TEXT,
  sf_data JSONB,
  sofascore_id INTEGER,
  club_id BIGINT,
  transfermarkt_url TEXT,
  market_value_eur INTEGER,
  club_name TEXT,
  club_logo_url TEXT,
  club_transfermarkt_url TEXT,
  player_position TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.age,
    p.picture_url,
    p.main_position,
    p.sf_data,
    p.sofascore_id,
    p.club_id,
    p.transfermarkt_url,
    p.market_value_eur,
    c.name::TEXT as club_name,
    c.logo_url::TEXT as club_logo_url,
    c.transfermarkt_url::TEXT as club_transfermarkt_url,
    s.position::TEXT as player_position
  FROM players_transfermarkt p
  LEFT JOIN clubs_transfermarkt c ON p.club_id = c.id
  LEFT JOIN sofascore_players_staging s ON p.sofascore_id = s.sofascore_id
  WHERE
    -- Must have sf_data and sofascore_id
    p.sf_data IS NOT NULL
    AND p.sofascore_id IS NOT NULL
    -- Must have the specific tournament in sf_data
    AND p.sf_data ? p_tournament_id
    -- Must have the specific season within that tournament
    AND p.sf_data->p_tournament_id->'seasons' ? p_season_id
    -- Must have statistics for that season
    AND p.sf_data->p_tournament_id->'seasons'->p_season_id->'statistics' IS NOT NULL
    -- Must match position
    AND s.position = p_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_players_for_percentiles(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_players_for_percentiles(TEXT, TEXT, TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION get_players_for_percentiles(TEXT, TEXT, TEXT) IS
  'Efficiently fetches players for percentile calculations by filtering on tournament/season/position in SQL';

-- Create index to speed up the JSONB queries if not exists
CREATE INDEX IF NOT EXISTS idx_players_sf_data_gin ON players_transfermarkt USING GIN (sf_data);
