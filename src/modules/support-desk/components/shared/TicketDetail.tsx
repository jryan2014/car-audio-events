import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { messageService } from '../../services/supabase-client';
import type { SupportTicketWithRelations, SupportTicketMessage, CreateMessageFormData } from '../../types';

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
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    loadMessages();
  }, [ticket.id]);

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
      <div className="bg-white rounded-lg shadow-md p-6">
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
          <div>
            <span className="text-gray-500">User:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {ticket.user?.name || 'Anonymous'} ({ticket.user?.email})
            </span>
          </div>
          <div>
            <span className="text-gray-500">Event:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {ticket.event?.name || 'N/A'}
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
      <div className="bg-white rounded-lg shadow-md">
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
                      : 'bg-gray-50 dark:bg-gray-700'
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
        {!canManage && ticket.status !== 'closed' && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            <form onSubmit={handleReply}>
              <div className="mb-4">
                <label htmlFor="reply" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add Reply
                </label>
                <textarea
                  id="reply"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  placeholder="Type your reply..."
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isReplying || !replyText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isReplying ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketDetail;