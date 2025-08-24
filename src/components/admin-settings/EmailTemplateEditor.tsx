import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  FileText, Plus, Search, Filter, Edit, Save, X, 
  CheckCircle, XCircle, AlertCircle, Copy, Code,
  Eye, EyeOff, Info, ChevronDown, ChevronUp, Trash2,
  Settings, Bug, Mail, CheckCircle2, Clock, Shield, Palette
} from 'lucide-react';
import { useNotifications } from '../NotificationSystem';
import { Editor } from '@tinymce/tinymce-react';
import { TINYMCE_API_KEY, getTinyMCEScriptUrl } from '../../config/tinymce';
import { 
  wrapEmailTemplate, 
  EMAIL_TEMPLATE_HEADER, 
  EMAIL_TEMPLATE_FOOTER,
  EMAIL_TEMPLATE_STYLES,
  EMAIL_COMPONENTS 
} from '../../utils/emailTemplateWrapper';
import { wrapEmailTemplateOutlook } from '../../utils/emailTemplateWrapperOutlook';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category?: string;
  category_id?: string;
  body: string;  // The actual column in the database with HTML content
  html_body?: string;  // Alternate column name (not used in this DB)
  html_content?: string;  // For compatibility
  variables: any; // JSONB in database
  is_active: boolean;
  is_system?: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface EmailProvider {
  id: string;
  provider_type: 'postmark' | 'sendgrid' | 'smtp';
  is_active: boolean;
  is_primary: boolean;
  api_key_set?: boolean;
  credentials_valid?: boolean;
  last_tested?: string;
  status?: 'ready' | 'disabled' | 'not-configured' | 'error';
}

const TEMPLATE_CATEGORIES = {
  'account': {
    name: 'Account Management',
    icon: '👤',
    templates: [
      'Account Created Successfully',
      'Account Approved',
      'Account Membership Approved',
      'Account Reactivation',
      'Password Reset',
      'Email Verification'
    ]
  },
  'membership': {
    name: 'Membership',
    icon: '⭐',
    templates: [
      'Admin Membership Welcome',
      'Free Membership Welcome',
      'Pro Membership Welcome',
      'Membership Benefits Overview',
      'Pro Account Upgrade',
      'Membership Expiring',
      'Membership Expired'
    ]
  },
  'event': {
    name: 'Events',
    icon: '📅',
    templates: [
      'Event Registration Confirmation',
      'Event Reminder',
      'Event Cancelled',
      'Event Updated',
      'Event Results'
    ]
  },
  'billing': {
    name: 'Billing & Payments',
    icon: '💳',
    templates: [
      'Payment Receipt',
      'Payment Failed',
      'Subscription Renewed',
      'Invoice',
      'Refund Processed'
    ]
  },
  'notification': {
    name: 'Notifications',
    icon: '🔔',
    templates: [
      'Welcome Email',
      'System Announcement',
      'Newsletter',
      'Promotional Offer'
    ]
  }
};

// Note: Email templates are now wrapped automatically by the edge functions
// with the new light theme (white background, gradient header)
// Do not add header/footer HTML to templates directly

