# Complete Setup Guide for Car Audio Events Platform

## What's Happening?
The login is failing because no admin user exists in your database yet. You need to create the first admin user before you can log in.

## Step-by-Step Solution

### Option 1: Use the Easy Button (Recommended)
1. **Open your browser** and go to: `http://localhost:5173/login`
2. **Look for the blue box** that says "Admin Login" at the top of the login form
3. **Click the green "Create Admin User" button** - this will automatically create the admin user for you
4. **Wait for the success message** that says "Admin user created successfully!"
5. **The login form will auto-fill** with the correct credentials
6. **Click "Sign In"** to log in

### Option 2: Manual Command (If the button doesn't work)

#### Step 1: Find Your Environment Variables
1. **Open your project folder** in your file explorer
2. **Look for a file called `.env`** (it might be hidden - show hidden files if needed)
3. **Open the `.env` file** with any text editor (Notepad, VS Code, etc.)
4. **Find these two lines:**
   ```
   VITE_SUPABASE_URL=https://something.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   ```
5. **Copy these values** - you'll need them for the next step

#### Step 2: Open Terminal/Command Prompt
- **Windows:** Press `Windows + R`, type `cmd`, press Enter
- **Mac:** Press `Cmd + Space`, type `terminal`, press Enter
- **Linux:** Press `Ctrl + Alt + T`

#### Step 3: Run the Command
**Copy this command and replace the placeholders:**

```bash
curl -X POST "YOUR_SUPABASE_URL/functions/v1/create-admin-user" -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" -H "Content-Type: application/json"
```

**Example of what it should look like:**
```bash
curl -X POST "https://mpewqdnoyuutexadhljd.supabase.co/functions/v1/create-admin-user" -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZXdxZG5veXV1dGV4YWRobGpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2MDcyNzEsImV4cCI6MjA0OTE4MzI3MX0.abc123..." -H "Content-Type: application/json"
```

**Steps:**
1. **Replace `YOUR_SUPABASE_URL`** with your actual URL from the `.env` file
2. **Replace `YOUR_SUPABASE_ANON_KEY`** with your actual key from the `.env` file
3. **Paste the complete command** into your terminal
4. **Press Enter**
5. **You should see a success message** like: `{"success":true,"message":"Admin user created successfully"}`

#### Step 4: Log In
1. **Go back to the login page:** `http://localhost:5173/login`
2. **Enter these credentials:**
   - **Email:** `admin@caraudioevents.com`
   - **Password:** `TempAdmin123!`
3. **Click "Sign In"**
4. **You should be logged in successfully!**

## Important Security Note
After your first login, you'll be prompted to change the password from `TempAdmin123!` to something more secure. Please do this immediately!

## Troubleshooting

### If the curl command doesn't work:
- Make sure you copied the URL and key exactly from your `.env` file
- Make sure there are no extra spaces or line breaks
- Make sure you're connected to the internet
- Try the "Create Admin User" button on the login page instead

### If you can't find the `.env` file:
- It might be named `.env.local` or `.env.example`
- Make sure to show hidden files in your file explorer
- Check if you have a `.env.example` file that you need to copy and rename to `.env`

### If login still fails:
- Double-check you're using `TempAdmin123!` as the password (with exclamation mark)
- Make sure the email is exactly `admin@caraudioevents.com`
- Try refreshing the page and logging in again

## What This Does
This process creates:
1. An admin user in your Supabase authentication system
2. A user profile in your database
3. Admin permissions for that user
4. Allows you to access the admin dashboard

Once you're logged in, you can create other users, manage events, and use all the platform features!