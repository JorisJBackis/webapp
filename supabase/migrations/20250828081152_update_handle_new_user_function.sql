-- CRITICAL: Update handle_new_user trigger function to support user_type column
-- This migration MUST run before the add_user_type_to_profiles migration is deployed to production
-- Otherwise, user registration will break due to missing user_type in INSERT

-- Update the trigger function to include user_type column
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Debug logging
  RAISE LOG 'Creating profile for user: %, with metadata: %', NEW.id, NEW.raw_user_meta_data;
  
  -- Insert profile with club_id and user_type from metadata
  INSERT INTO public.profiles (
    id, 
    club_id,
    user_type,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    (NEW.raw_user_meta_data->>'club_id')::integer,
    COALESCE((NEW.raw_user_meta_data->>'user_type')::text, 'club_staff'),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Also ensure the trigger exists (in case it's missing)
CREATE TRIGGER IF NOT EXISTS on_auth_user_created 
  AFTER INSERT ON auth.users 
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();