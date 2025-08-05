import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { messageService, cannedResponseService } from '../../services/supabase-client';
import { useAuth } from '../../../../contexts/AuthContext';
import { Shield } from 'lucide-react';
import type { SupportTicketWithRelations, SupportTicketMessage, CreateMessageFormData, SupportCannedResponse } from '../../types';

interface TicketDetailProps {
  ticket: SupportTicketWithRelations;
  onUpdate: (updates: Partial<SupportTicketWithRelations>) => Promise<void>;
  onReload: () => Promise<void>;
  canManage: boolean;
}

const TicketDetail: React.FC<TicketDetailProps> = ({
  ticket,
  onUpdate,
  onReload,
  canManage
}) => {
  const navigate = useNavigate();
  const { impersonateUser } = useAuth();
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [cannedResponses, setCannedResponses] = useState<SupportCannedResponse[]>([]);
  const [showCannedResponseModal, setShowCannedResponseModal] = useState(false);
  const [newCannedResponse, setNewCannedResponse] = useState({ name: '', content: '', category: '' });

  useEffect(() => {
    loadMessages();
    if (canManage) {
      loadCannedResponses();
    }
  }, [ticket.id, canManage]);

  const loadMessages = async () => {
    try {
      const data = await messageService.getMessages(ticket.id);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCannedResponses = async () => {
    try {
      const data = await cannedResponseService.getCannedResponses();
      setCannedResponses(data);
    } catch (error) {
      console.error('Error loading canned responses:', error);
    }
  };

  const handleCannedResponseSelect = (response: SupportCannedResponse) => {
    setReplyText(response.content);
  };

  const handleSaveAsCannedResponse = async () => {
    if (!replyText.trim() || !newCannedResponse.name.trim()) return;

    try {
      await cannedResponseService.createCannedResponse({
        name: newCannedResponse.name,
        content: replyText,
        category: newCannedResponse.category || null,
        is_active: true
      });
      
      setShowCannedResponseModal(false);
      setNewCannedResponse({ name: '', content: '', category: '' });
      await loadCannedResponses();
    } catch (error) {
      console.error('Error saving canned response:', error);
    }
  };

  const handleImpersonate = async () => {
    if (!ticket.user_id) return;
    
    try {
      await impersonateUser(ticket.user_id);
      // Navigate to the user's dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to impersonate user:', error);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsReplying(true);
    try {
      const messageData: CreateMessageFormData = {
        message: replyText,
        is_internal_note: false
      };

      await messageService.createMessage(ticket.id, messageData);
      setReplyText('');
      await loadMessages();
      await onReload();
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setIsReplying(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'normal': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'waiting_on_user': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-purple-600 bg-purple-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Ticket Header */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              #{ticket.ticket_number}
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300 mt-1">
              {ticket.title}
            </p>
          </div>
          <div className="flex space-x-2">
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
              {ticket.status.replace('_', ' ')}
            </span>
            <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
              {ticket.priority}
            </span>
          </div>
        </div>
        
        {/* User Information Section */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">User Information</h3>
          {ticket.user ? (
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">Name:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {ticket.user.name}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">Email:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {ticket.user.email}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">Membership:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {ticket.user.membership_type || 'None'}
                </span>
              </div>
              {canManage && (
                <div className="flex items-center pt-2 space-x-4">
                  <a 
                    href={`/admin/users/${ticket.user.id}`}
                    className="text-sm text-electric-500 hover:text-electric-400"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Full Profile →
                  </a>
                  <button
                    onClick={handleImpersonate}
                    className="inline-flex items-center px-3 py-1 text-sm bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
                    title="Impersonate this user"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    Impersonate
                  </button>
                </div>
              )}
            </div>
          ) : ticket.anonymous_email ? (
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">Name:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {ticket.anonymous_first_name} {ticket.anonymous_last_name}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">Email:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {ticket.anonymous_email}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 w-24">Status:</span>
                <span className="text-sm text-yellow-600 font-medium">
                  Anonymous User
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No user information available</div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Created:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {new Date(ticket.created_at).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Type:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {ticket.request_type?.name || 'N/A'}
            </span>
          </div>
          {ticket.subcategory && (
            <div>
              <span className="text-gray-500">Subcategory:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {ticket.subcategory.name}
              </span>
            </div>
          )}
          {ticket.event && (
            <div className="col-span-full">
              <span className="text-gray-500">Event:</span>
              <div className="ml-2 inline-flex items-center gap-3">
                <a
                  href={`/events/${ticket.event.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-electric-500 hover:text-electric-400 underline inline-flex items-center gap-1"
                >
                  {ticket.event.event_name || ticket.event.title}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                {canManage && (
                  <>
                    <span className="text-gray-500">|</span>
                    <a
                      href={`/events/${ticket.event.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-300 text-sm inline-flex items-center gap-1"
                    >
                      Edit Event
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </>
                )}
              </div>
            </div>
          )}
          {ticket.related_invoice && (
            <div className="col-span-full">
              <span className="text-gray-500">Invoice:</span>
              <div className="ml-2 inline-flex items-center gap-2">
                <span className="text-gray-900 dark:text-white">
                  {ticket.related_invoice.stripe_invoice_id} - ${(ticket.related_invoice.amount_due / 100).toFixed(2)}
                </span>
                {canManage && (
                  <a
                    href={`/admin/billing?search=${ticket.related_invoice.stripe_invoice_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-electric-500 hover:text-electric-400 text-sm inline-flex items-center gap-1"
                  >
                    View in Billing
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}
          {ticket.related_transaction && (
            <div className="col-span-full">
              <span className="text-gray-500">Transaction:</span>
              <div className="ml-2 inline-flex items-center gap-2">
                <span className="text-gray-900 dark:text-white">
                  {ticket.related_transaction.description || ticket.related_transaction.provider_transaction_id} - ${(ticket.related_transaction.amount / 100).toFixed(2)}
                </span>
                {canManage && (
                  <a
                    href={`/admin/billing?search=${ticket.related_transaction.provider_transaction_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-electric-500 hover:text-electric-400 text-sm inline-flex items-center gap-1"
                  >
                    View in Billing
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}
          <div>
            <span className="text-gray-500">Source:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {ticket.source || 'web'}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
          <div className="text-gray-900 dark:text-white whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Messages ({messages.length})
          </h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="medium" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No messages yet</p>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.is_internal_note 
                      ? 'bg-yellow-50 border-l-4 border-yellow-400'
                      : 'bg-gray-700/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        User #{message.user_id?.slice(-8) || 'System'}
                      </span>
                      {message.is_internal_note && (
                        <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded">
                          Internal Note
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(message.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {message.message}
                  </div>
                  {message.attachments?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-500 mb-1">Attachments:</p>
                      <div className="space-y-1">
                        {message.attachments.map((attachment, index) => (
                          <a
                            key={index}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm block"
                          >
                            {attachment.filename} ({Math.round(attachment.size / 1024)}KB)
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply Form */}
        {(canManage || ticket.status !== 'closed') && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <form onSubmit={handleReply}>
              {/* Canned Response Dropdown (Admin only) */}
              {canManage && cannedResponses.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Canned Response
                  </label>
                  <select
                    onChange={(e) => {
                      const response = cannedResponses.find(r => r.id === e.target.value);
                      if (response) {
                        handleCannedResponseSelect(response);
                      }
                    }}
                    className="block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-electric-500 focus:ring-electric-500"
                    defaultValue=""
                  >
                    <option value="">Select a canned response...</option>
                    {Object.entries(
                      cannedResponses.reduce((acc, response) => {
                        const category = response.category || 'Uncategorized';
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(response);
                        return acc;
                      }, {} as Record<string, SupportCannedResponse[]>)
                    ).map(([category, responses]) => (
                      <optgroup key={category} label={category}>
                        {responses.map(response => (
                          <option key={response.id} value={response.id}>
                            {response.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="reply" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {canManage ? 'Reply' : 'Add Reply'}
                </label>
                <textarea
                  id="reply"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-electric-500 focus:ring-electric-500"
                  placeholder="Type your reply..."
                  required
                />
              </div>
              
              <div className="flex justify-between">
                {/* Save as Canned Response Button (Admin only) */}
                {canManage && replyText.trim() && (
                  <button
                    type="button"
                    onClick={() => setShowCannedResponseModal(true)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Save as Canned Response
                  </button>
                )}
                
                <div className={`${canManage && replyText.trim() ? '' : 'w-full'} flex justify-end`}>
                  <button
                    type="submit"
                    disabled={isReplying || !replyText.trim()}
                    className="px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600 focus:outline-none focus:ring-2 focus:ring-electric-500 disabled:opacity-50"
                  >
                    {isReplying ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
      
      {/* Canned Response Save Modal */}
      {showCannedResponseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Save as Canned Response
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="canned-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  id="canned-name"
                  type="text"
                  value={newCannedResponse.name}
                  onChange={(e) => setNewCannedResponse({ ...newCannedResponse, name: e.target.value })}
                  className="block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-electric-500 focus:ring-electric-500"
                  placeholder="e.g., Welcome Message"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="canned-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  id="canned-category"
                  type="text"
                  value={newCannedResponse.category}
                  onChange={(e) => setNewCannedResponse({ ...newCannedResponse, category: e.target.value })}
                  className="block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-electric-500 focus:ring-electric-500"
                  placeholder="e.g., General, Technical Support"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Content Preview
                </label>
                <div className="bg-gray-700/50 p-3 rounded-md text-sm text-gray-300 max-h-32 overflow-y-auto">
                  {replyText}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCannedResponseModal(false);
                  setNewCannedResponse({ name: '', content: '', category: '' });
                }}
                className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAsCannedResponse}
                disabled={!newCannedResponse.name.trim()}
                className="px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600 focus:outline-none focus:ring-2 focus:ring-electric-500 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetail;