# FootyLabs Player Features Implementation Plan

## Overview
This document outlines the complete plan for adding Player functionality to FootyLabs, transforming it from a club-only platform to a true marketplace connecting clubs, players, and (eventually) agents.

## Key Decisions (Answered by Founder)
1. **Salary Visibility**: Clubs see estimated salary ranges, not exact amounts
2. **Verification**: No verification system for MVP - build trust through usage
3. **Monetization**: No premium features initially - all features free
4. **Agent Features**: Deferred to later phase after player features are stable

## Core Player Needs Analysis

### What Players Want (Different from Clubs)
1. **Get discovered** by the RIGHT clubs (quality over quantity)
2. **Understand their market value** through objective data
3. **Find clubs that match their life** (family, language, culture, location)
4. **Build their professional brand** with stats and highlights
5. **Track career progression** over time

### Value Proposition for Players
- "Get discovered by clubs that actually match your needs"
- "Know your worth with data-driven insights"
- "Find clubs where you'll thrive, not just survive"

## Features Breakdown

### Components to REUSE from Existing Codebase
✅ **Player DNA Modal** (`/components/common/player-detail-modal.tsx`)
- Perfect for players viewing their own detailed stats
- Already has radar charts, percentile rankings, FootyLabs Score

✅ **Club Reputation System** (`/components/dashboard/club-reputation.tsx`)
- Critical for players researching clubs
- Shows ratings on Salary Punctuality, Training Conditions, etc.

✅ **Dashboard Layout** (`/app/dashboard/layout.tsx`)
- Adapt navigation for player-specific routes
- Keep authentication flow

✅ **All UI Components** (`/components/ui/*`)
- Shadcn components work perfectly for player features

✅ **Recruitment Needs Browser** (`/components/marketplace/browse-needs.tsx`)
- Transform into "Opportunities" for players
- Add "Fit Score" calculation

### NEW Features Required for Players

#### 1. Player Dashboard (Home)
- **My Performance Overview**
  - Current season stats summary
  - FootyLabs Score trend
  - Recent match performances
- **Career Timeline**
  - Goals, assists, appearances over seasons
  - Club history with duration
- **Market Interest Tracker**
  - Number of profile views
  - Which clubs viewed (anonymous initially)
  - Applications status
- **Contract & Salary Info**
  - Current contract end date
  - Salary range (private)

#### 2. Opportunities Page (Replace Scouting)
- **Browse Recruitment Needs**
  - Filter by position, location, budget
  - Sort by "Fit Score"
  - Show salary ranges
- **Fit Score Algorithm**
  - Position match (100% weight if exact match)
  - Age range fit
  - Budget compatibility
  - Physical attributes match
  - Location preferences
- **Quick Actions**
  - "Express Interest" button
  - Save opportunity
  - Share with agent

#### 3. My Public Profile
- **Professional Section**
  - Profile photo upload
  - Basic info (age, position, nationality)
  - Current club & contract status
  - Languages spoken
- **Performance Section**
  - Embedded Player DNA radar chart
  - Season statistics
  - Career totals
- **Media Section**
  - YouTube highlight reel embed
  - Match footage links
  - Photo gallery
- **Availability Status**
  - Actively looking
  - Open to offers
  - Not looking

#### 4. Club Discovery
- **Browse Clubs by Reputation**
  - Sort by overall rating
  - Filter by league, country
  - See review breakdowns
- **League Insights**
  - Average salaries by position
  - Quality of life metrics
  - Competition level

## Database Schema Design

### New Tables Required

