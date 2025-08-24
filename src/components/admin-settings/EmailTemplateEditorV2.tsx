import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  FileText, Plus, Search, Filter, Edit, Save, X, 
  CheckCircle, XCircle, AlertCircle, Copy, Code,
  Eye, EyeOff, Info, ChevronDown, ChevronUp, Trash2,
  Settings, Bug, Mail, CheckCircle2, Clock, Shield
} from 'lucide-react';
import { useNotifications } from '../NotificationSystem';
import { Editor } from '@tinymce/tinymce-react';
import { TINYMCE_API_KEY, getTinyMCEScriptUrl } from '../../config/tinymce';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category_id?: string;  // The actual column in the database
  body?: string;  // The actual column in the database with HTML content
  html_body?: string;  // Alternate column name
  html_content?: string;  // For compatibility
  variables?: any; // JSONB in database
  is_active?: boolean;
  is_system?: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

const TEMPLATE_VARIABLES = {
  'System': [
    { name: 'site_name', description: 'Website name', example: 'Car Audio Events' },
    { name: 'site_url', description: 'Website URL', example: 'https://caraudioevents.com' },
    { name: 'admin_email', description: 'Admin contact email', example: 'admin@caraudioevents.com' },
    { name: 'support_email', description: 'Support email address', example: 'support@caraudioevents.com' },
    { name: 'current_date', description: 'Current date', example: 'January 30, 2025' },
    { name: 'current_time', description: 'Current time', example: '2:30 PM EST' },
    { name: 'timezone', description: 'User timezone', example: 'America/New_York' }
  ],
  'User Account': [
    { name: 'user_id', description: 'User unique ID', example: '29b931f5-c02e-4562-b249-278f86663b62' },
    { name: 'user_name', description: 'User full name', example: 'John Doe' },
    { name: 'user_first_name', description: 'User first name', example: 'John' },
    { name: 'firstName', description: 'User first name (alternate)', example: 'John' },
    { name: 'user_last_name', description: 'User last name', example: 'Doe' },
    { name: 'user_email', description: 'User email address', example: 'john@example.com' },
    { name: 'user_phone', description: 'User phone number', example: '+1-555-123-4567' },
    { name: 'user_membership_type', description: 'User membership level', example: 'premium' },
    { name: 'user_membership_expiry', description: 'Membership expiry date', example: 'December 31, 2025' },
    { name: 'user_join_date', description: 'User registration date', example: 'January 15, 2024' },
    { name: 'user_profile_url', description: 'User profile page URL', example: 'https://caraudioevents.com/profile' },
    { name: 'user_avatar', description: 'User profile picture URL', example: 'https://example.com/avatar.jpg' },
    { name: 'user_location', description: 'User location/city', example: 'New York, NY' }
  ],
  'Events': [
    { name: 'event_id', description: 'Event unique ID', example: 'evt_123456789' },
    { name: 'event_name', description: 'Event name', example: 'Summer Car Show 2024' },
    { name: 'event_description', description: 'Event description', example: 'Annual summer car show featuring...' },
    { name: 'event_date', description: 'Event date', example: 'July 15, 2024' },
    { name: 'event_time', description: 'Event time', example: '2:00 PM - 8:00 PM' },
    { name: 'event_location', description: 'Event location', example: 'Central Park, New York' },
    { name: 'event_address', description: 'Event full address', example: '123 Main St, New York, NY 10001' },
    { name: 'event_city', description: 'Event city', example: 'New York' },
    { name: 'event_state', description: 'Event state/province', example: 'NY' },
    { name: 'event_zip', description: 'Event zip/postal code', example: '10001' },
    { name: 'event_country', description: 'Event country', example: 'United States' },
    { name: 'event_url', description: 'Event page URL', example: 'https://caraudioevents.com/events/summer-show-2024' },
    { name: 'event_image', description: 'Event image URL', example: 'https://example.com/event-image.jpg' },
    { name: 'event_category', description: 'Event category', example: 'Car Show' },
    { name: 'event_status', description: 'Event status', example: 'Active' },
    { name: 'event_capacity', description: 'Event capacity', example: '500' },
    { name: 'event_registered', description: 'Number of registered attendees', example: '342' },
    { name: 'event_price', description: 'Event ticket price', example: '$25.00' },
    { name: 'event_currency', description: 'Event price currency', example: 'USD' }
  ],
  'Organizations': [
    { name: 'organization_id', description: 'Organization unique ID', example: 'org_123456789' },
    { name: 'organization_name', description: 'Organization name', example: 'Car Audio Events' },
    { name: 'organization_description', description: 'Organization description', example: 'Leading car audio competition platform' },
    { name: 'organization_email', description: 'Organization contact email', example: 'info@caraudioevents.com' },
    { name: 'organization_phone', description: 'Organization phone', example: '+1-555-123-4567' },
    { name: 'organization_website', description: 'Organization website', example: 'https://caraudioevents.com' },
    { name: 'organization_address', description: 'Organization address', example: '123 Business St, New York, NY' },
    { name: 'organization_logo', description: 'Organization logo URL', example: 'https://example.com/logo.png' }
  ],
  'Billing': [
    { name: 'payment_id', description: 'Payment unique ID', example: 'pi_123456789' },
    { name: 'payment_amount', description: 'Payment amount', example: '$99.99' },
    { name: 'payment_currency', description: 'Payment currency', example: 'USD' },
    { name: 'payment_status', description: 'Payment status', example: 'succeeded' },
    { name: 'payment_method', description: 'Payment method', example: 'Visa ending in 4242' },
    { name: 'payment_date', description: 'Payment date', example: 'January 30, 2025' },
    { name: 'subscription_id', description: 'Subscription ID', example: 'sub_123456789' },
    { name: 'subscription_status', description: 'Subscription status', example: 'active' },
    { name: 'subscription_plan', description: 'Subscription plan name', example: 'Premium Monthly' },
    { name: 'subscription_price', description: 'Subscription price', example: '$29.99/month' },
    { name: 'next_billing_date', description: 'Next billing date', example: 'February 30, 2025' },
    { name: 'billing_cycle', description: 'Billing cycle', example: 'monthly' }
  ],
  'Invoices': [
    { name: 'invoice_id', description: 'Invoice number', example: 'INV-2025-001' },
    { name: 'invoice_date', description: 'Invoice date', example: 'January 30, 2025' },
    { name: 'invoice_due_date', description: 'Invoice due date', example: 'February 15, 2025' },
    { name: 'invoice_subtotal', description: 'Invoice subtotal', example: '$89.99' },
    { name: 'invoice_tax', description: 'Invoice tax amount', example: '$7.20' },
    { name: 'invoice_total', description: 'Invoice total', example: '$97.19' },
    { name: 'invoice_items', description: 'Invoice line items', example: 'Premium Membership - $89.99' },
    { name: 'invoice_pdf_url', description: 'Invoice PDF download URL', example: 'https://example.com/invoice.pdf' },
    { name: 'invoice_status', description: 'Invoice status', example: 'paid' }
  ],
  'Competitions': [
    { name: 'competition_id', description: 'Competition unique ID', example: 'comp_123456789' },
    { name: 'competition_name', description: 'Competition name', example: 'Bass Battle 2024' },
    { name: 'competition_category', description: 'Competition category', example: 'Bass' },
    { name: 'competition_division', description: 'Competition division', example: 'Pro' },
    { name: 'competition_score', description: 'Competition score', example: '145.2 dB' },
    { name: 'competition_rank', description: 'Competition ranking', example: '3rd Place' },
    { name: 'competition_judge', description: 'Competition judge', example: 'Mike Johnson' },
    { name: 'competition_notes', description: 'Judge notes/comments', example: 'Excellent setup, clean install' }
  ],
  'Notifications': [
    { name: 'reset_link', description: 'Password reset link', example: 'https://caraudioevents.com/reset?token=abc123' },
    { name: 'verification_link', description: 'Email verification link', example: 'https://caraudioevents.com/verify?token=xyz789' },
    { name: 'unsubscribe_link', description: 'Email unsubscribe link', example: 'https://caraudioevents.com/unsubscribe?token=def456' },
    { name: 'preferences_link', description: 'Email preferences link', example: 'https://caraudioevents.com/preferences' },
    { name: 'login_link', description: 'Login page link', example: 'https://caraudioevents.com/login' },
    { name: 'dashboard_link', description: 'User dashboard link', example: 'https://caraudioevents.com/dashboard' },
    { name: 'dashboardUrl', description: 'User dashboard URL (alternate)', example: 'https://caraudioevents.com/dashboard' },
    { name: 'support_link', description: 'Support page link', example: 'https://caraudioevents.com/support' },
    { name: 'faq_link', description: 'FAQ page link', example: 'https://caraudioevents.com/faq' }
  ]
};

