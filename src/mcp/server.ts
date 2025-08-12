#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from multiple possible locations
dotenv.config();
dotenv.config({ path: '.env.local' });

// 🚨 PRODUCTION SAFETY PROTOCOLS - HARD-CODED PROHIBITIONS
const PROHIBITED_OPERATIONS = [
  'DROP',
  'TRUNCATE',
  'DELETE FROM users',
  'DELETE FROM events',
  'ALTER TABLE.*DROP',
  'DROP DATABASE',
  'DROP SCHEMA',
  'RESET',
  'FLUSH'
];

const BACKUP_REQUIRED_OPERATIONS = [
  'ALTER TABLE',
  'CREATE TABLE',
  'INSERT',
  'UPDATE',
  'DELETE'
];

// Initialize Supabase client using same configuration as main app
// Try multiple environment variable names for compatibility
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

console.log('🔍 Environment Check:');
console.log('- Supabase URL found:', supabaseUrl ? '✅' : '❌');
console.log('- Service Key found:', supabaseServiceKey ? '✅' : '❌');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration.');
  console.error('Please ensure your .env file contains:');
  console.error('VITE_SUPABASE_URL=your_supabase_url');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.error('');
  console.error('Available environment variables:');
  Object.keys(process.env).filter(key => key.includes('SUPABASE')).forEach(key => {
    const value = process.env[key];
    console.error(`- ${key}: ${value ? '[SET]' : '[EMPTY]'}`);
  });
  process.exit(1);
}

