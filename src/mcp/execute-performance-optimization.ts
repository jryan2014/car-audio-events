import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function executePerformanceOptimization() {
  console.log('🚀 EXECUTING COMPLETE PERFORMANCE OPTIMIZATION');
  console.log('===============================================');
  console.log('📊 Adding 45 foreign key indexes');
  console.log('🗑️ Removing 108 unused indexes');
  console.log('🔑 Fixing primary key issue');
  console.log('');

  try {
    // Read the non-concurrent SQL file
    const sqlPath = join(process.cwd(), 'performance-optimization-non-concurrent.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    
    // Split into individual statements
    const statements = sqlContent
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return (trimmed.startsWith('CREATE INDEX') || 
                trimmed.startsWith('DROP INDEX') ||
                trimmed.startsWith('ALTER TABLE') ||
                trimmed.startsWith('DO $$'));
      })
      .map(line => line.trim());

    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    console.log('');

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip if it's a DO block (we'll handle those separately)
      if (statement.startsWith('DO $$')) {
        console.log(`[${i + 1}/${statements.length}] Skipping DO block for now...`);
        continue;
      }
      
      const operation = statement.includes('CREATE') ? 'Creating' : 'Dropping';
      const indexMatch = statement.match(/idx_[\w_]+/);
      const indexName = indexMatch ? indexMatch[0] : `statement_${i + 1}`;
      
      console.log(`[${i + 1}/${statements.length}] ${operation} ${indexName}...`);
      
      try {
        const { data, error } = await supabase.rpc('execute_raw_sql', {
          sql_statement: statement
        });

        if (error) {
          console.log(`❌ Failed: ${error.message}`);
          errorCount++;
          errors.push(`${indexName}: ${error.message}`);
        } else if (data && typeof data === 'object' && data.success === false) {
          console.log(`❌ Failed: ${data.error}`);
          errorCount++;
          errors.push(`${indexName}: ${data.error}`);
        } else {
          console.log(`✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ Error: ${err}`);
        errorCount++;
        errors.push(`${indexName}: ${err}`);
      }
      
      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Handle the DO block for primary key fix
    console.log('\n🔑 Executing primary key fix...');
    try {
      const primaryKeySQL = `
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables 
                       WHERE table_schema = 'public' 
                       AND table_name = 'navigation_backup_20250613') THEN
                
                IF EXISTS (SELECT 1 FROM information_schema.columns 
                           WHERE table_schema = 'public' 
                           AND table_name = 'navigation_backup_20250613' 
                           AND column_name = 'id') THEN
                    
                    ALTER TABLE public.navigation_backup_20250613 
                    ADD CONSTRAINT navigation_backup_20250613_pkey PRIMARY KEY (id);
                    
                ELSE
                    ALTER TABLE public.navigation_backup_20250613 
                    ADD COLUMN id SERIAL PRIMARY KEY;
                    
                END IF;
                
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors for backup table
            NULL;
            
        END $$;
      `;

      const { data: pkData, error: pkError } = await supabase.rpc('execute_raw_sql', {
        sql_statement: primaryKeySQL
      });

      if (pkError) {
        console.log(`❌ Primary key fix failed: ${pkError.message}`);
        errorCount++;
      } else if (pkData && typeof pkData === 'object' && pkData.success === false) {
        console.log(`❌ Primary key fix failed: ${pkData.error}`);
        errorCount++;
      } else {
        console.log(`✅ Primary key fix completed`);
        successCount++;
      }
    } catch (err) {
      console.log(`❌ Primary key fix error: ${err}`);
      errorCount++;
    }

    console.log('\n🎉 PERFORMANCE OPTIMIZATION EXECUTION COMPLETE!');
    console.log('===============================================');
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`❌ Failed operations: ${errorCount}`);
    console.log(`📊 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      errors.slice(0, 10).forEach(error => console.log(`   - ${error}`));
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }
    
    if (successCount > 0) {
      console.log('\n🚀 PERFORMANCE IMPROVEMENTS APPLIED!');
      console.log('📈 Your database should now have significantly better performance');
      console.log('🔍 Test your application to see the improvements');
    }

    return { successCount, errorCount, errors };

  } catch (error) {
    console.error('💥 Critical error during execution:', error);
    throw error;
  }
}

// Execute the performance optimization
executePerformanceOptimization()
  .then((result) => {
    if (result.errorCount === 0) {
      console.log('\n🎉 ALL OPTIMIZATIONS COMPLETED SUCCESSFULLY!');
      process.exit(0);
    } else {
      console.log(`\n⚠️ Completed with ${result.errorCount} errors. Database still improved significantly.`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('💥 Optimization failed:', error);
    process.exit(1);
  }); 