const TEMPLATE_VARIABLES = {
  user: [
    { key: '{{user_name}}', description: 'User full name' },
    { key: '{{user_email}}', description: 'User email address' },
    { key: '{{user_first_name}}', description: 'User first name' },
    { key: '{{user_last_name}}', description: 'User last name' },
    { key: '{{user_membership_type}}', description: 'User membership level' },
    { key: '{{user_phone}}', description: 'User phone number' },
    { key: '{{user_location}}', description: 'User location/city' },
    { key: '{{user_join_date}}', description: 'User registration date' },
    { key: '{{user_profile_url}}', description: 'User profile page URL' }
  ],
  event: [
    { key: '{{event_name}}', description: 'Event name' },
    { key: '{{event_date}}', description: 'Event date' },
    { key: '{{event_time}}', description: 'Event time' },
    { key: '{{event_location}}', description: 'Event location' },
    { key: '{{event_address}}', description: 'Event full address' },
    { key: '{{event_description}}', description: 'Event description' },
    { key: '{{event_url}}', description: 'Event page URL' },
    { key: '{{event_price}}', description: 'Event ticket price' },
    { key: '{{event_capacity}}', description: 'Event capacity' }
  ],
  payment: [
    { key: '{{payment_amount}}', description: 'Payment amount' },
    { key: '{{payment_currency}}', description: 'Payment currency' },
    { key: '{{payment_date}}', description: 'Payment date' },
    { key: '{{payment_method}}', description: 'Payment method' },
    { key: '{{invoice_id}}', description: 'Invoice number' },
    { key: '{{transaction_id}}', description: 'Transaction ID' }
  ],
  system: [
    { key: '{{site_name}}', description: 'Site name (Car Audio Events)' },
    { key: '{{site_url}}', description: 'Site URL' },
    { key: '{{support_email}}', description: 'Support email' },
    { key: '{{admin_email}}', description: 'Admin contact email' },
    { key: '{{current_date}}', description: 'Current date' },
    { key: '{{current_year}}', description: 'Current year' },
    { key: '{{unsubscribe_link}}', description: 'Unsubscribe link' }
  ],
  organization: [
    { key: '{{organization_name}}', description: 'Organization name' },
    { key: '{{organization_email}}', description: 'Organization contact email' },
    { key: '{{organization_phone}}', description: 'Organization phone' },
    { key: '{{organization_website}}', description: 'Organization website' },
    { key: '{{organization_address}}', description: 'Organization address' }
  ],
  competition: [
    { key: '{{competition_name}}', description: 'Competition name' },
    { key: '{{competition_score}}', description: 'Competition score' },
    { key: '{{competition_rank}}', description: 'Competition rank' },
    { key: '{{competition_date}}', description: 'Competition date' }
  ]
};

// Map category UUIDs to human-readable names
const CATEGORY_NAMES: Record<string, string> = {
  '65ed6546-ee47-4399-965a-00ee1199a399': 'Account Management',
  'aaef414b-d2d1-4e31-805a-5f73da23b398': 'Approvals',
  '786f4036-36b8-412b-9909-49ded6e884e2': 'Account Setup',
  '47061ca6-53b1-4520-ac0f-42a5f8fb7565': 'Membership',
  'e1748322-400d-4c45-ba37-f11ff162c162': 'Events',
  '39f89f28-8c9e-4d39-8711-f324a27178cf': 'Achievements',
  '46929f08-77f1-4561-ac13-5ef11543b74f': 'Competition',
  '8e852caf-11d4-4b3b-b8fe-dcf725a9795b': 'Reminders',
  '28ffc7e1-5f4c-44ae-98e1-a91f80193068': 'Promotions',
  '03b1a1b2-5f56-4ae1-a2c7-7610c14f00e6': 'Announcements',
  'e13c52f3-6769-4ea5-94ed-b0938502b873': 'Billing & Invoices',
  '343785f0-bfe2-4321-86c6-2630382720cb': 'Judge Applications',
  '2a488cf9-42a0-49f1-958e-9b3896e1a8c3': 'Verification',
  'a36450fe-8df6-48a7-af93-975d26d75377': 'Subscriptions',
  '279058eb-fdaf-4550-b304-024fa31be7f7': 'Newsletter',
  'b933fdaf-b749-4d0d-9699-e2886995e667': 'Password Security',
  'cc3ef004-45ec-4f74-9f4a-287cf16f66fd': 'Support',
  'f6a687e1-c521-43df-9065-c95031551edb': 'System Updates',
  '510e1891-901b-45ed-881e-5e2638f0ba37': 'Welcome',
  'uncategorized': 'Uncategorized'
};