const supabase = createClient(supabaseUrl as string, supabaseServiceKey as string, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

class CarAudioEventsMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'car-audio-events-db',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('🚨 MCP Server Error:', error);
    };

    process.on('SIGINT', async () => {
      console.log('\n🛑 MCP Server shutting down...');
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'inspect_database_schema',
            description: 'Get complete database schema including tables, columns, and relationships',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: {
                  type: 'string',
                  description: 'Optional: specific table to inspect (leave empty for all tables)'
                }
              }
            }
          },
          {
            name: 'analyze_table_data',
            description: 'Analyze table data patterns, row counts, and sample data (READ-ONLY)',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: {
                  type: 'string',
                  description: 'Table name to analyze'
                },
                limit: {
                  type: 'number',
                  description: 'Number of sample rows to return (default: 5, max: 50)'
                }
              },
              required: ['table_name']
            }
          },
          {
            name: 'check_rls_policies',
            description: 'Examine Row Level Security policies for tables',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: {
                  type: 'string',
                  description: 'Optional: specific table to check (leave empty for all tables)'
                }
              }
            }
          },
          {
            name: 'analyze_relationships',
            description: 'Analyze foreign key relationships and table dependencies',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'query_database_safely',
            description: 'Execute safe SQL queries with built-in protections (SELECT, INSERT, UPDATE, DELETE allowed)',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'SQL query to execute (all operations except prohibited ones)'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'execute_approved_sql',
            description: 'Execute approved SQL commands for security fixes and database maintenance (WRITE OPERATIONS)',
            inputSchema: {
              type: 'object',
              properties: {
                sql: {
                  type: 'string',
                  description: 'SQL commands to execute (ALTER TABLE, CREATE POLICY, etc.)'
                },
                purpose: {
                  type: 'string',
                  description: 'Purpose of the SQL execution (e.g., "Fix admin_settings security")'
                }
              },
              required: ['sql', 'purpose']
            }
          },
          {
            name: 'get_database_statistics',
            description: 'Get database usage statistics and performance metrics',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'inspect_database_schema':
            return await this.inspectDatabaseSchema(args?.table_name as string);
          
          case 'analyze_table_data':
            return await this.analyzeTableData(args?.table_name as string, args?.limit as number);
          
          case 'check_rls_policies':
            return await this.checkRLSPolicies(args?.table_name as string);
          
          case 'analyze_relationships':
            return await this.analyzeRelationships();
          
          case 'query_database_safely':
            return await this.queryDatabaseSafely(args?.query as string);
          
          case 'execute_approved_sql':
            return await this.executeApprovedSQL(args?.sql as string, args?.purpose as string);
          
          case 'get_database_statistics':
            return await this.getDatabaseStatistics();
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`❌ Error executing tool ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private async inspectDatabaseSchema(tableName?: string) {
    console.log('🔍 Inspecting database schema...');
    
    const query = tableName 
      ? `
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY table_name, ordinal_position
      `
      : `
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `;

    // Use secure function for schema information
    const { data, error } = await supabase.rpc('get_table_schema_info', { 
      p_table_name: tableName 
    });

    if (error) {
      throw new Error(`Schema inspection failed: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `📊 Database Schema Analysis:\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    };
  }

  private async analyzeTableData(tableName: string, limit: number = 5) {
    console.log(`🔍 Analyzing table data for: ${tableName}`);
    
    // Validate table name to prevent injection
    if (!tableName || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error('Invalid table name');
    }

    // Limit sample size for safety
    const sampleLimit = Math.min(limit || 5, 50);

    try {
      // Get row count
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Failed to get row count: ${countError.message}`);
      }

      // Get sample data
      const { data, error: dataError } = await supabase
        .from(tableName)
        .select('*')
        .limit(sampleLimit);

      if (dataError) {
        throw new Error(`Failed to get sample data: ${dataError.message}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: `📈 Table Analysis for "${tableName}":\n\n` +
                  `Total Rows: ${count}\n` +
                  `Sample Data (${sampleLimit} rows):\n\n` +
                  `${JSON.stringify(data, null, 2)}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Table analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async checkRLSPolicies(tableName?: string) {
    console.log('🔒 Checking RLS policies...');
    
    const query = tableName
      ? `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = $1
        ORDER BY tablename, policyname
      `
      : `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
      `;

    // Use secure function for RLS policy information
    const { data, error } = await supabase.rpc('get_rls_policies_info', {
      p_table_name: tableName
    });

    if (error) {
      throw new Error(`RLS policy check failed: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `🔒 RLS Policies Analysis:\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    };
  }

  private async analyzeRelationships() {
    console.log('🔗 Analyzing table relationships...');
    
    const query = `
      SELECT 
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `;

    // Use secure function for relationship analysis
    const { data, error } = await supabase.rpc('get_table_relationships');

    if (error) {
      throw new Error(`Relationship analysis failed: ${error.message}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: `🔗 Database Relationships:\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    };
  }

  private async queryDatabaseSafely(query: string) {
    console.log('🔍 Executing database query...');
    
    // 🚨 SAFETY CHECK: Check for prohibited operations only
    const upperQuery = query.toUpperCase().trim();
    
    // Check for prohibited operations
    for (const prohibited of PROHIBITED_OPERATIONS) {
      if (upperQuery.includes(prohibited)) {
        throw new Error(`🚨 PROHIBITED OPERATION: Query contains "${prohibited}" which is not allowed for safety.`);
      }
    }

    // Allow all queries except prohibited ones (no longer read-only)
    console.log('🔓 Read-only mode disabled - allowing all safe operations');

    try {
      // SECURITY: exec_sql has been removed - use Supabase client methods instead
      throw new Error('Direct SQL execution not allowed for security. Use Supabase client methods or stored procedures.');

      // Code removed for security - direct SQL execution disabled
      return {
        content: [
          {
            type: 'text',
            text: `📊 Query Results:\n\nDirect SQL execution disabled for security`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Safe query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async executeApprovedSQL(sql: string, purpose: string) {
    console.log(`🚀 Executing approved SQL for: ${purpose}`);
    console.log(`📝 SQL: ${sql}`);
    
    // 🚨 SAFETY CHECK: Ensure no prohibited operations
    const upperSQL = sql.toUpperCase().trim();
    
    // Check for prohibited operations
    for (const prohibited of PROHIBITED_OPERATIONS) {
      if (upperSQL.includes(prohibited.replace('.*', ''))) {
        throw new Error(`🚨 PROHIBITED OPERATION: SQL contains "${prohibited}" which is not allowed for safety.`);
      }
    }

    // Additional safety checks for dangerous patterns
    if (upperSQL.includes('DROP TABLE') || upperSQL.includes('TRUNCATE TABLE')) {
      throw new Error('🚨 SAFETY VIOLATION: DROP TABLE and TRUNCATE TABLE operations are prohibited.');
    }

    try {
      console.log('🔄 Executing SQL commands...');
      // SECURITY: exec_sql has been removed - use safe alternatives
      throw new Error('Direct SQL execution not allowed for security. Use safe stored procedures instead.');

      // Code removed for security - direct SQL execution disabled
      console.log('✅ SQL execution disabled for security!');
      
      return {
        content: [
          {
            type: 'text',
            text: `✅ SQL Execution Disabled!\n\nPurpose: ${purpose}\n\nSQL Execution has been disabled for security reasons.\n\n🔒 All safety protocols maintained.`
          }
        ]
      };
    } catch (error) {
      console.error('❌ Approved SQL execution failed:', error);
      throw new Error(`Approved SQL execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getDatabaseStatistics() {
    console.log('📊 Getting database statistics...');
    
    const query = `
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        most_common_vals,
        most_common_freqs,
        histogram_bounds
      FROM pg_stats 
      WHERE schemaname = 'public'
      ORDER BY tablename, attname
    `;

    // SECURITY: Use safe table statistics gathering instead
    throw new Error('Statistics gathering via exec_sql disabled for security. Use pg_stat_user_tables view instead.');

    // Code removed for security - statistics gathering disabled
    return {
      content: [
        {
          type: 'text',
          text: `📊 Database Statistics:\n\nStatistics gathering disabled for security`
        }
      ]
    };
  }

  async run() {
    console.log('🚀 Starting Car Audio Events MCP Server...');
    console.log('🛡️ Production Safety Protocols: ACTIVE');
    console.log('🔓 Read-Only Mode: DISABLED');
    console.log('⚠️  Write Operations: ALLOWED (with safety checks)');
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('✅ MCP Server connected and ready!');
  }
}

// Start the server
const server = new CarAudioEventsMCPServer();
server.run().catch((error) => {
  console.error('❌ Failed to start MCP server:', error);
  process.exit(1);
}); 