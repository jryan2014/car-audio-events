import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Save, CheckCircle, AlertCircle, FileText, Code, HelpCircle, Settings, Eye, EyeOff, Plus, Trash2, Copy, Search, Send, Clock, RefreshCw, Play, Pause, Eye as EyeIcon, Users, Calendar, DollarSign, Building, Shield, Zap, X } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import { useNotifications } from '../NotificationSystem';
import { useAuth } from '../../contexts/AuthContext';


interface EmailSettingsState {
  from_email: string;
  from_name: string;
  api_key: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  email_type: string;
  membership_level?: string;
  is_active: boolean;
  from_name?: string;
  created_at: string;
  updated_at: string;
  category_id?: string;
}

interface EmailVariable {
  name: string;
  description: string;
  example: string;
  category: 'system' | 'user' | 'event' | 'organization' | 'billing' | 'invoice' | 'competition' | 'notification';
}

interface EmailQueueItem {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  template_id?: string;
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
  error_message?: string;
  attempts: number;
  last_attempt_at?: string;
  created_at: string;
}

interface EmailPreviewData {
  user_name: string;
  user_email: string;
  event_name: string;
  event_date: string;
  event_location: string;
  organization_name: string;
  payment_amount: string;
  invoice_id: string;
  competition_name: string;
  competition_score: string;
}

