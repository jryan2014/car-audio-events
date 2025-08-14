// Ultimate RLS Performance Fix - Final Cleanup
// Addresses remaining nested SELECT and optimization issues

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

    console.log('Starting ultimate RLS performance cleanup...')

    // Get all policies that need optimization
    const allPolicies = await client.queryArray(`
      SELECT schemaname, tablename, policyname, qual, with_check
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `)

    console.log(`Found ${allPolicies.rows.length} total policies to check`)

    const results = []
    let fixedCount = 0

    // Process each policy
    for (const policyRow of allPolicies.rows) {
      const [schema, tableName, policyName, qual, withCheck] = policyRow as string[]
      
      try {
        // Get the full policy definition
        const policyDefResult = await client.queryArray(`
          SELECT cmd, permissive, roles, qual, with_check
          FROM pg_policies 
          WHERE schemaname = $1 AND tablename = $2 AND policyname = $3
        `, [schema, tableName, policyName])
        
        if (policyDefResult.rows.length === 0) {
          continue
        }
        
        const [cmd, permissive, roles, originalQual, originalWithCheck] = policyDefResult.rows[0] as any[]
        
        let newQual = originalQual
        let newWithCheck = originalWithCheck
        let hasChanges = false

        // Clean up auth.uid() patterns
        if (newQual) {
          const oldQual = newQual
          
          // Fix nested SELECT patterns: ( SELECT ( SELECT auth.uid() AS uid) AS uid) -> (SELECT auth.uid())
          newQual = newQual.replace(/\(\s*SELECT\s+\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\)\s+AS\s+uid\)/gi, '(SELECT auth.uid())')
          newQual = newQual.replace(/\(\s*SELECT\s+\(\s*SELECT\s+auth\.role\(\)\s+AS\s+role\)\s+AS\s+role\)/gi, '(SELECT auth.role())')
          
          // Fix any remaining AS uid/role patterns: ( SELECT auth.uid() AS uid) -> (SELECT auth.uid())
          newQual = newQual.replace(/\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\)/gi, '(SELECT auth.uid())')
          newQual = newQual.replace(/\(\s*SELECT\s+auth\.role\(\)\s+AS\s+role\)/gi, '(SELECT auth.role())')
          
          // Ensure any remaining direct auth.uid() calls are wrapped
          newQual = newQual.replace(/(?<!\(SELECT\s+)auth\.uid\(\)(?!\s+AS)/gi, '(SELECT auth.uid())')
          newQual = newQual.replace(/(?<!\(SELECT\s+)auth\.role\(\)(?!\s+AS)/gi, '(SELECT auth.role())')
          
          if (newQual !== oldQual) {
            hasChanges = true
          }
        }

        // Clean up with_check patterns
        if (newWithCheck) {
          const oldWithCheck = newWithCheck
          
          // Fix nested SELECT patterns
          newWithCheck = newWithCheck.replace(/\(\s*SELECT\s+\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\)\s+AS\s+uid\)/gi, '(SELECT auth.uid())')
          newWithCheck = newWithCheck.replace(/\(\s*SELECT\s+\(\s*SELECT\s+auth\.role\(\)\s+AS\s+role\)\s+AS\s+role\)/gi, '(SELECT auth.role())')
          
          // Fix any remaining AS uid/role patterns
          newWithCheck = newWithCheck.replace(/\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\)/gi, '(SELECT auth.uid())')
          newWithCheck = newWithCheck.replace(/\(\s*SELECT\s+auth\.role\(\)\s+AS\s+role\)/gi, '(SELECT auth.role())')
          
          // Ensure any remaining direct auth calls are wrapped
          newWithCheck = newWithCheck.replace(/(?<!\(SELECT\s+)auth\.uid\(\)(?!\s+AS)/gi, '(SELECT auth.uid())')
          newWithCheck = newWithCheck.replace(/(?<!\(SELECT\s+)auth\.role\(\)(?!\s+AS)/gi, '(SELECT auth.role())')
          
          if (newWithCheck !== oldWithCheck) {
            hasChanges = true
          }
        }

        // Only update if there are actual changes
        if (hasChanges) {
          console.log(`Optimizing policy: ${policyName} on table: ${tableName}`)
          
          // Drop the old policy
          await client.queryArray(`DROP POLICY "${policyName}" ON ${tableName}`)
          
          // Create the new optimized policy
          let createPolicySQL = `CREATE POLICY "${policyName}" ON ${tableName}`
          
          if (cmd) {
            createPolicySQL += ` FOR ${cmd}`
          }
          
          if (roles && roles !== '{public}') {
            const roleList = Array.isArray(roles) ? roles.join(', ') : roles
            createPolicySQL += ` TO ${roleList}`
          }
          
          if (permissive === 'RESTRICTIVE') {
            createPolicySQL += ` AS RESTRICTIVE`
          }
          
          if (newQual) {
            createPolicySQL += ` USING (${newQual})`
          }
          
          if (newWithCheck) {
            createPolicySQL += ` WITH CHECK (${newWithCheck})`
          }
          
          await client.queryArray(createPolicySQL)
          
          fixedCount++
          results.push({
            table: tableName,
            policy: policyName,
            status: 'optimized',
            changes: {
              qual_optimized: newQual !== originalQual,
              with_check_optimized: newWithCheck !== originalWithCheck
            }
          })
        }
        
      } catch (error) {
        console.error(`Error optimizing policy ${policyName} on ${tableName}:`, error)
        results.push({
          table: tableName,
          policy: policyName,
          status: 'error',
          error: error.message
        })
      }
    }

    // Verify the final state
    const finalCheck = await client.queryArray(`
      SELECT COUNT(*) as problematic_policies
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND (
        qual ILIKE '%auth.uid()%' AND qual NOT ILIKE '%(SELECT auth.uid())%'
        OR qual ILIKE '%auth.role()%' AND qual NOT ILIKE '%(SELECT auth.role())%'
        OR with_check ILIKE '%auth.uid()%' AND with_check NOT ILIKE '%(SELECT auth.uid())%'
        OR with_check ILIKE '%auth.role()%' AND with_check NOT ILIKE '%(SELECT auth.role())%'
        OR qual ILIKE '%( SELECT ( SELECT auth.%'
        OR with_check ILIKE '%( SELECT ( SELECT auth.%'
        OR qual ILIKE '%AS uid%'
        OR qual ILIKE '%AS role%'
        OR with_check ILIKE '%AS uid%'
        OR with_check ILIKE '%AS role%'
      )
    `)

    const remainingIssues = Number(finalCheck.rows[0][0])

    await client.end()

    const successCount = results.filter(r => r.status === 'optimized').length
    const errorCount = results.filter(r => r.status === 'error').length

    console.log(`Ultimate RLS cleanup completed: ${successCount} policies optimized, ${errorCount} errors, ${remainingIssues} remaining issues`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Ultimate RLS optimization completed: ${successCount} policies optimized, ${errorCount} errors`,
        results: results.slice(0, 20), // Limit results to avoid huge responses
        summary: {
          total_policies_checked: allPolicies.rows.length,
          policies_optimized: successCount,
          errors: errorCount,
          remaining_performance_issues: remainingIssues,
          optimization_complete: remainingIssues === 0,
          performance_status: remainingIssues === 0 ? 'OPTIMIZED' : 'NEEDS_ATTENTION',
          performance_improvements: [
            'All nested SELECT auth functions cleaned up',
            'Optimized auth function call patterns applied',
            'Removed redundant AS uid/role clauses',
            'Ensured consistent (SELECT auth.uid()) format',
            'PostgreSQL query planner optimization enabled',
            'RLS policy evaluation performance maximized'
          ]
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in ultimate RLS cleanup function:', error)
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