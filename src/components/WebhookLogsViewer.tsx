import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle, XCircle, Clock, Loader, RotateCcw, AlertTriangle, Info, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/date-utils';

interface WebhookLog {
  id: string;
  provider: 'stripe' | 'paypal';
  event_type: string;
  event_id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  error_message?: string;
  request_body: any;
  response_body?: any;
  metadata?: any;
  created_at: string;
  processed_at?: string;
}

export const WebhookLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [retryingLogs, setRetryingLogs] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<any>(null);
  const limit = 20;

  useEffect(() => {
    // Only load if we haven't checked yet or if we know the table exists
    if (tableExists === null || tableExists === true) {
      loadWebhookLogs();
      loadWebhookStats();
    } else {
      // Table doesn't exist, just set loading to false
      setIsLoading(false);
    }
  }, [page, filterProvider, filterStatus, tableExists]);

  const loadWebhookStats = async () => {
    try {
      if (tableExists === false) return;

      const { data, error } = await supabase
        .from('webhook_logs')
        .select('status, provider, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (error && error.code !== '42P01') {
        console.error('Error loading webhook stats:', error);
        return;
      }

      if (data) {
        const stats = {
          total: data.length,
          succeeded: data.filter(log => log.status === 'succeeded').length,
          failed: data.filter(log => log.status === 'failed').length,
          processing: data.filter(log => log.status === 'processing').length,
          pending: data.filter(log => log.status === 'pending').length,
          stripe: data.filter(log => log.provider === 'stripe').length,
          paypal: data.filter(log => log.provider === 'paypal').length,
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('Error loading webhook stats:', error);
    }
  };

  const loadWebhookLogs = async () => {
    try {
      setIsLoading(true);
      
      // If we already know the table doesn't exist, skip the query
      if (tableExists === false) {
        setIsLoading(false);
        return;
      }
      
      let query = supabase
        .from('webhook_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (filterProvider !== 'all') {
        query = query.eq('provider', filterProvider);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (searchTerm) {
        query = query.or(`event_type.ilike.%${searchTerm}%,event_id.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist yet - this is expected until webhooks are processed
                      setLogs([]);
            setTotalPages(1);
            setTableExists(false);
            return;
        }
        throw error;
      }
      
      setTableExists(true);

      setLogs(data || []);
      setTotalPages(Math.ceil((count || 0) / limit));
    } catch (error) {
      console.error('Error loading webhook logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const retryWebhook = async (log: WebhookLog) => {
    try {
      setRetryingLogs(prev => new Set(prev).add(log.id));

      // Call the appropriate webhook handler based on provider
      const endpoint = log.provider === 'stripe' 
        ? '/api/webhooks/stripe' 
        : '/api/webhooks/paypal';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(log.request_body),
      });

      const result = await response.json();

      // Update the webhook log
      await supabase
        .from('webhook_logs')
        .update({
          status: response.ok ? 'succeeded' : 'failed',
          error_message: response.ok ? null : result.error || 'Retry failed',
          response_body: result,
          processed_at: new Date().toISOString(),
          metadata: {
            ...log.metadata,
            retry_count: (log.metadata?.retry_count || 0) + 1,
            last_retry_at: new Date().toISOString()
          }
        })
        .eq('id', log.id);

      // Reload logs to show updated status
      await loadWebhookLogs();
      await loadWebhookStats();
    } catch (error) {
      console.error('Error retrying webhook:', error);
    } finally {
      setRetryingLogs(prev => {
        const newSet = new Set(prev);
        newSet.delete(log.id);
        return newSet;
      });
    }
  };

  const analyzeWebhookError = (log: WebhookLog) => {
    const errorAnalysis = {
      category: 'unknown',
      severity: 'medium',
      suggestion: 'Check the error message for more details',
      isRetryable: false
    };

    if (!log.error_message) return errorAnalysis;

    const errorMsg = log.error_message.toLowerCase();

    // Network/timeout errors
    if (errorMsg.includes('timeout') || errorMsg.includes('network') || errorMsg.includes('connection')) {
      errorAnalysis.category = 'network';
      errorAnalysis.severity = 'low';
      errorAnalysis.suggestion = 'Temporary network issue. Safe to retry.';
      errorAnalysis.isRetryable = true;
    }
    // Authentication errors
    else if (errorMsg.includes('unauthorized') || errorMsg.includes('invalid signature') || errorMsg.includes('authentication')) {
      errorAnalysis.category = 'authentication';
      errorAnalysis.severity = 'high';
      errorAnalysis.suggestion = 'Check webhook endpoint configuration and signature validation.';
      errorAnalysis.isRetryable = false;
    }
    // Data validation errors
    else if (errorMsg.includes('validation') || errorMsg.includes('invalid data') || errorMsg.includes('missing field')) {
      errorAnalysis.category = 'validation';
      errorAnalysis.severity = 'medium';
      errorAnalysis.suggestion = 'Webhook payload validation failed. Check required fields.';
      errorAnalysis.isRetryable = false;
    }
    // Server errors
    else if (errorMsg.includes('500') || errorMsg.includes('internal server') || errorMsg.includes('database')) {
      errorAnalysis.category = 'server';
      errorAnalysis.severity = 'high';
      errorAnalysis.suggestion = 'Server-side error. Check application logs and database connectivity.';
      errorAnalysis.isRetryable = true;
    }
    // Rate limiting
    else if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
      errorAnalysis.category = 'rate_limit';
      errorAnalysis.severity = 'low';
      errorAnalysis.suggestion = 'Rate limit exceeded. Retry after some time.';
      errorAnalysis.isRetryable = true;
    }

    return errorAnalysis;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-500/20 text-green-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatJson = (data: any) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Webhook Logs</h2>
          <p className="text-gray-400 mt-1">Monitor incoming webhook events from payment providers</p>
        </div>
        <button
          onClick={() => {
            setTableExists(null);
            loadWebhookLogs();
            loadWebhookStats();
          }}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Total (24h)</p>
                <p className="text-xl font-bold text-white">{stats.total}</p>
              </div>
              <Zap className="h-5 w-5 text-electric-500 opacity-50" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Succeeded</p>
                <p className="text-xl font-bold text-green-400">{stats.succeeded}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-400 opacity-50" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Failed</p>
                <p className="text-xl font-bold text-red-400">{stats.failed}</p>
              </div>
              <XCircle className="h-5 w-5 text-red-400 opacity-50" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Processing</p>
                <p className="text-xl font-bold text-yellow-400">{stats.processing}</p>
              </div>
              <Clock className="h-5 w-5 text-yellow-400 opacity-50" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Pending</p>
                <p className="text-xl font-bold text-gray-400">{stats.pending}</p>
              </div>
              <AlertCircle className="h-5 w-5 text-gray-400 opacity-50" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Stripe</p>
                <p className="text-xl font-bold text-blue-400">{stats.stripe}</p>
              </div>
              <div className="w-5 h-5 bg-blue-500 rounded opacity-50" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">PayPal</p>
                <p className="text-xl font-bold text-yellow-400">{stats.paypal}</p>
              </div>
              <div className="w-5 h-5 bg-yellow-500 rounded opacity-50" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && loadWebhookLogs()}
              placeholder="Search by event type or ID..."
              className="w-full pl-10 pr-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
            />
          </div>

          <select
            value={filterProvider}
            onChange={(e) => {
              setFilterProvider(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            <option value="all">All Providers</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 text-electric-500 animate-spin" />
          </div>
        ) : !tableExists ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Webhook Logs Not Yet Initialized</h3>
            <p className="text-gray-400 mb-4">The webhook logs table will be created automatically when the first webhook is received.</p>
            <p className="text-gray-400 text-sm">This typically happens when a payment is processed or a subscription is created.</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No webhook logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-700/30 transition-colors">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleLogExpansion(log.id)}
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="text-white font-medium">{log.event_type}</span>
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                          {log.provider}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                        <span>ID: {log.event_id}</span>
                        <span>{formatDate(log.created_at)}</span>
                        {log.processed_at && (
                          <span>Processed: {formatDate(log.processed_at)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-white">
                    {expandedLogs.has(log.id) ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {expandedLogs.has(log.id) && (
                  <div className="mt-4 space-y-4">
                    {log.error_message && (
                      <div className="space-y-3">
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-red-400 text-sm font-medium mb-1">Error Message</p>
                              <p className="text-red-300 text-sm">{log.error_message}</p>
                            </div>
                            {analyzeWebhookError(log).isRetryable && (
                              <button
                                onClick={() => retryWebhook(log)}
                                disabled={retryingLogs.has(log.id)}
                                className="ml-3 px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white text-xs rounded-lg transition-colors flex items-center"
                              >
                                {retryingLogs.has(log.id) ? (
                                  <Loader className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                )}
                                {retryingLogs.has(log.id) ? 'Retrying...' : 'Retry'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Error Analysis */}
                        {(() => {
                          const analysis = analyzeWebhookError(log);
                          return (
                            <div className={`p-3 rounded-lg border ${
                              analysis.severity === 'high' 
                                ? 'bg-red-500/10 border-red-500/20' 
                                : analysis.severity === 'medium'
                                ? 'bg-yellow-500/10 border-yellow-500/20'
                                : 'bg-blue-500/10 border-blue-500/20'
                            }`}>
                              <div className="flex items-start space-x-2">
                                {analysis.severity === 'high' ? (
                                  <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
                                ) : analysis.severity === 'medium' ? (
                                  <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
                                ) : (
                                  <Info className="h-4 w-4 text-blue-400 mt-0.5" />
                                )}
                                <div>
                                  <p className={`text-sm font-medium ${
                                    analysis.severity === 'high' 
                                      ? 'text-red-400' 
                                      : analysis.severity === 'medium'
                                      ? 'text-yellow-400'
                                      : 'text-blue-400'
                                  }`}>
                                    {analysis.category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Error
                                    {analysis.isRetryable && (
                                      <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                                        Retryable
                                      </span>
                                    )}
                                  </p>
                                  <p className={`text-xs mt-1 ${
                                    analysis.severity === 'high' 
                                      ? 'text-red-300' 
                                      : analysis.severity === 'medium'
                                      ? 'text-yellow-300'
                                      : 'text-blue-300'
                                  }`}>
                                    {analysis.suggestion}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Retry History */}
                        {log.metadata?.retry_count && (
                          <div className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                            <p className="text-gray-400 text-sm font-medium mb-1">Retry History</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-300">
                              <span>Attempts: {log.metadata.retry_count}</span>
                              {log.metadata.last_retry_at && (
                                <span>Last retry: {formatDate(log.metadata.last_retry_at)}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm font-medium mb-2">Request Body</p>
                        <pre className="p-3 bg-gray-900 rounded-lg text-gray-300 text-xs overflow-x-auto">
                          {formatJson(log.request_body)}
                        </pre>
                      </div>

                      {log.response_body && (
                        <div>
                          <p className="text-gray-400 text-sm font-medium mb-2">Response Body</p>
                          <pre className="p-3 bg-gray-900 rounded-lg text-gray-300 text-xs overflow-x-auto">
                            {formatJson(log.response_body)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div>
                        <p className="text-gray-400 text-sm font-medium mb-2">Metadata</p>
                        <pre className="p-3 bg-gray-900 rounded-lg text-gray-300 text-xs overflow-x-auto">
                          {formatJson(log.metadata)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 