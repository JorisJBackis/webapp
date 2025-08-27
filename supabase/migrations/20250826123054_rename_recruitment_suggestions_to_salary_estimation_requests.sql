-- Rename recruitment_suggestions table to salary_estimation_requests
ALTER TABLE IF EXISTS recruitment_suggestions RENAME TO salary_estimation_requests;

-- Rename the foreign key constraint to match new table name
ALTER TABLE IF EXISTS salary_estimation_requests 
  DROP CONSTRAINT IF EXISTS recruitment_suggestions_club_id_fkey;

ALTER TABLE IF EXISTS salary_estimation_requests 
  ADD CONSTRAINT salary_estimation_requests_club_id_fkey 
  FOREIGN KEY (club_id) REFERENCES clubs(id);

-- Update any indexes to match new naming convention
ALTER INDEX IF EXISTS recruitment_suggestions_pkey RENAME TO salary_estimation_requests_pkey;

-- Note: RLS policies will be handled when the table exists in production
-- These statements are commented out for local testing
-- DROP POLICY IF EXISTS "Enable insert for authenticated users" ON salary_estimation_requests;
-- DROP POLICY IF EXISTS "Enable read for authenticated users" ON salary_estimation_requests;
-- CREATE POLICY "Enable insert for authenticated users" ON salary_estimation_requests FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "Enable read for authenticated users" ON salary_estimation_requests FOR SELECT TO authenticated USING (true);