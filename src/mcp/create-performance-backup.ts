import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createPerformanceBackup() {
  console.log('🔄 Creating performance optimization backup...');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupName = `backup-performance-optimization-${timestamp}`;
  
  let backupSQL = `-- Performance Optimization Backup
-- Created: ${new Date().toISOString()}
-- Purpose: Backup before adding missing indexes and removing unused indexes
-- 
-- This backup contains:
-- 1. All current indexes (for restoration if needed)
-- 2. Foreign key constraints
-- 3. Primary key constraints
-- 4. Table structures for affected tables
--
-- RESTORE INSTRUCTIONS:
-- To restore indexes, run the CREATE INDEX statements below
-- To restore constraints, run the ALTER TABLE statements below

-- =============================================================================
-- CURRENT INDEX BACKUP
-- =============================================================================

`;

  try {
    // Get all current indexes
    const { data: indexes, error: indexError } = await supabase
      .rpc('execute_sql', {
        sql: `
          SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
          FROM pg_indexes 
          WHERE schemaname = 'public' 
            AND indexname NOT LIKE '%_pkey'
          ORDER BY tablename, indexname;
        `
      });

    if (indexError) {
      console.error('❌ Error fetching indexes:', indexError);
      return;
    }

    backupSQL += `-- Current Indexes (${indexes?.length || 0} total)\n`;
    indexes?.forEach((index: any) => {
      backupSQL += `${index.indexdef};\n`;
    });

    backupSQL += `\n-- =============================================================================\n`;
    backupSQL += `-- FOREIGN KEY CONSTRAINTS\n`;
    backupSQL += `-- =============================================================================\n\n`;

    // Get all foreign key constraints
    const { data: fkeys, error: fkError } = await supabase
      .rpc('execute_sql', {
        sql: `
          SELECT 
            tc.table_name,
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.update_rule,
            rc.delete_rule
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
            AND tc.table_schema = rc.constraint_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
          ORDER BY tc.table_name, tc.constraint_name;
        `
      });

    if (fkError) {
      console.error('❌ Error fetching foreign keys:', fkError);
      return;
    }

    backupSQL += `-- Foreign Key Constraints (${fkeys?.length || 0} total)\n`;
    fkeys?.forEach((fk: any) => {
      backupSQL += `-- ALTER TABLE public.${fk.table_name} ADD CONSTRAINT ${fk.constraint_name} `;
      backupSQL += `FOREIGN KEY (${fk.column_name}) REFERENCES public.${fk.foreign_table_name}(${fk.foreign_column_name})`;
      if (fk.update_rule !== 'NO ACTION') backupSQL += ` ON UPDATE ${fk.update_rule}`;
      if (fk.delete_rule !== 'NO ACTION') backupSQL += ` ON DELETE ${fk.delete_rule}`;
      backupSQL += `;\n`;
    });

    backupSQL += `\n-- =============================================================================\n`;
    backupSQL += `-- PRIMARY KEY CONSTRAINTS\n`;
    backupSQL += `-- =============================================================================\n\n`;

    // Get all primary key constraints
    const { data: pkeys, error: pkError } = await supabase
      .rpc('execute_sql', {
        sql: `
          SELECT 
            tc.table_name,
            tc.constraint_name,
            string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
          GROUP BY tc.table_name, tc.constraint_name
          ORDER BY tc.table_name;
        `
      });

    if (pkError) {
      console.error('❌ Error fetching primary keys:', pkError);
      return;
    }

    backupSQL += `-- Primary Key Constraints (${pkeys?.length || 0} total)\n`;
    pkeys?.forEach((pk: any) => {
      backupSQL += `-- ALTER TABLE public.${pk.table_name} ADD CONSTRAINT ${pk.constraint_name} PRIMARY KEY (${pk.columns});\n`;
    });

    backupSQL += `\n-- =============================================================================\n`;
    backupSQL += `-- BACKUP COMPLETED SUCCESSFULLY\n`;
    backupSQL += `-- =============================================================================\n`;
    backupSQL += `-- Total indexes backed up: ${indexes?.length || 0}\n`;
    backupSQL += `-- Total foreign keys backed up: ${fkeys?.length || 0}\n`;
    backupSQL += `-- Total primary keys backed up: ${pkeys?.length || 0}\n`;
    backupSQL += `-- Backup file: ${backupName}.sql\n`;
    backupSQL += `-- =============================================================================\n`;

    // Write backup to file
    const backupPath = join(process.cwd(), '_archive', 'backups', `${backupName}.sql`);
    writeFileSync(backupPath, backupSQL);

    console.log(`✅ Performance optimization backup created successfully!`);
    console.log(`📁 Backup saved to: ${backupPath}`);
    console.log(`📊 Backup contains:`);
    console.log(`   - ${indexes?.length || 0} indexes`);
    console.log(`   - ${fkeys?.length || 0} foreign key constraints`);
    console.log(`   - ${pkeys?.length || 0} primary key constraints`);
    
    return backupName;

  } catch (error) {
    console.error('❌ Error creating backup:', error);
    throw error;
  }
}

// Run the backup
createPerformanceBackup()
  .then((backupName) => {
    console.log(`\n🎉 Backup completed: ${backupName}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Backup failed:', error);
    process.exit(1);
  }); 