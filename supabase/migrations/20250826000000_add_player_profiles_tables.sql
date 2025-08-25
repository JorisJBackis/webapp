-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id INTEGER REFERENCES clubs(id),
  user_type TEXT DEFAULT 'club_staff' CHECK (user_type IN ('club_staff', 'player', 'agent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user_type column if table exists but column doesn't
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN user_type TEXT DEFAULT 'club_staff' 
    CHECK (user_type IN ('club_staff', 'player', 'agent'));
  END IF;
END $$;

-- Create player profiles table
CREATE TABLE IF NOT EXISTS player_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wyscout_player_id INTEGER,
  
  -- Salary & Contract
  current_salary_range TEXT,
  desired_salary_range TEXT,
  contract_end_date DATE,
  
  -- Preferences
  preferred_countries TEXT[],
  preferred_leagues TEXT[],
  languages TEXT[],
  
  -- Personal
  family_status TEXT CHECK (family_status IN ('single', 'partner', 'family_with_children')),
  relocation_preference TEXT CHECK (relocation_preference IN ('eager', 'open', 'prefer_not')),
  
  -- Professional
  playing_positions TEXT[],
  preferred_playing_style TEXT,
  
  -- Media
  profile_photo_url TEXT,
  youtube_highlight_url TEXT,
  instagram_url TEXT,
  
  -- Agent
  agent_name TEXT,
  agent_email TEXT,
  agent_phone TEXT,
  
  -- Status
  looking_status TEXT DEFAULT 'not_looking' 
    CHECK (looking_status IN ('actively_looking', 'open_to_offers', 'not_looking')),
  profile_completeness INTEGER DEFAULT 0 
    CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  verified BOOLEAN DEFAULT FALSE,
  
  -- Analytics
  profile_views INTEGER DEFAULT 0,
  last_active TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create player applications table
CREATE TABLE IF NOT EXISTS player_applications (
  id SERIAL PRIMARY KEY,
  player_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
  need_id INTEGER REFERENCES recruitment_needs(need_id) ON DELETE CASCADE,
  
  -- Application details
  cover_message TEXT,
  expected_salary TEXT,
  available_from DATE,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'viewed', 'shortlisted', 'rejected', 'accepted')),
  club_notes TEXT,
  
  -- Timestamps
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  
  -- Ensure a player can only apply once to each need
  UNIQUE(player_id, need_id)
);

-- Create profile views analytics table
CREATE TABLE IF NOT EXISTS profile_views (
  id SERIAL PRIMARY KEY,
  player_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
  viewer_club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_duration_seconds INTEGER,
  source TEXT CHECK (source IN ('search', 'application', 'direct_link', 'browse'))
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_profiles_looking_status 
  ON player_profiles(looking_status);
CREATE INDEX IF NOT EXISTS idx_player_profiles_positions 
  ON player_profiles USING GIN(playing_positions);
CREATE INDEX IF NOT EXISTS idx_player_profiles_countries 
  ON player_profiles USING GIN(preferred_countries);
CREATE INDEX IF NOT EXISTS idx_player_profiles_leagues 
  ON player_profiles USING GIN(preferred_leagues);

CREATE INDEX IF NOT EXISTS idx_player_applications_player 
  ON player_applications(player_id);
CREATE INDEX IF NOT EXISTS idx_player_applications_need 
  ON player_applications(need_id);
CREATE INDEX IF NOT EXISTS idx_player_applications_status 
  ON player_applications(status);

CREATE INDEX IF NOT EXISTS idx_profile_views_player 
  ON profile_views(player_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_club 
  ON profile_views(viewer_club_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_date 
  ON profile_views(viewed_at);

-- Enable Row Level Security
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_profiles
-- Players can view and manage their own profile
CREATE POLICY "Players can view own profile" 
  ON player_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Players can update own profile" 
  ON player_profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Players can insert own profile" 
  ON player_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Clubs can view player profiles (for browsing)
CREATE POLICY "Clubs can view player profiles" 
  ON player_profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'club_staff'
    )
  );

-- RLS Policies for player_applications
-- Players can manage their own applications
CREATE POLICY "Players can view own applications" 
  ON player_applications FOR SELECT 
  USING (player_id = auth.uid());

CREATE POLICY "Players can create applications" 
  ON player_applications FOR INSERT 
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "Players can update own applications" 
  ON player_applications FOR UPDATE 
  USING (player_id = auth.uid());

CREATE POLICY "Players can delete own applications" 
  ON player_applications FOR DELETE 
  USING (player_id = auth.uid());

-- Clubs can view and manage applications to their needs
CREATE POLICY "Clubs can view applications to their needs" 
  ON player_applications FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM recruitment_needs rn
      JOIN profiles p ON p.club_id = rn.created_by_club_id
      WHERE rn.need_id = player_applications.need_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Clubs can update applications to their needs" 
  ON player_applications FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM recruitment_needs rn
      JOIN profiles p ON p.club_id = rn.created_by_club_id
      WHERE rn.need_id = player_applications.need_id
      AND p.id = auth.uid()
    )
  );

