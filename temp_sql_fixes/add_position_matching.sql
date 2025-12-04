-- =====================================================
-- Smart Position Matching Algorithm
-- =====================================================
-- This creates a function to determine position compatibility
-- Returns: 'exact', 'semi', or 'none'

CREATE OR REPLACE FUNCTION check_position_compatibility(
  p_player_position TEXT,
  p_club_position TEXT
)
RETURNS TEXT AS $$
BEGIN
  -- Exact match
  IF p_player_position = p_club_position THEN
    RETURN 'exact';
  END IF;

  -- Goalkeeper - no semi-matches (very specialized)
  IF p_player_position = 'Goalkeeper' OR p_club_position = 'Goalkeeper' THEN
    RETURN 'none';
  END IF;

  -- Centre-Back semi-matches
  IF p_player_position = 'Centre-Back' THEN
    IF p_club_position IN ('Left-Back', 'Right-Back', 'Defensive Midfield') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Full-Backs (Left-Back / Right-Back)
  IF p_player_position IN ('Left-Back', 'Right-Back') THEN
    IF p_club_position IN ('Centre-Back', 'Left-Back', 'Right-Back', 'Left Winger', 'Right Winger', 'Defensive Midfield') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Defensive Midfield
  IF p_player_position = 'Defensive Midfield' THEN
    IF p_club_position IN ('Central Midfield', 'Centre-Back') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Central Midfield (most versatile position)
  IF p_player_position = 'Central Midfield' THEN
    IF p_club_position IN ('Defensive Midfield', 'Attacking Midfield', 'Left Midfield', 'Right Midfield') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Attacking Midfield
  IF p_player_position = 'Attacking Midfield' THEN
    IF p_club_position IN ('Central Midfield', 'Left Winger', 'Right Winger', 'Centre-Forward') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Left Winger
  IF p_player_position = 'Left Winger' THEN
    IF p_club_position IN ('Right Winger', 'Attacking Midfield', 'Left-Back', 'Centre-Forward', 'Left Midfield') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Right Winger
  IF p_player_position = 'Right Winger' THEN
    IF p_club_position IN ('Left Winger', 'Attacking Midfield', 'Right-Back', 'Centre-Forward', 'Right Midfield') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Centre-Forward
  IF p_player_position = 'Centre-Forward' THEN
    IF p_club_position IN ('Attacking Midfield', 'Left Winger', 'Right Winger') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- Left/Right Midfield
  IF p_player_position IN ('Left Midfield', 'Right Midfield') THEN
    IF p_club_position IN ('Central Midfield', 'Left Winger', 'Right Winger', 'Left Midfield', 'Right Midfield') THEN
      RETURN 'semi';
    END IF;
  END IF;

  -- No match
  RETURN 'none';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

GRANT EXECUTE ON FUNCTION check_position_compatibility(TEXT, TEXT) TO authenticated;

-- Test the function
SELECT
  'Left-Back' as player_pos,
  'Centre-Back' as club_pos,
  check_position_compatibility('Left-Back', 'Centre-Back') as match_type
UNION ALL
SELECT
  'Left-Back' as player_pos,
  'Left Winger' as club_pos,
  check_position_compatibility('Left-Back', 'Left Winger') as match_type
UNION ALL
SELECT
  'Centre-Forward' as player_pos,
  'Goalkeeper' as club_pos,
  check_position_compatibility('Centre-Forward', 'Goalkeeper') as match_type
UNION ALL
SELECT
  'Central Midfield' as player_pos,
  'Central Midfield' as club_pos,
  check_position_compatibility('Central Midfield', 'Central Midfield') as match_type;
