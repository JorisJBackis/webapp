-- Add user_type column to profiles table to distinguish between club staff and players
ALTER TABLE profiles 
ADD COLUMN user_type TEXT DEFAULT 'club_staff' 
CHECK (user_type IN ('club_staff', 'player', 'agent'));

-- Add index for better performance when querying by user_type
CREATE INDEX idx_profiles_user_type ON profiles(user_type);

-- Add a comment for documentation
COMMENT ON COLUMN profiles.user_type IS 'Type of user: club_staff, player, or agent';