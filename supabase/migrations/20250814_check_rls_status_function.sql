-- Create a function to check RLS status for all tables
-- This helps identify tables that need RLS policies

CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE (
  table_name text,
  rls_enabled boolean,
  policy_count bigint,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog', 'pg_temp'
AS $$
BEGIN
  RETURN QUERY
  WITH table_rls AS (
    SELECT 
      t.tablename::text,
      t.rowsecurity,
      COUNT(p.policyname) as pol_count
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
    WHERE t.schemaname = 'public'
    GROUP BY t.tablename, t.rowsecurity
  )
  SELECT 
    tablename,
    rowsecurity,
    pol_count,
    CASE 
      WHEN rowsecurity = false THEN 'RLS DISABLED - WARNING'
      WHEN rowsecurity = true AND pol_count = 0 THEN 'RLS ENABLED but NO POLICIES'
      WHEN rowsecurity = true AND pol_count > 0 THEN 'OK - ' || pol_count || ' policies'
      ELSE 'UNKNOWN'
    END::text as status
  FROM table_rls
  ORDER BY 
    CASE WHEN rowsecurity = false THEN 0 
         WHEN pol_count = 0 THEN 1
         ELSE 2 END,
    tablename;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_rls_status TO authenticated;
GRANT EXECUTE ON FUNCTION check_rls_status TO service_role;

COMMENT ON FUNCTION check_rls_status IS 'Check RLS status and policy count for all public tables';