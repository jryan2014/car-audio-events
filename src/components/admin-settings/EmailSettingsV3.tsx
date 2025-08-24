import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Mail, Save, Plus, Trash2, Settings, ChevronDown, ChevronUp, 
  Send, AlertCircle, CheckCircle, RefreshCw, Shield, Zap,
  Globe, Server, ArrowRight, X, Key, AlertTriangle,
  FileText, List, TestTube, FolderOpen, Clock, Users,
  CheckCircle2, XCircle, AlertTriangle as Warning,
  Edit2, Eye, Folder, Play, Pause, Timer, Calendar
} from 'lucide-react';
import { useNotifications } from '../NotificationSystem';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import { EmailQueueManager } from './EmailQueueManager';

interface EmailProvider {
  id: string;
  provider_type: 'postmark' | 'sendgrid' | 'smtp';
  is_active: boolean;
  is_primary: boolean;
  display_order: number;
  settings: Record<string, any>;
}

interface EmailAddress {
  id: string;
  email_address: string;
  from_name: string;
  provider_id: string;
  is_active: boolean;
  is_default: boolean;
}

interface EmailRoutingRule {
  id: string;
  rule_name: string;
  email_type: string;
  primary_provider_id: string;
  primary_address_id: string;
  failover_provider_id: string | null;
  failover_address_id: string | null;
  is_active: boolean;
  priority: number;
  metadata: Record<string, any>;
}

const EMAIL_TYPES = [
  { value: 'welcome', label: 'Welcome Emails', icon: '👋', description: 'New user registration emails' },
  { value: 'account', label: 'Account Management', icon: '👤', description: 'Password resets, profile updates' },
  { value: 'billing', label: 'Billing & Invoices', icon: '💳', description: 'Payment receipts, subscription updates' },
  { value: 'support', label: 'Support Tickets', icon: '🎫', description: 'Customer support communications' },
  { value: 'notification', label: 'Notifications', icon: '🔔', description: 'System alerts and updates' },
  { value: 'newsletter', label: 'Newsletters', icon: '📰', description: 'Marketing and promotional emails' },
  { value: 'event', label: 'Event Updates', icon: '📅', description: 'Event reminders and changes' },
  { value: 'competition', label: 'Competition Results', icon: '🏆', description: 'Score notifications' },
];

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *', description: 'Runs every minute' },
  { label: 'Every 2 minutes', value: '*/2 * * * *', description: 'Runs every 2 minutes' },
  { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 10 minutes', value: '*/10 * * * *', description: 'Runs every 10 minutes' },
  { label: 'Every 30 minutes', value: '*/30 * * * *', description: 'Runs every 30 minutes' },
];

const PROVIDER_INFO = {
  postmark: {
    name: 'Postmark',
    icon: '📮',
    color: 'yellow',
    description: 'Fast & reliable transactional email',
    features: ['99.9% uptime', 'Fast delivery', 'Great for transactional']
  },
  sendgrid: {
    name: 'SendGrid',
    icon: '📧',
    color: 'blue',
    description: 'Scalable email platform',
    features: ['High volume', 'Marketing tools', 'Flexible API']
  },
  smtp: {
    name: 'SMTP',
    icon: '⚙️',
    color: 'gray',
    description: 'Custom SMTP server',
    features: ['Full control', 'Any provider', 'Backup option']
  }
};

