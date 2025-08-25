#!/bin/bash

# GitHub Secrets Setup Script for FootyLabs
# This script will help you set up the required GitHub secrets for CI/CD

echo "==================================="
echo "GitHub Secrets Setup for FootyLabs"
echo "==================================="
echo ""

# Check if we're in the right repository
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
if [ "$REPO" != "JorisJBackis/webapp" ]; then
    echo "❌ Error: Not in the webapp repository or gh CLI not configured"
    echo "Please run this from the webapp directory"
    exit 1
fi

echo "✅ Repository: $REPO"
echo ""

# Production project ID (already known)
PRODUCTION_PROJECT_ID="jbqljjyctbsyawijlxfa"

echo "Setting up GitHub secrets for CI/CD..."
echo ""
echo "You'll need the following from your Supabase dashboard:"
echo "1. Supabase Access Token (from Account Settings > Access Tokens)"
echo "2. Staging Project ID (after creating a staging branch)"
echo "3. Database passwords for staging and production"
echo ""
echo "Press Enter to continue..."
read

# Get Supabase Access Token
echo -n "Enter your Supabase Access Token: "
read -s SUPABASE_ACCESS_TOKEN
echo ""

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ Access token cannot be empty"
    exit 1
fi

# Get Staging Project ID
echo -n "Enter your Staging Project ID (leave blank to skip): "
read STAGING_PROJECT_ID
echo ""

# Get Database Passwords
echo -n "Enter Production Database Password: "
read -s PRODUCTION_DB_PASSWORD
echo ""

echo -n "Enter Staging Database Password (leave blank to skip): "
read -s STAGING_DB_PASSWORD
echo ""

echo ""
echo "Creating GitHub secrets..."

# Create secrets
gh secret set SUPABASE_ACCESS_TOKEN --body="$SUPABASE_ACCESS_TOKEN" && echo "✅ SUPABASE_ACCESS_TOKEN set"
gh secret set PRODUCTION_PROJECT_ID --body="$PRODUCTION_PROJECT_ID" && echo "✅ PRODUCTION_PROJECT_ID set"
gh secret set PRODUCTION_DB_PASSWORD --body="$PRODUCTION_DB_PASSWORD" && echo "✅ PRODUCTION_DB_PASSWORD set"

if [ ! -z "$STAGING_PROJECT_ID" ]; then
    gh secret set STAGING_PROJECT_ID --body="$STAGING_PROJECT_ID" && echo "✅ STAGING_PROJECT_ID set"
fi

if [ ! -z "$STAGING_DB_PASSWORD" ]; then
    gh secret set STAGING_DB_PASSWORD --body="$STAGING_DB_PASSWORD" && echo "✅ STAGING_DB_PASSWORD set"
fi

echo ""
echo "==================================="
echo "✅ GitHub secrets setup complete!"
echo "==================================="
echo ""
echo "Secrets created:"
echo "- SUPABASE_ACCESS_TOKEN"
echo "- PRODUCTION_PROJECT_ID ($PRODUCTION_PROJECT_ID)"
echo "- PRODUCTION_DB_PASSWORD"
if [ ! -z "$STAGING_PROJECT_ID" ]; then
    echo "- STAGING_PROJECT_ID ($STAGING_PROJECT_ID)"
fi
if [ ! -z "$STAGING_DB_PASSWORD" ]; then
    echo "- STAGING_DB_PASSWORD"
fi
echo ""
echo "You can view these in: https://github.com/JorisJBackis/webapp/settings/secrets/actions"