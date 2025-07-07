# 🚀 MCP Database Server Setup Guide

## What is This?
This MCP (Model Context Protocol) server gives Erik (the AI assistant) safe, intelligent access to your Supabase database. It allows for much smarter development decisions while maintaining maximum security.

## 🛡️ Safety Features
- **Write operations enabled** - Full database access with safety checks
- **Hard-coded prohibitions** - Cannot reset or drop database
- **Built-in protections** - SQL injection prevention and input validation
- **Prohibited operations blocked** - DROP, TRUNCATE, DELETE FROM users/events are blocked

## 📋 Simple Setup (One-Time Only)

### Step 1: Install Dependencies
Open your terminal in the project folder and run:
```bash
npm install
```

### Step 2: Verify Environment Variables
Make sure your `.env` file contains:
```
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 3: Create MCP Configuration
The MCP server is configured in `.cursor/mcp.json` with the correct format:
```json
{
  "mcpServers": [
    {
      "name": "car-audio-events-db",
      "command": "npm",
      "args": ["run", "mcp:start"],
      "cwd": ".",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Step 4: Test the MCP Server
Run this command to test:
```bash
npm run mcp:start
```

You should see:
```
🚀 Starting Car Audio Events MCP Server...
🛡️ Production Safety Protocols: ACTIVE
🔓 Read-Only Mode: DISABLED
⚠️  Write Operations: ALLOWED (with safety checks)
✅ MCP Server connected and ready!
```

Press `Ctrl+C` to stop the test.

## 🔧 How It Works

### Automatic Startup
- The MCP server **automatically starts** when you open your project in Cursor
- **No manual commands needed** after initial setup
- **Auto-restarts** if it crashes

### Available Tools
Erik now has access to these **safe database tools** with write capabilities:

1. **inspect_database_schema** - View table structures and columns
2. **analyze_table_data** - Check row counts and sample data
3. **check_rls_policies** - Examine security policies
4. **analyze_relationships** - Map table relationships
5. **query_database_safely** - Execute safe SQL queries (SELECT, INSERT, UPDATE, DELETE allowed)
6. **execute_approved_sql** - Execute approved SQL commands for maintenance
7. **get_database_statistics** - Performance and usage metrics

### Safety Guarantees
- ✅ **Cannot drop or reset database**
- ✅ **Cannot delete user or event data** (DELETE FROM users/events blocked)
- ✅ **Cannot truncate tables** (TRUNCATE operations blocked)
- ✅ **All SQL operations allowed** except prohibited ones
- ✅ **Built-in safety checks** prevent dangerous operations

## 🎯 Benefits for Development

### Smarter AI Assistance
- Erik can see your actual database structure
- Make recommendations based on real data
- Understand table relationships and constraints
- Suggest optimizations based on usage patterns

### Faster Development
- No need to explain database structure
- AI understands your data model
- Better suggestions for queries and schema changes
- Intelligent debugging of database issues

### Enhanced Security Analysis
- AI can analyze RLS policies
- Identify potential security gaps
- Suggest improvements to data protection
- Verify proper access controls

## 🚨 What If Something Goes Wrong?

### Server Won't Start
1. Check your `.env` file has the correct Supabase credentials
2. Run `npm install` to ensure all dependencies are installed
3. Restart Cursor IDE
4. Check that `.cursor/mcp.json` exists and has the correct format

### Connection Issues
1. Verify your Supabase project is accessible
2. Check your internet connection
3. Ensure service role key has proper permissions
4. Check Cursor IDE MCP logs (Cmd+Shift+J → MCP tab)

### Need Help?
- The MCP server logs all operations
- Check the Cursor IDE console for error messages
- All operations are logged with timestamps
- Check MCP logs: `~/Library/Application Support/Cursor/logs/[SESSION_ID]/window[N]/exthost/anysphere.cursor-always-local/Cursor MCP.log`

## 📊 Usage Examples

Once running, Erik can help with:

```
"Show me the structure of the users table"
"How many events are in the database?"
"What RLS policies are protecting the users table?"
"Are there any foreign key relationships I should know about?"
"What's the most common membership type in the users table?"
```

## 🔐 Security Notes

- **Production Safe**: Designed for live database use
- **No Data Risk**: Cannot accidentally delete or modify data
- **Approval Required**: All write operations need your permission
- **Audit Trail**: All operations are logged
- **Automatic Backups**: Required before any schema changes

## ✅ You're All Set!

The MCP server is now properly configured for Cursor IDE and Erik will have safe access to your database for smarter development assistance!

**Next time you open Cursor, the MCP server will automatically connect and Erik will have safe access to your database for smarter development assistance!** 