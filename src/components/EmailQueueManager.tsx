import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  Eye, 
  Search, 
  Filter,
  Calendar,
  User,
  AlertCircle,
  Send,
  Pause,
  Play,
  RotateCcw,
  Download,
  Archive
} from 'lucide-react';

interface EmailQueueItem {
  id: string;
  to_email: string;
  from_email: string;
  from_name: string;
  subject: string;
  email_type: string;
  template_name: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'retrying';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduled_at: string;
  sent_at?: string;
  failed_at?: string;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  html_content: string;
  text_content: string;
  variables: Record<string, any>;
  created_at: string;
  updated_at: string;
  user_id?: string;
  user_name?: string;
}

interface QueueStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  retrying: number;
  todaySent: number;
  weekSent: number;
  monthSent: number;
}

export default function EmailQueueManager({ onClose }: { onClose: () => void }) {
  const [queueItems, setQueueItems] = useState<EmailQueueItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<EmailQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    sent: 0,
    failed: 0,
    retrying: 0,
    todaySent: 0,
    weekSent: 0,
    monthSent: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<EmailQueueItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadQueueData();
    // Auto-refresh re-enabled now that RLS policies are fixed
    const interval = setInterval(() => {
      // Only refresh if we're not showing an error message about missing tables
      if (!message.includes('Email Queue System Not Deployed')) {
        loadQueueData();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [message]);

  useEffect(() => {
    filterItems();
  }, [queueItems, searchTerm, statusFilter, typeFilter, dateFilter]);

  const loadQueueData = async () => {
    try {
      setIsLoading(true);
      
      // Import supabase client
      const { supabase } = await import('../lib/supabase');
      
      // Fetch queue data without profile join for now (simpler and more reliable)
      const { data: queueData, error: queueError } = await supabase
        .from('email_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (queueError) {
        console.error('Error fetching queue data:', queueError);
        
        console.error('Error fetching queue data:', queueError);
        setMessage(`⚠️ Error loading email queue data: ${queueError.message || 'Unknown error'}`);
        setQueueItems([]);
        setStats({
          total: 0,
          pending: 0,
          sent: 0,
          failed: 0,
          retrying: 0,
          todaySent: 0,
          weekSent: 0,
          monthSent: 0
        });
        return;
      }

      // Transform data to match interface
      const transformedData: EmailQueueItem[] = (queueData || []).map(item => ({
        id: item.id,
        to_email: item.to_email,
        from_email: item.from_email,
        from_name: item.from_name,
        subject: item.subject,
        email_type: item.email_type,
        template_name: item.template_name || 'Unknown Template',
        status: item.status,
        priority: item.priority,
        scheduled_at: item.scheduled_at,
        sent_at: item.sent_at,
        failed_at: item.failed_at,
        retry_count: item.retry_count,
        max_retries: item.max_retries,
        error_message: item.error_message,
        html_content: item.html_content,
        text_content: item.text_content,
        variables: item.variables || {},
        created_at: item.created_at,
        updated_at: item.updated_at,
        user_id: item.user_id,
        user_name: item.user_name || 'Unknown User'
      }));

      setQueueItems(transformedData);
      calculateStats(transformedData);
      
      if (transformedData.length === 0) {
        setMessage('📭 Email queue is empty. No emails have been queued yet.');
      }
      
    } catch (error) {
      console.error('Error loading queue data:', error);
      setMessage('❌ Failed to load email queue data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  const calculateStats = (items: EmailQueueItem[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats: QueueStats = {
      total: items.length,
      pending: items.filter(item => item.status === 'pending').length,
      sent: items.filter(item => item.status === 'sent').length,
      failed: items.filter(item => item.status === 'failed').length,
      retrying: items.filter(item => item.status === 'retrying').length,
      todaySent: items.filter(item => 
        item.status === 'sent' && item.sent_at && new Date(item.sent_at) >= today
      ).length,
      weekSent: items.filter(item => 
        item.status === 'sent' && item.sent_at && new Date(item.sent_at) >= weekAgo
      ).length,
      monthSent: items.filter(item => 
        item.status === 'sent' && item.sent_at && new Date(item.sent_at) >= monthAgo
      ).length
    };

    setStats(stats);
  };

  const filterItems = () => {
    let filtered = [...queueItems];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.to_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.email_type === typeFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (dateFilter) {
        case 'today':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter(item => new Date(item.created_at) >= cutoffDate);
    }

    // Sort by created_at (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFilteredItems(filtered);
  };

  const resendEmail = async (item: EmailQueueItem) => {
    setIsProcessing(true);
    try {
      // In a real implementation, this would call the email service
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      const updatedItem = {
        ...item,
        status: 'pending' as const,
        retry_count: item.retry_count + 1,
        error_message: undefined,
        updated_at: new Date().toISOString()
      };

      setQueueItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
      setMessage(`Email queued for resending to ${item.to_email}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to resend email');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteEmail = async (item: EmailQueueItem) => {
    if (!confirm(`Are you sure you want to delete the email to ${item.to_email}?`)) return;

    setQueueItems(prev => prev.filter(i => i.id !== item.id));
    setMessage('Email deleted from queue');
    setTimeout(() => setMessage(''), 3000);
  };

  const purgeQueue = async (status?: string) => {
    const confirmMessage = status 
      ? `Are you sure you want to purge all ${status} emails?`
      : 'Are you sure you want to purge the entire email queue?';
    
    if (!confirm(confirmMessage)) return;

    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      if (status) {
        setQueueItems(prev => prev.filter(item => item.status !== status));
        setMessage(`All ${status} emails purged from queue`);
      } else {
        setQueueItems([]);
        setMessage('Email queue purged');
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to purge queue');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const retryFailedEmails = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      setQueueItems(prev => prev.map(item => 
        item.status === 'failed' && item.retry_count < item.max_retries
          ? { ...item, status: 'pending' as const, error_message: undefined, updated_at: new Date().toISOString() }
          : item
      ));
      setMessage('Failed emails queued for retry');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to retry emails');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportQueue = () => {
    const csvContent = [
      ['ID', 'To Email', 'Subject', 'Status', 'Type', 'Created At', 'Sent At', 'Error'].join(','),
      ...filteredItems.map(item => [
        item.id,
        item.to_email,
        `"${item.subject}"`,
        item.status,
        item.email_type,
        item.created_at,
        item.sent_at || '',
        `"${item.error_message || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email_queue_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-400 bg-green-500/20';
      case 'pending': return 'text-blue-400 bg-blue-500/20';
      case 'failed': return 'text-red-400 bg-red-500/20';
      case 'retrying': return 'text-yellow-400 bg-yellow-500/20';
      case 'sending': return 'text-purple-400 bg-purple-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/20';
      case 'high': return 'text-orange-400 bg-orange-500/20';
      case 'normal': return 'text-blue-400 bg-blue-500/20';
      case 'low': return 'text-gray-400 bg-gray-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mx-auto"></div>
        <p className="text-center text-gray-400 mt-2">Loading email queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all duration-200"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Email Queue Manager</h1>
            <p className="text-gray-400">Monitor, manage, and resend emails</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={loadQueueData}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={exportQueue}
            className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all duration-200"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('Failed') || message.includes('error')
            ? 'bg-red-500/20 border border-red-500/30 text-red-400'
            : 'bg-green-500/20 border border-green-500/30 text-green-400'
        }`}>
          {message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-electric-400" />
            <span className="text-gray-300 text-sm">Total</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-400" />
            <span className="text-gray-300 text-sm">Pending</span>
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats.pending}</div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-gray-300 text-sm">Sent</span>
          </div>
          <div className="text-2xl font-bold text-green-400 mt-1">{stats.sent}</div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="h-5 w-5 text-red-400" />
            <span className="text-gray-300 text-sm">Failed</span>
          </div>
          <div className="text-2xl font-bold text-red-400 mt-1">{stats.failed}</div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <RotateCcw className="h-5 w-5 text-yellow-400" />
            <span className="text-gray-300 text-sm">Retrying</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.retrying}</div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-electric-400" />
            <span className="text-gray-300 text-sm">Today</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats.todaySent}</div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-electric-400" />
            <span className="text-gray-300 text-sm">Week</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats.weekSent}</div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-electric-400" />
            <span className="text-gray-300 text-sm">Month</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats.monthSent}</div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-electric-500 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-electric-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="retrying">Retrying</option>
            <option value="sending">Sending</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-electric-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="welcome">Welcome</option>
            <option value="password_reset">Password Reset</option>
            <option value="email_verification">Email Verification</option>
            <option value="system_notification">System Notification</option>
            <option value="event_notification">Event Notification</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-electric-500 focus:outline-none"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        {/* Bulk Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={retryFailedEmails}
            disabled={isProcessing || stats.failed === 0}
            className="flex items-center space-x-2 px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Retry Failed ({stats.failed})</span>
          </button>

          <button
            onClick={() => purgeQueue('sent')}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all duration-200 disabled:opacity-50"
          >
            <Archive className="h-4 w-4" />
            <span>Archive Sent</span>
          </button>

          <button
            onClick={() => purgeQueue('failed')}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>Purge Failed</span>
          </button>

          <button
            onClick={() => purgeQueue()}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            <span>Purge All</span>
          </button>
        </div>
      </div>

      {/* Email Queue Table */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    No emails found matching your filters
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-700/30 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-white font-medium">{item.to_email}</div>
                        {item.user_name && (
                          <div className="text-gray-400 text-sm">{item.user_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white max-w-xs truncate" title={item.subject}>
                        {item.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                      {item.error_message && (
                        <div className="text-red-400 text-xs mt-1 max-w-xs truncate" title={item.error_message}>
                          {item.error_message}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300 text-sm">{item.email_type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300 text-sm">
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {new Date(item.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="p-1 text-blue-400 hover:text-blue-300 transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {(item.status === 'failed' || item.status === 'sent') && (
                          <button
                            onClick={() => resendEmail(item)}
                            disabled={isProcessing}
                            className="p-1 text-green-400 hover:text-green-300 transition-colors duration-200 disabled:opacity-50"
                            title="Resend Email"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteEmail(item)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors duration-200"
                          title="Delete Email"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold text-xl">Email Details</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">To Email</label>
                  <div className="text-white">{selectedItem.to_email}</div>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">From</label>
                  <div className="text-white">{selectedItem.from_name} &lt;{selectedItem.from_email}&gt;</div>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Subject</label>
                  <div className="text-white">{selectedItem.subject}</div>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedItem.status)}`}>
                    {selectedItem.status}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Type</label>
                  <div className="text-white">{selectedItem.email_type}</div>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Priority</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedItem.priority)}`}>
                    {selectedItem.priority}
                  </span>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Retry Count</label>
                  <div className="text-white">{selectedItem.retry_count} / {selectedItem.max_retries}</div>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-1">Created</label>
                  <div className="text-white">{new Date(selectedItem.created_at).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {selectedItem.error_message && (
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-medium mb-2">Error Message</label>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-300">
                  {selectedItem.error_message}
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-medium mb-2">Variables</label>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <pre className="text-gray-300 text-sm overflow-x-auto">
                  {JSON.stringify(selectedItem.variables, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-medium mb-2">HTML Content</label>
              <div className="bg-gray-700/50 rounded-lg p-3 max-h-64 overflow-y-auto">
                <pre className="text-gray-300 text-sm">
                  {selectedItem.html_content}
                </pre>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              {(selectedItem.status === 'failed' || selectedItem.status === 'sent') && (
                <button
                  onClick={() => resendEmail(selectedItem)}
                  disabled={isProcessing}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all duration-200 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>Resend Email</span>
                </button>
              )}
              
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 