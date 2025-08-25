#!/bin/bash

echo "==================================="
echo "Setting Database Password Secret"
echo "==================================="
echo ""
echo "Enter your Supabase database password"
echo "(The one you use to access your database)"
echo ""
echo -n "Database Password: "
read -s DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Password cannot be empty"
    exit 1
fi

# Set the production database password
gh secret set PRODUCTION_DB_PASSWORD --body="$DB_PASSWORD" && echo "✅ PRODUCTION_DB_PASSWORD set"

echo ""
echo "Do you have a staging branch? (y/n)"
read -r HAS_STAGING

if [ "$HAS_STAGING" = "y" ] || [ "$HAS_STAGING" = "Y" ]; then
    echo ""
    echo -n "Enter Staging Project ID: "
    read STAGING_PROJECT_ID
    
    if [ ! -z "$STAGING_PROJECT_ID" ]; then
        gh secret set STAGING_PROJECT_ID --body="$STAGING_PROJECT_ID" && echo "✅ STAGING_PROJECT_ID set"
        
        echo ""
        echo -n "Enter Staging Database Password (or press Enter to use same as production): "
        read -s STAGING_DB_PASSWORD
        echo ""
        
        if [ -z "$STAGING_DB_PASSWORD" ]; then
            STAGING_DB_PASSWORD="$DB_PASSWORD"
        fi
        
        gh secret set STAGING_DB_PASSWORD --body="$STAGING_DB_PASSWORD" && echo "✅ STAGING_DB_PASSWORD set"
    fi
fi

echo ""
echo "==================================="
echo "✅ GitHub Secrets Setup Complete!"
echo "==================================="
echo ""
echo "Secrets configured:"
echo "- SUPABASE_ACCESS_TOKEN ✅"
echo "- PRODUCTION_PROJECT_ID ✅"
echo "- PRODUCTION_DB_PASSWORD ✅"

if [ ! -z "$STAGING_PROJECT_ID" ]; then
    echo "- STAGING_PROJECT_ID ✅"
    echo "- STAGING_DB_PASSWORD ✅"
fi

echo ""
echo "You can view these at:"
echo "https://github.com/JorisJBackis/webapp/settings/secrets/actions"
echo ""
echo "Your CI/CD pipeline is now ready!"
echo ""
echo "Next steps:"
echo "1. Create a PR to 'develop' branch to test staging deployment"
echo "2. Merge to 'main' to deploy to production"

# Clean up the script for security
rm -f set_db_password.sh