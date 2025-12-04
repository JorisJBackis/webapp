-- 1. Add email column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Add email column to player_profiles table
ALTER TABLE player_profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. Add transfermarkt_link column to player_profiles table
ALTER TABLE player_profiles
ADD COLUMN IF NOT EXISTS transfermarkt_link TEXT;

-- 3. Create indexes on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_player_profiles_email ON player_profiles(email);

-- 4. Backfill existing profiles with email from auth.users
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id AND p.email IS NULL;

-- 5. Backfill existing player_profiles with email from auth.users
UPDATE player_profiles pp
SET email = au.email
FROM auth.users au
WHERE pp.id = au.id AND pp.email IS NULL;

-- 4. Fix handle_new_user trigger to include registration_note AND email
-- AND create player_data_request if user is a player not in database
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Debug logging
  RAISE LOG 'Creating profile for user: %, with metadata: %', NEW.id, NEW.raw_user_meta_data;

  -- Insert profile with club_id, user_type, registration_note, AND email
  INSERT INTO public.profiles (
    id,
    email,
    club_id,
    user_type,
    registration_note,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,  -- Get email directly from the auth.users record
    (NEW.raw_user_meta_data->>'club_id')::integer,
    COALESCE((NEW.raw_user_meta_data->>'user_type')::text, 'club_staff'),
    NEW.raw_user_meta_data->>'registration_note',  -- Add registration_note from signup metadata
    NOW(),
    NOW()
  );

  -- If user is a player, create player_profiles entry
  IF (NEW.raw_user_meta_data->>'user_type')::text = 'player' THEN
    INSERT INTO public.player_profiles (
      id,
      email,
      wyscout_player_id,
      full_name,
      transfermarkt_link,
      looking_status
    )
    VALUES (
      NEW.id,
      NEW.email,
      (NEW.raw_user_meta_data->>'wyscout_player_id')::integer,
      NEW.raw_user_meta_data->>'player_name',  -- Can be null for players not in database
      NEW.raw_user_meta_data->>'transfermarkt_link',  -- Store Transfermarkt link (can be null)
      'open_to_offers'
    );

    RAISE LOG 'Created player_profiles for user: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;
