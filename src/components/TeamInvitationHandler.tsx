import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';

interface TeamInvitationHandlerProps {
  invitationId: string;
  teamId: string;
  teamName: string;
  onAccept?: () => void;
  onDecline?: () => void;
}

export const TeamInvitationHandler: React.FC<TeamInvitationHandlerProps> = ({
  invitationId,
  teamId,
  teamName,
  onAccept,
  onDecline
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAcceptInvite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    setIsProcessing(true);
    try {
      // Update invitation status
      const { error: inviteError } = await supabase
        .from('team_invitations')
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (inviteError) throw inviteError;

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: user.id,
          role: 'member',
          joined_at: new Date().toISOString(),
          is_active: true
        });

      if (memberError) throw memberError;

      showSuccess('Team Joined', `You have successfully joined ${teamName}`);
      onAccept?.();
    } catch (error) {
      console.error('Error accepting team invite:', error);
      showError('Failed to join team', 'Please try again later');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineInvite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ 
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (error) throw error;

      showSuccess('Invitation Declined', `You have declined the invitation to join ${teamName}`);
      onDecline?.();
    } catch (error) {
      console.error('Error declining team invite:', error);
      showError('Failed to decline invitation', 'Please try again later');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleAcceptInvite}
        disabled={isProcessing}
        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
        title="Accept invitation"
      >
        <Check className="h-3 w-3" />
        <span>Accept</span>
      </button>
      <button
        onClick={handleDeclineInvite}
        disabled={isProcessing}
        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
        title="Decline invitation"
      >
        <X className="h-3 w-3" />
        <span>Decline</span>
      </button>
    </div>
  );
};

export default TeamInvitationHandler;