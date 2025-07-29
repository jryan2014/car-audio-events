# Supabase MCP Server Setup Guide

## ✅ What I've Done

1. **Installed the Enhanced PostgreSQL MCP Server**
   ```bash
   npm install -g enhanced-postgres-mcp-server
   ```

2. **Updated Claude Desktop Configuration**
   - Location: `C:\Users\jryan\AppData\Roaming\Claude\claude_desktop_config.json`
   - Added the Supabase PostgreSQL MCP server configuration

## ⚠️ What You Need to Do

### 1. Get Your Database Password

You need to get your Supabase database password. Here's how:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/nqvisvranvjaghvrdaaz
2. Navigate to **Settings** → **Database**
3. Find the **Connection string** section
4. Copy the password from the connection string

### 2. Update the MCP Configuration

Open the file: `C:\Users\jryan\AppData\Roaming\Claude\claude_desktop_config.json`

Replace `password` in the connection string with your actual database password:

```json
{
  "mcpServers": {
    "MCP_DOCKER": {
      "command": "docker",
      "args": ["run", "-l", "mcp.client=claude-desktop", "--rm", "-i", "alpine/socat", "STDIO", "TCP:host.docker.internal:8811"]
    },
    "supabase-postgres": {
      "command": "npx",
      "args": [
        "-y",
        "enhanced-postgres-mcp-server",
        "--connectionString",
        "postgresql://postgres.nqvisvranvjaghvrdaaz:YOUR_ACTUAL_PASSWORD_HERE@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
      ]
    }
  }
}
```

### 3. Restart Claude Desktop

After updating the configuration:
1. Close Claude Desktop completely
2. Restart Claude Desktop
3. The MCP server should now be available

## 🔍 Verifying the Setup

Once you've completed the setup and restarted Claude Desktop:

1. Run `/mcp` command in Claude to see available MCP servers
2. You should see `supabase-postgres` listed
3. The MCP server will allow direct database queries without schema cache issues

## 🚀 Benefits

With the Supabase MCP server configured, you'll be able to:
- Run direct SQL queries without using `exec_sql` RPC
- Avoid schema cache issues with PostgREST
- Get real-time database information
- Execute DDL commands directly
- Better debugging capabilities

## 📝 Notes

- The enhanced PostgreSQL MCP server supports both read and write operations
- It's based on the official @modelcontextprotocol/server-postgres by Anthropic
- The connection uses the Supabase pooler for better performance
- Keep your database password secure and never commit it to version control

## 🔐 Security Reminder

**IMPORTANT**: Never share your database password or commit it to Git. The MCP configuration file is local to your machine and not part of the project repository.