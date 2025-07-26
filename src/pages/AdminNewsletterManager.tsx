import React, { useState, useEffect } from 'react';
import { Mail, Send, Users, Eye, MousePointer, X, Search, Download, Filter, Calendar, Tag, Clock, CheckCircle, AlertCircle, RefreshCw, Trash2, Edit, RotateCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { useNotifications } from '../components/NotificationSystem';

interface NewsletterSubscriber {
  id: string;
  email: string;
  status: 'pending' | 'confirmed' | 'unsubscribed';
  confirmed_at?: string;
  unsubscribed_at?: string;
  source: string;
  tags: string[];
  created_at: string;
  unsubscribe_token?: string;
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
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled' | 'queued';
  scheduled_for?: string;
  sent_at?: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  unsubscribe_count: number;
  tags: string[];
  created_at: string;
  metadata?: {
    queued_count?: number;
  };
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
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
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
  const [selectedSubscribers, setSelectedSubscribers] = useState<Set<string>>(new Set());
  const [editingSubscriber, setEditingSubscriber] = useState<string | null>(null);
  const [resendingConfirmation, setResendingConfirmation] = useState<string | null>(null);
  const [showAddSubscriber, setShowAddSubscriber] = useState(false);
  const [newSubscriberEmail, setNewSubscriberEmail] = useState('');
  
  // Compose state
  const [composeData, setComposeData] = useState({
    name: '',
    subject: '',
    content: '',
    html_content: '',
    tags: [] as string[],
    scheduled_for: ''
  });
  
  // Track which campaign is being edited
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

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
    // Use exec_sql to bypass schema cache
    const { data: result, error } = await supabase.rpc('exec_sql', {
      sql_command: `
        SELECT * FROM newsletter_campaigns 
        ORDER BY created_at DESC
      `
    });

    if (error) {
      console.error('Error loading campaigns:', error);
      return;
    }

    const data = result?.result || [];

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
        showInfo('Your email will be sent automatically within the next minute.');
      }

      // Reload the queue after a short delay
      setTimeout(() => {
        loadEmailQueue();
      }, 2000);
      
    } catch (error) {
      console.error('Error:', error);
      showInfo('The email will be sent automatically when the queue runs (usually within a minute).');
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

  const deleteSubscribers = async (subscriberIds: string[]) => {
    if (!window.confirm(`Are you sure you want to delete ${subscriberIds.length} subscriber(s)?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .delete()
        .in('id', subscriberIds);

      if (error) throw error;

      showSuccess(`Successfully deleted ${subscriberIds.length} subscriber(s)`);
      setSelectedSubscribers(new Set());
      loadSubscribers();
    } catch (error) {
      console.error('Error deleting subscribers:', error);
      showError('Failed to delete subscribers');
    }
  };

  const resendConfirmation = async (subscriberId: string) => {
    setResendingConfirmation(subscriberId);
    try {
      // Get subscriber details
      const subscriber = subscribers.find(s => s.id === subscriberId);
      if (!subscriber) {
        showError('Subscriber not found');
        return;
      }

      // Generate new confirmation token
      const confirmationToken = crypto.randomUUID();
      
      // Update subscriber with new token
      const { error: updateError } = await supabase
        .from('newsletter_subscribers')
        .update({ 
          confirmation_token: confirmationToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriberId);

      if (updateError) throw updateError;

      // Get newsletter confirmation template
      const { data: template } = await supabase
        .from('email_templates')
        .select('id')
        .eq('template_name', 'newsletter_confirmation')
        .single();

      if (!template) {
        throw new Error('Newsletter confirmation template not found');
      }

      // Queue confirmation email using the correct column names
      const { error: emailError } = await supabase
        .from('email_queue')
        .insert({
          to_email: subscriber.email,  // Changed from 'recipient'
          subject: 'Confirm Your Newsletter Subscription',
          template_id: template.id,
          template_variables: {
            confirmationUrl: `https://caraudioevents.com/newsletter/confirm/${confirmationToken}`,
            unsubscribeUrl: `https://caraudioevents.com/newsletter/unsubscribe/${subscriber.unsubscribe_token || confirmationToken}`
          },
          status: 'pending'
        });

      if (emailError) throw emailError;

      showSuccess('Confirmation email has been resent! It will be delivered within a minute.');
      
    } catch (error) {
      console.error('Error resending confirmation:', error);
      showError('Failed to resend confirmation email');
    } finally {
      setResendingConfirmation(null);
    }
  };

  const updateSubscriberStatus = async (subscriberId: string, newStatus: 'confirmed' | 'pending' | 'unsubscribed') => {
    try {
      const updates: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'confirmed' && !subscribers.find(s => s.id === subscriberId)?.confirmed_at) {
        updates.confirmed_at = new Date().toISOString();
      } else if (newStatus === 'unsubscribed') {
        updates.unsubscribed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('newsletter_subscribers')
        .update(updates)
        .eq('id', subscriberId);

      if (error) throw error;

      showSuccess(`Subscriber status updated to ${newStatus}`);
      loadSubscribers();
    } catch (error) {
      console.error('Error updating subscriber:', error);
      showError('Failed to update subscriber status');
    }
  };

  const addSubscriber = async () => {
    if (!newSubscriberEmail || !newSubscriberEmail.includes('@')) {
      showError('Please enter a valid email address');
      return;
    }

    try {
      // Call the subscribe function
      const { data, error } = await supabase.rpc('subscribe_to_newsletter', {
        p_email: newSubscriberEmail,
        p_source: 'admin_manual'
      });

      if (error) throw error;

      if (data?.success) {
        showSuccess(`Subscriber added! ${data.message}`);
        setNewSubscriberEmail('');
        setShowAddSubscriber(false);
        loadSubscribers();
      } else {
        showError(data?.message || 'Failed to add subscriber');
      }
    } catch (error) {
      console.error('Error adding subscriber:', error);
      showError('Failed to add subscriber');
    }
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
      case 'sent': return 'text-green-400';
      case 'draft': return 'text-gray-400';
      case 'scheduled': return 'text-purple-400';
      case 'queued': return 'text-yellow-400';
      case 'sending': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const editCampaign = (campaign: NewsletterCampaign) => {
    setEditingCampaignId(campaign.id);
    setComposeData({
      name: campaign.name,
      subject: campaign.subject,
      content: campaign.content || '',
      html_content: campaign.html_content || '',
      tags: campaign.tags || [],
      scheduled_for: campaign.scheduled_for || ''
    });
    setActiveTab('compose');
  };

  const cancelEdit = () => {
    setEditingCampaignId(null);
    setComposeData({
      name: '',
      subject: '',
      content: '',
      html_content: '',
      tags: [],
      scheduled_for: ''
    });
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql_command: `DELETE FROM newsletter_campaigns WHERE id = '${campaignId}'`
      });

      if (error) throw error;

      showSuccess('Campaign deleted successfully');
      loadCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      showError('Failed to delete campaign');
    }
  };

  const createCampaign = async (sendNow = false) => {
    try {
      // Validate required fields
      if (!composeData.name || !composeData.subject || !composeData.content) {
        showError('Please fill in all required fields (name, subject, and content)');
        return;
      }

      console.log('Creating campaign with sendNow:', sendNow);
      console.log('Compose data:', composeData);
      console.log('Editing campaign ID:', editingCampaignId);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        showError('You must be logged in to create campaigns');
        return;
      }

      const campaignData = {
        name: composeData.name,
        subject: composeData.subject,
        content: composeData.content,
        html_content: composeData.html_content,
        tags: composeData.tags,
        status: sendNow ? 'queued' : (composeData.scheduled_for ? 'scheduled' : 'draft'),
        created_by: userData.user.id
      };

      // Only add scheduled_for if it has a value
      if (composeData.scheduled_for) {
        (campaignData as any).scheduled_for = composeData.scheduled_for;
      }

      // Use exec_sql to bypass schema cache issues
      const escapedName = composeData.name.replace(/'/g, "''");
      const escapedSubject = composeData.subject.replace(/'/g, "''");
      const escapedContent = composeData.content.replace(/'/g, "''");
      const escapedHtmlContent = (composeData.html_content || composeData.content).replace(/'/g, "''");
      const tagsArray = composeData.tags.length > 0 ? `ARRAY[${composeData.tags.map(t => `'${t.replace(/'/g, "''")}'`).join(',')}]` : 'NULL';
      
      const scheduledForValue = composeData.scheduled_for ? `'${composeData.scheduled_for}'` : 'NULL';
      
      let sqlCommand;
      if (editingCampaignId) {
        // Update existing campaign
        sqlCommand = `
          UPDATE newsletter_campaigns 
          SET name = '${escapedName}',
              subject = '${escapedSubject}',
              content = '${escapedContent}',
              html_content = '${escapedHtmlContent}',
              tags = ${tagsArray},
              status = '${sendNow ? 'queued' : (composeData.scheduled_for ? 'scheduled' : 'draft')}',
              scheduled_for = ${scheduledForValue},
              updated_at = NOW()
          WHERE id = '${editingCampaignId}'
          RETURNING id, name, subject, status
        `;
      } else {
        // Create new campaign
        sqlCommand = `
          INSERT INTO newsletter_campaigns (
            name, subject, content, html_content, tags, status, created_by, scheduled_for
          ) VALUES (
            '${escapedName}',
            '${escapedSubject}',
            '${escapedContent}',
            '${escapedHtmlContent}',
            ${tagsArray},
            '${sendNow ? 'queued' : (composeData.scheduled_for ? 'scheduled' : 'draft')}',
            '${userData.user.id}',
            ${scheduledForValue}
          ) RETURNING id, name, subject, status
        `;
      }
      
      const { data: insertResult, error: insertError } = await supabase.rpc('exec_sql', {
        sql_command: sqlCommand
      });

      console.log('Insert result:', insertResult);
      console.log('Insert error:', insertError);

      if (insertError) throw insertError;

      // Get the campaign ID (use existing ID for updates, or get from result for new campaigns)
      const campaignId = editingCampaignId || insertResult?.result?.[0]?.id || insertResult?.id;
      if (!campaignId) {
        console.error('No campaign ID returned:', insertResult);
        throw new Error('Failed to get campaign ID after creation');
      }

      const data = { id: campaignId, name: composeData.name };

      if (sendNow && data) {
        // Create emails in the queue for all confirmed subscribers
        const confirmedSubscribers = subscribers.filter(s => s.status === 'confirmed');
        
        if (confirmedSubscribers.length === 0) {
          showWarning('No confirmed subscribers to send to!');
          return;
        }

        // Apply tag filtering if tags are specified
        const targetSubscribers = composeData.tags.length > 0
          ? confirmedSubscribers.filter(sub => 
              composeData.tags.some(tag => sub.tags?.includes(tag))
            )
          : confirmedSubscribers;

        if (targetSubscribers.length === 0) {
          showWarning('No subscribers match the selected tags!');
          return;
        }

        // Create email queue entries for each subscriber
        const emailQueueEntries = targetSubscribers.map(subscriber => {
          // Add unsubscribe footer to the email content
          const unsubscribeUrl = `https://caraudioevents.com/newsletter/unsubscribe/${subscriber.unsubscribe_token || subscriber.id}`;
          const footerHtml = `
            <hr style="margin-top: 40px; border: 1px solid #e5e5e5;">
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
              You're receiving this email because you subscribed to Car Audio Events newsletter.<br>
              <a href="${unsubscribeUrl}" style="color: #0080ff;">Unsubscribe</a> | 
              <a href="https://caraudioevents.com/profile" style="color: #0080ff;">Update Preferences</a>
            </p>
          `;
          
          const fullHtmlContent = (composeData.html_content || composeData.content) + footerHtml;
          
          return {
            to_email: subscriber.email,  // Changed from 'recipient'
            subject: composeData.subject,
            body: composeData.content,  // Plain text version
            html_body: fullHtmlContent,  // HTML version
            template_id: null,
            template_variables: {
              unsubscribe_url: unsubscribeUrl,
              campaign_id: data.id,
              campaign_name: data.name,
              subscriber_id: subscriber.id
            },
            status: 'pending'
          };
        });

        const { error: queueError } = await supabase
          .from('email_queue')
          .insert(emailQueueEntries);

        if (queueError) {
          console.error('Error creating email queue entries:', queueError);
          showError('Failed to queue emails for sending');
          
          // Update campaign status back to draft using exec_sql
          await supabase.rpc('exec_sql', {
            sql_command: `UPDATE newsletter_campaigns SET status = 'draft' WHERE id = '${data.id}'`
          });
          return;
        }

        // Update campaign status to queued (not sent yet!) using exec_sql
        await supabase.rpc('exec_sql', {
          sql_command: `
            UPDATE newsletter_campaigns 
            SET status = 'queued', 
                metadata = jsonb_build_object('queued_count', ${targetSubscribers.length})
            WHERE id = '${data.id}'
          `
        });

        showSuccess(`Campaign ${editingCampaignId ? 'updated' : 'created'} and ${targetSubscribers.length} emails queued! Go to Email Settings to process the queue.`);
      } else {
        showSuccess(`Campaign ${editingCampaignId ? 'updated' : 'saved'} as draft!`);
      }

      // Reset form and editing state
      setComposeData({
        name: '',
        subject: '',
        content: '',
        html_content: '',
        tags: [],
        scheduled_for: ''
      });
      setEditingCampaignId(null);
      setActiveTab('campaigns');
      loadCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      showError('Failed to create campaign');
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
          Newsletter Emails
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
                
                {selectedSubscribers.size > 0 && (
                  <button
                    onClick={() => deleteSubscribers(Array.from(selectedSubscribers))}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete ({selectedSubscribers.size})</span>
                  </button>
                )}
                
                <button
                  onClick={exportSubscribers}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </button>
                
                <button
                  onClick={() => setShowAddSubscriber(true)}
                  className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                >
                  <Mail className="h-4 w-4" />
                  <span>Add Subscriber</span>
                </button>
              </div>

              {/* Add Subscriber Form */}
              {showAddSubscriber && (
                <div className="mb-6 p-4 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <input
                      type="email"
                      value={newSubscriberEmail}
                      onChange={(e) => setNewSubscriberEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                      onKeyPress={(e) => e.key === 'Enter' && addSubscriber()}
                    />
                    <button
                      onClick={addSubscriber}
                      className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddSubscriber(false);
                        setNewSubscriberEmail('');
                      }}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    This will send a confirmation email to the subscriber.
                  </p>
                </div>
              )}

              {/* Subscribers Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium w-10">
                        <input
                          type="checkbox"
                          checked={getFilteredSubscribers().length > 0 && getFilteredSubscribers().every(s => selectedSubscribers.has(s.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubscribers(new Set(getFilteredSubscribers().map(s => s.id)));
                            } else {
                              setSelectedSubscribers(new Set());
                            }
                          }}
                          className="rounded bg-gray-700 border-gray-600 text-electric-500 focus:ring-electric-500"
                        />
                      </th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">User</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Source</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredSubscribers().map((subscriber) => (
                      <tr key={subscriber.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedSubscribers.has(subscriber.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedSubscribers);
                              if (e.target.checked) {
                                newSelected.add(subscriber.id);
                              } else {
                                newSelected.delete(subscriber.id);
                              }
                              setSelectedSubscribers(newSelected);
                            }}
                            className="rounded bg-gray-700 border-gray-600 text-electric-500 focus:ring-electric-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-white">{subscriber.email}</td>
                        <td className="py-3 px-4">
                          <select
                            value={subscriber.status}
                            onChange={(e) => updateSubscriberStatus(subscriber.id, e.target.value as any)}
                            className={`bg-transparent border-none text-sm capitalize ${getStatusColor(subscriber.status)} cursor-pointer hover:opacity-80`}
                          >
                            <option value="pending" className="bg-gray-800 text-yellow-400">Pending</option>
                            <option value="confirmed" className="bg-gray-800 text-green-400">Confirmed</option>
                            <option value="unsubscribed" className="bg-gray-800 text-gray-400">Unsubscribed</option>
                          </select>
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
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            {subscriber.status === 'pending' && (
                              <button
                                onClick={() => resendConfirmation(subscriber.id)}
                                disabled={resendingConfirmation === subscriber.id}
                                className="p-1 text-blue-400 hover:text-blue-300 disabled:opacity-50"
                                title="Resend confirmation email"
                              >
                                {resendingConfirmation === subscriber.id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCw className="h-4 w-4" />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => deleteSubscribers([subscriber.id])}
                              className="p-1 text-red-400 hover:text-red-300"
                              title="Delete subscriber"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
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
                            {campaign.status === 'sent' && campaign.sent_count > 0 && (
                              <>
                                <span>{campaign.sent_count} sent</span>
                                <span>{campaign.open_count} opens</span>
                                <span>{campaign.click_count} clicks</span>
                              </>
                            )}
                            {campaign.status === 'queued' && campaign.metadata?.queued_count && (
                              <span className="text-yellow-400">{campaign.metadata.queued_count} emails queued</span>
                            )}
                          </div>
                        </div>
                        {campaign.status === 'draft' && (
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => editCampaign(campaign)}
                              className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors text-sm flex items-center space-x-1"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Edit</span>
                            </button>
                            <button 
                              onClick={() => deleteCampaign(campaign.id)}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center space-x-1"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete</span>
                            </button>
                          </div>
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
              {editingCampaignId && (
                <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-400 font-medium">Editing campaign</p>
                </div>
              )}
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
                      {editingCampaignId ? 'Update Draft' : 'Save as Draft'}
                    </button>
                    <button
                      onClick={() => createCampaign(true)}
                      className="px-6 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>Send Now</span>
                    </button>
                    {editingCampaignId && (
                      <button
                        onClick={cancelEdit}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
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
                  <span>Newsletter-Related Emails</span>
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
                  <p className="text-gray-400 mb-4">No newsletter-related emails found</p>
                  <p className="text-gray-500 text-sm">This shows emails with 'newsletter' in the subject from the main email queue</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                    <p className="text-blue-400 text-sm">
                      <strong>Note:</strong> This shows newsletter-related emails from the main email queue. 
                      To process all emails, use "Process All Emails" to go to the main email processor.
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