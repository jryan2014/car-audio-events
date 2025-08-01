import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { ticketService, messageService } from '../../services/supabase-client';
import { subscribeToTicket } from '../../services/supabase-client';
import type { 
  SupportTicketWithRelations, 
  SupportTicketMessage,
  CreateMessageFormData 
} from '../../types';

const TicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState<SupportTicketWithRelations | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState('');
  
  // Message form
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  useEffect(() => {
    if (ticketId) {
      loadTicket();
      loadMessages();
      
      // Subscribe to real-time updates
      const subscription = subscribeToTicket(ticketId, () => {
        loadTicket();
        loadMessages();
      });
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [ticketId]);
  
  const loadTicket = async () => {
    try {
      const data = await ticketService.getTicket(ticketId!);
      if (!data) {
        setError('Ticket not found');
        return;
      }
      
      // Check user has access to this ticket
      if (data.user_id !== user?.id && 
          data.organization_id !== user?.organizationId && 
          user?.membershipType !== 'admin') {
        setError('You do not have access to this ticket');
        return;
      }
      
      setTicket(data);
    } catch (error) {
      console.error('Error loading ticket:', error);
      setError('Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };
  
  const loadMessages = async () => {
    try {
      const data = await messageService.getMessages(ticketId!);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };
  
  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    setMessageLoading(true);
    setMessageError('');
    
    try {
      const formData: CreateMessageFormData = {
        message: newMessage,
        is_internal_note: isInternalNote,
        attachments: attachments
      };
      
      const message = await messageService.createMessage(ticketId!, formData);
      
      if (message) {
        setNewMessage('');
        setIsInternalNote(false);
        setAttachments([]);
        await loadMessages();
      }
    } catch (error: any) {
      console.error('Error creating message:', error);
      setMessageError(error.message || 'Failed to send message');
    } finally {
      setMessageLoading(false);
    }
  };
  
  const handleStatusChange = async (newStatus: string) => {
    try {
      await ticketService.updateTicket(ticketId!, { status: newStatus as any });
      await loadTicket();
    } catch (error) {
      console.error('Error updating status:', error);
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
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
            <p className="text-red-400">{error || 'Ticket not found'}</p>
            <Link to="/dashboard/support" className="mt-4 inline-block text-electric-500 hover:text-electric-400">
              Back to Support Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
      {/* Breadcrumb */}
      <nav className="mb-4">
        <ol className="flex items-center space-x-2 text-sm">
          <li>
            <Link to="/dashboard" className="text-gray-400 hover:text-white">
              Dashboard
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li>
            <Link to="/dashboard/support" className="text-gray-400 hover:text-white">
              Support
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-white">{ticket.ticket_number}</li>
        </ol>
      </nav>
      
      {/* Ticket Header */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {ticket.title}
            </h1>
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-400">#{ticket.ticket_number}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                {ticket.priority.toUpperCase()}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                {ticket.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
          
          {/* Status Actions */}
          {(user?.membershipType === 'admin' || user?.id === ticket.assigned_to_user_id) && (
            <div className="flex items-center space-x-2">
              <select
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="text-sm rounded-md bg-gray-700 border-gray-600 text-white"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting_on_user">Waiting on User</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Created</span>
            <p className="font-medium text-gray-200">{new Date(ticket.created_at).toLocaleString()}</p>
          </div>
          <div>
            <span className="text-gray-400">Category</span>
            <p className="font-medium text-gray-200">{ticket.request_type?.name}</p>
          </div>
          {ticket.event && (
            <div>
              <span className="text-gray-400">Event</span>
              <p className="font-medium text-gray-200">{ticket.event.title || ticket.event.event_name}</p>
            </div>
          )}
          {ticket.assigned_to_user && (
            <div>
              <span className="text-gray-400">Assigned to</span>
              <p className="font-medium text-gray-200">{ticket.assigned_to_user.name}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Conversation
        </h2>
        
        {/* Initial Description */}
        <div className="border-b border-gray-600 pb-4 mb-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium text-white">
              {ticket.user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-white">{ticket.user?.name || 'Anonymous'}</span>
                <span className="text-gray-400 text-sm">
                  {new Date(ticket.created_at).toLocaleString()}
                </span>
              </div>
              <div className="prose prose-sm max-w-none prose-invert">
                <p className="whitespace-pre-wrap text-gray-300">{ticket.description}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Messages List */}
        <div className="space-y-4 mb-6">
          {messages.map((message) => (
            <div key={message.id} className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium text-white">
                {message.user?.name?.charAt(0) || 'S'}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-white">{message.user?.name || 'System'}</span>
                  <span className="text-gray-400 text-sm">
                    {new Date(message.created_at).toLocaleString()}
                  </span>
                  {message.is_internal_note && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                      Internal Note
                    </span>
                  )}
                </div>
                
                {message.message_type === 'status_change' ? (
                  <p className="text-sm text-gray-400 italic">{message.message}</p>
                ) : (
                  <div className="prose prose-sm max-w-none prose-invert">
                    <p className="whitespace-pre-wrap text-gray-300">{message.message}</p>
                  </div>
                )}
                
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-electric-500 hover:text-electric-400 hover:underline"
                      >
                        📎 {attachment.filename}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Reply Form */}
        {ticket.status !== 'closed' && (
          <form onSubmit={handleSubmitMessage} className="border-t border-gray-600 pt-4">
            {messageError && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-md">
                <p className="text-sm text-red-400">{messageError}</p>
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="message" className="sr-only">
                Your message
              </label>
              <textarea
                id="message"
                rows={4}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500"
                required
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {(user?.membershipType === 'admin' || user?.membershipType === 'organization') && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded border-gray-600 text-electric-500 shadow-sm focus:border-electric-500 focus:ring-electric-500"
                    />
                    <span className="ml-2 text-sm text-gray-400">Internal note</span>
                  </label>
                )}
              </div>
              
              <button
                type="submit"
                disabled={messageLoading || !newMessage.trim()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-electric-500 hover:bg-electric-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-electric-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {messageLoading ? <LoadingSpinner size="sm" /> : 'Send Message'}
              </button>
            </div>
          </form>
        )}
        
        {ticket.status === 'closed' && (
          <div className="border-t border-gray-600 pt-4 text-center text-gray-400">
            This ticket is closed and cannot receive new messages.
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default TicketDetail;