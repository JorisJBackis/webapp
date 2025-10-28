# Email Notification System Setup Guide

This guide explains how to set up the email notification system for the admin approval workflow.

## Overview

The system sends automated emails for:
1. **Admin notifications** - When a new user registers
2. **User approval** - When an admin approves a user
3. **User rejection** - When an admin rejects a user

## Architecture

- **Email Service**: Office365 SMTP (already configured in Supabase)
- **Email Templates**: HTML templates in `/lib/email/templates.ts`
- **API Routes**: Next.js API routes in `/app/api/emails/`
- **Database Triggers**: PostgreSQL functions that call the API routes

## Setup Steps

### 1. Add Environment Variables

Add these variables to your `.env.local` file (use `.env.example` as reference):

```env
# Email Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=danius.jean@footylabs.ai
SMTP_PASSWORD=your-password-here
SMTP_SENDER_EMAIL=noreply@footylabs.ai
SMTP_SENDER_NAME=Footy Labs

# Email API Secret (generate a random string)
EMAIL_API_SECRET_KEY=your-random-secret-key-here

# Site URL (for email links)
NEXT_PUBLIC_SITE_URL=https://footylabs.ai
```

### 2. Run the Database Migration

In the Supabase SQL Editor, run the migration:

```sql
-- Copy and paste the contents of supabase/migrations/email_notifications.sql
```

This will:
- Enable the `pg_net` extension
- Create the email trigger functions
- Update `approve_user` and `reject_user` functions
- Create a trigger for new user registrations

### 3. Configure Supabase Database Settings

In Supabase Dashboard → Database → Settings → Custom Postgres Config, add:

```sql
-- Set your production site URL
ALTER DATABASE postgres SET app.settings.site_url = 'https://footylabs.ai';

-- Set your email API secret (same as EMAIL_API_SECRET_KEY in .env)
ALTER DATABASE postgres SET app.settings.email_api_secret = 'your-random-secret-key-here';
```

**Important**: These settings are used by the database functions to call your API routes.

### 4. Add Environment Variables to Vercel

In your Vercel project settings → Environment Variables, add:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_SENDER_EMAIL`
- `SMTP_SENDER_NAME`
- `EMAIL_API_SECRET_KEY`
- `NEXT_PUBLIC_SITE_URL`

### 5. Verify Admin Users

Make sure there are admin users in the `admin_users` table, otherwise new registration emails won't be sent:

```sql
-- Check if you're an admin
SELECT * FROM admin_users;

-- If not, add yourself as admin (replace with your user ID)
INSERT INTO admin_users (id) VALUES ('your-user-id-from-auth-users');
```

## How It Works

### New User Registration
1. User signs up → profile created with `approval_status = 'pending'`
2. Database trigger fires → `notify_admins_new_registration()`
3. Function calls `/api/emails/notify-admin` via HTTP
4. API route sends email to all admins

### User Approval
1. Admin clicks "Approve" in admin panel
2. `approve_user()` function is called
3. Updates profile to `approved`
4. Calls `/api/emails/notify-approval` via HTTP
5. API route sends welcome email to user

### User Rejection
1. Admin clicks "Reject" with reason
2. `reject_user()` function is called
3. Updates profile to `rejected` with reason
4. Calls `/api/emails/notify-rejection` via HTTP
5. API route sends rejection email to user with reason

## Email Templates

All email templates are in `/lib/email/templates.ts` and use your Footy Labs branding:

- Responsive HTML design
- Footy Labs logo
- Branded colors (#2563eb blue)
- Clear call-to-action buttons
- Professional styling

## Security

- **API Secret**: Email API routes are protected with `EMAIL_API_SECRET_KEY`
- **SMTP Credentials**: Stored encrypted in Supabase settings
- **Database Functions**: Use `SECURITY DEFINER` to safely call API routes
- **Admin-only**: Only users in `admin_users` table can approve/reject

## Testing

### Test Email Configuration

You can test the email system locally:

```bash
# Start the dev server
pnpm dev

# In another terminal, test the API route
curl -X POST http://localhost:3000/api/emails/notify-admin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-key" \
  -d '{
    "userEmail": "test@example.com",
    "userType": "scout",
    "registeredAt": "2025-01-15T10:00:00Z"
  }'
```

### Test Full Workflow

1. Register a new user → check admin email
2. Approve user in admin panel → check user email
3. Reject user in admin panel → check user email with reason

## Troubleshooting

### Emails not sending?

1. **Check SMTP credentials** in `.env.local`
2. **Verify Supabase database settings** (`app.settings.site_url` and `app.settings.email_api_secret`)
3. **Check Vercel environment variables** (production)
4. **Check API route logs** in Vercel or console
5. **Verify admin users exist** in `admin_users` table

### Check pg_net extension

```sql
-- Verify pg_net is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_net';

-- Check recent HTTP requests
SELECT * FROM extensions.http_log ORDER BY created_at DESC LIMIT 10;
```

### Check email API logs

In Vercel or local console, you should see:
- `Admin notification emails sent to X admins for user: email@example.com`
- `Approval notification sent to: email@example.com`
- `Rejection notification sent to: email@example.com`

## Customization

### Update Email Templates

Edit `/lib/email/templates.ts` to customize:
- Email content and wording
- Styling and colors
- Logo and branding
- Button text and links

### Add More Email Types

1. Create new template in `/lib/email/templates.ts`
2. Create new API route in `/app/api/emails/`
3. Call from database function or application code

## Notes

- Email delivery time: ~1-5 seconds
- Office365 SMTP limit: Check your plan
- Emails are sent asynchronously via database triggers
- Failed emails are logged in `extensions.http_log`