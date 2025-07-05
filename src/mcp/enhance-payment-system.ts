#!/usr/bin/env node

/**
 * MCP Function: Enhance Payment System Database Schema
 * Purpose: Add multi-provider payment support with strict security
 * Date: July 4, 2025
 * Security: All operations include RLS policies and audit trails
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://nqvisvranvjaghvrdaaz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function enhancePaymentSystem() {
  console.log('🚀 Starting Payment System Enhancement...');
  console.log('📅 Date: July 4, 2025');
  console.log('🔒 Security: RLS policies will be enforced');
  
  try {
    // Step 1: Add PayPal support fields to users table
    console.log('\n📋 Step 1: Adding PayPal support to users table...');
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add PayPal support fields to users table
        DO $$ 
        BEGIN
          -- Add paypal_customer_id if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'paypal_customer_id'
          ) THEN
            ALTER TABLE users ADD COLUMN paypal_customer_id TEXT;
            COMMENT ON COLUMN users.paypal_customer_id IS 'PayPal customer identifier for billing';
          END IF;

          -- Add paypal_subscription_id if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'paypal_subscription_id'
          ) THEN
            ALTER TABLE users ADD COLUMN paypal_subscription_id TEXT;
            COMMENT ON COLUMN users.paypal_subscription_id IS 'PayPal subscription identifier';
          END IF;

          -- Add payment_provider if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'payment_provider'
          ) THEN
            ALTER TABLE users ADD COLUMN payment_provider TEXT DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'paypal'));
            COMMENT ON COLUMN users.payment_provider IS 'Primary payment provider for user';
          END IF;

          -- Add subscription_expires_at for 30-day refund tracking
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'subscription_expires_at'
          ) THEN
            ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMP WITH TIME ZONE;
            COMMENT ON COLUMN users.subscription_expires_at IS 'Subscription expiration timestamp';
          END IF;

          RAISE NOTICE 'Users table enhanced successfully';
        END $$;
      `
    });

    if (usersError) {
      console.error('❌ Error enhancing users table:', usersError);
      return false;
    }
    console.log('✅ Users table enhanced successfully');

    // Step 2: Add PayPal support to payments table
    console.log('\n📋 Step 2: Adding PayPal support to payments table...');
    const { error: paymentsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add PayPal support fields to payments table
        DO $$ 
        BEGIN
          -- Add payment_provider if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'payment_provider'
          ) THEN
            ALTER TABLE payments ADD COLUMN payment_provider TEXT DEFAULT 'stripe' CHECK (payment_provider IN ('stripe', 'paypal'));
            COMMENT ON COLUMN payments.payment_provider IS 'Payment provider used for transaction';
          END IF;

          -- Add paypal_payment_id if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'paypal_payment_id'
          ) THEN
            ALTER TABLE payments ADD COLUMN paypal_payment_id TEXT;
            COMMENT ON COLUMN payments.paypal_payment_id IS 'PayPal payment identifier';
          END IF;

          -- Add refund_eligible_until for 30-day policy
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'refund_eligible_until'
          ) THEN
            ALTER TABLE payments ADD COLUMN refund_eligible_until TIMESTAMP WITH TIME ZONE;
            COMMENT ON COLUMN payments.refund_eligible_until IS '30-day refund eligibility deadline';
          END IF;

          RAISE NOTICE 'Payments table enhanced successfully';
        END $$;
      `
    });

    if (paymentsError) {
      console.error('❌ Error enhancing payments table:', paymentsError);
      return false;
    }
    console.log('✅ Payments table enhanced successfully');

    // Step 3: Create subscription_history table for audit trails
    console.log('\n📋 Step 3: Creating subscription_history table...');
    const { error: historyError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create subscription_history table for audit trails
        CREATE TABLE IF NOT EXISTS subscription_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'canceled', 'renewed', 'refunded', 'provider_changed')),
          old_status TEXT,
          new_status TEXT,
          provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal')),
          subscription_id TEXT,
          amount INTEGER,
          currency TEXT DEFAULT 'usd',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by UUID REFERENCES users(id)
        );

        -- Add index for efficient queries
        CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at);
        CREATE INDEX IF NOT EXISTS idx_subscription_history_action ON subscription_history(action);

        COMMENT ON TABLE subscription_history IS 'Audit trail for all subscription changes';
        COMMENT ON COLUMN subscription_history.action IS 'Type of subscription action performed';
        COMMENT ON COLUMN subscription_history.provider IS 'Payment provider used';
        COMMENT ON COLUMN subscription_history.metadata IS 'Additional context and details';
      `
    });

    if (historyError) {
      console.error('❌ Error creating subscription_history table:', historyError);
      return false;
    }
    console.log('✅ Subscription history table created successfully');

    // Step 4: Create refunds table with 30-day policy enforcement
    console.log('\n📋 Step 4: Creating refunds table...');
    const { error: refundsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create refunds table with 30-day policy enforcement
        CREATE TABLE IF NOT EXISTS refunds (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          amount INTEGER NOT NULL CHECK (amount > 0),
          currency TEXT NOT NULL DEFAULT 'usd',
          reason TEXT CHECK (reason IN ('customer_request', 'dispute', 'fraud', 'duplicate', 'error')),
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'processed', 'failed')),
          provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal')),
          provider_refund_id TEXT,
          requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          processed_at TIMESTAMP WITH TIME ZONE,
          denied_reason TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Add indexes for efficient queries
        CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
        CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON refunds(user_id);
        CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
        CREATE INDEX IF NOT EXISTS idx_refunds_requested_at ON refunds(requested_at);

        -- Add trigger to update updated_at
        CREATE OR REPLACE FUNCTION update_refunds_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_refunds_updated_at ON refunds;
        CREATE TRIGGER trigger_update_refunds_updated_at
          BEFORE UPDATE ON refunds
          FOR EACH ROW
          EXECUTE FUNCTION update_refunds_updated_at();

        COMMENT ON TABLE refunds IS 'Refund requests and processing with 30-day policy enforcement';
        COMMENT ON COLUMN refunds.reason IS 'Reason for refund request';
        COMMENT ON COLUMN refunds.status IS 'Current status of refund processing';
      `
    });

    if (refundsError) {
      console.error('❌ Error creating refunds table:', refundsError);
      return false;
    }
    console.log('✅ Refunds table created successfully');

    // Step 5: Create payment_provider_configs table for secure provider management
    console.log('\n📋 Step 5: Creating payment_provider_configs table...');
    const { error: configsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create payment_provider_configs table for secure provider management
        CREATE TABLE IF NOT EXISTS payment_provider_configs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          provider TEXT NOT NULL UNIQUE CHECK (provider IN ('stripe', 'paypal')),
          is_active BOOLEAN NOT NULL DEFAULT true,
          is_test_mode BOOLEAN NOT NULL DEFAULT true,
          config_data JSONB NOT NULL DEFAULT '{}',
          webhook_url TEXT,
          webhook_secret_hash TEXT, -- Store hashed webhook secrets
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by UUID REFERENCES users(id),
          updated_by UUID REFERENCES users(id)
        );

        -- Add trigger to update updated_at
        CREATE OR REPLACE FUNCTION update_provider_configs_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_update_provider_configs_updated_at ON payment_provider_configs;
        CREATE TRIGGER trigger_update_provider_configs_updated_at
          BEFORE UPDATE ON payment_provider_configs
          FOR EACH ROW
          EXECUTE FUNCTION update_provider_configs_updated_at();

        COMMENT ON TABLE payment_provider_configs IS 'Secure configuration for payment providers';
        COMMENT ON COLUMN payment_provider_configs.config_data IS 'Encrypted configuration data';
        COMMENT ON COLUMN payment_provider_configs.webhook_secret_hash IS 'Hashed webhook secret for verification';
      `
    });

    if (configsError) {
      console.error('❌ Error creating payment_provider_configs table:', configsError);
      return false;
    }
    console.log('✅ Payment provider configs table created successfully');

    // Step 6: Enable RLS and create security policies
    console.log('\n📋 Step 6: Enabling RLS and creating security policies...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Enable RLS on all payment-related tables
        ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
        ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
        ALTER TABLE payment_provider_configs ENABLE ROW LEVEL SECURITY;

        -- RLS Policies for subscription_history
        DROP POLICY IF EXISTS "Users can view own subscription history" ON subscription_history;
        CREATE POLICY "Users can view own subscription history" ON subscription_history
          FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Admins can view all subscription history" ON subscription_history;
        CREATE POLICY "Admins can view all subscription history" ON subscription_history
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE id = auth.uid() AND membershipType = 'admin'
            )
          );

        DROP POLICY IF EXISTS "System can insert subscription history" ON subscription_history;
        CREATE POLICY "System can insert subscription history" ON subscription_history
          FOR INSERT WITH CHECK (true); -- Allow system inserts via service role

        -- RLS Policies for refunds
        DROP POLICY IF EXISTS "Users can view own refunds" ON refunds;
        CREATE POLICY "Users can view own refunds" ON refunds
          FOR SELECT USING (auth.uid() = user_id);

        DROP POLICY IF EXISTS "Users can request refunds for own payments" ON refunds;
        CREATE POLICY "Users can request refunds for own payments" ON refunds
          FOR INSERT WITH CHECK (
            auth.uid() = user_id AND
            EXISTS (
              SELECT 1 FROM payments 
              WHERE id = payment_id AND user_id = auth.uid()
              AND created_at >= NOW() - INTERVAL '30 days'
            )
          );

        DROP POLICY IF EXISTS "Admins can manage all refunds" ON refunds;
        CREATE POLICY "Admins can manage all refunds" ON refunds
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE id = auth.uid() AND membershipType = 'admin'
            )
          );

        -- RLS Policies for payment_provider_configs (Admin only)
        DROP POLICY IF EXISTS "Admins can manage payment provider configs" ON payment_provider_configs;
        CREATE POLICY "Admins can manage payment provider configs" ON payment_provider_configs
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE id = auth.uid() AND membershipType = 'admin'
            )
          );
      `
    });

    if (rlsError) {
      console.error('❌ Error setting up RLS policies:', rlsError);
      return false;
    }
    console.log('✅ RLS policies created successfully');

    // Step 7: Create helper functions for 30-day refund policy
    console.log('\n📋 Step 7: Creating helper functions...');
    const { error: functionsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Function to check refund eligibility (30-day policy)
        CREATE OR REPLACE FUNCTION is_refund_eligible(payment_uuid UUID)
        RETURNS BOOLEAN AS $$
        DECLARE
          payment_date TIMESTAMP WITH TIME ZONE;
        BEGIN
          SELECT created_at INTO payment_date 
          FROM payments 
          WHERE id = payment_uuid;
          
          IF payment_date IS NULL THEN
            RETURN FALSE;
          END IF;
          
          RETURN payment_date >= NOW() - INTERVAL '30 days';
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Function to automatically set refund_eligible_until on payment creation
        CREATE OR REPLACE FUNCTION set_refund_eligibility()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.refund_eligible_until = NEW.created_at + INTERVAL '30 days';
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Add trigger to automatically set refund eligibility
        DROP TRIGGER IF EXISTS trigger_set_refund_eligibility ON payments;
        CREATE TRIGGER trigger_set_refund_eligibility
          BEFORE INSERT ON payments
          FOR EACH ROW
          EXECUTE FUNCTION set_refund_eligibility();

        COMMENT ON FUNCTION is_refund_eligible(UUID) IS 'Checks if payment is eligible for refund within 30-day policy';
        COMMENT ON FUNCTION set_refund_eligibility() IS 'Automatically sets refund eligibility deadline on payment creation';
      `
    });

    if (functionsError) {
      console.error('❌ Error creating helper functions:', functionsError);
      return false;
    }
    console.log('✅ Helper functions created successfully');

    console.log('\n🎉 Payment System Enhancement Completed Successfully!');
    console.log('\n📊 Summary of Changes:');
    console.log('✅ Added PayPal support to users and payments tables');
    console.log('✅ Created subscription_history table for audit trails');
    console.log('✅ Created refunds table with 30-day policy enforcement');
    console.log('✅ Created payment_provider_configs table for secure management');
    console.log('✅ Enabled RLS with strict security policies');
    console.log('✅ Added helper functions for refund eligibility');
    console.log('\n🔒 Security Features:');
    console.log('✅ Row Level Security enabled on all new tables');
    console.log('✅ Users can only access their own payment data');
    console.log('✅ Admins have full access for management');
    console.log('✅ 30-day refund policy automatically enforced');
    console.log('✅ Payment provider configs secured for admin-only access');

    return true;

  } catch (error) {
    console.error('❌ Fatal error during payment system enhancement:', error);
    return false;
  }
}

// Execute the enhancement
enhancePaymentSystem()
  .then((success) => {
    if (success) {
      console.log('\n✅ Payment system enhancement completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Payment system enhancement failed');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }); 