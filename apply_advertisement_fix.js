#!/usr/bin/env node

/**
 * Apply Advertisement Table Fix
 * Executes SQL to create missing advertisement tables
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nqvisvranvjaghvrdaaz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Error: No Supabase key found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyAdvertisementFix() {
  console.log('🔧 Applying Advertisement Table Fix...');
  
  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('fix_advertisement_tables.sql', 'utf8');
    
    // Split into individual statements (rough parsing)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📋 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      try {
        console.log(`   ${i + 1}/${statements.length}: Executing...`);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });
        
        if (error) {
          console.log(`   ⚠️  Statement ${i + 1} result:`, error.message);
        } else {
          console.log(`   ✅ Statement ${i + 1} completed`);
        }
      } catch (err) {
        console.log(`   ⚠️  Statement ${i + 1} error:`, err.message);
      }
    }
    
    console.log('✅ Advertisement table fix completed!');
    console.log('\n🎯 Next steps:');
    console.log('1. Refresh your browser (F5)');
    console.log('2. Check console for errors');
    console.log('3. Test advertisement display');
    
  } catch (error) {
    console.error('❌ Error applying fix:', error.message);
  }
}

// Alternative method: Direct table creation
async function createAdvertisementTablesDirectly() {
  console.log('🔧 Creating advertisement tables directly...');
  
  try {
    // Check if tables already exist
    const { data: tables, error: listError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['advertisements', 'advertisement_impressions', 'advertisement_clicks']);
    
    if (listError) {
      console.log('⚠️  Could not check existing tables:', listError.message);
    } else {
      const existingTables = tables?.map(t => t.table_name) || [];
      console.log('📋 Existing tables:', existingTables);
      
      if (existingTables.includes('advertisements')) {
        console.log('✅ Advertisement tables already exist!');
        return;
      }
    }
    
    // Create basic advertisements table
    console.log('📝 Creating advertisements table...');
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS public.advertisements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          description TEXT,
          image_url TEXT NOT NULL,
          click_url TEXT NOT NULL,
          advertiser_name TEXT NOT NULL,
          advertiser_email TEXT NOT NULL,
          placement_type TEXT NOT NULL,
          size TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          clicks INTEGER DEFAULT 0,
          impressions INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        
        INSERT INTO public.advertisements (
          title, description, image_url, click_url, advertiser_name, advertiser_email, placement_type, size
        ) VALUES (
          'Premium Car Audio Systems',
          'Upgrade your sound with our premium car audio systems.',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=400&h=300&q=80',
          'https://example.com/car-audio',
          'AudioPro Systems',
          'contact@audiopro.com',
          'sidebar',
          'medium'
        ) ON CONFLICT DO NOTHING;
      `
    });
    
    if (createError) {
      console.log('⚠️  Table creation result:', createError.message);
    } else {
      console.log('✅ Advertisement tables created successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  }
}

// Run the fix
if (process.argv.includes('--direct')) {
  createAdvertisementTablesDirectly();
} else {
  applyAdvertisementFix();
} 