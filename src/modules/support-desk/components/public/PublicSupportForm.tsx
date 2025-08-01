import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import HCaptcha, { HCaptchaRef } from '../../../../components/HCaptcha';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { 
  requestTypeService, 
  fieldService, 
  ticketService, 
  eventService,
  subcategoryService,
  billingDataService 
} from '../../services/supabase-client';
import { EmailVerificationModal } from './EmailVerificationModal';
import { CustomFieldRenderer } from '../shared/CustomFieldRenderer';
import { getCSRFToken } from '../../../../utils/csrfProtection';
import type { 
  SupportRequestType, 
  CreateTicketFormData, 
  SupportFieldDefinition,
  SupportRequestSubcategory 
} from '../../types';

const PublicSupportForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const captchaRef = useRef<HCaptchaRef>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<CreateTicketFormData>({
    title: '',
    description: '',
    request_type_id: '',
    subcategory_id: undefined,
    event_id: undefined,
    related_invoice_id: undefined,
    related_transaction_id: undefined,
    priority: 'normal',
    custom_fields: {},
    email: '',
    anonymous_first_name: '',
    anonymous_last_name: ''
  });
  
  // Request types and fields
  const [requestTypes, setRequestTypes] = useState<SupportRequestType[]>([]);
  const [customFields, setCustomFields] = useState<SupportFieldDefinition[]>([]);
  const [selectedRequestType, setSelectedRequestType] = useState<SupportRequestType | null>(null);
  const [availableEvents, setAvailableEvents] = useState<Array<{id: string, title: string, event_name: string, start_date: string}>>([]);
  const [subcategories, setSubcategories] = useState<SupportRequestSubcategory[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState<SupportRequestSubcategory | null>(null);
  const [userInvoices, setUserInvoices] = useState<Array<{id: string, stripe_invoice_id: string, amount_due: number, status: string, period_start: string}>>([]);
  const [userTransactions, setUserTransactions] = useState<Array<{id: string, provider_transaction_id: string, amount: number, status: string, created_at: string, description: string}>>([]);
  
  // Email verification for public users
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  
  // Check for pre-verified email from verification page
  useEffect(() => {
    const stateEmail = location.state?.verifiedEmail;
    const sessionEmail = sessionStorage.getItem('verified_support_email');
    
    if (stateEmail) {
      setVerifiedEmail(stateEmail);
      setFormData(prev => ({ ...prev, email: stateEmail }));
      // Clear session storage
      sessionStorage.removeItem('verified_support_email');
    } else if (sessionEmail) {
      setVerifiedEmail(sessionEmail);
      setFormData(prev => ({ ...prev, email: sessionEmail }));
      // Clear session storage
      sessionStorage.removeItem('verified_support_email');
    }
  }, [location]);
  
  // Load request types on mount
  useEffect(() => {
    loadRequestTypes();
  }, [user]);
  
  const loadRequestTypes = async () => {
    try {
      const userRole = user?.membershipType || 'public';
      const types = await requestTypeService.getRequestTypesForRole(userRole);
      setRequestTypes(types);
    } catch (error) {
      console.error('Error loading request types:', error);
      setError('Failed to load support categories');
    }
  };
  
  // Load custom fields when request type changes
  useEffect(() => {
    if (formData.request_type_id) {
      loadCustomFields();
    }
  }, [formData.request_type_id]);
  
  const loadCustomFields = async () => {
    try {
      const userRole = user?.membershipType || 'public';
      const fields = await fieldService.getFieldsForContext(
        formData.request_type_id,
        userRole,
        false // frontend context
      );
      setCustomFields(fields);
    } catch (error) {
      console.error('Error loading custom fields:', error);
    }
  };
  
  const loadEvents = async () => {
    try {
      const events = await eventService.getEventsForSupport(user?.id);
      setAvailableEvents(events);
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load events. Please try again.');
    }
  };
  
  const loadSubcategories = async (requestTypeId: string) => {
    try {
      const subs = await subcategoryService.getSubcategoriesForRequestType(requestTypeId);
      setSubcategories(subs);
    } catch (error) {
      console.error('Error loading subcategories:', error);
    }
  };
  
  const loadUserInvoices = async () => {
    if (!user) return;
    try {
      const invoices = await billingDataService.getUserInvoices(user.id);
      setUserInvoices(invoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
    }
  };
  
  const loadUserTransactions = async () => {
    if (!user) return;
    try {
      const transactions = await billingDataService.getUserTransactions(user.id);
      setUserTransactions(transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'request_type_id') {
      const requestType = requestTypes.find(rt => rt.id === value);
      setSelectedRequestType(requestType || null);
      
      // Reset dependent fields
      setFormData(prev => ({ 
        ...prev, 
        subcategory_id: undefined,
        event_id: undefined,
        related_invoice_id: undefined,
        related_transaction_id: undefined
      }));
      setSubcategories([]);
      setSelectedSubcategory(null);
      
      // Load events if required
      if (requestType && requestType.requires_event) {
        loadEvents();
      }
      
      // Load subcategories if this is billing
      if (requestType && requestType.name === 'Billing Question') {
        loadSubcategories(value);
      }
    }
    
    if (name === 'subcategory_id') {
      const subcategory = subcategories.find(sc => sc.id === value);
      setSelectedSubcategory(subcategory || null);
      
      // Reset billing data fields
      setFormData(prev => ({ 
        ...prev, 
        related_invoice_id: undefined,
        related_transaction_id: undefined
      }));
      
      // Load appropriate billing data based on subcategory
      if (subcategory && user) {
        if (subcategory.requires_additional_data === 'invoice') {
          loadUserInvoices();
        } else if (subcategory.requires_additional_data === 'transaction') {
          loadUserTransactions();
        }
      }
    }
  };
  
  const handleCustomFieldChange = (fieldKey: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [fieldKey]: value
      }
    }));
  };
  
  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!formData.title || !formData.description || !formData.request_type_id) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate subcategory if subcategories exist
    if (subcategories.length > 0 && !formData.subcategory_id) {
      setError('Please select a specific issue type');
      return;
    }
    
    // Validate invoice selection if required
    if (selectedSubcategory?.requires_additional_data === 'invoice' && !formData.related_invoice_id) {
      setError('Please select an invoice');
      return;
    }
    
    // Validate transaction selection if required
    if (selectedSubcategory?.requires_additional_data === 'transaction' && !formData.related_transaction_id) {
      setError('Please select a transaction');
      return;
    }
    
    if (selectedRequestType?.requires_event && !formData.event_id) {
      setError('Please select an event for this type of request');
      return;
    }
    
    // Validate custom fields
    for (const field of customFields) {
      if (field.is_required && !formData.custom_fields?.[field.field_key]) {
        setError(`${field.label} is required`);
        return;
      }
    }
    
    // Public users need email verification
    if (!user && !verifiedEmail) {
      if (!formData.email) {
        setError('Email address is required');
        return;
      }
      
      if (!formData.anonymous_first_name || !formData.anonymous_last_name) {
        setError('First and last name are required');
        return;
      }
      
      // Check if captcha is required (bypass only in development)
      const isDevelopment = import.meta.env.DEV;
      
      if (!captchaToken && !isDevelopment) {
        setError('Please complete the captcha verification');
        return;
      }
      
      // Use test token only in development
      if (isDevelopment && !captchaToken) {
        setCaptchaToken('test-token-for-development');
      }
      
      setShowEmailVerification(true);
      return;
    }
    
    // Submit ticket
    setLoading(true);
    
    try {
      const ticketData: CreateTicketFormData = {
        ...formData,
        captcha_token: captchaToken || (import.meta.env.DEV ? 'test-token-for-development' : ''),
        email: user ? undefined : verifiedEmail,
        anonymous_email: user ? undefined : verifiedEmail,
        anonymous_first_name: user ? undefined : formData.anonymous_first_name,
        anonymous_last_name: user ? undefined : formData.anonymous_last_name,
        csrf_token: getCSRFToken()
      };
      
      const ticket = await ticketService.createTicket(ticketData);
      
      if (ticket) {
        setSuccess(true);
        
        // Redirect after 3 seconds
        setTimeout(() => {
          if (user) {
            navigate(`/dashboard/support/ticket/${ticket.id}`);
          } else {
            navigate('/support/success', { 
              state: { ticketNumber: ticket.ticket_number } 
            });
          }
        }, 3000);
      }
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      setError(error.message || 'Failed to create support ticket');
      captchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmailVerified = (email: string) => {
    setVerifiedEmail(email);
    setShowEmailVerification(false);
    
    // Auto-submit form after email verification
    const form = document.getElementById('support-form') as HTMLFormElement;
    form?.requestSubmit();
  };
  
  if (success) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Support Ticket Created Successfully!
            </h2>
            <p className="text-gray-300 mb-4">
              Your support request has been submitted. We'll get back to you as soon as possible.
            </p>
            {user ? (
              <p className="text-sm text-gray-400">Redirecting to your ticket...</p>
            ) : (
              <p className="text-sm text-gray-400">
                You'll receive an email confirmation at {verifiedEmail || formData.email}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-white mb-6">
            Contact Support
          </h1>
          
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-700 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        
        <form id="support-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Name and Email fields for public users */}
          {!user && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="anonymous_first_name" className="block text-sm font-medium text-gray-300">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="anonymous_first_name"
                    name="anonymous_first_name"
                    value={formData.anonymous_first_name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label htmlFor="anonymous_last_name" className="block text-sm font-medium text-gray-300">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="anonymous_last_name"
                    name="anonymous_last_name"
                    value={formData.anonymous_last_name}
                    onChange={handleInputChange}
                    required
                    className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={!!verifiedEmail}
                  className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500 disabled:bg-gray-600"
                  placeholder="john.doe@example.com"
                />
                {verifiedEmail && (
                  <p className="mt-1 text-sm text-green-400">
                    ✓ Email verified
                  </p>
                )}
              </div>
            </>
          )}
          
          {/* Request Type */}
          <div>
            <label htmlFor="request_type_id" className="block text-sm font-medium text-gray-300">
              What can we help you with? *
            </label>
            <select
              id="request_type_id"
              name="request_type_id"
              value={formData.request_type_id}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white focus:border-electric-500 focus:ring-electric-500"
            >
              <option value="">Select a category</option>
              {requestTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {selectedRequestType?.description && (
              <p className="mt-1 text-sm text-gray-400">
                {selectedRequestType.description}
              </p>
            )}
          </div>
          
          {/* Subcategory selector for billing questions */}
          {subcategories.length > 0 && (
            <div>
              <label htmlFor="subcategory_id" className="block text-sm font-medium text-gray-300">
                What type of billing issue? *
              </label>
              <select
                id="subcategory_id"
                name="subcategory_id"
                value={formData.subcategory_id || ''}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white focus:border-electric-500 focus:ring-electric-500"
              >
                <option value="">Select a specific issue</option>
                {subcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
              {selectedSubcategory?.description && (
                <p className="mt-1 text-sm text-gray-400">
                  {selectedSubcategory.description}
                </p>
              )}
            </div>
          )}
          
          {/* Invoice selector for invoice inquiries */}
          {selectedSubcategory?.requires_additional_data === 'invoice' && userInvoices.length > 0 && (
            <div>
              <label htmlFor="related_invoice_id" className="block text-sm font-medium text-gray-300">
                Which invoice? *
              </label>
              <select
                id="related_invoice_id"
                name="related_invoice_id"
                value={formData.related_invoice_id || ''}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white focus:border-electric-500 focus:ring-electric-500"
              >
                <option value="">Select an invoice</option>
                {userInvoices.map(invoice => {
                  const invoiceDate = new Date(invoice.period_start).toLocaleDateString();
                  const amount = (invoice.amount_due / 100).toFixed(2);
                  return (
                    <option key={invoice.id} value={invoice.id}>
                      Invoice {invoice.stripe_invoice_id} - ${amount} - {invoiceDate} ({invoice.status})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          
          {/* Transaction selector for refund requests */}
          {selectedSubcategory?.requires_additional_data === 'transaction' && userTransactions.length > 0 && (
            <div>
              <label htmlFor="related_transaction_id" className="block text-sm font-medium text-gray-300">
                Which transaction? *
              </label>
              <select
                id="related_transaction_id"
                name="related_transaction_id"
                value={formData.related_transaction_id || ''}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white focus:border-electric-500 focus:ring-electric-500"
              >
                <option value="">Select a transaction</option>
                {userTransactions.map(transaction => {
                  const transactionDate = new Date(transaction.created_at).toLocaleDateString();
                  const amount = (transaction.amount / 100).toFixed(2);
                  return (
                    <option key={transaction.id} value={transaction.id}>
                      {transaction.description || `Transaction ${transaction.provider_transaction_id}`} - ${amount} - {transactionDate}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          
          {/* Event selector if required */}
          {selectedRequestType?.requires_event && (
            <div>
              <label htmlFor="event_id" className="block text-sm font-medium text-gray-300">
                Related Event *
              </label>
              <select
                id="event_id"
                name="event_id"
                value={formData.event_id || ''}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white focus:border-electric-500 focus:ring-electric-500"
              >
                <option value="">Select an event</option>
                {availableEvents.map(event => {
                  const eventDate = new Date(event.start_date).toLocaleDateString();
                  return (
                    <option key={event.id} value={event.id}>
                      {event.event_name || event.title} - {eventDate}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300">
              Subject *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              maxLength={200}
              className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
              placeholder="Brief summary of your issue"
            />
          </div>
          
          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300">
              How can we help? *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              rows={6}
              className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
              placeholder="Please provide as much detail as possible..."
            />
          </div>
          
          {/* Priority - Only show for authenticated users */}
          {user && (
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-300">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 rounded-md bg-gray-700 border-gray-600 text-white focus:border-electric-500 focus:ring-electric-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          )}
          
          {/* Custom Fields */}
          {customFields.map(field => (
            <CustomFieldRenderer
              key={field.id}
              field={field}
              value={formData.custom_fields?.[field.field_key]}
              onChange={(value) => handleCustomFieldChange(field.field_key, value)}
              error={undefined}
            />
          ))}
          
          {/* Captcha for public users */}
          {!user && !verifiedEmail && (
            <div className="flex justify-center">
              <HCaptcha
                ref={captchaRef}
                onVerify={handleCaptchaVerify}
                onError={() => setError('Captcha verification failed')}
                onExpire={() => setCaptchaToken('')}
              />
            </div>
          )}
          
          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={loading} /* Temporarily simplified for testing */
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-electric-500 hover:bg-electric-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-electric-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <LoadingSpinner size="small" />
              ) : (
                'Submit Support Request'
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
      
      {/* Email Verification Modal */}
      {showEmailVerification && (
        <EmailVerificationModal
          email={formData.email}
          captchaToken={captchaToken}
          onVerified={handleEmailVerified}
          onClose={() => setShowEmailVerification(false)}
        />
      )}
    </div>
  );
};

export default PublicSupportForm;