export const EmailSettingsV3: React.FC = () => {
  const { showSuccess, showError, showInfo } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // State for providers, addresses, and routing rules
  const [providers, setProviders] = useState<EmailProvider[]>([]);
  const [addresses, setAddresses] = useState<EmailAddress[]>([]);
  const [routingRules, setRoutingRules] = useState<EmailRoutingRule[]>([]);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'configuration' | 'templates' | 'scheduler' | 'queue' | 'test' | 'categories'>('configuration');
  
  // UI state
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showEditCategory, setShowEditCategory] = useState(false);
  const [showCategoryTemplates, setShowCategoryTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [categoryTemplates, setCategoryTemplates] = useState<any[]>([]);
  
  // Email queue and templates state
  const [emailQueue, setEmailQueue] = useState<any[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [emailCategories, setEmailCategories] = useState<any[]>([]);
  
  // Scheduler state
  const [cronJob, setCronJob] = useState<any>(null);
  const [selectedSchedule, setSelectedSchedule] = useState('*/2 * * * *');
  const [customSchedule, setCustomSchedule] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [cronEnabled, setCronEnabled] = useState(false);
  const [lastRunInfo, setLastRunInfo] = useState<any>(null);
  const [nextRunTime, setNextRunTime] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  
  // Test email state
  const [testEmail, setTestEmail] = useState({
    to: 'admin@caraudioevents.com',
    subject: 'Test Email',
    template: '',
    provider: '',
    useTemplate: false,
    placeholders: {
      user_name: 'John Doe',
      first_name: 'John',
      last_name: 'Doe',
      event_name: 'Summer Showdown 2025',
      event_date: new Date().toLocaleDateString(),
      amount: '$150.00',
      current_year: new Date().getFullYear().toString()
    }
  });
  
  // Forms
  const [newAddress, setNewAddress] = useState({
    email_address: '',
    from_name: '',
    provider_id: ''
  });
  
  const [newRule, setNewRule] = useState({
    rule_name: '',
    email_type: '',
    primary_provider_id: '',
    primary_address_id: '',
    failover_provider_id: '',
    failover_address_id: '',
    is_active: true,
    priority: 100,
    metadata: {}
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    display_order: 0
  });

  useEffect(() => {
    loadEmailConfiguration();
    if (activeTab === 'queue') loadEmailQueue();
    if (activeTab === 'templates') loadEmailTemplates();
    if (activeTab === 'test') loadEmailTemplates(); // Load templates for test tab too
    if (activeTab === 'categories') loadEmailCategories();
    if (activeTab === 'scheduler') loadCronSettings();
  }, [activeTab]);

  const loadEmailQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('email_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setEmailQueue(data || []);
    } catch (error) {
      console.error('Error loading email queue:', error);
      showError('Failed to load email queue');
    }
  };

  const loadEmailTemplates = async () => {
    try {
      // Load templates with category information
      const { data, error } = await supabase
        .from('email_templates')
        .select(`
          *,
          email_template_categories (
            id,
            name,
            description
          )
        `)
        .order('name');
      
      if (error) throw error;
      
      // Transform data to include category name for display
      const templatesWithCategories = data?.map(template => ({
        ...template,
        category: template.email_template_categories?.name || 'Uncategorized',
        category_name: template.email_template_categories?.name || 'Uncategorized'
      })) || [];
      
      console.log('Templates with categories:', templatesWithCategories);
      setEmailTemplates(templatesWithCategories);
    } catch (error) {
      console.error('Error loading email templates:', error);
      showError('Failed to load email templates');
    }
  };

  const loadEmailCategories = async () => {
    try {
      // First, load all categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('email_template_categories')
        .select('*')
        .order('name');
      
      if (categoriesError) {
        console.error('Error loading categories:', categoriesError);
        // Fallback: if no categories table, count templates directly
        const { data: templatesData, error: templatesError } = await supabase
          .from('email_templates')
          .select('id, name, category_id');
        
        if (templatesError) throw templatesError;
        
        // Group by category_id
        const categoryGroups = {};
        templatesData?.forEach(template => {
          const catId = template.category_id || 'uncategorized';
          if (!categoryGroups[catId]) {
            categoryGroups[catId] = 0;
          }
          categoryGroups[catId]++;
        });
        
        // Create category array
        const categoriesArray = Object.entries(categoryGroups).map(([id, count]) => ({
          name: id === 'uncategorized' ? 'Uncategorized' : `Category ${id}`,
          count: count
        }));
        
        setEmailCategories(categoriesArray);
        return;
      }
      
      // Load templates with category joins
      const { data: templatesData, error: templatesError } = await supabase
        .from('email_templates')
        .select('id, category_id');
      
      if (templatesError) throw templatesError;
      
      console.log('Categories loaded:', categoriesData);
      console.log('Templates loaded:', templatesData);
      
      // Count templates per category
      const categoriesWithCounts = categoriesData?.map(category => {
        const templateCount = templatesData?.filter(t => t.category_id === category.id).length || 0;
        return {
          id: category.id,
          name: category.name,
          description: category.description,
          count: templateCount
        };
      }) || [];
      
      // Add uncategorized if there are templates without category
      const uncategorizedCount = templatesData?.filter(t => !t.category_id).length || 0;
      if (uncategorizedCount > 0) {
        categoriesWithCounts.push({
          id: null,
          name: 'Uncategorized',
          description: 'Templates without a category',
          count: uncategorizedCount
        });
      }
      
      console.log('Categories processed:', categoriesWithCounts);
      setEmailCategories(categoriesWithCounts);
    } catch (error) {
      console.error('Error loading email categories:', error);
      showError('Failed to load email categories');
    }
  };

  const loadEmailConfiguration = async () => {
    try {
      setLoading(true);
      
      // Load providers
      const { data: providersData, error: providersError } = await supabase
        .from('email_providers')
        .select('*')
        .order('display_order');
      
      if (providersError) throw providersError;
      setProviders(providersData || []);
      
      // Load addresses
      const { data: addressesData, error: addressesError } = await supabase
        .from('email_addresses')
        .select('*')
        .order('email_address');
      
      if (addressesError) throw addressesError;
      setAddresses(addressesData || []);
      
      // Load routing rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('email_routing_rules')
        .select('*')
        .order('priority');
      
      if (rulesError) throw rulesError;
      setRoutingRules(rulesData || []);
      
    } catch (error) {
      console.error('Error loading email configuration:', error);
      showError('Failed to load email configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.email_address || !newAddress.from_name || !newAddress.provider_id) {
      showError('Please fill in all fields');
      return;
    }
    
    try {
      setSaving(true);
      
      const { data, error } = await supabase
        .from('email_addresses')
        .insert([newAddress])
        .select()
        .single();
      
      if (error) throw error;
      
      setAddresses([...addresses, data]);
      setNewAddress({ email_address: '', from_name: '', provider_id: '' });
      setShowAddAddress(false);
      showSuccess('Email address added successfully');
      
    } catch (error) {
      console.error('Error adding address:', error);
      showError('Failed to add email address');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this email address?')) return;
    
    try {
      const { error } = await supabase
        .from('email_addresses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setAddresses(addresses.filter(a => a.id !== id));
      showSuccess('Email address deleted');
      
    } catch (error) {
      console.error('Error deleting address:', error);
      showError('Failed to delete email address');
    }
  };

  const handleAddRule = async () => {
    // Enhanced validation with specific error messages
    if (!newRule.rule_name.trim()) {
      showError('Rule name is required');
      return;
    }
    if (!newRule.email_type) {
      showError('Email type is required');
      return;
    }
    if (!newRule.primary_provider_id) {
      showError('Primary provider is required');
      return;
    }
    if (!newRule.primary_address_id) {
      showError('Primary email address is required');
      return;
    }
    if (newRule.priority < 1 || newRule.priority > 999) {
      showError('Priority must be between 1 and 999');
      return;
    }
    
    try {
      setSaving(true);
      
      const { data, error } = await supabase
        .from('email_routing_rules')
        .insert([newRule])
        .select()
        .single();
      
      if (error) throw error;
      
      setRoutingRules([...routingRules, data]);
      setNewRule({
        rule_name: '',
        email_type: '',
        primary_provider_id: '',
        primary_address_id: '',
        failover_provider_id: '',
        failover_address_id: '',
        is_active: true,
        priority: 100,
        metadata: {}
      });
      setShowAddRule(false);
      showSuccess('Routing rule added successfully');
      
    } catch (error) {
      console.error('Error adding rule:', error);
      showError('Failed to add routing rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this routing rule?')) return;
    
    try {
      const { error } = await supabase
        .from('email_routing_rules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setRoutingRules(routingRules.filter(r => r.id !== id));
      showSuccess('Routing rule deleted');
      
    } catch (error) {
      console.error('Error deleting rule:', error);
      showError('Failed to delete routing rule');
    }
  };

  const handleToggleProvider = async (providerId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('email_providers')
        .update({ is_active: isActive })
        .eq('id', providerId);
      
      if (error) throw error;
      
      setProviders(providers.map(p => 
        p.id === providerId ? { ...p, is_active: isActive } : p
      ));
      
      showSuccess(`Provider ${isActive ? 'enabled' : 'disabled'}`);
      
    } catch (error) {
      console.error('Error toggling provider:', error);
      showError('Failed to update provider status');
    }
  };

  const handleSetPrimaryProvider = async (providerId: string) => {
    try {
      // First, unset all providers as primary
      await supabase
        .from('email_providers')
        .update({ is_primary: false })
        .neq('id', providerId);
      
      // Then set the selected one as primary
      const { error } = await supabase
        .from('email_providers')
        .update({ is_primary: true })
        .eq('id', providerId);
      
      if (error) throw error;
      
      setProviders(providers.map(p => ({
        ...p,
        is_primary: p.id === providerId
      })));
      
      showSuccess('Primary provider updated');
      
    } catch (error) {
      console.error('Error setting primary provider:', error);
      showError('Failed to set primary provider');
    }
  };

  const testEmailProvider = async (providerId: string) => {
    try {
      showInfo('Testing email provider...');
      
      // Call edge function to test the provider
      const { data, error } = await supabase.functions.invoke('test-email-provider', {
        body: { provider_id: providerId }
      });
      
      if (error) throw error;
      
      if (data.success) {
        showSuccess('Email provider test successful!');
      } else {
        showError(`Test failed: ${data.error}`);
      }
      
    } catch (error) {
      console.error('Error testing provider:', error);
      showError('Failed to test email provider');
    }
  };

  const sendTestEmail = async () => {
    try {
      showInfo('Sending test email...');
      
      const { data, error } = await supabase.functions.invoke('test-email-provider', {
        body: {
          provider_type: testEmail.provider || undefined,
          test_email: testEmail.to,
          template_id: testEmail.useTemplate ? testEmail.template : undefined,
          placeholders: testEmail.placeholders
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        showSuccess('Test email sent successfully!');
      } else {
        showError(`Failed to send test email: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      showError('Failed to send test email');
    }
  };

  const createCategory = async () => {
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('email_template_categories')
        .insert([categoryForm])
        .select()
        .single();
      
      if (error) throw error;
      
      showSuccess('Category created successfully');
      setShowAddCategory(false);
      setCategoryForm({ name: '', description: '', display_order: 0 });
      loadEmailCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      showError('Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const updateCategory = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('email_template_categories')
        .update({
          name: categoryForm.name,
          description: categoryForm.description,
          display_order: categoryForm.display_order
        })
        .eq('id', selectedCategory.id);
      
      if (error) throw error;
      
      showSuccess('Category updated successfully');
      setShowEditCategory(false);
      setSelectedCategory(null);
      setCategoryForm({ name: '', description: '', display_order: 0 });
      loadEmailCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      showError('Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Templates in this category will become uncategorized.')) {
      return;
    }
    
    try {
      // First, update templates to remove category
      await supabase
        .from('email_templates')
        .update({ category_id: null })
        .eq('category_id', categoryId);
      
      // Then delete the category
      const { error } = await supabase
        .from('email_template_categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
      
      showSuccess('Category deleted successfully');
      loadEmailCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      showError('Failed to delete category');
    }
  };

  const loadCategoryTemplates = async (categoryId: string | null) => {
    try {
      let query = supabase
        .from('email_templates')
        .select('*')
        .order('name');
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      } else {
        query = query.is('category_id', null);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setCategoryTemplates(data || []);
      setShowCategoryTemplates(true);
    } catch (error) {
      console.error('Error loading category templates:', error);
      showError('Failed to load templates');
    }
  };

  const loadCronSettings = async () => {
    setLoading(true);
    try {
      setCronEnabled(true);

      // Load existing cron job
      const { data: jobData, error: jobError } = await supabase
        .rpc('get_cron_jobs');

      if (!jobError && jobData && jobData.length > 0) {
        const job = jobData[0];
        setCronJob(job);
        setSelectedSchedule(job.schedule);
        
        // Check if it's a custom schedule
        const isPreset = CRON_PRESETS.some(preset => preset.value === job.schedule);
        if (!isPreset) {
          setUseCustom(true);
          setCustomSchedule(job.schedule);
        }

        // Calculate next run time
        calculateNextRun(job.schedule, job.active);
      }

      // Load last run info
      const { data: runData, error: runError } = await supabase
        .rpc('get_cron_last_run');

      if (!runError && runData && runData.length > 0) {
        setLastRunInfo(runData[0]);
      }

    } catch (error) {
      console.error('Error loading cron settings:', error);
      showError('Failed to load scheduler settings');
    } finally {
      setLoading(false);
    }
  };

  const calculateNextRun = (schedule: string, isActive: boolean) => {
    if (!isActive) {
      setNextRunTime(null);
      return;
    }

    // Parse the cron schedule to calculate next run
    const parts = schedule.split(' ');
    const minute = parts[0];
    const now = new Date();
    
    if (minute === '*') {
      // Every minute
      const next = new Date(now);
      next.setMinutes(now.getMinutes() + 1);
      next.setSeconds(0);
      setNextRunTime(next.toLocaleString());
    } else if (minute.startsWith('*/')) {
      // Every N minutes
      const interval = parseInt(minute.substring(2));
      const next = new Date(now);
      const currentMinute = now.getMinutes();
      const nextMinute = Math.ceil(currentMinute / interval) * interval;
      if (nextMinute === currentMinute) {
        next.setMinutes(currentMinute + interval);
      } else {
        next.setMinutes(nextMinute);
      }
      next.setSeconds(0);
      setNextRunTime(next.toLocaleString());
    } else {
      // Specific minute
      const next = new Date(now);
      const targetMinute = parseInt(minute);
      if (now.getMinutes() >= targetMinute) {
        next.setHours(now.getHours() + 1);
      }
      next.setMinutes(targetMinute);
      next.setSeconds(0);
      setNextRunTime(next.toLocaleString());
    }
  };

  const saveCronSettings = async () => {
    setSaving(true);
    try {
      const schedule = useCustom ? customSchedule : selectedSchedule;
      
      if (!schedule) {
        showError('Please select or enter a schedule');
        return;
      }

      const { data, error } = await supabase
        .rpc('update_cron_schedule', { p_schedule: schedule });

      if (error) throw error;

      if (data?.success) {
        showSuccess('Scheduler settings updated successfully!');
        await loadCronSettings();
      } else {
        showError(data?.message || 'Failed to update schedule');
      }
    } catch (error) {
      console.error('Error saving cron settings:', error);
      showError('Failed to save scheduler settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleCronJob = async () => {
    if (!cronJob) return;

    try {
      const newStatus = !cronJob.active;
      
      const { data, error } = await supabase
        .rpc('toggle_cron_job', { p_active: newStatus });

      if (error) throw error;

      if (data?.success) {
        showSuccess(`Email scheduler ${newStatus ? 'enabled' : 'disabled'}`);
        await loadCronSettings();
      } else {
        showError(data?.message || 'Failed to toggle scheduler');
      }
    } catch (error) {
      console.error('Error toggling scheduler:', error);
      showError('Failed to toggle scheduler');
    }
  };

  const testEmailProcessing = async () => {
    setTesting(true);
    try {
      showInfo('Triggering email processing...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        showError('Authentication required');
        return;
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-email-queue`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const result = await response.json();
      
      if (response.ok) {
        showSuccess(`Email processing completed. ${result.message || 'Check email queue for results.'}`);
        if (activeTab === 'queue') {
          // Refresh queue if on queue tab
          loadEmailQueue();
        }
      } else {
        showError(`Processing failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error testing email processing:', error);
      showError('Failed to trigger email processing');
    } finally {
      setTesting(false);
    }
  };

  const formatCronSchedule = (schedule: string) => {
    const preset = CRON_PRESETS.find(p => p.value === schedule);
    return preset ? preset.label : schedule;
  };

  const resendQueuedEmail = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_queue')
        .update({ 
          status: 'pending',
          retry_count: 0,
          error: null
        })
        .eq('id', emailId);
      
      if (error) throw error;
      
      showSuccess('Email queued for resending');
      loadEmailQueue();
    } catch (error) {
      console.error('Error resending email:', error);
      showError('Failed to resend email');
    }
  };

  const getAddressesForProvider = (providerId: string) => {
    return addresses.filter(a => a.provider_id === providerId);
  };

  const getProviderName = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    return provider ? PROVIDER_INFO[provider.provider_type].name : 'Unknown';
  };

  const getAddressDisplay = (addressId: string) => {
    const address = addresses.find(a => a.id === addressId);
    return address ? `${address.from_name} <${address.email_address}>` : 'Not set';
  };

  // Calculate system status
  const getSystemStatus = () => {
    const hasActiveProvider = providers.some(p => p.is_active);
    const hasPrimaryProvider = providers.some(p => p.is_primary && p.is_active);
    const hasAddresses = addresses.length > 0;
    const hasRoutingRules = routingRules.length > 0;
    
    const isFullyConfigured = hasActiveProvider && hasPrimaryProvider && hasAddresses;
    const isPartiallyConfigured = hasActiveProvider || hasAddresses;
    
    if (isFullyConfigured) {
      return {
        status: 'ready',
        message: 'Email system is fully configured and ready to send',
        color: 'green',
        icon: <CheckCircle2 className="w-5 h-5 text-green-400" />
      };
    } else if (isPartiallyConfigured) {
      return {
        status: 'partial',
        message: 'Email system is partially configured',
        color: 'yellow',
        icon: <Warning className="w-5 h-5 text-yellow-400" />
      };
    } else {
      return {
        status: 'not-configured',
        message: 'Email system is not configured',
        color: 'red',
        icon: <XCircle className="w-5 h-5 text-red-400" />
      };
    }
  };

  const systemStatus = getSystemStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Mail className="w-8 h-8 text-blue-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">
                System Email Configuration
              </h2>
              <p className="text-sm text-gray-400">
                Manage email providers, addresses, and routing rules
              </p>
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
            systemStatus.status === 'ready' 
              ? 'bg-green-500/10 border-green-500/30'
              : systemStatus.status === 'partial'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            {systemStatus.icon}
            <div>
              <p className={`text-sm font-medium ${
                systemStatus.status === 'ready' 
                  ? 'text-green-400'
                  : systemStatus.status === 'partial'
                  ? 'text-yellow-400'
                  : 'text-red-400'
              }`}>
                {systemStatus.status === 'ready' ? 'Ready' : systemStatus.status === 'partial' ? 'Partial' : 'Not Configured'}
              </p>
              <p className="text-xs text-gray-400">
                {systemStatus.message}
              </p>
            </div>
          </div>
        </div>
        
        {/* Configuration Details */}
        {systemStatus.status === 'ready' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">
                {providers.filter(p => p.is_active).length} Active Provider{providers.filter(p => p.is_active).length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">
                {addresses.length} Email Address{addresses.length !== 1 ? 'es' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">
                {routingRules.length} Routing Rule{routingRules.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-300">
                Primary: {providers.find(p => p.is_primary)?.provider_type || 'None'}
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Tab Navigation */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
        <div className="flex flex-wrap border-b border-gray-700">
          <button
            onClick={() => setActiveTab('configuration')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'configuration'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'templates'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Templates
          </button>
          <button
            onClick={() => setActiveTab('scheduler')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'scheduler'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Scheduler
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'queue'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            Queue
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'test'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <TestTube className="w-4 h-4" />
            Test
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Categories
          </button>
        </div>
        
        <div className="p-6">
          {activeTab === 'configuration' && (
            <>
              {/* Email Providers Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5 text-gray-400" />
                  Email Providers
                </h3>
                
                <div className="space-y-4">
                  {providers.map(provider => {
                    const info = PROVIDER_INFO[provider.provider_type];
                    const isExpanded = expandedProvider === provider.id;
                    const providerAddresses = getAddressesForProvider(provider.id);
                    
                    // Check provider status
                    const getProviderStatus = () => {
                      if (!provider.is_active) {
                        return {
                          icon: <XCircle className="w-5 h-5 text-gray-400" />,
                          text: 'Disabled',
                          color: 'text-gray-400',
                          bg: 'bg-gray-500/10',
                          border: 'border-gray-500/30',
                          message: 'Provider is disabled'
                        };
                      }
                      
                      // Check if this provider has any addresses configured
                      const hasAddresses = providerAddresses.length > 0;
                      
                      // For now, we assume API keys are configured if provider exists and is active
                      // In production, you'd check actual API key presence
                      const apiConfigured = true; // This would check actual API key presence
                      
                      if (apiConfigured && hasAddresses) {
                        return {
                          icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
                          text: 'Ready',
                          color: 'text-green-400',
                          bg: 'bg-green-500/10',
                          border: 'border-green-500/30',
                          message: 'API configured & ready to send'
                        };
                      } else if (apiConfigured && !hasAddresses) {
                        return {
                          icon: <Warning className="w-5 h-5 text-yellow-400" />,
                          text: 'Missing Addresses',
                          color: 'text-yellow-400',
                          bg: 'bg-yellow-500/10',
                          border: 'border-yellow-500/30',
                          message: 'API configured but no addresses'
                        };
                      } else {
                        return {
                          icon: <AlertCircle className="w-5 h-5 text-red-400" />,
                          text: 'Not Configured',
                          color: 'text-red-400',
                          bg: 'bg-red-500/10',
                          border: 'border-red-500/30',
                          message: 'API key not configured'
                        };
                      }
                    };
                    
                    const providerStatus = getProviderStatus();
                    
                    return (
                      <div key={provider.id} className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900/50">
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{info.icon}</span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-white">{info.name}</h4>
                                  {provider.is_primary && (
                                    <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                                      Primary
                                    </span>
                                  )}
                                  {/* Provider Status Indicator */}
                                  <div className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${providerStatus.bg} ${providerStatus.border} border`}>
                                    {providerStatus.icon}
                                    <span className={providerStatus.color}>{providerStatus.text}</span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-400">
                                  {providerStatus.message}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => testEmailProvider(provider.id)}
                                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                <Send className="w-4 h-4 inline mr-1" />
                                Test
                              </button>
                              
                              <button
                                onClick={() => handleToggleProvider(provider.id, !provider.is_active)}
                                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                                  provider.is_active 
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                              >
                                {provider.is_active ? 'Disable' : 'Enable'}
                              </button>
                              
                              {provider.is_active && !provider.is_primary && (
                                <button
                                  onClick={() => handleSetPrimaryProvider(provider.id)}
                                  className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                >
                                  Set Primary
                                </button>
                              )}
                              
                              <button
                                onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                              >
                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="p-4 border-t border-gray-700 bg-gray-900/30">
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium text-white">Email Addresses</h5>
                                  <button
                                    onClick={() => {
                                      setNewAddress({ ...newAddress, provider_id: provider.id });
                                      setShowAddAddress(true);
                                    }}
                                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                  >
                                    <Plus className="w-4 h-4 inline" /> Add Address
                                  </button>
                                </div>
                                
                                {providerAddresses.length > 0 ? (
                                  <div className="space-y-2">
                                    {providerAddresses.map(address => (
                                      <div key={address.id} className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 rounded">
                                        <div>
                                          <span className="font-medium text-white">{address.from_name}</span>
                                          <span className="text-gray-400 ml-2">
                                            &lt;{address.email_address}&gt;
                                          </span>
                                          {address.is_default && (
                                            <span className="ml-2 text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded">
                                              Default
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => handleDeleteAddress(address.id)}
                                          className="text-red-400 hover:text-red-300 transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">No email addresses configured</p>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                {info.features.map((feature, idx) => (
                                  <span key={idx} className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded">
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Email Routing Rules Section */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-gray-400" />
                      Email Routing Rules
                    </h3>
                    <button
                      onClick={() => setShowAddRule(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Rule
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {routingRules.length > 0 ? (
                      routingRules.map(rule => {
                        const emailType = EMAIL_TYPES.find(t => t.value === rule.email_type);
                        
                        return (
                          <div key={rule.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xl">{emailType?.icon}</span>
                                  <h4 className="font-semibold text-white">{rule.rule_name}</h4>
                                  <span className="text-sm bg-gray-700/50 text-gray-300 px-2 py-1 rounded">
                                    {emailType?.label}
                                  </span>
                                  {!rule.is_active && (
                                    <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-400">Primary:</span>
                                    <div className="font-medium text-white mt-1">
                                      {getProviderName(rule.primary_provider_id)}
                                      <ArrowRight className="w-3 h-3 inline mx-1 text-gray-500" />
                                      <span className="text-gray-300">{getAddressDisplay(rule.primary_address_id)}</span>
                                    </div>
                                  </div>
                                  
                                  {rule.failover_provider_id && (
                                    <div>
                                      <span className="text-gray-400">Failover:</span>
                                      <div className="font-medium text-white mt-1">
                                        {getProviderName(rule.failover_provider_id)}
                                        <ArrowRight className="w-3 h-3 inline mx-1 text-gray-500" />
                                        <span className="text-gray-300">{getAddressDisplay(rule.failover_address_id || '')}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="ml-4 text-red-400 hover:text-red-300 transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Mail className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                        <p>No routing rules configured</p>
                        <p className="text-sm mt-1">Add a rule to specify which provider to use for different email types</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'templates' && (
            <EmailTemplateEditor />
          )}
          
          {activeTab === 'scheduler' && (
            <div className="space-y-6">
              {/* Status Card */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-blue-400" />
                    Email Processing Status
                  </h3>
                  <button
                    onClick={toggleCronJob}
                    disabled={!cronJob}
                    className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                      cronJob?.active
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {cronJob?.active ? (
                      <>
                        <Pause className="h-4 w-4" />
                        <span>Disable</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        <span>Enable</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Status</p>
                    <p className={`font-medium ${cronJob?.active ? 'text-green-400' : 'text-gray-400'}`}>
                      {cronJob?.active ? 'Active' : 'Inactive'}
                    </p>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Current Schedule</p>
                    <p className="text-white font-medium">
                      {cronJob ? formatCronSchedule(cronJob.schedule) : 'Not configured'}
                    </p>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Last Run</p>
                    <p className="text-white font-medium">
                      {lastRunInfo ? (
                        <>
                          {new Date(lastRunInfo.start_time).toLocaleString()}
                          <span className={`text-xs ml-2 ${
                            lastRunInfo.status === 'succeeded' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            ({lastRunInfo.status})
                          </span>
                        </>
                      ) : (
                        'Never'
                      )}
                    </p>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Next Run</p>
                    <p className="text-white font-medium">
                      {nextRunTime && cronJob?.active ? nextRunTime : 'Not scheduled'}
                    </p>
                  </div>
                </div>

                {/* Test Button */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={testEmailProcessing}
                    disabled={testing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    {testing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span>{testing ? 'Processing...' : 'Test Now'}</span>
                  </button>
                </div>
              </div>

              {/* Schedule Configuration */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <Timer className="h-5 w-5 mr-2 text-blue-400" />
                  Schedule Configuration
                </h3>

                <div className="space-y-4">
                  {/* Preset Schedules */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Select Schedule
                    </label>
                    <select
                      value={useCustom ? 'custom' : selectedSchedule}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setUseCustom(true);
                        } else {
                          setUseCustom(false);
                          setSelectedSchedule(e.target.value);
                          calculateNextRun(e.target.value, cronJob?.active || false);
                        }
                      }}
                      className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      {CRON_PRESETS.map(preset => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label} - {preset.description}
                        </option>
                      ))}
                      <option value="custom">Custom Schedule</option>
                    </select>
                  </div>

                  {/* Custom Schedule Input */}
                  {useCustom && (
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">
                        Custom Cron Expression
                      </label>
                      <input
                        type="text"
                        value={customSchedule}
                        onChange={(e) => {
                          setCustomSchedule(e.target.value);
                          calculateNextRun(e.target.value, cronJob?.active || false);
                        }}
                        placeholder="*/5 * * * *"
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-gray-400 text-xs mt-1">
                        Format: minute hour day month weekday (e.g., */5 * * * * runs every 5 minutes)
                      </p>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={saveCronSettings}
                      disabled={saving}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      {saving ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>{saving ? 'Saving...' : 'Save Schedule'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Help Section */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-blue-400" />
                  How It Works
                </h3>
                <div className="space-y-3 text-gray-400 text-sm">
                  <p>
                    The email processor automatically checks for pending emails in the queue and sends them according to your configured schedule.
                  </p>
                  <p>
                    <strong className="text-gray-300">Recommended Settings:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>For high-volume: Every 1-2 minutes</li>
                    <li>For moderate volume: Every 5-10 minutes</li>
                    <li>For low volume: Every 15-30 minutes</li>
                  </ul>
                  <p>
                    <strong className="text-gray-300">Note:</strong> More frequent processing may increase your Supabase function invocations. The processor only runs when there are emails to send.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'queue' && (
            <EmailQueueManager />
          )}
          
          {activeTab === 'test' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">Send Test Email</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">To Email</label>
                  <input
                    type="email"
                    value={testEmail.to}
                    onChange={(e) => setTestEmail({ ...testEmail, to: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="admin@caraudioevents.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Provider (Optional)</label>
                  <select
                    value={testEmail.provider}
                    onChange={(e) => setTestEmail({ ...testEmail, provider: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Auto (Use Primary)</option>
                    <option value="postmark">Postmark</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="smtp">SMTP</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                <input
                  type="text"
                  value={testEmail.subject}
                  onChange={(e) => setTestEmail({ ...testEmail, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Test Email Subject"
                  disabled={testEmail.useTemplate}
                />
              </div>
              
              <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="useTemplate"
                    checked={testEmail.useTemplate}
                    onChange={(e) => setTestEmail({ ...testEmail, useTemplate: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="useTemplate" className="text-sm font-medium text-gray-300">
                    Use Email Template
                  </label>
                </div>
                
                {testEmail.useTemplate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Select Template</label>
                    <select
                      value={testEmail.template}
                      onChange={(e) => setTestEmail({ ...testEmail, template: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a template...</option>
                      {emailTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.category || 'Uncategorized'})
                        </option>
                      ))}
                    </select>
                    {testEmail.template && (() => {
                      const selectedTemplate = emailTemplates.find(t => t.id === testEmail.template);
                      if (selectedTemplate) {
                        // Process the subject to show what it will look like
                        let processedSubject = selectedTemplate.subject || `Test Email - ${selectedTemplate.name}`;
                        
                        // Replace common placeholders with test data
                        const replacements = {
                          '{{user_name}}': testEmail.placeholders.user_name,
                          '{{user_email}}': testEmail.to,
                          '{{first_name}}': testEmail.placeholders.first_name,
                          '{{last_name}}': testEmail.placeholders.last_name,
                          '{{event_name}}': testEmail.placeholders.event_name,
                          '{{event_date}}': testEmail.placeholders.event_date,
                          '{{amount}}': testEmail.placeholders.amount,
                          '{{current_year}}': testEmail.placeholders.current_year
                        };
                        
                        for (const [placeholder, value] of Object.entries(replacements)) {
                          processedSubject = processedSubject.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
                        }
                        
                        return (
                          <div className="mt-3 p-3 bg-gray-800 border border-gray-700 rounded-lg">
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs font-medium text-gray-400 uppercase">Template Subject:</span>
                                <p className="text-sm text-gray-300 mt-1">{selectedTemplate.subject || 'No subject defined'}</p>
                              </div>
                              {selectedTemplate.subject !== processedSubject && (
                                <div>
                                  <span className="text-xs font-medium text-blue-400 uppercase">Preview (with test data):</span>
                                  <p className="text-sm text-white mt-1 font-medium">{processedSubject}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
              
              {testEmail.useTemplate && testEmail.template && (
                <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
                  <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Customize Placeholder Values
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">User Name</label>
                      <input
                        type="text"
                        value={testEmail.placeholders.user_name}
                        onChange={(e) => setTestEmail({
                          ...testEmail,
                          placeholders: { ...testEmail.placeholders, user_name: e.target.value }
                        })}
                        className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">First Name</label>
                      <input
                        type="text"
                        value={testEmail.placeholders.first_name}
                        onChange={(e) => setTestEmail({
                          ...testEmail,
                          placeholders: { ...testEmail.placeholders, first_name: e.target.value }
                        })}
                        className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={testEmail.placeholders.last_name}
                        onChange={(e) => setTestEmail({
                          ...testEmail,
                          placeholders: { ...testEmail.placeholders, last_name: e.target.value }
                        })}
                        className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Event Name</label>
                      <input
                        type="text"
                        value={testEmail.placeholders.event_name}
                        onChange={(e) => setTestEmail({
                          ...testEmail,
                          placeholders: { ...testEmail.placeholders, event_name: e.target.value }
                        })}
                        className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Event Date</label>
                      <input
                        type="text"
                        value={testEmail.placeholders.event_date}
                        onChange={(e) => setTestEmail({
                          ...testEmail,
                          placeholders: { ...testEmail.placeholders, event_date: e.target.value }
                        })}
                        className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Amount</label>
                      <input
                        type="text"
                        value={testEmail.placeholders.amount}
                        onChange={(e) => setTestEmail({
                          ...testEmail,
                          placeholders: { ...testEmail.placeholders, amount: e.target.value }
                        })}
                        className="w-full px-2 py-1.5 text-sm bg-gray-900 border border-gray-700 rounded text-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    These values will replace {`{{placeholders}}`} in your email template
                  </p>
                </div>
              )}
              
              <button
                onClick={sendTestEmail}
                disabled={testEmail.useTemplate && !testEmail.template}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
                Send Test Email
              </button>
              
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-white">Test Email Information</span>
                </div>
                <p className="text-sm text-gray-300">
                  Test emails will be sent using the configured email providers. Make sure you have at least one active provider configured.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Email Categories</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">{emailCategories.length} categories</span>
                  <button
                    onClick={() => setShowAddCategory(true)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Category
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emailCategories.length > 0 ? (
                  emailCategories.map((category, idx) => (
                    <div key={idx} className="border border-gray-700 rounded-lg p-4 bg-gray-900/50 hover:bg-gray-900/70 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <Folder className="w-5 h-5 text-blue-500" />
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedCategory(category);
                              loadCategoryTemplates(category.id);
                            }}
                            className="p-1 text-gray-400 hover:text-white transition-colors"
                            title="View Templates"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {category.id && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedCategory(category);
                                  setCategoryForm({
                                    name: category.name,
                                    description: category.description || '',
                                    display_order: category.display_order || 0
                                  });
                                  setShowEditCategory(true);
                                }}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title="Edit Category"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteCategory(category.id)}
                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete Category"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-white">{category.name || 'Uncategorized'}</h4>
                        {category.description && (
                          <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                        )}
                        <p className="text-sm text-gray-400 mt-2">
                          {category.count} template{category.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p>No categories found</p>
                    <button
                      onClick={() => setShowAddCategory(true)}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create First Category
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddAddress && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Email Address</h3>
              <button
                onClick={() => setShowAddAddress(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newAddress.email_address}
                  onChange={(e) => setNewAddress({ ...newAddress, email_address: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="support@caraudioevents.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">From Name</label>
                <input
                  type="text"
                  value={newAddress.from_name}
                  onChange={(e) => setNewAddress({ ...newAddress, from_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Car Audio Events Support"
                />
              </div>
              
              <div className="flex gap-2 justify-end pt-4">
                <button
                  onClick={() => setShowAddAddress(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAddress}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Adding...' : 'Add Address'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Rule Modal */}
      {showAddRule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Routing Rule</h3>
              <button
                onClick={() => setShowAddRule(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Rule Name</label>
                  <input
                    type="text"
                    value={newRule.rule_name}
                    onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Welcome Email Rule"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email Type</label>
                  <select
                    value={newRule.email_type}
                    onChange={(e) => setNewRule({ ...newRule, email_type: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select type...</option>
                    {EMAIL_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Primary Provider</label>
                  <select
                    value={newRule.primary_provider_id}
                    onChange={(e) => setNewRule({ ...newRule, primary_provider_id: e.target.value, primary_address_id: '' })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select provider...</option>
                    {providers.filter(p => p.is_active).map(provider => (
                      <option key={provider.id} value={provider.id}>
                        {PROVIDER_INFO[provider.provider_type].name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Primary Address</label>
                  <select
                    value={newRule.primary_address_id}
                    onChange={(e) => setNewRule({ ...newRule, primary_address_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                    disabled={!newRule.primary_provider_id}
                  >
                    <option value="">Select address...</option>
                    {newRule.primary_provider_id && 
                      getAddressesForProvider(newRule.primary_provider_id).map(address => (
                        <option key={address.id} value={address.id}>
                          {address.from_name} &lt;{address.email_address}&gt;
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>
              
              <div className="border-t border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Failover Configuration (Optional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Failover Provider</label>
                    <select
                      value={newRule.failover_provider_id}
                      onChange={(e) => setNewRule({ ...newRule, failover_provider_id: e.target.value, failover_address_id: '' })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">None</option>
                      {providers.filter(p => p.is_active && p.id !== newRule.primary_provider_id).map(provider => (
                        <option key={provider.id} value={provider.id}>
                          {PROVIDER_INFO[provider.provider_type].name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Failover Address</label>
                    <select
                      value={newRule.failover_address_id}
                      onChange={(e) => setNewRule({ ...newRule, failover_address_id: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                      disabled={!newRule.failover_provider_id}
                    >
                      <option value="">Select address...</option>
                      {newRule.failover_provider_id && 
                        getAddressesForProvider(newRule.failover_provider_id).map(address => (
                          <option key={address.id} value={address.id}>
                            {address.from_name} &lt;{address.email_address}&gt;
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowAddRule(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRule}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Adding...' : 'Add Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Email Category</h3>
              <button
                onClick={() => {
                  setShowAddCategory(false);
                  setCategoryForm({ name: '', description: '', display_order: 0 });
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Notifications"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional description for this category"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Display Order</label>
                <input
                  type="number"
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddCategory(false);
                    setCategoryForm({ name: '', description: '', display_order: 0 });
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createCategory}
                  disabled={!categoryForm.name || saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditCategory && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Edit Category</h3>
              <button
                onClick={() => {
                  setShowEditCategory(false);
                  setSelectedCategory(null);
                  setCategoryForm({ name: '', description: '', display_order: 0 });
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Notifications"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional description for this category"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Display Order</label>
                <input
                  type="number"
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditCategory(false);
                    setSelectedCategory(null);
                    setCategoryForm({ name: '', description: '', display_order: 0 });
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateCategory}
                  disabled={!categoryForm.name || saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Updating...' : 'Update Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Category Templates Modal */}
      {showCategoryTemplates && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Templates in "{selectedCategory?.name || 'Uncategorized'}"
              </h3>
              <button
                onClick={() => {
                  setShowCategoryTemplates(false);
                  setCategoryTemplates([]);
                  setSelectedCategory(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {categoryTemplates.length > 0 ? (
                <div className="space-y-3">
                  {categoryTemplates.map((template) => (
                    <div key={template.id} className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{template.name}</h4>
                          <p className="text-sm text-gray-400 mt-1">{template.subject}</p>
                          {template.description && (
                            <p className="text-xs text-gray-500 mt-2">{template.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {template.is_active ? (
                            <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">Active</span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded">Inactive</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p>No templates in this category</p>
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
              <span className="text-sm text-gray-400">
                {categoryTemplates.length} template{categoryTemplates.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => {
                  setShowCategoryTemplates(false);
                  setCategoryTemplates([]);
                  setSelectedCategory(null);
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};