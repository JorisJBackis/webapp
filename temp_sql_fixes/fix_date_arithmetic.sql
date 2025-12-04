-- Test the correct way to calculate month difference from dates
SELECT 
  '2025-06-30'::DATE - NOW()::DATE AS days_diff,
  ROUND((('2025-06-30'::DATE - NOW()::DATE)::NUMERIC) / 30.44) AS months_diff,
  ABS(ROUND((('2025-06-30'::DATE - '2025-05-30'::DATE)::NUMERIC) / 30.44)) AS abs_months_diff;
