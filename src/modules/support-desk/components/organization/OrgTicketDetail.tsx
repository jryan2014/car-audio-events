import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import TicketDetail from '../shared/TicketDetail';
import { ticketService } from '../../services/supabase-client';
import type { SupportTicketWithRelations } from '../../types';

const OrgTicketDetail: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useAuth();
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
    if (!ticketId || !user?.organizationId) return;
    
    try {
      const data = await ticketService.getTicket(ticketId);
      
      // Verify the ticket belongs to the organization
      if (data.organization_id !== user.organizationId) {
        setError('You do not have permission to view this ticket');
        return;
      }
      
      setTicket(data);
    } catch (error) {
      console.error('Error loading ticket:', error);
      setError('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: Partial<SupportTicketWithRelations>) => {
    if (!ticketId) return;
    
    try {
      await ticketService.updateTicket(ticketId, updates);
      await loadTicket();
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  };

  const handleBack = () => {
    navigate('/organization/support/tickets');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
        <button
          onClick={handleBack}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to tickets
        </button>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <button
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to tickets
        </button>
      </div>
      
      <TicketDetail
        ticket={ticket}
        onUpdate={handleUpdate}
        onReload={loadTicket}
        canManage={false} // Organizations can view but not manage tickets
      />
    </div>
  );
};

export default OrgTicketDetail;