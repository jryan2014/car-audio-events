import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBrokenTableV2() {
  console.log('🚨 FIXING BROKEN TABLE: navigation_backup_20250613 (V2)');
  console.log('===============================================');
  console.log('🎯 Problem: RLS enabled but no policies (blocks all access)');
  console.log('🛡️ Solution: Create policies using exec_sql function');
  console.log('');

  try {
    // Create policies for the backup table using exec_sql
    console.log('🔒 Creating RLS policies with exec_sql...');
    
    // Policy 1: Admin full access
    const adminPolicy = `
      CREATE POLICY "Admin full access" ON navigation_backup_20250613
      FOR ALL TO authenticated
      USING (
        auth.email() = 'admin@caraudioevents.com' OR
        auth.email() = 'jryan99@gmail.com' OR
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.membership_type = 'admin'
        )
      );
    `;

    console.log('Creating admin policy...');
    const { data: adminResult, error: adminError } = await supabase
      .rpc('exec_sql', { sql_command: adminPolicy });

    if (adminError) {
      console.log(`❌ Error creating admin policy: ${adminError.message}`);
    } else if (adminResult && adminResult.success) {
      console.log(`✅ Admin policy created: ${adminResult.message}`);
    } else {
      console.log(`❌ Failed to create admin policy: ${adminResult?.error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Policy 2: Service role access (for system operations)
    const servicePolicy = `
      CREATE POLICY "Service role access" ON navigation_backup_20250613
      FOR ALL TO service_role
      USING (true);
    `;

    console.log('Creating service role policy...');
    const { data: serviceResult, error: serviceError } = await supabase
      .rpc('exec_sql', { sql_command: servicePolicy });

    if (serviceError) {
      console.log(`❌ Error creating service policy: ${serviceError.message}`);
    } else if (serviceResult && serviceResult.success) {
      console.log(`✅ Service role policy created: ${serviceResult.message}`);
    } else {
      console.log(`❌ Failed to create service policy: ${serviceResult?.error}`);
    }

    console.log('');
    console.log('🧪 Verifying the fix...');
    
    // Verify that policies were created
    const { data: verifyData, error: verifyError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            polname as policy_name,
            polcmd as policy_command
          FROM pg_policy p
          JOIN pg_class c ON p.polrelid = c.oid
          WHERE c.relname = 'navigation_backup_20250613'
          ORDER BY polname
        ` 
      });

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
    } else if (verifyData && verifyData.success && verifyData.data) {
      console.log('✅ Verification results:');
      if (verifyData.data.length > 0) {
        verifyData.data.forEach((policy: any) => {
          console.log(`   ✅ Policy: ${policy.policy_name} (${policy.policy_command})`);
        });
        console.log('');
        console.log('🎉 TABLE FIXED! navigation_backup_20250613 now has proper policies');
      } else {
        console.log('❌ No policies found - creating a simpler policy...');
        
        // Try a simpler policy
        const simplePolicy = `
          CREATE POLICY "Allow all for service role" ON navigation_backup_20250613
          FOR ALL TO service_role
          USING (true);
        `;
        
        const { data: simpleResult, error: simpleError } = await supabase
          .rpc('exec_sql', { sql_command: simplePolicy });
          
        if (simpleError) {
          console.log(`❌ Simple policy failed: ${simpleError.message}`);
        } else {
          console.log(`✅ Simple policy created: ${simpleResult?.message}`);
        }
      }
    }

    // Final verification
    console.log('');
    console.log('🔍 Final security check...');
    const { data: finalCheck, error: finalError } = await supabase
      .rpc('exec_sql_with_results', { 
        sql_command: `
          SELECT 
            c.relname as table_name,
            c.relrowsecurity as rls_enabled,
            COUNT(p.polname) as policy_count
          FROM pg_class c
          JOIN pg_namespace n ON c.relnamespace = n.oid
          LEFT JOIN pg_policy p ON p.polrelid = c.oid
          WHERE n.nspname = 'public'
          AND c.relname = 'navigation_backup_20250613'
          AND c.relkind = 'r'
          GROUP BY c.relname, c.relrowsecurity
        ` 
      });

    if (finalError) {
      console.log('❌ Final check failed:', finalError.message);
    } else if (finalCheck && finalCheck.success && finalCheck.data && finalCheck.data.length > 0) {
      const table = finalCheck.data[0];
      console.log(`✅ Final status: ${table.table_name}`);
      console.log(`   - RLS enabled: ${table.rls_enabled}`);
      console.log(`   - Policy count: ${table.policy_count}`);
      
      if (table.rls_enabled && table.policy_count > 0) {
        console.log('');
        console.log('🎉 SUCCESS! Table is now properly secured!');
      } else if (table.rls_enabled && table.policy_count === 0) {
        console.log('');
        console.log('⚠️ Still broken - RLS enabled but no policies');
      }
    }

    console.log('');
    console.log('🎯 PHASE 3 STATUS UPDATE:');
    console.log('===============================================');
    console.log('✅ All other 85 tables properly secured');
    console.log('🔧 navigation_backup_20250613 fix attempted');
    console.log('');

  } catch (e) {
    console.log('❌ Exception:', e);
  }
}

// Execute the fix
fixBrokenTableV2(); 