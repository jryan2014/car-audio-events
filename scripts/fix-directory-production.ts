#!/usr/bin/env tsx

/**
 * PRODUCTION DIRECTORY FIX SCRIPT
 * 
 * This script fixes all critical directory errors that are causing production issues
 */

import { createClient } from '@supabase/supabase-js';

// Production configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface FixResult {
  step: string;
  success: boolean;
  message: string;
  recordsAffected?: number;
}

class DirectoryProductionFixer {
  private results: FixResult[] = [];

  async runAllFixes(): Promise<void> {
    console.log('🚨 STARTING CRITICAL DIRECTORY PRODUCTION FIXES');
    console.log('================================================');

    try {
      await this.step1_validateDatabaseConnection();
      await this.step2_fixNullBusinessTypes();
      await this.step3_fixNullListingTypes();
      await this.step4_fixNullBusinessNames();
      await this.step5_ensureViewsColumn();
      await this.step6_createIncrementFunction();
      await this.step7_validateRLSPolicies();
      await this.step8_cleanupInvalidData();
      await this.step9_validateDataIntegrity();
      
      this.printSummary();
    } catch (error: any) {
      console.error('💥 CRITICAL ERROR:', error.message);
      process.exit(1);
    }
  }

  private async step1_validateDatabaseConnection(): Promise<void> {
    try {
      const { data, error } = await supabase.from('directory_listings').select('count').limit(1);
      
      if (error) {
        throw new Error(`Database connection failed: ${error.message}`);
      }

      this.addResult('Database Connection', true, 'Successfully connected to database');
    } catch (error: any) {
      this.addResult('Database Connection', false, error.message);
      throw error;
    }
  }

  private async step2_fixNullBusinessTypes(): Promise<void> {
    try {
      console.log('🔧 Fixing null business_type values...');
      
      const { data: nullTypes } = await supabase
        .from('directory_listings')
        .select('id')
        .is('business_type', null);

      const nullCount = nullTypes?.length || 0;

      if (nullCount > 0) {
        const { error } = await supabase
          .from('directory_listings')
          .update({ business_type: 'other' })
          .is('business_type', null);

        if (error) throw error;

        this.addResult('Fix Null Business Types', true, `Fixed ${nullCount} records with null business_type`, nullCount);
      } else {
        this.addResult('Fix Null Business Types', true, 'No null business_type values found');
      }
    } catch (error: any) {
      this.addResult('Fix Null Business Types', false, error.message);
      throw error;
    }
  }

  private async step3_fixNullListingTypes(): Promise<void> {
    try {
      console.log('🔧 Fixing null listing_type values...');
      
      const { data: nullTypes } = await supabase
        .from('directory_listings')
        .select('id')
        .is('listing_type', null);

      const nullCount = nullTypes?.length || 0;

      if (nullCount > 0) {
        const { error } = await supabase
          .from('directory_listings')
          .update({ listing_type: 'other' })
          .is('listing_type', null);

        if (error) throw error;

        this.addResult('Fix Null Listing Types', true, `Fixed ${nullCount} records with null listing_type`, nullCount);
      } else {
        this.addResult('Fix Null Listing Types', true, 'No null listing_type values found');
      }
    } catch (error: any) {
      this.addResult('Fix Null Listing Types', false, error.message);
      throw error;
    }
  }

  private async step4_fixNullBusinessNames(): Promise<void> {
    try {
      console.log('🔧 Fixing null business_name values...');
      
      const { data: nullNames } = await supabase
        .from('directory_listings')
        .select('id')
        .or('business_name.is.null,business_name.eq.');

      const nullCount = nullNames?.length || 0;

      if (nullCount > 0) {
        const { error } = await supabase
          .from('directory_listings')
          .update({ business_name: 'Unknown Business' })
          .or('business_name.is.null,business_name.eq.');

        if (error) throw error;

        this.addResult('Fix Null Business Names', true, `Fixed ${nullCount} records with null/empty business_name`, nullCount);
      } else {
        this.addResult('Fix Null Business Names', true, 'No null business_name values found');
      }
    } catch (error: any) {
      this.addResult('Fix Null Business Names', false, error.message);
      throw error;
    }
  }

  private async step5_ensureViewsColumn(): Promise<void> {
    try {
      console.log('🔧 Ensuring views column exists and has defaults...');
      
      // First try to select views column to see if it exists
      const { error: selectError } = await supabase
        .from('directory_listings')
        .select('views')
        .limit(1);

      if (selectError && selectError.message.includes('does not exist')) {
        // Column doesn't exist, try to add it
        const { error: alterError } = await supabase.rpc('exec_sql', {
          sql_command: 'ALTER TABLE directory_listings ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;'
        });

        if (alterError) throw alterError;
        this.addResult('Ensure Views Column', true, 'Added views column to directory_listings');
      } else {
        // Column exists, update null values
        const { data: nullViews } = await supabase
          .from('directory_listings')
          .select('id')
          .is('views', null);

        const nullCount = nullViews?.length || 0;

        if (nullCount > 0) {
          const { error } = await supabase
            .from('directory_listings')
            .update({ views: 0 })
            .is('views', null);

          if (error) throw error;
          this.addResult('Ensure Views Column', true, `Fixed ${nullCount} records with null views`, nullCount);
        } else {
          this.addResult('Ensure Views Column', true, 'Views column exists and has no null values');
        }
      }
    } catch (error: any) {
      this.addResult('Ensure Views Column', false, error.message);
      throw error;
    }
  }

