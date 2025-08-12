import { supabase } from '../lib/supabase';

/**
 * Security utilities for database operations
 * Provides safe wrappers around potentially dangerous operations
 */

/**
 * Whitelist of allowed table names for dynamic queries
 * Add tables here as needed, but be very selective
 */
const ALLOWED_TABLES = new Set([
  'newsletter_campaigns',
  'competition_results',
  'payment_history'
]);

/**
 * Whitelist of allowed view names for dynamic queries
 */
const ALLOWED_VIEWS = new Set([
  'competition_results',
  'payment_history'
]);

/**
 * Validate that a table name is safe to use in dynamic SQL
 * @param tableName The table name to validate
 * @returns true if valid, throws error if not
 */
export function validateTableName(tableName: string): boolean {
  // Check against whitelist
  if (!ALLOWED_TABLES.has(tableName)) {
    throw new Error(`Table '${tableName}' is not in the allowed list`);
  }
  
  // Additional validation: only alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error('Invalid table name format');
  }
  
  return true;
}

/**
 * Validate that a view name is safe to use in dynamic SQL
 * @param viewName The view name to validate
 * @returns true if valid, throws error if not
 */
export function validateViewName(viewName: string): boolean {
  // Check against whitelist
  if (!ALLOWED_VIEWS.has(viewName)) {
    throw new Error(`View '${viewName}' is not in the allowed list`);
  }
  
  // Additional validation: only alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(viewName)) {
    throw new Error('Invalid view name format');
  }
  
  return true;
}

/**
 * Validate a UUID to prevent SQL injection
 * @param uuid The UUID to validate
 * @returns true if valid, throws error if not
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(uuid)) {
    throw new Error('Invalid UUID format');
  }
  
  return true;
}

/**
 * Escape a string for safe use in SQL
 * Note: This is a last resort - use parameterized queries whenever possible
 * @param str The string to escape
 * @returns Escaped string
 */
export function escapeSQL(str: string): string {
  if (typeof str !== 'string') {
    throw new Error('Input must be a string');
  }
  
  // Replace single quotes with doubled single quotes (SQL standard)
  return str.replace(/'/g, "''");
}

/**
 * Create a safe parameterized insert query
 * This should be used instead of string concatenation
 */
export async function safeInsert(
  tableName: string,
  data: Record<string, any>
) {
  // Validate table name
  validateTableName(tableName);
  
  // Use Supabase's built-in methods which handle parameterization
  return await supabase
    .from(tableName)
    .insert(data);
}

/**
 * Create a safe parameterized delete query
 * This should be used instead of string concatenation
 */
export async function safeDelete(
  tableName: string,
  id: string
) {
  // Validate inputs
  validateTableName(tableName);
  validateUUID(id);
  
  // Use Supabase's built-in methods which handle parameterization
  return await supabase
    .from(tableName)
    .delete()
    .eq('id', id);
}

/**
 * DEPRECATED: exec_sql function has been removed for security
 * This function now throws an error to prevent usage
 * 
 * Use these alternatives instead:
 * - Supabase client methods (supabase.from().select/insert/update/delete)
 * - Stored procedures (supabase.rpc())
 * - safe_table_maintenance() for maintenance operations
 */
export async function safeExecSQL(
  sqlCommand: string,
  params?: Record<string, any>
): Promise<any> {
  throw new Error(
    'SECURITY: exec_sql has been removed. Use Supabase client methods or stored procedures instead. ' +
    'Available secure functions: safe_table_maintenance, get_table_schema_info, get_rls_policies_info, get_table_relationships'
  );
}

/**
 * Recommendations for secure database operations:
 * 
 * 1. Always use Supabase client methods when possible:
 *    - supabase.from('table').select()
 *    - supabase.from('table').insert()
 *    - supabase.from('table').update()
 *    - supabase.from('table').delete()
 * 
 * 2. For complex queries, create stored procedures in the database
 *    and call them with supabase.rpc()
 * 
 * 3. Never concatenate user input into SQL strings
 * 
 * 4. Always validate and sanitize input data
 * 
 * 5. Use Row Level Security (RLS) policies
 * 
 * 6. Limit database permissions to minimum required
 * 
 * 7. Regular security audits of database access patterns
 */