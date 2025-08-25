# FootyLabs Development Workflow

## Overview
This document outlines our development workflow, branching strategy, and deployment process for FootyLabs.

## Environment Structure

```
LOCAL (Docker)      → Individual development (FREE)
    ↓
STAGING (Branch)    → Integration testing ($25/month) 
    ↓
PRODUCTION (Main)   → Live users (Protected)
```

## Git Branching Strategy

```
main                → Production (protected, auto-deploys to Vercel)
  ↑
develop             → Staging (auto-deploys to Supabase staging branch)
  ↑  
feature/*           → Feature development (local testing)
```

## Initial Setup (One Time)

### 1. Install Supabase CLI
```bash
# macOS
brew install supabase/tap/supabase

# npm/yarn
npm install -g supabase
```

### 2. Link Your Project
```bash
# Get your project ref from Supabase Dashboard
supabase link --project-ref YOUR_PROJECT_REF

# Pull existing schema
supabase db pull
```

### 3. Start Local Development
```bash
# Start local Supabase (Docker containers)
supabase start

# Access local services:
# Studio:    http://localhost:54323
# API:       http://localhost:54321
# DB:        postgresql://postgres:postgres@localhost:54322/postgres
```

## Daily Development Workflow

### 1. Create Feature Branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### 2. Develop Locally
```bash
# Start local Supabase
supabase start

# Start Next.js with local Supabase
npm run dev

# Make database changes via Studio UI
# http://localhost:54323
```

### 3. Generate Migration
```bash
# After making DB changes in Studio
supabase db diff -f descriptive_name

# This creates: supabase/migrations/[timestamp]_descriptive_name.sql
```

### 4. Test Migration
```bash
# Reset local DB and apply all migrations
supabase db reset

# Or apply specific migration
supabase migration up
```

### 5. Commit and Push
```bash
git add .
git commit -m "feat: add player profiles table"
git push origin feature/your-feature-name
```

### 6. Create Pull Request
1. Create PR from `feature/*` → `develop`
2. GitHub Actions runs tests
3. Staging branch auto-updates with migrations
4. Test on staging environment

### 7. Deploy to Production
1. After staging testing, create PR from `develop` → `main`
2. Get approval from team lead
3. Merge triggers:
   - Migrations to production Supabase
   - Deployment to Vercel

## Database Migrations

### Creating Migrations

**Option 1: Manual SQL**
```bash
# Create empty migration file
supabase migration new create_players_table

# Edit the file in supabase/migrations/
```

**Option 2: Auto-generate from changes**
```bash
# Make changes in local Studio UI
# Then generate migration
supabase db diff -f add_player_columns
```

### Migration Best Practices
1. **Always test locally first**: `supabase db reset`
2. **Keep migrations small**: One feature per migration
3. **Name descriptively**: `add_player_profiles_table` not `update1`
4. **Include rollback**: Add DROP statements when safe
5. **Order matters**: Dependencies must be created first

## Environment Variables

### Local Development (.env.local)
```env
# Use local Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
```

### Staging (.env.staging)
```env
# Use staging branch
NEXT_PUBLIC_SUPABASE_URL=https://[staging-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key
```

### Production (.env.production)
```env
# Use production project
NEXT_PUBLIC_SUPABASE_URL=https://[prod-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=production-anon-key
```

## CI/CD Pipeline (GitHub Actions)

### Staging Workflow (.github/workflows/staging.yml)
- Triggers on: Push to `develop`
- Runs: Tests, linting
- Deploys: Migrations to staging branch
- Notifies: Slack/Discord on failure

### Production Workflow (.github/workflows/production.yml)
- Triggers on: Push to `main`
- Requires: PR approval
- Runs: Full test suite
- Deploys: Migrations to production
- Creates: Release tag

## Common Commands

### Supabase CLI
```bash
# Start/stop local instance
supabase start
supabase stop

# Database operations
supabase db pull              # Pull remote schema
supabase db push              # Push local schema
supabase db reset             # Reset and reapply migrations
supabase db diff -f name      # Generate migration

# View local credentials
supabase status

# Run migrations
supabase migration up         # Apply pending migrations
supabase migration list       # List all migrations
```

### Git Workflow
```bash
# Start new feature
git checkout -b feature/name

# Update from develop
git checkout develop
git pull origin develop
git checkout feature/name
git merge develop

# Finish feature
git push origin feature/name
# Create PR on GitHub
```

## Troubleshooting

### Local Supabase Issues
```bash
# Full reset
supabase stop --no-backup
docker system prune -a
supabase start

# Check logs
supabase logs
```

### Migration Conflicts
```bash
# Pull latest migrations
supabase db pull

# Regenerate types
supabase gen types typescript --local > lib/supabase/database.types.ts
```

### Environment Sync Issues
```bash
# Reset to match remote
supabase db remote commit
supabase db reset
```

## Security Guidelines

### Production Database
- **NEVER** modify directly via Dashboard
- **ALWAYS** use migrations
- **REQUIRE** PR reviews for production changes
- **BACKUP** before major migrations

### API Keys
- **NEVER** commit `.env` files
- **ROTATE** keys regularly
- **USE** different keys per environment
- **RESTRICT** production access

## Team Guidelines

### Code Review Checklist
- [ ] Migrations tested locally
- [ ] Types regenerated if schema changed
- [ ] Environment variables documented
- [ ] Breaking changes communicated
- [ ] Rollback plan exists

### Branch Protection Rules
**main branch:**
- Require PR reviews (1 minimum)
- Dismiss stale reviews
- Require status checks
- Require branches up to date
- Include administrators

**develop branch:**
- Require status checks
- Automatic merge after checks

## Quick Reference

| Task | Command |
|------|---------|
| Start local dev | `supabase start && npm run dev` |
| Create migration | `supabase db diff -f feature_name` |
| Test migrations | `supabase db reset` |
| Pull remote schema | `supabase db pull` |
| Generate types | `supabase gen types typescript --local > lib/supabase/database.types.ts` |
| View local URLs | `supabase status` |

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Discord**: [Team Discord]
- **Issues**: GitHub Issues
- **Emergency**: Contact CTO

---

*Last updated: 2025-01-25*
*Version: 1.0*