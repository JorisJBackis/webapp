-- Fix RLS policy for player_profiles to allow creation during registration
-- This change is required for player registration to work properly

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Players can insert own profile" ON player_profiles;

-- Create a more permissive INSERT policy that allows creation during registration
-- SECURITY NOTE: This allows creation when auth.uid() is NULL (during registration)
-- but still requires auth.uid() = id when user is authenticated
CREATE POLICY "Players can create own profile" ON player_profiles
    FOR INSERT
    WITH CHECK (auth.uid() IS NULL OR auth.uid() = id);

-- Add comment for documentation
COMMENT ON POLICY "Players can create own profile" ON player_profiles IS 
'Allows player_profiles creation during registration (when auth.uid() is NULL) and normal authenticated access (when auth.uid() = id). Required for player registration flow.';