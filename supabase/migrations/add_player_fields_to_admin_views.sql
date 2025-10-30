-- Update admin views to include wyscout_player_id and transfermarkt_link for player data tracking

-- Drop existing views
DROP VIEW IF EXISTS approved_users;
DROP VIEW IF EXISTS rejected_users;
DROP VIEW IF EXISTS pending_user_approvals;

-- Recreate approved_users view with player fields
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
  p.email,
  au.email_confirmed_at,
  approver.email as approved_by_email,
  pp.wyscout_player_id,
  pp.transfermarkt_link
FROM profiles p
LEFT JOIN clubs c ON p.club_id = c.id
LEFT JOIN auth.users au ON p.id = au.id
LEFT JOIN auth.users approver ON p.approved_by = approver.id
LEFT JOIN player_profiles pp ON p.id = pp.id
LEFT JOIN players pl ON pp.wyscout_player_id = pl.wyscout_player_id
WHERE p.approval_status = 'approved'
ORDER BY p.id, p.approved_at DESC;

-- Recreate rejected_users view with player fields
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
  p.email,
  au.email_confirmed_at,
  rejecter.email as rejected_by_email,
  pp.wyscout_player_id,
  pp.transfermarkt_link
FROM profiles p
LEFT JOIN clubs c ON p.club_id = c.id
LEFT JOIN auth.users au ON p.id = au.id
LEFT JOIN auth.users rejecter ON p.approved_by = rejecter.id
LEFT JOIN player_profiles pp ON p.id = pp.id
LEFT JOIN players pl ON pp.wyscout_player_id = pl.wyscout_player_id
WHERE p.approval_status = 'rejected'
ORDER BY p.id, p.approved_at DESC;

-- Recreate pending_user_approvals view with player fields
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
  p.email,
  au.email_confirmed_at,
  pp.wyscout_player_id,
  pp.transfermarkt_link
FROM profiles p
LEFT JOIN clubs c ON p.club_id = c.id
LEFT JOIN auth.users au ON p.id = au.id
LEFT JOIN player_profiles pp ON p.id = pp.id
LEFT JOIN players pl ON pp.wyscout_player_id = pl.wyscout_player_id
WHERE p.approval_status = 'pending'
ORDER BY p.id, p.created_at DESC;
