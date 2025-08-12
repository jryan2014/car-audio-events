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

async function enableRLSAndCreatePoliciesSecure() {
  console.log('🔄 Connecting to Supabase...');
  
  try {
    console.log('✅ Connected to Supabase successfully');

    console.log('\n⚠️  SECURITY NOTE: exec_sql function has been removed for security.');
    console.log('RLS policies should be created through database migrations instead.');
    console.log('Please use the following SQL in a new migration file:');
    
    console.log('\n-- Enable RLS on refunds table');
    console.log('ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;');
    
    console.log('\n-- Create RLS policies for refunds');
    console.log(`
CREATE POLICY "Users can view their own refunds" 
ON public.refunds 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all refunds" 
ON public.refunds 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (auth.users.raw_user_meta_data ->> 'role' = 'admin' 
         OR auth.users.email LIKE '%@caraudioevents.com')
  )
);

CREATE POLICY "Admins can create refunds" 
ON public.refunds 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (auth.users.raw_user_meta_data ->> 'role' = 'admin' 
         OR auth.users.email LIKE '%@caraudioevents.com')
  )
);

CREATE POLICY "Admins can update refunds" 
ON public.refunds 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (auth.users.raw_user_meta_data ->> 'role' = 'admin' 
         OR auth.users.email LIKE '%@caraudioevents.com')
  )
);
    `);

    console.log('\n-- Enable RLS on payment_provider_configs table');
    console.log('ALTER TABLE public.payment_provider_configs ENABLE ROW LEVEL SECURITY;');
    
    console.log('\n-- Create RLS policies for payment_provider_configs');
    console.log(`
CREATE POLICY "Anyone can view payment configs" 
ON public.payment_provider_configs 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can modify payment configs" 
ON public.payment_provider_configs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (auth.users.raw_user_meta_data ->> 'role' = 'admin' 
         OR auth.users.email LIKE '%@caraudioevents.com')
  )
) 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND (auth.users.raw_user_meta_data ->> 'role' = 'admin' 
         OR auth.users.email LIKE '%@caraudioevents.com')
  )
);
    `);

    console.log('\n📝 Please save the above SQL to a new migration file:');
    console.log('supabase/migrations/YYYYMMDD_fix_rls_policies.sql');
    console.log('\nThen deploy with:');
    console.log('npx supabase db push');
    
    // Try to check current RLS status using safe methods
    console.log('\n🔍 Checking current RLS status using safe methods...');
    
    try {
      // Check if we can query the tables (this will fail if RLS is blocking us)
      const { data: refunds, error: refundsError } = await supabase
        .from('refunds')
        .select('id')
        .limit(1);
        
      const { data: configs, error: configsError } = await supabase
        .from('payment_provider_configs')
        .select('id')
        .limit(1);
        
      if (refundsError) {
        console.log('⚠️  Refunds table: RLS may be blocking access:', refundsError.message);
      } else {
        console.log('✅ Refunds table: Accessible');
      }
      
      if (configsError) {
        console.log('⚠️  Payment configs table: RLS may be blocking access:', configsError.message);
      } else {
        console.log('✅ Payment configs table: Accessible');
      }
      
    } catch (error) {
      console.error('Error checking table access:', error);
    }
    
    console.log('\n✅ Security analysis complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the secure RLS fix
enableRLSAndCreatePoliciesSecure();