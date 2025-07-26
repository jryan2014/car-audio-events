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
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
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
  const [newsletters, setNewsletters] = useState<NewsletterCampaign[]>([]);
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
        await loadNewsletters();
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

  const loadNewsletters = async () => {
    // Try regular query first
    const { data, error } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading newsletters:', error);
      // If schema cache issue, just show empty for now
      if (error.code === 'PGRST204' || error.message?.includes('schema cache')) {
        console.log('Schema cache issue - newsletters exist but cannot be displayed yet');
        showInfo('Newsletters are being synced. Please refresh the page in a moment.');
        setNewsletters([]);
      }
      return;
    }

    setNewsletters(data || []);
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
      case 'sending': return 'text-blue-400';
      case 'cancelled': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const editNewsletter = (newsletter: NewsletterCampaign) => {
    setEditingCampaignId(newsletter.id);
    setComposeData({
      name: newsletter.name,
      subject: newsletter.subject,
      content: newsletter.content || '',
      html_content: newsletter.html_content || '',
      tags: newsletter.tags || [],
      scheduled_for: newsletter.scheduled_for || ''
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

  const deleteNewsletter = async (newsletterId: string) => {
    if (!window.confirm('Are you sure you want to delete this newsletter?')) {
      return;
    }

    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql_command: `DELETE FROM newsletter_campaigns WHERE id = '${newsletterId}'`
      });

      if (error) throw error;

      showSuccess('Newsletter deleted successfully');
      loadNewsletters();
    } catch (error) {
      console.error('Error deleting newsletter:', error);
      showError('Failed to delete newsletter');
    }
  };

  const createNewsletter = async (sendNow = false) => {
    try {
      // Validate required fields
      if (!composeData.name || !composeData.subject || !composeData.content) {
        showError('Please fill in all required fields (name, subject, and content)');
        return;
      }

      console.log('Creating newsletter with sendNow:', sendNow);
      console.log('Compose data:', composeData);
      console.log('Editing newsletter ID:', editingCampaignId);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        showError('You must be logged in to create newsletters');
        return;
      }

      const campaignData = {
        name: composeData.name,
        subject: composeData.subject,
        content: composeData.content,
        html_content: composeData.html_content,
        tags: composeData.tags,
        status: sendNow ? 'sending' : (composeData.scheduled_for ? 'scheduled' : 'draft'),
        created_by: userData.user.id
      };

      // Only add scheduled_for if it has a value
      if (composeData.scheduled_for) {
        (campaignData as any).scheduled_for = composeData.scheduled_for;
      }

      // Just try using the regular Supabase client since exec_sql doesn't return data
      let data;
      
      if (editingCampaignId) {
        // Update existing newsletter
        const { data: updateData, error: updateError } = await supabase
          .from('newsletter_campaigns')
          .update({
            name: composeData.name,
            subject: composeData.subject,
            content: composeData.content,
            html_content: composeData.html_content || composeData.content,
            tags: composeData.tags,
            status: sendNow ? 'sending' : (composeData.scheduled_for ? 'scheduled' : 'draft'),
            scheduled_for: composeData.scheduled_for || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingCampaignId)
          .select()
          .single();
          
        if (updateError) throw updateError;
        data = updateData;
      } else {
        // Create new newsletter
        const { data: insertData, error: insertError } = await supabase
          .from('newsletter_campaigns')
          .insert({
            name: composeData.name,
            subject: composeData.subject,
            content: composeData.content,
            html_content: composeData.html_content || composeData.content,
            tags: composeData.tags,
            status: sendNow ? 'sending' : (composeData.scheduled_for ? 'scheduled' : 'draft'),
            created_by: userData.user.id,
            scheduled_for: composeData.scheduled_for || null
          })
          .select()
          .single();
          
        if (insertError) {
          console.error('Insert error:', insertError);
          console.error('Error code:', insertError.code);
          console.error('Error message:', insertError.message);
          // If it's a schema cache issue, try exec_sql as fallback
          // PGRST204 = schema cache miss, 42P01 = table not found
          if (insertError.code === 'PGRST204' || insertError.message?.includes('schema cache')) {
            const { error: execError } = await supabase.rpc('exec_sql', {
              sql_command: `
                INSERT INTO newsletter_campaigns (
                  name, subject, content, html_content, tags, status, created_by, scheduled_for
                ) VALUES (
                  '${composeData.name.replace(/'/g, "''")}',
                  '${composeData.subject.replace(/'/g, "''")}',
                  '${composeData.content.replace(/'/g, "''")}',
                  '${(composeData.html_content || composeData.content).replace(/'/g, "''")}',
                  ${composeData.tags.length > 0 ? `ARRAY[${composeData.tags.map(t => `'${t.replace(/'/g, "''")}'`).join(',')}]` : 'NULL'},
                  '${sendNow ? 'sending' : (composeData.scheduled_for ? 'scheduled' : 'draft')}',
                  '${userData.user.id}',
                  ${composeData.scheduled_for ? `'${composeData.scheduled_for}'` : 'NULL'}
                )
              `
            });
            
            if (execError) throw execError;
            
            console.log('Newsletter created via exec_sql, attempting to get ID...');
            
            // Try to get the ID manually
            const { data: newsletters, error: selectError } = await supabase
              .from('newsletter_campaigns')
              .select('id, name')
              .eq('name', composeData.name)
              .eq('created_by', userData.user.id)
              .order('created_at', { ascending: false })
              .limit(1);
              
            if (selectError) {
              console.error('Failed to query newsletter after creation:', selectError);
              // If we can't query it but exec_sql succeeded, create a fake data object
              // The newsletter was created, we just can't get its ID due to schema cache
              data = { 
                id: 'temp-' + Date.now(), 
                name: composeData.name,
                status: sendNow ? 'sending' : 'draft'
              };
              // Don't try to send emails if we don't have a real ID
              if (sendNow) {
                showWarning('Newsletter saved but cannot queue emails due to database sync issues. Please try again in a moment.');
                sendNow = false;
              }
            } else if (!newsletters || newsletters.length === 0) {
              throw new Error('Failed to create newsletter');
            } else {
              data = newsletters[0];
            }
          } else {
            throw insertError;
          }
        } else {
          data = insertData;
        }
      }

      if (!data) {
        throw new Error('Failed to create or update newsletter');
      }

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
          
          // Create full HTML email with header, logo, and responsive design
          const fullHtmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${composeData.subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: #1a1a2e;
      padding: 20px;
      text-align: center;
    }
    .logo {
      max-width: 200px;
      height: auto;
    }
    .content {
      padding: 30px;
      font-size: 16px;
      line-height: 1.6;
      color: #333333;
    }
    .footer {
      background-color: #f8f8f8;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #666666;
    }
    .footer a {
      color: #00D4FF;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      .content {
        padding: 20px !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <img src="https://caraudioevents.com/assets/logos/CAE_Logo_V2-email-logo.png" alt="Car Audio Events" class="logo">
    </div>
    <div class="content">
      ${composeData.html_content || composeData.content.replace(/\n/g, '<br>')}
    </div>
    <div class="footer">
      <p>Car Audio Events - Your Premier Competition Platform</p>
      <p>
        <a href="${unsubscribeUrl}">Unsubscribe</a> | 
        <a href="https://caraudioevents.com/profile">Update Preferences</a> | 
        <a href="https://caraudioevents.com/privacy">Privacy Policy</a>
      </p>
      <p>1600 South Jefferson, Perry, FL 32348 #31</p>
      <p>&copy; 2025 Car Audio Events. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
          
          return {
            to_email: subscriber.email,  // Changed from 'recipient'
            subject: composeData.subject,
            body: composeData.content,  // Plain text version
            html_content: fullHtmlContent,  // HTML version (column is html_content, not html_body)
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
          
          // Update newsletter status back to draft
          await supabase
            .from('newsletter_campaigns')
            .update({ status: 'draft' })
            .eq('id', data.id);
          return;
        }

        // Update newsletter status to sending
        await supabase
          .from('newsletter_campaigns')
          .update({ 
            status: 'sending',
            metadata: { queued_count: targetSubscribers.length }
          })
          .eq('id', data.id);

        showSuccess(`Newsletter ${editingCampaignId ? 'updated' : 'created'} and ${targetSubscribers.length} emails queued! Go to Email Settings to process the queue.`);
      } else {
        showSuccess(`Newsletter ${editingCampaignId ? 'updated' : 'saved'} as draft!`);
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
      loadNewsletters();
    } catch (error) {
      console.error('Error creating newsletter:', error);
      showError('Failed to create newsletter');
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
          Newsletters
        </button>
        <button
          onClick={() => setActiveTab('compose')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'compose'
              ? 'bg-electric-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          Create Newsletter
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

          {/* Newsletters Tab (was Campaigns) */}
          {activeTab === 'campaigns' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">All Newsletters</h2>
                <button
                  onClick={() => setActiveTab('compose')}
                  className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Create Newsletter</span>
                </button>
              </div>
              {newsletters.length === 0 ? (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-4">No newsletters created yet</p>
                  <button
                    onClick={() => setActiveTab('compose')}
                    className="px-6 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Create Your First Newsletter
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {newsletters.map((newsletter) => (
                    <div key={newsletter.id} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-medium mb-1">{newsletter.name}</h3>
                          <p className="text-gray-400 text-sm mb-2">{newsletter.subject}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className={`capitalize ${getStatusColor(newsletter.status)}`}>
                              {newsletter.status}
                            </span>
                            {newsletter.sent_at && (
                              <span>Sent {format(new Date(newsletter.sent_at), 'MMM d, yyyy')}</span>
                            )}
                            {newsletter.status === 'sent' && newsletter.sent_count > 0 && (
                              <>
                                <span>{newsletter.sent_count} sent</span>
                                <span>{newsletter.open_count} opens</span>
                                <span>{newsletter.click_count} clicks</span>
                              </>
                            )}
                            {newsletter.status === 'sending' && newsletter.metadata?.queued_count && (
                              <span className="text-blue-400">{newsletter.metadata.queued_count} emails queued</span>
                            )}
                          </div>
                        </div>
                        {newsletter.status === 'draft' && (
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => editNewsletter(newsletter)}
                              className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors text-sm flex items-center space-x-1"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Edit</span>
                            </button>
                            <button 
                              onClick={() => deleteNewsletter(newsletter.id)}
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

          {/* Create Newsletter Tab (was Compose) */}
          {activeTab === 'compose' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <Send className="h-5 w-5 text-electric-400" />
                  <span>{editingCampaignId ? 'Edit Newsletter' : 'Create New Newsletter'}</span>
                </h2>
                {editingCampaignId && (
                  <p className="text-gray-400 text-sm mt-1">Updating existing newsletter draft</p>
                )}
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Newsletter Name
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
                      onClick={() => createNewsletter(false)}
                      className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      {editingCampaignId ? 'Update Draft' : 'Save as Draft'}
                    </button>
                    <button
                      onClick={() => createNewsletter(true)}
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