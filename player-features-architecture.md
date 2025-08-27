# Player Features Architecture - Shared vs Separate

## 🔄 SHARED Components (Both Use):
- ✅ **Player Detail Modal** - Clubs view other players, Players view themselves
- ✅ **Club Reputation System** - Clubs see their rating, Players browse clubs
- ✅ **Auth System** - Same login/register flow
- ✅ **UI Components** - Buttons, cards, tables, etc.
- ✅ **Supabase Client** - Same database connection

## 👤 PLAYER-ONLY Features:
- **Player Dashboard** (`/dashboard` when user_type='player')
  - My Performance Stats
  - Career Timeline
  - Profile Views Counter
  - Contract Status
  
- **Opportunities Browser** (`/opportunities`)
  - Browse recruitment needs from clubs
  - Filter by position, location, salary
  - "Fit Score" calculation
  - Apply to positions

- **My Profile Management** (`/profile`)
  - Edit personal info
  - Upload highlight videos
  - Set availability status
  - Manage applications

## 🏢 CLUB-ONLY Features:
- **Club Dashboard** (`/dashboard` when user_type='club_staff')
  - Team Analytics (existing)
  - Squad Overview (existing)
  
- **Scouting** (`/scouting`)
  - Browse all players (existing)
  - Watchlist (existing)
  
- **Marketplace** (`/marketplace`)
  - Post recruitment needs (existing)
  - Manage listings (existing)

## 🚦 How The Routing Works:

```typescript
// In middleware.ts or layout.tsx
const userType = session.user.user_type;

// Same URL, different content
if (pathname === '/dashboard') {
  if (userType === 'player') {
    return <PlayerDashboard />
  } else {
    return <ClubDashboard />
  }
}

// Some routes are restricted
if (pathname === '/scouting' && userType === 'player') {
  redirect('/dashboard') // Players can't scout
}

if (pathname === '/opportunities' && userType === 'club_staff') {
  redirect('/marketplace') // Clubs post needs, not browse them
}
```

## Is This Complex? NOT REALLY! 

### Why It's Standard & Easy:

1. **One Variable Decides Everything**: `user_type`
2. **React Makes It Simple**:
```tsx
// Super simple conditional rendering
{userType === 'player' ? (
  <PlayerNavigation />
) : (
  <ClubNavigation />
)}
```

3. **Database Already Supports It**:
- We added `user_type` to profiles table
- RLS policies can check user type
- Queries automatically filtered

4. **Common Pattern** - Every app does this:
- Facebook: Personal vs Business accounts
- LinkedIn: Job seekers vs Recruiters  
- Airbnb: Guests vs Hosts

## Implementation Plan:

### Phase 1: Auth & Routing ✅
- Update registration (already started)
- Add user_type to profiles
- Create middleware for route protection

### Phase 2: Player Dashboard 🚀
- Create `/app/dashboard/player/page.tsx`
- Detect user type and show correct dashboard
- Reuse existing components where possible

### Phase 3: Opportunities for Players
- Transform recruitment_needs into opportunities
- Add application system
- Calculate fit scores

### Phase 4: Player Profile
- Public profile page
- Edit profile functionality
- Media uploads

## File Structure:
```
/app
  /dashboard
    /page.tsx (decides which dashboard to show)
    /player
      /page.tsx (player dashboard)
    /club
      /page.tsx (club dashboard - existing)
  /opportunities
    /page.tsx (players only)
  /scouting
    /page.tsx (clubs only - existing)
  /marketplace
    /page.tsx (clubs only - existing)
  /profile
    /[id]
      /page.tsx (public profile)
    /edit
      /page.tsx (edit own profile)
```

## The Beauty: 
- **No Redundancy** - Shared components stay shared
- **Clean Separation** - Clear what's for whom
- **Easy to Maintain** - One place for each feature
- **Scalable** - Easy to add agent role later