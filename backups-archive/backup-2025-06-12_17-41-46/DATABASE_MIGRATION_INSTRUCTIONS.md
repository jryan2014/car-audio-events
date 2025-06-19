# Database Migration Instructions

## Error: Column users.first_name does not exist

You're seeing this error because the new user fields haven't been added to your database yet. Follow these steps to add the required fields:

## Step 1: Run the Migration Script

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project: https://nqvisvranvjaghvrdaaz.supabase.co

2. **Open the SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste the Migration Script**
   - Open the file `database/migrations/add_user_fields.sql`
   - Copy the entire contents
   - Paste it into the SQL Editor

4. **Run the Migration**
   - Click the "Run" button (or press Ctrl+Enter)
   - Wait for the query to complete
   - You should see "Success" messages

## Step 2: Verify the Changes

After running the migration, verify that the new columns were added:

```sql
-- Run this query to check the new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY column_name;
```

You should see these new columns:
- `first_name` (text)
- `last_name` (text)
- `address` (text)
- `city` (text)
- `state` (text)
- `zip` (text)
- `competition_type` (text)
- `team_id` (uuid)
- `updated_at` (timestamp with time zone)

## Step 3: Verify Teams Table

Check that the teams table was created:

```sql
-- Check teams table
SELECT * FROM teams;
```

You should see 5 sample teams created.

## Step 4: Test the Application

1. **Refresh your browser** or restart the development server
2. **Navigate to Admin Users** - The error should be gone
3. **Test the new functionality:**
   - Click the eye icon to view user details
   - Click the edit icon to edit a user
   - Try creating a new user with the new fields

## What the Migration Does

The migration script:

1. **Adds new columns to the users table:**
   - Personal info: first_name, last_name, address, city, state, zip
   - Competition info: competition_type, team_id
   - Tracking: updated_at timestamp

2. **Creates a teams table** with sample data

3. **Sets up proper relationships** between users and teams

4. **Adds database triggers** to automatically update the updated_at timestamp

5. **Configures Row Level Security (RLS)** for the teams table

6. **Populates existing users** with sample data by splitting the name field

## Rollback (if needed)

If you need to rollback the changes:

```sql
-- Remove new columns (be careful - this will delete data!)
ALTER TABLE users 
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS last_name,
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS state,
DROP COLUMN IF EXISTS zip,
DROP COLUMN IF EXISTS competition_type,
DROP COLUMN IF EXISTS team_id,
DROP COLUMN IF EXISTS updated_at;

-- Drop teams table
DROP TABLE IF EXISTS teams CASCADE;

-- Drop the trigger and function
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();
```

## Troubleshooting

**If you get permission errors:**
- Make sure you're connected as the project owner or have sufficient permissions
- Try running the migration in smaller chunks

**If some columns already exist:**
- The script uses `IF NOT EXISTS` so it's safe to run multiple times

**If the application still shows errors:**
- Clear your browser cache
- Restart the development server: `npm run dev`
- Check the browser console for any additional errors

**If you see TypeScript errors:**
- The components now include fallback handling for missing fields
- The app should work with both old and new database schemas during the transition

## Support

If you encounter any issues:

1. Check the Supabase dashboard logs
2. Look at the browser console for errors
3. Verify the migration completed successfully
4. Test with a simple query to ensure the database connection works 