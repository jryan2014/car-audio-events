# MCP Scripts Update Guide - Removing exec_sql Usage

## Overview

The MCP (Model Context Protocol) scripts in `src/mcp/` use `exec_sql` for database operations. Since we've removed `exec_sql` from the database for security, these scripts need updating.

## Important Context

1. **MCP scripts are utility/investigation tools**, not production code
2. They're used for:
   - Database schema inspection
   - Security analysis
   - Development/debugging tasks
3. **Low priority** since they don't affect end users

## Migration Strategy

### Option 1: Use Direct Supabase Client (Recommended for Safe Queries)

For SELECT queries and safe operations, use the Supabase client directly:

```typescript
// BEFORE (using exec_sql)
const { data, error } = await supabase.rpc('exec_sql', { 
  sql_command: 'SELECT * FROM users LIMIT 10' 
});

// AFTER (using Supabase client)
const { data, error } = await supabase
  .from('users')
  .select('*')
  .limit(10);
```

### Option 2: Create a Development-Only exec_sql (For MCP Scripts Only)

If these scripts absolutely need dynamic SQL for investigation:

```sql
-- Create a restricted version ONLY for development
CREATE OR REPLACE FUNCTION dev_exec_sql_readonly(sql_command text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog', 'pg_temp'
AS $$
DECLARE
  result json;
BEGIN
  -- Only allow SELECT statements
  IF NOT (sql_command ~* '^\s*SELECT' AND 
          sql_command !~* '(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)') THEN
    RAISE EXCEPTION 'Only SELECT queries allowed in dev_exec_sql_readonly';
  END IF;
  
  -- Execute and return as JSON
  EXECUTE 'SELECT json_agg(row_to_json(t)) FROM (' || sql_command || ') t' INTO result;
  RETURN result;
END;
$$;

-- Grant ONLY to service role (not to authenticated users)
REVOKE ALL ON FUNCTION dev_exec_sql_readonly FROM public;
REVOKE ALL ON FUNCTION dev_exec_sql_readonly FROM authenticated;
```

### Option 3: Use Our New Safe Functions

For specific operations, use the safe functions we created:

- `notify_schema_cache_reload()` - Force schema cache refresh
- `safe_vacuum_analyze(table_name)` - Safe table maintenance

## Files That Need Updating

### High Priority (Actually used):
1. `src/mcp/server.ts` - Main MCP server with database tools

### Low Priority (One-time investigation scripts):
- All files in `src/mcp/` that contain `exec_sql`
- These are mostly historical investigation scripts
- Can be updated if/when needed

## Example Updates

### For server.ts - inspect_database_schema tool:

```typescript
// BEFORE
const { data, error } = await supabase.rpc('exec_sql', { 
  sql_command: `
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = $1
  `,
  params: [tableName]
});

// AFTER - Option 1: Use information_schema view directly
const { data, error } = await supabase
  .from('information_schema.columns')
  .select('column_name, data_type, is_nullable')
  .eq('table_schema', 'public')
  .eq('table_name', tableName);

// AFTER - Option 2: Create a safe function
CREATE FUNCTION get_table_schema(p_table_name text)
RETURNS TABLE(column_name text, data_type text, is_nullable text)
LANGUAGE sql STABLE
AS $$
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = p_table_name;
$$;
```

## Recommendation

1. **For now**: Leave MCP scripts as-is since they're not user-facing
2. **If needed**: Implement Option 2 (dev_exec_sql_readonly) for investigation tools
3. **Long term**: Gradually migrate to Option 1 (direct Supabase client) where possible

## Security Note

- Never expose any exec_sql-like function to authenticated users
- These tools should only be accessible to developers with service role access
- Consider removing old investigation scripts that are no longer needed

---

*Last Updated: January 2025*