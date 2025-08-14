// RLS Performance Verification Function
// Checks for remaining performance issues and validates fixes

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const databaseUrl = Deno.env.get('SUPABASE_DB_URL')!
    const client = new Client(databaseUrl)
    await client.connect()

    console.log('Starting RLS performance verification...')

    // Check for policies using auth.uid() directly (performance issue)
    const directAuthUidPolicies = await client.queryArray(`
      SELECT schemaname, tablename, policyname, qual, with_check
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND (
        qual ILIKE '%auth.uid()%' AND qual NOT ILIKE '%(SELECT auth.uid())%'
        OR 
        with_check ILIKE '%auth.uid()%' AND with_check NOT ILIKE '%(SELECT auth.uid())%'
      )
      ORDER BY tablename, policyname;
    `)

    // Check for policies using auth.role() directly (potential performance issue)
    const directAuthRolePolicies = await client.queryArray(`
      SELECT schemaname, tablename, policyname, qual, with_check
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND (
        qual ILIKE '%auth.role()%' AND qual NOT ILIKE '%(SELECT auth.role())%'
        OR 
        with_check ILIKE '%auth.role()%' AND with_check NOT ILIKE '%(SELECT auth.role())%'
      )
      ORDER BY tablename, policyname;
    `)

    // Check for duplicate policies (same table with multiple permissive policies)
    const duplicatePolicies = await client.queryArray(`
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies 
      WHERE schemaname = 'public'
      AND permissive = 'PERMISSIVE'
      GROUP BY tablename, cmd
      HAVING COUNT(*) > 1
      ORDER BY policy_count DESC, tablename;
    `)

    // Check total policy count per table
    const policyCountByTable = await client.queryArray(`
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies 
      WHERE schemaname = 'public'
      GROUP BY tablename
      ORDER BY policy_count DESC;
    `)

    // Check tables with RLS enabled
    const rlsEnabledTables = await client.queryArray(`
      SELECT c.relname as table_name,
             CASE WHEN c.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      ORDER BY c.relname;
    `)

    // Check for recently optimized policies (our naming convention)
    const optimizedPolicies = await client.queryArray(`
      SELECT tablename, COUNT(*) as optimized_policy_count
      FROM pg_policies 
      WHERE schemaname = 'public'
      AND policyname LIKE '%_optimized'
      GROUP BY tablename
      ORDER BY optimized_policy_count DESC;
    `)

    await client.end()

    const performanceIssues = {
      direct_auth_uid: directAuthUidPolicies.rows.map(row => ({
        schema: row[0],
        table: row[1],
        policy: row[2],
        qual: row[3],
        with_check: row[4]
      })),
      direct_auth_role: directAuthRolePolicies.rows.map(row => ({
        schema: row[0],
        table: row[1],
        policy: row[2],
        qual: row[3],
        with_check: row[4]
      })),
      duplicate_policies: duplicatePolicies.rows.map(row => ({
        table: row[0],
        policy_count: Number(row[1])
      })),
      excessive_policies: policyCountByTable.rows
        .filter(row => Number(row[1]) > 8)
        .map(row => ({
          table: row[0],
          policy_count: Number(row[1])
        }))
    }

    const stats = {
      total_tables: rlsEnabledTables.rows.length,
      rls_enabled_tables: rlsEnabledTables.rows.filter(row => row[1] === 'ENABLED').length,
      optimized_tables: optimizedPolicies.rows.length,
      total_policies: policyCountByTable.rows.reduce((sum, row) => sum + Number(row[1]), 0),
      optimized_policies: optimizedPolicies.rows.reduce((sum, row) => sum + Number(row[1]), 0)
    }

    const remainingIssues = 
      performanceIssues.direct_auth_uid.length + 
      performanceIssues.direct_auth_role.length + 
      performanceIssues.duplicate_policies.length

    return new Response(
      JSON.stringify({
        success: true,
        message: remainingIssues === 0 
          ? "✅ No RLS performance issues detected!" 
          : `⚠️ Found ${remainingIssues} potential performance issues`,
        performance_status: remainingIssues === 0 ? "OPTIMIZED" : "NEEDS_ATTENTION",
        performance_issues: performanceIssues,
        statistics: stats,
        recommendations: remainingIssues > 0 ? [
          "Run additional optimization passes for remaining tables",
          "Review duplicate policies and consolidate where possible",
          "Consider using (SELECT auth.uid()) pattern for better performance"
        ] : [
          "RLS performance is optimized",
          "Monitor Supabase performance advisor for new warnings",
          "Regular policy review recommended"
        ],
        tables_processed: rlsEnabledTables.rows.map(row => ({
          name: row[0],
          rls_status: row[1]
        })),
        optimized_tables: optimizedPolicies.rows.map(row => ({
          table: row[0],
          optimized_policies: Number(row[1])
        }))
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in RLS verification function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})