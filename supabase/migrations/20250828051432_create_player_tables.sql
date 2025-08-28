-- Create player_profiles table
CREATE TABLE player_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wyscout_player_id INTEGER, -- No FK constraint since players table gets refreshed weekly
  
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
  preferred_playing_style TEXT CHECK (preferred_playing_style IN ('possession', 'counter_attack', 'high_press', 'flexible')),
  
  -- Media
  profile_photo_url TEXT,
  youtube_highlight_url TEXT,
  instagram_url TEXT,
  
  -- Agent
  agent_name TEXT,
  agent_email TEXT,
  agent_phone TEXT,
  
  -- Status
  looking_status TEXT DEFAULT 'open_to_offers' CHECK (looking_status IN ('actively_looking', 'open_to_offers', 'not_looking')),
  profile_completeness INTEGER DEFAULT 0 CHECK (profile_completeness >= 0 AND profile_completeness <= 100),
  verified BOOLEAN DEFAULT FALSE,
  
  -- Analytics
  profile_views INTEGER DEFAULT 0,
  last_active TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_player_profiles_wyscout_id ON player_profiles(wyscout_player_id);
CREATE INDEX idx_player_profiles_looking_status ON player_profiles(looking_status);

-- Create player_applications table
CREATE TABLE player_applications (
  id SERIAL PRIMARY KEY,
  player_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
  need_id INTEGER REFERENCES recruitment_needs(need_id),
  
  -- Application details
  cover_message TEXT,
  expected_salary TEXT,
  available_from DATE,
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'shortlisted', 'rejected', 'accepted')),
  club_notes TEXT, -- Private notes from club
  
  -- Timestamps
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ
);

-- Create profile_views table for analytics
CREATE TABLE profile_views (
  id SERIAL PRIMARY KEY,
  player_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
  viewer_club_id INTEGER REFERENCES clubs(id),
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_duration_seconds INTEGER,
  source TEXT -- 'search', 'application', 'direct_link'
);

-- Enable Row Level Security
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_profiles
CREATE POLICY "Players can view own profile" ON player_profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Players can insert own profile" ON player_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Players can update own profile" ON player_profiles
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Public can view active player profiles" ON player_profiles
    FOR SELECT
    USING (looking_status IN ('actively_looking', 'open_to_offers'));

-- RLS Policies for player_applications
CREATE POLICY "Players can view own applications" ON player_applications
    FOR SELECT
    USING (player_id = auth.uid());

CREATE POLICY "Players can create applications" ON player_applications
    FOR INSERT
    WITH CHECK (player_id = auth.uid());

CREATE POLICY "Players can update own applications" ON player_applications
    FOR UPDATE
    USING (player_id = auth.uid());

CREATE POLICY "Players can delete own applications" ON player_applications
    FOR DELETE
    USING (player_id = auth.uid());

-- RLS Policies for profile_views
CREATE POLICY "Players can view own profile views" ON profile_views
    FOR SELECT
    USING (player_id = auth.uid());

-- Function to calculate profile completeness (optional enhancement)
CREATE OR REPLACE FUNCTION calculate_profile_completeness()
RETURNS TRIGGER AS $$
DECLARE
    completeness_score INTEGER := 0;
    max_score INTEGER := 15; -- Total possible points
BEGIN
    -- Basic info (required fields) - 2 points each
    IF NEW.playing_positions IS NOT NULL AND array_length(NEW.playing_positions, 1) > 0 THEN
        completeness_score := completeness_score + 2;
    END IF;
    
    IF NEW.current_salary_range IS NOT NULL THEN
        completeness_score := completeness_score + 2;
    END IF;
    
    IF NEW.preferred_countries IS NOT NULL AND array_length(NEW.preferred_countries, 1) > 0 THEN
        completeness_score := completeness_score + 2;
    END IF;
    
    IF NEW.languages IS NOT NULL AND array_length(NEW.languages, 1) > 0 THEN
        completeness_score := completeness_score + 2;
    END IF;
    
    -- Optional but valuable fields - 1 point each
    IF NEW.contract_end_date IS NOT NULL THEN
        completeness_score := completeness_score + 1;
    END IF;
    
    IF NEW.desired_salary_range IS NOT NULL THEN
        completeness_score := completeness_score + 1;
    END IF;
    
    IF NEW.family_status IS NOT NULL THEN
        completeness_score := completeness_score + 1;
    END IF;
    
    IF NEW.youtube_highlight_url IS NOT NULL THEN
        completeness_score := completeness_score + 1;
    END IF;
    
    IF NEW.preferred_playing_style IS NOT NULL THEN
        completeness_score := completeness_score + 1;
    END IF;
    
    IF NEW.agent_name IS NOT NULL THEN
        completeness_score := completeness_score + 1;
    END IF;
    
    IF NEW.profile_photo_url IS NOT NULL THEN
        completeness_score := completeness_score + 1;
    END IF;
    
    -- Calculate percentage
    NEW.profile_completeness := (completeness_score * 100) / max_score;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically calculate profile completeness
CREATE TRIGGER calculate_profile_completeness_trigger
    BEFORE INSERT OR UPDATE ON player_profiles
    FOR EACH ROW
    EXECUTE FUNCTION calculate_profile_completeness();

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_player_profiles_updated_at
    BEFORE UPDATE ON player_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();