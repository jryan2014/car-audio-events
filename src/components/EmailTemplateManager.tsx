import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  Settings,
  Mail,
  User,
  DollarSign,
  Calendar,
  Building,
  AlertCircle,
  CheckCircle,
  Copy,
  X,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import { supabase } from '../lib/supabase';
import { EMAIL_VARIABLES, getVariablesByCategory, getAllCategories, replaceVariables } from '../utils/emailVariables';
import { getTinyMCEScriptUrl } from '../config/tinymce';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  email_type: string;
  membership_level: 'all' | 'free' | 'pro' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  variables?: string[];
  from_name?: string;
  category_id?: string;
}

interface EmailTemplateCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailTemplateManagerProps {
  onClose: () => void;
}

const EMAIL_TYPES = [
  { value: 'welcome', label: 'Welcome Email', description: 'New user registration emails' },
  { value: 'pro_competitor_welcome', label: 'Pro Competitor Welcome', description: 'Premium member welcome emails' },
  { value: 'email_verification', label: 'Email Verification', description: 'Account verification emails' },
  { value: 'password_reset', label: 'Password Reset', description: 'Password reset and recovery emails' },
  { value: 'account_creation', label: 'Account Creation', description: 'Account creation notifications' },
  { value: 'system_notification', label: 'System Notifications', description: 'General system alerts and updates' },
  { value: 'event_notification', label: 'Event Notifications', description: 'Event-related communications' },
  { value: 'support', label: 'Support Emails', description: 'Customer support communications' }
];

const MEMBERSHIP_LEVELS = [
  { value: 'all', label: 'All Users', description: 'Available to all membership levels' },
  { value: 'free', label: 'Free Users', description: 'Only for free membership users' },
  { value: 'pro', label: 'Pro Users', description: 'Only for pro membership users' },
  { value: 'admin', label: 'Admin Users', description: 'Only for admin users' }
];

