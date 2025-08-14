// Edge Function to Fix RLS Performance Warnings
// This function addresses Supabase performance advisor warnings about RLS policies

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting RLS performance optimization...')

    // Execute the RLS performance fixes
    const fixes = [
      // Fix 1: Organization Members - Most Critical Performance Issue
      {
        name: 'organization_members_policies',
        sql: `
          -- Drop existing problematic policies
          DROP POLICY IF EXISTS "Members can view organization membership" ON organization_members;
          DROP POLICY IF EXISTS "Members can update their membership" ON organization_members;
          DROP POLICY IF EXISTS "Owners can manage membership" ON organization_members;
          DROP POLICY IF EXISTS "Users can view their memberships" ON organization_members;
          DROP POLICY IF EXISTS "Enable read access for authenticated users" ON organization_members;
          
          -- Create optimized policies using (SELECT auth.uid()) pattern
          CREATE POLICY "organization_members_select_optimized" ON organization_members FOR SELECT USING (
            (SELECT auth.uid()) = user_id::uuid OR
            (SELECT auth.uid()) IN (
              SELECT om.user_id FROM organization_members om
              WHERE om.organization_id = organization_members.organization_id 
              AND om.role IN ('owner', 'admin')
            )
          );
          
          CREATE POLICY "organization_members_insert_optimized" ON organization_members FOR INSERT WITH CHECK (
            (SELECT auth.uid()) IN (
              SELECT om.user_id FROM organization_members om
              WHERE om.organization_id = organization_members.organization_id 
              AND om.role IN ('owner', 'admin')
            ) OR
            (SELECT auth.uid()) = user_id::uuid
          );
          
          CREATE POLICY "organization_members_update_optimized" ON organization_members FOR UPDATE USING (
            (SELECT auth.uid()) IN (
              SELECT om.user_id FROM organization_members om
              WHERE om.organization_id = organization_members.organization_id 
              AND om.role IN ('owner', 'admin')
            ) OR
            ((SELECT auth.uid()) = user_id::uuid AND role NOT IN ('owner'))
          );
          
          CREATE POLICY "organization_members_delete_optimized" ON organization_members FOR DELETE USING (
            (SELECT auth.uid()) IN (
              SELECT om.user_id FROM organization_members om
              WHERE om.organization_id = organization_members.organization_id 
              AND om.role IN ('owner', 'admin')
            ) OR
            (SELECT auth.uid()) = user_id::uuid
          );
        `
      },
      
      // Fix 2: Saved Events
      {
        name: 'saved_events_policies',
        sql: `
          DROP POLICY IF EXISTS "Users can manage their saved events" ON saved_events;
          DROP POLICY IF EXISTS "Users can view their saved events" ON saved_events;
          DROP POLICY IF EXISTS "Enable access for authenticated users" ON saved_events;
          
          CREATE POLICY "saved_events_select_optimized" ON saved_events FOR SELECT USING (
            (SELECT auth.uid()) = user_id::uuid
          );
          
          CREATE POLICY "saved_events_insert_optimized" ON saved_events FOR INSERT WITH CHECK (
            (SELECT auth.uid()) = user_id::uuid
          );
          
          CREATE POLICY "saved_events_delete_optimized" ON saved_events FOR DELETE USING (
            (SELECT auth.uid()) = user_id::uuid
          );
        `
      },
      
      // Fix 3: Competition Results
      {
        name: 'competition_results_policies',
        sql: `
          DROP POLICY IF EXISTS "Users can view competition results" ON competition_results;
          DROP POLICY IF EXISTS "Organizers can manage results" ON competition_results;
          DROP POLICY IF EXISTS "Participants can view their results" ON competition_results;
          
          CREATE POLICY "competition_results_select_optimized" ON competition_results FOR SELECT USING (true);
          
          CREATE POLICY "competition_results_insert_optimized" ON competition_results FOR INSERT WITH CHECK (
            (SELECT auth.uid()) IN (
              SELECT om.user_id FROM organization_members om
              JOIN events e ON e.organization_id = om.organization_id
              WHERE e.id = competition_results.event_id
              AND om.role IN ('owner', 'admin', 'organizer')
            )
          );
          
          CREATE POLICY "competition_results_update_optimized" ON competition_results FOR UPDATE USING (
            (SELECT auth.uid()) IN (
              SELECT om.user_id FROM organization_members om
              JOIN events e ON e.organization_id = om.organization_id
              WHERE e.id = competition_results.event_id
              AND om.role IN ('owner', 'admin', 'organizer')
            )
          );
          
          CREATE POLICY "competition_results_delete_optimized" ON competition_results FOR DELETE USING (
            (SELECT auth.uid()) IN (
              SELECT om.user_id FROM organization_members om
              JOIN events e ON e.organization_id = om.organization_id
              WHERE e.id = competition_results.event_id
              AND om.role IN ('owner', 'admin')
            )
          );
        `
      },
      
      // Fix 4: Activity Logs
      {
        name: 'activity_logs_policies',
        sql: `
          DROP POLICY IF EXISTS "Users can view their activity" ON activity_logs;
          DROP POLICY IF EXISTS "Admins can view all activity" ON activity_logs;
          
          CREATE POLICY "activity_logs_select_optimized" ON activity_logs FOR SELECT USING (
            (SELECT auth.uid()) = user_id::uuid OR
            (SELECT auth.uid()) IN (
              SELECT id::uuid FROM users WHERE role = 'admin'
            )
          );
          
          CREATE POLICY "activity_logs_insert_optimized" ON activity_logs FOR INSERT WITH CHECK (
            (SELECT auth.role()) = 'service_role' OR
            (SELECT auth.uid()) = user_id::uuid
          );
        `
      },
      
      // Fix 5: Payment Audit Logs
      {
        name: 'payment_audit_logs_policies',
        sql: `
          DROP POLICY IF EXISTS "Users can view their payment audit logs" ON payment_audit_logs;
          DROP POLICY IF EXISTS "Service role can manage payment audit logs" ON payment_audit_logs;
          
          CREATE POLICY "payment_audit_logs_select_optimized" ON payment_audit_logs FOR SELECT USING (
            (SELECT auth.uid()) = user_id::uuid OR
            (SELECT auth.uid()) IN (
              SELECT id::uuid FROM users WHERE role IN ('admin', 'support')
            )
          );
          
          CREATE POLICY "payment_audit_logs_insert_optimized" ON payment_audit_logs FOR INSERT WITH CHECK (
            (SELECT auth.role()) = 'service_role'
          );
        `
      }
    ]

    const results = []

    // Execute each fix
    for (const fix of fixes) {
      try {
        console.log(`Applying fix: ${fix.name}`)
        
        const { error } = await supabase.rpc('exec_sql', {
          sql_command: fix.sql
        })

        if (error) {
          console.error(`Error applying ${fix.name}:`, error)
          results.push({
            name: fix.name,
            status: 'error',
            error: error.message
          })
        } else {
          console.log(`Successfully applied ${fix.name}`)
          results.push({
            name: fix.name,
            status: 'success'
          })
        }
      } catch (err) {
        console.error(`Exception applying ${fix.name}:`, err)
        results.push({
          name: fix.name,
          status: 'error',
          error: err.message
        })
      }
    }

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
          total_fixes: fixes.length,
          successful: successCount,
          errors: errorCount,
          performance_improvements: [
            'Auth function calls optimized for better query planning',
            'RLS policy evaluation streamlined with clear conditions',
            'PostgreSQL can now optimize auth function calls',
            'Reduced auth function call overhead'
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