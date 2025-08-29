# Database Migration Process

## ✅ CORRECT Way to Create and Deploy Migrations

### Step 1: Create Migration File
```bash
# Generate timestamp-based migration file
npx supabase migration new your_migration_name
# This creates: supabase/migrations/[timestamp]_your_migration_name.sql
```

### Step 2: Write Your SQL
Edit the created file with your changes:
```sql
-- Example: Create new tables
CREATE TABLE IF NOT EXISTS player_profiles (
    id SERIAL PRIMARY KEY,
    -- ... your columns
);

-- Always use IF NOT EXISTS for safety
-- Always use IF EXISTS when dropping
```

### Step 3: Test Locally (Optional but Recommended)
```bash
# Start local Supabase
npx supabase start

# Apply migration locally
npx supabase migration up

# Test your changes
# Stop when done
npx supabase stop
```

### Step 4: Deploy via GitHub
```bash
# Commit your migration file
git add supabase/migrations/*.sql
git commit -m "migration: your description"

# Push to develop first
git push origin develop

# Create PR to main
# When merged to main, GitHub Actions will:
# 1. Check for new migration files
# 2. Apply them to production
# 3. Create a release tag
```

## ❌ What NOT to Do

### 1. DON'T use `supabase db push`
- This tries to sync ENTIRE schema
- Creates 2000+ lines of SQL
- Can break existing data

### 2. DON'T use `supabase db pull` 
- Unless you need to inspect production schema
- Creates massive `remote_schema.sql` file
- Should NOT be committed

### 3. DON'T edit migrations after deploying
- Once a migration is in production, it's permanent
- Create a new migration to fix issues

### 4. DON'T forget IF EXISTS clauses
- Always use `IF NOT EXISTS` when creating
- Always use `IF EXISTS` when dropping/altering
- Prevents errors if migration runs twice

## 🔍 Checking Migration Status

### View Applied Migrations in Production
```sql
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC;
```

### Check Local Migration Files
```bash
ls -la supabase/migrations/
```

## 🚨 If Things Go Wrong

### Migration Already Applied Error
```bash
# Mark as applied in production
npx supabase migration repair --status applied [version]
```

### Need to Rollback
```sql
-- Create a new migration that undoes the changes
-- Never delete migration history
```

## 📋 Pre-Flight Checklist

Before creating new migrations:
- [ ] Pull latest from main branch
- [ ] Check production migration history
- [ ] Ensure no conflicting migrations exist
- [ ] Use descriptive migration names
- [ ] Test locally if possible
- [ ] Include proper IF EXISTS clauses
- [ ] Document any complex changes

## Current Migration Status
- ✅ Production has: 20250826123054 (rename table)
- ✅ Local matches production
- ✅ Ready for new migrations!