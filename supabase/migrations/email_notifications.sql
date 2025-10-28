-- Update notify_admins_new_registration to use tunnel and be non-blocking
CREATE OR REPLACE FUNCTION notify_admins_new_registration()
  RETURNS TRIGGER AS $$
  DECLARE
user_email TEXT;
    club_name TEXT;
    api_url TEXT;
BEGIN
    -- Wrap in exception handler so registration doesn't fail if email fails
BEGIN
SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;

IF NEW.club_id IS NOT NULL THEN
SELECT name INTO club_name FROM clubs WHERE id = NEW.club_id;
END IF;

      -- Use Cloudflare tunnel for testing
      api_url := 'https://requests-detection-stolen-surveillance.trycloudflare.com/api/emails/notify-admin';

      PERFORM net.http_post(
        url := api_url,
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
          'userEmail', user_email,
          'userType', NEW.user_type,
          'clubName', club_name,
          'registeredAt', NEW.created_at
        )
      );
EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send admin notification: %', SQLERRM;
END;

RETURN NEW;
END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Update approve_user to use tunnel and be non-blocking
  CREATE OR REPLACE FUNCTION approve_user(target_user_id UUID, admin_notes_text TEXT DEFAULT NULL)
  RETURNS void AS $$
  DECLARE
user_email TEXT;
    api_url TEXT;
BEGIN
    IF NOT is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can approve users';
END IF;

    -- Always update approval status (critical operation)
UPDATE profiles
SET
    approval_status = 'approved',
    approved_at = NOW(),
    approved_by = auth.uid(),
    admin_notes = admin_notes_text
WHERE id = target_user_id;

-- Try to send email (non-critical, non-blocking)
BEGIN
SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;
api_url := 'https://requests-detection-stolen-surveillance.trycloudflare.com/api/emails/notify-approval';

      PERFORM net.http_post(
        url := api_url,
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
          'userEmail', user_email,
          'userName', user_email
        )
      );
EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send approval email: %', SQLERRM;
END;
END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  -- Update reject_user to use tunnel and be non-blocking
  CREATE OR REPLACE FUNCTION reject_user(
    target_user_id UUID,
    reason TEXT,
    admin_notes_text TEXT DEFAULT NULL
  )
  RETURNS void AS $$
  DECLARE
user_email TEXT;
    api_url TEXT;
BEGIN
    IF NOT is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only admins can reject users';
END IF;

    -- Always update rejection status (critical operation)
UPDATE profiles
SET
    approval_status = 'rejected',
    approved_by = auth.uid(),
    rejection_reason = reason,
    admin_notes = admin_notes_text
WHERE id = target_user_id;

-- Try to send email (non-critical, non-blocking)
BEGIN
SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;
api_url := 'https://requests-detection-stolen-surveillance.trycloudflare.com/api/emails/notify-rejection';

      PERFORM net.http_post(
        url := api_url,
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object(
          'userEmail', user_email,
          'userName', user_email,
          'rejectionReason', reason
        )
      );
EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to send rejection email: %', SQLERRM;
END;
END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;