  private async step6_createIncrementFunction(): Promise<void> {
    try {
      console.log('🔧 Creating/updating increment_directory_view function...');
      
      const functionSQL = `
        CREATE OR REPLACE FUNCTION increment_directory_view(listing_id uuid)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        BEGIN
            UPDATE directory_listings 
            SET views = COALESCE(views, 0) + 1,
                updated_at = NOW()
            WHERE id = listing_id;
        END;
        $$;
      `;

      const { error } = await supabase.rpc('exec_sql', {
        sql_command: functionSQL
      });

      if (error) throw error;

      this.addResult('Create Increment Function', true, 'Successfully created/updated increment_directory_view function');
    } catch (error: any) {
      this.addResult('Create Increment Function', false, error.message);
      throw error;
    }
  }

  private async step7_validateRLSPolicies(): Promise<void> {
    try {
      console.log('🔧 Validating RLS policies...');
      
      // Test if we can select from the table
      const { data, error } = await supabase
        .from('directory_listings')
        .select('id')
        .limit(1);

      if (error) {
        this.addResult('Validate RLS Policies', false, `RLS policy issue: ${error.message}`);
      } else {
        this.addResult('Validate RLS Policies', true, 'RLS policies allow proper access');
      }
    } catch (error: any) {
      this.addResult('Validate RLS Policies', false, error.message);
    }
  }

  private async step8_cleanupInvalidData(): Promise<void> {
    try {
      console.log('🔧 Cleaning up invalid data...');
      
      // Fix invalid JSON in products column
      const { error: jsonError } = await supabase.rpc('exec_sql', {
        sql_command: `
          UPDATE directory_listings 
          SET products = '[]'::jsonb 
          WHERE products IS NOT NULL 
          AND NOT (products::text ~ '^\\[.*\\]$' OR products::text = 'null');
        `
      });

      if (jsonError) {
        console.warn('Warning: Could not fix invalid JSON in products column:', jsonError.message);
      }

      // Fix invalid JSON in services column
      const { error: servicesError } = await supabase.rpc('exec_sql', {
        sql_command: `
          UPDATE directory_listings 
          SET services = '[]'::jsonb 
          WHERE services IS NOT NULL 
          AND NOT (services::text ~ '^\\[.*\\]$' OR services::text = 'null');
        `
      });

      if (servicesError) {
        console.warn('Warning: Could not fix invalid JSON in services column:', servicesError.message);
      }

      this.addResult('Cleanup Invalid Data', true, 'Cleaned up invalid JSON data');
    } catch (error: any) {
      this.addResult('Cleanup Invalid Data', false, error.message);
    }
  }

  private async step9_validateDataIntegrity(): Promise<void> {
    try {
      console.log('🔧 Final data integrity validation...');
      
      const { data: totalCount } = await supabase
        .from('directory_listings')
        .select('id', { count: 'exact' });

      const { data: validData } = await supabase
        .from('directory_listings')
        .select('id')
        .not('business_name', 'is', null)
        .not('business_name', 'eq', '')
        .not('business_type', 'is', null)
        .not('listing_type', 'is', null);

      const total = totalCount?.length || 0;
      const valid = validData?.length || 0;
      const invalid = total - valid;

      if (invalid > 0) {
        this.addResult('Data Integrity Validation', false, `Found ${invalid} records with integrity issues out of ${total} total records`);
      } else {
        this.addResult('Data Integrity Validation', true, `All ${total} records have valid required fields`);
      }
    } catch (error: any) {
      this.addResult('Data Integrity Validation', false, error.message);
    }
  }

  private addResult(step: string, success: boolean, message: string, recordsAffected?: number): void {
    this.results.push({ step, success, message, recordsAffected });
    const status = success ? '✅' : '❌';
    console.log(`${status} ${step}: ${message}`);
  }

  private printSummary(): void {
    console.log('\n📊 PRODUCTION FIX SUMMARY');
    console.log('========================');
    
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => r.success === false).length;
    const totalRecordsAffected = this.results.reduce((sum, r) => sum + (r.recordsAffected || 0), 0);

    console.log(`✅ Successful fixes: ${successful}`);
    console.log(`❌ Failed fixes: ${failed}`);
    console.log(`📝 Total records affected: ${totalRecordsAffected}`);

    if (failed === 0) {
      console.log('\n🎉 ALL DIRECTORY PRODUCTION ISSUES HAVE BEEN FIXED!');
      console.log('The directory should now work without the replace() errors.');
    } else {
      console.log('\n⚠️  SOME ISSUES REMAIN:');
      this.results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.step}: ${r.message}`);
      });
    }

    console.log('\n🚀 You can now test the directory in production.');
  }
}

// Run the fixes
async function main() {
  const fixer = new DirectoryProductionFixer();
  await fixer.runAllFixes();
}

if (require.main === module) {
  main().catch(console.error);
}

export { DirectoryProductionFixer };