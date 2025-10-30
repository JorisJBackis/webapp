-- Enhanced Admin Panel Migration
-- Adds registration notes and views for approved/rejected users

-- 1. Add registration_note field to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS registration_note TEXT;

-- 2. Create view for approved users
CREATE OR REPLACE VIEW approved_users AS
SELECT
  p.id,
  p.club_id,
  c.name as club_name,
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
WHERE p.approval_status = 'approved'
ORDER BY p.approved_at DESC;

-- 3. Create view for rejected users
CREATE OR REPLACE VIEW rejected_users AS
SELECT
  p.id,
  p.club_id,
  c.name as club_name,
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
WHERE p.approval_status = 'rejected'
ORDER BY p.approved_at DESC;

-- 4. Update the existing pending_user_approvals view to include registration_note
DROP VIEW IF EXISTS pending_user_approvals;
CREATE OR REPLACE VIEW pending_user_approvals AS
SELECT
  p.id,
  p.club_id,
  c.name as club_name,
  p.created_at as registered_at,
  p.approval_status,
  p.registration_note,
  au.email,
  au.email_confirmed_at
FROM profiles p
LEFT JOIN clubs c ON p.club_id = c.id
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.approval_status = 'pending'
ORDER BY p.created_at DESC;

-- 5. Grant access to authenticated users (admins will check via RLS)
GRANT SELECT ON approved_users TO authenticated;
GRANT SELECT ON rejected_users TO authenticated;

-- 6. Create function to change user approval status (for admins)
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
