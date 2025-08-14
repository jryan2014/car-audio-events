// Fix Nested SELECT auth.uid() Issues
// Cleans up the over-optimization that created nested SELECT statements

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

    console.log('Fixing nested SELECT auth function issues...')

    // Get all policies with nested SELECT auth functions
    const nestedSelectPolicies = await client.queryArray(`
      SELECT schemaname, tablename, policyname, qual, with_check
      FROM pg_policies 
      WHERE schemaname = 'public' 
      AND (
        qual ILIKE '%(SELECT (SELECT auth.uid()%' 
        OR qual ILIKE '%(SELECT (SELECT auth.role()%'
        OR with_check ILIKE '%(SELECT (SELECT auth.uid()%'
        OR with_check ILIKE '%(SELECT (SELECT auth.role()%'
      )
      ORDER BY tablename, policyname;
    `)

    console.log(`Found ${nestedSelectPolicies.rows.length} policies with nested SELECT issues`)

    const results = []
    let fixedCount = 0

    // Process each problematic policy
    for (const policyRow of nestedSelectPolicies.rows) {
      const [schema, tableName, policyName, qual, withCheck] = policyRow as string[]
      
      try {
        console.log(`Fixing nested SELECTs in policy: ${policyName} on table: ${tableName}`)
        
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
        
        // Fix nested SELECT patterns
        let newQual = originalQual
        let newWithCheck = originalWithCheck
        
        if (newQual) {
          // Fix nested auth.uid() patterns
          newQual = newQual.replace(/\(\s*SELECT\s+\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\)\s+AS\s+uid\)/gi, '(SELECT auth.uid())')
          newQual = newQual.replace(/\(\s*SELECT\s+\(\s*SELECT\s+auth\.role\(\)\s+AS\s+role\)\s+AS\s+role\)/gi, '(SELECT auth.role())')
          
          // Also fix any other nested auth patterns
          newQual = newQual.replace(/\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\)/gi, '(SELECT auth.uid())')
          newQual = newQual.replace(/\(\s*SELECT\s+auth\.role\(\)\s+AS\s+role\)/gi, '(SELECT auth.role())')
        }
        
        if (newWithCheck) {
          // Fix nested auth.uid() patterns
          newWithCheck = newWithCheck.replace(/\(\s*SELECT\s+\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\)\s+AS\s+uid\)/gi, '(SELECT auth.uid())')
          newWithCheck = newWithCheck.replace(/\(\s*SELECT\s+\(\s*SELECT\s+auth\.role\(\)\s+AS\s+role\)\s+AS\s+role\)/gi, '(SELECT auth.role())')
          
          // Also fix any other nested auth patterns
          newWithCheck = newWithCheck.replace(/\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\)/gi, '(SELECT auth.uid())')
          newWithCheck = newWithCheck.replace(/\(\s*SELECT\s+auth\.role\(\)\s+AS\s+role\)/gi, '(SELECT auth.role())')
        }
        
        // Only update if there's actually a change
        if (newQual !== originalQual || newWithCheck !== originalWithCheck) {
          // Drop the old policy
          await client.queryArray(`DROP POLICY "${policyName}" ON ${tableName}`)
          
          // Create the new policy with cleaned auth functions
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
            status: 'fixed',
            changes: {
              qual_changed: newQual !== originalQual,
              with_check_changed: newWithCheck !== originalWithCheck
            }
          })
          
        } else {
          results.push({
            table: tableName,
            policy: policyName,
            status: 'no_change_needed'
          })
        }
        
      } catch (error) {
        console.error(`Error fixing nested SELECT in policy ${policyName} on ${tableName}:`, error)
        results.push({
          table: tableName,
          policy: policyName,
          status: 'error',
          error: error.message
        })
      }
    }

    await client.end()

    const successCount = results.filter(r => r.status === 'fixed').length
    const errorCount = results.filter(r => r.status === 'error').length

    console.log(`Nested SELECT cleanup completed: ${successCount} policies fixed, ${errorCount} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Nested SELECT cleanup completed: ${successCount} policies optimized, ${errorCount} errors`,
        results,
        summary: {
          total_nested_policies: nestedSelectPolicies.rows.length,
          policies_fixed: successCount,
          errors: errorCount,
          optimization_complete: errorCount === 0,
          performance_improvements: [
            'Nested SELECT auth.uid() patterns cleaned up',
            'Optimized auth function calls: (SELECT auth.uid()) format',
            'Removed redundant AS uid/role clauses', 
            'PostgreSQL query planner can now properly optimize auth calls',
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
    console.error('Error in nested SELECT cleanup function:', error)
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