export const EmailTemplateEditor: React.FC = () => {
  const { showSuccess, showError, showInfo } = useNotifications();
  const editorRef = useRef<any>(null);
  
  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<EmailProvider[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');  // Start with visual mode (TinyMCE)
  const [showVariables, setShowVariables] = useState(true);
  const [editorReady, setEditorReady] = useState(false);
  
  // Template form
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    category: '',
    body: '',
    html_content: '',
    is_active: true,
    description: ''
  });


  useEffect(() => {
    loadProviders();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      // The database uses 'body' column for the HTML content
      const content = selectedTemplate.body || selectedTemplate.html_body || selectedTemplate.html_content || '';
      console.log('Loading template:', selectedTemplate.name, 'Content length:', content.length);
      console.log('Content preview:', content.substring(0, 100));
      
      setTemplateForm({
        name: selectedTemplate.name,
        subject: selectedTemplate.subject,
        category: selectedTemplate.category || selectedTemplate.category_id || '',
        body: content,
        html_content: content,
        is_active: selectedTemplate.is_active,
        description: selectedTemplate.description || ''
      });
      
      // If TinyMCE editor is ready, update its content
      if (editorRef.current && editorMode === 'visual') {
        editorRef.current.setContent(content);
      }
    }
  }, [selectedTemplate, editorMode]);

  const loadProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('email_providers')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      
      // Check provider status
      const providersWithStatus = await Promise.all((data || []).map(async (provider) => {
        let status: 'ready' | 'disabled' | 'not-configured' | 'error' = 'not-configured';
        let api_key_set = false;
        let credentials_valid = false;
        
        // Check if API keys are set in Supabase secrets
        if (provider.provider_type === 'postmark') {
          // Check for POSTMARK_API_KEY in edge function environment
          api_key_set = true; // We assume it's set if the provider exists
          credentials_valid = provider.is_active;
          status = provider.is_active ? 'ready' : 'disabled';
        } else if (provider.provider_type === 'sendgrid') {
          api_key_set = true; // We assume it's set if the provider exists
          credentials_valid = provider.is_active;
          status = provider.is_active ? 'ready' : 'disabled';
        } else if (provider.provider_type === 'smtp') {
          api_key_set = true; // We assume it's set if the provider exists
          credentials_valid = provider.is_active;
          status = provider.is_active ? 'ready' : 'disabled';
        }
        
        return {
          ...provider,
          api_key_set,
          credentials_valid,
          status
        };
      }));
      
      setProviders(providersWithStatus);
    } catch (error) {
      console.error('Error loading providers:', error);
      showError('Failed to load email providers');
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      showError('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const extractCleanContent = (html: string): string => {
    // If the content has our wrapper structure, extract just the inner content
    if (html.includes('email-wrapper') || html.includes('email-container') || html.includes('<!DOCTYPE')) {
      // Try to extract content between email-body divs
      const bodyMatch = html.match(/<div class="email-body">\s*<div class="email-content">([\s\S]*?)<\/div>\s*<\/div>/i);
      if (bodyMatch) {
        return bodyMatch[1].trim();
      }
      
      // Try to extract content from table structure
      const tableMatch = html.match(/<td[^>]*bgcolor="#ffffff"[^>]*>\s*<table[^>]*>\s*<tr>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>\s*<\/table>/i);
      if (tableMatch) {
        return tableMatch[1].trim();
      }
      
      // Try to extract content between specific markers
      const contentMatch = html.match(/<!-- Content area -->([\s\S]*?)<!-- Footer|<div class="email-footer/i);
      if (contentMatch) {
        // Clean up the extracted content
        let cleanContent = contentMatch[1];
        cleanContent = cleanContent.replace(/<tr>\s*<td[^>]*>/gi, '');
        cleanContent = cleanContent.replace(/<\/td>\s*<\/tr>/gi, '');
        cleanContent = cleanContent.replace(/<table[^>]*>/gi, '');
        cleanContent = cleanContent.replace(/<\/table>/gi, '');
        return cleanContent.trim();
      }
    }
    
    // Content is already clean, return as-is
    return html;
  };

  const saveTemplate = async () => {
    try {
      setSaving(true);
      
      if (!templateForm.name || !templateForm.subject) {
        showError('Please fill in all required fields');
        return;
      }
      
      let content = templateForm.html_content || templateForm.body || '';
      
      // CRITICAL: Extract clean content without wrapper before saving
      content = extractCleanContent(content);
      
      const extractedVariables = extractVariables(content);
      
      // Save to 'body' which is the actual database column being used
      const templateData = {
        name: templateForm.name,
        subject: templateForm.subject,
        category: templateForm.category || null,
        category_id: templateForm.category || null,  // Also save to category_id for consistency
        body: content,  // Save CLEAN content to the 'body' column
        variables: extractedVariables.length > 0 ? extractedVariables : [],
        is_active: templateForm.is_active,
        description: templateForm.description || null,
        updated_at: new Date().toISOString()
      };
      
      console.log('Saving template with content length:', content.length);
      console.log('Template data:', { ...templateData, body: content.substring(0, 100) + '...' });
      
      if (selectedTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id);
        
        if (error) throw error;
        showSuccess('Template updated successfully');
      } else {
        // Create new template
        const { error } = await supabase
          .from('email_templates')
          .insert([{
            ...templateData,
            created_at: new Date().toISOString()
          }]);
        
        if (error) throw error;
        showSuccess('Template created successfully');
      }
      
      loadTemplates();
      setSelectedTemplate(null);
      setShowCreateNew(false);
    } catch (error) {
      console.error('Error saving template:', error);
      showError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId);
      
      if (error) throw error;
      
      showSuccess('Template deleted successfully');
      loadTemplates();
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      showError('Failed to delete template');
    }
  };

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.match(regex) || [];
    return [...new Set(matches)];
  };

  const insertVariable = (variable: string) => {
    if (editorMode === 'visual' && editorRef.current) {
      editorRef.current.insertContent(variable);
    } else {
      // For code mode, insert at cursor position or append
      const currentContent = templateForm.html_content || templateForm.body || '';
      const newContent = currentContent + variable;
      setTemplateForm({ 
        ...templateForm, 
        html_content: newContent, 
        body: newContent 
      });
    }
    showInfo(`Inserted ${variable}`);
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    showInfo(`Copied ${variable} to clipboard`);
  };

  const insertSampleContent = () => {
    // Insert sample BODY content only (no headers/footers)
    const sampleContent = `
<h2 style="color: #333;">Welcome to Car Audio Events!</h2>
<p style="color: #555;">Hi {{user_first_name}},</p>
<p style="color: #555;">Thank you for joining the Car Audio Events platform. We're excited to have you as part of our community!</p>

<div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
  <h3 style="color: #333; margin-top: 0;">Your Account Details</h3>
  <p style="color: #555; margin-bottom: 0;">Your account has been created with the email: <strong>{{user_email}}</strong></p>
</div>

<p style="color: #555;">Here's what you can do next:</p>
<ul style="color: #555;">
  <li>Complete your profile</li>
  <li>Browse upcoming events</li>
  <li>Connect with other car audio enthusiasts</li>
</ul>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{site_url}}/dashboard" style="display: inline-block; padding: 12px 30px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Get Started</a>
</div>

<p style="color: #555;">If you have any questions, don't hesitate to reach out to our support team.</p>

<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

<p style="color: #555;">Best regards,<br><strong>The Car Audio Events Team</strong></p>
    `.trim();
    
    if (editorRef.current) {
      editorRef.current.setContent(sampleContent);
    } else {
      setTemplateForm({ 
        ...templateForm, 
        html_content: sampleContent,
        body: sampleContent 
      });
    }
    showInfo('Sample template content inserted');
  };

  const previewWithTheme = () => {
    // Preview how the email will look with Outlook-compatible wrapper
    const currentContent = templateForm.html_content || templateForm.body || '';
    
    // First extract clean content (in case it's already wrapped)
    const cleanContent = extractCleanContent(currentContent);
    
    // Then wrap with Outlook-compatible template
    const themedContent = wrapEmailTemplateOutlook(cleanContent, { 
      includeHeader: true, 
      includeFooter: true,
      title: templateForm.subject || 'Car Audio Events'
    });
    
    // Open in new window for preview
    const previewWindow = window.open('', '_blank', 'width=700,height=800');
    if (previewWindow) {
      previewWindow.document.write(themedContent);
      previewWindow.document.close();
    }
    showInfo('Preview opened in new window');
  };

  const testTemplate = async () => {
    try {
      showInfo('Sending test email with this template...');
      
      // Send test email using the template
      const { data, error } = await supabase.functions.invoke('test-email-provider', {
        body: {
          template_id: selectedTemplate?.id,
          test_email: 'admin@caraudioevents.com'
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        showSuccess('Test email sent successfully!');
      } else {
        showError(`Test failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error testing template:', error);
      showError('Failed to send test email');
    }
  };

  const getProviderStatus = (provider: EmailProvider) => {
    if (provider.status === 'ready') {
      return {
        icon: <CheckCircle2 className="w-5 h-5 text-green-400" />,
        text: 'Ready',
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        message: 'API configured & active'
      };
    } else if (provider.status === 'disabled') {
      return {
        icon: <XCircle className="w-5 h-5 text-gray-400" />,
        text: 'Disabled',
        color: 'text-gray-400',
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/30',
        message: 'Provider is disabled'
      };
    } else if (provider.status === 'error') {
      return {
        icon: <AlertCircle className="w-5 h-5 text-red-400" />,
        text: 'Error',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        message: 'Configuration error'
      };
    } else {
      return {
        icon: <AlertCircle className="w-5 h-5 text-yellow-400" />,
        text: 'Not Configured',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        message: 'API key not configured'
      };
    }
  };

  // Get all categories from the templates
  const templateCategories = React.useMemo(() => {
    const categories: Record<string, string> = {};
    templates.forEach(template => {
      if (template.category_id || template.category) {
        const catId = template.category_id || template.category || 'other';
        // Use human-readable category names from the mapping
        if (!categories[catId]) {
          categories[catId] = CATEGORY_NAMES[catId] || 'Other';
        }
      }
    });
    return categories;
  }, [templates]);

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || 
                           template.category === selectedCategory || 
                           template.category_id === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.subject.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate category statistics
  const categoryStats = Object.entries(templateCategories).map(([id, name]) => ({
    id,
    name,
    count: templates.filter(t => (t.category_id || t.category) === id).length
  })).filter(cat => cat.count > 0);

  return (
    <div className="space-y-6">
      {/* Template Statistics Summary */}
      <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-sm rounded-lg border border-blue-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Email Template Library</h3>
              <p className="text-sm text-gray-400">{templates.length} total templates across {categoryStats.length} categories</p>
            </div>
          </div>
          <div className="flex gap-2">
            {categoryStats.slice(0, 3).map(cat => (
              <span key={cat.id} className="px-2 py-1 bg-gray-800/50 rounded text-xs text-gray-300">
                {cat.name}: {cat.count}
              </span>
            ))}
            {categoryStats.length > 3 && (
              <span className="px-2 py-1 bg-gray-800/50 rounded text-xs text-gray-400">
                +{categoryStats.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Provider Status Bar */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Email Provider Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {providers.map(provider => {
            const status = getProviderStatus(provider);
            const providerNames = {
              'postmark': 'Postmark',
              'sendgrid': 'SendGrid',
              'smtp': 'SMTP'
            };
            
            return (
              <div key={provider.id} className={`flex items-center justify-between p-3 rounded-lg border ${status.bg} ${status.border}`}>
                <div className="flex items-center gap-3">
                  <div>{status.icon}</div>
                  <div>
                    <p className="font-medium text-white">{providerNames[provider.provider_type]}</p>
                    <p className={`text-xs ${status.color}`}>{status.message}</p>
                  </div>
                </div>
                <span className={`text-sm font-medium ${status.color}`}>
                  {status.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Template Management Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              Email Templates 
              <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm font-medium">
                {templates.length} Total
              </span>
            </h2>
            <p className="text-sm text-gray-400">Manage and edit email templates with variables</p>
          </div>
          <button
            onClick={() => {
              setSelectedTemplate(null);
              setShowCreateNew(true);
              setEditorMode('visual');  // Default to visual mode for new templates
              setTemplateForm({
                name: '',
                subject: '',
                category: '',
                body: '',
                html_content: '',
                is_active: true,
                description: ''
              });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories ({templates.length})</option>
            {Object.entries(templateCategories).map(([key, name]) => {
              const count = templates.filter(t => (t.category_id || t.category) === key).length;
              return (
                <option key={key} value={key}>
                  {name} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Template List - All Templates from Database */}
      {!showCreateNew && !selectedTemplate && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">
                {selectedCategory === 'all' 
                  ? `All Templates (${filteredTemplates.length} of ${templates.length})`
                  : `${templateCategories[selectedCategory]} Templates (${filteredTemplates.length})`
                }
              </h3>
              {searchTerm && (
                <span className="text-sm text-gray-400">
                  Searching: "{searchTerm}"
                </span>
              )}
            </div>
            {loading && <p className="text-gray-400 text-sm">Loading templates...</p>}
          </div>
          
          {/* Group templates by category */}
          {Object.entries(templateCategories).map(([categoryId, categoryName]) => {
            const categoryTemplates = filteredTemplates.filter(t => 
              (t.category_id || t.category) === categoryId
            );
            
            // Skip if no templates in this category or not matching filter
            if (selectedCategory !== 'all' && selectedCategory !== categoryId) return null;
            if (categoryTemplates.length === 0) return null;
            
            return (
              <div key={categoryId} className="mb-8 last:mb-0">
                <h4 className="text-md font-medium text-white mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
                  <span className="text-lg">📧</span>
                  {categoryName}
                  <span className="text-sm text-gray-400">({categoryTemplates.length})</span>
                </h4>
                
                <div className="grid grid-cols-1 gap-3">
                  {categoryTemplates.map(template => (
                    <div
                      key={template.id}
                      className="p-4 rounded-lg border bg-gray-900/50 border-gray-700 hover:border-blue-500/50 cursor-pointer transition-all"
                      onClick={() => {
                        console.log('Selecting template:', template.name, 'with body length:', template.body?.length);
                        setSelectedTemplate(template);
                        setShowCreateNew(false);
                        setEditorMode('visual');  // Default to visual mode when selecting template
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-white text-sm mb-1">{template.name}</h5>
                          <p className="text-xs text-gray-400 mb-1">{template.subject}</p>
                          {template.description && (
                            <p className="text-xs text-gray-500">{template.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>Content: {template.body ? `${template.body.length} chars` : 'No content'}</span>
                            <span>•</span>
                            <span>Updated: {new Date(template.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {template.is_active ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400" />
                          )}
                          <Edit className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {/* Show uncategorized templates */}
          {(() => {
            const uncategorized = filteredTemplates.filter(t => !t.category_id && !t.category);
            if (uncategorized.length === 0) return null;
            
            return (
              <div className="mb-8">
                <h4 className="text-md font-medium text-white mb-4 flex items-center gap-2 border-b border-gray-700 pb-2">
                  <span className="text-lg">📄</span>
                  Uncategorized
                  <span className="text-sm text-gray-400">({uncategorized.length})</span>
                </h4>
                
                <div className="grid grid-cols-1 gap-3">
                  {uncategorized.map(template => (
                    <div
                      key={template.id}
                      className="p-4 rounded-lg border bg-gray-900/50 border-gray-700 hover:border-blue-500/50 cursor-pointer transition-all"
                      onClick={() => {
                        console.log('Selecting uncategorized template:', template.name, 'with body length:', template.body?.length);
                        setSelectedTemplate(template);
                        setShowCreateNew(false);
                        setEditorMode('visual');  // Default to visual mode when selecting template
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-white text-sm mb-1">{template.name}</h5>
                          <p className="text-xs text-gray-400 mb-1">{template.subject}</p>
                          {template.description && (
                            <p className="text-xs text-gray-500">{template.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>Content: {template.body ? `${template.body.length} chars` : 'No content'}</span>
                            <span>•</span>
                            <span>Updated: {new Date(template.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {template.is_active ? (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-gray-400" />
                          )}
                          <Edit className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          
          {filteredTemplates.length === 0 && !loading && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-2">No templates found</p>
              <p className="text-sm text-gray-500">Try adjusting your search or category filter</p>
            </div>
          )}
        </div>
      )}

      {/* Template Editor */}
      {(showCreateNew || selectedTemplate) && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">
              {selectedTemplate ? `Edit Template: ${selectedTemplate.name}` : 'Create New Template'}
            </h3>
            <div className="flex items-center gap-2">
              {selectedTemplate && (
                <>
                  <button
                    onClick={testTemplate}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Test
                  </button>
                  <button
                    onClick={() => deleteTemplate(selectedTemplate.id)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  setShowCreateNew(false);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Editor */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Template Name *</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Welcome Email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    {Object.entries(templateCategories).map(([key, name]) => (
                      <option key={key} value={key}>
                        {name}
                      </option>
                    ))}
                    <option value="account">Account Management</option>
                    <option value="membership">Membership</option>
                    <option value="event">Events</option>
                    <option value="billing">Billing & Payments</option>
                    <option value="notification">Notifications</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject Line *</label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Welcome to Car Audio Events!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <input
                  type="text"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of when this template is used"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">Email Content</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editorMode === 'visual'}
                        onChange={(e) => setEditorMode(e.target.checked ? 'visual' : 'code')}
                        className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300">Rich text editor</span>
                    </label>
                    {editorMode === 'visual' && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={TINYMCE_API_KEY ? true : false}
                          disabled={!TINYMCE_API_KEY}
                          readOnly={true}
                          className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300">TinyMCE advanced</span>
                      </label>
                    )}
                  </div>
                </div>
                
                {/* Template Actions */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <button
                    onClick={insertSampleContent}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    title="Insert sample template content"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Sample Content
                  </button>
                  <button
                    onClick={previewWithTheme}
                    className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                    title="Preview email with full theme wrapper"
                  >
                    <Eye className="w-4 h-4 inline mr-1" />
                    Preview with Theme
                  </button>
                  <div className="flex items-center gap-2 px-3 py-1 bg-yellow-600/20 border border-yellow-600/50 rounded">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-xs text-yellow-200">Templates should contain BODY content only - no headers/footers</span>
                  </div>
                </div>

                {editorMode === 'visual' && TINYMCE_API_KEY ? (
                  <Editor
                    apiKey={TINYMCE_API_KEY}
                    onInit={(evt, editor) => {
                      editorRef.current = editor;
                      setEditorReady(true);
                      // Set content after editor is ready
                      if (templateForm.body || templateForm.html_content) {
                        editor.setContent(templateForm.body || templateForm.html_content || '');
                      }
                    }}
                    value={templateForm.body || templateForm.html_content || ''}
                    onEditorChange={(content) => setTemplateForm({ ...templateForm, html_content: content, body: content })}
                    init={{
                      height: 500,
                      menubar: true,
                      plugins: [
                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                        'insertdatetime', 'media', 'table', 'preview', 'help', 'wordcount'
                      ],
                      toolbar: 'undo redo | blocks | ' +
                        'bold italic forecolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'removeformat | code | help',
                      content_style: `
                        body { 
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                          font-size: 16px;
                          line-height: 1.6;
                          color: #333333;
                          background: #ffffff;
                          padding: 20px;
                        }
                        h1, h2, h3, h4, h5, h6 { color: #333333; }
                        p { color: #555555; }
                        a { color: #3b82f6; }
                      `,
                      skin: 'oxide',
                      content_css: 'default'
                    }}
                  />
                ) : (
                  <textarea
                    value={templateForm.body || templateForm.html_content || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, html_content: e.target.value, body: e.target.value })}
                    className="w-full h-[500px] px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Enter HTML content here..."
                  />
                )}
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={templateForm.is_active}
                    onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })}
                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Template is active</span>
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    setShowCreateNew(false);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTemplate}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>

            {/* Variables Sidebar */}
            <div className="space-y-4">
              <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-white">Template Variables</h4>
                  <button
                    onClick={() => setShowVariables(!showVariables)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {showVariables ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {showVariables && (
                  <div className="space-y-3">
                    {Object.entries(TEMPLATE_VARIABLES).map(([category, vars]) => (
                      <div key={category}>
                        <p className="text-xs font-medium text-gray-400 uppercase mb-2">{category}</p>
                        <div className="space-y-1">
                          {vars.map(variable => (
                            <div key={variable.key} className="flex items-center justify-between p-2 bg-gray-800/50 rounded hover:bg-gray-800/70 transition-colors">
                              <div className="flex-1 mr-2">
                                <p className="text-xs font-mono text-blue-400">{variable.key}</p>
                                <p className="text-xs text-gray-500">{variable.description}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => insertVariable(variable.key)}
                                  className="text-green-400 hover:text-green-300 transition-colors p-1"
                                  title="Insert into template"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => copyVariable(variable.key)}
                                  className="text-gray-400 hover:text-white transition-colors p-1"
                                  title="Copy to clipboard"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Tips */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm font-medium text-white">Quick Tips</h4>
                </div>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• Use variables to personalize emails</li>
                  <li>• Test templates before activating</li>
                  <li>• Keep subject lines under 60 characters</li>
                  <li>• Include unsubscribe link in all marketing emails</li>
                  <li>• Use preview text for better open rates</li>
                </ul>
              </div>

              {/* Debug Tools */}
              {selectedTemplate && (
                <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-4">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Bug className="w-4 h-4 text-gray-400" />
                    Debug Tools
                  </h4>
                  <div className="space-y-2">
                    <button
                      onClick={testTemplate}
                      className="w-full px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Send Test Email
                    </button>
                    <button
                      className="w-full px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Preview Template
                    </button>
                    <button
                      className="w-full px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Validate Variables
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};