-- RLS Policies for profile_views
-- Players can view their own analytics
CREATE POLICY "Players can view own profile views" 
  ON profile_views FOR SELECT 
  USING (player_id = auth.uid());

-- Clubs can insert view records for tracking
CREATE POLICY "Clubs can record profile views" 
  ON profile_views FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.club_id = viewer_club_id
      AND profiles.user_type = 'club_staff'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for player_profiles updated_at
CREATE TRIGGER update_player_profiles_updated_at 
  BEFORE UPDATE ON player_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate profile completeness
CREATE OR REPLACE FUNCTION calculate_profile_completeness(player_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completeness INTEGER := 0;
  profile player_profiles%ROWTYPE;
BEGIN
  SELECT * INTO profile FROM player_profiles WHERE id = player_id;
  
  -- Basic info (20%)
  IF profile.current_salary_range IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF profile.playing_positions IS NOT NULL AND array_length(profile.playing_positions, 1) > 0 THEN 
    completeness := completeness + 10; 
  END IF;
  
  -- Preferences (30%)
  IF profile.preferred_countries IS NOT NULL AND array_length(profile.preferred_countries, 1) > 0 THEN 
    completeness := completeness + 10; 
  END IF;
  IF profile.languages IS NOT NULL AND array_length(profile.languages, 1) > 0 THEN 
    completeness := completeness + 10; 
  END IF;
  IF profile.desired_salary_range IS NOT NULL THEN completeness := completeness + 10; END IF;
  
  -- Personal info (20%)
  IF profile.family_status IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF profile.relocation_preference IS NOT NULL THEN completeness := completeness + 10; END IF;
  
  -- Media (20%)
  IF profile.profile_photo_url IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF profile.youtube_highlight_url IS NOT NULL THEN completeness := completeness + 10; END IF;
  
  -- Professional (10%)
  IF profile.contract_end_date IS NOT NULL THEN completeness := completeness + 10; END IF;
  
  RETURN completeness;
END;
$$ LANGUAGE plpgsql;

-- Create function to auto-update profile completeness
CREATE OR REPLACE FUNCTION update_profile_completeness()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_completeness := calculate_profile_completeness(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating profile completeness
CREATE TRIGGER update_profile_completeness_trigger
  BEFORE INSERT OR UPDATE ON player_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_completeness();

-- Create view for player statistics with profile
CREATE OR REPLACE VIEW player_profiles_with_stats AS
SELECT 
  pp.*,
  p.name as player_name,
  p.position,
  p.stats,
  c.name as current_club_name,
  c.league as current_league,
  c.logo_url as club_logo_url,
  COUNT(DISTINCT pa.id) as application_count,
  COUNT(DISTINCT pv.id) as total_profile_views
FROM player_profiles pp
LEFT JOIN players p ON p.wyscout_player_id = pp.wyscout_player_id
LEFT JOIN clubs c ON p.club_id = c.id
LEFT JOIN player_applications pa ON pa.player_id = pp.id
LEFT JOIN profile_views pv ON pv.player_id = pp.id
GROUP BY pp.id, p.name, p.position, p.stats, c.name, c.league, c.logo_url;

-- Grant necessary permissions
GRANT SELECT ON player_profiles_with_stats TO authenticated;
GRANT ALL ON player_profiles TO authenticated;
GRANT ALL ON player_applications TO authenticated;
GRANT ALL ON profile_views TO authenticated;
GRANT USAGE ON SEQUENCE player_applications_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE profile_views_id_seq TO authenticated;