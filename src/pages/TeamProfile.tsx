import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, MapPin, Globe, Trophy, Calendar, Shield, UserPlus, 
  Settings, Crown, Star, ArrowLeft, Mail, Check, X, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Team {
  id: string;
  name: string;
  description?: string;
  team_type: string;
  location?: string;
  website?: string;
  logo_url?: string;
  is_public: boolean;
  requires_approval: boolean;
  max_members: number;
  total_points: number;
  competitions_won: number;
  created_at: string;
  owner_id: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  custom_title?: string;
  joined_at: string;
  is_active: boolean;
  user: {
    id: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email: string;
    location?: string;
    profile_image?: string;
  };
}

interface JoinRequest {
  id: string;
  user_id: string;
  team_id: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user?: {
    name?: string;
    email: string;
  };
}

export default function TeamProfile() {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [joinRequestStatus, setJoinRequestStatus] = useState<string | null>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  
  useEffect(() => {
    if (teamId) {
      loadTeamData();
    }
  }, [teamId, user]);
  
  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      // Load team details
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
        
      if (teamError) throw teamError;
      
      // Check if team is public or user is a member
      if (!teamData.is_public && !user) {
        toast.error('This team is private. Please log in to view.');
        navigate('/login');
        return;
      }
      
      setTeam(teamData);
      
      // Load team members - split queries to avoid foreign key issues
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });
        
      if (membersError) throw membersError;
      
      // Load user data separately if we have members
      let enrichedMembers = membersData || [];
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map(m => m.user_id);
        
        // Fetch user data
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, first_name, last_name, email, location, profile_image')
          .in('id', userIds);
          
        // Combine the data
        enrichedMembers = membersData.map(member => ({
          ...member,
          user: usersData?.find(u => u.id === member.user_id) || null
        }));
      }
      
      setMembers(enrichedMembers);
      
      // Check if current user is a member
      if (user) {
        const currentUserMember = membersData?.find(m => m.user_id === user.id);
        if (currentUserMember) {
          setIsMember(true);
          setUserRole(currentUserMember.role);
        }
        
        // Check for pending join request
        const { data: requestData, error: requestError } = await supabase
          .from('team_join_requests')
          .select('status')
          .eq('team_id', teamId)
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .limit(1);
          
        if (!requestError && requestData && requestData.length > 0) {
          setJoinRequestStatus('pending');
        }
        
        // If user is admin or moderator, load pending requests
        if (currentUserMember && ['owner', 'president', 'vice_president', 'moderator'].includes(currentUserMember.role)) {
          const { data: requestsData, error: requestsError } = await supabase
            .from('team_join_requests')
            .select('*')
            .eq('team_id', teamId)
            .eq('status', 'pending');
            
          if (!requestsError && requestsData && requestsData.length > 0) {
            // Sort by created_at in memory
            requestsData.sort((a, b) => {
              const dateA = new Date(a.created_at).getTime();
              const dateB = new Date(b.created_at).getTime();
              return dateB - dateA; // descending order
            });
            
            // Fetch user data separately
            const userIds = requestsData.map(r => r.user_id);
            const { data: usersData } = await supabase
              .from('users')
              .select('id, name, email')
              .in('id', userIds);
              
            // Combine the data
            const enrichedRequests = requestsData.map(request => ({
              ...request,
              user: usersData?.find(u => u.id === request.user_id) || null
            }));
            setPendingRequests(enrichedRequests);
          } else {
            setPendingRequests([]);
          }
        }
      }
      
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Failed to load team information');
    } finally {
      setLoading(false);
    }
  };
  
  const handleJoinRequest = async () => {
    if (!user) {
      toast.error('Please log in to join this team');
      navigate('/login');
      return;
    }
    
    if (!team?.requires_approval) {
      // Direct join for teams that don't require approval
      try {
        const { error } = await supabase
          .from('team_members')
          .insert({
            team_id: teamId,
            user_id: user.id,
            role: 'member',
            is_active: true
          });
          
        if (error) throw error;
        
        toast.success('Successfully joined the team!');
        setIsMember(true);
        setUserRole('member');
        loadTeamData();
      } catch (error) {
        console.error('Error joining team:', error);
        toast.error('Failed to join team');
      }
    } else {
      // Show join request modal
      setShowJoinModal(true);
    }
  };
  
  const submitJoinRequest = async () => {
    try {
      const { error } = await supabase
        .from('team_join_requests')
        .insert({
          team_id: teamId,
          user_id: user!.id,
          message: joinMessage,
          status: 'pending'
        });
        
      if (error) {
        // Check if it's a duplicate request error
        if (error.message?.includes('duplicate') || error.code === '23505') {
          toast.error('You already have a pending request for this team');
        } else {
          throw error;
        }
        return;
      }
      
      toast.success('Join request submitted successfully!');
      setJoinRequestStatus('pending');
      setShowJoinModal(false);
      setJoinMessage('');
    } catch (error: any) {
      console.error('Error submitting join request:', error);
      // Check if table doesn't exist
      if (error?.message?.includes('relation') || error?.code === '42P01') {
        toast.error('Team join requests are not available yet. Please contact support.');
      } else {
        toast.error('Failed to submit join request');
      }
    }
  };
  
  const handleJoinRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        // Get the request details
        const request = pendingRequests.find(r => r.id === requestId);
        if (!request) return;
        
        // Add user to team
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: teamId,
            user_id: request.user_id,
            role: 'member',
            is_active: true
          });
          
        if (memberError) throw memberError;
      }
      
      // Update request status
      const { error } = await supabase
        .from('team_join_requests')
        .update({ 
          status: action === 'approve' ? 'approved' : 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: user!.id
        })
        .eq('id', requestId);
        
      if (error) throw error;
      
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      loadTeamData();
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      toast.error(`Failed to ${action} request`);
    }
  };
  
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-600';
      case 'president':
        return 'bg-purple-600';
      case 'vice_president':
        return 'bg-blue-600';
      case 'treasurer':
        return 'bg-green-600';
      case 'moderator':
        return 'bg-orange-600';
      default:
        return 'bg-gray-600';
    }
  };
  
  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  if (!team) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Team Not Found</h2>
          <p className="text-gray-400 mb-6">This team doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/members')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md transition-colors"
          >
            Back to Directory
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        
        {/* Team Header */}
        <div className="bg-gray-800 rounded-lg overflow-hidden mb-8">
          <div className="p-8">
            <div className="flex items-start space-x-6">
              {/* Team Logo */}
              <div className="w-32 h-32 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                {team.logo_url ? (
                  <img 
                    src={team.logo_url} 
                    alt={team.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="w-12 h-12 text-gray-500" />
                )}
              </div>
              
              {/* Team Info */}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{team.name}</h1>
                  {!team.is_public && (
                    <span className="bg-red-600/20 text-red-400 px-2 py-1 rounded text-sm">
                      Private
                    </span>
                  )}
                </div>
                
                {team.description && (
                  <p className="text-gray-300 mb-4">{team.description}</p>
                )}
                
                <div className="flex flex-wrap gap-4 text-gray-400">
                  {team.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{team.location}</span>
                    </div>
                  )}
                  
                  {team.website && (
                    <a 
                      href={team.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 hover:text-primary-400 transition-colors"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Website</span>
                    </a>
                  )}
                  
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{members.length} / {team.max_members} members</span>
                  </div>
                  
                  {team.total_points > 0 && (
                    <div className="flex items-center space-x-1">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span>{team.total_points} points</span>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="mt-6 flex items-center space-x-4">
                  {!isMember && !joinRequestStatus && (
                    <button
                      onClick={handleJoinRequest}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2"
                    >
                      <UserPlus className="w-5 h-5" />
                      <span>Join Team</span>
                    </button>
                  )}
                  
                  {joinRequestStatus === 'pending' && (
                    <div className="bg-yellow-600/20 text-yellow-400 px-4 py-2 rounded-md flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Join Request Pending</span>
                    </div>
                  )}
                  
                  {isMember && userRole === 'owner' && (
                    <button
                      onClick={() => navigate(`/profile?tab=teams&editTeam=${teamId}`)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2"
                    >
                      <Settings className="w-5 h-5" />
                      <span>Manage Team</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Pending Requests (for admins) */}
        {pendingRequests.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-yellow-500" />
              <span>Pending Join Requests</span>
            </h2>
            
            <div className="space-y-3">
              {pendingRequests.map(request => (
                <div key={request.id} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {request.user?.name || request.user?.email}
                    </p>
                    {request.message && (
                      <p className="text-gray-400 text-sm mt-1">{request.message}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleJoinRequestAction(request.id, 'approve')}
                      className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-md transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleJoinRequestAction(request.id, 'reject')}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Team Members */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-6">Team Members</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(member => (
              <div key={member.id} className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-600 rounded-full overflow-hidden flex items-center justify-center">
                    {member.user.profile_image ? (
                      <img 
                        src={member.user.profile_image}
                        alt={member.user.name || member.user.email}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="text-white font-medium">
                      {member.user.name || `${member.user.first_name} ${member.user.last_name}` || member.user.email}
                    </p>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded ${getRoleBadgeColor(member.role)} text-white`}>
                        {formatRole(member.role)}
                      </span>
                      
                      {member.custom_title && (
                        <span className="text-xs text-gray-400">
                          {member.custom_title}
                        </span>
                      )}
                    </div>
                    
                    {member.user.location && (
                      <p className="text-xs text-gray-500 mt-1">
                        {member.user.location}
                      </p>
                    )}
                  </div>
                  
                  {member.role === 'owner' && (
                    <Crown className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {members.length === 0 && (
            <p className="text-gray-400 text-center py-8">
              No members yet. Be the first to join!
            </p>
          )}
        </div>
      </div>
      
      {/* Join Request Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Request to Join Team</h3>
            
            <p className="text-gray-400 mb-4">
              This team requires approval to join. Add a message to introduce yourself:
            </p>
            
            <textarea
              value={joinMessage}
              onChange={(e) => setJoinMessage(e.target.value)}
              placeholder="Hi, I'd like to join your team because..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
              rows={4}
            />
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinMessage('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitJoinRequest}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md transition-colors"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}