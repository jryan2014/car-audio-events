import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Edit, Trash2, Save, X, Star, Check, AlertCircle, Users, Building, Wrench, Crown, HelpCircle, UserPlus, Shield, Mail, Calendar, Trophy, CreditCard, BarChart3, DollarSign, TrendingUp, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AdminCouponManager } from '../components/AdminCouponManager';
import { PermissionManager } from '../components/admin/PermissionManager';
import EventSuggestionSettings from '../components/admin/EventSuggestionSettings';

interface MembershipPlan {
  id: string;
  name: string;
  type: 'competitor' | 'retailer' | 'manufacturer' | 'organization';
  price: number;
  billing_period: 'monthly' | 'yearly' | 'lifetime';
  description: string;
  features: string[];
  permissions: string[];
  is_active: boolean;
  is_featured: boolean;
  hidden_on_frontend?: boolean;
  show_on_competitor_page?: boolean;
  show_on_business_page?: boolean;
  show_on_organization_page?: boolean;
  auto_renewal_enabled?: boolean;
  trial_period_days?: number;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  max_events_per_month?: number;
  max_team_members?: number;
  max_listings?: number;
  display_order?: number;
  special_price?: number | null;
  special_price_reason?: string | null;
  special_price_valid_days?: number | null;
  special_price_start_date?: string | null;
  special_price_end_date?: string | null;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  team_type: 'competitive' | 'social' | 'professional' | 'club';
  location?: string;
  website?: string;
  logo_url?: string;
  is_public: boolean;
  requires_approval: boolean;
  max_members: number;
  total_points: number;
  competitions_won: number;
  owner_id: string;
  owner_name?: string;
  member_count: number;
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joined_at: string;
  points_contributed: number;
  is_active: boolean;
}

