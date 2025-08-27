# How to Create a Full Database Backup (Including Data)

## Option 1: Via Supabase Dashboard (EASIEST & RECOMMENDED)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Database Backups**
5. Click **Download backup**
   - This includes EVERYTHING: schema + data + functions + policies
   - File will be a `.sql` file you can restore anytime

## Option 2: Using Supabase CLI (For Your Project)
```bash
# First, switch to production environment
cp .env.local .env.development.local

# Pull the production database structure
npx supabase db pull

# This creates migrations in supabase/migrations/
```

## Option 3: Direct PostgreSQL Dump (Requires Connection String)
```bash
# You need the connection string from Supabase Dashboard
# Settings → Database → Connection String

pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.jbqljjyctbsyawijlxfa.supabase.co:5432/postgres" > backup_$(date +%Y%m%d).sql
```

## What Gets Backed Up:
- ✅ **All Tables** (structure)
- ✅ **All Data** (every row in every table)
- ✅ **Functions** (stored procedures)
- ✅ **Triggers**
- ✅ **Indexes**
- ✅ **Policies** (RLS)
- ✅ **Sequences** (auto-increment counters)
- ✅ **Views**
- ✅ **EVERYTHING!**

## How to Restore from Backup:
```bash
# If disaster strikes:
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" < backup_20250826.sql

# Or via Supabase CLI:
npx supabase db push < backup_20250826.sql
```

## Automated Backups in Supabase:
- **Pro Plan**: Daily automatic backups (7 days retention)
- **Team Plan**: Daily automatic backups (30 days retention)
- **Free Plan**: Manual backups only

## For Your Current Situation:
Since you're on Supabase hosted, your data is already backed up by Supabase automatically. But for peace of mind before our migration:

1. **Go to Supabase Dashboard now**
2. **Download a backup**
3. **Save it as**: `backup_before_player_features_20250826.sql`
4. **Then we can proceed with confidence!**

The backup file will be large if you have lots of data, but it's a complete snapshot of your entire database at this moment.