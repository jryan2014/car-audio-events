// Edge Function to Fix RLS Performance Warnings - Direct SQL Approach
// This function addresses Supabase performance advisor warnings about RLS policies

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const databaseUrl = Deno.env.get('SUPABASE_DB_URL')!
    
    const client = new Client(databaseUrl)
    await client.connect()

    console.log('Starting RLS performance optimization...')

    const results = []

    try {
      // Fix 1: Organization Members - Most Critical Performance Issue
      console.log('Fixing organization_members policies...')
      
      await client.queryArray(`
        -- Drop existing problematic policies
        DROP POLICY IF EXISTS "Members can view organization membership" ON organization_members;
        DROP POLICY IF EXISTS "Members can update their membership" ON organization_members;
        DROP POLICY IF EXISTS "Owners can manage membership" ON organization_members;
        DROP POLICY IF EXISTS "Users can view their memberships" ON organization_members;
        DROP POLICY IF EXISTS "Enable read access for authenticated users" ON organization_members;
        DROP POLICY IF EXISTS "Users can view organization membership" ON organization_members;
        DROP POLICY IF EXISTS "Users can manage organization membership" ON organization_members;
      `)
      
      await client.queryArray(`
        -- Create optimized policies using (SELECT auth.uid()) pattern
        CREATE POLICY "organization_members_select_optimized" ON organization_members FOR SELECT USING (
          (SELECT auth.uid()) = user_id::uuid OR
          (SELECT auth.uid()) IN (
            SELECT om.user_id FROM organization_members om
            WHERE om.organization_id = organization_members.organization_id 
            AND om.role IN ('owner', 'admin')
          )
        );
      `)
      
      await client.queryArray(`
        CREATE POLICY "organization_members_insert_optimized" ON organization_members FOR INSERT WITH CHECK (
          (SELECT auth.uid()) IN (
            SELECT om.user_id FROM organization_members om
            WHERE om.organization_id = organization_members.organization_id 
            AND om.role IN ('owner', 'admin')
          ) OR
          (SELECT auth.uid()) = user_id::uuid
        );
      `)
      
      await client.queryArray(`
        CREATE POLICY "organization_members_update_optimized" ON organization_members FOR UPDATE USING (
          (SELECT auth.uid()) IN (
            SELECT om.user_id FROM organization_members om
            WHERE om.organization_id = organization_members.organization_id 
            AND om.role IN ('owner', 'admin')
          ) OR
          ((SELECT auth.uid()) = user_id::uuid AND role NOT IN ('owner'))
        );
      `)
      
      await client.queryArray(`
        CREATE POLICY "organization_members_delete_optimized" ON organization_members FOR DELETE USING (
          (SELECT auth.uid()) IN (
            SELECT om.user_id FROM organization_members om
            WHERE om.organization_id = organization_members.organization_id 
            AND om.role IN ('owner', 'admin')
          ) OR
          (SELECT auth.uid()) = user_id::uuid
        );
      `)
      
      results.push({ name: 'organization_members_policies', status: 'success' })

    } catch (error) {
      results.push({ 
        name: 'organization_members_policies', 
        status: 'error', 
        error: error.message 
      })
    }

    try {
      // Fix 2: Saved Events
      console.log('Fixing saved_events policies...')
      
      await client.queryArray(`
        DROP POLICY IF EXISTS "Users can manage their saved events" ON saved_events;
        DROP POLICY IF EXISTS "Users can view their saved events" ON saved_events;
        DROP POLICY IF EXISTS "Enable access for authenticated users" ON saved_events;
        DROP POLICY IF EXISTS "Users can save events" ON saved_events;
      `)
      
      await client.queryArray(`
        CREATE POLICY "saved_events_select_optimized" ON saved_events FOR SELECT USING (
          (SELECT auth.uid()) = user_id::uuid
        );
      `)
      
      await client.queryArray(`
        CREATE POLICY "saved_events_insert_optimized" ON saved_events FOR INSERT WITH CHECK (
          (SELECT auth.uid()) = user_id::uuid
        );
      `)
      
      await client.queryArray(`
        CREATE POLICY "saved_events_delete_optimized" ON saved_events FOR DELETE USING (
          (SELECT auth.uid()) = user_id::uuid
        );
      `)
      
      results.push({ name: 'saved_events_policies', status: 'success' })

    } catch (error) {
      results.push({ 
        name: 'saved_events_policies', 
        status: 'error', 
        error: error.message 
      })
    }

    try {
      // Fix 3: Competition Results
      console.log('Fixing competition_results policies...')
      
      await client.queryArray(`
        DROP POLICY IF EXISTS "Users can view competition results" ON competition_results;
        DROP POLICY IF EXISTS "Organizers can manage results" ON competition_results;
        DROP POLICY IF EXISTS "Participants can view their results" ON competition_results;
        DROP POLICY IF EXISTS "Public can view competition results" ON competition_results;
      `)
      
      await client.queryArray(`
        CREATE POLICY "competition_results_select_optimized" ON competition_results FOR SELECT USING (true);
      `)
      
      await client.queryArray(`
        CREATE POLICY "competition_results_insert_optimized" ON competition_results FOR INSERT WITH CHECK (
          (SELECT auth.uid()) IN (
            SELECT om.user_id FROM organization_members om
            JOIN events e ON e.organization_id = om.organization_id
            WHERE e.id = competition_results.event_id
            AND om.role IN ('owner', 'admin', 'organizer')
          )
        );
      `)
      
      await client.queryArray(`
        CREATE POLICY "competition_results_update_optimized" ON competition_results FOR UPDATE USING (
          (SELECT auth.uid()) IN (
            SELECT om.user_id FROM organization_members om
            JOIN events e ON e.organization_id = om.organization_id
            WHERE e.id = competition_results.event_id
            AND om.role IN ('owner', 'admin', 'organizer')
          )
        );
      `)
      
      await client.queryArray(`
        CREATE POLICY "competition_results_delete_optimized" ON competition_results FOR DELETE USING (
          (SELECT auth.uid()) IN (
            SELECT om.user_id FROM organization_members om
            JOIN events e ON e.organization_id = om.organization_id
            WHERE e.id = competition_results.event_id
            AND om.role IN ('owner', 'admin')
          )
        );
      `)
      
      results.push({ name: 'competition_results_policies', status: 'success' })

    } catch (error) {
      results.push({ 
        name: 'competition_results_policies', 
        status: 'error', 
        error: error.message 
      })
    }

    try {
      // Fix 4: Activity Logs
      console.log('Fixing activity_logs policies...')
      
      await client.queryArray(`
        DROP POLICY IF EXISTS "Users can view their activity" ON activity_logs;
        DROP POLICY IF EXISTS "Admins can view all activity" ON activity_logs;
        DROP POLICY IF EXISTS "Users can view own activity logs" ON activity_logs;
      `)
      
      await client.queryArray(`
        CREATE POLICY "activity_logs_select_optimized" ON activity_logs FOR SELECT USING (
          (SELECT auth.uid()) = user_id::uuid OR
          (SELECT auth.uid()) IN (
            SELECT id::uuid FROM users WHERE role = 'admin'
          )
        );
      `)
      
      await client.queryArray(`
        CREATE POLICY "activity_logs_insert_optimized" ON activity_logs FOR INSERT WITH CHECK (
          (SELECT auth.role()) = 'service_role' OR
          (SELECT auth.uid()) = user_id::uuid
        );
      `)
      
      results.push({ name: 'activity_logs_policies', status: 'success' })

    } catch (error) {
      results.push({ 
        name: 'activity_logs_policies', 
        status: 'error', 
        error: error.message 
      })
    }

    try {
      // Fix 5: Payment Audit Logs
      console.log('Fixing payment_audit_logs policies...')
      
      await client.queryArray(`
        DROP POLICY IF EXISTS "Users can view their payment audit logs" ON payment_audit_logs;
        DROP POLICY IF EXISTS "Service role can manage payment audit logs" ON payment_audit_logs;
        DROP POLICY IF EXISTS "Admins can view payment audit logs" ON payment_audit_logs;
      `)
      
      await client.queryArray(`
        CREATE POLICY "payment_audit_logs_select_optimized" ON payment_audit_logs FOR SELECT USING (
          (SELECT auth.uid()) = user_id::uuid OR
          (SELECT auth.uid()) IN (
            SELECT id::uuid FROM users WHERE role IN ('admin', 'support')
          )
        );
      `)
      
      await client.queryArray(`
        CREATE POLICY "payment_audit_logs_insert_optimized" ON payment_audit_logs FOR INSERT WITH CHECK (
          (SELECT auth.role()) = 'service_role'
        );
      `)
      
      results.push({ name: 'payment_audit_logs_policies', status: 'success' })

    } catch (error) {
      results.push({ 
        name: 'payment_audit_logs_policies', 
        status: 'error', 
        error: error.message 
      })
    }

    await client.end()

    // Count successful fixes
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    console.log(`RLS Performance Fix Summary: ${successCount} successful, ${errorCount} errors`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `RLS Performance Optimization completed: ${successCount} successful fixes, ${errorCount} errors`,
        results,
        summary: {
          total_fixes: results.length,
          successful: successCount,
          errors: errorCount,
          performance_improvements: [
            'Auth function calls optimized using (SELECT auth.uid()) pattern',
            'RLS policy evaluation streamlined with clear conditions',
            'PostgreSQL can now better optimize auth function calls',
            'Reduced auth function call overhead',
            'Duplicate and problematic policies removed'
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
    console.error('Error in RLS performance fix function:', error)
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