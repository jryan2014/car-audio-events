import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { SupportTicketWithRelations, TicketStatus, TicketPriority } from '../../types';

interface TicketActionsProps {
  ticket: SupportTicketWithRelations;
  onUpdate: (updates: Partial<SupportTicketWithRelations>) => Promise<void>;
  onReload: () => Promise<void>;
}

const TicketActions: React.FC<TicketActionsProps> = ({ ticket, onUpdate, onReload }) => {
  const [updating, setUpdating] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const statuses: TicketStatus[] = ['open', 'in_progress', 'waiting_on_user', 'resolved', 'closed'];
  const priorities: TicketPriority[] = ['low', 'normal', 'high', 'urgent'];

  const handleStatusChange = async (status: TicketStatus) => {
    setUpdating(true);
    try {
      await onUpdate({ status });
      await onReload();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
      setShowStatusMenu(false);
    }
  };

  const handlePriorityChange = async (priority: TicketPriority) => {
    setUpdating(true);
    try {
      await onUpdate({ priority });
      await onReload();
    } catch (error) {
      console.error('Error updating priority:', error);
    } finally {
      setUpdating(false);
      setShowPriorityMenu(false);
    }
  };

  const handleMarkAsSpam = async () => {
    if (!confirm('Are you sure you want to mark this ticket as spam?')) return;
    
    setUpdating(true);
    try {
      await onUpdate({ is_spam: true, status: 'closed' });
      await onReload();
    } catch (error) {
      console.error('Error marking as spam:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-600';
      case 'in_progress': return 'bg-blue-600';
      case 'waiting_on_user': return 'bg-yellow-600';
      case 'resolved': return 'bg-purple-600';
      case 'closed': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'normal': return 'bg-blue-600';
      case 'low': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Status Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          disabled={updating}
          className={`px-4 py-2 rounded-md text-white font-medium text-sm flex items-center space-x-2 ${getStatusColor(ticket.status)} hover:opacity-90 disabled:opacity-50`}
        >
          <span>{ticket.status.replace('_', ' ')}</span>
          <ChevronDown className="h-4 w-4" />
        </button>
        
        {showStatusMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Priority Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowPriorityMenu(!showPriorityMenu)}
          disabled={updating}
          className={`px-4 py-2 rounded-md text-white font-medium text-sm flex items-center space-x-2 ${getPriorityColor(ticket.priority)} hover:opacity-90 disabled:opacity-50`}
        >
          <span>{ticket.priority}</span>
          <ChevronDown className="h-4 w-4" />
        </button>
        
        {showPriorityMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700">
            {priorities.map((priority) => (
              <button
                key={priority}
                onClick={() => handlePriorityChange(priority)}
                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                {priority}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mark as Spam */}
      {!ticket.is_spam && ticket.status !== 'closed' && (
        <button
          onClick={handleMarkAsSpam}
          disabled={updating}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
        >
          Mark as Spam
        </button>
      )}
    </div>
  );
};

export default TicketActions;