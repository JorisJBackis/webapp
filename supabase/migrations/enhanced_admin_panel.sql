-- Enhanced Admin Panel Migration
-- Adds registration notes and views for approved/rejected users

-- 1. Add registration_note field to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS registration_note TEXT;

-- 2. Add full_name field to player_profiles for players not in Wyscout
ALTER TABLE player_profiles
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 3. Drop existing views first to avoid column order conflicts
DROP VIEW IF EXISTS approved_users;
DROP VIEW IF EXISTS rejected_users;
DROP VIEW IF EXISTS pending_user_approvals;

-- 4. Create view for approved users
CREATE OR REPLACE VIEW approved_users AS
SELECT DISTINCT ON (p.id)
  p.id,
  p.club_id,
  p.user_type,
  c.name as club_name,
  COALESCE(pl.name, pp.full_name) as player_name,
  p.created_at as registered_at,
  p.approved_at,
  p.approved_by,
  p.registration_note,
  p.admin_notes,
  au.email,
  au.email_confirmed_at,
  approver.email as approved_by_email
FROM profiles p
LEFT JOIN clubs c ON p.club_id = c.id
LEFT JOIN auth.users au ON p.id = au.id
LEFT JOIN auth.users approver ON p.approved_by = approver.id
LEFT JOIN player_profiles pp ON p.id = pp.id
LEFT JOIN players pl ON pp.wyscout_player_id = pl.wyscout_player_id
WHERE p.approval_status = 'approved'
ORDER BY p.id, p.approved_at DESC;

-- 5. Create view for rejected users
CREATE OR REPLACE VIEW rejected_users AS
SELECT DISTINCT ON (p.id)
  p.id,
  p.club_id,
  p.user_type,
  c.name as club_name,
  COALESCE(pl.name, pp.full_name) as player_name,
  p.created_at as registered_at,
  p.approved_at as rejected_at,
  p.approved_by as rejected_by,
  p.rejection_reason,
  p.registration_note,
  p.admin_notes,
  au.email,
  au.email_confirmed_at,
  rejecter.email as rejected_by_email
FROM profiles p
LEFT JOIN clubs c ON p.club_id = c.id
LEFT JOIN auth.users au ON p.id = au.id
LEFT JOIN auth.users rejecter ON p.approved_by = rejecter.id
LEFT JOIN player_profiles pp ON p.id = pp.id
LEFT JOIN players pl ON pp.wyscout_player_id = pl.wyscout_player_id
WHERE p.approval_status = 'rejected'
ORDER BY p.id, p.approved_at DESC;

-- 6. Create view for pending user approvals
CREATE OR REPLACE VIEW pending_user_approvals AS
SELECT DISTINCT ON (p.id)
  p.id,
  p.club_id,
  p.user_type,
  c.name as club_name,
  COALESCE(pl.name, pp.full_name) as player_name,
  p.created_at as registered_at,
  p.approval_status,
  p.registration_note,
  au.email,
  au.email_confirmed_at
FROM profiles p
LEFT JOIN clubs c ON p.club_id = c.id
LEFT JOIN auth.users au ON p.id = au.id
LEFT JOIN player_profiles pp ON p.id = pp.id
LEFT JOIN players pl ON pp.wyscout_player_id = pl.wyscout_player_id
WHERE p.approval_status = 'pending'
ORDER BY p.id, p.created_at DESC;

-- 7. Grant access to authenticated users (admins will check via RLS)
GRANT SELECT ON approved_users TO authenticated;
GRANT SELECT ON rejected_users TO authenticated;

-- 8. Create/update policies for profiles to allow registration during signup

-- First, let's see what policies exist (this will show in logs)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE 'Current policies on profiles table:';
    FOR policy_record IN
        SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        RAISE NOTICE '  Policy: %, Command: %', policy_record.policyname, policy_record.cmd;
    END LOOP;
END $$;

-- Drop ALL redundant update policies for profiles
DROP POLICY IF EXISTS "Users can update their own profile during registration" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Create single, clean UPDATE policy for authenticated users
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 9. Enable RLS and create policies for player_data_requests
-- First, check if RLS is already enabled before enabling it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'player_data_requests'
  ) THEN
    RAISE NOTICE 'Table player_data_requests does not exist';
  ELSE
    ALTER TABLE player_data_requests ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can insert their own player data requests" ON player_data_requests;
DROP POLICY IF EXISTS "Users can view their own player data requests" ON player_data_requests;
DROP POLICY IF EXISTS "Admins can view all player data requests" ON player_data_requests;
DROP POLICY IF EXISTS "Admins can update all player data requests" ON player_data_requests;
DROP POLICY IF EXISTS "Users can create data requests" ON player_data_requests;
DROP POLICY IF EXISTS "Users can view own data requests" ON player_data_requests;

-- Allow authenticated users to insert their own data requests
-- Using auth.uid() = user_id ensures users can only insert their own records
CREATE POLICY "Users can insert their own player data requests"
ON player_data_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to view their own data requests
CREATE POLICY "Users can view their own player data requests"
ON player_data_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to view all data requests
CREATE POLICY "Admins can view all player data requests"
ON player_data_requests
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

-- Allow admins to update all data requests
CREATE POLICY "Admins can update all player data requests"
ON player_data_requests
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

-- 9. Create function to change user approval status (for admins)
CREATE OR REPLACE FUNCTION change_user_status(
  target_user_id UUID,
  new_status TEXT,
  reason_text TEXT DEFAULT NULL,
  admin_notes_text TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can change user status';
  END IF;

  -- Validate status
  IF new_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be pending, approved, or rejected';
  END IF;

  -- Update user status based on new_status
  IF new_status = 'approved' THEN
    UPDATE profiles
    SET
      approval_status = 'approved',
      approved_at = NOW(),
      approved_by = auth.uid(),
      rejection_reason = NULL,
      admin_notes = admin_notes_text
    WHERE id = target_user_id;
  ELSIF new_status = 'rejected' THEN
    UPDATE profiles
    SET
      approval_status = 'rejected',
      approved_at = NOW(),
      approved_by = auth.uid(),
      rejection_reason = reason_text,
      admin_notes = admin_notes_text
    WHERE id = target_user_id;
  ELSE -- pending
    UPDATE profiles
    SET
      approval_status = 'pending',
      approved_at = NULL,
      approved_by = NULL,
      rejection_reason = NULL,
      admin_notes = admin_notes_text
    WHERE id = target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
