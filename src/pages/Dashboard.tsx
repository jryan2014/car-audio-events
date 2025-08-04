import React, { useState, useEffect } from 'react';
import { 
  User, Trophy, Calendar, Users, TrendingUp, Star, ArrowRight, 
  Plus, Target, Award, MapPin, CreditCard, Package, Clock, 
  DollarSign, FileText, Shield, Activity, Heart, Settings,
  ChevronRight, Home, BarChart3, Zap, Bell, X, CheckCircle, Crown,
  Edit, Save, LogOut, Car
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import DashboardWidgets, { Widget } from '../components/DashboardWidgets';
import { ServiceWorkerManager } from '../components/ServiceWorkerManager';
import { ActivityLogger } from '../utils/activityLogger';
import { activityLogger } from '../services/activityLogger';
import { getMembershipDisplayName } from '../utils/membershipUtils';
import SavedEvents from '../components/SavedEvents';
import { billingService, Subscription } from '../services/billingService';
import { formatDate } from '../utils/date-utils';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import LogCAEEventModal from '../components/LogCAEEventModal';
import { useNotifications } from '../components/NotificationSystem';

// Resend Verification Email Component
const ResendVerificationEmailButton: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  const { resendVerificationEmail } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleResend = async () => {
    try {
      setSending(true);
      await resendVerificationEmail(userEmail);
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      alert('Failed to send verification email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      onClick={handleResend}
      disabled={sending || sent}
      className={`px-6 py-3 rounded-lg transition-colors ${
        sent 
          ? 'bg-green-500 text-white' 
          : 'bg-electric-500 text-white hover:bg-electric-600'
      } ${(sending || sent) ? 'opacity-75 cursor-not-allowed' : ''}`}
    >
      {sending ? 'Sending...' : sent ? 'Email Sent!' : 'Resend Verification Email'}
    </button>
  );
};

interface DashboardStats {
  totalCompetitions: number;
  totalPoints: number;
  averageScore: number;
  bestPlacement: number;
  upcomingEvents: number;
  teamMemberships: number;
}

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  registrationDeadline: string;
  isRegistered: boolean;
}

interface RecentResult {
  id: string;
  eventTitle: string;
  category: string;
  position: number;
  totalParticipants: number;
  points: number;
  date: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  link: string;
  color: string;
  external?: boolean;
}

interface Division {
  id: string;
  name: string;
  description?: string;
  display_order: number;
}

interface CompetitionClass {
  id: string;
  division_id: string;
  name: string;
  description?: string;
  display_order: number;
}

interface CompetitionResult {
  id: string;
  user_id: string;
  event_id?: number;
  event_attendance_id?: string;
  category: string;
  class?: string;
  division_id?: string;
  class_id?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  score?: number;
  position?: number;
  total_participants?: number;
  points_earned: number;
  notes?: string;
  verified?: boolean;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  events?: {
    id: number;
    name: string;
    start_date: string;
    location: string;
  };
}

export default function Dashboard() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError } = useNotifications();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalCompetitions: 0,
    totalPoints: 0,
    averageScore: 0,
    bestPlacement: 0,
    upcomingEvents: 0,
    teamMemberships: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentResults, setRecentResults] = useState<RecentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [competitionData, setCompetitionData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'competitions' | 'billing' | 'audio-system'>('overview');
  
  // Competition functionality state
  const [competitionResults, setCompetitionResults] = useState<CompetitionResult[]>([]);
  const [showLogCAEEventModal, setShowLogCAEEventModal] = useState(false);
  const [showLogEventModal, setShowLogEventModal] = useState(false);
  const [editingResult, setEditingResult] = useState<CompetitionResult | null>(null);
  const [isLoadingCompetitions, setIsLoadingCompetitions] = useState(false);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [classes, setClasses] = useState<CompetitionClass[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<CompetitionClass[]>([]);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [audioSystems, setAudioSystems] = useState<any[]>([]);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [showNewClassInput, setShowNewClassInput] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    event_name: '',
    event_date: '',
    event_location: '',
    event_organizer: '',
    category: '',
    class: '',
    division_id: '',
    class_id: '',
    class_name: '',
    vehicle_year: '',
    vehicle_make: '',
    vehicle_model: '',
    score: '',
    position: '',
    total_participants: '',
    notes: ''
  });

  const quickActions: QuickAction[] = [
    {
      title: 'Browse Events',
      description: 'Find competitions near you',
      icon: Calendar,
      link: '/events',
      color: 'blue'
    },
    {
      title: 'View Leaderboard',
      description: 'See top competitors',
      icon: Trophy,
      link: '/leaderboard',
      color: 'yellow'
    },
    {
      title: 'SPL Calculator',
      description: 'Calculate your competition class',
      icon: TrendingUp,
      link: '/spl-calculator',
      color: 'orange'
    },
    {
      title: 'Support Desk',
      description: 'Get help or report issues',
      icon: Shield,
      link: '/dashboard/support',
      color: 'green'
    }
  ];

  // Handle query parameters for logging competitions
  useEffect(() => {
    if (user && !authLoading) {
      const logCAE = searchParams.get('logCAE');
      const logNonCAE = searchParams.get('logNonCAE');
      
      if (logCAE === 'true' || logNonCAE === 'true') {
        // Switch to competitions tab
        setActiveTab('competitions');
        
        // Open appropriate modal after a short delay to ensure tab content is rendered
        setTimeout(() => {
          if (logCAE === 'true') {
            setShowLogCAEEventModal(true);
          } else if (logNonCAE === 'true') {
            setShowLogEventModal(true);
          }
          
          // Clear the query parameters to prevent reopening on refresh
          searchParams.delete('logCAE');
          searchParams.delete('logNonCAE');
          setSearchParams(searchParams);
        }, 100);
      }
    }
  }, [user, authLoading, searchParams, setSearchParams]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSavingProfile(true);
    try {
      // Get all form values
      const form = document.getElementById('profileForm') as HTMLFormElement;
      if (!form) return;
      
      const formData = new FormData(form);
      const updateData = {
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        address: formData.get('address') as string,
        city: formData.get('city') as string,
        state: formData.get('state') as string,
        zip: formData.get('zip') as string,
        website: formData.get('website') as string,
        bio: formData.get('bio') as string,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);
        
      if (error) throw error;
      
      showSuccess('Profile updated successfully!');
      await refreshUser();
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      if (user) {
        try {
          await Promise.all([
            loadUpcomingEvents(),
            loadUserStats(),
            loadRecentResults(),
            loadBillingData(),
            loadCompetitionHistory(),
            loadCompetitionResults()
          ]);
          
          // Log dashboard access
          await activityLogger.log({
            userId: user.id,
            activityType: 'dashboard_view',
            description: `User visited unified Dashboard page`,
            metadata: {
              page: 'dashboard',
              user_email: user.email,
              user_name: user.name,
              membership_type: user.membershipType,
              subscription_plan: user.subscriptionPlan
            }
          });
          
          setError(null);
        } catch (error) {
          console.error('Error loading dashboard data:', error);
          setError(error instanceof Error ? error.message : 'Unknown error occurred');
        } finally {
          setIsLoading(false);
        }
      } else if (!authLoading) {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user, authLoading]);

  const loadBillingData = async () => {
    if (!user) return;
    try {
      const overview = await billingService.getUserBillingOverview(user.id);
      setSubscription(overview.subscription);
    } catch (error) {
      console.error('Error loading billing data:', error);
    }
  };

  const loadCompetitionHistory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('competition_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Transform data for charts
      const chartData = (data || []).map(result => ({
        date: new Date(result.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        score: result.score || 0,
        position: result.position || 0,
        points: result.points_earned || 0
      }));

      setCompetitionData(chartData);
    } catch (error) {
      console.error('Error loading competition history:', error);
    }
  };

  const loadCompetitionResults = async () => {
    if (!user) return;
    
    setIsLoadingCompetitions(true);
    try {
      const { data, error } = await supabase
        .from('competition_results')
        .select(`
          *,
          events (
            id,
            title,
            start_date,
            city,
            state
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading competition results:', error);
        setCompetitionResults([]);
      } else {
        setCompetitionResults(data || []);
      }
    } catch (error) {
      console.error('Error loading competition results:', error);
      setCompetitionResults([]);
    } finally {
      setIsLoadingCompetitions(false);
    }
  };

  const loadDivisions = async () => {
    setIsLoadingDivisions(true);
    try {
      const { data, error } = await supabase
        .from('competition_divisions')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setDivisions(data || []);
    } catch (error) {
      console.error('Error loading divisions:', error);
    } finally {
      setIsLoadingDivisions(false);
    }
  };

  const loadClasses = async (divisionId: string) => {
    setIsLoadingClasses(true);
    try {
      const { data, error } = await supabase
        .from('competition_classes')
        .select('*')
        .eq('division_id', divisionId)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setClasses(data || []);
      setFilteredClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const loadAudioSystems = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_audio_systems')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAudioSystems(data || []);
    } catch (error) {
      console.error('Error loading audio systems:', error);
    }
  };

  const handleEditResult = (result: CompetitionResult) => {
    setEditingResult(result);
    setEventFormData({
      event_name: result.events?.name || '',
      event_date: result.events?.start_date || '',
      event_location: result.events?.location || '',
      event_organizer: '',
      category: result.category,
      class: result.class || '',
      division_id: result.division_id || '',
      class_id: result.class_id || '',
      class_name: '',
      vehicle_year: result.vehicle_year?.toString() || '',
      vehicle_make: result.vehicle_make || '',
      vehicle_model: result.vehicle_model || '',
      score: result.score?.toString() || '',
      position: result.position?.toString() || '',
      total_participants: result.total_participants?.toString() || '',
      notes: result.notes || ''
    });
    
    // Load divisions when opening modal
    loadDivisions();
    
    // If there's a division_id, load classes for that division
    if (result.division_id) {
      loadClasses(result.division_id);
    }
    
    setShowLogEventModal(true);
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate required fields
    if (!eventFormData.division_id || (!eventFormData.class_id && !eventFormData.class_name)) {
      showError('Validation Error', 'Please select a division and class.');
      return;
    }

    try {
      let classId = eventFormData.class_id;
      
      // If creating a new class, call the function to create or get it
      if (!classId && eventFormData.class_name) {
        const { data: classResult, error: classError } = await supabase
          .rpc('create_or_get_competition_class', {
            p_division_id: eventFormData.division_id,
            p_class_name: eventFormData.class_name,
            p_created_by: user.id
          });
        
        if (classError) throw classError;
        classId = classResult;
      }

      const resultData = {
        user_id: user.id,
        is_cae_event: false,
        event_name: eventFormData.event_name,
        event_date: eventFormData.event_date,
        event_location: eventFormData.event_location,
        category: eventFormData.category,
        class: eventFormData.class || null,
        division_id: eventFormData.division_id,
        class_id: classId,
        vehicle_year: eventFormData.vehicle_year ? parseInt(eventFormData.vehicle_year) : null,
        vehicle_make: eventFormData.vehicle_make || null,
        vehicle_model: eventFormData.vehicle_model || null,
        score: eventFormData.score ? parseFloat(eventFormData.score) : null,
        position: eventFormData.position ? parseInt(eventFormData.position) : null,
        total_participants: eventFormData.total_participants ? parseInt(eventFormData.total_participants) : null,
        points_earned: 0, // Calculate based on position and category
        notes: eventFormData.notes || null,
        updated_at: new Date().toISOString()
      };

      if (editingResult) {
        const { error } = await supabase
          .from('competition_results')
          .update(resultData)
          .eq('id', editingResult.id);
        
        if (error) throw error;
        showSuccess('Result Updated', 'Competition result has been updated successfully.');
      } else {
        const { error } = await supabase
          .from('competition_results')
          .insert([resultData]);
        
        if (error) throw error;
        showSuccess('Result Added', 'Competition result has been added successfully.');
      }

      await loadCompetitionResults();
      setShowLogEventModal(false);
      setEditingResult(null);
      setShowNewClassInput(false);
      setEventFormData({
        event_name: '',
        event_date: '',
        event_location: '',
        event_organizer: '',
        category: '',
        class: '',
        division_id: '',
        class_id: '',
        class_name: '',
        vehicle_year: '',
        vehicle_make: '',
        vehicle_model: '',
        score: '',
        position: '',
        total_participants: '',
        notes: ''
      });
    } catch (error: any) {
      console.error('Error saving competition result:', error);
      showError('Save Failed', error.message || 'Failed to save competition result. Please try again.');
    }
  };

  const loadUserStats = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('competition_results')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const results = data || [];
      const totalComps = results.length;
      const totalPts = results.reduce((sum, r) => sum + (r.points_earned || 0), 0);
      const avgScore = results.length > 0 
        ? results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length 
        : 0;
      const bestPlace = results.length > 0
        ? Math.min(...results.map(r => r.position || 999))
        : 0;
      const wins = results.filter(r => r.position === 1).length;
      const podiums = results.filter(r => r.position && r.position <= 3).length;

      setStats({
        totalCompetitions: totalComps,
        totalPoints: totalPts,
        averageScore: Math.round(avgScore * 10) / 10,
        bestPlacement: bestPlace === 999 ? 0 : bestPlace,
        upcomingEvents: 0, // Will be updated from events query
        teamMemberships: 0  // Will be updated from teams query
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadUpcomingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_date,
          city,
          state,
          category_id,
          registration_deadline,
          event_categories!inner(name)
        `)
        .eq('status', 'published')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(5);

      if (error) throw error;

      const formattedEvents = (data || []).map(event => ({
        id: event.id,
        title: event.title,
        date: event.start_date,
        location: `${event.city}, ${event.state}`,
        category: (event.event_categories as any)?.name || 'Competition',
        registrationDeadline: event.registration_deadline,
        isRegistered: false
      }));

      setUpcomingEvents(formattedEvents);
      setStats(prev => ({ ...prev, upcomingEvents: formattedEvents.length }));
    } catch (error) {
      console.error('Error loading upcoming events:', error);
      setUpcomingEvents([]);
    }
  };

  const loadRecentResults = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('competition_results')
        .select(`
          id,
          category,
          placement,
          total_participants,
          points_earned,
          created_at,
          score
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formattedResults = (data || []).map(result => ({
        id: result.id,
        eventTitle: 'Competition Event',
        category: result.category,
        position: result.placement || 0,
        totalParticipants: result.total_participants || 0,
        points: result.points_earned || 0,
        date: result.created_at
      }));

      setRecentResults(formattedResults);
    } catch (error) {
      console.error('Error loading recent results:', error);
      setRecentResults([]);
    }
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-yellow-400';
    if (position <= 3) return 'text-orange-400';
    if (position <= 10) return 'text-green-400';
    return 'text-gray-400';
  };

  // Load audio systems when audio-system tab is active
  useEffect(() => {
    if (activeTab === 'audio-system' && user) {
      loadAudioSystems();
    }
  }, [activeTab, user]);

  // Load billing data when billing tab is active
  useEffect(() => {
    if (activeTab === 'billing' && user) {
      loadBillingData();
    }
  }, [activeTab, user]);

  const getActionColor = (color: string) => {
    const colors = {
      blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 hover:from-blue-500/30 hover:to-blue-600/30',
      purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 hover:from-purple-500/30 hover:to-purple-600/30',
      green: 'from-green-500/20 to-green-600/20 border-green-500/30 hover:from-green-500/30 hover:to-green-600/30',
      orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30 hover:from-orange-500/30 hover:to-orange-600/30',
      yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 hover:from-yellow-500/30 hover:to-yellow-600/30'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to access your dashboard</h2>
          <Link
            to="/login"
            className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Check if user needs admin approval or email verification
  if (['retailer', 'manufacturer', 'organization'].includes(user.membershipType) && 
      user.status === 'pending') {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Account Pending Approval</h2>
            <p className="text-gray-400 mb-6">
              Your {user.membershipType} account is pending admin approval. You'll receive an email once your account is approved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (user.verificationStatus === 'pending' && user.membershipType !== 'admin') {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Email Verification Required</h2>
            <p className="text-gray-400 mb-6">
              Please verify your email address to access all dashboard features.
            </p>
            <ResendVerificationEmailButton userEmail={user.email} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Welcome back, <span className="text-electric-400">{user?.name}</span>
              </h1>
              <p className="text-gray-400 mt-2">
                Your unified dashboard for everything car audio
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-electric-500/20 text-electric-400 px-3 py-1 rounded-full text-sm font-medium">
                {getMembershipDisplayName(user?.membershipType, user?.subscriptionPlan)}
              </span>
              <Link
                to="/profile"
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl mb-6">
          <nav className="flex flex-wrap p-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Home className="h-4 w-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('competitions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'competitions'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Trophy className="h-4 w-4" />
              Competitions
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'billing'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Billing
            </button>
            <button
              onClick={() => setActiveTab('audio-system')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'audio-system'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Zap className="h-4 w-4" />
              Audio System
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Competitions</p>
                    <p className="text-2xl font-bold text-white">{stats.totalCompetitions}</p>
                  </div>
                  <Trophy className="h-8 w-8 text-electric-500" />
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Total Points</p>
                    <p className="text-2xl font-bold text-electric-400">{stats.totalPoints}</p>
                  </div>
                  <Star className="h-8 w-8 text-electric-500" />
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Avg Score</p>
                    <p className="text-2xl font-bold text-white">{stats.averageScore}</p>
                  </div>
                  <Target className="h-8 w-8 text-green-500" />
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Best Rank</p>
                    <p className="text-2xl font-bold text-yellow-400">#{stats.bestPlacement || 'N/A'}</p>
                  </div>
                  <Award className="h-8 w-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Upcoming</p>
                    <p className="text-2xl font-bold text-white">{stats.upcomingEvents}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Membership</p>
                    <p className="text-lg font-bold text-white">
                      {subscription?.status === 'active' ? 'Active' : 'Free'}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.link}
                  className={`bg-gradient-to-br ${getActionColor(action.color)} border rounded-xl p-6 transition-all duration-200 group`}
                >
                  <div className="flex items-center space-x-3">
                    <action.icon className="h-8 w-8 text-white group-hover:scale-110 transition-transform" />
                    <div>
                      <h3 className="text-white font-semibold">{action.title}</h3>
                      <p className="text-gray-300 text-sm">{action.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Upcoming Events */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Upcoming Events</h2>
                  <Link
                    to="/events"
                    className="text-electric-400 hover:text-electric-300 text-sm font-medium flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                {upcomingEvents.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingEvents.slice(0, 3).map((event) => (
                      <div key={event.id} className="bg-gray-700/30 p-4 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-white font-semibold mb-1">{event.title}</h3>
                            <div className="text-gray-400 text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDateShort(event.date)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{event.location}</span>
                              </div>
                            </div>
                          </div>
                          <Link
                            to={`/events/${event.id}`}
                            className="bg-electric-500 text-white px-3 py-1 rounded-full text-xs font-medium hover:bg-electric-600 transition-colors"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No upcoming events</p>
                    <Link
                      to="/events"
                      className="text-electric-400 hover:text-electric-300 text-sm font-medium"
                    >
                      Browse Events
                    </Link>
                  </div>
                )}
              </div>

              {/* Recent Results */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Recent Results</h2>
                  <button
                    onClick={() => setActiveTab('competitions')}
                    className="text-electric-400 hover:text-electric-300 text-sm font-medium flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {recentResults.length > 0 ? (
                  <div className="space-y-4">
                    {recentResults.slice(0, 3).map((result) => (
                      <div key={result.id} className="bg-gray-700/30 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-white font-semibold mb-1">{result.eventTitle}</h3>
                            <div className="text-gray-400 text-sm">
                              <span className="bg-gray-600 px-2 py-1 rounded text-xs mr-2">
                                {result.category}
                              </span>
                              <span>{formatDateShort(result.date)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${getPositionColor(result.position)}`}>
                              #{result.position}
                            </div>
                            <div className="text-electric-400 text-sm font-medium">
                              +{result.points} pts
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No competition results yet</p>
                    <Link
                      to="/events"
                      className="text-electric-400 hover:text-electric-300 text-sm font-medium"
                    >
                      Join Your First Competition
                    </Link>
                  </div>
                )}
              </div>

              {/* Billing Summary */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Membership</h2>
                  <button
                    onClick={() => setActiveTab('billing')}
                    className="text-electric-400 hover:text-electric-300 text-sm font-medium flex items-center gap-1"
                  >
                    <span>Manage</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {subscription ? (
                  <div className="space-y-4">
                    <div className="bg-gray-700/30 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Plan</span>
                        <span className="text-white font-medium capitalize">
                          {subscription.membership_plan?.name || 'Free'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Status</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          subscription.status === 'active' 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {subscription.status}
                        </span>
                      </div>
                      {subscription.current_period_end && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Renews</span>
                          <span className="text-white text-sm">
                            {formatDateShort(subscription.current_period_end)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {subscription.status === 'active' && (
                      <Link
                        to="/billing"
                        className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-center block"
                      >
                        View Billing Details
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center py-4">
                      <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400 mb-4">Free Member</p>
                    </div>

                    {/* Pro Upgrade Section */}
                    <div className="bg-gray-700/30 border border-electric-500/20 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Crown className="h-5 w-5 text-electric-400" />
                        <h4 className="font-semibold text-white">Upgrade to Pro</h4>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">Get advanced analytics, priority support & exclusive events</p>
                      <button className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors text-sm">
                        View Benefits
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Information Section */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Profile Information</h2>
                <button
                  onClick={() => setIsEditMode(prev => !prev)}
                  className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center gap-2"
                >
                  {isEditMode ? <X className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  {isEditMode ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              <form id="profileForm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Full Name</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        id="name"
                        name="name"
                        defaultValue={user.name}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-electric-500"
                      />
                    ) : (
                      <p className="text-white bg-gray-700/50 rounded-lg px-3 py-2">{user.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Email Address</label>
                    <p className="text-white bg-gray-700/50 rounded-lg px-3 py-2">{user.email}</p>
                    <span className="text-xs text-gray-500">Email cannot be changed</span>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Location</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        defaultValue={user.location || ''}
                        placeholder="City, State"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                      />
                    ) : (
                      <p className="text-white bg-gray-700/50 rounded-lg px-3 py-2">{user.location || 'Not set'}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Phone Number</label>
                    {isEditMode ? (
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        defaultValue={user.phone || ''}
                        placeholder="(555) 123-4567"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                      />
                    ) : (
                      <p className="text-white bg-gray-700/50 rounded-lg px-3 py-2">{user.phone || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Street Address</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        id="address"
                        name="address"
                        defaultValue={user.address || ''}
                        placeholder="123 Main Street"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                      />
                    ) : (
                      <p className="text-white bg-gray-700/50 rounded-lg px-3 py-2">{user.address || 'Not set'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">City</label>
                      {isEditMode ? (
                        <input
                          type="text"
                          id="city"
                          name="city"
                          defaultValue={user.city || ''}
                          placeholder="City"
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        />
                      ) : (
                        <p className="text-white bg-gray-700/50 rounded-lg px-3 py-2">{user.city || 'Not set'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">State</label>
                      {isEditMode ? (
                        <input
                          type="text"
                          id="state"
                          name="state"
                          defaultValue={user.state || ''}
                          placeholder="State"
                          maxLength={2}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        />
                      ) : (
                        <p className="text-white bg-gray-700/50 rounded-lg px-3 py-2">{user.state || 'Not set'}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Zip Code</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        id="zip"
                        name="zip"
                        defaultValue={user.zip || ''}
                        placeholder="12345"
                        maxLength={10}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                      />
                    ) : (
                      <p className="text-white bg-gray-700/50 rounded-lg px-3 py-2">{user.zip || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Website</label>
                    {isEditMode ? (
                      <input
                        type="url"
                        id="website"
                        name="website"
                        defaultValue={user.website || ''}
                        placeholder="https://yourwebsite.com"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                      />
                    ) : (
                      <p className="text-white bg-gray-700/50 rounded-lg px-3 py-2">{user.website || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Bio</label>
                    {isEditMode ? (
                      <textarea
                        id="bio"
                        name="bio"
                        defaultValue={user.bio || ''}
                        placeholder="Tell us about yourself..."
                        rows={3}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 resize-none"
                      />
                    ) : (
                      <p className="text-white bg-gray-700/50 rounded-lg px-3 py-2 min-h-[88px]">{user.bio || 'Not set'}</p>
                    )}
                  </div>
                </div>
              </div>

              </form>
              
              {isEditMode && (
                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-700">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('competitions')}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-electric-500/50 transition-colors text-left"
              >
                <Trophy className="h-8 w-8 text-electric-500 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Competitions</h3>
                <p className="text-gray-400 text-sm">View your competition history and results</p>
              </button>
              
              <button
                onClick={() => setActiveTab('billing')}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-electric-500/50 transition-colors text-left"
              >
                <CreditCard className="h-8 w-8 text-electric-500 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Billing & Membership</h3>
                <p className="text-gray-400 text-sm">Manage your subscription and payment methods</p>
              </button>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <Settings className="h-8 w-8 text-electric-500 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Account Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-gray-300">Email Verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-gray-300">Account Active</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Member since {formatDateShort(new Date().toISOString())}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Settings Options */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Account Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Link
                  to="/profile?tab=verification"
                  className="bg-gray-700/50 hover:bg-gray-700 transition-colors rounded-lg p-3 flex items-center gap-3"
                >
                  <Shield className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-300">Verification</span>
                  <ChevronRight className="h-4 w-4 text-gray-500 ml-auto" />
                </Link>
                
                <Link
                  to="/profile?tab=audio-systems"
                  className="bg-gray-700/50 hover:bg-gray-700 transition-colors rounded-lg p-3 flex items-center gap-3"
                >
                  <Zap className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-300">Audio Systems</span>
                  <ChevronRight className="h-4 w-4 text-gray-500 ml-auto" />
                </Link>
                
                <Link
                  to="/profile?tab=saved-events"
                  className="bg-gray-700/50 hover:bg-gray-700 transition-colors rounded-lg p-3 flex items-center gap-3"
                >
                  <Heart className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-300">Saved Events</span>
                  <ChevronRight className="h-4 w-4 text-gray-500 ml-auto" />
                </Link>
                
                <Link
                  to="/profile?tab=teams"
                  className="bg-gray-700/50 hover:bg-gray-700 transition-colors rounded-lg p-3 flex items-center gap-3"
                >
                  <Users className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-300">Teams</span>
                  <ChevronRight className="h-4 w-4 text-gray-500 ml-auto" />
                </Link>
                
                <Link
                  to="/notifications"
                  className="bg-gray-700/50 hover:bg-gray-700 transition-colors rounded-lg p-3 flex items-center gap-3"
                >
                  <Bell className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-300">Notifications</span>
                  <ChevronRight className="h-4 w-4 text-gray-500 ml-auto" />
                </Link>
                
                <Link
                  to="/privacy-policy"
                  className="bg-gray-700/50 hover:bg-gray-700 transition-colors rounded-lg p-3 flex items-center gap-3"
                >
                  <Shield className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-300">Privacy & Security</span>
                  <ChevronRight className="h-4 w-4 text-gray-500 ml-auto" />
                </Link>
                
                <Link
                  to="/support"
                  className="bg-gray-700/50 hover:bg-gray-700 transition-colors rounded-lg p-3 flex items-center gap-3"
                >
                  <Shield className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-300">Help & Support</span>
                  <ChevronRight className="h-4 w-4 text-gray-500 ml-auto" />
                </Link>
                
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to sign out?')) {
                      window.location.href = '/logout';
                    }
                  }}
                  className="bg-gray-700/50 hover:bg-gray-700 transition-colors rounded-lg p-3 flex items-center gap-3 text-left"
                >
                  <LogOut className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-300">Sign Out</span>
                  <ChevronRight className="h-4 w-4 text-gray-500 ml-auto" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'competitions' && (
          <div className="space-y-6">
            {/* Competition Results */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                <Trophy className="h-6 w-6 text-electric-500" />
                <span>Competition Results</span>
              </h2>
              
              {/* Performance Summary Section */}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Performance Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* SPL Performance Chart */}
                  <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                    <h4 className="text-white font-semibold mb-4 flex items-center justify-between">
                      SPL Performance
                      <span className="text-electric-400 text-sm">{competitionResults.filter(r => r.category === 'SPL (Sound Pressure Level)').length} Events</span>
                    </h4>
                    {competitionResults.filter(r => r.category === 'SPL (Sound Pressure Level)').length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={competitionResults
                          .filter(r => r.category === 'SPL (Sound Pressure Level)')
                          .map(r => ({
                            date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'short' }),
                            score: r.score || 0,
                            event: r.events?.name || 'Competition'
                          }))
                          .slice(-6) // Last 6 events
                        }>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                          <YAxis stroke="#9CA3AF" fontSize={12} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                            labelStyle={{ color: '#E5E7EB' }}
                          />
                          <Bar dataKey="score" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-gray-500">
                        <p className="text-center">No SPL data yet</p>
                      </div>
                    )}
                    <div className="mt-2 text-center">
                      <span className="text-gray-400 text-xs">Avg: </span>
                      <span className="text-white font-semibold">
                        {competitionResults.filter(r => r.category === 'SPL (Sound Pressure Level)').length > 0
                          ? (competitionResults
                              .filter(r => r.category === 'SPL (Sound Pressure Level)')
                              .reduce((sum, r) => sum + (r.score || 0), 0) / 
                              competitionResults.filter(r => r.category === 'SPL (Sound Pressure Level)').length
                            ).toFixed(1) + ' dB'
                          : '0.0 dB'
                        }
                      </span>
                      <span className="text-gray-400 text-xs ml-4">Best: </span>
                      <span className="text-white font-semibold">
                        {competitionResults.filter(r => r.category === 'SPL (Sound Pressure Level)').length > 0
                          ? Math.max(...competitionResults
                              .filter(r => r.category === 'SPL (Sound Pressure Level)')
                              .map(r => r.score || 0)
                            ).toFixed(1) + ' dB'
                          : '0.0 dB'
                        }
                      </span>
                    </div>
                  </div>

                  {/* SQ Performance Chart */}
                  <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                    <h4 className="text-white font-semibold mb-4 flex items-center justify-between">
                      SQ Performance
                      <span className="text-electric-400 text-sm">{competitionResults.filter(r => r.category === 'SQ (Sound Quality)').length} Events</span>
                    </h4>
                    {competitionResults.filter(r => r.category === 'SQ (Sound Quality)').length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Imaging', value: 30, color: '#f59e0b' },
                              { name: 'Dynamics', value: 25, color: '#3b82f6' },
                              { name: 'Noise', value: 20, color: '#10b981' },
                              { name: 'Total', value: 25, color: '#8b5cf6' }
                            ]}
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[
                              { name: 'Imaging', value: 30, color: '#f59e0b' },
                              { name: 'Dynamics', value: 25, color: '#3b82f6' },
                              { name: 'Noise', value: 20, color: '#10b981' },
                              { name: 'Total', value: 25, color: '#8b5cf6' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                            labelStyle={{ color: '#E5E7EB' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-gray-500">
                        <p className="text-center">No SQ data yet</p>
                      </div>
                    )}
                    <div className="mt-2 text-center">
                      <span className="text-gray-400 text-xs">Avg: </span>
                      <span className="text-white font-semibold">
                        {competitionResults.filter(r => r.category === 'SQ (Sound Quality)').length > 0
                          ? (competitionResults
                              .filter(r => r.category === 'SQ (Sound Quality)')
                              .reduce((sum, r) => sum + (r.score || 0), 0) / 
                              competitionResults.filter(r => r.category === 'SQ (Sound Quality)').length
                            ).toFixed(1)
                          : '0.0'}
                      </span>
                      <span className="text-gray-400 text-xs ml-4">Best: </span>
                      <span className="text-white font-semibold">
                        {competitionResults.filter(r => r.category === 'SQ (Sound Quality)').length > 0
                          ? Math.max(...competitionResults
                              .filter(r => r.category === 'SQ (Sound Quality)')
                              .map(r => r.score || 0)
                            ).toFixed(1)
                          : '0.0'}
                      </span>
                    </div>
                  </div>

                  {/* Placements Chart */}
                  <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                    <h4 className="text-white font-semibold mb-4 flex items-center justify-between">
                      Placements
                      <span className="text-electric-400 text-sm">{competitionResults.length} Total</span>
                    </h4>
                    {competitionResults.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { 
                                name: '1st', 
                                value: competitionResults.filter(r => r.position === 1).length,
                                color: '#fbbf24'
                              },
                              { 
                                name: '2nd', 
                                value: competitionResults.filter(r => r.position === 2).length,
                                color: '#9ca3af'
                              },
                              { 
                                name: '3rd', 
                                value: competitionResults.filter(r => r.position === 3).length,
                                color: '#f97316'
                              },
                              { 
                                name: 'Other', 
                                value: competitionResults.filter(r => !r.position || r.position > 3).length,
                                color: '#4b5563'
                              }
                            ].filter(d => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                          >
                            {[
                              { 
                                name: '1st', 
                                value: competitionResults.filter(r => r.position === 1).length,
                                color: '#fbbf24'
                              },
                              { 
                                name: '2nd', 
                                value: competitionResults.filter(r => r.position === 2).length,
                                color: '#9ca3af'
                              },
                              { 
                                name: '3rd', 
                                value: competitionResults.filter(r => r.position === 3).length,
                                color: '#f97316'
                              },
                              { 
                                name: 'Other', 
                                value: competitionResults.filter(r => !r.position || r.position > 3).length,
                                color: '#4b5563'
                              }
                            ].filter(d => d.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                            labelStyle={{ color: '#E5E7EB' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-gray-500">
                        <p className="text-center">No position data yet</p>
                      </div>
                    )}
                    <div className="mt-2 text-center">
                      <span className="text-gray-400 text-xs">Win Rate: </span>
                      <span className="text-white font-semibold">
                        {competitionResults.length > 0
                          ? ((competitionResults.filter(r => r.position === 1).length / competitionResults.length) * 100).toFixed(0) + '%'
                          : '0%'}
                      </span>
                      <span className="text-gray-400 text-xs ml-4">Podium: </span>
                      <span className="text-white font-semibold">
                        {competitionResults.length > 0
                          ? ((competitionResults.filter(r => r.position && r.position <= 3).length / competitionResults.length) * 100).toFixed(0) + '%'
                          : '0%'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Competition Results Table */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-4">Competition History</h3>
                {competitionResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b border-gray-700">
                          <th className="py-3 text-gray-400 font-medium">Event</th>
                          <th className="py-3 text-gray-400 font-medium">Date</th>
                          <th className="py-3 text-gray-400 font-medium">Category</th>
                          <th className="text-center py-3 text-gray-400 font-medium">Placement</th>
                          <th className="text-center py-3 text-gray-400 font-medium">Score</th>
                          <th className="text-center py-3 text-gray-400 font-medium">Points</th>
                          <th className="text-right py-3 text-gray-400 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700/50">
                        {competitionResults.map((result) => {
                          const positionColor = 
                            result.position === 1 ? 'text-yellow-400' :
                            result.position === 2 ? 'text-gray-400' :
                            result.position === 3 ? 'text-orange-400' : 'text-white';
                          
                          return (
                            <tr key={result.id} className="hover:bg-gray-700/20 transition-colors">
                              <td className="py-4">
                                <div className="flex items-center space-x-2">
                                  {!result.events && (
                                    <span className="bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs">Non-CAE</span>
                                  )}
                                  <span className="text-white font-medium">
                                    {result.events?.name || 'Competition Event'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 text-gray-300">
                                {new Date(result.events?.start_date || result.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-4 text-gray-300">{result.category}</td>
                              <td className="py-4 text-center">
                                <span className={`font-bold ${positionColor}`}>
                                  {result.position ? `#${result.position}` : '-'}
                                </span>
                                {result.total_participants && (
                                  <span className="text-gray-500 text-sm ml-1">
                                    /{result.total_participants}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 text-center text-white">
                                {result.score || '-'}
                              </td>
                              <td className="py-4 text-center text-electric-400 font-medium">
                                {result.points_earned}
                              </td>
                              <td className="py-4 text-right">
                                {!result.events && (
                                  <button
                                    onClick={() => handleEditResult(result)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No competition results yet</p>
                    <p className="text-gray-500 text-sm mt-2">Start logging your competition results to see them here</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowLogCAEEventModal(true)}
                  className="flex-1 bg-electric-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Trophy className="h-5 w-5" />
                  <span>Log CAE Event Score</span>
                </button>
                
                <button
                  onClick={() => {
                    loadDivisions();
                    setShowLogEventModal(true);
                  }}
                  className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-600 transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Log Non-CAE Event</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Current Membership</h2>
              
              {subscription ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Plan</p>
                      <p className="text-white text-lg font-semibold capitalize">
                        {subscription.membership_plan?.name || 'Free'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Status</p>
                      <p className={`text-lg font-semibold ${
                        subscription.status === 'active' ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        {subscription.status === 'active' ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Next Billing</p>
                      <p className="text-white text-lg font-semibold">
                        {subscription.current_period_end 
                          ? formatDateShort(subscription.current_period_end)
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-700">
                    <Link
                      to="/billing"
                      className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors inline-flex items-center gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      Manage Billing
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Free Membership</h3>
                  <p className="text-gray-400 mb-6">
                    Upgrade to Pro to unlock all features and benefits
                  </p>
                  <Link
                    to="/pricing"
                    className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors inline-block"
                  >
                    View Pro Benefits
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Billing Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/billing#payment-methods"
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-electric-500/50 transition-colors"
              >
                <CreditCard className="h-8 w-8 text-electric-500 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Payment Methods</h3>
                <p className="text-gray-400 text-sm">Manage your payment methods</p>
              </Link>
              
              <Link
                to="/billing#invoices"
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-electric-500/50 transition-colors"
              >
                <FileText className="h-8 w-8 text-electric-500 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Invoices</h3>
                <p className="text-gray-400 text-sm">View and download invoices</p>
              </Link>
              
              <Link
                to="/billing#transactions"
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-electric-500/50 transition-colors"
              >
                <Activity className="h-8 w-8 text-electric-500 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Transactions</h3>
                <p className="text-gray-400 text-sm">View payment history</p>
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'audio-system' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Audio Systems</h2>
              <Link
                to="/profile?tab=system"
                className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Manage Systems</span>
              </Link>
            </div>

            {audioSystems.length > 0 ? (
              <div className="space-y-4">
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
                    </div>

                    {system.components && system.components.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {system.components.map((component: any) => (
                          <div key={component.id} className="bg-gray-700/30 p-4 rounded-lg">
                            <h4 className="text-white font-semibold capitalize mb-1">
                              {(component.category || '').replace('_', ' ')}
                            </h4>
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
                                      {specs.size && `${specs.size}"`}
                                      {specs.quantity && ` x${specs.quantity}`}
                                      {specs.type && ` • ${specs.type}`}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl">
                <Car className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Audio Systems</h3>
                <p className="text-gray-500 mb-4">Add your first audio system to get started</p>
                <Link
                  to="/profile?tab=system"
                  className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                >
                  Add Audio System
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Saved Events Widget (Only show on overview tab) */}
        {activeTab === 'overview' && (
          <div className="mt-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Saved Events</h2>
              <Link
                to="/profile?tab=saved-events"
                className="text-electric-400 hover:text-electric-300 text-sm font-medium flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <SavedEvents limit={3} showActions={false} />
          </div>
        )}

        {/* System Status (Only show on overview tab) */}
        {activeTab === 'overview' && (
          <div className="mt-8 flex justify-end">
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-lg p-3">
              <ServiceWorkerManager showFullInterface={false} />
            </div>
          </div>
        )}

        {/* Competition Modals */}
        {showLogEventModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                    <Trophy className="h-6 w-6 text-electric-500" />
                    <span>{editingResult ? 'Edit Result' : 'Log Non-CAE Event'}</span>
                  </h2>
                  <button
                    onClick={() => {
                      setShowLogEventModal(false);
                      setEditingResult(null);
                      setShowNewClassInput(false);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSaveResult} className="p-6 space-y-6">
                <div className="space-y-6">
                  {/* Event Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Event Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={eventFormData.event_name}
                        onChange={(e) => setEventFormData(prev => ({ ...prev, event_name: e.target.value }))}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="Enter event name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Event Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={eventFormData.event_date}
                        onChange={(e) => setEventFormData(prev => ({ ...prev, event_date: e.target.value }))}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={eventFormData.event_location}
                        onChange={(e) => setEventFormData(prev => ({ ...prev, event_location: e.target.value }))}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="Enter location"
                      />
                    </div>
                  </div>

                  {/* Division and Class */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Division <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={eventFormData.division_id}
                        onChange={(e) => {
                          const divisionId = e.target.value;
                          setEventFormData(prev => ({ ...prev, division_id: divisionId, class_id: '', class_name: '' }));
                          setShowNewClassInput(false);
                          if (divisionId) {
                            loadClasses(divisionId);
                          } else {
                            setFilteredClasses([]);
                          }
                        }}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-electric-500"
                        required
                        disabled={isLoadingDivisions}
                      >
                        <option value="">Select division...</option>
                        {divisions.map(division => (
                          <option key={division.id} value={division.id}>
                            {division.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Class <span className="text-red-500">*</span>
                      </label>
                      {!showNewClassInput ? (
                        <select
                          value={eventFormData.class_id}
                          onChange={(e) => {
                            if (e.target.value === 'new') {
                              setShowNewClassInput(true);
                              setEventFormData(prev => ({ ...prev, class_id: '', class_name: '' }));
                            } else {
                              setEventFormData(prev => ({ ...prev, class_id: e.target.value, class_name: '' }));
                            }
                          }}
                          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-electric-500"
                          required
                          disabled={!eventFormData.division_id || isLoadingClasses}
                        >
                          <option value="">Select class...</option>
                          {filteredClasses.map(cls => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                          {eventFormData.division_id && (
                            <option value="new">+ Add New Class</option>
                          )}
                        </select>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={eventFormData.class_name}
                            onChange={(e) => setEventFormData(prev => ({ ...prev, class_name: e.target.value }))}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                            placeholder="Enter new class name..."
                            required
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewClassInput(false);
                              setEventFormData(prev => ({ ...prev, class_id: '', class_name: '' }));
                            }}
                            className="text-sm text-gray-400 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Results */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Score
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={eventFormData.score}
                        onChange={(e) => setEventFormData(prev => ({ ...prev, score: e.target.value }))}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="Enter score"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Placement
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={eventFormData.position}
                        onChange={(e) => setEventFormData(prev => ({ ...prev, position: e.target.value }))}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="Enter position"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Total Participants
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={eventFormData.total_participants}
                        onChange={(e) => setEventFormData(prev => ({ ...prev, total_participants: e.target.value }))}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="Total participants"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={eventFormData.notes}
                    onChange={(e) => setEventFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                    placeholder="Enter any additional notes..."
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowLogEventModal(false);
                      setEditingResult(null);
                      setShowNewClassInput(false);
                    }}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{editingResult ? 'Update Result' : 'Log Result'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Log CAE Event Modal */}
        <LogCAEEventModal
          isOpen={showLogCAEEventModal}
          onClose={() => setShowLogCAEEventModal(false)}
          userId={user?.id || ''}
          onSuccess={() => {
            // Reload competition results
            loadCompetitionResults();
            setShowLogCAEEventModal(false);
          }}
        />
      </div>
    </div>
  );
}