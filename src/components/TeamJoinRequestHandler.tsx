import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from './NotificationSystem';

interface TeamJoinRequestHandlerProps {
  requestId: string;
  userId: string;
  userName: string;
  teamId: string;
  teamName: string;
  onApprove?: () => void;
  onReject?: () => void;
}

export const TeamJoinRequestHandler: React.FC<TeamJoinRequestHandlerProps> = ({
  requestId,
  userId,
  userName,
  teamId,
  teamName,
  onApprove,
  onReject
}) => {
  const { showSuccess, showError } = useNotifications();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('approve_team_join_request', {
        request_id: requestId
      });

      if (error) throw error;

      if (data) {
        showSuccess('Request Approved', `${userName} has been added to ${teamName}`);
        onApprove?.();
      } else {
        showError('Failed to approve request', 'You may not have permission to approve this request');
      }
    } catch (error) {
      console.error('Error approving join request:', error);
      showError('Failed to approve request', 'Please try again later');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('reject_team_join_request', {
        request_id: requestId,
        rejection_message: 'Your request to join the team has been declined.'
      });

      if (error) throw error;

      if (data) {
        showSuccess('Request Declined', `The join request from ${userName} has been declined`);
        onReject?.();
      } else {
        showError('Failed to decline request', 'You may not have permission to decline this request');
      }
    } catch (error) {
      console.error('Error rejecting join request:', error);
      showError('Failed to decline request', 'Please try again later');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center space-x-2 mt-2">
      <button
        onClick={handleApprove}
        disabled={isProcessing}
        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
        title="Approve join request"
      >
        <Check className="h-3 w-3" />
        <span>Approve</span>
      </button>
      <button
        onClick={handleReject}
        disabled={isProcessing}
        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
        title="Decline join request"
      >
        <X className="h-3 w-3" />
        <span>Decline</span>
      </button>
    </div>
  );
};

export default TeamJoinRequestHandler;