export default function EmailTemplateManager({ onClose }: EmailTemplateManagerProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [categories, setCategories] = useState<EmailTemplateCategory[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('user');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  const [newTemplate, setNewTemplate] = useState<Partial<EmailTemplate>>({
    name: '',
    subject: '',
    body: '',
    email_type: 'welcome',
    membership_level: 'all',
    is_active: true
  });

  useEffect(() => {
    loadTemplates();
    loadCategories();
    generatePreviewData();
  }, []);

  const generatePreviewData = () => {
    setPreviewData({
      firstName: 'John',
      lastName: 'Smith',
      fullName: 'John Smith',
      email: 'john.smith@example.com',
      username: 'johnsmith123',
      membershipLevel: 'Pro Competitor',
      joinDate: 'January 15, 2024',
      profileUrl: 'https://caraudioevents.com/profile/john',
      
      // Date variables
      day: '15',
      dayPlus1: '16',
      dayMinus1: '14',
      dayWeek: 'Tuesday',
      month: 'March',
      monthPlus1: 'April',
      monthMinus1: 'February',
      today: 'March 15, 2024',
      todayIntl: '15/03/2024',
      year: '2024',
      yearPlus1: '2025',
      yearMinus1: '2023',
      currentDate: 'March 15, 2024',
      currentYear: '2024',
      
      // Billing variables
      invoiceNumber: 'INV-2024-001',
      invoiceDate: 'March 15, 2024',
      invoiceDueDate: 'March 30, 2024',
      invoiceAmount: '$99.99',
      invoiceSubtotal: '$89.99',
      invoiceTax: '$10.00',
      invoiceDiscount: '$5.00',
      paymentMethod: 'Visa ending in 4242',
      paymentDate: 'March 20, 2024',
      paymentStatus: 'Paid',
      paymentAmount: '$99.99',
      subscriptionPlan: 'Pro Competitor Annual',
      subscriptionPrice: '$99.99/year',
      nextBillingDate: 'March 15, 2025',
      billingPeriod: 'Annual',
      transactionId: 'TXN-ABC123',
      receiptUrl: 'https://caraudioevents.com/receipt/123',
      accountBalance: '$0.00',
      outstandingBalance: '$0.00',
      daysPastDue: '0',
      referenceNumber: 'CHK-12345',
      
      // Invoice specific
      amountDue: '$99.99',
      amountPaid: '$50.00',
      amountSubtotal: '$89.99',
      amountTax: '$10.00',
      discount: '10%',
      invoicePo: 'PO-2024-001',
      notes: 'Payment due within 30 days',
      terms: 'Net 30',
      invoiceBox: '[View and Pay Now]',
      link: 'https://caraudioevents.com/invoice/123',
      linkPdf: 'https://caraudioevents.com/invoice/123.pdf',
      
      // Event variables
      eventName: 'Summer Car Audio Championships',
      eventDate: 'July 15, 2024',
      eventTime: '9:00 AM - 6:00 PM',
      eventLocation: 'Phoenix Convention Center',
      eventAddress: '100 N 3rd St, Phoenix, AZ 85004',
      eventUrl: 'https://caraudioevents.com/events/summer-2024',
      registrationDeadline: 'July 10, 2024',
      eventPrice: '$75.00',
      eventCategory: 'Competition',
      competitionClass: 'Expert Class',
      
      // System variables
      dashboardUrl: 'https://caraudioevents.com/dashboard',
      loginUrl: 'https://caraudioevents.com/login',
      supportUrl: 'https://caraudioevents.com/support',
      contactEmail: 'support@caraudioevents.com',
      websiteUrl: 'https://caraudioevents.com',
      verificationCode: '123456',
      resetToken: 'abc123def456',
      expirationTime: '24 hours',
      
      // Organization variables
      companyName: 'Car Audio Events',
      companyAddress: '123 Audio St',
      companyAddress2: 'Suite 100',
      companyCity: 'Sound City',
      companyState: 'SC',
      companyZip: '12345',
      companyCountry: 'United States',
      companyPhone: '(555) 123-4567',
      companyEmail: 'info@caraudioevents.com',
      companyDescription: 'Premier car audio competition platform',
      companyWebsite: 'https://caraudioevents.com',
      logoUrl: 'https://caraudioevents.com/assets/logos/cae-logo-main.png',
      socialMediaLinks: 'Facebook | Twitter | Instagram',
      privacyPolicyUrl: 'https://caraudioevents.com/privacy',
      termsOfServiceUrl: 'https://caraudioevents.com/terms'
    });
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select(`
          *,
          email_template_categories (
            id,
            name,
            description,
            display_order,
            is_active
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      setMessage('Failed to load email templates');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('email_template_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      setMessage('Failed to load email template categories');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const saveTemplate = async (template: Partial<EmailTemplate>) => {
    setSaving(true);
    try {
      if (template.id) {
        // Update existing template
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: template.name,
            subject: template.subject,
            body: template.body,
            email_type: template.email_type,
            membership_level: template.membership_level,
            is_active: template.is_active,
            category_id: template.category_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', template.id);

        if (error) throw error;
        setMessage('Template updated successfully! 🎉');
      } else {
        // Create new template
        const { error } = await supabase
          .from('email_templates')
          .insert({
            name: template.name,
            subject: template.subject,
            body: template.body,
            email_type: template.email_type,
            membership_level: template.membership_level,
            is_active: template.is_active,
            category_id: template.category_id
          });

        if (error) throw error;
        setMessage('Template created successfully! 🎉');
      }

      await loadTemplates();
      setEditingTemplate(null);
      setShowAddTemplate(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage('Failed to save template. Please try again.');
      setTimeout(() => setMessage(''), 3000);
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
      
      await loadTemplates();
      setMessage('Template deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting template:', error);
      setMessage('Failed to delete template');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const toggleTemplateStatus = async (templateId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: !isActive, updated_at: new Date().toISOString() })
        .eq('id', templateId);

      if (error) throw error;
      
      await loadTemplates();
      setMessage(`Template ${!isActive ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error updating template status:', error);
      setMessage('Failed to update template status');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setMessage(`Copied ${variable} to clipboard!`);
    setTimeout(() => setMessage(''), 2000);
  };

  const insertVariable = (variable: string, editor: any) => {
    if (editor) {
      editor.insertContent(variable);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      user: User,
      billing: DollarSign,
      event: Calendar,
      system: Settings,
      organization: Building
    };
    return icons[category as keyof typeof icons] || Settings;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      user: 'text-blue-400',
      billing: 'text-green-400',
      event: 'text-purple-400',
      system: 'text-yellow-400',
      organization: 'text-red-400'
    };
    return colors[category as keyof typeof colors] || 'text-gray-400';
  };

  const handleAddNew = () => {
    setSelectedTemplate(null);
    setIsModalOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      try {
        const { error } = await supabase.functions.invoke(`delete-email-template/${templateId}`, {
          method: 'DELETE',
        });
        if (error) throw error;
        // Refresh the list after deleting
        loadTemplates(); 
      } catch (err) {
        setMessage('Failed to delete template. Please try again.');
        console.error(err);
      }
    }
  };
  
  const handleModalClose = (wasUpdated: boolean) => {
    setIsModalOpen(false);
    if (wasUpdated) {
      loadTemplates();
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mx-auto"></div>
        <p className="text-center text-gray-400 mt-2">Loading email templates...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white">Email Template Manager</h2>
              <p className="text-gray-400">Create and manage rich HTML email templates with TinyMCE editor</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setLoading(true);
                loadTemplates();
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-lg transition-colors"
              title="Refresh templates from database"
            >
              <Eye className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            
            <button
              onClick={() => setShowVariables(!showVariables)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                showVariables ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Variables</span>
            </button>
            
            <button
              onClick={() => setShowAddTemplate(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Template</span>
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.includes('successfully') || message.includes('🎉') || message.includes('Copied')
              ? 'bg-green-500/20 border border-green-500/30 text-green-400' 
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}>
            {message}
          </div>
        )}

        {/* Debug Categories Section */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
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

        {/* Variables Panel */}
        {showVariables && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Settings className="h-6 w-6 text-electric-400" />
                <h3 className="text-xl font-bold text-white">Email Template Variables</h3>
              </div>
              <button
                onClick={() => setShowVariables(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex space-x-1 bg-gray-700/30 rounded-lg p-1 mb-6">
              {getAllCategories().map((category) => {
                const Icon = getCategoryIcon(category);
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                      selectedCategory === category
                        ? 'bg-electric-500 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-600/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="capitalize">{category}</span>
                  </button>
                );
              })}
            </div>

            {/* Variables Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getVariablesByCategory(selectedCategory).map((variable) => (
                <div key={variable.name} className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-electric-400 font-mono text-sm">{variable.name}</code>
                    <button
                      onClick={() => copyVariable(variable.name)}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{variable.description}</p>
                  <div className="text-xs text-gray-400">
                    <span className="font-medium">Example:</span> {variable.example}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Templates List */}
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex items-center justify-between bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
            <div className="flex items-center space-x-4">
              <label className="text-gray-300 text-sm font-medium">Filter by Category:</label>
              <select
                value={selectedFilterCategory}
                onChange={(e) => setSelectedFilterCategory(e.target.value)}
                className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-400">
              {templates.filter(template => 
                selectedFilterCategory === 'all' || template.category_id === selectedFilterCategory
              ).length} templates
            </div>
          </div>

          {templates.filter(template => 
            selectedFilterCategory === 'all' || template.category_id === selectedFilterCategory
          ).length === 0 ? (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 text-center">
              <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">
                {selectedFilterCategory === 'all' ? 'No Email Templates Found' : 'No Templates in Selected Category'}
              </h3>
              <p className="text-gray-400 mb-4">
                {selectedFilterCategory === 'all' 
                  ? 'Create your first email template to get started' 
                  : 'No templates found in this category'
                }
              </p>
              <button
                onClick={() => setShowAddTemplate(true)}
                className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-all duration-200"
              >
                Create New Template
              </button>
            </div>
          ) : (
            templates.filter(template => 
              selectedFilterCategory === 'all' || template.category_id === selectedFilterCategory
            ).map((template) => {
              const category = categories.find(cat => cat.id === template.category_id);
              return (
                <div key={template.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${template.is_active ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                        <Mail className={`h-6 w-6 ${template.is_active ? 'text-green-400' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg">{template.name}</h3>
                        <p className="text-gray-300">{template.subject}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            template.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {template.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                            {EMAIL_TYPES.find(t => t.value === template.email_type)?.label || template.email_type}
                          </span>
                          <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
                            {MEMBERSHIP_LEVELS.find(m => m.value === template.membership_level)?.label || template.membership_level}
                          </span>
                          {category && (
                            <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400">
                              {category.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(template)}
                        className="flex items-center space-x-2 px-3 py-2 bg-electric-500/20 text-electric-400 rounded-lg hover:bg-electric-500/30 transition-all duration-200"
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => toggleTemplateStatus(template.id, template.is_active)}
                        className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                          template.is_active 
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                            : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        }`}
                      >
                        {template.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add/Edit Template Modal */}
        {(showAddTemplate || editingTemplate) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold text-xl">
                    {editingTemplate ? 'Edit Template' : 'Add New Template'}
                  </h3>
                  <div className="flex items-center space-x-3">
                    <div className="flex bg-gray-700/30 rounded-lg p-1">
                      <button
                        onClick={() => setPreviewMode('edit')}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                          previewMode === 'edit'
                            ? 'bg-electric-500 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Edit2 className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setPreviewMode('preview')}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200 ${
                          previewMode === 'preview'
                            ? 'bg-electric-500 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Eye className="h-4 w-4" />
                        <span>Preview</span>
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setEditingTemplate(null);
                        setShowAddTemplate(false);
                        setPreviewMode('edit');
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {previewMode === 'edit' ? (
                  <TemplateEditor
                    template={editingTemplate || newTemplate}
                    setTemplate={editingTemplate ? (template) => setEditingTemplate({...editingTemplate, ...template}) : (template) => setNewTemplate({...newTemplate, ...template})}
                    onSave={() => saveTemplate(editingTemplate || newTemplate)}
                    saving={saving}
                    categories={categories}
                  />
                ) : (
                  <TemplatePreview
                    template={editingTemplate || newTemplate}
                    previewData={previewData}
                    categories={categories}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Template Editor Component with TinyMCE
function TemplateEditor({ 
  template, 
  setTemplate, 
  onSave, 
  saving,
  categories
}: {
  template: Partial<EmailTemplate>;
  setTemplate: (template: Partial<EmailTemplate>) => void;
  onSave: () => void;
  saving: boolean;
  categories: EmailTemplateCategory[];
}) {
  const [showVariables, setShowVariables] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('user');

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    // Could add a toast notification here
  };

  return (
    <div className="space-y-6">
      {/* Template Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Template Name *
            <HelpIcon tooltip="Descriptive name for this email template" />
          </label>
          <input
            type="text"
            value={template.name || ''}
            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
            placeholder="e.g., Welcome Email - Pro Members"
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          />
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Email Type *
            <HelpIcon tooltip="The function this template will be used for" />
          </label>
          <select
            value={template.email_type || 'welcome'}
            onChange={(e) => setTemplate({ ...template, email_type: e.target.value })}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            {EMAIL_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <p className="text-gray-400 text-xs mt-1">
            {EMAIL_TYPES.find(t => t.value === template.email_type)?.description}
          </p>
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            Membership Level *
            <HelpIcon tooltip="Which users this template applies to" />
          </label>
          <select
            value={template.membership_level || 'all'}
            onChange={(e) => setTemplate({ ...template, membership_level: e.target.value as any })}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            {MEMBERSHIP_LEVELS.map(level => (
              <option key={level.value} value={level.value}>{level.label}</option>
            ))}
          </select>
          <p className="text-gray-400 text-xs mt-1">
            {MEMBERSHIP_LEVELS.find(m => m.value === template.membership_level)?.description}
          </p>
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            System Section (Category) *
            <HelpIcon tooltip="The system section this template belongs to for organization" />
          </label>
          <select
            value={template.category_id || ''}
            onChange={(e) => setTemplate({ ...template, category_id: e.target.value })}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            <option value="">Select a category...</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name} - {category.description}
              </option>
            ))}
          </select>
          <p className="text-gray-400 text-xs mt-1">
            Choose the system section that best describes this template's purpose
          </p>
          {/* Debug info */}
          <div className="text-xs text-yellow-400 mt-1">
            Current: {template.category_id || 'none'} | Available: {categories.length} categories
          </div>
        </div>

        <div className="flex items-center">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={template.is_active !== false}
              onChange={(e) => setTemplate({ ...template, is_active: e.target.checked })}
              className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
            />
            <span className="text-gray-300">Template is active</span>
            <HelpIcon tooltip="Active templates can be used for sending emails" />
          </label>
        </div>
      </div>

      {/* Subject Line */}
      <div>
        <label className="block text-gray-300 text-sm font-medium mb-2">
          Subject Line *
          <HelpIcon tooltip="Email subject line - use variables like {{firstName}}" />
        </label>
        <input
          type="text"
          value={template.subject || ''}
          onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
          placeholder="Welcome to Car Audio Events, {{firstName}}!"
          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
        />
      </div>

      {/* TinyMCE HTML Content Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-gray-300 text-sm font-medium">
            HTML Email Content *
            <HelpIcon tooltip="Rich HTML content for your email - use the toolbar to format text" />
          </label>
          <button
            type="button"
            onClick={() => {
              const logoHtml = '<img src="/assets/logos/cae-logo-main.png" alt="Car Audio Events" style="max-width: 200px; height: auto; margin: 20px 0;" />';
              setTemplate({ ...template, body: (template.body || '') + logoHtml });
            }}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            <span>📷</span>
            <span>Insert Logo</span>
          </button>
        </div>
        <div className="border border-gray-600 rounded-lg overflow-hidden">
          <Editor
            tinymceScriptSrc={getTinyMCEScriptUrl()}
            value={template.body || ''}
            onEditorChange={(content) => setTemplate({ ...template, body: content })}
            init={{
              height: 500,
              suffix: '.min',
              branding: false,
              promotion: false,
              menubar: 'file edit view insert format tools table help',
              plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'help', 'wordcount', 'emoticons',
                'template', 'paste', 'textcolor', 'colorpicker', 'textpattern',
                'imagetools', 'quickbars', 'codesample', 'hr'
              ],
              toolbar: 'undo redo | styles | bold italic underline strikethrough | ' +
                'forecolor backcolor | alignleft aligncenter alignright alignjustify | ' +
                'bullist numlist outdent indent | link image media table | ' +
                'insertdatetime hr codesample | preview code fullscreen | help',
              toolbar_mode: 'sliding',
              contextmenu: 'link image table',
              image_advtab: true,
              image_caption: true,
              image_list: [
                {title: 'CAE Logo Main', value: '/assets/logos/cae-logo-main.png'},
                {title: 'CAE Logo No Background', value: '/assets/logos/cae-logo-no-bg.png'},
                {title: 'CAE Logo V2', value: '/assets/logos/cae-logo-v2.png'}
              ],
              link_list: [
                {title: 'Car Audio Events Website', value: 'https://caraudioevents.com'},
                {title: 'Dashboard', value: 'https://caraudioevents.com/dashboard'},
                {title: 'Events', value: 'https://caraudioevents.com/events'},
                {title: 'Directory', value: 'https://caraudioevents.com/directory'},
                {title: 'Privacy Policy', value: 'https://caraudioevents.com/privacy-policy'},
                {title: 'Terms of Service', value: 'https://caraudioevents.com/terms-of-service'},
                {title: 'Support Email', value: 'mailto:support@caraudioevents.com'}
              ],
              style_formats: [
                {title: 'Headings', items: [
                  {title: 'Header 1', format: 'h1'},
                  {title: 'Header 2', format: 'h2'},
                  {title: 'Header 3', format: 'h3'},
                  {title: 'Header 4', format: 'h4'}
                ]},
                {title: 'Inline', items: [
                  {title: 'Bold', format: 'strong'},
                  {title: 'Italic', format: 'em'},
                  {title: 'Underline', format: 'u'},
                  {title: 'Code', format: 'code'}
                ]},
                {title: 'Blocks', items: [
                  {title: 'Paragraph', format: 'p'},
                  {title: 'Blockquote', format: 'blockquote'},
                  {title: 'Div', format: 'div'},
                  {title: 'Pre', format: 'pre'}
                ]},
                {title: 'Email Styles', items: [
                  {title: 'CTA Button', selector: 'a', styles: {
                    'display': 'inline-block',
                    'background': 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                    'color': 'white',
                    'padding': '15px 30px',
                    'text-decoration': 'none',
                    'border-radius': '8px',
                    'font-weight': 'bold'
                  }},
                  {title: 'Feature Box', selector: 'div', styles: {
                    'background': '#f8f9fa',
                    'border-radius': '12px',
                    'padding': '20px',
                    'margin': '20px 0'
                  }}
                ]}
              ],
              content_style: `
                body { 
                  font-family: Inter, Arial, sans-serif; 
                  font-size: 14px; 
                  background: white; 
                  color: black; 
                  padding: 10px; 
                  line-height: 1.6; 
                  max-width: 600px;
                  margin: 0 auto;
                }
                .cta-button {
                  display: inline-block;
                  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
                  color: white;
                  padding: 15px 30px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: bold;
                }
                .feature-box {
                  background: #f8f9fa;
                  border-radius: 12px;
                  padding: 20px;
                  margin: 20px 0;
                }
              `,
              skin: 'oxide',
              content_css: 'default',
              paste_data_images: true,
              automatic_uploads: false,
              file_picker_types: 'image'
            }}
          />
        </div>
      </div>

      {/* Variable Quick Reference */}
      <div className="bg-gray-700/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-blue-400 font-medium">Quick Variable Reference:</h4>
          <button
            onClick={() => setShowVariables(!showVariables)}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            {showVariables ? 'Hide All' : 'Show All Variables'}
          </button>
        </div>
        
        {showVariables ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {getAllCategories().map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    selectedCategory === category 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {getVariablesByCategory(selectedCategory).map(variable => (
                <button
                  key={variable.name}
                  onClick={() => copyVariable(variable.name)}
                  className="flex items-center justify-between p-2 bg-gray-600/50 rounded hover:bg-gray-600 transition-colors text-left"
                  title={`${variable.description} - Click to copy`}
                >
                  <div>
                    <code className="text-blue-300 text-xs">{variable.name}</code>
                    <p className="text-gray-400 text-xs truncate">{variable.description}</p>
                  </div>
                  <Copy className="h-3 w-3 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="space-y-1">
              <div className="text-blue-300 font-medium">User</div>
              <code className="text-blue-200 text-xs">{'{{firstName}}'}</code><br/>
              <code className="text-blue-200 text-xs">{'{{email}}'}</code><br/>
              <code className="text-blue-200 text-xs">{'{{membershipLevel}}'}</code>
            </div>
            <div className="space-y-1">
              <div className="text-green-300 font-medium">Billing</div>
              <code className="text-green-200 text-xs">{'{{invoiceAmount}}'}</code><br/>
              <code className="text-green-200 text-xs">{'{{paymentStatus}}'}</code><br/>
              <code className="text-green-200 text-xs">{'{{nextBillingDate}}'}</code>
            </div>
            <div className="space-y-1">
              <div className="text-purple-300 font-medium">Events</div>
              <code className="text-purple-200 text-xs">{'{{eventName}}'}</code><br/>
              <code className="text-purple-200 text-xs">{'{{eventDate}}'}</code><br/>
              <code className="text-purple-200 text-xs">{'{{eventLocation}}'}</code>
            </div>
            <div className="space-y-1">
              <div className="text-yellow-300 font-medium">System</div>
              <code className="text-yellow-200 text-xs">{'{{dashboardUrl}}'}</code><br/>
              <code className="text-yellow-200 text-xs">{'{{supportUrl}}'}</code><br/>
              <code className="text-yellow-200 text-xs">{'{{currentDate}}'}</code>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving || !template.name || !template.subject}
          className="flex items-center space-x-2 px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Template</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Help Icon Component
function HelpIcon({ tooltip }: { tooltip: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block ml-1">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="text-gray-400 hover:text-blue-400 transition-colors"
      >
        <HelpCircle className="h-3 w-3" />
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

// Template Preview Component
function TemplatePreview({ 
  template, 
  previewData,
  categories
}: {
  template: Partial<EmailTemplate>;
  previewData: Record<string, any>;
  categories: EmailTemplateCategory[];
}) {
  const previewSubject = replaceVariables(template.subject || '', previewData);
  const previewHtml = replaceVariables(template.body || '', previewData);
  const category = categories.find(cat => cat.id === template.category_id);

  return (
    <div className="space-y-6">
      {/* Preview Header */}
      <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
        <h3 className="text-white font-medium mb-4">Email Preview</h3>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className="text-gray-400 text-sm w-16">From:</span>
            <span className="text-white">Car Audio Events &lt;noreply@caraudioevents.com&gt;</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-400 text-sm w-16">To:</span>
            <span className="text-white">{previewData.fullName} &lt;{previewData.email}&gt;</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-gray-400 text-sm w-16">Subject:</span>
            <span className="text-white font-medium">{previewSubject}</span>
          </div>
        </div>
      </div>

      {/* HTML Preview */}
      <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-white font-medium">HTML Version</h4>
          <span className="text-xs text-gray-400 bg-gray-600/50 px-2 py-1 rounded">
            Primary Email Format
          </span>
        </div>
        <div className="bg-white rounded-lg p-6 min-h-[300px] overflow-auto">
          <div 
            dangerouslySetInnerHTML={{ __html: previewHtml }}
            className="text-black"
          />
        </div>
      </div>

      {/* Template Info */}
      <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Template Information</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Template Name:</span>
            <div className="text-white">{template.name || 'Untitled Template'}</div>
          </div>
          <div>
            <span className="text-gray-400">Email Type:</span>
            <div className="text-white">
              {EMAIL_TYPES.find(t => t.value === template.email_type)?.label || 'Unknown'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Membership Level:</span>
            <div className="text-white">
              {MEMBERSHIP_LEVELS.find(m => m.value === template.membership_level)?.label || 'All Users'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">System Section:</span>
            <div className="text-white">
              {category ? `${category.name} - ${category.description}` : 'Not assigned'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Status:</span>
            <div className={`${template.is_active !== false ? 'text-green-400' : 'text-red-400'}`}>
              {template.is_active !== false ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
      </div>

      {/* Sample Data Notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
          <div>
            <h4 className="text-yellow-400 font-medium mb-1">Preview Notice</h4>
            <p className="text-gray-300 text-sm">
              This preview uses sample data. Actual emails will use real user data when sent.
              Variables like {'{firstName}'}, {'{email}'}, etc. will be replaced with actual values.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal Component defined in the same file
const EmailTemplateModal = ({ template, onClose }: { template: Partial<EmailTemplate> | null, onClose: (wasUpdated: boolean) => void }) => {
  const [formData, setFormData] = useState<Partial<EmailTemplate>>({ 
    name: '', 
    subject: '', 
    body: '' 
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        subject: template.subject || '',
        body: template.body || ''
      });
    } else {
      setFormData({ name: '', subject: '', body: '' });
    }
  }, [template]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    const content = editorRef.current ? editorRef.current.getContent() : '';
    const finalData = { ...formData, body: content };

    try {
      const endpoint = finalData.id 
        ? `update-email-template/${finalData.id}` 
        : 'create-email-template';
      
      const method = finalData.id ? 'POST' : 'POST';

      const { error: rpcError } = await supabase.functions.invoke(endpoint, {
        method,
        body: finalData
      });

      if (rpcError) throw rpcError;
      
      onClose(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save template.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-8 w-full max-w-3xl border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">{formData.id ? 'Edit' : 'Create'} Email Template</h2>
          <button onClick={() => onClose(false)} className="text-gray-400 hover:text-white"><X /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-900/50 text-red-300 rounded-lg">{error}</div>}
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Template Name (e.g., welcome-email)"
            value={formData.name || ''}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            disabled={!!formData.id}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white disabled:opacity-50"
          />
          <input
            type="text"
            placeholder="Email Subject"
            value={formData.subject || ''}
            onChange={e => setFormData({ ...formData, subject: e.target.value })}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white"
          />
          <Editor
            tinymceScriptSrc={getTinyMCEScriptUrl()}
            onInit={(evt, editor) => editorRef.current = editor}
            initialValue={formData.body || ''}
            init={{
              height: 400,
              base_url: '/tinymce',
              suffix: '.min',
              branding: false,
              promotion: false,
              menubar: false,
              plugins: 'lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount',
              toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent | removeformat | help',
              content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; background-color: #374151; color: #fff; }',
              skin: 'oxide-dark',
              content_css: 'dark'
            }}
          />
        </div>
        <div className="flex justify-end space-x-4 mt-6">
          <button onClick={() => onClose(false)} className="px-4 py-2 text-gray-300 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-electric-500 text-white rounded-lg disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}; 