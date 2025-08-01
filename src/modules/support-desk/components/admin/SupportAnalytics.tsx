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

const SupportAnalytics: React.FC = () => {
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
    loadAnalytics();
  }, [dateRange]);

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

      // Calculate average response time (mock data for now)
      const avgResponseTime = 4.5; // hours
      const avgResolutionTime = 24; // hours
      const satisfactionScore = 4.2; // out of 5

      // Get agent performance (mock data for now)
      const agentPerformance = [
        { agent: 'John Doe', resolved: 45, avg_time: 18 },
        { agent: 'Jane Smith', resolved: 38, avg_time: 22 },
        { agent: 'Mike Johnson', resolved: 32, avg_time: 20 },
        { agent: 'Sarah Wilson', resolved: 28, avg_time: 25 }
      ];

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

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="large" />
        </div>
      ) : (
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
                  {analytics.agentPerformance.map((agent, index) => (
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
                              style={{ width: `${(agent.resolved / 50) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-100">
                            {Math.round((agent.resolved / 50) * 100)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
};

export default SupportAnalytics;