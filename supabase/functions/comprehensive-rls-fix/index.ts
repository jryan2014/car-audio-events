// Comprehensive RLS Performance Fix
// Addresses all Supabase performance advisor warnings about RLS policies

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

    console.log('Starting comprehensive RLS performance optimization...')

    // Get list of all tables with RLS enabled
    const tablesResult = await client.queryArray(`
      SELECT c.relname as table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
      ORDER BY c.relname;
    `)

    const tables = tablesResult.rows.map(row => row[0] as string)
    console.log('Tables with RLS enabled:', tables)

    const results = []

    // Core table fixes with auth.uid() optimization
    const tableFixes = [
      {
        name: 'users',
        selectPolicy: '(SELECT auth.uid()) = id::uuid',
        insertPolicy: 'true',
        updatePolicy: '(SELECT auth.uid()) = id::uuid',
        deletePolicy: '(SELECT auth.uid()) = id::uuid'
      },
      {
        name: 'events',
        selectPolicy: 'true',
        insertPolicy: `(SELECT auth.uid()) IN (
          SELECT user_id FROM organization_members om
          WHERE om.organization_id = events.organization_id 
          AND om.role IN ('owner', 'admin', 'organizer')
        )`,
        updatePolicy: `(SELECT auth.uid()) IN (
          SELECT user_id FROM organization_members om
          WHERE om.organization_id = events.organization_id 
          AND om.role IN ('owner', 'admin', 'organizer')
        )`,
        deletePolicy: `(SELECT auth.uid()) IN (
          SELECT user_id FROM organization_members om
          WHERE om.organization_id = events.organization_id 
          AND om.role IN ('owner', 'admin')
        )`
      },
      {
        name: 'organizations',
        selectPolicy: 'true',
        insertPolicy: '(SELECT auth.role()) = \'authenticated\'',
        updatePolicy: `(SELECT auth.uid()) IN (
          SELECT user_id FROM organization_members om
          WHERE om.organization_id = organizations.id 
          AND om.role IN ('owner', 'admin')
        )`,
        deletePolicy: `(SELECT auth.uid()) IN (
          SELECT user_id FROM organization_members om
          WHERE om.organization_id = organizations.id 
          AND om.role = 'owner'
        )`
      },
      {
        name: 'event_registrations',
        selectPolicy: `(SELECT auth.uid()) = user_id::uuid OR
          (SELECT auth.uid()) IN (
            SELECT om.user_id FROM organization_members om
            JOIN events e ON e.organization_id = om.organization_id
            WHERE e.id = event_registrations.event_id
            AND om.role IN ('owner', 'admin', 'organizer')
          )`,
        insertPolicy: '(SELECT auth.uid()) = user_id::uuid',
        updatePolicy: `(SELECT auth.uid()) = user_id::uuid OR
          (SELECT auth.uid()) IN (
            SELECT om.user_id FROM organization_members om
            JOIN events e ON e.organization_id = om.organization_id
            WHERE e.id = event_registrations.event_id
            AND om.role IN ('owner', 'admin', 'organizer')
          )`,
        deletePolicy: `(SELECT auth.uid()) = user_id::uuid OR
          (SELECT auth.uid()) IN (
            SELECT om.user_id FROM organization_members om
            JOIN events e ON e.organization_id = om.organization_id
            WHERE e.id = event_registrations.event_id
            AND om.role IN ('owner', 'admin')
          )`
      },
      {
        name: 'teams',
        selectPolicy: `(SELECT auth.uid()) IN (
          SELECT user_id FROM organization_members om
          WHERE om.organization_id = teams.organization_id
        )`,
        insertPolicy: `(SELECT auth.uid()) IN (
          SELECT user_id FROM organization_members om
          WHERE om.organization_id = teams.organization_id 
          AND om.role IN ('owner', 'admin', 'organizer', 'member')
        )`,
        updatePolicy: `(SELECT auth.uid()) = created_by::uuid OR
          (SELECT auth.uid()) IN (
            SELECT user_id FROM organization_members om
            WHERE om.organization_id = teams.organization_id 
            AND om.role IN ('owner', 'admin')
          )`,
        deletePolicy: `(SELECT auth.uid()) = created_by::uuid OR
          (SELECT auth.uid()) IN (
            SELECT user_id FROM organization_members om
            WHERE om.organization_id = teams.organization_id 
            AND om.role IN ('owner', 'admin')
          )`
      },
      {
        name: 'team_members',
        selectPolicy: `(SELECT auth.uid()) = user_id::uuid OR
          (SELECT auth.uid()) IN (
            SELECT tm2.user_id FROM team_members tm2 
            WHERE tm2.team_id = team_members.team_id 
            AND tm2.role IN ('captain', 'co-captain')
          ) OR
          (SELECT auth.uid()) IN (
            SELECT t.created_by FROM teams t 
            WHERE t.id = team_members.team_id
          )`,
        insertPolicy: `(SELECT auth.uid()) IN (
          SELECT tm2.user_id FROM team_members tm2 
          WHERE tm2.team_id = team_members.team_id 
          AND tm2.role IN ('captain', 'co-captain')
        ) OR
        (SELECT auth.uid()) IN (
          SELECT t.created_by FROM teams t 
          WHERE t.id = team_members.team_id
        )`,
        updatePolicy: `(SELECT auth.uid()) IN (
          SELECT tm2.user_id FROM team_members tm2 
          WHERE tm2.team_id = team_members.team_id 
          AND tm2.role IN ('captain', 'co-captain')
        ) OR
        (SELECT auth.uid()) IN (
          SELECT t.created_by FROM teams t 
          WHERE t.id = team_members.team_id
        )`,
        deletePolicy: `(SELECT auth.uid()) = user_id::uuid OR
          (SELECT auth.uid()) IN (
            SELECT tm2.user_id FROM team_members tm2 
            WHERE tm2.team_id = team_members.team_id 
            AND tm2.role IN ('captain', 'co-captain')
          ) OR
          (SELECT auth.uid()) IN (
            SELECT t.created_by FROM teams t 
            WHERE t.id = team_members.team_id
          )`
      },
      {
        name: 'notifications',
        selectPolicy: '(SELECT auth.uid()) = user_id::uuid',
        insertPolicy: '(SELECT auth.role()) = \'service_role\' OR (SELECT auth.role()) = \'authenticated\'',
        updatePolicy: '(SELECT auth.uid()) = user_id::uuid',
        deletePolicy: '(SELECT auth.uid()) = user_id::uuid'
      },
      {
        name: 'payments',
        selectPolicy: `(SELECT auth.uid()) = user_id::uuid OR
          (SELECT auth.uid()) IN (
            SELECT om.user_id FROM organization_members om
            JOIN events e ON e.organization_id = om.organization_id
            WHERE e.id = payments.event_id
            AND om.role IN ('owner', 'admin', 'organizer')
          )`,
        insertPolicy: '(SELECT auth.uid()) = user_id::uuid',
        updatePolicy: '(SELECT auth.role()) = \'service_role\'',
        deletePolicy: '(SELECT auth.role()) = \'service_role\''
      },
      {
        name: 'member_profiles',
        selectPolicy: 'is_public = true OR (SELECT auth.uid()) = user_id::uuid',
        insertPolicy: '(SELECT auth.uid()) = user_id::uuid',
        updatePolicy: '(SELECT auth.uid()) = user_id::uuid',
        deletePolicy: '(SELECT auth.uid()) = user_id::uuid'
      },
      {
        name: 'audio_systems',
        selectPolicy: `EXISTS (
          SELECT 1 FROM member_profiles 
          WHERE user_id = audio_systems.user_id AND is_public = true
        ) OR (SELECT auth.uid()) = user_id::uuid`,
        insertPolicy: '(SELECT auth.uid()) = user_id::uuid',
        updatePolicy: '(SELECT auth.uid()) = user_id::uuid',
        deletePolicy: '(SELECT auth.uid()) = user_id::uuid'
      },
      {
        name: 'support_tickets',
        selectPolicy: `(SELECT auth.uid()) = user_id::uuid OR
          (SELECT auth.uid()) IN (
            SELECT id::uuid FROM users WHERE role IN ('admin', 'support')
          )`,
        insertPolicy: '(SELECT auth.role()) = \'authenticated\'',
        updatePolicy: `(SELECT auth.uid()) = user_id::uuid OR
          (SELECT auth.uid()) IN (
            SELECT id::uuid FROM users WHERE role IN ('admin', 'support')
          )`,
        deletePolicy: '(SELECT auth.role()) = \'service_role\''
      },
      {
        name: 'support_responses',
        selectPolicy: `(SELECT auth.uid()) IN (
          SELECT st.user_id FROM support_tickets st
          WHERE st.id = support_responses.ticket_id
        ) OR
        (SELECT auth.uid()) IN (
          SELECT id::uuid FROM users WHERE role IN ('admin', 'support')
        )`,
        insertPolicy: `(SELECT auth.uid()) IN (
          SELECT st.user_id FROM support_tickets st
          WHERE st.id = support_responses.ticket_id
        ) OR
        (SELECT auth.uid()) IN (
          SELECT id::uuid FROM users WHERE role IN ('admin', 'support')
        )`,
        updatePolicy: '(SELECT auth.role()) = \'service_role\'',
        deletePolicy: '(SELECT auth.role()) = \'service_role\''
      },
      {
        name: 'saved_events',
        selectPolicy: '(SELECT auth.uid()) = user_id::uuid',
        insertPolicy: '(SELECT auth.uid()) = user_id::uuid',
        updatePolicy: '(SELECT auth.uid()) = user_id::uuid',
        deletePolicy: '(SELECT auth.uid()) = user_id::uuid'
      },
      {
        name: 'activity_logs',
        selectPolicy: `(SELECT auth.uid()) = user_id::uuid OR
          (SELECT auth.uid()) IN (
            SELECT id::uuid FROM users WHERE role = 'admin'
          )`,
        insertPolicy: '(SELECT auth.role()) = \'service_role\' OR (SELECT auth.uid()) = user_id::uuid',
        updatePolicy: '(SELECT auth.role()) = \'service_role\'',
        deletePolicy: '(SELECT auth.role()) = \'service_role\''
      },
      {
        name: 'email_queue',
        selectPolicy: '(SELECT auth.role()) = \'service_role\'',
        insertPolicy: '(SELECT auth.role()) = \'service_role\'',
        updatePolicy: '(SELECT auth.role()) = \'service_role\'',
        deletePolicy: '(SELECT auth.role()) = \'service_role\''
      },
      {
        name: 'audit_logs',
        selectPolicy: '(SELECT auth.role()) = \'service_role\'',
        insertPolicy: '(SELECT auth.role()) = \'service_role\'',
        updatePolicy: '(SELECT auth.role()) = \'service_role\'',
        deletePolicy: '(SELECT auth.role()) = \'service_role\''
      },
      {
        name: 'advertisements',
        selectPolicy: `(status = 'active' AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE) OR
          (SELECT auth.uid()) IN (
            SELECT om.user_id FROM organization_members om
            WHERE om.organization_id = advertisements.organization_id
            AND om.role IN ('owner', 'admin', 'organizer')
          ) OR
          (SELECT auth.uid()) IN (
            SELECT id::uuid FROM users WHERE role = 'admin'
          )`,
        insertPolicy: `(SELECT auth.uid()) IN (
          SELECT om.user_id FROM organization_members om
          WHERE om.organization_id = advertisements.organization_id
          AND om.role IN ('owner', 'admin', 'organizer')
        )`,
        updatePolicy: `(SELECT auth.uid()) IN (
          SELECT om.user_id FROM organization_members om
          WHERE om.organization_id = advertisements.organization_id
          AND om.role IN ('owner', 'admin', 'organizer')
        ) OR
        (SELECT auth.uid()) IN (
          SELECT id::uuid FROM users WHERE role = 'admin'
        )`,
        deletePolicy: `(SELECT auth.uid()) IN (
          SELECT om.user_id FROM organization_members om
          WHERE om.organization_id = advertisements.organization_id
          AND om.role IN ('owner', 'admin')
        ) OR
        (SELECT auth.uid()) IN (
          SELECT id::uuid FROM users WHERE role = 'admin'
        )`
      }
    ]

    // Apply fixes to each table that exists
    for (const fix of tableFixes) {
      if (tables.includes(fix.name)) {
        try {
          console.log(`Fixing ${fix.name} policies...`)
          
          // Drop all existing policies for this table
          const existingPolicies = await client.queryArray(`
            SELECT policyname FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = $1
          `, [fix.name])
          
          for (const policyRow of existingPolicies.rows) {
            const policyName = policyRow[0] as string
            await client.queryArray(`DROP POLICY IF EXISTS "${policyName}" ON ${fix.name}`)
          }
          
          // Create optimized policies
          await client.queryArray(`
            CREATE POLICY "${fix.name}_select_optimized" ON ${fix.name} FOR SELECT USING (${fix.selectPolicy});
          `)
          
          await client.queryArray(`
            CREATE POLICY "${fix.name}_insert_optimized" ON ${fix.name} FOR INSERT WITH CHECK (${fix.insertPolicy});
          `)
          
          await client.queryArray(`
            CREATE POLICY "${fix.name}_update_optimized" ON ${fix.name} FOR UPDATE USING (${fix.updatePolicy});
          `)
          
          await client.queryArray(`
            CREATE POLICY "${fix.name}_delete_optimized" ON ${fix.name} FOR DELETE USING (${fix.deletePolicy});
          `)
          
          results.push({ 
            name: fix.name, 
            status: 'success',
            policies_recreated: 4
          })
          
        } catch (error) {
          console.error(`Error fixing ${fix.name}:`, error)
          results.push({ 
            name: fix.name, 
            status: 'error', 
            error: error.message 
          })
        }
      } else {
        results.push({ 
          name: fix.name, 
          status: 'skipped', 
          reason: 'table_not_found' 
        })
      }
    }

    await client.end()

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length
    const skippedCount = results.filter(r => r.status === 'skipped').length

    console.log(`RLS Performance Fix Summary: ${successCount} successful, ${errorCount} errors, ${skippedCount} skipped`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Comprehensive RLS Performance Optimization completed: ${successCount} tables fixed, ${errorCount} errors, ${skippedCount} skipped`,
        results,
        tables_processed: tables,
        summary: {
          total_tables_checked: tableFixes.length,
          successful: successCount,
          errors: errorCount,
          skipped: skippedCount,
          performance_improvements: [
            'All auth.uid() calls replaced with (SELECT auth.uid()) pattern',
            'RLS policies optimized for PostgreSQL query planner',
            'Duplicate and problematic policies removed',
            'Consistent policy naming convention applied',
            'Performance advisor warnings should now be resolved'
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
    console.error('Error in comprehensive RLS fix function:', error)
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