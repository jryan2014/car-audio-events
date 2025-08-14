/**
 * SQL injection prevention utilities
 */

/**
 * Escapes special characters in SQL strings
 */
export function escapeSQLString(str: string): string {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/"/g, '""')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x00/g, '\\x00')
    .replace(/\x1a/g, '\\x1a');
}

/**
 * Validates table/column names to prevent SQL injection
 */
export function validateSQLIdentifier(identifier: string): boolean {
  // Only allow alphanumeric characters and underscores
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}

/**
 * Creates a parameterized query template
 */
export function parameterizedQuery(
  query: string,
  params: any[]
): { text: string; values: any[] } {
  return {
    text: query,
    values: params.map(param => {
      if (typeof param === 'string') {
        return escapeSQLString(param);
      }
      return param;
    })
  };
}

/**
 * Sanitizes user input for LIKE queries
 */
export function sanitizeLikePattern(pattern: string): string {
  return pattern
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
