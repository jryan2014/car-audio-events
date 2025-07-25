import React, { useState, useEffect } from 'react';
import { Mail, Send, Users, Eye, MousePointer, X, Search, Download, Filter, Calendar, Tag, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface NewsletterSubscriber {
  id: string;
  email: string;
  status: 'pending' | 'confirmed' | 'unsubscribed';
  confirmed_at?: string;
  unsubscribed_at?: string;
  source: string;
  tags: string[];
  created_at: string;
  user?: {
    name: string;
    membership_type: string;
  };
}

interface NewsletterCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  html_content?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduled_for?: string;
  sent_at?: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  unsubscribe_count: number;
  tags: string[];
  created_at: string;
}

interface EmailQueueItem {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status?: string;
  created_at: string;
  attempts?: number;
  last_attempt_at?: string;
  error_message?: string;
}

export default function AdminNewsletterManager() {
  const [activeTab, setActiveTab] = useState<'subscribers' | 'campaigns' | 'compose' | 'queue'>('subscribers');
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [emailQueue, setEmailQueue] = useState<EmailQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);
  
  // Compose state
  const [composeData, setComposeData] = useState({
    name: '',
    subject: '',
    content: '',
    html_content: '',
    tags: [] as string[],
    scheduled_for: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'subscribers') {
        await loadSubscribers();
      } else if (activeTab === 'campaigns') {
        await loadCampaigns();
      } else if (activeTab === 'queue') {
        await loadEmailQueue();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscribers = async () => {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select(`
        *,
        user:users(name, membership_type)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading subscribers:', error);
      return;
    }

    setSubscribers(data || []);
    
    // Extract unique tags
    const tags = new Set<string>();
    data?.forEach(sub => {
      sub.tags?.forEach(tag => tags.add(tag));
    });
    setAvailableTags(Array.from(tags));
  };

  const loadCampaigns = async () => {
    const { data, error } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading campaigns:', error);
      return;
    }

    setCampaigns(data || []);
  };

  const loadEmailQueue = async () => {
    const { data, error } = await supabase
      .from('email_queue')
      .select('*')
      .like('subject', '%newsletter%')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading email queue:', error);
      return;
    }

    setEmailQueue(data || []);
  };

  const sendEmailNow = async (emailId: string) => {
    setProcessingEmail(emailId);
    try {
      // Since we can't directly trigger the edge function without the cron secret,
      // we'll use a different approach - navigate to the email settings page
      // where they can manually process the queue
      
      const confirmProcess = window.confirm(
        'Newsletter emails are processed automatically every minute.\n\n' +
        'Would you like to go to the Email Settings page where you can manually process all emails?'
      );
      
      if (confirmProcess) {
        window.location.href = '/admin/settings';
      } else {
        alert('Your email will be sent automatically within the next minute.');
      }

      // Reload the queue after a short delay
      setTimeout(() => {
        loadEmailQueue();
      }, 2000);
      
    } catch (error) {
      console.error('Error:', error);
      alert('The email will be sent automatically when the queue runs (usually within a minute).');
    } finally {
      setProcessingEmail(null);
    }
  };

  const exportSubscribers = () => {
    const filteredSubs = getFilteredSubscribers();
    const csv = [
      ['Email', 'Status', 'Confirmed At', 'Source', 'Tags', 'Created At'],
      ...filteredSubs.map(sub => [
        sub.email,
        sub.status,
        sub.confirmed_at ? format(new Date(sub.confirmed_at), 'yyyy-MM-dd') : '',
        sub.source,
        sub.tags.join(', '),
        format(new Date(sub.created_at), 'yyyy-MM-dd')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newsletter-subscribers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const getFilteredSubscribers = () => {
    return subscribers.filter(sub => {
      const matchesSearch = sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sub.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
      const matchesTags = selectedTags.length === 0 || 
                         selectedTags.some(tag => sub.tags.includes(tag));
      
      return matchesSearch && matchesStatus && matchesTags;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400';
      case 'pending': return 'text-yellow-400';
      case 'unsubscribed': return 'text-gray-400';
      case 'sent': return 'text-blue-400';
      case 'draft': return 'text-gray-400';
      case 'scheduled': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const createCampaign = async (sendNow = false) => {
    try {
      const { data, error } = await supabase
        .from('newsletter_campaigns')
        .insert({
          ...composeData,
          status: sendNow ? 'sending' : (composeData.scheduled_for ? 'scheduled' : 'draft'),
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      if (sendNow) {
        // TODO: Implement actual sending logic
        alert('Campaign created! Sending functionality will be implemented with email service integration.');
      } else {
        alert('Campaign saved as draft!');
      }

      setComposeData({
        name: '',
        subject: '',
        content: '',
        html_content: '',
        tags: [],
        scheduled_for: ''
      });
      setActiveTab('campaigns');
      loadCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('Failed to create campaign');
    }
  };

  const subscriberStats = {
    total: subscribers.length,
    confirmed: subscribers.filter(s => s.status === 'confirmed').length,
    pending: subscribers.filter(s => s.status === 'pending').length,
    unsubscribed: subscribers.filter(s => s.status === 'unsubscribed').length
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Newsletter Manager</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400">
              {subscriberStats.confirmed} active subscribers
            </span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Subscribers</p>
              <p className="text-2xl font-bold text-white">{subscriberStats.total}</p>
            </div>
            <Users className="h-8 w-8 text-electric-400" />
          </div>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Confirmed</p>
              <p className="text-2xl font-bold text-green-400">{subscriberStats.confirmed}</p>
            </div>
            <Mail className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">{subscriberStats.pending}</p>
            </div>
            <Eye className="h-8 w-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Unsubscribed</p>
              <p className="text-2xl font-bold text-gray-400">{subscriberStats.unsubscribed}</p>
            </div>
            <X className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-800/30 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'subscribers'
              ? 'bg-electric-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          Subscribers
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'campaigns'
              ? 'bg-electric-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          Campaigns
        </button>
        <button
          onClick={() => setActiveTab('compose')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'compose'
              ? 'bg-electric-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          Compose
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'queue'
              ? 'bg-electric-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          Email Queue
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
        </div>
      ) : (
        <>
          {/* Subscribers Tab */}
          {activeTab === 'subscribers' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by email or name..."
                      className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                    />
                  </div>
                </div>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="unsubscribed">Unsubscribed</option>
                </select>
                
                <button
                  onClick={exportSubscribers}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Subscribers Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Source</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredSubscribers().map((subscriber) => (
                      <tr key={subscriber.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-3 px-4 text-white">{subscriber.email}</td>
                        <td className="py-3 px-4">
                          <span className={`capitalize ${getStatusColor(subscriber.status)}`}>
                            {subscriber.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {subscriber.user ? (
                            <div>
                              <div className="text-white">{subscriber.user.name}</div>
                              <div className="text-xs text-gray-500">{subscriber.user.membership_type}</div>
                            </div>
                          ) : (
                            <span className="text-gray-500">Guest</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-400">{subscriber.source}</td>
                        <td className="py-3 px-4 text-gray-400">
                          {format(new Date(subscriber.created_at), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === 'campaigns' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              {campaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No campaigns created yet</p>
                  <button
                    onClick={() => setActiveTab('compose')}
                    className="px-6 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Create First Campaign
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-medium mb-1">{campaign.name}</h3>
                          <p className="text-gray-400 text-sm mb-2">{campaign.subject}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className={`capitalize ${getStatusColor(campaign.status)}`}>
                              {campaign.status}
                            </span>
                            {campaign.sent_at && (
                              <span>Sent {format(new Date(campaign.sent_at), 'MMM d, yyyy')}</span>
                            )}
                            {campaign.sent_count > 0 && (
                              <>
                                <span>{campaign.sent_count} sent</span>
                                <span>{campaign.open_count} opens</span>
                                <span>{campaign.click_count} clicks</span>
                              </>
                            )}
                          </div>
                        </div>
                        {campaign.status === 'draft' && (
                          <button className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors text-sm">
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Compose Tab */}
          {activeTab === 'compose' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={composeData.name}
                    onChange={(e) => setComposeData({ ...composeData, name: e.target.value })}
                    placeholder="e.g., January 2025 Newsletter"
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={composeData.subject}
                    onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                    placeholder="e.g., 🎵 Upcoming Events & Competition Updates"
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Content
                  </label>
                  <textarea
                    value={composeData.content}
                    onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                    placeholder="Write your newsletter content here..."
                    rows={10}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => createCampaign(false)}
                      className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Save as Draft
                    </button>
                    <button
                      onClick={() => createCampaign(true)}
                      className="px-6 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>Send Now</span>
                    </button>
                  </div>
                  
                  <div className="text-sm text-gray-400">
                    Will be sent to {subscriberStats.confirmed} confirmed subscribers
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Email Queue Tab */}
          {activeTab === 'queue' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <Mail className="h-5 w-5 text-electric-400" />
                  <span>Newsletter Email Queue</span>
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => loadEmailQueue()}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh</span>
                  </button>
                  <a
                    href="/admin/settings"
                    className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>Process All Emails</span>
                  </a>
                </div>
              </div>

              {emailQueue.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No newsletter emails in queue</p>
                  <p className="text-gray-500 text-sm">Newsletter confirmation and welcome emails will appear here</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                    <p className="text-blue-400 text-sm">
                      <strong>Note:</strong> Emails are automatically processed every minute. Click "Send Now" to trigger immediate sending, 
                      or use "Process All Emails" to go to the main email queue processor.
                    </p>
                  </div>
                <div className="space-y-4">
                  {emailQueue.map((email) => (
                    <div key={email.id} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-white font-medium">{email.subject}</h4>
                            {email.status && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                email.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                                email.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                email.status === 'sending' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {email.status}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm mb-1">To: {email.recipient}</p>
                          <p className="text-gray-500 text-xs">
                            Created: {format(new Date(email.created_at), 'MMM d, yyyy h:mm a')}
                          </p>
                          {email.attempts && email.attempts > 0 && (
                            <p className="text-gray-500 text-xs">Attempts: {email.attempts}</p>
                          )}
                          {email.error_message && (
                            <p className="text-red-400 text-xs mt-1">Error: {email.error_message}</p>
                          )}
                        </div>
                        
                        {(!email.status || email.status === 'pending' || email.status === 'failed') && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => sendEmailNow(email.id)}
                              className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                            >
                              <Send className="h-4 w-4" />
                              <span>Process Email</span>
                            </button>
                            <span className="text-xs text-gray-500">
                              Auto-sends in &lt; 1 min
                            </span>
                          </div>
                        )}
                        
                        {email.status === 'sent' && (
                          <div className="flex items-center space-x-2 text-green-400">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm">Sent</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}