// 1. Add category type and state
interface EmailTemplateCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const EmailSettings: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'smtp' | 'templates' | 'queue' | 'preview' | 'categories'>('smtp');
  const [settings, setSettings] = useState<EmailSettingsState>({
    from_email: '',
    from_name: '',
    api_key: '',
  });
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [emailQueue, setEmailQueue] = useState<EmailQueueItem[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [variableSearch, setVariableSearch] = useState('');
  const [selectedVariableCategory, setSelectedVariableCategory] = useState<string>('all');
  const [useTinyMCE, setUseTinyMCE] = useState(true);
  const [useRichEditor, setUseRichEditor] = useState(true);
  const [previewData, setPreviewData] = useState<EmailPreviewData>({
    user_name: 'John Doe',
    user_email: 'john@example.com',
    event_name: 'Summer Car Show 2024',
    event_date: 'July 15, 2024',
    event_location: 'Central Park, New York',
    organization_name: 'Car Audio Events',
    payment_amount: '$99.99',
    invoice_id: 'INV-2025-001',
    competition_name: 'Bass Battle 2024',
    competition_score: '145.2 dB'
  });
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'text'>('desktop');
  const [queueFilter, setQueueFilter] = useState<'all' | 'pending' | 'failed' | 'sent'>('all');
  const [queueLoading, setQueueLoading] = useState(false);
  const editorRef = useRef<any>(null);
  const [testEmail, setTestEmail] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [categories, setCategories] = useState<EmailTemplateCategory[]>([]);

  // Add modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<EmailTemplateCategory | null>(null);
  const [categoryDeleteConfirm, setCategoryDeleteConfirm] = useState<EmailTemplateCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    display_order: 1,
    is_active: true
  });
  const [categoryModalLoading, setCategoryModalLoading] = useState(false);

  // Add filter state
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<string>('all');

  // Add debug toggle state
  const [showCategoryDebug, setShowCategoryDebug] = useState(false);

  // Bulletproof email header and footer templates
  const defaultEmailHeader = `
    <!--[if mso]>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e; padding:0;">
      <tr><td align="center">
    <![endif]-->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1a1a2e; padding:0;">
      <tr>
        <td align="center" style="padding:24px 0 12px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; margin:0 auto; background:#1a1a2e; border-radius:8px;">
            <tr>
              <td align="center" style="padding:32px 24px 16px 44px;"> <!-- 24px + 20px left padding -->
                <img src="https://caraudioevents.com/assets/logos/CAE_Logo_V2-email-logo.png" alt="Car Audio Events" width="120" height="46" style="width:120px; height:46px; display:block; margin:0 auto 10px auto; border:0; outline:none; text-decoration:none;" border="0" />
                <h1 style="color:#3b82f6; margin:0; font-size:24px; font-weight:600; font-family:Arial,Helvetica,sans-serif; padding-left:20px; text-align:left;">Car Audio Events</h1>
                <p style="color:#9ca3af; margin:5px 0 0 0; font-size:14px; font-family:Arial,Helvetica,sans-serif; padding-left:20px; text-align:left;">Professional Car Audio Competition Platform</p>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff; padding:32px 44px 32px 44px; border-radius:8px; color:#333333; font-family:Arial,Helvetica,sans-serif; font-size:16px; line-height:1.6; text-align:left;" align="left"> <!-- 32px top/bottom, 44px left/right (24px+20px) -->
  `;
  
  const defaultEmailFooter = `
              </td>
            </tr>
            <tr>
              <td align="center" style="background:#1f2937; color:#ffffff; font-size:12px; font-family:Arial,Helvetica,sans-serif; padding:20px 0 20px 20px; border-radius:0 0 8px 8px; text-align:left;">
                <p style="margin:5px 0; color:#ffffff;">© 2025 Car Audio Events. All rights reserved.</p>
                <p style="margin:5px 0; color:#ffffff;">Professional car audio competition platform</p>
                <a href="https://caraudioevents.com" style="color:#3b82f6; text-decoration:none; margin:0 10px;">Website</a>
                <a href="mailto:support@caraudioevents.com" style="color:#3b82f6; text-decoration:none; margin:0 10px;">Support</a>
                <a href="https://caraudioevents.com/privacy" style="color:#3b82f6; text-decoration:none; margin:0 10px;">Privacy</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  `;

  // Comprehensive email variables - 60+ variables covering all scenarios
  const emailVariables: EmailVariable[] = [
    // System Variables
    { name: '{{site_name}}', description: 'Website name', example: 'Car Audio Events', category: 'system' },
    { name: '{{site_url}}', description: 'Website URL', example: 'https://caraudioevents.com', category: 'system' },
    { name: '{{admin_email}}', description: 'Admin contact email', example: 'admin@caraudioevents.com', category: 'system' },
    { name: '{{support_email}}', description: 'Support email address', example: 'support@caraudioevents.com', category: 'system' },
    { name: '{{current_date}}', description: 'Current date', example: 'January 30, 2025', category: 'system' },
    { name: '{{current_time}}', description: 'Current time', example: '2:30 PM EST', category: 'system' },
    { name: '{{timezone}}', description: 'User timezone', example: 'America/New_York', category: 'system' },
    
    // User Account Variables
    { name: '{{user_id}}', description: 'User unique ID', example: '29b931f5-c02e-4562-b249-278f86663b62', category: 'user' },
    { name: '{{user_name}}', description: 'User full name', example: 'John Doe', category: 'user' },
    { name: '{{user_first_name}}', description: 'User first name', example: 'John', category: 'user' },
    { name: '{{user_last_name}}', description: 'User last name', example: 'Doe', category: 'user' },
    { name: '{{user_email}}', description: 'User email address', example: 'john@example.com', category: 'user' },
    { name: '{{user_phone}}', description: 'User phone number', example: '+1-555-123-4567', category: 'user' },
    { name: '{{user_membership_type}}', description: 'User membership level', example: 'premium', category: 'user' },
    { name: '{{user_membership_expiry}}', description: 'Membership expiry date', example: 'December 31, 2025', category: 'user' },
    { name: '{{user_join_date}}', description: 'User registration date', example: 'January 15, 2024', category: 'user' },
    { name: '{{user_profile_url}}', description: 'User profile page URL', example: 'https://caraudioevents.com/profile', category: 'user' },
    { name: '{{user_avatar}}', description: 'User profile picture URL', example: 'https://example.com/avatar.jpg', category: 'user' },
    { name: '{{user_location}}', description: 'User location/city', example: 'New York, NY', category: 'user' },
    { name: '{{user_timezone}}', description: 'User timezone', example: 'America/New_York', category: 'user' },
    
    // Event Variables
    { name: '{{event_id}}', description: 'Event unique ID', example: 'evt_123456789', category: 'event' },
    { name: '{{event_name}}', description: 'Event name', example: 'Summer Car Show 2024', category: 'event' },
    { name: '{{event_description}}', description: 'Event description', example: 'Annual summer car show featuring...', category: 'event' },
    { name: '{{event_date}}', description: 'Event date', example: 'July 15, 2024', category: 'event' },
    { name: '{{event_time}}', description: 'Event time', example: '2:00 PM - 8:00 PM', category: 'event' },
    { name: '{{event_start_time}}', description: 'Event start time', example: '2:00 PM', category: 'event' },
    { name: '{{event_end_time}}', description: 'Event end time', example: '8:00 PM', category: 'event' },
    { name: '{{event_location}}', description: 'Event location', example: 'Central Park, New York', category: 'event' },
    { name: '{{event_address}}', description: 'Event full address', example: '123 Main St, New York, NY 10001', category: 'event' },
    { name: '{{event_city}}', description: 'Event city', example: 'New York', category: 'event' },
    { name: '{{event_state}}', description: 'Event state/province', example: 'NY', category: 'event' },
    { name: '{{event_zip}}', description: 'Event zip/postal code', example: '10001', category: 'event' },
    { name: '{{event_country}}', description: 'Event country', example: 'United States', category: 'event' },
    { name: '{{event_coordinates}}', description: 'Event GPS coordinates', example: '40.7589, -73.9851', category: 'event' },
    { name: '{{event_url}}', description: 'Event page URL', example: 'https://caraudioevents.com/events/summer-show-2024', category: 'event' },
    { name: '{{event_image}}', description: 'Event image URL', example: 'https://example.com/event-image.jpg', category: 'event' },
    { name: '{{event_category}}', description: 'Event category', example: 'Car Show', category: 'event' },
    { name: '{{event_status}}', description: 'Event status', example: 'Active', category: 'event' },
    { name: '{{event_capacity}}', description: 'Event capacity', example: '500', category: 'event' },
    { name: '{{event_registered}}', description: 'Number of registered attendees', example: '342', category: 'event' },
    { name: '{{event_price}}', description: 'Event ticket price', example: '$25.00', category: 'event' },
    { name: '{{event_currency}}', description: 'Event price currency', example: 'USD', category: 'event' },
    
    // Organization Variables
    { name: '{{organization_id}}', description: 'Organization unique ID', example: 'org_123456789', category: 'organization' },
    { name: '{{organization_name}}', description: 'Organization name', example: 'Car Audio Events', category: 'organization' },
    { name: '{{organization_description}}', description: 'Organization description', example: 'Leading car audio competition platform', category: 'organization' },
    { name: '{{organization_email}}', description: 'Organization contact email', example: 'info@caraudioevents.com', category: 'organization' },
    { name: '{{organization_phone}}', description: 'Organization phone', example: '+1-555-123-4567', category: 'organization' },
    { name: '{{organization_website}}', description: 'Organization website', example: 'https://caraudioevents.com', category: 'organization' },
    { name: '{{organization_address}}', description: 'Organization address', example: '123 Business St, New York, NY', category: 'organization' },
    { name: '{{organization_logo}}', description: 'Organization logo URL', example: 'https://example.com/logo.png', category: 'organization' },
    
    // Billing & Payment Variables
    { name: '{{payment_id}}', description: 'Payment unique ID', example: 'pi_123456789', category: 'billing' },
    { name: '{{payment_amount}}', description: 'Payment amount', example: '$99.99', category: 'billing' },
    { name: '{{payment_currency}}', description: 'Payment currency', example: 'USD', category: 'billing' },
    { name: '{{payment_status}}', description: 'Payment status', example: 'succeeded', category: 'billing' },
    { name: '{{payment_method}}', description: 'Payment method', example: 'Visa ending in 4242', category: 'billing' },
    { name: '{{payment_date}}', description: 'Payment date', example: 'January 30, 2025', category: 'billing' },
    { name: '{{subscription_id}}', description: 'Subscription ID', example: 'sub_123456789', category: 'billing' },
    { name: '{{subscription_status}}', description: 'Subscription status', example: 'active', category: 'billing' },
    { name: '{{subscription_plan}}', description: 'Subscription plan name', example: 'Premium Monthly', category: 'billing' },
    { name: '{{subscription_price}}', description: 'Subscription price', example: '$29.99/month', category: 'billing' },
    { name: '{{next_billing_date}}', description: 'Next billing date', example: 'February 30, 2025', category: 'billing' },
    { name: '{{billing_cycle}}', description: 'Billing cycle', example: 'monthly', category: 'billing' },
    
    // Invoice Variables
    { name: '{{invoice_id}}', description: 'Invoice number', example: 'INV-2025-001', category: 'invoice' },
    { name: '{{invoice_date}}', description: 'Invoice date', example: 'January 30, 2025', category: 'invoice' },
    { name: '{{invoice_due_date}}', description: 'Invoice due date', example: 'February 15, 2025', category: 'invoice' },
    { name: '{{invoice_subtotal}}', description: 'Invoice subtotal', example: '$89.99', category: 'invoice' },
    { name: '{{invoice_tax}}', description: 'Invoice tax amount', example: '$7.20', category: 'invoice' },
    { name: '{{invoice_total}}', description: 'Invoice total', example: '$97.19', category: 'invoice' },
    { name: '{{invoice_items}}', description: 'Invoice line items', example: 'Premium Membership - $89.99', category: 'invoice' },
    { name: '{{invoice_pdf_url}}', description: 'Invoice PDF download URL', example: 'https://example.com/invoice.pdf', category: 'invoice' },
    { name: '{{invoice_status}}', description: 'Invoice status', example: 'paid', category: 'invoice' },
    
    // Competition Variables
    { name: '{{competition_id}}', description: 'Competition unique ID', example: 'comp_123456789', category: 'competition' },
    { name: '{{competition_name}}', description: 'Competition name', example: 'Bass Battle 2024', category: 'competition' },
    { name: '{{competition_category}}', description: 'Competition category', example: 'Bass', category: 'competition' },
    { name: '{{competition_division}}', description: 'Competition division', example: 'Pro', category: 'competition' },
    { name: '{{competition_score}}', description: 'Competition score', example: '145.2 dB', category: 'competition' },
    { name: '{{competition_rank}}', description: 'Competition ranking', example: '3rd Place', category: 'competition' },
    { name: '{{competition_judge}}', description: 'Competition judge', example: 'Mike Johnson', category: 'competition' },
    { name: '{{competition_notes}}', description: 'Judge notes/comments', example: 'Excellent setup, clean install', category: 'competition' },
    
    // Notification & System Variables
    { name: '{{reset_link}}', description: 'Password reset link', example: 'https://caraudioevents.com/reset?token=abc123', category: 'notification' },
    { name: '{{verification_link}}', description: 'Email verification link', example: 'https://caraudioevents.com/verify?token=xyz789', category: 'notification' },
    { name: '{{unsubscribe_link}}', description: 'Email unsubscribe link', example: 'https://caraudioevents.com/unsubscribe?token=def456', category: 'notification' },
    { name: '{{preferences_link}}', description: 'Email preferences link', example: 'https://caraudioevents.com/preferences', category: 'notification' },
    { name: '{{login_link}}', description: 'Login page link', example: 'https://caraudioevents.com/login', category: 'notification' },
    { name: '{{dashboard_link}}', description: 'User dashboard link', example: 'https://caraudioevents.com/dashboard', category: 'notification' },
    { name: '{{support_link}}', description: 'Support page link', example: 'https://caraudioevents.com/support', category: 'notification' },
    { name: '{{faq_link}}', description: 'FAQ page link', example: 'https://caraudioevents.com/faq', category: 'notification' },
  ];

  const variableCategories = [
    { id: 'all', name: 'All Variables', count: emailVariables.length },
    { id: 'system', name: 'System', count: emailVariables.filter(v => v.category === 'system').length },
    { id: 'user', name: 'User Account', count: emailVariables.filter(v => v.category === 'user').length },
    { id: 'event', name: 'Events', count: emailVariables.filter(v => v.category === 'event').length },
    { id: 'organization', name: 'Organizations', count: emailVariables.filter(v => v.category === 'organization').length },
    { id: 'billing', name: 'Billing', count: emailVariables.filter(v => v.category === 'billing').length },
    { id: 'invoice', name: 'Invoices', count: emailVariables.filter(v => v.category === 'invoice').length },
    { id: 'competition', name: 'Competitions', count: emailVariables.filter(v => v.category === 'competition').length },
    { id: 'notification', name: 'Notifications', count: emailVariables.filter(v => v.category === 'notification').length },
  ];

  const filteredVariables = emailVariables.filter(variable => {
    const matchesSearch = variable.name.toLowerCase().includes(variableSearch.toLowerCase()) ||
                         variable.description.toLowerCase().includes(variableSearch.toLowerCase());
    const matchesCategory = selectedVariableCategory === 'all' || variable.category === selectedVariableCategory;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    loadEmailSettings();
    loadEmailTemplates();
    loadEmailQueue();
  }, []);

  // 2. Fetch categories from Supabase
  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from('email_template_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (!error && data) setCategories(data);
    };
    loadCategories();
  }, []);

  const loadEmailSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('email_configurations')
        .select('from_email, from_name, api_key')
        .eq('provider', 'mailgun')
        .single();
      if (error) throw error;
      if (data) {
        setSettings({
          from_email: data.from_email || '',
          from_name: data.from_name || '',
          api_key: data.api_key || '',
        });
      }
    } catch (err: any) {
      setError('Database Error: Failed to load email settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');
      if (error) throw error;
      if (data) {
        setTemplates(data);
      }
    } catch (err: any) {
      console.error('Failed to load email templates:', err);
    }
  };

  const loadEmailQueue = async () => {
    setQueueLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_queue')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setEmailQueue(data);
      }
    } catch (err: any) {
      showError('Failed to load email queue', err.message);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleInputChange = (key: keyof EmailSettingsState, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setSaveStatus('saving');
    setError(null);
    try {
      const { error } = await supabase
        .from('email_configurations')
        .upsert({
          provider: 'mailgun',
          from_email: settings.from_email,
          from_name: settings.from_name,
          api_key: settings.api_key,
          is_active: true,
          created_at: new Date().toISOString(),
        }, { onConflict: 'provider' });
      if (error) throw error;
      setSaveStatus('success');
      showSuccess('Email settings saved successfully');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setError('Database Error: Failed to save email settings. Please try again.');
      showError('Failed to save email settings', err.message);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (template: EmailTemplate) => {
    try {
      // Prepare the template data to match the database schema exactly
      const templateData: any = {
        name: template.name,
        subject: template.subject,
        body: template.body,
        email_type: template.email_type,
        membership_level: template.membership_level,
        is_active: template.is_active,
        from_name: template.from_name,
        variables: template.variables || [],
        updated_at: new Date().toISOString()
      };

      // Only include ID if it's an existing template (not empty)
      if (template.id && template.id.trim() !== '') {
        templateData.id = template.id;
      }

      const { error } = await supabase
        .from('email_templates')
        .upsert(templateData, { onConflict: 'id' });
      if (error) throw error;
      await loadEmailTemplates();
      setSelectedTemplate(null);
      showSuccess('Email template saved successfully');
    } catch (err: any) {
      showError('Failed to save email template', err.message);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
      await loadEmailTemplates();
      setSelectedTemplate(null);
      showSuccess('Email template deleted successfully');
    } catch (err: any) {
      showError('Failed to delete email template', err.message);
    }
  };

  const insertVariable = (variableName: string) => {
    if (selectedTemplate) {
      const textarea = document.getElementById('template-body') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = selectedTemplate.body;
        const newText = text.substring(0, start) + variableName + text.substring(end);
        setSelectedTemplate({ ...selectedTemplate, body: newText });
        
        // Set cursor position after the inserted variable
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + variableName.length, start + variableName.length);
        }, 0);
      }
    }
  };

  const copyVariable = (variableName: string) => {
    navigator.clipboard.writeText(variableName);
    showSuccess('Variable copied to clipboard', variableName);
  };

  const retryFailedEmail = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_queue')
        .update({ 
          status: 'pending', 
          attempts: 0,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', emailId);
      if (error) throw error;
      showSuccess('Email queued for retry');
      await loadEmailQueue();
    } catch (err: any) {
      showError('Failed to retry email', err.message);
    }
  };

  const cancelEmail = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_queue')
        .update({ 
          status: 'failed',
          error_message: 'Cancelled by admin',
          last_attempt_at: new Date().toISOString()
        })
        .eq('id', emailId);
      if (error) throw error;
      setNotification({
        type: 'success',
        message: 'Email cancelled successfully!'
      });
      await loadEmailQueue();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Failed to cancel email: ${err.message}`
      });
    }
  };

  const clearEmailQueue = async (status?: string) => {
    const confirmMessage = status 
      ? `Are you sure you want to clear all ${status} emails?`
      : 'Are you sure you want to clear the entire email queue?';
    
    if (!confirm(confirmMessage)) return;
    
    try {
      let query = supabase.from('email_queue').delete();
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      const { error } = await query;
      if (error) throw error;
      showSuccess('Email queue cleared');
      await loadEmailQueue();
    } catch (err: any) {
      showError('Failed to clear email queue', err.message);
    }
  };

  const generatePreview = (template: EmailTemplate, data: EmailPreviewData) => {
    let previewSubject = template.subject;
    let previewBody = template.body;

    // Replace variables with preview data
    const variableMap: { [key: string]: string } = {
      '{{site_name}}': 'Car Audio Events',
      '{{site_url}}': 'https://caraudioevents.com',
      '{{admin_email}}': 'admin@caraudioevents.com',
      '{{support_email}}': 'support@caraudioevents.com',
      '{{current_date}}': new Date().toLocaleDateString(),
      '{{current_time}}': new Date().toLocaleTimeString(),
      '{{timezone}}': 'America/New_York',
      '{{user_id}}': '29b931f5-c02e-4562-b249-278f86663b62',
      '{{user_name}}': data.user_name,
      '{{user_first_name}}': data.user_name.split(' ')[0],
      '{{user_last_name}}': data.user_name.split(' ')[1] || '',
      '{{user_email}}': data.user_email,
      '{{user_phone}}': '+1-555-123-4567',
      '{{user_membership_type}}': 'premium',
      '{{user_membership_expiry}}': 'December 31, 2025',
      '{{user_join_date}}': 'January 15, 2024',
      '{{user_profile_url}}': 'https://caraudioevents.com/profile',
      '{{user_avatar}}': 'https://example.com/avatar.jpg',
      '{{user_location}}': 'New York, NY',
      '{{user_timezone}}': 'America/New_York',
      '{{event_id}}': 'evt_123456789',
      '{{event_name}}': data.event_name,
      '{{event_description}}': 'Annual summer car show featuring the best audio systems',
      '{{event_date}}': data.event_date,
      '{{event_time}}': '2:00 PM - 8:00 PM',
      '{{event_start_time}}': '2:00 PM',
      '{{event_end_time}}': '8:00 PM',
      '{{event_location}}': data.event_location,
      '{{event_address}}': '123 Main St, New York, NY 10001',
      '{{event_city}}': 'New York',
      '{{event_state}}': 'NY',
      '{{event_zip}}': '10001',
      '{{event_country}}': 'United States',
      '{{event_coordinates}}': '40.7589, -73.9851',
      '{{event_url}}': 'https://caraudioevents.com/events/summer-show-2024',
      '{{event_image}}': 'https://example.com/event-image.jpg',
      '{{event_category}}': 'Car Show',
      '{{event_status}}': 'Active',
      '{{event_capacity}}': '500',
      '{{event_registered}}': '342',
      '{{event_price}}': '$25.00',
      '{{event_currency}}': 'USD',
      '{{organization_id}}': 'org_123456789',
      '{{organization_name}}': data.organization_name,
      '{{organization_description}}': 'Leading car audio competition platform',
      '{{organization_email}}': 'info@caraudioevents.com',
      '{{organization_phone}}': '+1-555-123-4567',
      '{{organization_website}}': 'https://caraudioevents.com',
      '{{organization_address}}': '123 Business St, New York, NY',
      '{{organization_logo}}': 'https://example.com/logo.png',
      '{{payment_id}}': 'pi_123456789',
      '{{payment_amount}}': data.payment_amount,
      '{{payment_currency}}': 'USD',
      '{{payment_status}}': 'succeeded',
      '{{payment_method}}': 'Visa ending in 4242',
      '{{payment_date}}': new Date().toLocaleDateString(),
      '{{subscription_id}}': 'sub_123456789',
      '{{subscription_status}}': 'active',
      '{{subscription_plan}}': 'Premium Monthly',
      '{{subscription_price}}': '$29.99/month',
      '{{next_billing_date}}': 'February 30, 2025',
      '{{billing_cycle}}': 'monthly',
      '{{invoice_id}}': data.invoice_id,
      '{{invoice_date}}': new Date().toLocaleDateString(),
      '{{invoice_due_date}}': 'February 15, 2025',
      '{{invoice_subtotal}}': '$89.99',
      '{{invoice_tax}}': '$7.20',
      '{{invoice_total}}': '$97.19',
      '{{invoice_items}}': 'Premium Membership - $89.99',
      '{{invoice_pdf_url}}': 'https://example.com/invoice.pdf',
      '{{invoice_status}}': 'paid',
      '{{competition_id}}': 'comp_123456789',
      '{{competition_name}}': data.competition_name,
      '{{competition_category}}': 'Bass',
      '{{competition_division}}': 'Pro',
      '{{competition_score}}': data.competition_score,
      '{{competition_rank}}': '3rd Place',
      '{{competition_judge}}': 'Mike Johnson',
      '{{competition_notes}}': 'Excellent setup, clean install',
      '{{reset_link}}': 'https://caraudioevents.com/reset?token=abc123',
      '{{verification_link}}': 'https://caraudioevents.com/verify?token=xyz789',
      '{{unsubscribe_link}}': 'https://caraudioevents.com/unsubscribe?token=def456',
      '{{preferences_link}}': 'https://caraudioevents.com/preferences',
      '{{login_link}}': 'https://caraudioevents.com/login',
      '{{dashboard_link}}': 'https://caraudioevents.com/dashboard',
      '{{support_link}}': 'https://caraudioevents.com/support',
      '{{faq_link}}': 'https://caraudioevents.com/faq',
    };

    // Replace all variables in subject and body
    Object.entries(variableMap).forEach(([variable, value]) => {
      const regex = new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      previewSubject = previewSubject.replace(regex, value);
      previewBody = previewBody.replace(regex, value);
    });

    return { subject: previewSubject, body: previewBody };
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      setNotification({
        type: 'error',
        message: 'Please enter a test email address'
      });
      return;
    }
    if (!selectedTemplate) {
      setNotification({
        type: 'error',
        message: 'Please select an email template to test.'
      });
      return;
    }
    setLoading(true);
    try {
      // Replace variables in subject and body using the comprehensive function
      let subject = replaceAllEmailVariables(selectedTemplate.subject, previewData);
      let bodyContent = replaceAllEmailVariables(selectedTemplate.body, previewData);
      
      // Clean up any existing template headers/footers to avoid duplication
      bodyContent = bodyContent
        .replace(/<img[^>]*CAE_Logo[^>]*>/gi, '') // Remove any logo images
        .replace(/<h1[^>]*>Car Audio Events<\/h1>/gi, '') // Remove duplicate headers
        .replace(/Professional Car Audio Competition Platform/gi, '') // Remove taglines
        .replace(/<table[^>]*>[\s\S]*?Professional car audio competition platform[\s\S]*?<\/table>/gi, '') // Remove complex table headers
        .replace(/©.*Car Audio Events.*All rights reserved\./gi, '') // Remove duplicate footers
        .trim();
      
      // Create clean, simple email format (no complex headers)
      const cleanEmailFormat = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Car Audio Events</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 30px 40px 20px 40px; text-align: center; background-color: #1a1a2e; border-radius: 8px 8px 0 0;">
                      <img src="https://caraudioevents.com/assets/logos/CAE_Logo_V2-email-logo.png" alt="Car Audio Events" width="150" height="58" style="display: block; margin: 0 auto 10px auto; border: 0;" />
                      <h1 style="margin: 0; color: #3b82f6; font-size: 24px; font-weight: bold;">Car Audio Events</h1>
                      <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 14px;">Professional Car Audio Competition Platform</p>
                    </td>
                  </tr>
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px; color: #333333; font-size: 16px; line-height: 1.6;">
                      ${bodyContent}
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="margin: 0; font-size: 12px; color: #666;">
                        © 2025 Car Audio Events. All rights reserved.<br/>
                        <a href="https://caraudioevents.com" style="color: #3b82f6; text-decoration: none;">Visit our website</a> | 
                        <a href="mailto:support@caraudioevents.com" style="color: #3b82f6; text-decoration: none;">Contact Support</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;
      
      // Insert test email into queue with clean HTML format
      const { error } = await supabase
        .from('email_queue')
        .insert({
          recipient: testEmail,
          subject,
          body: cleanEmailFormat,
          html_content: cleanEmailFormat,
          status: 'pending',
          attempts: 0
        });
      if (error) {
        console.error('Error inserting test email:', error);
        setNotification({
          type: 'error',
          message: `Failed to queue test email: ${error.message}`
        });
      } else {
        setNotification({
          type: 'success',
          message: 'Test email queued successfully! Click "Process Queue" to send it immediately.'
        });
        setTestEmail(''); // Reset input
        await loadEmailQueue();
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      setNotification({
        type: 'error',
        message: 'Failed to queue test email. Please check your email template.'
      });
    } finally {
      setLoading(false);
    }
  };

  const processEmailQueue = async () => {
    setQueueLoading(true);
    try {
      console.log('Starting manual email queue processing...');
      
      // Get the user's JWT token with better error handling
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error(`Authentication error: ${sessionError.message}`);
      }
      
      if (!session?.access_token) {
        console.error('No session or access token available');
        throw new Error('No authentication token available. Please try logging out and back in.');
      }

      console.log('JWT token available, calling edge function...');

      // Call the process-email-queue Edge Function with JWT and detailed logging
      const { data, error } = await supabase.functions.invoke('process-email-queue', {
        body: { 
          process_all: true,
          manual_trigger: true // Add flag to distinguish from cron
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Edge function error: ${error.message}`);
      }

      setNotification({
        type: 'success',
        message: `Email queue processed successfully! ${data?.message || 'Check the queue tab for results.'}`
      });
      
      // Refresh the queue to show updated status
      await loadEmailQueue();
    } catch (error: any) {
      console.error('Error processing email queue:', error);
      setNotification({
        type: 'error',
        message: `Failed to process email queue: ${error.message}`
      });
    } finally {
      setQueueLoading(false);
    }
  };

  const flushEmailQueue = async () => {
    setQueueLoading(true);
    try {
      // Get the user's JWT token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      // Send all pending emails in the queue
      const { data, error } = await supabase.functions.invoke('process-email-queue', {
        body: { 
          process_all: true,
          force_send: true // Force send all pending emails
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error flushing email queue:', error);
        setNotification({
          type: 'error',
          message: `Failed to flush queue: ${error.message}`
        });
      } else {
        setNotification({
          type: 'success',
          message: 'Email queue flushed successfully! All pending emails have been sent.'
        });
        // Refresh the queue to show updated status
        await loadEmailQueue();
      }
    } catch (error: any) {
      console.error('Error flushing email queue:', error);
      setNotification({
        type: 'error',
        message: 'Failed to flush email queue. Please try again.'
      });
    } finally {
      setQueueLoading(false);
    }
  };

  const sendPendingEmails = async () => {
    setQueueLoading(true);
    try {
      // Get the user's JWT token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token available');
      }

      // Send only pending emails
      const { data, error } = await supabase.functions.invoke('process-email-queue', {
        body: { 
          process_all: false,
          status_filter: 'pending'
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error sending pending emails:', error);
        setNotification({
          type: 'error',
          message: `Failed to send pending emails: ${error.message}`
        });
      } else {
        setNotification({
          type: 'success',
          message: 'Pending emails sent successfully!'
        });
        // Refresh the queue to show updated status
        await loadEmailQueue();
      }
    } catch (error: any) {
      console.error('Error sending pending emails:', error);
      setNotification({
        type: 'error',
        message: 'Failed to send pending emails. Please try again.'
      });
    } finally {
      setQueueLoading(false);
    }
  };

  const deleteEmailQueue = async () => {
    if (!confirm('Are you sure you want to delete all emails from the queue? This action cannot be undone.')) {
      return;
    }

    setQueueLoading(true);
    try {
      // Delete all emails from queue
      const { error } = await supabase
        .from('email_queue')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) {
        console.error('Error deleting email queue:', error);
        setNotification({
          type: 'error',
          message: `Failed to delete queue: ${error.message}`
        });
      } else {
        setNotification({
          type: 'success',
          message: 'Email queue deleted successfully!'
        });
        // Refresh the queue
        await loadEmailQueue();
      }
    } catch (error: any) {
      console.error('Error deleting email queue:', error);
      setNotification({
        type: 'error',
        message: 'Failed to delete email queue. Please try again.'
      });
    } finally {
      setQueueLoading(false);
    }
  };

  const retryAllFailedEmails = async () => {
    setQueueLoading(true);
    try {
      // Reset all failed emails to pending status
      const { error } = await supabase
        .from('email_queue')
        .update({ 
          status: 'pending',
          attempts: 0,
          error_message: null,
          last_attempt_at: null
        })
        .eq('status', 'failed');

      if (error) {
        console.error('Error retrying failed emails:', error);
        setNotification({
          type: 'error',
          message: `Failed to retry failed emails: ${error.message}`
        });
      } else {
        setNotification({
          type: 'success',
          message: 'Failed emails reset to pending. Click "Process Queue" to send them.'
        });
        // Refresh the queue
        await loadEmailQueue();
      }
    } catch (error: any) {
      console.error('Error retrying failed emails:', error);
      setNotification({
        type: 'error',
        message: 'Failed to retry failed emails. Please try again.'
      });
    } finally {
      setQueueLoading(false);
    }
  };

  const retrySingleEmail = async (emailId: string) => {
    try {
      // Reset single email to pending status
      const { error } = await supabase
        .from('email_queue')
        .update({ 
          status: 'pending',
          attempts: 0,
          error_message: null,
          last_attempt_at: null
        })
        .eq('id', emailId);

      if (error) {
        console.error('Error retrying email:', error);
        setNotification({
          type: 'error',
          message: `Failed to retry email: ${error.message}`
        });
      } else {
        setNotification({
          type: 'success',
          message: 'Email reset to pending. Click "Process Queue" to send it.'
        });
        // Refresh the queue
        await loadEmailQueue();
      }
    } catch (error: any) {
      console.error('Error retrying email:', error);
      setNotification({
        type: 'error',
        message: 'Failed to retry email. Please try again.'
      });
    }
  };

  const handleEditorChange = (content: string) => {
    if (selectedTemplate) {
      setSelectedTemplate({ ...selectedTemplate, body: content });
    }
  };

  const getEditorContent = () => {
    if (editorRef.current) {
      return editorRef.current.getContent();
    }
    return selectedTemplate?.body || '';
  };

  const setEditorContent = (content: string) => {
    if (editorRef.current) {
      editorRef.current.setContent(content);
    }
  };

  // Auto-clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = setTimeout(() => setNotification(null), 5000);
    }
    return () => {
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    };
  }, [notification]);

  // Clear notification when switching tabs
  useEffect(() => {
    setNotification(null);
  }, [activeTab]);

  // Open modal for new or edit
  const openCategoryModal = (cat: EmailTemplateCategory | null = null) => {
    setCategoryToEdit(cat);
    setCategoryForm(cat ? {
      name: cat.name,
      description: cat.description,
      display_order: cat.display_order,
      is_active: cat.is_active
    } : {
      name: '',
      description: '',
      display_order: 1,
      is_active: true
    });
    setCategoryModalOpen(true);
  };

  // Save category (create or update)
  const saveCategory = async () => {
    setCategoryModalLoading(true);
    if (categoryToEdit) {
      // Update
      const { error } = await supabase
        .from('email_template_categories')
        .update({
          name: categoryForm.name,
          description: categoryForm.description,
          display_order: categoryForm.display_order,
          is_active: categoryForm.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', categoryToEdit.id);
      if (!error) {
        setCategories(categories.map(cat => cat.id === categoryToEdit.id ? { ...cat, ...categoryForm } : cat));
        setCategoryModalOpen(false);
      }
    } else {
      // Create
      const { data, error } = await supabase
        .from('email_template_categories')
        .insert({
          name: categoryForm.name,
          description: categoryForm.description,
          display_order: categoryForm.display_order,
          is_active: categoryForm.is_active
        })
        .select();
      if (!error && data && data[0]) {
        setCategories([...categories, data[0]]);
        setCategoryModalOpen(false);
      }
    }
    setCategoryModalLoading(false);
  };

  // Delete category
  const deleteCategory = async () => {
    if (!categoryDeleteConfirm) return;
    const { error } = await supabase
      .from('email_template_categories')
      .delete()
      .eq('id', categoryDeleteConfirm.id);
    if (!error) {
      setCategories(categories.filter(cat => cat.id !== categoryDeleteConfirm.id));
      setCategoryDeleteConfirm(null);
    }
  };

  const renderSMTPTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
          <Settings className="h-5 w-5 text-electric-500" />
          <span>Mailgun Email Configuration</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">From Email Address</label>
            <input
              type="email"
              value={settings.from_email}
              onChange={e => handleInputChange('from_email', e.target.value)}
              className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
              placeholder="noreply@caraudioevents.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">From Name</label>
            <input
              type="text"
              value={settings.from_name}
              onChange={e => handleInputChange('from_name', e.target.value)}
              className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
              placeholder="Car Audio Events"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">Mailgun API Key</label>
            <input
              type="password"
              value={settings.api_key}
              onChange={e => handleInputChange('api_key', e.target.value)}
              className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
              placeholder="Mailgun Private API Key"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{loading ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* Test Email Section */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
          <Send className="h-5 w-5 text-green-500" />
          <span>Test Email Configuration</span>
        </h3>
        
        {/* Notification Display */}
        {notification && (
          <div className={`${
            notification.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          } rounded-lg p-4 flex items-center space-x-2 mb-4`}>
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-auto text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex space-x-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">Test Email Address</label>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="Enter email address to test"
              className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-green-500 focus:ring-green-500/20"
            />
          </div>
          <button
            onClick={handleSendTestEmail}
            disabled={loading || !testEmail}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{loading ? 'Queuing...' : 'Queue Test Email'}</span>
          </button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">
              <p>• Test emails are queued for processing</p>
              <p>• Click "Process Queue" below to send immediately</p>
              <p>• Check the "Email Queue" tab to monitor status</p>
            </div>
            <button
              onClick={processEmailQueue}
              disabled={queueLoading}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {queueLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>{queueLoading ? 'Processing...' : 'Process Queue'}</span>
            </button>
          </div>
        </div>
      </div>

      {saveStatus === 'success' && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <span className="text-green-400">Email settings saved successfully!</span>
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="space-y-6">
      {/* Template List */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white flex items-center space-x-2">
            <FileText className="h-5 w-5 text-electric-500" />
            <span>Email Templates</span>
          </h3>
          <button
            onClick={() => setSelectedTemplate({
              id: '', // Will be generated by database
              name: '',
              subject: '',
              body: '',
              variables: [],
              email_type: 'welcome',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })}
            className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Template</span>
          </button>
        </div>

        {/* Add filter dropdown above the template list */}
        <div className="flex items-center space-x-4 mb-4">
          <label className="text-gray-300 text-sm font-medium">Filter by Category:</label>
          <select
            value={templateCategoryFilter}
            onChange={e => setTemplateCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <label className="flex items-center space-x-2 ml-6">
            <input
              type="checkbox"
              checked={showCategoryDebug}
              onChange={e => setShowCategoryDebug(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-electric-500"
            />
            <span className="text-sm text-gray-300">Show Debug: Loaded Categories</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.filter(template => templateCategoryFilter === 'all' || template.category_id === templateCategoryFilter).map((template) => (
            <div
              key={template.id}
              className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-electric-500/50 transition-colors cursor-pointer"
              onClick={() => setSelectedTemplate(template)}
            >
              <h4 className="font-medium text-white mb-2">{template.name}</h4>
              <p className="text-gray-400 text-sm mb-2">{template.subject}</p>
              <p className="text-gray-500 text-xs">
                Updated: {new Date(template.updated_at).toLocaleDateString()}
              </p>
              {template.category_id && (
                <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400 ml-2">
                  {categories.find(cat => cat.id === template.category_id)?.name}
                </span>
              )}
              <div className="flex items-center space-x-2 mt-2">
                <span className={`text-xs px-2 py-1 rounded ${template.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{template.is_active ? 'Active' : 'Inactive'}</span>
                <label className="flex items-center space-x-1 text-xs">
                  <input
                    type="checkbox"
                    checked={template.is_active}
                    onChange={async (e) => {
                      if (e.target.checked) {
                        // Deactivate all other templates with same name/category
                        const { data, error } = await supabase
                          .from('email_templates')
                          .update({ is_active: false })
                          .eq('name', template.name)
                          .eq('category_id', template.category_id)
                          .neq('id', template.id);
                        // Activate this template
                        await supabase
                          .from('email_templates')
                          .update({ is_active: true })
                          .eq('id', template.id);
                        // Update local state
                        setTemplates(templates.map(t => t.id === template.id ? { ...t, is_active: true } : (t.name === template.name && t.category_id === template.category_id ? { ...t, is_active: false } : t)));
                      } else {
                        // Just deactivate this template
                        await supabase
                          .from('email_templates')
                          .update({ is_active: false })
                          .eq('id', template.id);
                        setTemplates(templates.map(t => t.id === template.id ? { ...t, is_active: false } : t));
                      }
                    }}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                  />
                  <span>{template.is_active ? 'On' : 'Off'}</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Template Editor */}
      {selectedTemplate && (
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-white flex items-center space-x-2">
              <FileText className="h-5 w-5 text-electric-500" />
              <span>{selectedTemplate.id ? 'Edit Template' : 'New Template'}</span>
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => handleSaveTemplate(selectedTemplate)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>
              {selectedTemplate.id && (
                <button
                  onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              )}
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template Form */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Template Name</label>
                <input
                  type="text"
                  value={selectedTemplate.name}
                  onChange={e => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                  placeholder="Welcome Email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Subject Line</label>
                <input
                  type="text"
                  value={selectedTemplate.subject}
                  onChange={e => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                  placeholder="Welcome to {{site_name}}!"
                />
              </div>
              {/* Category Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select
                  value={selectedTemplate.category_id || ''}
                  onChange={e => setSelectedTemplate({ ...selectedTemplate, category_id: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                >
                  <option value="">Select a category...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name} - {category.description}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Body</label>
                <div className="mb-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={useRichEditor}
                      onChange={e => setUseRichEditor(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500 focus:ring-offset-gray-800"
                    />
                    <span className="text-sm text-gray-300">Use Rich Text Editor</span>
                  </label>
                  {useRichEditor && (
                    <div className="mt-2 ml-6">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={useTinyMCE}
                          onChange={e => setUseTinyMCE(e.target.checked)}
                          className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500 focus:ring-offset-gray-800"
                        />
                        <span className="text-sm text-gray-300">Use TinyMCE (Advanced)</span>
                      </label>
                    </div>
                  )}
                </div>
                
                {useRichEditor ? (
                  useTinyMCE ? (
                    <div className="space-y-2">
                      <div className="flex space-x-2 mb-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedTemplate) {
                              const currentBody = selectedTemplate.body;
                              const newBody = defaultEmailHeader + currentBody;
                              setSelectedTemplate({ ...selectedTemplate, body: newBody });
                            }
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                        >
                          Insert Header
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedTemplate) {
                              const currentBody = selectedTemplate.body;
                              const newBody = currentBody + defaultEmailFooter;
                              setSelectedTemplate({ ...selectedTemplate, body: newBody });
                            }
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                        >
                          Insert Footer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedTemplate) {
                              const newBody = defaultEmailHeader + '<div style="padding: 20px; background: #ffffff; color: #333333;">' + 
                                '<p>Your email content goes here...</p>' +
                                '<p>You can use variables like {{user_name}}, {{event_name}}, etc.</p>' +
                                '</div>' + defaultEmailFooter;
                              setSelectedTemplate({ ...selectedTemplate, body: newBody });
                            }
                          }}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                        >
                          Insert Full Template
                        </button>
                      </div>
                      <Editor
                        tinymceScriptSrc={`https://cdn.tiny.cloud/1/${import.meta.env.VITE_TINYMCE_API_KEY}/tinymce/6/tinymce.min.js`}
                        onInit={(evt, editor) => editorRef.current = editor}
                        value={selectedTemplate.body}
                        onEditorChange={handleEditorChange}
                        init={{
                          height: 500,
                          menubar: true,
                          suffix: '.min',
                          plugins: [
                            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
                            'emoticons', 'nonbreaking', 'directionality', 'visualchars',
                            'pagebreak', 'quickbars', 'save'
                          ],
                          toolbar: 'undo redo | formatselect | bold italic underline strikethrough | ' +
                            'forecolor backcolor | alignleft aligncenter alignright alignjustify | ' +
                            'bullist numlist outdent indent | link image media table | ' +
                            'removeformat | fullscreen preview | help',
                          content_style: `body { font-family:Helvetica,Arial,sans-serif; font-size:14px; background-color: #374151; color: #fff; } h1, .email-header-title { color: #3b82f6 !important; }`,
                          images_upload_url: '/api/upload-image',
                          images_upload_handler: (blobInfo, progress) => {
                            return new Promise((resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () => resolve(reader.result as string);
                              reader.onerror = reject;
                              reader.readAsDataURL(blobInfo.blob());
                            });
                          },
                          file_picker_types: 'image',
                          file_picker_callback: (callback, value, meta) => {
                            const input = document.createElement('input');
                            input.setAttribute('type', 'file');
                            input.setAttribute('accept', 'image/*');
                            input.onchange = () => {
                              const file = input.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  callback(reader.result as string, { title: file.name });
                                };
                                reader.readAsDataURL(file);
                              }
                            };
                            input.click();
                          },
                          paste_data_images: true,
                          convert_urls: false,
                          relative_urls: false,
                          extended_valid_elements: 'img[src|alt|title|width|height|style],a[href|target|title],table[border|cellpadding|cellspacing|width|style],tr,td,th[colspan|rowspan|style],p[style],div[style],span[style],br,hr,h1,h2,h3,h4,h5,h6,ul,ol,li,strong,em,u,strike,code,pre,blockquote',
                          invalid_elements: 'script,iframe,object,embed,form,input,textarea,select,button',
                          browser_spellcheck: true,
                          contextmenu: 'link image table configurepermanentpen',
                          auto_save: true,
                          auto_save_interval: '30s',
                          wordcount: true,
                          charcount: true,
                          lineheight_formats: '8pt 10pt 12pt 14pt 16pt 18pt 24pt 36pt',
                          font_size_formats: '8pt 10pt 12pt 14pt 16pt 18pt 24pt 36pt',
                          font_family_formats: 'Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Symbol=symbol; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva; Webdings=webdings; Wingdings=wingdings,zapf dingbats',
                          license_key: 'gpl',
                          branding: false,
                          promotion: false,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="border border-gray-600 rounded-lg bg-gray-700/50">
                      <div className="bg-gray-600/50 p-2 border-b border-gray-600 flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => document.execCommand('bold')}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                          title="Bold"
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand('italic')}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm italic"
                          title="Italic"
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand('underline')}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm underline"
                          title="Underline"
                        >
                          U
                        </button>
                        <div className="w-px h-6 bg-gray-500"></div>
                        <button
                          type="button"
                          onClick={() => document.execCommand('insertUnorderedList')}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                          title="Bullet List"
                        >
                          •
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand('insertOrderedList')}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                          title="Numbered List"
                        >
                          1.
                        </button>
                        <div className="w-px h-6 bg-gray-500"></div>
                        <button
                          type="button"
                          onClick={() => document.execCommand('justifyLeft')}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                          title="Align Left"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand('justifyCenter')}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                          title="Align Center"
                        >
                          ↔
                        </button>
                        <button
                          type="button"
                          onClick={() => document.execCommand('justifyRight')}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
                          title="Align Right"
                        >
                          →
                        </button>
                      </div>
                      <div
                        contentEditable
                        onInput={(e) => {
                          const content = e.currentTarget.innerHTML;
                          if (selectedTemplate) {
                            setSelectedTemplate({ ...selectedTemplate, body: content });
                          }
                        }}
                        dangerouslySetInnerHTML={{ __html: selectedTemplate?.body || '' }}
                        className="p-3 min-h-[400px] text-white focus:outline-none focus:ring-2 focus:ring-electric-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                        style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '14px' }}
                      />
                    </div>
                  )
                ) : (
                  <textarea
                    id="template-body"
                    value={selectedTemplate.body}
                    onChange={e => setSelectedTemplate({ ...selectedTemplate, body: e.target.value })}
                    rows={15}
                    className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20 font-mono text-sm"
                    placeholder="Hello {{user_name}},

Welcome to {{site_name}}! We're excited to have you on board.

Your account details:
- Email: {{user_email}}
- Member since: {{user_join_date}}

Best regards,
The {{organization_name}} Team"
                  />
                )}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedTemplate.is_active}
                  onChange={e => setSelectedTemplate({ ...selectedTemplate, is_active: e.target.checked })}
                  className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                />
                <span className="text-gray-300">Template is active</span>
              </div>
            </div>

            {/* Variables Panel */}
            <div className="space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center space-x-2">
                  <Code className="h-4 w-4 text-electric-500" />
                  <span>Email Variables ({filteredVariables.length})</span>
                </h4>
                
                {/* Search */}
                <div className="mb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={variableSearch}
                      onChange={e => setVariableSearch(e.target.value)}
                      placeholder="Search variables..."
                      className="w-full pl-10 pr-3 py-2 bg-gray-600/50 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-electric-500 focus:ring-electric-500/20 text-sm"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="mb-3">
                  <select
                    value={selectedVariableCategory}
                    onChange={e => setSelectedVariableCategory(e.target.value)}
                    className="w-full p-2 bg-gray-600/50 border border-gray-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:border-electric-500 focus:ring-electric-500/20 text-sm"
                  >
                    {variableCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name} ({category.count})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variables List */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredVariables.map((variable) => (
                    <div
                      key={variable.name}
                      className="bg-gray-600/30 rounded-lg p-3 border border-gray-500/50 hover:border-electric-500/50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <code className="text-electric-400 text-sm font-mono break-all">{variable.name}</code>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => insertVariable(variable.name)}
                            className="p-1 text-gray-400 hover:text-electric-400 transition-colors"
                            title="Insert into template"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => copyVariable(variable.name)}
                            className="p-1 text-gray-400 hover:text-electric-400 transition-colors"
                            title="Copy to clipboard"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-300 text-xs mb-1">{variable.description}</p>
                      <p className="text-gray-500 text-xs">Example: {variable.example}</p>
                    </div>
                  ))}
                </div>

                {filteredVariables.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    No variables found matching your search.
                  </div>
                )}
              </div>

              {/* Quick Help */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2 flex items-center space-x-2">
                  <HelpCircle className="h-4 w-4" />
                  <span>Quick Tips</span>
                </h4>
                <ul className="text-blue-300 text-xs space-y-1">
                  <li>• Click the + icon to insert variables into your template</li>
                  <li>• Use the copy icon to copy variable names to clipboard</li>
                  <li>• Variables are automatically replaced when emails are sent</li>
                  <li>• Test your templates with the preview feature</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      {showCategoryDebug && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 my-4">
          <h4 className="text-yellow-400 font-medium mb-2">Debug: Loaded Categories ({categories.length})</h4>
          {categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {categories.map(category => (
                <div key={category.id} className="bg-gray-700/30 p-2 rounded">
                  <div className="text-white font-medium">{category.name}</div>
                  <div className="text-gray-400">{category.description}</div>
                  <div className="text-gray-500 text-xs">ID: {category.id}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300">No categories loaded. Check database connection.</p>
          )}
        </div>
      )}
    </div>
  );

  const renderQueueTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white flex items-center space-x-2">
            <Clock className="h-5 w-5 text-electric-500" />
            <span>Email Queue Management</span>
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => loadEmailQueue()}
              disabled={queueLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${queueLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={processEmailQueue}
              disabled={queueLoading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 flex items-center space-x-2"
            >
              {queueLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span>{queueLoading ? 'Processing...' : 'Process Queue'}</span>
            </button>
            <select
              value={queueFilter}
              onChange={e => setQueueFilter(e.target.value as any)}
              className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:border-electric-500 focus:ring-electric-500/20"
            >
              <option value="all">All Emails</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="sent">Sent</option>
            </select>
          </div>
        </div>



        <div className="space-y-4">
          {emailQueue
            .filter(item => queueFilter === 'all' || item.status === queueFilter)
            .map((email) => (
              <div key={email.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-white">{email.subject}</h4>
                    <p className="text-gray-400 text-sm">{email.recipient}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      email.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                      email.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                      email.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {email.status}
                    </span>
                    <div className="flex space-x-1">
                      {email.status === 'failed' && (
                        <button
                          onClick={() => retrySingleEmail(email.id)}
                          className="p-1 text-yellow-400 hover:text-yellow-300 transition-colors"
                          title="Retry this email"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      {email.status === 'pending' && (
                        <button
                          onClick={() => cancelEmail(email.id)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          title="Cancel email"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-gray-500 text-xs space-y-1">
                  <p>Attempts: {email.attempts}</p>
                  <p>Created: {new Date(email.created_at).toLocaleString()}</p>
                  {email.last_attempt_at && <p>Last Attempt: {new Date(email.last_attempt_at).toLocaleString()}</p>}
                  {email.error_message && (
                    <p className="text-red-400">Error: {email.error_message}</p>
                  )}
                </div>
              </div>
            ))}
          
          {emailQueue.filter(item => queueFilter === 'all' || item.status === queueFilter).length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No emails found in queue</p>
            </div>
          )}
        </div>

        {emailQueue.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                <p>Total: {emailQueue.length} emails</p>
                <p>Pending: {emailQueue.filter(e => e.status === 'pending').length} | 
                   Failed: {emailQueue.filter(e => e.status === 'failed').length} | 
                   Sent: {emailQueue.filter(e => e.status === 'sent').length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPreviewTab = () => (
    <div className="space-y-6">
      {/* Notification Display */}
      {notification && (
        <div className={`${
          notification.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        } rounded-lg p-4 flex items-center space-x-2`}>
          {notification.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-auto text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white flex items-center space-x-2">
            <EyeIcon className="h-5 w-5 text-electric-500" />
            <span>Email Preview & Testing</span>
          </h3>
          <div className="flex space-x-2">
            <select
              value={previewMode}
              onChange={e => setPreviewMode(e.target.value as any)}
              className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:border-electric-500 focus:ring-electric-500/20"
            >
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="text">Text Only</option>
            </select>
            <div className="flex space-x-2">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="Enter test email address"
                className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-electric-500 focus:ring-electric-500/20"
              />
              <button
                onClick={() => handleSendTestEmail()}
                disabled={loading || !testEmail}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{loading ? 'Sending...' : 'Send Test'}</span>
              </button>
            </div>
          </div>
        </div>

        {selectedTemplate ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preview Data Configuration */}
            <div className="space-y-4">
              <h4 className="text-white font-medium">Preview Data</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">User Name</label>
                  <input
                    type="text"
                    value={previewData.user_name}
                    onChange={e => setPreviewData({ ...previewData, user_name: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">User Email</label>
                  <input
                    type="email"
                    value={previewData.user_email}
                    onChange={e => setPreviewData({ ...previewData, user_email: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Event Name</label>
                  <input
                    type="text"
                    value={previewData.event_name}
                    onChange={e => setPreviewData({ ...previewData, event_name: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Event Date</label>
                  <input
                    type="text"
                    value={previewData.event_date}
                    onChange={e => setPreviewData({ ...previewData, event_date: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Payment Amount</label>
                  <input
                    type="text"
                    value={previewData.payment_amount}
                    onChange={e => setPreviewData({ ...previewData, payment_amount: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Invoice ID</label>
                  <input
                    type="text"
                    value={previewData.invoice_id}
                    onChange={e => setPreviewData({ ...previewData, invoice_id: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:border-electric-500 focus:ring-electric-500/20"
                  />
                </div>
              </div>
            </div>

            {/* Email Preview */}
            <div className="space-y-4">
              <h4 className="text-white font-medium">Email Preview</h4>
              <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${
                previewMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
              }`}>
                <div className="bg-gray-100 p-3 border-b">
                  <div className="text-sm text-gray-600">
                    <strong>To:</strong> {previewData.user_email}<br />
                    <strong>Subject:</strong> {replaceAllEmailVariables(selectedTemplate.subject, previewData)}
                  </div>
                </div>
                <div className="p-4">
                  <div 
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: createFullEmailTemplate(replaceAllEmailVariables(selectedTemplate.body, previewData))
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <EyeIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a template to preview</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderCategoriesTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">Manage Email Template Categories</h2>
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">Categories</h3>
          <button className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600" onClick={() => openCategoryModal(null)}>+ New Category</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.length === 0 ? (
            <div className="text-gray-400">No categories found.</div>
          ) : (
            categories.map(category => (
              <div key={category.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white font-bold">{category.name}</div>
                    <div className="text-gray-400 text-sm">{category.description}</div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs" onClick={() => openCategoryModal(category)}>Edit</button>
                    <button className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs" onClick={() => setCategoryDeleteConfirm(category)}>Delete</button>
                  </div>
                </div>
                <div className="text-xs text-gray-400">Order: {category.display_order} | Active: {category.is_active ? 'Yes' : 'No'}</div>
              </div>
            ))
          )}
        </div>
      </div>
      {categoryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">{categoryToEdit ? 'Edit Category' : 'New Category'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input type="text" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} className="w-full p-3 bg-gray-700/50 border rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <input type="text" value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} className="w-full p-3 bg-gray-700/50 border rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Display Order</label>
                <input type="number" value={categoryForm.display_order} onChange={e => setCategoryForm({ ...categoryForm, display_order: Number(e.target.value) })} className="w-full p-3 bg-gray-700/50 border rounded-lg text-white" />
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={categoryForm.is_active} onChange={e => setCategoryForm({ ...categoryForm, is_active: e.target.checked })} className="rounded border-gray-600 bg-gray-700 text-electric-500" />
                <span className="text-sm text-gray-300">Active</span>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setCategoryModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Cancel</button>
              <button onClick={saveCategory} disabled={categoryModalLoading} className="px-4 py-2 bg-electric-500 text-white rounded hover:bg-electric-600 disabled:opacity-50">{categoryModalLoading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      {categoryDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Delete Category</h3>
            <p className="text-gray-300 mb-6">Are you sure you want to delete the category <span className="text-orange-400 font-bold">{categoryDeleteConfirm.name}</span>? This cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setCategoryDeleteConfirm(null)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Cancel</button>
              <button onClick={deleteCategory} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Enhanced variable replacement function that handles all email variables
  const replaceAllEmailVariables = (content: string, previewData: EmailPreviewData): string => {
    let result = content;
    
    // Create comprehensive variable mapping
    const variableMap: Record<string, string> = {
      // System variables
      '{{site_name}}': previewData.organization_name || 'Car Audio Events',
      '{{site_url}}': 'https://caraudioevents.com',
      '{{admin_email}}': 'admin@caraudioevents.com',
      '{{support_email}}': 'support@caraudioevents.com',
      '{{current_date}}': new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      
      // User variables - map all variations
      '{{user_name}}': previewData.user_name || 'User',
      '{{user_first_name}}': previewData.user_name?.split(' ')[0] || 'User',
      '{{user_last_name}}': previewData.user_name?.split(' ')[1] || '',
      '{{user_email}}': previewData.user_email || 'user@example.com',
      '{{firstName}}': previewData.user_name?.split(' ')[0] || 'User',
      '{{lastName}}': previewData.user_name?.split(' ')[1] || '',
      '{{fullName}}': previewData.user_name || 'User',
      '{{email}}': previewData.user_email || 'user@example.com',
      
      // Event variables
      '{{event_name}}': previewData.event_name || 'Car Audio Event',
      '{{event_date}}': previewData.event_date || new Date().toLocaleDateString(),
      '{{event_location}}': previewData.event_location || 'Event Location',
      '{{eventName}}': previewData.event_name || 'Car Audio Event',
      '{{eventDate}}': previewData.event_date || new Date().toLocaleDateString(),
      '{{eventLocation}}': previewData.event_location || 'Event Location',
      
      // Organization variables
      '{{organization_name}}': previewData.organization_name || 'Car Audio Events',
      '{{companyName}}': previewData.organization_name || 'Car Audio Events',
      '{{companyEmail}}': 'info@caraudioevents.com',
      '{{companyWebsite}}': 'https://caraudioevents.com',
      
      // Payment variables
      '{{payment_amount}}': previewData.payment_amount || '$99.99',
      '{{paymentAmount}}': previewData.payment_amount || '$99.99',
      '{{invoice_id}}': previewData.invoice_id || 'INV-2025-001',
      '{{invoiceNumber}}': previewData.invoice_id || 'INV-2025-001',
      
      // Competition variables
      '{{competition_name}}': previewData.competition_name || 'Bass Battle 2024',
      '{{competition_score}}': previewData.competition_score || '145.2 dB',
      
      // System URLs
      '{{login_url}}': 'https://caraudioevents.com/login',
      '{{login_link}}': 'https://caraudioevents.com/login',
      '{{dashboard_url}}': 'https://caraudioevents.com/dashboard',
      '{{support_url}}': 'https://caraudioevents.com/support',
      '{{loginUrl}}': 'https://caraudioevents.com/login',
      '{{dashboardUrl}}': 'https://caraudioevents.com/dashboard',
      '{{supportUrl}}': 'https://caraudioevents.com/support',
      '{{websiteUrl}}': 'https://caraudioevents.com',
      
      // Date variables
      '{{currentDate}}': new Date().toLocaleDateString(),
      '{{currentYear}}': new Date().getFullYear().toString(),
      '{{year}}': new Date().getFullYear().toString(),
      '{{today}}': new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    };
    
    // Use simple string replacement instead of regex - much more reliable
    Object.entries(variableMap).forEach(([variable, value]) => {
      result = result.split(variable).join(value);
    });
    
    return result;
  };

  // Email template wrapper function - prevents duplication
  const createFullEmailTemplate = (bodyContent: string): string => {
    // Check if content already has header/footer to prevent duplication
    const hasHeader = bodyContent.includes('Car Audio Events</h1>') || bodyContent.includes('CAE_Logo_V2-email-logo.png');
    const hasFooter = bodyContent.includes('© 2025 Car Audio Events. All rights reserved.');
    
    // If already has both header and footer, return as-is
    if (hasHeader && hasFooter) {
      return bodyContent;
    }
    
    // If has header but no footer, just add footer
    if (hasHeader && !hasFooter) {
      return bodyContent + defaultEmailFooter;
    }
    
    // If has footer but no header, just add header
    if (!hasHeader && hasFooter) {
      return defaultEmailHeader + bodyContent;
    }
    
    // If has neither, add both
    return defaultEmailHeader + bodyContent + defaultEmailFooter;
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('smtp')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'smtp'
                ? 'border-electric-500 text-electric-500'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            Mailgun Email Configuration
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-electric-500 text-electric-500'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            Email Templates
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'queue'
                ? 'border-electric-500 text-electric-500'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            Email Queue
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preview'
                ? 'border-electric-500 text-electric-500'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            Email Preview
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-electric-500 text-electric-500'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            Categories
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'smtp' && renderSMTPTab()}
      {activeTab === 'templates' && renderTemplatesTab()}
      {activeTab === 'queue' && renderQueueTab()}
      {activeTab === 'preview' && renderPreviewTab()}
      {activeTab === 'categories' && renderCategoriesTab()}
    </div>
  );
}; 