export const EmailTemplateEditor: React.FC = () => {
  const { showSuccess, showError, showInfo } = useNotifications();
  const editorRef = useRef<any>(null);
  
  // State
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['User Account']));
  const [variableSearch, setVariableSearch] = useState('');
  const [variableCategory, setVariableCategory] = useState('all');
  
  // Editor settings - checkbox based like production
  const [useRichTextEditor, setUseRichTextEditor] = useState(true);
  const [useTinyMCE, setUseTinyMCE] = useState(true);
  const [editorKey, setEditorKey] = useState(0);
  
  // Template form
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    category_id: '',
    body: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    // When a template is selected, update the form
    if (selectedTemplate) {
      // Get the HTML content from the database columns
      const htmlContent = selectedTemplate.body || 
                         selectedTemplate.html_body || 
                         selectedTemplate.html_content || 
                         '';
      
      setTemplateForm({
        name: selectedTemplate.name || '',
        subject: selectedTemplate.subject || '',
        category_id: selectedTemplate.category_id || '',
        body: htmlContent,
        description: selectedTemplate.description || '',
        is_active: selectedTemplate.is_active !== false
      });
      
      // Force re-render of TinyMCE with new content
      setEditorKey(prev => prev + 1);
    }
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('category_id', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      showError('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    try {
      if (!templateForm.name || !templateForm.subject) {
        showError('Template name and subject are required');
        return;
      }

      const templateData = {
        name: templateForm.name,
        subject: templateForm.subject,
        category_id: templateForm.category_id,
        body: templateForm.body,
        html_body: templateForm.body,
        html_content: templateForm.body,
        description: templateForm.description,
        is_active: templateForm.is_active,
        updated_at: new Date().toISOString()
      };

      if (selectedTemplate) {
        // Update existing
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('id', selectedTemplate.id);
        
        if (error) throw error;
        showSuccess('Template updated successfully');
      } else {
        // Create new
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
    } catch (error) {
      console.error('Error saving template:', error);
      showError('Failed to save template');
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      showSuccess('Template deleted successfully');
      setSelectedTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      showError('Failed to delete template');
    }
  };

  const insertVariable = (variable: string) => {
    const varText = `{{${variable}}}`;
    
    if (useTinyMCE && editorRef.current) {
      editorRef.current.insertContent(varText);
    } else {
      // For textarea, insert at cursor position
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end);
        const newValue = before + varText + after;
        setTemplateForm({ ...templateForm, body: newValue });
      }
    }
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`);
    showInfo('Variable copied to clipboard');
  };

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const cat = template.category_id || 'uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(template);
    return acc;
  }, {} as Record<string, EmailTemplate[]>);

  // Filter templates
  const filteredTemplates = searchTerm 
    ? templates.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.subject?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : templates;

  // Filter variables
  const filteredVariables = Object.entries(TEMPLATE_VARIABLES).reduce((acc, [category, vars]) => {
    if (variableCategory !== 'all' && category !== variableCategory) return acc;
    
    const filtered = vars.filter(v => 
      !variableSearch || 
      v.name.toLowerCase().includes(variableSearch.toLowerCase()) ||
      v.description.toLowerCase().includes(variableSearch.toLowerCase())
    );
    
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, any[]>);

  // Calculate total variables
  const totalVariables = Object.values(TEMPLATE_VARIABLES).reduce((sum, vars) => sum + vars.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Email Templates</h2>
        </div>
        <button
          onClick={() => {
            setSelectedTemplate(null);
            setTemplateForm({
              name: '',
              subject: '',
              category_id: '',
              body: '',
              description: '',
              is_active: true
            });
            setEditorKey(prev => prev + 1);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates by name, subject, or content..."
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.keys(templatesByCategory).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1 space-y-2">
          {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => {
            const isExpanded = expandedCategories.has(category);
            const displayTemplates = searchTerm 
              ? categoryTemplates.filter(t => filteredTemplates.includes(t))
              : categoryTemplates;
            
            if (categoryFilter !== 'all' && category !== categoryFilter) return null;
            if (displayTemplates.length === 0) return null;
            
            return (
              <div key={category} className="bg-gray-800/50 rounded-lg border border-gray-700">
                <button
                  onClick={() => {
                    const newExpanded = new Set(expandedCategories);
                    if (isExpanded) {
                      newExpanded.delete(category);
                    } else {
                      newExpanded.add(category);
                    }
                    setExpandedCategories(newExpanded);
                  }}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-white font-medium capitalize">{category}</span>
                    <span className="text-gray-400 text-sm">({displayTemplates.length} templates)</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                
                {isExpanded && (
                  <div className="border-t border-gray-700">
                    {displayTemplates.map(template => (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`p-3 hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-700/50 last:border-b-0 ${
                          selectedTemplate?.id === template.id ? 'bg-gray-700/50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-white">{template.name}</h4>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{template.subject}</p>
                          </div>
                          {template.is_active ? (
                            <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">Active</span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded">Inactive</span>
                          )}
                        </div>
                        {template.updated_at && (
                          <p className="text-xs text-gray-500 mt-2">
                            Updated: {new Date(template.updated_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Editor Section */}
        <div className="lg:col-span-2">
          {selectedTemplate || templateForm.name ? (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-6">
              {/* Editor Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  {selectedTemplate ? 'Edit Template' : 'Create Template'}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveTemplate}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  {selectedTemplate && (
                    <button
                      onClick={() => deleteTemplate(selectedTemplate.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setTemplateForm({
                        name: '',
                        subject: '',
                        category_id: '',
                        body: '',
                        description: '',
                        is_active: true
                      });
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Template Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Template Name</label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Subject Line</label>
                    <input
                      type="text"
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <select
                    value={templateForm.category_id}
                    onChange={(e) => setTemplateForm({ ...templateForm, category_id: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a category...</option>
                    {Object.keys(templatesByCategory).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">Email Body</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={useRichTextEditor}
                          onChange={(e) => setUseRichTextEditor(e.target.checked)}
                          className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300">Use Rich Text Editor</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={useTinyMCE}
                          onChange={(e) => setUseTinyMCE(e.target.checked)}
                          className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-300">Use TinyMCE (Advanced)</span>
                      </label>
                    </div>
                  </div>
                  
                  {useRichTextEditor && useTinyMCE && TINYMCE_API_KEY ? (
                    <Editor
                      key={editorKey}
                      apiKey={TINYMCE_API_KEY}
                      onInit={(evt, editor) => {
                        editorRef.current = editor;
                      }}
                      initialValue={templateForm.body}
                      onEditorChange={(content) => setTemplateForm({ ...templateForm, body: content })}
                      init={{
                        height: 400,
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
                        content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                        skin: 'oxide-dark',
                        content_css: 'dark'
                      }}
                    />
                  ) : (
                    <textarea
                      value={templateForm.body}
                      onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                      className="w-full h-[400px] px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Enter HTML content here..."
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={templateForm.is_active}
                    onChange={(e) => setTemplateForm({ ...templateForm, is_active: e.target.checked })}
                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-300">
                    Template is active
                  </label>
                </div>
              </div>

              {/* Variables Section */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Email Variables ({totalVariables})
                  </h4>
                </div>
                
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={variableSearch}
                      onChange={(e) => setVariableSearch(e.target.value)}
                      placeholder="Search variables..."
                      className="w-full pl-9 pr-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={variableCategory}
                    onChange={(e) => setVariableCategory(e.target.value)}
                    className="px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Variables ({totalVariables})</option>
                    {Object.entries(TEMPLATE_VARIABLES).map(([cat, vars]) => (
                      <option key={cat} value={cat}>{cat} ({vars.length})</option>
                    ))}
                  </select>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {Object.entries(filteredVariables).map(([category, vars]) => (
                    <div key={category}>
                      <div className="text-xs font-semibold text-gray-400 mb-2">{category}</div>
                      {vars.map(variable => (
                        <div key={variable.name} className="flex items-start gap-2 p-2 hover:bg-gray-700/30 rounded transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <code className="text-xs text-blue-400 bg-gray-900 px-2 py-0.5 rounded">
                                {`{{${variable.name}}}`}
                              </code>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => insertVariable(variable.name)}
                                  className="text-gray-400 hover:text-white transition-colors"
                                  title="Insert into template"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => copyVariable(variable.name)}
                                  className="text-gray-400 hover:text-white transition-colors"
                                  title="Copy to clipboard"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{variable.description}</p>
                            <p className="text-xs text-gray-500">Example: {variable.example}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                  <h5 className="text-xs font-semibold text-gray-400 mb-2">Quick Tips</h5>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Click the + icon to insert variables into your template</li>
                    <li>• Use the copy icon to copy variable names to clipboard</li>
                    <li>• Variables are automatically replaced when emails are sent</li>
                    <li>• Test your templates with the preview feature</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700 p-12 text-center">
              <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Select a template to edit or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};