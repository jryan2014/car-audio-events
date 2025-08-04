import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  EyeOff,
  Edit,
  Trash2,
  UserX,
  Shield,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Power
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../components/NotificationSystem';

interface Team {
  id: string;
  name: string;
  description: string;
  team_type: string;
  location?: string;
  logo_url?: string;
  is_public: boolean;
  is_active: boolean;
  requires_approval: boolean;
  max_members: number;
  total_points: number;
  owner_id: string;
  owner_email?: string;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  joined_at: string;
  is_active: boolean;
}

const AdminTeams: React.FC = () => {
  const { showSuccess, showError } = useNotifications();
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    filterTeams();
  }, [teams, searchTerm, filterType]);

  const loadTeams = async () => {
    try {
      setIsLoading(true);
      
      // Load all teams
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts for each team
      const teamsWithCounts = await Promise.all((teamsData || []).map(async (team) => {
        const { count } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id)
          .eq('is_active', true);

        return {
          ...team,
          member_count: count || 0
        };
      }));

      setTeams(teamsWithCounts);
    } catch (error) {
      console.error('Error loading teams:', error);
      showError('Failed to load teams', 'Please try again later');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          is_active
        `)
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      const formattedMembers = (data || []).map(member => ({
        id: member.id,
        user_id: member.user_id,
        user_name: 'User', // Simplified due to RLS restrictions
        user_email: '',     // Simplified due to RLS restrictions
        role: member.role,
        joined_at: member.joined_at,
        is_active: member.is_active
      }));

      setTeamMembers(prev => ({
        ...prev,
        [teamId]: formattedMembers
      }));
    } catch (error) {
      console.error('Error loading team members:', error);
      showError('Failed to load team members', 'Please try again later');
    }
  };

  const filterTeams = () => {
    let filtered = teams;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(team => 
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply visibility filter
    if (filterType === 'public') {
      filtered = filtered.filter(team => team.is_public);
    } else if (filterType === 'private') {
      filtered = filtered.filter(team => !team.is_public);
    }

    setFilteredTeams(filtered);
  };

  const toggleTeamExpansion = async (teamId: string) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
    } else {
      setExpandedTeamId(teamId);
      if (!teamMembers[teamId]) {
        await loadTeamMembers(teamId);
      }
    }
  };

  const toggleTeamVisibility = async (teamId: string, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ is_public: !currentVisibility })
        .eq('id', teamId);

      if (error) throw error;

      showSuccess(
        'Visibility Updated',
        `Team is now ${!currentVisibility ? 'public' : 'private'}`
      );
      loadTeams();
    } catch (error) {
      console.error('Error updating team visibility:', error);
      showError('Failed to update visibility', 'Please try again later');
    }
  };

  const toggleTeamActiveStatus = async (teamId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ is_active: !currentStatus })
        .eq('id', teamId);

      if (error) throw error;

      showSuccess(
        'Status Updated',
        `Team is now ${!currentStatus ? 'active' : 'inactive'}`
      );
      loadTeams();
    } catch (error) {
      console.error('Error updating team status:', error);
      showError('Failed to update status', 'Please try again later');
    }
  };

  const removeTeamMember = async (teamId: string, memberId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;

      showSuccess('Member Removed', `${memberName} has been removed from the team`);
      loadTeamMembers(teamId);
    } catch (error) {
      console.error('Error removing team member:', error);
      showError('Failed to remove member', 'Please try again later');
    }
  };

  const deleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      showSuccess('Team Deleted', 'The team has been permanently deleted');
      setShowDeleteConfirm(null);
      loadTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      showError('Failed to delete team', 'Please try again later');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-600';
      case 'captain': return 'bg-blue-600';
      case 'co-captain': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Team Management</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-400">
            Total Teams: <span className="text-white font-medium">{teams.length}</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
                type="text"
                placeholder="Search teams by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-electric-500"
              >
                <option value="all">All Teams</option>
                <option value="public">Public Teams</option>
                <option value="private">Private Teams</option>
              </select>
            </div>
          </div>
        </div>

      {/* Teams List */}
      {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-electric-500 border-t-transparent rounded-full"></div>
          </div>
        ) : filteredTeams.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No teams found matching your criteria.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTeams.map((team) => (
              <div key={team.id} className="bg-gray-800 rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      {team.logo_url ? (
                        <img 
                          src={team.logo_url} 
                          alt={`${team.name} logo`}
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center">
                          <Users className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-xl font-semibold text-white">{team.name}</h3>
                          {!team.is_active && (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-600/20 text-red-400">
                              Inactive
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            team.is_public 
                              ? 'bg-green-600/20 text-green-400' 
                              : 'bg-gray-600/20 text-gray-400'
                          }`}>
                            {team.is_public ? 'Public' : 'Private'}
                          </span>
                          {team.requires_approval && (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-600/20 text-blue-400">
                              Requires Approval
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-2">{team.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Type: <span className="text-gray-300">{team.team_type}</span></span>
                          {team.location && <span>Location: <span className="text-gray-300">{team.location}</span></span>}
                          <span>Members: <span className="text-gray-300">{team.member_count}/{team.max_members}</span></span>
                          <span>Points: <span className="text-gray-300">{team.total_points.toLocaleString()}</span></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleTeamActiveStatus(team.id, team.is_active)}
                        className={`p-2 transition-colors ${
                          team.is_active 
                            ? 'text-green-400 hover:text-red-400' 
                            : 'text-red-400 hover:text-green-400'
                        }`}
                        title={team.is_active ? 'Deactivate Team' : 'Activate Team'}
                      >
                        <Power className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => toggleTeamVisibility(team.id, team.is_public)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        title={team.is_public ? 'Make Private' : 'Make Public'}
                      >
                        {team.is_public ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                      <button
                        onClick={() => toggleTeamExpansion(team.id)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        title="View Members"
                      >
                        {expandedTeamId === team.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(team.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        title="Delete Team"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Members Section */}
                {expandedTeamId === team.id && (
                  <div className="border-t border-gray-700 p-6">
                    <h4 className="text-white font-medium mb-4">Team Members ({teamMembers[team.id]?.length || 0})</h4>
                    {teamMembers[team.id] ? (
                      <div className="space-y-2">
                        {teamMembers[team.id].map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className={`px-2 py-1 text-xs rounded-full text-white ${getRoleBadgeColor(member.role)}`}>
                                {member.role}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-500 text-sm">
                                Joined {new Date(member.joined_at).toLocaleDateString()}
                              </span>
                              {member.role !== 'owner' && (
                                <button
                                  onClick={() => removeTeamMember(team.id, member.id, member.user_name)}
                                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                  title="Remove Member"
                                >
                                  <UserX className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin h-6 w-6 border-2 border-electric-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Delete Confirmation */}
                {showDeleteConfirm === team.id && (
                  <div className="border-t border-gray-700 p-4 bg-red-900/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <span className="text-red-400">Are you sure you want to delete this team? This action cannot be undone.</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => deleteTeam(team.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Delete Team
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export default AdminTeams;