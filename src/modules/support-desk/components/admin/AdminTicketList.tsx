import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { ticketService } from '../../services/supabase-client';
import type { SupportTicketWithRelations, TicketFilters, TicketStatus, TicketPriority } from '../../types';

const AdminTicketList: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicketWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters - Default to showing all tickets
  const [statusFilter, setStatusFilter] = useState<TicketStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority[]>([]);
  const [assignedFilter, setAssignedFilter] = useState<'all' | 'unassigned' | 'assigned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSpam, setShowSpam] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    open: 0,
    in_progress: 0,
    waiting_on_user: 0,
    unassigned: 0,
    high_priority: 0
  });
  
  useEffect(() => {
    loadTickets();
    loadStats();
  }, [currentPage, statusFilter, priorityFilter, assignedFilter, searchTerm, showSpam]);
  
  const loadTickets = async () => {
    setLoading(true);
    try {
      const filters: TicketFilters = {
        status: statusFilter.length > 0 ? statusFilter : undefined,
        priority: priorityFilter.length > 0 ? priorityFilter : undefined,
        search: searchTerm || undefined,
        is_spam: showSpam ? undefined : false
      };
      
      // Note: Assignment filtering would need backend support
      // For now, we'll filter the results client-side after fetching
      
      const response = await ticketService.getTickets(filters, {
        page: currentPage,
        limit: 20,
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      
      // Apply client-side assignment filtering
      let filteredTickets = response.data;
      if (assignedFilter === 'unassigned') {
        filteredTickets = response.data.filter(ticket => !ticket.assigned_to_user_id && !ticket.assigned_to_org_id);
      } else if (assignedFilter === 'assigned') {
        filteredTickets = response.data.filter(ticket => ticket.assigned_to_user_id || ticket.assigned_to_org_id);
      }
      
      setTickets(filteredTickets);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error('Error loading tickets:', error);
      setError('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };
  
  const loadStats = async () => {
    try {
      // Load various stats - in a real app this would be a dedicated endpoint
      const openTickets = await ticketService.getTickets({ status: ['open'] }, { page: 1, limit: 1 });
      const inProgressTickets = await ticketService.getTickets({ status: ['in_progress'] }, { page: 1, limit: 1 });
      const waitingTickets = await ticketService.getTickets({ status: ['waiting_on_user'] }, { page: 1, limit: 1 });
      const highPriorityTickets = await ticketService.getTickets({ priority: ['high', 'urgent'] }, { page: 1, limit: 1 });
      
      // Get all tickets to count unassigned ones
      const allTickets = await ticketService.getTickets({}, { page: 1, limit: 100 });
      const unassignedCount = allTickets.data.filter(t => !t.assigned_to_user_id && !t.assigned_to_org_id).length;
      
      setStats({
        open: openTickets.total,
        in_progress: inProgressTickets.total,
        waiting_on_user: waitingTickets.total,
        unassigned: unassignedCount,
        high_priority: highPriorityTickets.total
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };
  
  const handleAssignTicket = async (ticketId: string, userId?: string) => {
    try {
      await ticketService.updateTicket(ticketId, {
        assigned_to_user_id: userId || user?.id
      });
      await loadTickets();
    } catch (error) {
      console.error('Error assigning ticket:', error);
    }
  };
  
  const handleMarkAsSpam = async (ticketId: string) => {
    try {
      await ticketService.updateTicket(ticketId, {
        is_spam: true,
        status: 'closed'
      });
      await loadTickets();
    } catch (error) {
      console.error('Error marking as spam:', error);
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'normal': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'waiting_on_user': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-purple-600 bg-purple-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">
            Support Ticket Management
          </h1>
          <Link
            to="/admin/support/settings"
            className="inline-flex items-center px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600 transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-green-400">{stats.open}</div>
          <div className="text-sm text-gray-400">Open Tickets</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-blue-400">{stats.in_progress}</div>
          <div className="text-sm text-gray-400">In Progress</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-yellow-400">{stats.waiting_on_user}</div>
          <div className="text-sm text-gray-400">Waiting on User</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-red-400">{stats.high_priority}</div>
          <div className="text-sm text-gray-400">High Priority</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-gray-400">{stats.unassigned}</div>
          <div className="text-sm text-gray-400">Unassigned</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search tickets..."
              className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <select
              multiple
              value={statusFilter}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value) as TicketStatus[];
                setStatusFilter(selected);
                setCurrentPage(1);
              }}
              className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
              size={3}
            >
              <option value="open" className="py-1">Open</option>
              <option value="in_progress" className="py-1">In Progress</option>
              <option value="waiting_on_user" className="py-1">Waiting on User</option>
              <option value="resolved" className="py-1">Resolved</option>
              <option value="closed" className="py-1">Closed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Priority
            </label>
            <select
              multiple
              value={priorityFilter}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value) as TicketPriority[];
                setPriorityFilter(selected);
                setCurrentPage(1);
              }}
              className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
              size={3}
            >
              <option value="urgent" className="py-1">Urgent</option>
              <option value="high" className="py-1">High</option>
              <option value="normal" className="py-1">Normal</option>
              <option value="low" className="py-1">Low</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Assignment
            </label>
            <select
              value={assignedFilter}
              onChange={(e) => {
                setAssignedFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
            >
              <option value="all">All Tickets</option>
              <option value="unassigned">Unassigned Only</option>
              <option value="assigned">Assigned Only</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex items-center">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={showSpam}
              onChange={(e) => {
                setShowSpam(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded border-gray-300 text-blue-600"
            />
            <span className="ml-2 text-sm text-gray-600">Show spam tickets</span>
          </label>
        </div>
      </div>
      
      {/* Tickets Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="large" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-8 text-center">
          <p className="text-gray-400">No tickets found matching your filters</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {tickets.map((ticket, index) => (
                  <tr key={ticket.id} className={`${index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/50'} ${ticket.is_spam ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      #{ticket.ticket_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {ticket.user ? (
                        <>
                          {ticket.user.name}
                          <br />
                          <span className="text-xs text-gray-400">{ticket.user.email}</span>
                        </>
                      ) : ticket.anonymous_email ? (
                        <>
                          {ticket.anonymous_first_name} {ticket.anonymous_last_name}
                          <br />
                          <span className="text-xs text-gray-400">{ticket.anonymous_email}</span>
                          <span className="ml-1 text-xs text-yellow-500">(Anonymous)</span>
                        </>
                      ) : (
                        'Unknown User'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white font-medium">
                        {ticket.title}
                      </div>
                      <div className="text-sm text-gray-400">
                        {ticket.request_type?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                      {ticket.is_spam && (
                        <span className="ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          SPAM
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {ticket.assigned_to_user ? (
                        <span>{ticket.assigned_to_user.name}</span>
                      ) : ticket.assigned_to_org ? (
                        <span>{ticket.assigned_to_org.name}</span>
                      ) : (
                        <button
                          onClick={() => handleAssignTicket(ticket.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Assign to me
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/admin/support/ticket/${ticket.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </Link>
                        {!ticket.is_spam && (
                          <button
                            onClick={() => handleMarkAsSpam(ticket.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Spam
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-600 bg-gray-700 text-sm font-medium text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="relative inline-flex items-center px-4 py-2 border border-gray-600 bg-gray-700 text-sm font-medium text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-600 bg-gray-700 text-sm font-medium text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
};

export default AdminTicketList;