```sql
-- Player profiles extension
CREATE TABLE player_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  wyscout_player_id INTEGER REFERENCES players(wyscout_player_id),
  
  -- Salary & Contract
  current_salary_range TEXT, -- e.g., "€10k-15k/month"
  desired_salary_range TEXT,
  contract_end_date DATE,
  
  -- Preferences
  preferred_countries TEXT[], -- Array of country codes
  preferred_leagues TEXT[], -- Array of league names
  languages TEXT[], -- Array of languages
  
  -- Personal
  family_status TEXT, -- 'single', 'partner', 'family_with_children'
  relocation_preference TEXT, -- 'eager', 'open', 'prefer_not'
  
  -- Professional
  playing_positions TEXT[], -- Can play multiple positions
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
  looking_status TEXT, -- 'actively_looking', 'open_to_offers', 'not_looking'
  profile_completeness INTEGER, -- 0-100 percentage
  verified BOOLEAN DEFAULT FALSE,
  
  -- Analytics
  profile_views INTEGER DEFAULT 0,
  last_active TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications to recruitment needs
CREATE TABLE player_applications (
  id SERIAL PRIMARY KEY,
  player_id UUID REFERENCES player_profiles(id),
  need_id INTEGER REFERENCES recruitment_needs(need_id),
  
  -- Application details
  cover_message TEXT,
  expected_salary TEXT,
  available_from DATE,
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'viewed', 'shortlisted', 'rejected', 'accepted'
  club_notes TEXT, -- Private notes from club
  
  -- Timestamps
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ
);

-- Profile view analytics
CREATE TABLE profile_views (
  id SERIAL PRIMARY KEY,
  player_id UUID REFERENCES player_profiles(id),
  viewer_club_id INTEGER REFERENCES clubs(id),
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_duration_seconds INTEGER,
  source TEXT -- 'search', 'application', 'direct_link'
);

-- Player reviews of clubs (extends existing club_reviews)
-- No changes needed - current structure supports player reviews
```

### Updates to Existing Tables

```sql
-- Update profiles table to include user_type
ALTER TABLE profiles 
ADD COLUMN user_type TEXT DEFAULT 'club_staff'; -- 'club_staff', 'player', 'agent'

-- Add to recruitment_needs for better matching
ALTER TABLE recruitment_needs
ADD COLUMN preferred_languages TEXT[],
ADD COLUMN playing_style_preference TEXT;
```

## Player Onboarding Flow Design

### Registration Step (Enhanced)
```typescript
// After email/password, before club selection
role: 'club_staff' | 'player' | 'agent'
```

### Player Onboarding Questions

#### Screen 1: Essential Info (Required)
**Purpose**: Core matching data
```
1. What's your primary playing position?
   [Dropdown: GK, CB, FB, DM, CM, AM, W, CF]

2. What's your current monthly salary range?
   [Dropdown: Under €5k | €5-10k | €10-20k | €20-40k | €40k+ | Prefer not to say]

3. Which countries would you consider playing in? (Select all)
   [Multi-select country list with search]

4. What languages do you speak fluently?
   [Multi-select: English, Spanish, Portuguese, French, German, Italian, etc.]

[Continue →]
```

#### Screen 2: Enhance Matching (Optional but Valuable)
**Purpose**: Better club-player fit
```
5. When does your current contract end?
   [Date picker] [Skip]

6. What's your ideal monthly salary range?
   [Same dropdown as #2] [Skip]

7. What's your family situation?
   [Single | Partner | Family with children] [Skip]

8. Do you have a highlight video?
   [YouTube URL input] [Skip]

[Continue →]
```

#### Screen 3: Professional Preferences (Optional)
```
9. What's your preferred playing style?
   [Possession | Counter-attack | High press | Flexible] [Skip]

10. Are you represented by an agent?
    [Yes + agent details | No] [Skip]

[Complete Profile →]
```

### Profile Strength Indicator
Show progress bar: "Profile Strength: 75% - Add highlight video to reach 85%"

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create player_profiles table and related schemas
- [ ] Update auth registration to support player role
- [ ] Implement player onboarding flow with multi-step form
- [ ] Create player-specific routing and navigation
- [ ] Set up basic player dashboard layout

### Phase 2: Core Features (Week 2-3)
- [ ] Adapt Player DNA modal for self-viewing
- [ ] Build Opportunities browser from recruitment needs
- [ ] Implement Fit Score algorithm
- [ ] Create public player profile page
- [ ] Add profile photo and media uploads

### Phase 3: Interactions (Week 4)
- [ ] Build application system for recruitment needs
- [ ] Implement profile view tracking
- [ ] Add notification system for interest
- [ ] Create application management for clubs
- [ ] Add messaging between clubs and players

