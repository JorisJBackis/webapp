# FootyLabs Development Workflow

## Overview
Simple, safe workflow without expensive staging environments. We use local development for testing, then deploy through PRs.

## Git Flow

```
feature/* → develop → main
```

1. **Feature branches**: All new work
2. **Develop branch**: Integration testing  
3. **Main branch**: Production (protected)

## Branch Protection Rules

### Main Branch
- ✅ **No direct pushes** (even admins)
- ✅ **PR required** for all changes
- ✅ **No approval needed** (for speed)
- ✅ **Force push disabled**

This keeps production safe while allowing fast iteration.

## Development Process

### 1. Starting New Work

```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Start local Supabase
npx supabase start
npm run dev
```

### 2. Local Development

```bash
# Make changes and test locally
# Your local Supabase is at http://localhost:54323

# If you need database changes
npx supabase migration new your_feature_name
# Edit the migration file in supabase/migrations/
# Test it locally
npx supabase db reset
```

### 3. Committing Work

```bash
# Stage and commit
git add .
git commit -m "feat: your feature description"

# Push to GitHub
git push origin feature/your-feature-name
```

### 4. Creating Pull Request

```bash
# Create PR to develop (not main!)
gh pr create --base develop --head feature/your-feature-name

# Or use GitHub UI
```

### 5. Merging to Develop

- Merge PR to develop
- Test on Vercel preview
- No database changes happen yet (migrations not deployed)

### 6. Deploying to Production

```bash
# When ready, create PR from develop to main
gh pr create --base main --head develop --title "Deploy to production"

# Merge when ready
# GitHub Actions will:
# - Run migrations (if any)
# - Deploy to Vercel
# - Update production
```

## Database Migrations

### Safety Rules

1. **NEVER commit migrations without testing locally first**
2. **Test with `npx supabase db reset` before pushing**
3. **Migrations only run when merging to main**
4. **Always review migration files before merge**

### Creating Migrations

```bash
# Create new migration
npx supabase migration new feature_name

# Edit the file in supabase/migrations/
# Test locally
npx supabase db reset

# If it works, commit it
git add supabase/migrations/*
git commit -m "feat: add migration for feature"
```

## Environment Variables

### Local Development
- Uses `.env.local` (git ignored)
- Points to local Supabase

### Production
- Set in Vercel dashboard
- Points to production Supabase

## Common Commands

```bash
# Local Development
npx supabase start          # Start local Supabase
npx supabase stop           # Stop local Supabase
npx supabase status         # Check status
npx supabase db reset       # Reset local DB (test migrations)

# Git Workflow
git checkout -b feature/X   # New feature
gh pr create                # Create PR
gh pr list                  # List PRs
gh pr merge                 # Merge PR

# Testing
npm run dev                 # Start Next.js locally
npm run build              # Test production build
npm run lint               # Check code quality
```

## Safety Checklist

Before merging to main:
- [ ] Tested locally with `npm run dev`
- [ ] Migrations tested with `npx supabase db reset`
- [ ] No console.log or debug code
- [ ] No hardcoded secrets
- [ ] Lint passes
- [ ] Build succeeds

## No Staging Branch?

We don't use Supabase branching (saves $35/month). Instead:
- Local testing catches 95% of issues
- Develop branch for integration
- Vercel previews for UI testing
- Quick rollback if issues arise

## Emergency Procedures

### Rollback Migration

```bash
# If migration breaks production
git revert <commit-hash>
git push origin main  # Through PR!
```

### Hot Fix

```bash
# For urgent fixes
git checkout -b hotfix/issue-name main
# Fix issue
git push origin hotfix/issue-name
# Create PR directly to main
```

## Tips

- **Always pull latest**: `git pull origin develop` before new branches
- **Small PRs**: Easier to review and less risky
- **Test migrations**: Always `npx supabase db reset` first
- **Use conventional commits**: feat:, fix:, chore:, docs:
- **Don't skip PR process**: Even for "tiny" changes

## Questions?

- Check existing PRs for examples
- Use GitHub Issues for bugs
- Follow the workflow even when working alone (good habits!)