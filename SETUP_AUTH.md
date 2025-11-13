# Local Supabase Auth & Admin CMS Setup Instructions

This guide will walk you through setting up local Supabase with authentication and the admin CMS for PokerBros.

## Prerequisites

- **Docker Desktop** - Required for local Supabase
- **Supabase CLI** - Already installed ✅
- **@supabase/ssr** - Already installed ✅

## Step 1: Install Docker Desktop

Local Supabase requires Docker to run. Install it from:
https://docs.docker.com/desktop/install/mac-install/

After installing:
1. Open Docker Desktop
2. Wait for it to fully start (you'll see the Docker icon in your menu bar)
3. Make sure Docker is running before proceeding

## Step 2: Start Local Supabase

Once Docker is running, start your local Supabase instance:

```bash
supabase start
```

This will:
- Pull necessary Docker images (first time only - may take a few minutes)
- Start PostgreSQL, Auth, Storage, and other services
- Apply all migrations from `supabase/migrations/`
- Display your local connection details

**Save the output!** You'll need:
- `API URL` - Put this in `NEXT_PUBLIC_SUPABASE_URL`
- `anon key` - Put this in `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 3: Update Environment Variables

Create or update your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key-from-supabase-start>
```

## Step 4: Create Your Superadmin User

### Access the Local Studio

Open the Supabase Studio (web UI) at: http://127.0.0.1:54323

### Create Admin User

1. Go to **Authentication** (left sidebar)
2. Click **Add user** > **Create new user**
3. Enter:
   - Email: `you@example.com`
   - Password: Choose a secure password
   - Check "Auto Confirm User"
4. Click **Create user**
5. Copy the **User ID** (UUID) from the user list

### Add to Admin Table

1. Go to **SQL Editor** in the Studio
2. Run this query (replace `USER_UUID_HERE` with the UUID you copied):

```sql
INSERT INTO admin_users (id, email, is_superadmin)
VALUES ('USER_UUID_HERE', 'you@example.com', TRUE);
```

## Step 5: Test the Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000

3. Click **Admin Login** in the navigation

4. Log in with:
   - Email: `you@example.com`
   - Password: (the password you set)

5. You should be redirected to the Admin CMS at `/admin`

6. Try adding a new player with:
   - First Name
   - Last Name
   - Nickname (optional)
   - Email

## Features Implemented

### Authentication
- ✅ Supabase Auth integration
- ✅ Login/logout functionality
- ✅ Session persistence
- ✅ Admin role system with superadmin support

### Admin CMS
- ✅ Player management (Create, Read, Update, Delete)
- ✅ Protected admin routes (middleware)
- ✅ Admin-only navigation links
- ✅ Role-based access control

### Database
- ✅ Updated player schema (first_name, last_name, nickname, email)
- ✅ Admin users table with superadmin flag
- ✅ Row Level Security policies
- ✅ Admin helper functions

## Adding More Admins (Superadmin Only)

Once you're logged in as superadmin, you can add more admins by:

1. Creating their user account in Supabase Auth dashboard
2. Running this SQL query:

```sql
INSERT INTO admin_users (id, email, is_superadmin)
VALUES ('USER_UUID', 'neweadmin@example.com', FALSE);
```

Set `is_superadmin` to `TRUE` if you want them to be able to add other admins.

## Security Notes

- The admin CMS is protected by middleware that checks authentication and admin status
- All database operations use Row Level Security (RLS)
- Only authenticated admins can view, create, update, or delete players
- Only superadmins can manage other admin accounts

## Useful Local Supabase Commands

```bash
# Start Supabase (run this every time you restart your computer)
supabase start

# Stop Supabase
supabase stop

# View status of all services
supabase status

# Reset database (WARNING: deletes all data and re-runs migrations)
supabase db reset

# Create a new migration
supabase migration new migration_name

# View logs
supabase logs

# Access PostgreSQL directly
supabase db psql
```

## Troubleshooting

### Docker not running
- Make sure Docker Desktop is installed and running
- Check for the Docker icon in your menu bar
- Try restarting Docker Desktop

### "Could not find admin user"
- Make sure you've run the SQL query to insert the user into `admin_users` table
- Verify the user ID matches exactly
- Check you're using the correct local Supabase URL

### Middleware errors
- Make sure you've installed `@supabase/ssr` (already done ✅)
- Check that your `.env.local` file has the correct local Supabase credentials
- Restart your dev server after changing environment variables

### Players not showing
- Check the browser console for errors
- Verify RLS policies are enabled and correct
- Make sure you're logged in as an admin
- Try running `supabase db reset` to reapply migrations

## Next Steps

You can now:
- Add players through the admin CMS
- Update the rest of your application to use the new player schema (first_name, last_name, nickname)
- Add more admin features (game management, etc.)
- Invite other admins to help manage the platform

Enjoy your new admin system! 🎴
