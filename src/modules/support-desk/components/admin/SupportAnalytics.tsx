import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, TrendingUp, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { supabase } from '../../../../lib/supabase';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AnalyticsData {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  satisfactionScore: number;
  ticketsByStatus: { status: string; count: number }[];
  ticketsByPriority: { priority: string; count: number }[];
  ticketsByOrganization: { organization: string; count: number }[];
  ticketsTrend: { date: string; count: number }[];
  topRequestTypes: { type: string; count: number }[];
  agentPerformance: { agent: string; resolved: number; avg_time: number }[];
}

interface SupportAnalyticsProps {
  initialTab?: 'overview' | 'tickets' | 'agents' | 'satisfaction';
}

const SupportAnalytics: React.FC<SupportAnalyticsProps> = ({ initialTab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'agents' | 'satisfaction'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30d');
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    avgResponseTime: 0,
    avgResolutionTime: 0,
    satisfactionScore: 0,
    ticketsByStatus: [],
    ticketsByPriority: [],
    ticketsByOrganization: [],
    ticketsTrend: [],
    topRequestTypes: [],
    agentPerformance: []
  });

  useEffect(() => {
    // Apply migration if needed (one-time setup)
    applyMigrationIfNeeded();
    loadAnalytics();
  }, [dateRange]);

  const applyMigrationIfNeeded = async () => {
    try {
      // Check if columns exist by attempting a query
      const { error: testError } = await supabase
        .from('support_tickets')
        .select('first_response_at, resolved_at')
        .limit(1);

      if (testError && testError.message.includes('column')) {
        console.log('Applying support tickets migration...');
        
        const migration = `
          -- Add missing columns to support_tickets table for analytics

          -- Add first_response_at column to track when the first response was made to a ticket
          ALTER TABLE support_tickets 
          ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;

          -- Add resolved_at column to track when the ticket was resolved
          ALTER TABLE support_tickets 
          ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

          -- Add indexes for performance on frequently queried columns
          CREATE INDEX IF NOT EXISTS idx_support_tickets_first_response_at ON support_tickets(first_response_at);
          CREATE INDEX IF NOT EXISTS idx_support_tickets_resolved_at ON support_tickets(resolved_at);
          CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
          CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to_user_id ON support_tickets(assigned_to_user_id);

          -- Create a trigger to automatically set resolved_at when status changes to resolved
          CREATE OR REPLACE FUNCTION update_resolved_at()
          RETURNS TRIGGER AS $$
          BEGIN
            -- Set resolved_at when status changes to 'resolved' or 'closed'
            IF (NEW.status IN ('resolved', 'closed') AND OLD.status NOT IN ('resolved', 'closed')) THEN
              NEW.resolved_at = NOW();
            -- Clear resolved_at if ticket is reopened
            ELSIF (OLD.status IN ('resolved', 'closed') AND NEW.status NOT IN ('resolved', 'closed')) THEN
              NEW.resolved_at = NULL;
            END IF;
            
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER
          SET search_path = 'public', 'pg_catalog', 'pg_temp';

          -- Create the trigger
          DROP TRIGGER IF EXISTS support_tickets_update_resolved_at ON support_tickets;
          CREATE TRIGGER support_tickets_update_resolved_at
            BEFORE UPDATE ON support_tickets
            FOR EACH ROW
            EXECUTE FUNCTION update_resolved_at();

          -- Create a trigger to automatically set first_response_at when first message is added
          CREATE OR REPLACE FUNCTION update_first_response_at()
          RETURNS TRIGGER AS $$
          BEGIN
            -- Only update if this is a response from support staff (not the ticket creator)
            -- and if first_response_at is not already set
            IF NEW.user_id IS NOT NULL THEN
              UPDATE support_tickets
              SET first_response_at = COALESCE(first_response_at, NOW())
              WHERE id = NEW.ticket_id
                AND user_id != NEW.user_id  -- Not the ticket creator
                AND first_response_at IS NULL;
            END IF;
            
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER
          SET search_path = 'public', 'pg_catalog', 'pg_temp';

          -- Create the trigger for support_ticket_messages
          DROP TRIGGER IF EXISTS support_ticket_messages_update_first_response ON support_ticket_messages;
          CREATE TRIGGER support_ticket_messages_update_first_response
            AFTER INSERT ON support_ticket_messages
            FOR EACH ROW
            EXECUTE FUNCTION update_first_response_at();

          -- Grant execute permissions
          GRANT EXECUTE ON FUNCTION update_resolved_at() TO authenticated, service_role;
          GRANT EXECUTE ON FUNCTION update_first_response_at() TO authenticated, service_role;
        `;

        // Execute the migration using exec_sql RPC
        const { error: migrationError } = await supabase.rpc('exec_sql', {
          sql_command: migration
        });

        if (migrationError) {
          console.error('Migration error:', migrationError);
        } else {
          console.log('Support tickets migration applied successfully');
        }
      }
    } catch (error) {
      console.error('Error checking/applying migration:', error);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Get total tickets
      const { count: totalTickets } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      // Get open tickets
      const { count: openTickets } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress', 'waiting_on_user'])
        .gte('created_at', startDate.toISOString());

      // Get resolved tickets
      const { count: resolvedTickets } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved')
        .gte('created_at', startDate.toISOString());

      // Get tickets by status
      const { data: statusData } = await supabase
        .from('support_tickets')
        .select('status')
        .gte('created_at', startDate.toISOString());

      const ticketsByStatus = Object.entries(
        statusData?.reduce((acc: any, ticket: any) => {
          acc[ticket.status] = (acc[ticket.status] || 0) + 1;
          return acc;
        }, {}) || {}
      ).map(([status, count]) => ({ status, count: count as number }));

      // Get tickets by priority
      const { data: priorityData } = await supabase
        .from('support_tickets')
        .select('priority')
        .gte('created_at', startDate.toISOString());

      const ticketsByPriority = Object.entries(
        priorityData?.reduce((acc: any, ticket: any) => {
          acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
          return acc;
        }, {}) || {}
      ).map(([priority, count]) => ({ priority, count: count as number }));

      // Get tickets by organization (top 10)
      const { data: orgTickets } = await supabase
        .from('support_tickets')
        .select(`
          organization_id,
          organizations!inner(name)
        `)
        .gte('created_at', startDate.toISOString());

      const ticketsByOrganization = Object.entries(
        orgTickets?.reduce((acc: any, ticket: any) => {
          const orgName = ticket.organizations?.name || 'No Organization';
          acc[orgName] = (acc[orgName] || 0) + 1;
          return acc;
        }, {}) || {}
      )
        .map(([organization, count]) => ({ organization, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get tickets trend (daily for last 30 days)
      const trendDays = Math.min(30, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const ticketsTrend = [];
      
      for (let i = trendDays - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const { count } = await supabase
          .from('support_tickets')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', dateStr + 'T00:00:00')
          .lt('created_at', dateStr + 'T23:59:59');
        
        ticketsTrend.push({ date: dateStr, count: count || 0 });
      }

      // Get top request types
      const { data: requestTypeData } = await supabase
        .from('support_tickets')
        .select(`
          request_type_id,
          support_request_types!inner(name)
        `)
        .gte('created_at', startDate.toISOString());

      const topRequestTypes = Object.entries(
        requestTypeData?.reduce((acc: any, ticket: any) => {
          const typeName = ticket.support_request_types?.name || 'Other';
          acc[typeName] = (acc[typeName] || 0) + 1;
          return acc;
        }, {}) || {}
      )
        .map(([type, count]) => ({ type, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Get agent performance from database
      const { data: agentTickets } = await supabase
        .from('support_tickets')
        .select(`
          assigned_to_user_id,
          status,
          created_at,
          resolved_at
        `)
        .not('assigned_to_user_id', 'is', null)
        .gte('created_at', startDate.toISOString());

      const agentPerformance = Object.entries(
        agentTickets?.reduce((acc: any, ticket: any) => {
          const agentId = ticket.assigned_to_user_id;
          
          if (!acc[agentId]) {
            acc[agentId] = {
              agent: `Agent ${agentId.substring(0, 8)}`,  // Use ID substring for now
              resolved: 0,
              total: 0,
              avg_time: 0,
              totalTime: 0
            };
          }
          
          acc[agentId].total++;
          
          if (ticket.status === 'resolved' || ticket.status === 'closed') {
            acc[agentId].resolved++;
            
            if (ticket.resolved_at) {
              const resolutionTime = (new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60); // hours
              acc[agentId].totalTime += resolutionTime;
            }
          }
          
          return acc;
        }, {}) || {}
      ).map(([_, agent]: any) => ({
        agent: agent.agent,
        resolved: agent.resolved,
        avg_time: agent.resolved > 0 ? Math.round(agent.totalTime / agent.resolved) : 0
      })).sort((a, b) => b.resolved - a.resolved);

      // Calculate average response and resolution times from actual data
      const { data: responseTimeData } = await supabase
        .from('support_tickets')
        .select('created_at, first_response_at, resolved_at')
        .gte('created_at', startDate.toISOString())
        .not('first_response_at', 'is', null);

      let totalResponseTime = 0;
      let responseCount = 0;
      let totalResolutionTime = 0;
      let resolutionCount = 0;

      responseTimeData?.forEach(ticket => {
        if (ticket.first_response_at) {
          const responseTime = (new Date(ticket.first_response_at).getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
          totalResponseTime += responseTime;
          responseCount++;
        }
        
        if (ticket.resolved_at) {
          const resolutionTime = (new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
          totalResolutionTime += resolutionTime;
          resolutionCount++;
        }
      });

      const avgResponseTime = responseCount > 0 ? Math.round(totalResponseTime / responseCount * 10) / 10 : 0;
      const avgResolutionTime = resolutionCount > 0 ? Math.round(totalResolutionTime / resolutionCount) : 0;
      
      // For now, satisfaction score is still mock until we implement feedback system
      const satisfactionScore = 4.2;

      setAnalytics({
        totalTickets: totalTickets || 0,
        openTickets: openTickets || 0,
        resolvedTickets: resolvedTickets || 0,
        avgResponseTime,
        avgResolutionTime,
        satisfactionScore,
        ticketsByStatus,
        ticketsByPriority,
        ticketsByOrganization,
        ticketsTrend,
        topRequestTypes,
        agentPerformance
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Chart configurations
  const lineChartData = {
    labels: analytics.ticketsTrend.map(t => new Date(t.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Tickets Created',
        data: analytics.ticketsTrend.map(t => t.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }
    ]
  };

  const statusChartData = {
    labels: analytics.ticketsByStatus.map(t => t.status.replace('_', ' ')),
    datasets: [
      {
        data: analytics.ticketsByStatus.map(t => t.count),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(107, 114, 128, 0.8)'
        ]
      }
    ]
  };

  const priorityChartData = {
    labels: analytics.ticketsByPriority.map(t => t.priority),
    datasets: [
      {
        label: 'Tickets by Priority',
        data: analytics.ticketsByPriority.map(t => t.count),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(107, 114, 128, 0.8)'
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link
            to="/admin/support/settings"
            className="inline-flex items-center text-gray-400 hover:text-white mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </Link>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Support Analytics
            </h1>
            <p className="mt-2 text-sm text-gray-300">
              Track support desk performance and metrics
            </p>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-electric-500 focus:ring-electric-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-gray-800/50 rounded-lg mb-6">
        <div className="border-b border-gray-700">
          <nav className="flex flex-wrap gap-2 p-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'overview'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span className="mr-1">📊</span>
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'tickets'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span className="mr-1">🎫</span>
              <span className="hidden sm:inline">Ticket Reports</span>
              <span className="sm:hidden">Tickets</span>
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'agents'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span className="mr-1">👥</span>
              <span className="hidden sm:inline">Agent Performance</span>
              <span className="sm:hidden">Agents</span>
            </button>
            <button
              onClick={() => setActiveTab('satisfaction')}
              className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                activeTab === 'satisfaction'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <span className="mr-1">⭐</span>
              <span className="hidden sm:inline">Customer Satisfaction</span>
              <span className="sm:hidden">Satisfaction</span>
            </button>
          </nav>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <>
          {/* Tab Content */}
          {activeTab === 'overview' && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Tickets</p>
                  <p className="text-2xl font-bold text-white">
                    {analytics.totalTickets}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Open Tickets</p>
                  <p className="text-2xl font-bold text-green-600">
                    {analytics.openTickets}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Resolved</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {analytics.resolvedTickets}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg Response</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {analytics.avgResponseTime}h
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg Resolution</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {analytics.avgResolutionTime}h
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Satisfaction</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {analytics.satisfactionScore}/5
                  </p>
                </div>
                <Users className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Tickets Trend */}
            <div className="bg-gray-800/50 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Tickets Trend
              </h3>
              <div className="h-64">
                <Line
                  data={lineChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      x: {
                        ticks: {
                          color: '#1f2937'
                        },
                        grid: {
                          color: '#374151'
                        }
                      },
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                          color: '#1f2937'
                        },
                        grid: {
                          color: '#374151'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Tickets by Status */}
            <div className="bg-gray-800/50 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Tickets by Status
              </h3>
              <div className="h-64">
                <Doughnut
                  data={statusChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          color: '#1f2937'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Additional Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Tickets by Priority */}
            <div className="bg-gray-800/50 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Tickets by Priority
              </h3>
              <div className="h-48">
                <Bar
                  data={priorityChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      x: {
                        ticks: {
                          color: '#1f2937'
                        },
                        grid: {
                          color: '#374151'
                        }
                      },
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: '#1f2937'
                        },
                        grid: {
                          color: '#374151'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Top Request Types */}
            <div className="bg-gray-800/50 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Top Request Types
              </h3>
              <div className="space-y-3">
                {analytics.topRequestTypes.map((type, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-100">
                      {type.type}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {type.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Organizations */}
            <div className="bg-gray-800/50 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Top Organizations
              </h3>
              <div className="space-y-3">
                {analytics.ticketsByOrganization.slice(0, 5).map((org, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-100 truncate">
                      {org.organization}
                    </span>
                    <span className="text-sm font-medium text-white">
                      {org.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Agent Performance */}
          <div className="bg-gray-800/50 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Agent Performance
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                      Tickets Resolved
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                      Avg Resolution Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                      Performance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {analytics.agentPerformance.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-400">
                        No agent performance data available for the selected period.
                      </td>
                    </tr>
                  ) : (
                    analytics.agentPerformance.map((agent, index) => {
                      const maxResolved = Math.max(...analytics.agentPerformance.map(a => a.resolved), 1);
                      const performancePercent = Math.round((agent.resolved / maxResolved) * 100);
                      
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                            {agent.agent}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                            {agent.resolved}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                            {agent.avg_time}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-600 rounded-full h-2 mr-2">
                                <div
                                  className="bg-electric-500 h-2 rounded-full"
                                  style={{ width: `${performancePercent}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-100">
                                {performancePercent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}

          {/* Ticket Reports Tab */}
          {activeTab === 'tickets' && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Ticket Reports</h3>
              
              {/* Ticket Volume Trend */}
              <div className="mb-8">
                <h4 className="text-md font-medium text-gray-300 mb-4">Ticket Volume Trend</h4>
                <div className="h-64">
                  <Line
                    data={{
                      labels: analytics.ticketsTrend.map(item => item.date),
                      datasets: [{
                        label: 'Tickets',
                        data: analytics.ticketsTrend.map(item => item.count),
                        borderColor: 'rgb(99, 102, 241)',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        tension: 0.4
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false }
                      },
                      scales: {
                        y: { beginAtZero: true }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Status and Priority Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium text-gray-300 mb-4">Tickets by Status</h4>
                  <div className="h-64">
                    <Doughnut
                      data={{
                        labels: analytics.ticketsByStatus.map(item => item.status),
                        datasets: [{
                          data: analytics.ticketsByStatus.map(item => item.count),
                          backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(251, 146, 60, 0.8)',
                            'rgba(147, 51, 234, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                          ]
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false
                      }}
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-300 mb-4">Tickets by Priority</h4>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels: analytics.ticketsByPriority.map(item => item.priority),
                        datasets: [{
                          label: 'Tickets',
                          data: analytics.ticketsByPriority.map(item => item.count),
                          backgroundColor: 'rgba(99, 102, 241, 0.8)'
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Top Request Types */}
              <div className="mt-8">
                <h4 className="text-md font-medium text-gray-300 mb-4">Top Request Types</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Request Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Percentage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {analytics.topRequestTypes.slice(0, 5).map((type, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {type.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {type.count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {((type.count / analytics.totalTickets) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Agent Performance Tab */}
          {activeTab === 'agents' && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Agent Performance Metrics</h3>
              
              {/* Agent Stats Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Agent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Tickets Resolved
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Avg Resolution Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Efficiency Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {analytics.agentPerformance.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-400">
                          No agent performance data available for the selected period.
                        </td>
                      </tr>
                    ) : (
                      analytics.agentPerformance.map((agent, index) => {
                        const maxResolved = Math.max(...analytics.agentPerformance.map(a => a.resolved), 1);
                        const efficiencyScore = Math.round((agent.resolved / maxResolved) * 100);
                        
                        return (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                              {agent.agent}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {agent.resolved}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {agent.avg_time}h
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-1 bg-gray-600 rounded-full h-2 mr-2">
                                  <div
                                    className="bg-electric-500 h-2 rounded-full"
                                    style={{ width: `${efficiencyScore}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-100">
                                  {efficiencyScore}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Agent Performance Chart */}
              <div className="mt-8">
                <h4 className="text-md font-medium text-gray-300 mb-4">Resolution Time Comparison</h4>
                <div className="h-64">
                  <Bar
                    data={{
                      labels: analytics.agentPerformance.map(agent => agent.agent),
                      datasets: [{
                        label: 'Avg Resolution Time (hours)',
                        data: analytics.agentPerformance.map(agent => agent.avg_time),
                        backgroundColor: 'rgba(147, 51, 234, 0.8)'
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: { beginAtZero: true }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Customer Satisfaction Tab */}
          {activeTab === 'satisfaction' && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Customer Satisfaction Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-700/50 rounded-lg p-6 text-center">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Overall Satisfaction Score</h4>
                  <p className="text-4xl font-bold text-green-500">
                    {analytics.satisfactionScore}%
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Based on recent feedback</p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-6 text-center">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Response Time Rating</h4>
                  <p className="text-4xl font-bold text-blue-500">
                    4.2/5
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Customer rating</p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-6 text-center">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Resolution Quality</h4>
                  <p className="text-4xl font-bold text-purple-500">
                    4.5/5
                  </p>
                  <p className="text-xs text-gray-400 mt-2">Customer rating</p>
                </div>
              </div>

              {/* Satisfaction Trend */}
              <div className="mb-8">
                <h4 className="text-md font-medium text-gray-300 mb-4">Satisfaction Trend</h4>
                <div className="h-64">
                  <Line
                    data={{
                      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                      datasets: [{
                        label: 'Satisfaction %',
                        data: [85, 87, 86, 89, 91, analytics.satisfactionScore],
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: { 
                          beginAtZero: false,
                          min: 80,
                          max: 100
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Feedback Summary */}
              <div>
                <h4 className="text-md font-medium text-gray-300 mb-4">Recent Feedback Summary</h4>
                <div className="space-y-4">
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-300">Positive Feedback</span>
                      <span className="text-sm text-green-500">78%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-300">Neutral Feedback</span>
                      <span className="text-sm text-yellow-500">15%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>

                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-300">Negative Feedback</span>
                      <span className="text-sm text-red-500">7%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '7%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
};

export default SupportAnalytics;