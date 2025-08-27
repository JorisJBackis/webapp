# GitHub Secrets Required for CI/CD

## Go to: GitHub Repository → Settings → Secrets and variables → Actions

### Add these Repository Secrets:

1. **SUPABASE_ACCESS_TOKEN**
   - Get from: https://supabase.com/dashboard/account/tokens
   - Create a new access token
   - Copy and add as secret

2. **SUPABASE_DB_PASSWORD**
   - Your production database password
   - Same as in your Python ETL .env: `k72WCg@G8$!a*Zn`

3. **SUPABASE_PROJECT_ID**
   - Your project reference: `jbqljjyctbsyawijlxfa`

4. **PRODUCTION_PROJECT_ID** (might be same as above)
   - Your project reference: `jbqljjyctbsyawijlxfa`

## Steps to Fix:

1. Go to: https://github.com/JorisJBackis/webapp/settings/secrets/actions
2. Click "New repository secret"
3. Add each secret above
4. Re-run the failed workflows

## Why It's Failing:

The workflow is trying to:
1. Connect to Supabase to run migrations
2. But can't authenticate without the access token
3. So migrations never run
4. That's why your rename isn't working in production!

## Quick Test After Adding Secrets:

Once you add the secrets:
1. Go to Actions tab
2. Click on the failed workflow
3. Click "Re-run jobs" → "Re-run failed jobs"

The migration should then run and your table will be renamed!