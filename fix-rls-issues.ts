import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing VITE_SUPABASE_URL in environment variables');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment variables');
  console.error('Please add it to your .env file:');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function enableRLSAndCreatePolicies() {
  console.log('🔄 Connecting to Supabase...');
  
  try {
    // Test connection
    const { data: testData, error: testError } = await supabase.from('refunds').select('count').limit(1);
    if (testError && !testError.message.includes('row-level security')) {
      console.error('❌ Connection test failed:', testError);
      return;
    }
    console.log('✅ Connected to Supabase successfully');

    // Enable RLS on refunds table
    console.log('\n🔒 Enabling RLS on refunds table...');
    const { error: refundsRLSError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;'
    });
    
    if (refundsRLSError) {
      console.error('❌ Failed to enable RLS on refunds:', refundsRLSError);
    } else {
      console.log('✅ RLS enabled on refunds table');
    }

    // Enable RLS on payment_provider_configs table
    console.log('\n🔒 Enabling RLS on payment_provider_configs table...');
    const { error: configRLSError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE public.payment_provider_configs ENABLE ROW LEVEL SECURITY;'
    });
    
    if (configRLSError) {
      console.error('❌ Failed to enable RLS on payment_provider_configs:', configRLSError);
    } else {
      console.log('✅ RLS enabled on payment_provider_configs table');
    }

    // Create RLS policies for refunds table
    console.log('\n📝 Creating RLS policies for refunds table...');
    
    // Policy 1: Users can view their own refunds
    const { error: refundSelectError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Users can view their own refunds" 
        ON public.refunds 
        FOR SELECT 
        USING (auth.uid() = user_id);
      `
    });
    
    if (refundSelectError && !refundSelectError.message.includes('already exists')) {
      console.error('❌ Failed to create refund select policy:', refundSelectError);
    } else {
      console.log('✅ Created policy: Users can view their own refunds');
    }

    // Policy 2: Admins can view all refunds
    const { error: refundAdminSelectError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Admins can view all refunds" 
        ON public.refunds 
        FOR SELECT 
        USING (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
          )
        );
      `
    });
    
    if (refundAdminSelectError && !refundAdminSelectError.message.includes('already exists')) {
      console.error('❌ Failed to create admin refund select policy:', refundAdminSelectError);
    } else {
      console.log('✅ Created policy: Admins can view all refunds');
    }

    // Policy 3: Admins can insert refunds
    const { error: refundInsertError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Admins can create refunds" 
        ON public.refunds 
        FOR INSERT 
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
          )
        );
      `
    });
    
    if (refundInsertError && !refundInsertError.message.includes('already exists')) {
      console.error('❌ Failed to create refund insert policy:', refundInsertError);
    } else {
      console.log('✅ Created policy: Admins can create refunds');
    }

    // Policy 4: Admins can update refunds
    const { error: refundUpdateError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Admins can update refunds" 
        ON public.refunds 
        FOR UPDATE 
        USING (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
          )
        );
      `
    });
    
    if (refundUpdateError && !refundUpdateError.message.includes('already exists')) {
      console.error('❌ Failed to create refund update policy:', refundUpdateError);
    } else {
      console.log('✅ Created policy: Admins can update refunds');
    }

    // Create RLS policies for payment_provider_configs table
    console.log('\n📝 Creating RLS policies for payment_provider_configs table...');
    
    // Policy 1: Anyone can read payment provider configs (they're public settings)
    const { error: configSelectError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Anyone can view payment configs" 
        ON public.payment_provider_configs 
        FOR SELECT 
        USING (true);
      `
    });
    
    if (configSelectError && !configSelectError.message.includes('already exists')) {
      console.error('❌ Failed to create config select policy:', configSelectError);
    } else {
      console.log('✅ Created policy: Anyone can view payment configs');
    }

    // Policy 2: Only admins can modify payment configs
    const { error: configModifyError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Admins can modify payment configs" 
        ON public.payment_provider_configs 
        FOR ALL 
        USING (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
          )
        );
      `
    });
    
    if (configModifyError && !configModifyError.message.includes('already exists')) {
      console.error('❌ Failed to create config modify policy:', configModifyError);
    } else {
      console.log('✅ Created policy: Admins can modify payment configs');
    }

    // Verify RLS is enabled
    console.log('\n🔍 Verifying RLS status...');
    const { data: rlsStatus, error: rlsStatusError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('refunds', 'payment_provider_configs');
      `
    });

    if (rlsStatusError) {
      console.error('❌ Failed to check RLS status:', rlsStatusError);
    } else {
      console.log('\n📊 RLS Status:');
      console.table(rlsStatus);
    }

    console.log('\n✅ RLS configuration completed successfully!');
    console.log('The Supabase security errors should now be resolved.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
enableRLSAndCreatePolicies();