import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBillingConfigTables() {
  console.log('🚀 Creating billing configuration database tables...');
  
  try {
    // Create prorate_rules table
    const { data: proRateData, error: proRateError } = await supabase.rpc('exec_sql', {
      sql_command: `
        CREATE TABLE IF NOT EXISTS prorate_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          from_plan_type VARCHAR(100),
          to_plan_type VARCHAR(100),
          calculation_method VARCHAR(50) NOT NULL DEFAULT 'daily' CHECK (calculation_method IN ('daily', 'monthly', 'none')),
          credit_unused BOOLEAN DEFAULT true,
          immediate_charge BOOLEAN DEFAULT false,
          min_proration_amount DECIMAL(10,2) DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create RLS policies for prorate_rules
        ALTER TABLE prorate_rules ENABLE ROW LEVEL SECURITY;
        
        -- Only admins can access prorate rules
        CREATE POLICY "Admin access to prorate_rules"
          ON prorate_rules
          FOR ALL
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.membership_type = 'admin'
            )
          );
        
        -- Create updated_at trigger for prorate_rules
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        CREATE TRIGGER prorate_rules_updated_at
          BEFORE UPDATE ON prorate_rules
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `
    });
    
    if (proRateError) {
      console.error('❌ Error creating prorate_rules table:', proRateError);
      throw proRateError;
    }
    
    console.log('✅ Created prorate_rules table');
    
    // Create billing_automation_rules table
    const { data: billingRulesData, error: billingRulesError } = await supabase.rpc('exec_sql', {
      sql_command: `
        CREATE TABLE IF NOT EXISTS billing_automation_rules (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          rule_type VARCHAR(100) NOT NULL CHECK (rule_type IN ('auto_retry', 'grace_period', 'cancellation', 'upgrade_reminder')),
          trigger_condition TEXT NOT NULL,
          action TEXT NOT NULL,
          delay_days INTEGER DEFAULT 0,
          max_attempts INTEGER DEFAULT 3,
          is_active BOOLEAN DEFAULT true,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create RLS policies for billing_automation_rules
        ALTER TABLE billing_automation_rules ENABLE ROW LEVEL SECURITY;
        
        -- Only admins can access billing automation rules
        CREATE POLICY "Admin access to billing_automation_rules"
          ON billing_automation_rules
          FOR ALL
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.membership_type = 'admin'
            )
          );
        
        -- Create updated_at trigger for billing_automation_rules
        CREATE TRIGGER billing_automation_rules_updated_at
          BEFORE UPDATE ON billing_automation_rules
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `
    });
    
    if (billingRulesError) {
      console.error('❌ Error creating billing_automation_rules table:', billingRulesError);
      throw billingRulesError;
    }
    
    console.log('✅ Created billing_automation_rules table');
    
    // Create dunning_settings table
    const { data: dunningData, error: dunningError } = await supabase.rpc('exec_sql', {
      sql_command: `
        CREATE TABLE IF NOT EXISTS dunning_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          setting_name VARCHAR(255) NOT NULL,
          failed_payment_grace_days INTEGER DEFAULT 3,
          max_retry_attempts INTEGER DEFAULT 3,
          retry_intervals INTEGER[] DEFAULT ARRAY[1, 3, 7],
          auto_cancel_after_days INTEGER DEFAULT 30,
          send_email_notifications BOOLEAN DEFAULT true,
          email_template_ids UUID[],
          escalation_enabled BOOLEAN DEFAULT false,
          escalation_days INTEGER DEFAULT 14,
          webhook_url VARCHAR(500),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create RLS policies for dunning_settings
        ALTER TABLE dunning_settings ENABLE ROW LEVEL SECURITY;
        
        -- Only admins can access dunning settings
        CREATE POLICY "Admin access to dunning_settings"
          ON dunning_settings
          FOR ALL
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.membership_type = 'admin'
            )
          );
        
        -- Create updated_at trigger for dunning_settings
        CREATE TRIGGER dunning_settings_updated_at
          BEFORE UPDATE ON dunning_settings
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `
    });
    
    if (dunningError) {
      console.error('❌ Error creating dunning_settings table:', dunningError);
      throw dunningError;
    }
    
    console.log('✅ Created dunning_settings table');
    
    // Create coupon_campaigns table
    const { data: campaignData, error: campaignError } = await supabase.rpc('exec_sql', {
      sql_command: `
        CREATE TABLE IF NOT EXISTS coupon_campaigns (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          campaign_name VARCHAR(255) NOT NULL,
          description TEXT,
          campaign_type VARCHAR(100) NOT NULL CHECK (campaign_type IN ('seasonal', 'promotional', 'loyalty', 'acquisition')),
          target_audience TEXT[],
          start_date TIMESTAMP WITH TIME ZONE NOT NULL,
          end_date TIMESTAMP WITH TIME ZONE,
          total_budget DECIMAL(10,2),
          used_budget DECIMAL(10,2) DEFAULT 0,
          coupon_template JSONB NOT NULL DEFAULT '{}',
          generated_coupons INTEGER DEFAULT 0,
          used_coupons INTEGER DEFAULT 0,
          conversion_rate DECIMAL(5,2) DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create RLS policies for coupon_campaigns
        ALTER TABLE coupon_campaigns ENABLE ROW LEVEL SECURITY;
        
        -- Only admins can access coupon campaigns
        CREATE POLICY "Admin access to coupon_campaigns"
          ON coupon_campaigns
          FOR ALL
          TO authenticated
          USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.membership_type = 'admin'
            )
          );
        
        -- Create updated_at trigger for coupon_campaigns
        CREATE TRIGGER coupon_campaigns_updated_at
          BEFORE UPDATE ON coupon_campaigns
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `
    });
    
    if (campaignError) {
      console.error('❌ Error creating coupon_campaigns table:', campaignError);
      throw campaignError;
    }
    
    console.log('✅ Created coupon_campaigns table');
    
    // Create indexes for performance
    const { data: indexData, error: indexError } = await supabase.rpc('exec_sql', {
      sql_command: `
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_prorate_rules_active ON prorate_rules(is_active);
        CREATE INDEX IF NOT EXISTS idx_prorate_rules_method ON prorate_rules(calculation_method);
        
        CREATE INDEX IF NOT EXISTS idx_billing_automation_rules_active ON billing_automation_rules(is_active);
        CREATE INDEX IF NOT EXISTS idx_billing_automation_rules_type ON billing_automation_rules(rule_type);
        
        CREATE INDEX IF NOT EXISTS idx_dunning_settings_active ON dunning_settings(is_active);
        
        CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_active ON coupon_campaigns(is_active);
        CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_type ON coupon_campaigns(campaign_type);
        CREATE INDEX IF NOT EXISTS idx_coupon_campaigns_dates ON coupon_campaigns(start_date, end_date);
      `
    });
    
    if (indexError) {
      console.error('❌ Error creating indexes:', indexError);
      throw indexError;
    }
    
    console.log('✅ Created performance indexes');
    
    // Insert default settings
    const { data: defaultData, error: defaultError } = await supabase.rpc('exec_sql', {
      sql_command: `
        -- Insert default pro-rate rule
        INSERT INTO prorate_rules (name, calculation_method, credit_unused, immediate_charge, is_active)
        VALUES ('Default Pro-ration', 'daily', true, false, true)
        ON CONFLICT DO NOTHING;
        
        -- Insert default dunning settings
        INSERT INTO dunning_settings (
          setting_name, 
          failed_payment_grace_days, 
          max_retry_attempts, 
          retry_intervals, 
          auto_cancel_after_days, 
          send_email_notifications,
          is_active
        )
        VALUES (
          'Default Dunning Policy', 
          3, 
          3, 
          ARRAY[1, 3, 7], 
          30, 
          true,
          true
        )
        ON CONFLICT DO NOTHING;
        
        -- Insert default billing automation rule
        INSERT INTO billing_automation_rules (
          name, 
          rule_type, 
          trigger_condition, 
          action, 
          delay_days, 
          max_attempts, 
          is_active
        )
        VALUES (
          'Auto Payment Retry', 
          'auto_retry', 
          'payment_failed', 
          'retry_payment', 
          1, 
          3, 
          true
        )
        ON CONFLICT DO NOTHING;
      `
    });
    
    if (defaultError) {
      console.error('❌ Error inserting default settings:', defaultError);
      throw defaultError;
    }
    
    console.log('✅ Inserted default settings');
    
    console.log('🎉 All billing configuration tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating billing configuration tables:', error);
    throw error;
  }
}

// Execute the function
createBillingConfigTables()
  .then(() => {
    console.log('✅ Database setup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }); 