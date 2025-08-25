# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FootyLabs is a football intelligence platform providing data-driven insights for clubs, agents, and players. It's essentially "Moneyball for football" with advanced scouting, player analytics, and AI-powered predictions.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn UI components
- **Backend**: Supabase (PostgreSQL, Auth, API)  
- **Data Pipeline**: Python ETL scripts (located in ../webapp-backend)
- **Deployment**: Vercel

## Common Commands

```bash
# Development
npm run dev          # Start development server (Next.js)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run Next.js linter

# Python ETL (from ../webapp-backend directory)
python populate_players_table.py         # Populate players data
python populate_team_matches_table.py    # Populate team matches
python populate_agency_rb_prospects.py   # Populate agency RB prospects
python populate_prospects.py             # Populate prospects
python populate_final_position_averages.py # Populate final position averages
```

## Environment Variables

Required environment variables for the Next.js app:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

For Python ETL scripts (in ../webapp-backend/.env):
- `SUPABASE_DB_USER`: Database user
- `SUPABASE_DB_PASSWORD`: Database password  
- `SUPABASE_DB_HOST`: Database host
- `SUPABASE_DB_NAME`: Database name
- `SUPABASE_DB_PORT`: Database port

## Architecture & Key Patterns

### Route Structure
- `/` - Landing page
- `/auth/*` - Authentication flows (login, register, reset-password, select-club)
- `/dashboard` - Main dashboard with club analytics
- `/dashboard/scouting` - Player scouting with league browser and watchlist
- `/dashboard/marketplace` - Transfer marketplace with listings and recruitment needs
- `/dashboard/analytics` - Advanced analytics views
- `/dashboard/profile` - User profile management

### Authentication Flow
1. Middleware (`middleware.ts`) handles route protection and auth state
2. Uses Supabase Auth with email/password
3. After registration, users select their club affiliation
4. Session management via Supabase auth helpers

### Data Flow
1. Raw data (Excel files from Wyscout) → Python ETL scripts
2. Python processes data, calculates metrics, and populates Supabase
3. Next.js app fetches data via Supabase client or API routes
4. Components use React hooks and state management for UI updates

### Key Components Architecture
- **Dashboard Components** (`/components/dashboard/*`): Performance overviews, team comparisons, player stats
- **Scouting Components** (`/components/scouting/*`): Player browser, watchlist management
- **Marketplace Components** (`/components/marketplace/*`): Listings, needs, agency prospects
- **Common Components** (`/components/common/*`): Shared modals like player detail modal
- **UI Components** (`/components/ui/*`): Shadcn UI primitives

### API Routes Pattern
All API routes follow RESTful patterns:
- GET `/api/clubs` - List clubs
- GET `/api/clubs/[id]` - Get specific club
- GET `/api/clubs/[id]/players` - Get club's players
- GET `/api/players/[id]` - Get player details
- Similar patterns for marketplace listings, recruitment needs, etc.

### Database Schema (from lib/supabase/database.types.ts)

#### Core Tables:

**players** - Main player statistics table
- `wyscout_player_id`: Unique Wyscout identifier
- `name`, `position`: Basic player info
- `club_id`: FK to clubs table
- `stats`: JSON object containing all player metrics

**clubs** - Football clubs
- `id`, `name`: Club identifiers  
- `league`, `league_id`: League affiliation
- `logo_url`: Club logo

**team_metrics_aggregated** - Comprehensive team statistics (100+ columns)
- All passing metrics (accuracy, types, zones)
- Duel statistics (aerial, defensive, offensive)
- Goal scoring patterns by time periods
- Possession and tempo metrics
- Set piece and penalty area statistics

**team_match_stats** - Individual match statistics
- `match_id`, `team_id`, `date`
- `competition`: Competition name
- `stats`: JSON with match-specific metrics

**agency_rb_prospects** - Scouted right-back prospects
- Physical attributes: `height`, `weight`, `age`, `foot`
- Performance: `footy_labs_score`, `goals`, `assists`
- Contract info: `contract_expires`, `market_value`, `on_loan`
- Contact tracking: `reached_out_on`, `their_response`

**recruitment_needs** - Club recruitment requirements
- Position and physical requirements
- Budget constraints: `budget_transfer_max`, `budget_loan_fee_max`
- Age range: `min_age`, `max_age`
- `preferred_foot`, `salary_range`

