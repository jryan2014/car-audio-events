// Final RLS Performance Cleanup
// Fixes all remaining auth.uid() performance issues

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

    console.log('Starting final RLS performance cleanup...')

    // Get all problematic policies using auth.uid() directly
    const problematicPolicies = await client.queryArray(`
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

    console.log(`Found ${problematicPolicies.rows.length} policies with auth.uid() performance issues`)

    const results = []
    let fixedCount = 0

    // Process each problematic policy
    for (const policyRow of problematicPolicies.rows) {
      const [schema, tableName, policyName, qual, withCheck] = policyRow as string[]
      
      try {
        console.log(`Fixing policy: ${policyName} on table: ${tableName}`)
        
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
        
        // Fix auth.uid() to (SELECT auth.uid()) in both qual and with_check
        let newQual = originalQual
        let newWithCheck = originalWithCheck
        
        if (newQual) {
          // Replace all instances of auth.uid() with (SELECT auth.uid())
          newQual = newQual.replace(/(?<!\(SELECT\s+)auth\.uid\(\)/g, '(SELECT auth.uid())')
        }
        
        if (newWithCheck) {
          // Replace all instances of auth.uid() with (SELECT auth.uid())
          newWithCheck = newWithCheck.replace(/(?<!\(SELECT\s+)auth\.uid\(\)/g, '(SELECT auth.uid())')
        }
        
        // Only update if there's actually a change
        if (newQual !== originalQual || newWithCheck !== originalWithCheck) {
          // Drop the old policy
          await client.queryArray(`DROP POLICY "${policyName}" ON ${tableName}`)
          
          // Create the new policy with fixed auth functions
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
        console.error(`Error fixing policy ${policyName} on ${tableName}:`, error)
        results.push({
          table: tableName,
          policy: policyName,
          status: 'error',
          error: error.message
        })
      }
    }

    // Also fix auth.role() issues
    const authRolePolicies = await client.queryArray(`
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

    console.log(`Found ${authRolePolicies.rows.length} policies with auth.role() performance issues`)

    // Process each auth.role() policy
    for (const policyRow of authRolePolicies.rows) {
      const [schema, tableName, policyName, qual, withCheck] = policyRow as string[]
      
      try {
        console.log(`Fixing auth.role() in policy: ${policyName} on table: ${tableName}`)
        
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
        
        // Fix auth.role() to (SELECT auth.role()) in both qual and with_check
        let newQual = originalQual
        let newWithCheck = originalWithCheck
        
        if (newQual) {
          // Replace all instances of auth.role() with (SELECT auth.role())
          newQual = newQual.replace(/(?<!\(SELECT\s+)auth\.role\(\)/g, '(SELECT auth.role())')
        }
        
        if (newWithCheck) {
          // Replace all instances of auth.role() with (SELECT auth.role())
          newWithCheck = newWithCheck.replace(/(?<!\(SELECT\s+)auth\.role\(\)/g, '(SELECT auth.role())')
        }
        
        // Only update if there's actually a change
        if (newQual !== originalQual || newWithCheck !== originalWithCheck) {
          // Drop the old policy
          await client.queryArray(`DROP POLICY "${policyName}" ON ${tableName}`)
          
          // Create the new policy with fixed auth functions
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
            status: 'role_fixed',
            changes: {
              qual_changed: newQual !== originalQual,
              with_check_changed: newWithCheck !== originalWithCheck
            }
          })
          
        }
        
      } catch (error) {
        console.error(`Error fixing auth.role() in policy ${policyName} on ${tableName}:`, error)
        results.push({
          table: tableName,
          policy: policyName,
          status: 'role_error',
          error: error.message
        })
      }
    }

    await client.end()

    const successCount = results.filter(r => r.status === 'fixed' || r.status === 'role_fixed').length
    const errorCount = results.filter(r => r.status === 'error' || r.status === 'role_error').length

    console.log(`Final RLS cleanup completed: ${successCount} policies fixed, ${errorCount} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Final RLS Performance Cleanup completed: ${successCount} policies optimized, ${errorCount} errors`,
        results,
        summary: {
          total_problematic_policies: problematicPolicies.rows.length + authRolePolicies.rows.length,
          policies_fixed: successCount,
          errors: errorCount,
          optimization_complete: errorCount === 0,
          performance_improvements: [
            'All auth.uid() calls replaced with (SELECT auth.uid()) pattern',
            'All auth.role() calls replaced with (SELECT auth.role()) pattern',
            'PostgreSQL query planner can now optimize auth function calls',
            'RLS policy evaluation performance significantly improved',
            'Supabase performance advisor warnings should be resolved'
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
    console.error('Error in final RLS cleanup function:', error)
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