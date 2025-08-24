import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Mail, Search, Filter, RefreshCw, Trash2, Eye, Send,
  CheckCircle, XCircle, Clock, AlertCircle, ChevronDown,
  ChevronUp, Calendar, User, FileText, MoreVertical
} from 'lucide-react';
import { useNotifications } from '../NotificationSystem';

interface EmailQueueItem {
  id: string;
  to_email: string;
  from_email?: string;
  subject: string;
  html_content?: string;
  text_content?: string;
  status: 'pending' | 'sent' | 'failed' | 'processing';
  error_message?: string;
  template_id?: string;
  template_name?: string;
  created_at: string;
  last_attempt_at?: string;  // This is the actual sent timestamp
  attempts: number;
  metadata?: any;
}

const STATUS_COLORS = {
  pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: Clock },
  processing: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', icon: RefreshCw },
  sent: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', icon: CheckCircle },
  failed: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', icon: XCircle }
};

export const EmailQueueManager: React.FC = () => {
  const { showSuccess, showError, showInfo } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<EmailQueueItem[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<EmailQueueItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailQueueItem | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  
  // Filter states - default to 'pending' to show pending emails by default
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showDetails, setShowDetails] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadEmails();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadEmails, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterEmails();
  }, [emails, statusFilter, searchTerm, dateFilter]);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const { data: emailData, error: emailError } = await supabase
        .from('email_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (emailError) throw emailError;
      
      // Load template names if there are template_ids
      const emails = emailData || [];
      const templateIds = [...new Set(emails.filter(e => e.template_id).map(e => e.template_id))];
      
      if (templateIds.length > 0) {
        const { data: templates, error: templateError } = await supabase
          .from('email_templates')
          .select('id, name')
          .in('id', templateIds);
        
        if (!templateError && templates) {
          const templateMap = new Map(templates.map(t => [t.id, t.name]));
          emails.forEach(email => {
            if (email.template_id) {
              email.template_name = templateMap.get(email.template_id) || null;
            }
          });
        }
      }
      
      setEmails(emails);
    } catch (error) {
      console.error('Error loading emails:', error);
      showError('Failed to load email queue');
    } finally {
      setLoading(false);
    }
  };

  const filterEmails = () => {
    let filtered = [...emails];
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(email => email.status === statusFilter);
    }
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(email => 
        email.to_email.toLowerCase().includes(search) ||
        email.subject.toLowerCase().includes(search) ||
        email.template_name?.toLowerCase().includes(search)
      );
    }
    
    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(email => new Date(email.created_at) >= today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(email => new Date(email.created_at) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(email => new Date(email.created_at) >= monthAgo);
    }
    
    setFilteredEmails(filtered);
    setCurrentPage(1);
  };

  const resendEmail = async (emailId: string) => {
    try {
      showInfo('Resending email...');
      
      // Reset status to pending and clear error
      const { error } = await supabase
        .from('email_queue')
        .update({
          status: 'pending',
          error_message: null,
          attempts: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', emailId);
      
      if (error) throw error;
      
      showSuccess('Email queued for resending');
      loadEmails();
    } catch (error) {
      console.error('Error resending email:', error);
      showError('Failed to resend email');
    }
  };

  const deleteEmail = async (emailId: string) => {
    if (!confirm('Are you sure you want to delete this email from the queue?')) return;
    
    try {
      const { error } = await supabase
        .from('email_queue')
        .delete()
        .eq('id', emailId);
      
      if (error) throw error;
      
      showSuccess('Email deleted from queue');
      loadEmails();
    } catch (error) {
      console.error('Error deleting email:', error);
      showError('Failed to delete email');
    }
  };

  const deleteSelectedEmails = async () => {
    if (selectedEmails.size === 0) {
      showError('No emails selected');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedEmails.size} email(s) from the queue?`)) return;
    
    try {
      const { error } = await supabase
        .from('email_queue')
        .delete()
        .in('id', Array.from(selectedEmails));
      
      if (error) throw error;
      
      showSuccess(`${selectedEmails.size} email(s) deleted from queue`);
      setSelectedEmails(new Set());
      loadEmails();
    } catch (error) {
      console.error('Error deleting emails:', error);
      showError('Failed to delete emails');
    }
  };

  const toggleEmailSelection = (emailId: string) => {
    const newSelection = new Set(selectedEmails);
    if (newSelection.has(emailId)) {
      newSelection.delete(emailId);
    } else {
      newSelection.add(emailId);
    }
    setSelectedEmails(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === paginatedEmails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(paginatedEmails.map(e => e.id)));
    }
  };

  const processQueue = async () => {
    try {
      showInfo('Processing email queue...');
      
      // Trigger the edge function to process emails
      const { data, error } = await supabase.functions.invoke('process-email-queue', {
        body: { manual: true }
      });
      
      if (error) throw error;
      
      if (data.processed > 0) {
        showSuccess(`Processed ${data.processed} emails`);
      } else {
        showInfo('No pending emails to process');
      }
      
      loadEmails();
    } catch (error) {
      console.error('Error processing queue:', error);
      showError('Failed to process email queue');
    }
  };

  const clearFailedEmails = async () => {
    if (!confirm('Are you sure you want to clear all failed emails?')) return;
    
    try {
      const { error } = await supabase
        .from('email_queue')
        .delete()
        .eq('status', 'failed');
      
      if (error) throw error;
      
      showSuccess('Failed emails cleared');
      loadEmails();
    } catch (error) {
      console.error('Error clearing failed emails:', error);
      showError('Failed to clear failed emails');
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredEmails.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmails = filteredEmails.slice(startIndex, startIndex + itemsPerPage);

  // Stats
  const stats = {
    total: emails.length,
    pending: emails.filter(e => e.status === 'pending').length,
    sent: emails.filter(e => e.status === 'sent').length,
    failed: emails.filter(e => e.status === 'failed').length,
    processing: emails.filter(e => e.status === 'processing').length
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Emails</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <Mail className="w-8 h-8 text-gray-500" />
          </div>
        </div>
        
        <div className={`rounded-lg border p-4 ${STATUS_COLORS.pending.bg} ${STATUS_COLORS.pending.border}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending</p>
              <p className={`text-2xl font-bold ${STATUS_COLORS.pending.text}`}>{stats.pending}</p>
            </div>
            <Clock className={`w-8 h-8 ${STATUS_COLORS.pending.text}`} />
          </div>
        </div>
        
        <div className={`rounded-lg border p-4 ${STATUS_COLORS.processing.bg} ${STATUS_COLORS.processing.border}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Processing</p>
              <p className={`text-2xl font-bold ${STATUS_COLORS.processing.text}`}>{stats.processing}</p>
            </div>
            <RefreshCw className={`w-8 h-8 ${STATUS_COLORS.processing.text}`} />
          </div>
        </div>
        
        <div className={`rounded-lg border p-4 ${STATUS_COLORS.sent.bg} ${STATUS_COLORS.sent.border}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Sent</p>
              <p className={`text-2xl font-bold ${STATUS_COLORS.sent.text}`}>{stats.sent}</p>
            </div>
            <CheckCircle className={`w-8 h-8 ${STATUS_COLORS.sent.text}`} />
          </div>
        </div>
        
        <div className={`rounded-lg border p-4 ${STATUS_COLORS.failed.bg} ${STATUS_COLORS.failed.border}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Failed</p>
              <p className={`text-2xl font-bold ${STATUS_COLORS.failed.text}`}>{stats.failed}</p>
            </div>
            <XCircle className={`w-8 h-8 ${STATUS_COLORS.failed.text}`} />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email, subject, or template..."
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          
          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          
          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={loadEmails}
              disabled={loading}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            {selectedEmails.size > 0 && (
              <button
                onClick={deleteSelectedEmails}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedEmails.size})
              </button>
            )}
            
            {stats.pending > 0 && (
              <button
                onClick={processQueue}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Process Queue
              </button>
            )}
            
            {stats.failed > 0 && (
              <button
                onClick={clearFailedEmails}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Failed
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-700">
              <tr>
                <th className="p-4 w-12">
                  <input
                    type="checkbox"
                    checked={paginatedEmails.length > 0 && selectedEmails.size === paginatedEmails.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-700 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">To</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Subject</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Sent At</th>
                <th className="text-left p-4 text-sm font-medium text-gray-400">Attempts</th>
                <th className="text-right p-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEmails.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-gray-400">
                    {loading ? 'Loading...' : 'No emails found'}
                  </td>
                </tr>
              ) : (
                paginatedEmails.map((email) => {
                  const StatusIcon = STATUS_COLORS[email.status].icon;
                  const isExpanded = showDetails === email.id;
                  
                  return (
                    <React.Fragment key={email.id}>
                      <tr className="border-b border-gray-700/50 hover:bg-gray-900/30 transition-colors">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedEmails.has(email.id)}
                            onChange={() => toggleEmailSelection(email.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-700 rounded focus:ring-blue-500 focus:ring-2"
                          />
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${STATUS_COLORS[email.status].bg} ${STATUS_COLORS[email.status].border} border`}>
                            <StatusIcon className={`w-4 h-4 ${STATUS_COLORS[email.status].text}`} />
                            <span className={`text-xs font-medium ${STATUS_COLORS[email.status].text}`}>
                              {email.status}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-white">{email.to_email}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-300">{email.subject}</span>
                        </td>
                        <td className="p-4">
                          {email.last_attempt_at ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-400">
                                {new Date(email.last_attempt_at).toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-gray-400">{email.attempts || 0}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setShowDetails(isExpanded ? null : email.id)}
                              className="text-gray-400 hover:text-white transition-colors"
                              title="View details"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            
                            {email.status === 'failed' && (
                              <button
                                onClick={() => resendEmail(email.id)}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                title="Resend email"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => deleteEmail(email.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Delete email"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-4 bg-gray-900/50">
                            <div className="space-y-4">
                              {email.error_message && (
                                <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium text-red-400">Error Message</p>
                                    <p className="text-sm text-gray-300 mt-1">{email.error_message}</p>
                                  </div>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">From Email</p>
                                  <p className="text-sm text-white">{email.from_email || 'Default sender'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Created At</p>
                                  <p className="text-sm text-white">
                                    {new Date(email.created_at).toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Sent At</p>
                                  <p className="text-sm text-white">
                                    {email.last_attempt_at ? new Date(email.last_attempt_at).toLocaleString() : 'Not sent yet'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Template</p>
                                  <p className="text-sm text-white">
                                    {email.template_id ? (
                                      <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        {email.template_name || `Template ID: ${email.template_id}`}
                                      </span>
                                    ) : 'Custom Email'}
                                  </p>
                                </div>
                              </div>
                              
                              {email.html_content && (
                                <div>
                                  <p className="text-xs text-gray-400 mb-2">Email Preview</p>
                                  <div className="bg-white rounded-lg p-4 max-h-64 overflow-y-auto">
                                    <div dangerouslySetInnerHTML={{ __html: email.html_content }} />
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredEmails.length)} of {filteredEmails.length} emails
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};