**player_listings** - Transfer market listings
- `listing_type`: Enum ("loan" | "transfer")
- `status`: Enum ("active" | "inactive" | "completed")
- Financial terms: `asking_price`, `loan_fee`, `loan_duration`

**profiles** - User profiles linked to auth
- `id`: UUID linked to auth.users
- `club_id`: User's affiliated club

**leagues** - League information
- Competition details: `tier`, `country`, `division_name`
- Structure: `number_of_teams`, `total_games_per_season`

**club_reviews** - Club ratings and feedback
- `overall_rating`, `category_ratings` (JSON)
- Categories: "Salary Punctuality", "Training Conditions", "Club Management", "Fair Salary"

**final_position_averages** - League position benchmarks
- `position`: Final league position
- `stats`: JSON with average metrics for that position

**previous_years_positions** - Historical league standings
- Season performance: `Points`, `Position`, `Year`
- Goal statistics: Goals Scored/Conceded

### Python ETL Pipeline (../webapp-backend)
The ETL pipeline processes Wyscout data:
1. **Data Loading**: Reads Excel files from Data/ directory
2. **Metrics Calculation**: Uses `wyscout_utils/wyscout_metrics.py` to calculate advanced metrics
3. **FootyLabs Score**: Proprietary scoring algorithm based on percentile rankings
4. **Database Population**: SQLAlchemy connects to Supabase PostgreSQL and populates tables

Key Python modules:
- `wyscout_utils/wyscout_ETL.py` - Core ETL functions
- `wyscout_utils/wyscout_metrics.py` - Metric calculations
- `wyscout_utils/wyscout_plots.py` - Data visualization utilities

### State Management
- No global state management library (Redux/Zustand)
- Local component state with React hooks
- Server state via Supabase real-time subscriptions where needed
- Form state managed by react-hook-form with zod validation

### Styling Conventions
- Tailwind CSS for all styling
- Shadcn UI components follow consistent theming
- Dark mode support via next-themes
- Responsive design with mobile-first approach

## Development Guidelines

### When Adding New Features
1. Check existing patterns in similar components
2. Use Shadcn UI components where applicable
3. Follow TypeScript strict mode requirements
4. Ensure Supabase RLS policies are considered for data access
5. Add proper loading and error states

### Working with Data
1. Always check if data exists in Supabase before creating new tables
2. Use database types from `/lib/supabase/database.types.ts`
3. Handle Supabase auth errors gracefully (token refresh, session expiry)
4. Consider using Supabase real-time for live updates where appropriate

### Python ETL Development
1. Place new data files in appropriate Data/ subdirectories
2. Follow existing ETL patterns in populate_*.py scripts
3. Update requirements.txt when adding new dependencies
4. Test locally before running against production database
5. Document any new metrics or calculations in code comments

## Testing
Currently no automated tests configured. Manual testing recommended for:
- Authentication flows
- Data fetching and display
- Form submissions
- Responsive design across devices

## Automated Git Workflow

### Commit Strategy
When making code changes, I will proactively commit work at logical breakpoints:

1. **When to Commit**:
   - After completing a feature or fixing a bug
   - After significant refactoring
   - After adding/updating components
   - After modifying database schemas or API routes
   - After updating configuration files
   - When switching between different areas of work

2. **Commit Message Format**:
   - Clear, concise description of what changed
   - Focus on the "why" not just the "what"
   - Examples:
     - "feat: add player comparison view to analytics dashboard"
     - "fix: resolve auth token refresh issue on session timeout"
     - "refactor: optimize team metrics query performance"
     - "style: update dashboard responsive breakpoints"

3. **What NOT to Commit**:
   - Partial/broken implementations
   - Debug console.log statements
   - Commented-out code blocks
   - Files with merge conflicts
   - .env files or secrets

4. **Commit Frequency**:
   - Aim for logical units of work (not too granular, not too large)
   - Typically 1-3 commits per feature/fix
   - Group related changes together

## Important Notes
- The Python ETL pipeline is in a separate directory (`../webapp-backend`)
- Database types are auto-generated from Supabase schema
- All sensitive credentials must be in .env files (never commit)
- The FootyLabs Score algorithm is proprietary - maintain calculation consistency