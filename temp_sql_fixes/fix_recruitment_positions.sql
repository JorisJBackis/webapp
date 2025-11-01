-- =====================================================
-- Fix Recruitment Needs Positions to Match Transfermarkt
-- =====================================================
-- This script updates position names in recruitment_needs table
-- to match the exact format used in players_transfermarkt table

UPDATE recruitment_needs
SET position_needed = CASE position_needed
  -- Forward positions
  WHEN 'Striker' THEN 'Centre-Forward'
  WHEN 'Center-Forward' THEN 'Centre-Forward'
  WHEN 'Center Forward' THEN 'Centre-Forward'

  -- Midfielder positions
  WHEN 'Attacking Midfielder' THEN 'Attacking Midfield'
  WHEN 'Central Midfielder' THEN 'Central Midfield'
  WHEN 'Defensive Midfielder' THEN 'Defensive Midfield'
  WHEN 'Right Midfielder' THEN 'Right Midfield'
  WHEN 'Left Midfielder' THEN 'Left Midfield'

  -- Defender positions
  WHEN 'Centre Back' THEN 'Centre-Back'
  WHEN 'Center-Back' THEN 'Centre-Back'
  WHEN 'Center Back' THEN 'Centre-Back'
  WHEN 'Right Back' THEN 'Right-Back'
  WHEN 'Left Back' THEN 'Left-Back'

  -- Winger positions (already correct format, but handle variations)
  WHEN 'Right Wing' THEN 'Right Winger'
  WHEN 'Left Wing' THEN 'Left Winger'

  -- Goalkeeper (already correct, but handle variations)
  WHEN 'GK' THEN 'Goalkeeper'
  WHEN 'Goal Keeper' THEN 'Goalkeeper'

  -- Keep existing if already in correct format
  ELSE position_needed
END
WHERE position_needed IN (
  'Striker', 'Center-Forward', 'Center Forward',
  'Attacking Midfielder', 'Central Midfielder', 'Defensive Midfielder',
  'Right Midfielder', 'Left Midfielder',
  'Centre Back', 'Center-Back', 'Center Back',
  'Right Back', 'Left Back',
  'Right Wing', 'Left Wing',
  'GK', 'Goal Keeper'
);

-- Show the results
SELECT DISTINCT position_needed
FROM recruitment_needs
ORDER BY position_needed;

-- Verify the update
SELECT
  position_needed,
  COUNT(*) as count
FROM recruitment_needs
GROUP BY position_needed
ORDER BY count DESC;
