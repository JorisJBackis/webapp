-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Function to trigger admin notification email
CREATE OR REPLACE FUNCTION notify_admins_new_registration()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  club_name TEXT;
  api_url TEXT;
  api_secret TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;

  -- Get club name if exists
  IF NEW.club_id IS NOT NULL THEN
    SELECT name INTO club_name FROM clubs WHERE id = NEW.club_id;
  END IF;

  -- Get API URL and secret from environment
  api_url := current_setting('app.settings.site_url', true) || '/api/emails/notify-admin';
  api_secret := current_setting('app.settings.email_api_secret', true);

  -- Trigger email notification via API
  PERFORM extensions.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(api_secret, '')
    ),
    body := jsonb_build_object(
      'userEmail', user_email,
      'userType', NEW.user_type,
      'clubName', club_name,
      'registeredAt', NEW.created_at
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_profile_created_notify_admins ON profiles;
CREATE TRIGGER on_profile_created_notify_admins
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.approval_status = 'pending')
  EXECUTE FUNCTION notify_admins_new_registration();

-- Update approve_user function to send email notification
CREATE OR REPLACE FUNCTION approve_user(target_user_id UUID, admin_notes_text TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE
  user_email TEXT;
  api_url TEXT;
  api_secret TEXT;
BEGIN
  -- Check if the caller is an admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can approve users';
  END IF;

  -- Update the user's approval status
  UPDATE profiles
  SET
    approval_status = 'approved',
    approved_at = NOW(),
    approved_by = auth.uid(),
    admin_notes = admin_notes_text
  WHERE id = target_user_id;

  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;

  -- Get API URL and secret
  api_url := current_setting('app.settings.site_url', true) || '/api/emails/notify-approval';
  api_secret := current_setting('app.settings.email_api_secret', true);

  -- Send approval notification email
  PERFORM extensions.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(api_secret, '')
    ),
    body := jsonb_build_object(
      'userEmail', user_email,
      'userName', user_email
    )::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reject_user function to send email notification
CREATE OR REPLACE FUNCTION reject_user(
  target_user_id UUID,
  reason TEXT,
  admin_notes_text TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  user_email TEXT;
  api_url TEXT;
  api_secret TEXT;
BEGIN
  -- Check if the caller is an admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can reject users';
  END IF;

  -- Update the user's approval status
  UPDATE profiles
  SET
    approval_status = 'rejected',
    approved_by = auth.uid(),
    rejection_reason = reason,
    admin_notes = admin_notes_text
  WHERE id = target_user_id;

  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;

  -- Get API URL and secret
  api_url := current_setting('app.settings.site_url', true) || '/api/emails/notify-rejection';
  api_secret := current_setting('app.settings.email_api_secret', true);

  -- Send rejection notification email
  PERFORM extensions.http_post(
    url := api_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(api_secret, '')
    ),
    body := jsonb_build_object(
      'userEmail', user_email,
      'userName', user_email,
      'rejectionReason', reason
    )::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set database configuration for email API
-- Note: You'll need to set these values in your Supabase dashboard under Database > Settings > Custom settings
-- ALTER DATABASE postgres SET app.settings.site_url = 'https://your-domain.com';
-- ALTER DATABASE postgres SET app.settings.email_api_secret = 'your-secret-key';