export default function AdminMembership() {
  const { user, session } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<MembershipPlan | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [activeTab, setActiveTab] = useState('plans');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [newFeature, setNewFeature] = useState('');
  const [showFeatureInput, setShowFeatureInput] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Billing analytics state
  const [billingStats, setBillingStats] = useState<any>(null);
  const [planAnalytics, setPlanAnalytics] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);

  // Form data state and other hooks moved before conditional return
  const [formData, setFormData] = useState<Partial<MembershipPlan>>({
    name: '',
    type: 'competitor',
    price: undefined,
    billing_period: 'yearly',
    description: '',
    features: [],
    permissions: [],
    is_active: true,
    is_featured: false,
    hidden_on_frontend: false,
    show_on_competitor_page: true,
    show_on_business_page: false,
    show_on_organization_page: false,
    auto_renewal_enabled: true,
    trial_period_days: 0,
    stripe_price_id_monthly: '',
    stripe_price_id_yearly: '',
    max_events_per_month: undefined,
    max_team_members: undefined,
    max_listings: undefined
  });

  const [teamFormData, setTeamFormData] = useState<Partial<Team>>({
    name: '',
    description: '',
    team_type: 'competitive',
    location: '',
    website: '',
    is_public: true,
    requires_approval: true,
    max_members: 50,
    total_points: 0,
    competitions_won: 0
  });

  const [defaultPermissions, setDefaultPermissions] = useState([
    // Competitor permissions
    { id: 'view_events', name: 'View Events', description: 'Browse and view event listings', category: 'Events' },
    { id: 'register_events', name: 'Register for Events', description: 'Register and participate in events', category: 'Events' },
    { id: 'track_scores', name: 'Track Scores', description: 'View and track competition scores', category: 'Competition' },
    { id: 'create_profile', name: 'Create Profile', description: 'Create and manage user profile', category: 'Profile' },
    { id: 'join_teams', name: 'Join Teams', description: 'Join and participate in teams', category: 'Teams' },
    { id: 'create_team', name: 'Create Team', description: 'Create and manage new teams', category: 'Teams' },
    { id: 'manage_team', name: 'Manage Team', description: 'Manage team settings and members', category: 'Teams' },
    { id: 'advanced_analytics', name: 'Advanced Analytics', description: 'Access detailed performance analytics', category: 'Analytics' },
    { id: 'priority_registration', name: 'Priority Registration', description: 'Early access to event registration', category: 'Events' },
    { id: 'custom_showcase', name: 'Custom System Showcase', description: 'Create custom audio system showcases', category: 'Profile' },
    { id: 'export_history', name: 'Export Competition History', description: 'Export competition data and history', category: 'Data' },
    
    // Business permissions
    { id: 'directory_listing', name: 'Directory Listing', description: 'List business in directory', category: 'Business' },
    { id: 'create_events', name: 'Create Events', description: 'Create and manage events', category: 'Events' },
    { id: 'customer_analytics', name: 'Customer Analytics', description: 'Access customer insights and analytics', category: 'Analytics' },
    { id: 'advertising', name: 'Advertising Options', description: 'Access to advertising and promotion tools', category: 'Marketing' },
    { id: 'sponsorship_tools', name: 'Sponsorship Tools', description: 'Tools for event sponsorship management', category: 'Marketing' },
    { id: 'ai_ad_creation', name: 'AI Ad Creation', description: 'Use AI tools to create and generate advertisements', category: 'Marketing' },
    { id: 'api_access', name: 'API Access', description: 'Access to platform APIs', category: 'Integration' },
    { id: 'priority_support', name: 'Priority Support', description: 'Priority customer support', category: 'Support' },
    { id: 'bulk_operations', name: 'Bulk Operations', description: 'Perform bulk data operations', category: 'Data' },
    { id: 'white_label', name: 'White Label Options', description: 'White label platform features', category: 'Branding' },
    
    // Organization permissions
    { id: 'member_management', name: 'Member Management', description: 'Manage organization members', category: 'Organization' },
    { id: 'judge_management', name: 'Judge Management', description: 'Manage judges and scoring for competitions', category: 'Organization' },
    { id: 'multiple_member_accounts', name: 'Multiple Member Accounts', description: 'Create and manage multiple member accounts for organization', category: 'Organization' },
    { id: 'event_hosting', name: 'Event Hosting', description: 'Host and organize events', category: 'Events' },
    { id: 'community_building', name: 'Community Building', description: 'Access community building tools', category: 'Community' },
    { id: 'custom_branding', name: 'Custom Branding', description: 'Custom branding and themes', category: 'Branding' }
  ]);

  // All useEffect and useCallback hooks moved before conditional return
  useEffect(() => {
    loadPlans();
    loadPermissions();
    if (activeTab === 'teams') {
      loadTeams();
    } else if (activeTab === 'billing') {
      loadBillingAnalytics();
    }
  }, [activeTab]);

  const loadPermissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role_name, permission, resource')
        .order('role_name');

      if (error) throw error;

      // Transform the data into our permissions format
      const permissionsMap = new Map();
      
      data.forEach((item: any) => {
        const id = item.permission;
        const name = item.permission
          .split('_')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        const category = item.resource.charAt(0).toUpperCase() + item.resource.slice(1);
        
        if (!permissionsMap.has(id)) {
          permissionsMap.set(id, {
            id,
            name,
            description: `Permission to ${item.permission.replace(/_/g, ' ')} ${item.resource}`,
            category
          });
        }
      });
      
      // Always merge database permissions with default permissions
      const dbPermissions = Array.from(permissionsMap.values());
      
      // Create a combined list, prioritizing default permissions for display
      const combinedPermissions = [...defaultPermissions];
      
      // Add any database permissions that aren't in defaults
      dbPermissions.forEach(dbPerm => {
        if (!defaultPermissions.find(defPerm => defPerm.id === dbPerm.id)) {
          combinedPermissions.push(dbPerm);
        }
      });

      setPermissions(combinedPermissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions(defaultPermissions);
    }
  }, [defaultPermissions]);

  const loadPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      setPlans(data || []);
    } catch (error) {
      console.error('Error loading membership plans:', error);
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          users!teams_owner_id_fkey(name),
          team_members(id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTeams = (data || []).map(team => ({
        ...team,
        owner_name: team.users?.name,
        member_count: team.team_members?.length || 0
      }));

      setTeams(formattedTeams);
    } catch (error) {
      console.error('Error loading teams:', error);
      setTeams([]);
    }
  }, []);

  const loadTeamMembers = useCallback(async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          users(name, email)
        `)
        .eq('team_id', teamId)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      const formattedMembers = (data || []).map(member => ({
        ...member,
        user_name: member.users?.name || 'Unknown',
        user_email: member.users?.email || 'Unknown'
      }));

      setTeamMembers(formattedMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
    }
  }, []);

  const loadBillingAnalytics = useCallback(async () => {
    setBillingLoading(true);
    try {
      // Load billing statistics and plan analytics
      const [statsResponse, analyticsResponse] = await Promise.all([
        supabase.rpc('get_billing_stats'),
        supabase.rpc('get_plan_analytics')
      ]);

      if (statsResponse.error) {
        console.error('Error loading billing stats:', statsResponse.error);
      } else {
        setBillingStats(statsResponse.data);
      }

      if (analyticsResponse.error) {
        console.error('Error loading plan analytics:', analyticsResponse.error);
      } else {
        setPlanAnalytics(analyticsResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading billing analytics:', error);
    } finally {
      setBillingLoading(false);
    }
  }, []);

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/\" replace />;
  }

  const membershipTypes = [
    { id: 'competitor', name: 'Competitor', icon: Users, color: 'blue' },
    { id: 'retailer', name: 'Retailer', icon: Building, color: 'purple' },
    { id: 'manufacturer', name: 'Manufacturer', icon: Wrench, color: 'orange' },
    { id: 'organization', name: 'Organization', icon: Crown, color: 'green' }
  ];

  const teamTypes = [
    { id: 'competitive', name: 'Competitive', icon: Trophy, color: 'red' },
    { id: 'social', name: 'Social', icon: Users, color: 'blue' },
    { id: 'professional', name: 'Professional', icon: Building, color: 'purple' },
    { id: 'club', name: 'Club', icon: Crown, color: 'green' }
  ];

  const [defaultPermissions, setDefaultPermissions] = useState([
    // Competitor permissions
    { id: 'view_events', name: 'View Events', description: 'Browse and view event listings', category: 'Events' },
    { id: 'register_events', name: 'Register for Events', description: 'Register and participate in events', category: 'Events' },
    { id: 'track_scores', name: 'Track Scores', description: 'View and track competition scores', category: 'Competition' },
    { id: 'create_profile', name: 'Create Profile', description: 'Create and manage user profile', category: 'Profile' },
    { id: 'join_teams', name: 'Join Teams', description: 'Join and participate in teams', category: 'Teams' },
    { id: 'create_team', name: 'Create Team', description: 'Create and manage new teams', category: 'Teams' },
    { id: 'manage_team', name: 'Manage Team', description: 'Manage team settings and members', category: 'Teams' },
    { id: 'advanced_analytics', name: 'Advanced Analytics', description: 'Access detailed performance analytics', category: 'Analytics' },
    { id: 'priority_registration', name: 'Priority Registration', description: 'Early access to event registration', category: 'Events' },
    { id: 'custom_showcase', name: 'Custom System Showcase', description: 'Create custom audio system showcases', category: 'Profile' },
    { id: 'export_history', name: 'Export Competition History', description: 'Export competition data and history', category: 'Data' },
    
    // Business permissions
    { id: 'directory_listing', name: 'Directory Listing', description: 'List business in directory', category: 'Business' },
    { id: 'create_events', name: 'Create Events', description: 'Create and manage events', category: 'Events' },
    { id: 'customer_analytics', name: 'Customer Analytics', description: 'Access customer insights and analytics', category: 'Analytics' },
    { id: 'advertising', name: 'Advertising Options', description: 'Access to advertising and promotion tools', category: 'Marketing' },
    { id: 'sponsorship_tools', name: 'Sponsorship Tools', description: 'Tools for event sponsorship management', category: 'Marketing' },
    { id: 'ai_ad_creation', name: 'AI Ad Creation', description: 'Use AI tools to create and generate advertisements', category: 'Marketing' },
    { id: 'api_access', name: 'API Access', description: 'Access to platform APIs', category: 'Integration' },
    { id: 'priority_support', name: 'Priority Support', description: 'Priority customer support', category: 'Support' },
    { id: 'bulk_operations', name: 'Bulk Operations', description: 'Perform bulk data operations', category: 'Data' },
    { id: 'white_label', name: 'White Label Options', description: 'White label platform features', category: 'Branding' },
    
    // Organization permissions
    { id: 'member_management', name: 'Member Management', description: 'Manage organization members', category: 'Organization' },
    { id: 'judge_management', name: 'Judge Management', description: 'Manage judges and scoring for competitions', category: 'Organization' },
    { id: 'multiple_member_accounts', name: 'Multiple Member Accounts', description: 'Create and manage multiple member accounts for organization', category: 'Organization' },
    { id: 'event_hosting', name: 'Event Hosting', description: 'Host and organize events', category: 'Events' },
    { id: 'community_building', name: 'Community Building', description: 'Access community building tools', category: 'Community' },
    { id: 'custom_branding', name: 'Custom Branding', description: 'Custom branding and themes', category: 'Branding' }
  ]);

  useEffect(() => {
    loadPlans();
    loadPermissions();
    if (activeTab === 'teams') {
      loadTeams();
    } else if (activeTab === 'billing') {
      loadBillingAnalytics();
    }
  }, [activeTab]);

  const loadPermissions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role_name, permission, resource')
        .order('role_name');

      if (error) throw error;

      // Transform the data into our permissions format
      const permissionsMap = new Map();
      
      data.forEach((item: any) => {
        const id = item.permission;
        const name = item.permission
          .split('_')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        const category = item.resource.charAt(0).toUpperCase() + item.resource.slice(1);
        
        if (!permissionsMap.has(id)) {
          permissionsMap.set(id, {
            id,
            name,
            description: `Permission to ${item.permission.replace(/_/g, ' ')} ${item.resource}`,
            category
          });
        }
      });
      
      // Always merge database permissions with default permissions
      const dbPermissions = Array.from(permissionsMap.values());
      
      // Create a combined list, prioritizing default permissions for display
      const combinedPermissions = [...defaultPermissions];
      
      // Add any database permissions that aren't in defaults
      dbPermissions.forEach(dbPerm => {
        if (!defaultPermissions.find(defPerm => defPerm.id === dbPerm.id)) {
          combinedPermissions.push(dbPerm);
        }
      });
      
      setPermissions(combinedPermissions);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      // Always fall back to default permissions
      setPermissions(defaultPermissions);
    }
  }, [defaultPermissions]);

  const loadPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Transform the data to match our interface
      const transformedPlans: MembershipPlan[] = (data || []).map(plan => ({
        id: plan.id,
        name: plan.name,
        type: plan.type,
        price: plan.price,
        billing_period: plan.billing_period,
        description: plan.description,
        features: Array.isArray(plan.features) ? plan.features : [],
        permissions: Array.isArray(plan.permissions) ? plan.permissions : [],
        is_active: plan.is_active,
        is_featured: plan.is_featured,
        hidden_on_frontend: plan.hidden_on_frontend || false,
        show_on_competitor_page: plan.show_on_competitor_page || false,
        show_on_business_page: plan.show_on_business_page || false,
        show_on_organization_page: plan.show_on_organization_page || false,
        auto_renewal_enabled: plan.auto_renewal_enabled || false,
        trial_period_days: plan.trial_period_days,
        stripe_price_id_monthly: plan.stripe_price_id_monthly,
        stripe_price_id_yearly: plan.stripe_price_id_yearly,
        max_events_per_month: plan.limits?.max_events_per_month,
        max_team_members: plan.limits?.max_team_members,
        max_listings: plan.limits?.max_listings,
        display_order: plan.display_order,
        special_price: plan.special_price,
        special_price_reason: plan.special_price_reason,
        special_price_valid_days: plan.special_price_valid_days,
        special_price_start_date: plan.special_price_start_date,
        special_price_end_date: plan.special_price_end_date,
        created_at: plan.created_at,
        updated_at: plan.updated_at
      }));

      setPlans(transformedPlans);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch owner names separately
      const ownerIds = (data || []).map(team => team.owner_id).filter(Boolean);
      let ownerNames: Record<string, string> = {};
      
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from('users')
          .select('id, name')
          .in('id', ownerIds);
        
        if (owners) {
          ownerNames = owners.reduce((acc, owner) => {
            acc[owner.id] = owner.name || 'Unknown';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const transformedTeams: Team[] = (data || []).map(team => ({
        id: team.id,
        name: team.name,
        description: team.description || '',
        team_type: team.team_type || 'competitive',
        location: team.location,
        website: team.website,
        logo_url: team.logo_url,
        is_public: team.is_public,
        requires_approval: team.requires_approval,
        max_members: team.max_members,
        total_points: team.total_points,
        competitions_won: team.competitions_won,
        owner_id: team.owner_id,
        owner_name: ownerNames[team.owner_id] || 'Unknown',
        member_count: team.team_members?.length || 0,
        created_at: team.created_at,
        updated_at: team.updated_at
      }));

      setTeams(transformedTeams);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTeamMembers = useCallback(async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      // Fetch user information separately
      const userIds = (data || []).map(member => member.user_id).filter(Boolean);
      let userInfo: Record<string, { name: string; email: string }> = {};
      
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', userIds);
        
        if (users) {
          userInfo = users.reduce((acc, user) => {
            acc[user.id] = { name: user.name || 'Unknown', email: user.email };
            return acc;
          }, {} as Record<string, { name: string; email: string }>);
        }
      }

      const transformedMembers: TeamMember[] = (data || []).map(member => ({
        id: member.id,
        team_id: member.team_id,
        user_id: member.user_id,
        user_name: userInfo[member.user_id]?.name || 'Unknown',
        user_email: userInfo[member.user_id]?.email || '',
        role: member.role,
        joined_at: member.joined_at,
        points_contributed: member.points_contributed || 0,
        is_active: member.is_active
      }));

      setTeamMembers(transformedMembers);
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  }, []);

  const loadBillingAnalytics = useCallback(async () => {
    try {
      setBillingLoading(true);
      
      // Get total revenue
      const { data: revenueData, error: revenueError } = await supabase
        .from('transactions')
        .select('amount, currency, created_at')
        .eq('type', 'payment')
        .eq('status', 'succeeded');

      if (revenueError) throw revenueError;

      const totalRevenue = revenueData?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      // Get active subscriptions count per plan
      const { data: subscriptionsData, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          membership_plan_id,
          membership_plans (name, price)
        `)
        .eq('status', 'active');

      if (subsError) throw subsError;

      // Calculate analytics per plan
      const planAnalytics = plans.map(plan => {
        const planSubscriptions = subscriptionsData?.filter(sub => sub.membership_plan_id === plan.id) || [];
        const planRevenue = revenueData?.filter(t => t.membership_plan_id === plan.id)
          .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

        return {
          planId: plan.id,
          planName: plan.name,
          activeSubscriptions: planSubscriptions.length,
          monthlyRevenue: planRevenue,
          planPrice: plan.price,
          billingPeriod: plan.billing_period
        };
      });

      // Get recent transactions
      const { data: recentTransactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (transError) throw transError;

      // Get failed payments count (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: failedPayments, error: failedError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (failedError) throw failedError;

      setBillingStats({
        totalRevenue: totalRevenue / 100, // Convert from cents
        activeSubscriptions: subscriptionsData?.length || 0,
        failedPayments: failedPayments || 0,
        recentTransactions: recentTransactions || []
      });

      setPlanAnalytics(planAnalytics);
    } catch (error) {
      console.error('Failed to load billing analytics:', error);
    } finally {
      setBillingLoading(false);
    }
  }, [plans]);

  const handleCreatePlan = () => {
    setFormData({
      name: '',
      type: 'competitor',
      price: undefined,
      billing_period: 'yearly',
      description: '',
      features: [],
      permissions: [],
      is_active: true,
      is_featured: false,
      hidden_on_frontend: false,
      show_on_competitor_page: true,
      show_on_business_page: false,
      show_on_organization_page: false,
      auto_renewal_enabled: true,
      trial_period_days: 0,
      stripe_price_id_monthly: '',
      stripe_price_id_yearly: '',
      max_events_per_month: undefined,
      max_team_members: undefined,
      max_listings: undefined
    });
    setEditingPlan(null);
    setShowPlanModal(true);
  };

  const handleEditPlan = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setFormData(plan);
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    try {
      if (editingPlan) {
        setSaveStatus('saving');
        
        // Prepare the data for update
        const limits = {
          max_events_per_month: formData.max_events_per_month,
          max_team_members: formData.max_team_members,
          max_listings: formData.max_listings
        };
        
        const { error } = await supabase
          .from('membership_plans')
          .update({
            name: formData.name,
            type: formData.type,
            price: formData.price,
            billing_period: formData.billing_period,
            description: formData.description,
            features: formData.features,
            permissions: formData.permissions,
            limits: limits,
            is_active: formData.is_active,
            is_featured: formData.is_featured,
            hidden_on_frontend: formData.hidden_on_frontend,
            show_on_competitor_page: formData.show_on_competitor_page,
            show_on_business_page: formData.show_on_business_page,
            show_on_organization_page: formData.show_on_organization_page,
            auto_renewal_enabled: formData.auto_renewal_enabled,
            trial_period_days: formData.trial_period_days,
            stripe_price_id_monthly: formData.stripe_price_id_monthly,
            stripe_price_id_yearly: formData.stripe_price_id_yearly,
            special_price: formData.special_price,
            special_price_reason: formData.special_price_reason,
            special_price_valid_days: formData.special_price_valid_days,
            special_price_start_date: formData.special_price ? new Date().toISOString() : null,
            display_order: editingPlan.display_order || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPlan.id);

        if (error) throw error;
        
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        // Reload plans to get the updated data
        await loadPlans();
      } else {
        setSaveStatus('saving');
        
        // Prepare the data for insert
        const limits = {
          max_events_per_month: formData.max_events_per_month,
          max_team_members: formData.max_team_members,
          max_listings: formData.max_listings
        };
        
        // Get the highest display order
        const maxDisplayOrder = Math.max(...plans.map(p => p.display_order || 0), 0);
        
        const { error } = await supabase
          .from('membership_plans')
          .insert({
            name: formData.name,
            type: formData.type,
            price: formData.price,
            billing_period: formData.billing_period,
            description: formData.description,
            features: formData.features,
            permissions: formData.permissions,
            limits: limits,
            is_active: formData.is_active,
            is_featured: formData.is_featured,
            hidden_on_frontend: formData.hidden_on_frontend,
            show_on_competitor_page: formData.show_on_competitor_page,
            show_on_business_page: formData.show_on_business_page,
            show_on_organization_page: formData.show_on_organization_page,
            auto_renewal_enabled: formData.auto_renewal_enabled,
            trial_period_days: formData.trial_period_days,
            stripe_price_id_monthly: formData.stripe_price_id_monthly,
            stripe_price_id_yearly: formData.stripe_price_id_yearly,
            special_price: formData.special_price,
            special_price_reason: formData.special_price_reason,
            special_price_valid_days: formData.special_price_valid_days,
            special_price_start_date: formData.special_price ? new Date().toISOString() : null,
            display_order: maxDisplayOrder + 1
          });

        if (error) throw error;
        
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
        
        // Reload plans to get the updated data
        await loadPlans();
      }
      
      setShowPlanModal(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Failed to save plan:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('membership_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      
      // Reload plans after deletion
      await loadPlans();
      
      // Close the confirmation modal
      setShowDeleteConfirm(false);
      setPlanToDelete(null);
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), newFeature.trim()]
      });
      setNewFeature('');
      setShowFeatureInput(false);
    }
  };

  const startAddingFeature = () => {
    setShowFeatureInput(true);
    setNewFeature('');
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features?.filter((_, i) => i !== index) || []
    });
  };

  const moveFeature = (fromIndex: number, toIndex: number) => {
    const features = [...(formData.features || [])];
    const [movedFeature] = features.splice(fromIndex, 1);
    features.splice(toIndex, 0, movedFeature);
    setFormData({
      ...formData,
      features
    });
  };

  const updateFeature = (index: number, newValue: string) => {
    const features = [...(formData.features || [])];
    features[index] = newValue;
    setFormData({
      ...formData,
      features
    });
  };

  const togglePermission = (permissionId: string) => {
    const currentPermissions = formData.permissions || [];
    const hasPermission = currentPermissions.includes(permissionId);
    
    setFormData({
      ...formData,
      permissions: hasPermission
        ? currentPermissions.filter(p => p !== permissionId)
        : [...currentPermissions, permissionId]
    });
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = membershipTypes.find(t => t.id === type);
    return typeConfig ? typeConfig.icon : Users;
  };

  const getTypeColor = (type: string) => {
    const typeConfig = membershipTypes.find(t => t.id === type);
    return typeConfig ? typeConfig.color : 'blue';
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const togglePlanSelection = (planId: string) => {
    setSelectedPlans(prev => 
      prev.includes(planId) 
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedPlans.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('membership_plans')
        .delete()
        .in('id', selectedPlans);

      if (error) throw error;
      
      await loadPlans();
      setSelectedPlans([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Failed to delete plans:', error);
    }
  };

  const handleBulkToggleStatus = async (active: boolean) => {
    if (selectedPlans.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('membership_plans')
        .update({ is_active: active })
        .in('id', selectedPlans);

      if (error) throw error;
      
      await loadPlans();
      setSelectedPlans([]);
    } catch (error) {
      console.error('Failed to update plans:', error);
    }
  };

  const handleDuplicatePlan = (plan: MembershipPlan) => {
    setEditingPlan(null);
    setFormData({
      ...plan,
      name: `${plan.name} (Copy)`,
      is_featured: false
    });
    setShowPlanModal(true);
  };

  const handleCreateTeam = () => {
    setTeamFormData({
      name: '',
      description: '',
      team_type: 'competitive',
      location: '',
      website: '',
      is_public: true,
      requires_approval: true,
      max_members: 50,
      total_points: 0,
      competitions_won: 0
    });
    setEditingTeam(null);
    setShowTeamModal(true);
  };

  const handleEditTeam = (team: Team) => {
    setTeamFormData(team);
    setEditingTeam(team);
    setShowTeamModal(true);
  };

  const handleSaveTeam = async () => {
    try {
      setSaveStatus('saving');

      const teamData = {
        name: teamFormData.name,
        description: teamFormData.description,
        team_type: teamFormData.team_type,
        location: teamFormData.location,
        website: teamFormData.website,
        is_public: teamFormData.is_public,
        requires_approval: teamFormData.requires_approval,
        max_members: teamFormData.max_members,
        updated_at: new Date().toISOString()
      };

      if (editingTeam) {
        const { error } = await supabase
          .from('teams')
          .update(teamData)
          .eq('id', editingTeam.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('teams')
          .insert([{
            ...teamData,
            owner_id: user!.id,
            total_points: 0,
            competitions_won: 0
          }]);

        if (error) throw error;
      }

      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus('idle');
        setShowTeamModal(false);
        loadTeams();
      }, 1500);

    } catch (error) {
      console.error('Failed to save team:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      setShowDeleteConfirm(false);
      setTeamToDelete(null);
      loadTeams();
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  const handleViewTeamMembers = (team: Team) => {
    setSelectedTeam(team);
    loadTeamMembers(team.id);
  };

  const getTeamTypeIcon = (type: string) => {
    const teamType = teamTypes.find(t => t.id === type);
    return teamType ? teamType.icon : Trophy;
  };

  const getTeamTypeColor = (type: string) => {
    const teamType = teamTypes.find(t => t.id === type);
    return teamType ? teamType.color : 'red';
  };

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

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-electric-500 rounded-lg flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Membership Management</h1>
              <p className="text-gray-400">Manage membership plans, features, and permissions</p>
            </div>
          </div>
          {activeTab === 'plans' && (
            <button 
              onClick={handleCreatePlan}
              className="bg-electric-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Plan</span>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-800/30 rounded-xl p-1 mb-8">
          <button
            onClick={() => setActiveTab('plans')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'plans'
                ? 'bg-electric-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Plans</span>
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'teams'
                ? 'bg-electric-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Teams</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'permissions'
                ? 'bg-electric-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Permissions</span>
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'suggestions'
                ? 'bg-electric-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <Send className="h-4 w-4" />
            <span>Event Suggestions</span>
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'billing'
                ? 'bg-electric-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Billing</span>
          </button>
        </div>

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Membership Plans</h2>
              <button
                onClick={handleCreatePlan}
                className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Plan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                <div className="col-span-full text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading plans...</p>
                </div>
              ) : (
                plans.map((plan) => {
                  const TypeIcon = getTypeIcon(plan.type);
                  const typeColor = getTypeColor(plan.type);
                  
                  return (
                    <div
                      key={plan.id}
                      className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border-2 transition-all duration-300 hover:scale-105 ${
                        plan.is_featured
                          ? 'border-electric-500 shadow-electric-500/20 shadow-2xl'
                          : 'border-gray-700/50 hover:border-gray-600'
                      }`}
                    >
                      {plan.is_featured && (
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                          <div className="bg-electric-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center space-x-1">
                            <Star className="h-3 w-3" />
                            <span>Featured</span>
                          </div>
                        </div>
                      )}

                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-${typeColor}-500`}>
                            <TypeIcon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditPlan(plan)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title="Edit Plan"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setPlanToDelete(plan);
                                setShowDeleteConfirm(true);
                              }}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Delete Plan"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className={`text-xs font-medium px-2 py-1 rounded-full bg-${typeColor}-500/20 text-${typeColor}-400 mb-3 inline-block`}>
                          {plan.type.charAt(0).toUpperCase() + plan.type.slice(1)}
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                        
                        <div className="mb-4">
                          {plan.price === 0 ? (
                            <div className="text-2xl font-black text-white">Free</div>
                          ) : (
                            <>
                              {plan.special_price !== null && plan.special_price !== undefined && 
                               plan.special_price_start_date && 
                               new Date(plan.special_price_start_date) <= new Date() &&
                               (!plan.special_price_end_date || new Date(plan.special_price_end_date) > new Date()) ? (
                                <div>
                                  <div className="flex items-baseline">
                                    <span className="text-xl text-gray-500 line-through mr-2">${plan.price}</span>
                                    <span className="text-3xl font-black text-green-400">${plan.special_price}</span>
                                    <span className="text-gray-400 ml-2">/{plan.billing_period}</span>
                                  </div>
                                  {plan.special_price_reason && (
                                    <div className="text-xs text-yellow-400 mt-1">{plan.special_price_reason}</div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-baseline">
                                  <span className="text-3xl font-black text-white">${plan.price}</span>
                                  <span className="text-gray-400 ml-2">/{plan.billing_period}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="text-white font-medium text-sm">Features:</div>
                          <ul className="space-y-1">
                            {plan.features.slice(0, 3).map((feature, index) => (
                              <li key={index} className="flex items-center space-x-2 text-gray-300 text-xs">
                                <Check className="h-3 w-3 text-electric-500 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                            {plan.features.length > 3 && (
                              <li className="text-gray-500 text-xs">
                                +{plan.features.length - 3} more features
                              </li>
                            )}
                          </ul>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span className={`px-2 py-1 rounded-full ${plan.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span>{plan.permissions.length} permissions</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Team Management</h2>
              <button
                onClick={handleCreateTeam}
                className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Team</span>
              </button>
            </div>

            {selectedTeam ? (
              // Team Members View
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setSelectedTeam(null)}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedTeam.name}</h3>
                      <p className="text-gray-400">Team Members</p>
                    </div>
                  </div>
                  <button className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2">
                    <UserPlus className="h-4 w-4" />
                    <span>Invite Member</span>
                  </button>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="text-left p-4 text-gray-300 font-medium">Member</th>
                          <th className="text-left p-4 text-gray-300 font-medium">Role</th>
                          <th className="text-left p-4 text-gray-300 font-medium">Joined</th>
                          <th className="text-left p-4 text-gray-300 font-medium">Points</th>
                          <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map((member) => (
                          <tr key={member.id} className="border-t border-gray-700/50 hover:bg-gray-700/20">
                            <td className="p-4">
                              <div>
                                <div className="text-white font-medium">{member.user_name}</div>
                                <div className="text-gray-400 text-sm">{member.user_email}</div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                member.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400' :
                                member.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-blue-500/20 text-blue-400'
                              }`}>
                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                              </span>
                            </td>
                            <td className="p-4 text-gray-300">
                              {new Date(member.joined_at).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-gray-300">
                              {member.points_contributed.toLocaleString()}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <button className="text-blue-400 hover:text-blue-300 transition-colors">
                                  <Edit className="h-4 w-4" />
                                </button>
                                {member.role !== 'owner' && (
                                  <button className="text-red-400 hover:text-red-300 transition-colors">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              // Teams List View
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  <div className="col-span-full text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading teams...</p>
                  </div>
                ) : (
                  teams.map((team) => {
                    const TypeIcon = getTeamTypeIcon(team.team_type);
                    const typeColor = getTeamTypeColor(team.team_type);
                    
                    return (
                      <div
                        key={team.id}
                        className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 hover:scale-105"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-${typeColor}-500`}>
                            <TypeIcon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewTeamMembers(team)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title="View Members"
                            >
                              <Users className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditTeam(team)}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              title="Edit Team"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setTeamToDelete(team);
                                setShowDeleteConfirm(true);
                              }}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Delete Team"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">{team.name}</h3>
                        <div className={`text-xs font-medium px-2 py-1 rounded-full bg-${typeColor}-500/20 text-${typeColor}-400 mb-3 inline-block`}>
                          {team.team_type.charAt(0).toUpperCase() + team.team_type.slice(1)}
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{team.description}</p>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Owner:</span>
                            <span className="text-white">{team.owner_name}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Members:</span>
                            <span className="text-white">{team.member_count}/{team.max_members}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Points:</span>
                            <span className="text-white">{team.total_points.toLocaleString()}</span>
                          </div>
                          {team.location && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-400">Location:</span>
                              <span className="text-white">{team.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span className={`px-2 py-1 rounded-full ${team.is_public ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {team.is_public ? 'Public' : 'Private'}
                          </span>
                          <span>{new Date(team.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {/* Permissions Tab - Enhanced with new Permission Manager */}
        {activeTab === 'permissions' && (
          <PermissionManager />
        )}

        {/* Event Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <EventSuggestionSettings />
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-8">
            {/* Billing Analytics Overview */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Billing Analytics</h2>
              
              {billingLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading billing analytics...</p>
                </div>
              ) : billingStats ? (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Total Revenue</p>
                          <p className="text-2xl font-bold text-green-400">
                            ${billingStats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-400 opacity-50" />
                      </div>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Active Subscriptions</p>
                          <p className="text-2xl font-bold text-blue-400">{billingStats.activeSubscriptions}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-400 opacity-50" />
                      </div>
                    </div>

                    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-400 text-sm">Failed Payments (30d)</p>
                          <p className="text-2xl font-bold text-red-400">{billingStats.failedPayments}</p>
                        </div>
                        <AlertCircle className="h-8 w-8 text-red-400 opacity-50" />
                      </div>
                    </div>
                  </div>

                  {/* Plan Analytics */}
                  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 mb-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Revenue by Plan
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {planAnalytics.map((plan) => (
                        <div key={plan.planId} className="bg-gray-700/30 p-4 rounded-lg">
                          <h4 className="text-white font-medium mb-2">{plan.planName}</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Subscribers:</span>
                              <span className="text-white">{plan.activeSubscriptions}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Revenue:</span>
                              <span className="text-green-400">
                                ${(plan.monthlyRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Plan Price:</span>
                              <span className="text-white">${plan.planPrice}/{plan.billingPeriod}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 mb-8">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Recent Transactions
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-700/50">
                          <tr>
                            <th className="text-left p-3 text-gray-300 font-medium">Date</th>
                            <th className="text-left p-3 text-gray-300 font-medium">Plan</th>
                            <th className="text-left p-3 text-gray-300 font-medium">Amount</th>
                            <th className="text-left p-3 text-gray-300 font-medium">Status</th>
                            <th className="text-left p-3 text-gray-300 font-medium">Provider</th>
                          </tr>
                        </thead>
                        <tbody>
                          {billingStats.recentTransactions.slice(0, 5).map((transaction: any) => (
                            <tr key={transaction.id} className="border-t border-gray-700/50">
                              <td className="p-3 text-gray-300 text-sm">
                                {new Date(transaction.created_at).toLocaleDateString()}
                              </td>
                              <td className="p-3 text-white text-sm">
                                {transaction.description || 'N/A'}
                              </td>
                              <td className="p-3 text-green-400 text-sm font-medium">
                                ${((transaction.amount || 0) / 100).toFixed(2)}
                              </td>
                              <td className="p-3 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.status === 'succeeded' ? 'bg-green-500/20 text-green-400' :
                                  transaction.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {transaction.status}
                                </span>
                              </td>
                              <td className="p-3 text-gray-300 text-sm capitalize">
                                {transaction.payment_provider}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No billing data available</p>
                </div>
              )}
            </div>

            {/* Coupon Management Section */}
            <div>
              <AdminCouponManager />
            </div>
          </div>
        )}

        {/* Plan Modal */}
        {showPlanModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                  </h3>
                  <button
                    onClick={() => setShowPlanModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 flex items-center">
                      Plan Name
                      <FieldHelper text="The display name for this membership plan (e.g., 'Pro Competitor', 'Business Retailer')" />
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Enter plan name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 flex items-center">
                      Membership Type
                      <FieldHelper text="The category of user this plan is designed for (Competitor, Retailer, Manufacturer, Organization)" />
                    </label>
                    <select
                      value={formData.type || 'competitor'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      {membershipTypes.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 flex items-center">
                      Price ($)
                      <FieldHelper text="The cost of this plan in USD. Set to 0 for free plans. This is the base price that will be displayed." />
                    </label>
                    <input
                      type="number"
                      value={formData.price ?? ''}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 flex items-center">
                      Billing Period
                      <FieldHelper text="How often users are charged for this plan (Monthly, Yearly, or One-time Lifetime payment)" />
                    </label>
                    <select
                      value={formData.billing_period || 'yearly'}
                      onChange={(e) => setFormData({ ...formData, billing_period: e.target.value as any })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </div>
                </div>

                {/* Special Pricing Section */}
                <div className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border border-yellow-600/30 p-4 rounded-lg space-y-4">
                  <h4 className="text-white font-medium mb-3 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-yellow-500" />
                    Special Limited-Time Pricing
                    <FieldHelper text="Set up temporary promotional pricing that automatically expires after a specified number of days" />
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center">
                        Special Price ($)
                        <FieldHelper text="The promotional price during the special period. Leave empty to disable special pricing." />
                      </label>
                      <input
                        type="number"
                        value={formData.special_price ?? ''}
                        onChange={(e) => setFormData({ ...formData, special_price: e.target.value ? parseFloat(e.target.value) : null })}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center">
                        Valid For (Days)
                        <FieldHelper text="Number of days the special price will be active from the start date" />
                      </label>
                      <input
                        type="number"
                        value={formData.special_price_valid_days ?? ''}
                        onChange={(e) => setFormData({ ...formData, special_price_valid_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        min="1"
                        placeholder="30"
                        disabled={!formData.special_price}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center">
                        Promotion Reason
                        <FieldHelper text="The reason shown to customers (e.g., 'Limited Time Only', 'Christmas Special', 'Launch Pricing')" />
                      </label>
                      <input
                        type="text"
                        value={formData.special_price_reason || ''}
                        onChange={(e) => setFormData({ ...formData, special_price_reason: e.target.value || null })}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="Limited Time Only"
                        disabled={!formData.special_price}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Special Price Status
                      </label>
                      {formData.special_price && formData.special_price_valid_days ? (
                        <div className="p-3 bg-green-900/30 border border-green-600/50 rounded-lg">
                          <p className="text-green-400 text-sm">
                            Special price will be active immediately upon saving
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            Expires after {formData.special_price_valid_days} days
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-700/30 border border-gray-600/50 rounded-lg">
                          <p className="text-gray-400 text-sm">
                            No special pricing configured
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {formData.special_price && (
                    <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3">
                      <p className="text-yellow-400 text-sm flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Special pricing starts immediately when you save the plan
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2 flex items-center">
                    Description
                    <FieldHelper text="A brief description of what this plan offers. This will be shown to users when they're choosing a plan." />
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 resize-none"
                    rows={3}
                    placeholder="Enter plan description"
                  />
                </div>

                {/* Subscription Settings */}
                <div className="bg-gray-700/30 p-4 rounded-lg space-y-4">
                  <h4 className="text-white font-medium mb-3 flex items-center">
                    Subscription Settings
                    <FieldHelper text="Configure payment processing and subscription behavior for this plan" />
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center">
                        Trial Period (Days)
                        <FieldHelper text="Number of free trial days before charging begins. Set to 0 for no trial period." />
                      </label>
                      <input
                        type="number"
                        value={formData.trial_period_days ?? ''}
                        onChange={(e) => setFormData({ ...formData, trial_period_days: e.target.value ? parseInt(e.target.value) : 0 })}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        min="0"
                        placeholder="0"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.auto_renewal_enabled || false}
                          onChange={(e) => setFormData({ ...formData, auto_renewal_enabled: e.target.checked })}
                          className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                        />
                        <span className="text-gray-300">Enable Auto-Renewal</span>
                        <FieldHelper text="When enabled, subscriptions will automatically renew at the end of each billing period" />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center">
                        Stripe Monthly Price ID
                        <FieldHelper text="The Stripe Price ID for monthly billing (e.g., price_1234567890). Get this from your Stripe dashboard." />
                      </label>
                      <input
                        type="text"
                        value={formData.stripe_price_id_monthly || ''}
                        onChange={(e) => setFormData({ ...formData, stripe_price_id_monthly: e.target.value })}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="price_1234567890"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center">
                        Stripe Yearly Price ID
                        <FieldHelper text="The Stripe Price ID for yearly billing (e.g., price_0987654321). Get this from your Stripe dashboard." />
                      </label>
                      <input
                        type="text"
                        value={formData.stripe_price_id_yearly || ''}
                        onChange={(e) => setFormData({ ...formData, stripe_price_id_yearly: e.target.value })}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="price_0987654321"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 flex items-center">
                      Max Events/Month
                      <FieldHelper text="Maximum number of events this user can create per month. Leave empty for unlimited." />
                    </label>
                    <input
                      type="number"
                      value={formData.max_events_per_month ?? ''}
                      onChange={(e) => setFormData({ ...formData, max_events_per_month: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Unlimited"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 flex items-center">
                      Max Team Members
                      <FieldHelper text="Maximum number of team members this user can have. Leave empty for unlimited." />
                    </label>
                    <input
                      type="number"
                      value={formData.max_team_members ?? ''}
                      onChange={(e) => setFormData({ ...formData, max_team_members: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Unlimited"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 flex items-center">
                      Max Listings
                      <FieldHelper text="Maximum number of directory listings this user can create. Leave empty for unlimited." />
                    </label>
                    <input
                      type="number"
                      value={formData.max_listings ?? ''}
                      onChange={(e) => setFormData({ ...formData, max_listings: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-gray-400 text-sm flex items-center">
                      Features
                      <FieldHelper text="List of features included with this plan. These will be displayed as bullet points to users." />
                    </label>
                    {!showFeatureInput && (
                      <button
                        onClick={startAddingFeature}
                        className="text-electric-400 hover:text-electric-300 text-sm flex items-center space-x-1"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Feature</span>
                      </button>
                    )}
                  </div>
                  
                  {showFeatureInput && (
                    <div className="mb-4 flex items-center space-x-2">
                      <input
                        type="text"
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="Enter feature description..."
                        className="flex-1 p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                        autoFocus
                      />
                      <button
                        onClick={addFeature}
                        disabled={!newFeature.trim()}
                        className="bg-electric-500 text-white px-3 py-2 rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowFeatureInput(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {(formData.features || []).map((feature, index) => (
                      <div 
                        key={index} 
                        className="flex items-center space-x-2 bg-gray-700/30 p-2 rounded group hover:bg-gray-700/50 transition-colors"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', index.toString());
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                          const toIndex = index;
                          if (fromIndex !== toIndex) {
                            moveFeature(fromIndex, toIndex);
                          }
                        }}
                      >
                        <div className="cursor-move text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zM7 8a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zM7 14a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zM13 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 2zM13 8a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zM13 14a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"></path>
                          </svg>
                        </div>
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => updateFeature(index, e.target.value)}
                          className="flex-1 bg-transparent text-white text-sm border-none outline-none focus:bg-gray-600/30 px-2 py-1 rounded"
                          placeholder="Feature description"
                        />
                        <button
                          onClick={() => removeFeature(index)}
                          className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-4 flex items-center">
                    Permissions
                    <FieldHelper text="Select which permissions users with this plan will have. This controls what they can access and do on the platform." />
                  </label>
                  <div className="space-y-4">
                    {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => (
                      <div key={category}>
                        <h4 className="text-white font-medium mb-2">{category}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {categoryPermissions.map((permission) => (
                            <label key={permission.id} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(formData.permissions || []).includes(permission.id)}
                                onChange={() => togglePermission(permission.id)}
                                className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                              />
                              <span className="text-gray-300 text-sm">{permission.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active || false}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                    />
                    <span className="text-gray-300">Active</span>
                    <FieldHelper text="When active, this plan will be available for new subscriptions. Inactive plans are hidden from users." />
                  </label>
                  
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_featured || false}
                      onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                    />
                    <span className="text-gray-300">Featured</span>
                    <FieldHelper text="Featured plans are highlighted with a special badge and appear more prominently to users." />
                  </label>
                  
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.hidden_on_frontend || false}
                      onChange={(e) => setFormData({ ...formData, hidden_on_frontend: e.target.checked })}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                    />
                    <span className="text-gray-300">Hidden on Frontend</span>
                    <FieldHelper text="When checked, this plan won't be shown to users on the pricing page, but can still be assigned manually." />
                  </label>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3 flex items-center">
                    Pricing Page Display
                    <FieldHelper text="Control which pricing pages this plan appears on. You can show the same plan on multiple pages if needed." />
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.show_on_competitor_page || false}
                        onChange={(e) => setFormData({ ...formData, show_on_competitor_page: e.target.checked })}
                        className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                      />
                      <span className="text-gray-300">Show on Competitor Page</span>
                      <FieldHelper text="Display this plan on the /pricing page (competitor-focused)" />
                    </label>
                    
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.show_on_business_page || false}
                        onChange={(e) => setFormData({ ...formData, show_on_business_page: e.target.checked })}
                        className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                      />
                      <span className="text-gray-300">Show on Business Page</span>
                      <FieldHelper text="Display this plan on the /business page (retailer/manufacturer-focused)" />
                    </label>
                    
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.show_on_organization_page || false}
                        onChange={(e) => setFormData({ ...formData, show_on_organization_page: e.target.checked })}
                        className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                      />
                      <span className="text-gray-300">Show on Organization Page</span>
                      <FieldHelper text="Display this plan on the /organizations page (organization-focused)" />
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  disabled={saveStatus === 'saving'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePlan}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                    saveStatus === 'success'
                      ? 'bg-green-600 text-white'
                      : saveStatus === 'error'
                      ? 'bg-red-600 text-white'
                      : 'bg-electric-500 text-white hover:bg-electric-600'
                  } disabled:opacity-50`}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Saved Successfully</span>
                    </>
                  ) : saveStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      <span>Error Saving</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{editingPlan ? 'Update Plan' : 'Create Plan'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Team Modal */}
        {showTeamModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingTeam ? 'Edit Team' : 'Create New Team'}
                  </h3>
                  <button
                    onClick={() => setShowTeamModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 flex items-center">
                      Team Name
                      <FieldHelper text="The display name for this team (e.g., 'Bass Heads', 'Sound Quality Masters')" />
                    </label>
                    <input
                      type="text"
                      value={teamFormData.name || ''}
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
                      value={teamFormData.team_type || 'competitive'}
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
                      value={teamFormData.location || ''}
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
                      value={teamFormData.max_members ?? ''}
                      onChange={(e) => setTeamFormData({ ...teamFormData, max_members: e.target.value ? parseInt(e.target.value) : 50 })}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      min="1"
                      placeholder="50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2 flex items-center">
                    Website
                    <FieldHelper text="Team website URL (optional)" />
                  </label>
                  <input
                    type="url"
                    value={teamFormData.website || ''}
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
                    value={teamFormData.description || ''}
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
                      checked={teamFormData.is_public || false}
                      onChange={(e) => setTeamFormData({ ...teamFormData, is_public: e.target.checked })}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                    />
                    <span className="text-gray-300">Public Team</span>
                    <FieldHelper text="When public, the team will be visible to all users and can be joined" />
                  </label>
                  
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teamFormData.requires_approval || false}
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
                  onClick={() => setShowTeamModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  disabled={saveStatus === 'saving'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTeam}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                    saveStatus === 'success'
                      ? 'bg-green-600 text-white'
                      : saveStatus === 'error'
                      ? 'bg-red-600 text-white'
                      : 'bg-electric-500 text-white hover:bg-electric-600'
                  } disabled:opacity-50`}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : saveStatus === 'success' ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Saved Successfully</span>
                    </>
                  ) : saveStatus === 'error' ? (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      <span>Error Saving</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{editingTeam ? 'Update Team' : 'Create Team'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && planToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Delete Plan</h3>
                    <p className="text-gray-400">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-gray-300 mb-6">
                  Are you sure you want to delete <strong>{planToDelete.name}</strong>? 
                  This will affect all users currently subscribed to this plan.
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setPlanToDelete(null);
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeletePlan(planToDelete.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}