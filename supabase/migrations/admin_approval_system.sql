-- =====================================================
-- ADMIN APPROVAL SYSTEM
-- =====================================================

-- 1. Add approval status columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON profiles(approval_status);

-- 3. Create admin_users table to track who can approve
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  admin_level TEXT DEFAULT 'admin' CHECK (admin_level IN ('admin', 'super_admin'))
);

-- 4. Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM admin_users WHERE id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update RLS policies for profiles table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- Recreate policies with approval check
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin(auth.uid()));

-- 6. Create view for admins to see pending users
CREATE OR REPLACE VIEW pending_user_approvals AS
SELECT
  p.id,
  p.user_type,
  p.club_id,
  c.name as club_name,
  p.created_at as registered_at,
  p.approval_status,
  au.email,
  au.email_confirmed_at
FROM profiles p
LEFT JOIN clubs c ON p.club_id = c.id
LEFT JOIN auth.users au ON p.id = au.id
WHERE p.approval_status = 'pending'
ORDER BY p.created_at DESC;

-- 7. Grant access to admins
GRANT SELECT ON pending_user_approvals TO authenticated;

-- 8. Create function to approve user
CREATE OR REPLACE FUNCTION approve_user(
  target_user_id UUID,
  admin_notes_text TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve users';
  END IF;

  -- Update user approval status
  UPDATE profiles
  SET
    approval_status = 'approved',
    approved_at = NOW(),
    approved_by = auth.uid(),
    admin_notes = admin_notes_text
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to reject user
CREATE OR REPLACE FUNCTION reject_user(
  target_user_id UUID,
  reason TEXT,
  admin_notes_text TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can reject users';
  END IF;

  -- Update user approval status
  UPDATE profiles
  SET
    approval_status = 'rejected',
    approved_at = NOW(),
    approved_by = auth.uid(),
    rejection_reason = reason,
    admin_notes = admin_notes_text
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- IMPORTANT: Make yourself an admin!
-- Replace 'YOUR_USER_EMAIL@example.com' with your actual email
-- Run this in SQL editor AFTER running the above:
-- =====================================================
--
-- INSERT INTO admin_users (id, admin_level)
-- SELECT id, 'super_admin'
-- FROM auth.users
-- WHERE email = 'YOUR_USER_EMAIL@example.com'
-- ON CONFLICT (id) DO NOTHING;
