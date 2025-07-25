import React, { useState, useEffect } from 'react';
import { User, Car, Trophy, Star, Calendar, Edit, Save, X, Upload, Users, Settings, Plus, Trash2, Award, Target, Shield, AlertTriangle, CheckCircle, FileCheck, MapPin, Phone, Globe, Wrench, Search, UserPlus, Crown, Building, HelpCircle, Camera, UserCheck, UserX, Zap, DollarSign, ExternalLink, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../components/NotificationSystem';
import { Link } from 'react-router-dom';
import NewsletterPreferences from '../components/NewsletterPreferences';

interface AudioSystem {
  id: string;
  name: string;
  description: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  system_type: string;
  is_primary: boolean;
  components: AudioComponent[];
}

interface AudioComponent {
  id: string;
  component_type?: string;
  category?: string; // For backward compatibility
  brand: string;
  model: string;
  notes?: string;
  description?: string; // For backward compatibility
  specifications?: any;
  power_watts?: number; // For backward compatibility
  price?: number;
}

interface CompetitionResult {
  id: string;
  event_title: string;
  category: string;
  overall_score?: number;
  placement?: number;
  total_participants?: number;
  points_earned: number;
  competed_at: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  role: string;
  member_count: number;
  total_points: number;
  logo_url?: string;
}

interface UserStats {
  total_competitions: number;
  total_points: number;
  average_score: number;
  best_placement: number;
  wins: number;
  podium_finishes: number;
}

interface AvailableTeam {
  id: string;
  name: string;
  description: string;
  team_type: 'competitive' | 'social' | 'professional' | 'club';
  location?: string;
  member_count: number;
  max_members: number;
  total_points: number;
  owner_name: string;
  is_public: boolean;
  requires_approval: boolean;
}

interface TeamMember {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: 'owner' | 'president' | 'vice_president' | 'treasurer' | 'moderator' | 'member';
  custom_title?: string;
  joined_at: string;
  points_contributed: number;
  is_active: boolean;
  permissions: string[];
}

interface TeamRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  icon: any;
  hierarchy_level: number;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError, showInfo } = useNotifications();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [audioSystems, setAudioSystems] = useState<AudioSystem[]>([]);
  const [competitionResults, setCompetitionResults] = useState<CompetitionResult[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [availableTeams, setAvailableTeams] = useState<AvailableTeam[]>([]);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showBrowseTeamsModal, setShowBrowseTeamsModal] = useState(false);
  const [teamSearchQuery, setTeamSearchQuery] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  
  // Form states
  const [profileData, setProfileData] = useState({
    name: user?.name || user?.email || '',
    email: user?.email || '',
    location: user?.location || '',
    phone: user?.phone || '',
    website: user?.website || '',
    bio: user?.bio || ''
  });

  const [teamFormData, setTeamFormData] = useState({
    name: '',
    description: '',
    team_type: 'competitive' as const,
    location: '',
    website: '',
    is_public: true,
    requires_approval: true,
    max_members: 50
  });

  const [memberFormData, setMemberFormData] = useState({
    role: 'member' as 'owner' | 'president' | 'vice_president' | 'treasurer' | 'moderator' | 'member',
    custom_title: '',
    permissions: [] as string[]
  });

  const teamTypes = [
    { id: 'competitive', name: 'Competitive', icon: Trophy, color: 'red' },
    { id: 'social', name: 'Social', icon: Users, color: 'blue' },
    { id: 'professional', name: 'Professional', icon: Building, color: 'purple' },
    { id: 'club', name: 'Club', icon: Crown, color: 'green' }
  ];

  const teamRoles: TeamRole[] = [
    {
      id: 'owner',
      name: 'Team Owner',
      description: 'Full control over team settings and members',
      permissions: ['manage_team', 'manage_members', 'manage_roles', 'manage_finances', 'delete_team'],
      color: 'yellow',
      icon: Crown,
      hierarchy_level: 100
    },
    {
      id: 'president',
      name: 'President',
      description: 'Lead the team and make strategic decisions',
      permissions: ['manage_members', 'manage_roles', 'manage_events', 'view_finances'],
      color: 'purple',
      icon: Star,
      hierarchy_level: 90
    },
    {
      id: 'vice_president',
      name: 'Vice President',
      description: 'Assist president and manage day-to-day operations',
      permissions: ['manage_members', 'manage_events', 'moderate_discussions'],
      color: 'blue',
      icon: Shield,
      hierarchy_level: 80
    },
    {
      id: 'treasurer',
      name: 'Treasurer',
      description: 'Manage team finances and expenses',
      permissions: ['manage_finances', 'view_finances', 'manage_events'],
      color: 'green',
      icon: DollarSign,
      hierarchy_level: 70
    },
    {
      id: 'moderator',
      name: 'Moderator',
      description: 'Help moderate discussions and assist members',
      permissions: ['moderate_discussions', 'assist_members'],
      color: 'orange',
      icon: Zap,
      hierarchy_level: 60
    },
    {
      id: 'member',
      name: 'Member',
      description: 'Standard team member',
      permissions: ['participate_events', 'view_team_info'],
      color: 'gray',
      icon: Users,
      hierarchy_level: 50
    }
  ];

  const teamPermissions = [
    { id: 'manage_team', name: 'Manage Team Settings', description: 'Edit team information and settings' },
    { id: 'manage_members', name: 'Manage Members', description: 'Add, remove, and edit member roles' },
    { id: 'manage_roles', name: 'Manage Roles', description: 'Create and edit custom roles' },
    { id: 'manage_finances', name: 'Manage Finances', description: 'Handle team expenses and payments' },
    { id: 'view_finances', name: 'View Finances', description: 'View team financial information' },
    { id: 'manage_events', name: 'Manage Events', description: 'Create and manage team events' },
    { id: 'moderate_discussions', name: 'Moderate Discussions', description: 'Moderate team chat and discussions' },
    { id: 'assist_members', name: 'Assist Members', description: 'Help and support team members' },
    { id: 'participate_events', name: 'Participate in Events', description: 'Join team events and competitions' },
    { id: 'view_team_info', name: 'View Team Info', description: 'Access basic team information' },
    { id: 'delete_team', name: 'Delete Team', description: 'Permanently delete the team' }
  ];

  // Verification states
  const [verificationDocuments, setVerificationDocuments] = useState<File[]>([]);
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [editingSystem, setEditingSystem] = useState<AudioSystem | null>(null);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [showSystemLinksModal, setShowSystemLinksModal] = useState(false);
  const [systemLinks, setSystemLinks] = useState<any[]>([]);
  const [linkFormData, setLinkFormData] = useState({
    title: '',
    url: '',
    link_type: 'build_thread'
  });
  const [systemFormData, setSystemFormData] = useState({
    name: '',
    description: '',
    vehicle_year: '' as string | number,
    vehicle_make: '',
    vehicle_model: '',
    system_type: 'spl',
    is_primary: false
  });
  const [componentFormData, setComponentFormData] = useState({
    category: '',
    brand: '',
    model: '',
    description: '',
    power_watts: '' as string | number,
    rms_watts: '' as string | number,
    impedance: '',
    size: '',
    quantity: 1,
    price: '' as string | number
  });
  const [selectedTeamForManagement, setSelectedTeamForManagement] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showMemberManagementModal, setShowMemberManagementModal] = useState(false);
  const [showRoleEditModal, setShowRoleEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showTeamEditModal, setShowTeamEditModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamEditData, setTeamEditData] = useState({
    name: '',
    description: '',
    team_type: 'competitive' as const,
    location: '',
    website: '',
    is_public: true,
    requires_approval: true,
    max_members: 50
  });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [foundUsers, setFoundUsers] = useState<any[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpTopic, setHelpTopic] = useState('');
  const [userPreferences, setUserPreferences] = useState<any>(null);
  const [favoriteEvents, setFavoriteEvents] = useState<any[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<any[]>([]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'verification', label: 'Verification', icon: Shield },
    { id: 'system', label: 'Audio System', icon: Car },
    { id: 'competitions', label: 'Competitions', icon: Trophy },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Check URL for tab parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && tabs.some(tab => tab.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);
  useEffect(() => {
    if (user) {
      // Update profile data when user changes
      setProfileData({
        name: user.name || user.email || '',
        email: user.email || '',
        location: user.location || '',
        phone: user.phone || '',
        website: user.website || '',
        bio: user.bio || ''
      });
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Only load data that exists in current database schema
      await Promise.all([
        loadAudioSystems(), // Load audio systems
        // loadCompetitionResults(), // Skip - table doesn't exist
        loadTeams(), // Load teams data
        // loadUserStats() // Skip - function doesn't exist
      ]);
      console.log('✅ User data loaded (limited to available features)');
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAudioSystems = async () => {
    try {
      const { data: systems, error } = await supabase
        .from('user_audio_systems')
        .select('*')
        .eq('user_id', user!.id)
        .order('is_primary', { ascending: false });

      if (error) {
        console.error('Error loading audio systems:', error);
        return;
      }

      // Ensure components array exists for each system
      setAudioSystems((systems || []).map(system => ({
        ...system,
        components: Array.isArray(system.components) ? system.components : []
      })));
    } catch (error) {
      console.error('Error in loadAudioSystems:', error);
    }
  };

  const loadCompetitionResults = async () => {
    const { data: results, error } = await supabase
      .from('competition_results')
      .select(`
        *,
        events!inner(title)
      `)
      .eq('user_id', user!.id)
      .order('competed_at', { ascending: false });

    if (error) {
      console.error('Error loading competition results:', error);
      return;
    }

    const formattedResults = (results || []).map(result => ({
      id: result.id,
      event_title: result.events.title,
      category: result.category,
      overall_score: result.overall_score,
      placement: result.placement,
      total_participants: result.total_participants,
      points_earned: result.points_earned,
      competed_at: result.competed_at
    }));

    setCompetitionResults(formattedResults);
  };

  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          team_id,
          role,
          teams (
            id,
            name,
            description,
            team_type,
            location,
            website,
            is_public,
            requires_approval,
            max_members,
            total_points,
            competitions_won,
            logo_url
          )
        `)
        .eq('user_id', user!.id)
        .eq('is_active', true);

      if (error) throw error;

      const transformedTeams: Team[] = (data || []).map((membership: any) => ({
        id: membership.teams.id,
        name: membership.teams.name,
        description: membership.teams.description,
        team_type: membership.teams.team_type,
        location: membership.teams.location,
        website: membership.teams.website,
        is_public: membership.teams.is_public,
        requires_approval: membership.teams.requires_approval,
        max_members: membership.teams.max_members,
        role: membership.role,
        member_count: 0, // Will be populated separately if needed
        total_points: membership.teams.total_points,
        logo_url: membership.teams.logo_url
      }));

      setTeams(transformedTeams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadUserStats = async () => {
    const { data, error } = await supabase
      .rpc('get_user_competition_stats', { user_uuid: user!.id });

    if (error) {
      console.error('Error loading user stats:', error);
      return;
    }

    setUserStats(data);
  };

  const handleProfileUpdate = async () => {
    if (!user) return;

    try {
      setSaveStatus('saving');
      
      // Use the same update logic as EditUser component for consistency
      const updateData: any = {
        name: profileData.name,
        location: profileData.location || null,
        phone: profileData.phone || null,
        updated_at: new Date().toISOString()
      };

      // Add website and bio if they exist (currently they don't)
      // These will be available after database enhancement
      if (profileData.website) {
        console.log('Website update skipped - field may not exist in current schema');
      }
      if (profileData.bio) {
        console.log('Bio update skipped - field may not exist in current schema');
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      setSaveStatus('success');
      setIsEditing(false);
      
      // Refresh user profile in auth context
      await refreshUser();
      
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleAddSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_audio_systems')
        .insert({
          user_id: user.id,
          ...systemFormData
        })
        .select()
        .single();

      if (error) throw error;

      await loadAudioSystems();
      setShowSystemModal(false);
      showSuccess('System Added', `${systemFormData.name} has been added to your profile.`);
      // Reset form
      setSystemFormData({
        name: '',
        description: '',
        vehicle_year: '',
        vehicle_make: '',
        vehicle_model: '',
        system_type: 'spl',
        is_primary: false
      });
    } catch (error: any) {
      console.error('Error creating audio system:', error);
      showError('Failed to Add System', error.message || 'Please try again later.');
    }
  };

  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSystemId) return;

    try {
      // Build component object
      const newComponent = {
        id: crypto.randomUUID(),
        category: componentFormData.category,
        brand: componentFormData.brand,
        model: componentFormData.model,
        description: componentFormData.description,
        specifications: {
          power_watts: componentFormData.power_watts || null,
          rms_watts: componentFormData.rms_watts || null,
          impedance: componentFormData.impedance || null,
          size: componentFormData.size || null,
          quantity: componentFormData.quantity || 1
        },
        price: componentFormData.price || null,
        created_at: new Date().toISOString()
      };

      // Find the system and update its components
      const system = audioSystems.find(s => s.id === selectedSystemId);
      if (!system) throw new Error('System not found');

      // Get existing components or initialize empty array
      const existingComponents = system.components || [];
      const updatedComponents = [...existingComponents, newComponent];

      // Update the system with new components array
      const { error } = await supabase
        .from('user_audio_systems')
        .update({
          components: updatedComponents,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedSystemId);

      if (error) throw error;

      showSuccess('Component Added', `${componentFormData.brand} ${componentFormData.model} has been added to your system.`);

      await loadAudioSystems();
      setShowComponentModal(false);
      setSelectedSystemId(null);
      // Reset form
      setComponentFormData({
        category: '',
        brand: '',
        model: '',
        description: '',
        power_watts: '',
        rms_watts: '',
        impedance: '',
        size: '',
        quantity: 1,
        price: ''
      });
    } catch (error: any) {
      console.error('Error adding component:', error);
      showError('Failed to Add Component', error.message || 'Please try again later.');
    }
  };

  const handleDeleteSystem = async (systemId: string) => {
    if (!confirm('Are you sure you want to delete this audio system? This will also delete all components and links.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_audio_systems')
        .delete()
        .eq('id', systemId);

      if (error) throw error;

      await loadAudioSystems();
    } catch (error) {
      console.error('Error deleting system:', error);
      alert('Error deleting system. Please try again.');
    }
  };

  const handleAddSystemLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSystemId) return;

    try {
      const { error } = await supabase
        .from('audio_system_links')
        .insert({
          system_id: selectedSystemId,
          ...linkFormData
        });

      if (error) throw error;

      await loadSystemLinks(selectedSystemId);
      showSuccess('Link Added', 'System link has been added successfully.');
      // Reset form
      setLinkFormData({
        title: '',
        url: '',
        link_type: 'build_thread'
      });
    } catch (error: any) {
      console.error('Error adding link:', error);
      showError('Failed to Add Link', error.message || 'Please try again later.');
    }
  };

  const handleDeleteSystemLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from('audio_system_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      if (selectedSystemId) {
        await loadSystemLinks(selectedSystemId);
      }
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('Error deleting link. Please try again.');
    }
  };

  const loadSystemLinks = async (systemId: string) => {
    try {
      const { data, error } = await supabase
        .from('audio_system_links')
        .select('*')
        .eq('system_id', systemId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSystemLinks(data || []);
    } catch (error) {
      console.error('Error loading system links:', error);
      setSystemLinks([]);
    }
  };

  const loadAvailableTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          description,
          team_type,
          location,
          max_members,
          total_points,
          is_public,
          requires_approval,
          users (name),
          team_members(count)
        `)
        .eq('is_public', true)
        .order('total_points', { ascending: false });

      if (error) throw error;

      const transformedTeams: AvailableTeam[] = (data || []).map((team: any) => ({
        id: team.id,
        name: team.name,
        description: team.description || '',
        team_type: team.team_type || 'competitive',
        location: team.location,
        member_count: Array.isArray(team.team_members) ? team.team_members.length : 0,
        max_members: team.max_members,
        total_points: team.total_points,
        owner_name: team.users?.name || 'Unknown',
        is_public: team.is_public,
        requires_approval: team.requires_approval
      }));

      setAvailableTeams(transformedTeams);
    } catch (error) {
      console.error('Failed to load available teams:', error);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          users (name, email)
        `)
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      const transformedMembers: TeamMember[] = (data || []).map((member: any) => {
        const role = teamRoles.find(r => r.id === member.role) || teamRoles.find(r => r.id === 'member')!;
        return {
          id: member.id,
          user_id: member.user_id,
          user_name: member.users?.name || 'Unknown',
          user_email: member.users?.email || '',
          role: member.role,
          custom_title: member.custom_title,
          joined_at: member.joined_at,
          points_contributed: member.points_contributed || 0,
          is_active: member.is_active,
          permissions: role.permissions
        };
      });

      setTeamMembers(transformedMembers);
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  };

  const handleLogoUpload = async (file: File, teamId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `team-logo-${teamId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('team-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('teams')
        .update({ logo_url: publicUrl })
        .eq('id', teamId);

      if (updateError) throw updateError;

      return publicUrl;
    } catch (error) {
      console.error('Failed to upload logo:', error);
      throw error;
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string, customTitle?: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ 
          role: newRole,
          custom_title: customTitle || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      if (error) throw error;

      // Reload team members
      if (selectedTeamForManagement) {
        loadTeamMembers(selectedTeamForManagement.id);
      }
    } catch (error) {
      console.error('Failed to update member role:', error);
      throw error;
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;

      // Reload team members
      if (selectedTeamForManagement) {
        loadTeamMembers(selectedTeamForManagement.id);
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      throw error;
    }
  };

  const getRoleInfo = (roleId: string) => {
    return teamRoles.find(r => r.id === roleId) || teamRoles.find(r => r.id === 'member')!;
  };

  const canManageRole = (currentUserRole: string, targetRole: string) => {
    const currentRole = getRoleInfo(currentUserRole);
    const targetRoleInfo = getRoleInfo(targetRole);
    return currentRole.hierarchy_level > targetRoleInfo.hierarchy_level;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleJoinTeam = async (teamId: string, requiresApproval: boolean) => {
    try {
      if (requiresApproval) {
        // Create an invitation request
        const { error } = await supabase
          .from('team_invitations')
          .insert([{
            team_id: teamId,
            invited_user_id: user!.id,
            invited_by_user_id: user!.id, // Self-invitation (join request)
            message: 'Requesting to join the team',
            status: 'pending'
          }]);

        if (error) throw error;
        alert('Join request sent! The team owner will review your request.');
      } else {
        // Join directly
        const { error } = await supabase
          .from('team_members')
          .insert([{
            team_id: teamId,
            user_id: user!.id,
            role: 'member',
            is_active: true,
            points_contributed: 0
          }]);

        if (error) throw error;
        alert('Successfully joined the team!');
        loadTeams();
      }
      setShowBrowseTeamsModal(false);
    } catch (error) {
      console.error('Failed to join team:', error);
      alert('Failed to join team. You may already be a member.');
    }
  };

  const handleCreateTeam = async () => {
    try {
      setSaveStatus('saving');

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([{
          name: teamFormData.name,
          description: teamFormData.description,
          team_type: teamFormData.team_type,
          location: teamFormData.location,
          website: teamFormData.website,
          is_public: teamFormData.is_public,
          requires_approval: teamFormData.requires_approval,
          max_members: teamFormData.max_members,
          owner_id: user!.id,
          total_points: 0,
          competitions_won: 0
        }])
        .select()
        .single();

      if (teamError) throw teamError;

      // Upload logo if provided
      let logoUrl = '';
      if (logoFile) {
        logoUrl = await handleLogoUpload(logoFile, teamData.id);
      }

      // Add the creator as the owner member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert([{
          team_id: teamData.id,
          user_id: user!.id,
          role: 'owner',
          is_active: true,
          points_contributed: 0
        }]);

      if (memberError) throw memberError;

      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setShowCreateTeamModal(false);
        setTeamFormData({
          name: '',
          description: '',
          team_type: 'competitive',
          location: '',
          website: '',
          is_public: true,
          requires_approval: true,
          max_members: 50
        });
        setLogoFile(null);
        setLogoPreview('');
        loadTeams();
      }, 1500);

    } catch (error) {
      console.error('Failed to create team:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team);
    setTeamEditData({
      name: team.name,
      description: team.description || '',
      team_type: 'competitive', // Default since it's not in the Team interface
      location: '',
      website: '',
      is_public: true,
      requires_approval: true,
      max_members: 50
    });
    setLogoPreview(team.logo_url || '');
    setShowTeamEditModal(true);
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;
    
    try {
      setSaveStatus('saving');

      // Upload new logo if provided
      let logoUrl = editingTeam.logo_url;
      if (logoFile) {
        logoUrl = await handleLogoUpload(logoFile, editingTeam.id);
      }

      const { error } = await supabase
        .from('teams')
        .update({
          name: teamEditData.name,
          description: teamEditData.description,
          team_type: teamEditData.team_type,
          location: teamEditData.location,
          website: teamEditData.website,
          is_public: teamEditData.is_public,
          requires_approval: teamEditData.requires_approval,
          max_members: teamEditData.max_members,
          logo_url: logoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingTeam.id);

      if (error) throw error;

      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setShowTeamEditModal(false);
        setEditingTeam(null);
        setLogoFile(null);
        setLogoPreview('');
        loadTeams();
      }, 1500);

    } catch (error) {
      console.error('Failed to update team:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const searchUsers = async (email: string) => {
    if (!email || email.length < 3) {
      setFoundUsers([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, location')
        .ilike('email', `%${email}%`)
        .limit(5);

      if (error) throw error;
      setFoundUsers(data || []);
    } catch (error) {
      console.error('Failed to search users:', error);
      setFoundUsers([]);
    }
  };

  const generateInviteLink = (teamId: string) => {
    const baseUrl = window.location.origin;
    const inviteToken = btoa(`${teamId}:${Date.now()}`);
    return `${baseUrl}/invite/${inviteToken}`;
  };

  const handleInviteUser = async (userId: string) => {
    if (!selectedTeamForManagement) return;

    try {
      setSaveStatus('saving');

      const { error } = await supabase
        .from('team_invitations')
        .insert([{
          team_id: selectedTeamForManagement.id,
          invited_user_id: userId,
          invited_by_user_id: user!.id,
          message: inviteMessage,
          status: 'pending'
        }]);

      if (error) throw error;

      setSaveStatus('success');
      setInviteEmail('');
      setInviteMessage('');
      setFoundUsers([]);
      loadPendingInvitations(selectedTeamForManagement.id);
      
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to send invitation:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const loadPendingInvitations = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select(`
          *,
          invited_user:users!invited_user_id(name, email),
          invited_by:users!invited_by_user_id(name)
        `)
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Failed to load invitations:', error);
      setPendingInvitations([]);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;
      
      if (selectedTeamForManagement) {
        loadPendingInvitations(selectedTeamForManagement.id);
      }
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
    }
  };

  const getTeamTypeIcon = (type: string) => {
    const teamType = teamTypes.find(t => t.id === type);
    return teamType ? teamType.icon : Trophy;
  };

  const getTeamTypeColor = (type: string) => {
    const teamType = teamTypes.find(t => t.id === type);
    return teamType ? teamType.color : 'red';
  };

  const filteredTeams = availableTeams.filter(team =>
    team.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
    team.description.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
    team.location?.toLowerCase().includes(teamSearchQuery.toLowerCase())
  );

  // Helper tooltip component
  const FieldHelper = ({ text }: { text: string }) => (
    <div className="relative group inline-block ml-2">
      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-300 cursor-help" />
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 border border-gray-700">
        {text}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 mb-8 border border-gray-700/50">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            <div className="relative">
              <div className="w-24 h-24 bg-electric-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <button className="absolute bottom-0 right-0 bg-electric-500 text-white p-2 rounded-full hover:bg-electric-600 transition-colors">
                <Upload className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-white mb-2">{user?.name}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-400 mb-4">
                <span className="bg-electric-500/20 text-electric-400 px-3 py-1 rounded-full text-sm font-medium">
                  {user?.membershipType}
                </span>
                {user?.location && <span>{user.location}</span>}
                <span>Member since {new Date().getFullYear()}</span>
              </div>
              <p className="text-gray-300 max-w-2xl leading-relaxed">{user?.bio || 'No bio provided'}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/notifications"
                className="bg-gray-700 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-600 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Bell className="h-4 w-4" />
                <span>Notifications</span>
              </Link>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-electric-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 flex items-center space-x-2"
              >
                {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                <span>{isEditing ? 'Save' : 'Edit'}</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          {userStats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mt-8 pt-8 border-t border-gray-700/50">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">{userStats?.total_competitions || 0}</div>
                <div className="text-gray-400 text-sm">Competitions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-electric-400 mb-1">{userStats?.total_points || 0}</div>
                <div className="text-gray-400 text-sm">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-400 mb-1">{userStats?.average_score || 0}</div>
                <div className="text-gray-400 text-sm">Avg Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">#{userStats?.best_placement || 'N/A'}</div>
                <div className="text-gray-400 text-sm">Best Rank</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1">{userStats?.wins || 0}</div>
                <div className="text-gray-400 text-sm">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">{userStats?.podium_finishes || 0}</div>
                <div className="text-gray-400 text-sm">Podiums</div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-800/50 p-1 rounded-xl border border-gray-700/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-electric-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'profile' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Full Name</label>
                    <input 
                      type="text" 
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      disabled={!isEditing}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Email</label>
                    <input 
                      type="email" 
                      value={profileData.email}
                      disabled
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Location</label>
                    <input 
                      type="text" 
                      value={profileData.location}
                      onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                      disabled={!isEditing}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Phone</label>
                    <input 
                      type="tel" 
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      disabled={!isEditing}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Website</label>
                    <input 
                      type="url" 
                      value={profileData.website}
                      onChange={(e) => setProfileData({...profileData, website: e.target.value})}
                      disabled={!isEditing}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Bio</label>
                  <textarea 
                    value={profileData.bio}
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    disabled={!isEditing}
                    rows={8}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50 resize-none"
                    placeholder="Tell us about yourself, your car audio journey, and your goals..."
                  />
                </div>
              </div>
              {isEditing && (
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProfileUpdate}
                    className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                <Shield className="h-5 w-5 text-electric-500" />
                <span>Account Verification</span>
              </h2>
              
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user?.verificationStatus === 'verified' ? 'bg-green-500' :
                    user?.verificationStatus === 'rejected' ? 'bg-red-500' :
                    user?.verificationStatus === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}>
                    {user?.verificationStatus === 'verified' ? <CheckCircle className="h-5 w-5 text-white" /> :
                     user?.verificationStatus === 'rejected' ? <X className="h-5 w-5 text-white" /> :
                     user?.verificationStatus === 'pending' ? <AlertTriangle className="h-5 w-5 text-white" /> :
                     <Shield className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Verification Status: {user?.verificationStatus === 'verified' ? 'Verified' :
                                           user?.verificationStatus === 'rejected' ? 'Rejected' :
                                           user?.verificationStatus === 'pending' ? 'Pending Approval' : 'Unverified'}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {user?.verificationStatus === 'verified' ? 'Your account has been fully verified.' :
                       user?.verificationStatus === 'rejected' ? 'Your verification was rejected. Please submit new documents.' :
                       user?.verificationStatus === 'pending' ? 'Your verification is pending review by our team.' : 
                       'Please submit verification documents to verify your account.'}
                    </p>
                  </div>
                </div>
                
                {user?.verificationStatus === 'pending' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-yellow-400 font-medium">Verification in Progress</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Your verification documents are being reviewed by our team. This process typically takes 1-2 business days.
                    </p>
                  </div>
                )}

                {user?.verificationStatus === 'verified' && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-400 font-medium">Verification Complete</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Your account has been fully verified. You now have access to all platform features.
                    </p>
                  </div>
                )}

                {/* Verification Requirements Based on Membership Type */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                      <FileCheck className="h-5 w-5 text-electric-500" />
                      <span>Verification Requirements</span>
                      <FieldHelper text="Different membership types require different levels of verification to ensure platform security and authenticity." />
                    </h3>

                    {/* Basic Competitor - Email Only */}
                    {user?.membershipType === 'competitor' && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <h4 className="text-blue-400 font-medium mb-2">Basic Competitor Verification</h4>
                        <div className="space-y-2 text-sm text-gray-300">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Email verification (required)</span>
                          </div>
                          <p className="text-gray-400 ml-6">
                            Basic competitors only need to verify their email address to participate in events.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Pro Competitor - Billing Verification */}
                    {user?.membershipType === 'pro_competitor' && (
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                        <h4 className="text-purple-400 font-medium mb-2">Pro Competitor Verification</h4>
                        <div className="space-y-2 text-sm text-gray-300">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Email verification (required)</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span>Payment method verification (required)</span>
                          </div>
                          <p className="text-gray-400 ml-6">
                            Pro competitors must verify their payment method to access premium features and advanced competition categories.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Retailer/Manufacturer - Business Verification */}
                    {(user?.membershipType === 'retailer' || user?.membershipType === 'manufacturer') && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <h4 className="text-green-400 font-medium mb-2">Business Verification Required</h4>
                        <div className="space-y-3 text-sm text-gray-300">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Business license or registration certificate</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Tax ID or EIN documentation</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Proof of business address (utility bill, lease agreement, etc.)</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Photo ID of business owner or authorized representative</span>
                            </div>
                          </div>
                          <div className="bg-gray-700/50 rounded-lg p-3 mt-3">
                            <p className="text-gray-400 text-xs">
                              <strong>Important:</strong> All documents will be reviewed by our team within 1-2 business days. 
                              Ensure all documents are clear, current, and match your business information exactly.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Organization - Similar to Business */}
                    {user?.membershipType === 'organization' && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                        <h4 className="text-orange-400 font-medium mb-2">Organization Verification Required</h4>
                        <div className="space-y-3 text-sm text-gray-300">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Organization registration or incorporation documents</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Tax-exempt status documentation (if applicable)</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Proof of organization address</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span>Photo ID of authorized representative</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {user?.verificationStatus !== 'verified' && (
                  <div className="mt-6">
                    <button className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2">
                      <Upload className="h-4 w-4" />
                      <span>Upload Verification Documents</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Audio Systems</h2>
                <button
                  onClick={() => setShowSystemModal(true)}
                  className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add System</span>
                </button>
              </div>

              {audioSystems.map((system) => (
                <div key={system.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                        <span>{system.name}</span>
                        {system.is_primary && (
                          <span className="bg-electric-500 text-white px-2 py-1 rounded text-xs">Primary</span>
                        )}
                      </h3>
                      {system.vehicle_make && (
                        <p className="text-gray-400">
                          {system.vehicle_year} {system.vehicle_make} {system.vehicle_model}
                        </p>
                      )}
                      {system.description && (
                        <p className="text-gray-300 mt-2">{system.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={async () => {
                          setSelectedSystemId(system.id);
                          await loadSystemLinks(system.id);
                          setShowSystemLinksModal(true);
                        }}
                        className="bg-electric-500/20 text-electric-400 px-3 py-1 rounded hover:bg-electric-500/30 transition-colors flex items-center space-x-1"
                        title="Manage system links"
                      >
                        <Globe className="h-3 w-3" />
                        <span>Links</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSystemId(system.id);
                          setShowComponentModal(true);
                        }}
                        className="bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600 transition-colors flex items-center space-x-1"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Component</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSystem(system.id)}
                        className="bg-red-500/20 text-red-400 px-3 py-1 rounded hover:bg-red-500/30 transition-colors"
                        title="Delete system"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(system.components || []).map((component) => (
                      <div key={component.id} className="bg-gray-700/30 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-white font-semibold capitalize">
                            {(component.category || '').replace('_', ' ')}
                          </h4>
                          <button className="text-gray-400 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-electric-400 font-medium">{component.brand} {component.model}</p>
                        {(component.notes || component.description) && (
                          <p className="text-gray-400 text-sm mt-1">{component.notes || component.description}</p>
                        )}
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                          {(() => {
                            const type = component.category;
                            const specs = component.specifications || {};
                            
                            if (type === 'amplifier') {
                              return (
                                <div>
                                  {specs.rms_watts && `RMS: ${specs.rms_watts}W`}
                                  {specs.size && ` • ${specs.size}`}
                                </div>
                              );
                            }
                            if (type === 'subwoofer') {
                              return (
                                <div>
                                  {specs.size && `${specs.size}"`} 
                                  {specs.quantity && specs.quantity > 1 && ` x${specs.quantity}`}
                                  {specs.rms_watts && ` • ${specs.rms_watts}W RMS`}
                                  {specs.impedance && ` • ${specs.impedance}`}
                                </div>
                              );
                            }
                            if (type === 'speakers') {
                              return (
                                <div>
                                  {specs.size && specs.size} 
                                  {specs.quantity && specs.quantity > 1 && ` • ${specs.quantity} pairs`}
                                </div>
                              );
                            }
                            if (type === 'battery') {
                              return (
                                <div>
                                  {specs.size && specs.size}
                                  {specs.impedance && ` • ${specs.impedance}`}
                                </div>
                              );
                            }
                            if (type === 'alternator') {
                              return (
                                <div>
                                  {specs.power_watts && `${specs.power_watts}A output`}
                                  {specs.quantity && specs.quantity > 1 && ` x${specs.quantity}`}
                                </div>
                              );
                            }
                            return null;
                          })()}
                          {component.price && (
                            <div className="text-electric-400">${component.price}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {audioSystems.length === 0 && (
                <div className="text-center py-12 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl">
                  <Car className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No Audio Systems</h3>
                  <p className="text-gray-500 mb-4">Add your first audio system to get started</p>
                  <button
                    onClick={() => setShowSystemModal(true)}
                    className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Add Audio System
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'competitions' && (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 text-center">
                  <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{userStats?.total_competitions || 0}</div>
                  <div className="text-gray-400 text-sm">Total Events</div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 text-center">
                  <Star className="h-8 w-8 text-electric-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{userStats?.total_points || 0}</div>
                  <div className="text-gray-400 text-sm">Total Points</div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 text-center">
                  <Award className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{userStats?.wins || 0}</div>
                  <div className="text-gray-400 text-sm">Wins</div>
                </div>
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 text-center">
                  <Target className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{userStats?.average_score?.toFixed(1) || '0.0'}</div>
                  <div className="text-gray-400 text-sm">Avg Score</div>
                </div>
              </div>

              {/* Competition History */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Competition History</h2>
                  <Link
                    to="/events"
                    className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Find Events</span>
                  </Link>
                </div>
                
                {competitionResults.length > 0 ? (
                  <div className="space-y-4">
                    {competitionResults.map((result) => (
                      <div key={result.id} className="bg-gray-700/30 p-6 rounded-lg">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-2">{result.event_title}</h3>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(result.competed_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Trophy className="h-4 w-4" />
                                <span>{result.category}</span>
                              </div>
                              {result.placement && (
                                <div className="flex items-center space-x-1">
                                  <Award className="h-4 w-4" />
                                  <span>Placed {result.placement}{result.total_participants ? ` of ${result.total_participants}` : ''}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {result.placement && result.placement <= 3 && (
                              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                                result.placement === 1 ? 'bg-yellow-500' :
                                result.placement === 2 ? 'bg-gray-400' :
                                'bg-orange-600'
                              }`}>
                                <Trophy className="h-6 w-6 text-white" />
                              </div>
                            )}
                            <div className="text-2xl font-bold text-electric-400">{result.points_earned}</div>
                            <div className="text-xs text-gray-400">Points</div>
                          </div>
                        </div>
                        {result.overall_score && (
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Score</span>
                              <span className="text-xl font-bold text-white">{result.overall_score.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">No Competition History</h3>
                    <p className="text-gray-500 mb-4">Start competing to build your track record!</p>
                    <Link 
                      to="/events"
                      className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                    >
                      Find Competitions
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Teams</h2>
                <button 
                  onClick={() => setShowCreateTeamModal(true)}
                  className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Team</span>
                </button>
              </div>
              
              {teams.length > 0 ? (
                <div className="space-y-4">
                  {teams.map((team) => (
                    <div key={team.id} className="bg-gray-700/30 p-4 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {team.logo_url ? (
                          <img 
                            src={team.logo_url} 
                            alt={`${team.name} logo`}
                            className="w-12 h-12 rounded-full object-cover border-2 border-electric-500"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                            <Users className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-white font-semibold">{team.name}</h3>
                          <div className="text-gray-400 text-sm flex items-center space-x-4 mt-1">
                            <span className="capitalize bg-electric-500/20 text-electric-400 px-2 py-1 rounded text-xs">
                              {team.role === 'owner' ? 'Team Owner' : 
                               team.role === 'president' ? 'President' :
                               team.role === 'vice_president' ? 'Vice President' :
                               team.role === 'treasurer' ? 'Treasurer' :
                               team.role === 'moderator' ? 'Moderator' : 'Member'}
                            </span>
                            <span>{team.member_count} members</span>
                            <span>{team.total_points} points</span>
                          </div>
                          {team.description && (
                            <p className="text-gray-300 text-sm mt-2">{team.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {(team.role === 'owner' || team.role === 'president' || team.role === 'vice_president') && (
                          <>
                            <button
                              onClick={() => handleEditTeam(team)}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              title="Edit Team Details"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                          <button
                            onClick={() => {
                              setSelectedTeamForManagement(team);
                              loadTeamMembers(team.id);
                              setShowMemberManagementModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                              title="Manage Members"
                          >
                              <Users className="h-5 w-5" />
                          </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No Teams</h3>
                  <p className="text-gray-500 mb-4">Join or create a team to collaborate with other enthusiasts</p>
                  <div className="flex justify-center space-x-4">
                    <button 
                      onClick={() => {
                        loadAvailableTeams();
                        setShowBrowseTeamsModal(true);
                      }}
                      className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                    >
                      Browse Teams
                    </button>
                    <button 
                      onClick={() => setShowCreateTeamModal(true)}
                      className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Create Team
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <NewsletterPreferences />
              
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Other Settings</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" defaultChecked />
                        <span className="text-gray-300">Event reminders</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" defaultChecked />
                        <span className="text-gray-300">Competition results</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" />
                        <span className="text-gray-300">Team invitations</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" />
                        <span className="text-gray-300">Marketing emails</span>
                      </label>
                    </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Privacy</h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" defaultChecked />
                      <span className="text-gray-300">Show profile in directory</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" defaultChecked />
                      <span className="text-gray-300">Show competition results</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" defaultChecked />
                      <span className="text-gray-300">Show audio system details</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Account Actions</h3>
                  <div className="space-y-3">
                    <button className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors">
                      Change Password
                    </button>
                    <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                      Download Data
                    </button>
                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateTeamModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Create New Team</h3>
                <button
                  onClick={() => setShowCreateTeamModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Logo Upload Section */}
              <div className="text-center">
                <label className="block text-gray-400 text-sm mb-4 flex items-center justify-center">
                  Team Logo
                  <FieldHelper text="Upload a logo for your team (optional). Recommended size: 200x200px" />
                </label>
                <div className="flex flex-col items-center space-y-4">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Logo preview"
                      className="w-24 h-24 rounded-full object-cover border-4 border-electric-500"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-600">
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <label className="cursor-pointer bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Upload Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Existing form fields... */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2 flex items-center">
                    Team Name
                    <FieldHelper text="The display name for your team (e.g., 'Bass Heads', 'Sound Quality Masters')" />
                  </label>
                  <input
                    type="text"
                    value={teamFormData.name}
                    onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Enter team name"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2 flex items-center">
                    Team Type
                    <FieldHelper text="The category of team (Competitive, Social, Professional, Club)" />
                  </label>
                  <select
                    value={teamFormData.team_type}
                    onChange={(e) => setTeamFormData({ ...teamFormData, team_type: e.target.value as any })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    {teamTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2 flex items-center">
                    Location
                    <FieldHelper text="Geographic location of the team (optional)" />
                  </label>
                  <input
                    type="text"
                    value={teamFormData.location}
                    onChange={(e) => setTeamFormData({ ...teamFormData, location: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="City, State"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2 flex items-center">
                    Max Members
                    <FieldHelper text="Maximum number of members allowed in this team" />
                  </label>
                  <input
                    type="number"
                    value={teamFormData.max_members}
                    onChange={(e) => setTeamFormData({ ...teamFormData, max_members: parseInt(e.target.value) || 50 })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    min="1"
                    placeholder="50"
                  />
                </div>
              </div>

              {/* Rest of existing form fields... */}
              <div>
                <label className="block text-gray-400 text-sm mb-2 flex items-center">
                  Website
                  <FieldHelper text="Team website URL (optional)" />
                </label>
                <input
                  type="url"
                  value={teamFormData.website}
                  onChange={(e) => setTeamFormData({ ...teamFormData, website: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2 flex items-center">
                  Description
                  <FieldHelper text="A brief description of the team and its goals" />
                </label>
                <textarea
                  value={teamFormData.description}
                  onChange={(e) => setTeamFormData({ ...teamFormData, description: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 resize-none"
                  rows={3}
                  placeholder="Enter team description"
                />
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={teamFormData.is_public}
                    onChange={(e) => setTeamFormData({ ...teamFormData, is_public: e.target.checked })}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                  />
                  <span className="text-gray-300">Public Team</span>
                  <FieldHelper text="When public, the team will be visible to all users and can be joined" />
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={teamFormData.requires_approval}
                    onChange={(e) => setTeamFormData({ ...teamFormData, requires_approval: e.target.checked })}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                  />
                  <span className="text-gray-300">Requires Approval</span>
                  <FieldHelper text="When enabled, new members must be approved by team admins before joining" />
                </label>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
              <button
                onClick={() => setShowCreateTeamModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                disabled={saveStatus === 'saving'}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                  saveStatus === 'success'
                    ? 'bg-green-600 text-white'
                    : saveStatus === 'error'
                    ? 'bg-red-600 text-white'
                    : 'bg-electric-500 text-white hover:bg-electric-600'
                } disabled:opacity-50`}
                disabled={saveStatus === 'saving' || !teamFormData.name.trim()}
              >
                {saveStatus === 'saving' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : saveStatus === 'success' ? (
                  <>
                    <Trophy className="h-4 w-4" />
                    <span>Team Created!</span>
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <X className="h-4 w-4" />
                    <span>Error Creating</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Create Team</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Management Modal */}
      {showMemberManagementModal && selectedTeamForManagement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {selectedTeamForManagement.logo_url ? (
                    <img 
                      src={selectedTeamForManagement.logo_url} 
                      alt={`${selectedTeamForManagement.name} logo`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-electric-500"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedTeamForManagement.name}</h3>
                    <p className="text-gray-400">Team Management</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setShowInviteModal(true);
                      loadPendingInvitations(selectedTeamForManagement.id);
                      setInviteLink(generateInviteLink(selectedTeamForManagement.id));
                    }}
                    className="bg-electric-500 text-white px-3 py-1 rounded text-sm hover:bg-electric-600 transition-colors flex items-center space-x-1"
                  >
                    <UserPlus className="h-3 w-3" />
                    <span>Invite</span>
                  </button>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="bg-yellow-500 text-black px-3 py-1 rounded text-sm hover:bg-yellow-400 transition-colors flex items-center space-x-1"
                  >
                    <Crown className="h-3 w-3" />
                    <span>Upgrade</span>
                  </button>
                  <button
                    onClick={() => setShowMemberManagementModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-700/30 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700/50">
                      <tr>
                        <th className="text-left p-4 text-gray-300 font-medium">Member</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Role</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Custom Title</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Joined</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Points</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((member) => {
                        const roleInfo = getRoleInfo(member.role);
                        const RoleIcon = roleInfo.icon;
                        
                        return (
                          <tr key={member.id} className="border-t border-gray-700/50 hover:bg-gray-700/20">
                            <td className="p-4">
                              <div>
                                <div className="text-white font-medium">{member.user_name}</div>
                                <div className="text-gray-400 text-sm">{member.user_email}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-${roleInfo.color}-500`}>
                                  <RoleIcon className="h-3 w-3 text-white" />
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${roleInfo.color}-500/20 text-${roleInfo.color}-400`}>
                                  {roleInfo.name}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              {member.custom_title ? (
                                <span className="text-electric-400 text-sm font-medium">{member.custom_title}</span>
                              ) : (
                                <span className="text-gray-500 text-sm">-</span>
                              )}
                            </td>
                            <td className="p-4 text-gray-300">
                              {new Date(member.joined_at).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-gray-300">
                              {member.points_contributed.toLocaleString()}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setMemberFormData({
                                      role: member.role,
                                      custom_title: member.custom_title || '',
                                      permissions: member.permissions
                                    });
                                    setShowRoleEditModal(true);
                                  }}
                                  className="text-blue-400 hover:text-blue-300 transition-colors"
                                  title="Edit Role"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                {member.role !== 'owner' && (
                                  <button 
                                    onClick={() => handleRemoveMember(member.id)}
                                    className="text-red-400 hover:text-red-300 transition-colors"
                                    title="Remove Member"
                                  >
                                    <UserX className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Edit Modal */}
      {showRoleEditModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Edit Member Role</h3>
                <button
                  onClick={() => setShowRoleEditModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h4 className="text-white font-medium">{selectedMember.user_name}</h4>
                <p className="text-gray-400 text-sm">{selectedMember.user_email}</p>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-3">Role</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teamRoles.map((role) => {
                    const RoleIcon = role.icon;
                    return (
                      <label key={role.id} className="cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          value={role.id}
                          checked={memberFormData.role === role.id}
                          onChange={(e) => setMemberFormData({ ...memberFormData, role: e.target.value as any })}
                          className="sr-only"
                        />
                        <div className={`p-3 rounded-lg border-2 transition-colors ${
                          memberFormData.role === role.id 
                            ? `border-${role.color}-500 bg-${role.color}-500/10` 
                            : 'border-gray-600 hover:border-gray-500'
                        }`}>
                          <div className="flex items-center space-x-3">
                            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-${role.color}-500`}>
                              <RoleIcon className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm">{role.name}</div>
                              <div className="text-gray-400 text-xs">{role.description}</div>
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2 flex items-center">
                  Custom Title
                  <FieldHelper text="Optional custom title for this member (requires team upgrade)" />
                </label>
                <input
                  type="text"
                  value={memberFormData.custom_title}
                  onChange={(e) => setMemberFormData({ ...memberFormData, custom_title: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="e.g., Lead Engineer, Marketing Director"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-3">Permissions</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {teamPermissions.map((permission) => (
                    <label key={permission.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={memberFormData.permissions.includes(permission.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMemberFormData({
                              ...memberFormData,
                              permissions: [...memberFormData.permissions, permission.id]
                            });
                          } else {
                            setMemberFormData({
                              ...memberFormData,
                              permissions: memberFormData.permissions.filter(p => p !== permission.id)
                            });
                          }
                        }}
                        className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                      />
                      <span className="text-gray-300 text-sm">{permission.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
              <button
                onClick={() => setShowRoleEditModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleUpdateMemberRole(selectedMember.id, memberFormData.role, memberFormData.custom_title);
                  setShowRoleEditModal(false);
                }}
                className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Team Upgrade</h3>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="text-center">
                <Crown className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h4 className="text-xl font-bold text-white mb-2">Premium Team Features</h4>
                <p className="text-gray-400">Unlock advanced team management capabilities</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <UserCheck className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-300">Custom member titles</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Shield className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-300">Advanced permission system</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Users className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-300">Unlimited team members</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Trophy className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-300">Team analytics & insights</span>
                </div>
              </div>

              <div className="bg-gray-700/30 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">$9.99</div>
                <div className="text-gray-400 text-sm">per month</div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Maybe Later
              </button>
              <button
                onClick={() => {
                  // Handle upgrade logic here
                  alert('Upgrade functionality would be implemented here');
                  setShowUpgradeModal(false);
                }}
                className="bg-yellow-500 text-black px-6 py-2 rounded-lg hover:bg-yellow-400 transition-colors flex items-center space-x-2 font-medium"
              >
                <Crown className="h-4 w-4" />
                <span>Upgrade Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Edit Modal */}
      {showTeamEditModal && editingTeam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Edit Team Details</h3>
                <button
                  onClick={() => setShowTeamEditModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Logo Upload Section */}
              <div className="text-center">
                <label className="block text-gray-400 text-sm mb-4 flex items-center justify-center">
                  Team Logo
                  <FieldHelper text="Upload a logo for your team (optional). Recommended size: 200x200px" />
                </label>
                <div className="flex flex-col items-center space-y-4">
                  {logoPreview ? (
                    <img 
                      src={logoPreview} 
                      alt="Logo preview"
                      className="w-24 h-24 rounded-full object-cover border-4 border-electric-500"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-600">
                      <Camera className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <label className="cursor-pointer bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Upload Logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 text-sm mb-2 flex items-center">
                    Team Name *
                    <FieldHelper text="Choose a unique name for your team" />
                  </label>
                  <input
                    type="text"
                    value={teamEditData.name}
                    onChange={(e) => setTeamEditData({ ...teamEditData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Enter team name..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2 flex items-center">
                    Team Type
                    <FieldHelper text="Select the type of team you're creating" />
                  </label>
                  <select
                    value={teamEditData.team_type}
                    onChange={(e) => setTeamEditData({ ...teamEditData, team_type: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    {teamTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2 flex items-center">
                    Location
                    <FieldHelper text="Your team's location (city, state/country)" />
                  </label>
                  <input
                    type="text"
                    value={teamEditData.location}
                    onChange={(e) => setTeamEditData({ ...teamEditData, location: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Los Angeles, CA"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2 flex items-center">
                    Website
                    <FieldHelper text="Your team's website or social media" />
                  </label>
                  <input
                    type="url"
                    value={teamEditData.website}
                    onChange={(e) => setTeamEditData({ ...teamEditData, website: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="https://yourteam.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-2 flex items-center">
                    Maximum Members
                    <FieldHelper text="Maximum number of members allowed in your team" />
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={teamEditData.max_members}
                    onChange={(e) => setTeamEditData({ ...teamEditData, max_members: parseInt(e.target.value) || 50 })}
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2 flex items-center">
                  Description
                  <FieldHelper text="Describe your team's goals, focus, and what members can expect" />
                </label>
                <textarea
                  value={teamEditData.description}
                  onChange={(e) => setTeamEditData({ ...teamEditData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 resize-none"
                  placeholder="Tell potential members about your team..."
                />
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={teamEditData.is_public}
                    onChange={(e) => setTeamEditData({ ...teamEditData, is_public: e.target.checked })}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                  />
                  <span className="text-gray-300">Public Team</span>
                  <FieldHelper text="When public, the team will be visible to all users and can be joined" />
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={teamEditData.requires_approval}
                    onChange={(e) => setTeamEditData({ ...teamEditData, requires_approval: e.target.checked })}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                  />
                  <span className="text-gray-300">Requires Approval</span>
                  <FieldHelper text="When enabled, new members must be approved by team admins before joining" />
                </label>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
              <button
                onClick={() => setShowTeamEditModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateTeam}
                disabled={!teamEditData.name.trim() || saveStatus === 'saving'}
                className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saveStatus === 'saving' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </>
                ) : saveStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Updated!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Update Team</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Members Modal */}
      {showInviteModal && selectedTeamForManagement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Invite Members to {selectedTeamForManagement.name}</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Search Users */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Search Users by Email</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Enter email address..."
                  />
                </div>
                
                {foundUsers.length > 0 && (
                  <div className="mt-2 bg-gray-700/30 rounded-lg border border-gray-600">
                    {foundUsers.map((foundUser) => (
                      <div key={foundUser.id} className="p-3 border-b border-gray-600 last:border-b-0 flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">{foundUser.name}</div>
                          <div className="text-gray-400 text-sm">{foundUser.email}</div>
                          {foundUser.location && (
                            <div className="text-gray-500 text-xs">{foundUser.location}</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleInviteUser(foundUser.id)}
                          disabled={saveStatus === 'saving'}
                          className="bg-electric-500 text-white px-3 py-1 rounded hover:bg-electric-600 transition-colors disabled:opacity-50"
                        >
                          Invite
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invite Message */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Invitation Message (Optional)</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 resize-none"
                  placeholder="Add a personal message to your invitation..."
                />
              </div>

              {/* Shareable Invite Link */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Shareable Invite Link</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inviteLink}
                    readOnly
                    className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      alert('Invite link copied to clipboard!');
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-1">Share this link with anyone you want to invite to your team</p>
              </div>

              {/* Pending Invitations */}
              {pendingInvitations.length > 0 && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Pending Invitations</label>
                  <div className="bg-gray-700/30 rounded-lg border border-gray-600">
                    {pendingInvitations.map((invitation) => (
                      <div key={invitation.id} className="p-3 border-b border-gray-600 last:border-b-0 flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">{invitation.invited_user.name}</div>
                          <div className="text-gray-400 text-sm">{invitation.invited_user.email}</div>
                          <div className="text-gray-500 text-xs">
                            Invited {new Date(invitation.created_at).toLocaleDateString()} • 
                            Expires {new Date(invitation.expires_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">Pending</span>
                          <button
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Cancel Invitation"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Browse Teams Modal */}
      {/* Add Audio System Modal */}
      {showSystemModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Add Audio System</h3>
                <button
                  onClick={() => setShowSystemModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddSystem} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">System Name *</label>
                <input
                  type="text"
                  required
                  value={systemFormData.name}
                  onChange={(e) => setSystemFormData({ ...systemFormData, name: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="e.g., Daily Driver System, Competition Build"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Description</label>
                <textarea
                  value={systemFormData.description}
                  onChange={(e) => setSystemFormData({ ...systemFormData, description: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  rows={3}
                  placeholder="Describe your system setup..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Vehicle Year</label>
                  <input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={systemFormData.vehicle_year || ''}
                    onChange={(e) => setSystemFormData({ ...systemFormData, vehicle_year: parseInt(e.target.value) })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="2023"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Make</label>
                  <input
                    type="text"
                    value={systemFormData.vehicle_make}
                    onChange={(e) => setSystemFormData({ ...systemFormData, vehicle_make: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Honda"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Model</label>
                  <input
                    type="text"
                    value={systemFormData.vehicle_model}
                    onChange={(e) => setSystemFormData({ ...systemFormData, vehicle_model: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Civic"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">System Type</label>
                <select
                  value={systemFormData.system_type}
                  onChange={(e) => setSystemFormData({ ...systemFormData, system_type: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="spl">SPL (Sound Pressure Level)</option>
                  <option value="sql">SQL (Sound Quality Loud)</option>
                  <option value="sq">SQ (Sound Quality)</option>
                  <option value="daily">Daily Driver</option>
                  <option value="demo">Demo Vehicle</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={systemFormData.is_primary}
                  onChange={(e) => setSystemFormData({ ...systemFormData, is_primary: e.target.checked })}
                  className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                />
                <label htmlFor="is_primary" className="text-gray-300">
                  Set as primary system
                </label>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSystemModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                >
                  Add System
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* System Links Modal */}
      {showSystemLinksModal && selectedSystemId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">System Links</h3>
                <button
                  onClick={() => {
                    setShowSystemLinksModal(false);
                    setSelectedSystemId(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Add Link Form */}
              <form onSubmit={handleAddSystemLink} className="mb-6 bg-gray-700/30 p-4 rounded-lg">
                <h4 className="text-white font-semibold mb-4">Add New Link</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Link Type</label>
                    <select
                      value={linkFormData.link_type}
                      onChange={(e) => setLinkFormData({ ...linkFormData, link_type: e.target.value })}
                      className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="build_thread">Build Thread</option>
                      <option value="youtube">YouTube Video</option>
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="forum">Forum Post</option>
                      <option value="gallery">Photo Gallery</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Title</label>
                    <input
                      type="text"
                      required
                      value={linkFormData.title}
                      onChange={(e) => setLinkFormData({ ...linkFormData, title: e.target.value })}
                      className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:outline-none focus:border-electric-500"
                      placeholder="Build Progress 2024"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">URL</label>
                    <input
                      type="url"
                      required
                      value={linkFormData.url}
                      onChange={(e) => setLinkFormData({ ...linkFormData, url: e.target.value })}
                      className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:outline-none focus:border-electric-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-4 bg-electric-500 text-white px-4 py-2 rounded hover:bg-electric-600 transition-colors"
                >
                  Add Link
                </button>
              </form>

              {/* Existing Links */}
              <div className="space-y-3">
                <h4 className="text-white font-semibold">Current Links</h4>
                {systemLinks.length > 0 ? (
                  systemLinks.map((link) => (
                    <div key={link.id} className="bg-gray-700/30 p-4 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <ExternalLink className="h-5 w-5 text-electric-400" />
                        <div>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-electric-400 hover:text-electric-300 font-medium"
                          >
                            {link.title}
                          </a>
                          <p className="text-gray-400 text-sm">{link.link_type.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSystemLink(link.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-8">No links added yet. Add links to showcase your build!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Component Modal */}
      {showComponentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Add Component</h3>
                <button
                  onClick={() => setShowComponentModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleAddComponent} className="p-6 space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Component Category *</label>
                <select
                  value={componentFormData.category}
                  onChange={(e) => setComponentFormData({ ...componentFormData, category: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  required
                >
                  <option value="">Select category...</option>
                  <option value="head_unit">Head Unit</option>
                  <option value="amplifier">Amplifier</option>
                  <option value="subwoofer">Subwoofer</option>
                  <option value="speakers">Speakers</option>
                  <option value="dsp">DSP (Digital Signal Processor)</option>
                  <option value="wiring">Wiring</option>
                  <option value="alternator">Alternator</option>
                  <option value="battery">Battery</option>
                  <option value="capacitor">Capacitor</option>
                  <option value="sound_dampening">Sound Dampening</option>
                  <option value="enclosure">Enclosure</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Brand *</label>
                  <input
                    type="text"
                    required
                    value={componentFormData.brand}
                    onChange={(e) => setComponentFormData({ ...componentFormData, brand: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="e.g., Alpine, JL Audio"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Model *</label>
                  <input
                    type="text"
                    required
                    value={componentFormData.model}
                    onChange={(e) => setComponentFormData({ ...componentFormData, model: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="e.g., 12W7AE-3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Description</label>
                <textarea
                  value={componentFormData.description}
                  onChange={(e) => setComponentFormData({ ...componentFormData, description: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  rows={2}
                  placeholder="Additional details about this component..."
                />
              </div>

              {/* Dynamic fields based on component category */}
              {componentFormData.category === 'amplifier' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">RMS Power @ Impedance</label>
                    <input
                      type="text"
                      value={componentFormData.rms_watts || ''}
                      onChange={(e) => setComponentFormData({ ...componentFormData, rms_watts: parseInt(e.target.value) || undefined })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="e.g., 1000W @ 1Ω"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Channels</label>
                    <input
                      type="text"
                      value={componentFormData.size}
                      onChange={(e) => setComponentFormData({ ...componentFormData, size: e.target.value })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="e.g., Monoblock, 2-Channel, 4-Channel"
                    />
                  </div>
                </div>
              )}

              {componentFormData.category === 'subwoofer' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Size</label>
                    <select
                      value={componentFormData.size}
                      onChange={(e) => setComponentFormData({ ...componentFormData, size: e.target.value })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="">Select size...</option>
                      <option value="8">8"</option>
                      <option value="10">10"</option>
                      <option value="12">12"</option>
                      <option value="15">15"</option>
                      <option value="18">18"</option>
                      <option value="21">21"</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={componentFormData.quantity}
                      onChange={(e) => setComponentFormData({ ...componentFormData, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">RMS Power (per sub)</label>
                    <input
                      type="number"
                      value={componentFormData.rms_watts || ''}
                      onChange={(e) => setComponentFormData({ ...componentFormData, rms_watts: parseInt(e.target.value) || undefined })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="e.g., 1000"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Impedance</label>
                    <select
                      value={componentFormData.impedance}
                      onChange={(e) => setComponentFormData({ ...componentFormData, impedance: e.target.value })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="">Select impedance...</option>
                      <option value="1">1 Ohm</option>
                      <option value="2">2 Ohm</option>
                      <option value="4">4 Ohm</option>
                      <option value="DVC 1">DVC 1 Ohm</option>
                      <option value="DVC 2">DVC 2 Ohm</option>
                      <option value="DVC 4">DVC 4 Ohm</option>
                    </select>
                  </div>
                </div>
              )}

              {componentFormData.category === 'speakers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Type</label>
                    <select
                      value={componentFormData.size}
                      onChange={(e) => setComponentFormData({ ...componentFormData, size: e.target.value })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="">Select type...</option>
                      <option value="component">Component Set</option>
                      <option value="coaxial">Coaxial</option>
                      <option value="tweeter">Tweeter</option>
                      <option value="midrange">Midrange</option>
                      <option value="midbass">Midbass</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Quantity (pairs)</label>
                    <input
                      type="number"
                      min="1"
                      value={componentFormData.quantity}
                      onChange={(e) => setComponentFormData({ ...componentFormData, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                  </div>
                </div>
              )}

              {componentFormData.category === 'battery' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Type</label>
                    <select
                      value={componentFormData.size}
                      onChange={(e) => setComponentFormData({ ...componentFormData, size: e.target.value })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="">Select type...</option>
                      <option value="agm">AGM</option>
                      <option value="lithium">Lithium</option>
                      <option value="super_capacitor">Super Capacitor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Capacity</label>
                    <input
                      type="text"
                      value={componentFormData.impedance}
                      onChange={(e) => setComponentFormData({ ...componentFormData, impedance: e.target.value })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="e.g., 100Ah, 3000 Farad"
                    />
                  </div>
                </div>
              )}

              {componentFormData.category === 'alternator' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Output (Amps)</label>
                    <input
                      type="number"
                      value={componentFormData.power_watts || ''}
                      onChange={(e) => setComponentFormData({ ...componentFormData, power_watts: parseInt(e.target.value) || undefined })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="e.g., 320"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={componentFormData.quantity}
                      onChange={(e) => setComponentFormData({ ...componentFormData, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                  </div>
                </div>
              )}

              {/* Price field for all components */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Price ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={componentFormData.price || ''}
                  onChange={(e) => setComponentFormData({ ...componentFormData, price: parseFloat(e.target.value) || undefined })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="499.99"
                />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mt-4">
                <p className="text-yellow-400 text-sm">
                  <strong>Pro Tip:</strong> Add system links to showcase build photos, videos, and forum threads about your setup!
                </p>
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowComponentModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                >
                  Add Component
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBrowseTeamsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Browse Teams</h3>
                <button
                  onClick={() => setShowBrowseTeamsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={teamSearchQuery}
                    onChange={(e) => setTeamSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Search teams by name, description, or location..."
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {filteredTeams.map((team) => {
                  const TypeIcon = getTeamTypeIcon(team.team_type);
                  const typeColor = getTeamTypeColor(team.team_type);
                  
                  return (
                    <div
                      key={team.id}
                      className="bg-gray-700/30 p-4 rounded-lg border border-gray-600/50 hover:border-gray-500 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-${typeColor}-500`}>
                            <TypeIcon className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="text-white font-semibold">{team.name}</h4>
                            <div className={`text-xs font-medium px-2 py-1 rounded-full bg-${typeColor}-500/20 text-${typeColor}-400 inline-block`}>
                              {team.team_type.charAt(0).toUpperCase() + team.team_type.slice(1)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleJoinTeam(team.id, team.requires_approval)}
                          className="bg-electric-500 text-white px-3 py-1 rounded text-sm hover:bg-electric-600 transition-colors flex items-center space-x-1"
                        >
                          <UserPlus className="h-3 w-3" />
                          <span>{team.requires_approval ? 'Request' : 'Join'}</span>
                        </button>
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-3 line-clamp-2">{team.description}</p>
                      
                      <div className="space-y-1 text-xs text-gray-400">
                        <div className="flex justify-between">
                          <span>Owner:</span>
                          <span className="text-white">{team.owner_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Members:</span>
                          <span className="text-white">{team.member_count}/{team.max_members}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Points:</span>
                          <span className="text-white">{team.total_points.toLocaleString()}</span>
                        </div>
                        {team.location && (
                          <div className="flex justify-between">
                            <span>Location:</span>
                            <span className="text-white">{team.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredTeams.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No teams found matching your search.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}