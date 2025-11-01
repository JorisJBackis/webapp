-- =====================================================
-- Fix recruitment_needs Primary Key Sequence
-- =====================================================
-- This fixes the "duplicate key value violates unique constraint" error

-- Show current max ID
SELECT 'Current max need_id: ' || COALESCE(MAX(need_id), 0) as info
FROM recruitment_needs;

-- Reset the sequence to the max ID + 1
SELECT setval(
  'recruitment_needs_need_id_seq',
  COALESCE((SELECT MAX(need_id) FROM recruitment_needs), 0) + 1,
  false
);

-- Confirm the sequence is fixed
SELECT 'Sequence reset to: ' || last_value as status
FROM recruitment_needs_need_id_seq;
