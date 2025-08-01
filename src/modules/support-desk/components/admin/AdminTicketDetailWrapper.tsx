import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ticketService, messageService } from '../../services/supabase-client';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import TicketDetail from '../shared/TicketDetail';
import TicketActions from './TicketActions';
import type { SupportTicketWithRelations } from '../../types';

const AdminTicketDetailWrapper: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<SupportTicketWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ticketId) {
      loadTicket();
    }
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      const data = await ticketService.getTicket(ticketId!);
      if (!data) {
        setError('Ticket not found');
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

  const handleUpdate = async (updates: Partial<SupportTicketWithRelations>) => {
    if (!ticket) return;
    
    try {
      await ticketService.updateTicket(ticket.id, updates);
      await loadTicket();
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <p className="text-red-400">{error || 'Ticket not found'}</p>
            <Link to="/admin/support" className="mt-4 inline-block text-electric-500 hover:text-electric-400">
              ← Back to Tickets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Admin Header */}
        <div className="mb-6">
          <Link
            to="/admin/support"
            className="inline-flex items-center text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Tickets
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Ticket #{ticket.ticket_number}
              </h1>
              <p className="text-gray-400">
                Admin view - Manage ticket details and responses
              </p>
            </div>
            
            {/* Admin Actions */}
            <TicketActions
              ticket={ticket}
              onUpdate={handleUpdate}
              onReload={loadTicket}
            />
          </div>
        </div>

        {/* Use shared TicketDetail component with admin permissions */}
        <TicketDetail
          ticket={ticket}
          onUpdate={handleUpdate}
          onReload={loadTicket}
          canManage={true}
        />
      </div>
    </div>
  );
};

export default AdminTicketDetailWrapper;