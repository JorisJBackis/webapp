# Supabase Setup Guide

## Getting Your Supabase Access Token

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard

2. **Navigate to Access Tokens**
   - Click your profile icon (top right)
   - Select "Account Settings"
   - Go to "Access Tokens" tab

3. **Generate New Token**
   - Click "Generate New Token"
   - Name it: "FootyLabs CI/CD"
   - Copy the token (you won't see it again!)

## Getting Database Password

1. **Go to Project Settings**
   - In your project: https://supabase.com/dashboard/project/jbqljjyctbsyawijlxfa
   - Click "Settings" (gear icon)
   - Go to "Database" section

2. **Find Database Password**
   - Your database password is what you set when creating the project
   - If forgotten, you can reset it here

## Creating a Staging Branch (Optional but Recommended)

1. **Enable Branching**
   - Go to your project
   - Click "Settings" → "Infrastructure"
   - Enable "Branching"

2. **Create Staging Branch**
   - Click "Create Branch"
   - Name: "staging" or "develop"
   - Wait for provisioning (~2 minutes)

3. **Get Staging Info**
   - Once created, click on the branch
   - Copy the Project ID (looks like: abcd1234efgh5678)
   - Note the database password (same as main or set new)

## Running the Setup Script

After gathering the above information:

```bash
# Run the setup script
./setup_github_secrets.sh

# It will prompt for:
# 1. Supabase Access Token (required)
# 2. Staging Project ID (optional)
# 3. Production DB Password (required)
# 4. Staging DB Password (optional)
```

## Verify Setup

Check your secrets at:
https://github.com/JorisJBackis/webapp/settings/secrets/actions

## Docker Desktop Setup

While Docker installs:

1. **Once installed, open Docker Desktop**
   - It will be in your Applications folder
   - First launch takes a few minutes

2. **Accept Terms**
   - Review and accept the terms

3. **Start Docker**
   - Docker needs to be running for local Supabase

4. **Verify Installation**
   ```bash
   docker --version
   docker ps  # Should show empty list, not error
   ```

## Starting Local Supabase

Once Docker is running:

```bash
# Start local Supabase
supabase start

# This will:
# - Download required Docker images (first time ~5 min)
# - Start all services
# - Show you local URLs and keys

# Access local services:
# Studio UI: http://localhost:54323
# API: http://localhost:54321
```

## Testing Migration Locally

```bash
# Apply migrations
supabase db reset

# This will:
# - Reset local database
# - Apply all migrations in order
# - Show any errors

# Check the result in Studio
# http://localhost:54323
```

## Next Steps

1. ✅ Docker Desktop installed and running
2. ✅ GitHub secrets configured
3. ✅ Local Supabase running
4. ✅ Migrations tested locally
5. 🎯 Create PR to develop branch
6. 🎯 Test on staging
7. 🎯 Merge to production when ready

---

## Troubleshooting

### Docker Issues
```bash
# If Docker daemon not running:
open -a Docker  # Opens Docker Desktop

# If port conflicts:
supabase stop
docker stop $(docker ps -q)  # Stop all containers
supabase start
```

### Supabase Issues
```bash
# Full reset:
supabase stop --no-backup
supabase start

# Check logs:
supabase logs
```

### Migration Issues
```bash
# See what migrations exist:
ls supabase/migrations/

# Apply specific migration:
supabase migration up

# Create new migration:
supabase migration new description_here
```