### Phase 4: Analytics & Polish (Week 5)
- [ ] Add career progression charts
- [ ] Implement market insights
- [ ] Create salary estimation feature
- [ ] Add profile completeness gamification
- [ ] Performance optimization

## Technical Implementation Notes

### Authentication & Authorization
```typescript
// Update middleware.ts to handle player routes
const playerRoutes = ['/dashboard', '/opportunities', '/profile', '/clubs'];
const clubRoutes = ['/dashboard', '/scouting', '/marketplace'];

// Route protection based on user_type
if (userType === 'player' && clubRoutes.includes(pathname)) {
  return redirect('/dashboard');
}
```

### Fit Score Algorithm
```typescript
function calculateFitScore(player: PlayerProfile, need: RecruitmentNeed): number {
  let score = 0;
  
  // Position match (40% weight)
  if (player.playing_positions.includes(need.position_needed)) {
    score += 40;
  }
  
  // Salary match (30% weight)
  if (playerSalaryInRange(player.desired_salary_range, need.salary_range)) {
    score += 30;
  }
  
  // Age match (15% weight)
  if (player.age >= need.min_age && player.age <= need.max_age) {
    score += 15;
  }
  
  // Physical attributes (10% weight)
  if (playerPhysicalMatch(player, need)) {
    score += 10;
  }
  
  // Language bonus (5% weight)
  if (hasCommonLanguage(player.languages, need.preferred_languages)) {
    score += 5;
  }
  
  return score;
}
```

### Component Reuse Map
| Existing Component | Player Feature Usage |
|-------------------|---------------------|
| PlayerDetailModal | View own stats, embedable in profile |
| ClubReputation | Browse and filter clubs by rating |
| RecruitmentNeeds | Transform to Opportunities browser |
| DashboardNav | Add player-specific navigation items |
| LeaguePlayerBrowser | Reference for player search UI |

## API Endpoints Required

### Player-Specific Endpoints
```typescript
// Player profile
GET /api/players/profile - Get own profile
PUT /api/players/profile - Update profile
POST /api/players/profile/photo - Upload photo

// Opportunities
GET /api/opportunities - List matching recruitment needs
GET /api/opportunities/:id - Get specific opportunity
POST /api/opportunities/:id/apply - Apply to opportunity

// Applications
GET /api/players/applications - List own applications
DELETE /api/players/applications/:id - Withdraw application

// Analytics
POST /api/players/profile/view - Track profile view
GET /api/players/analytics - Get own analytics
```

## Future Enhancements (Post-MVP)

### Phase 5: Agent Features
- Agent can manage multiple player profiles
- Bulk application submissions
- Commission tracking
- Agent-specific analytics

### Phase 6: Advanced Features
- AI-powered career advice
- Salary prediction model
- Performance prediction in new league
- Automated highlight reel generation
- Contract negotiation tools

### Phase 7: Social Features
- Player-to-player networking
- Mentorship programs
- Success stories/testimonials
- Community forums

## Success Metrics

### Key Performance Indicators
1. **User Acquisition**
   - Number of player registrations
   - Profile completion rate
   - Geographic distribution

2. **Engagement**
   - Average session duration
   - Applications per player
   - Profile views per player

3. **Marketplace Health**
   - Application to interview ratio
   - Time to first application
   - Successful placements

4. **Platform Value**
   - Player satisfaction (NPS)
   - Club engagement with player profiles
   - Repeat usage rate

## Risk Mitigation

### Potential Risks & Solutions
1. **Fake Profiles**: Implement verification in Phase 2
2. **Information Overload**: Progressive disclosure in UI
3. **Privacy Concerns**: Granular privacy settings
4. **Low Club Engagement**: Incentivize clubs with quality score
5. **Data Quality**: Link to Wyscout for verified stats

## Notes & Decisions Log

### 2024-01-25 Initial Planning Session
- Decided to focus on players before agents
- No paywall for MVP - growth over revenue
- Salary ranges over exact amounts for privacy
- No verification system initially - build trust through usage
- YouTube integration for highlights is priority
- Family/lifestyle factors are crucial for matching

---

*This document is the single source of truth for player feature implementation. Update as decisions are made or requirements change.*