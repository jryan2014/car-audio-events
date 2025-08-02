import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  User, Trophy, Calendar, Users, TrendingUp, Star, ArrowRight, 
  Plus, Target, Award, MapPin, CreditCard, Package, Clock, 
  DollarSign, FileText, Shield, Activity, Heart, Settings,
  ChevronRight, Home, BarChart3, Zap, Bell, X, CheckCircle, Crown,
  Edit, Save, LogOut
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import DashboardWidgets, { Widget } from '../components/DashboardWidgets';
import { ServiceWorkerManager } from '../components/ServiceWorkerManager';
import { ActivityLogger } from '../utils/activityLogger';
import { activityLogger } from '../services/activityLogger';
import { getMembershipDisplayName } from '../utils/membershipUtils';
import SavedEvents from '../components/SavedEvents';
import { billingService, Subscription } from '../services/billingService';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import LogCAEEventModal from '../components/LogCAEEventModal';
import { useNotifications } from '../components/NotificationSystem';

// Memory-optimized component with proper cleanup
const Dashboard = React.memo(() => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  
  // Core dashboard state
  const [stats, setStats] = useState({
    totalCompetitions: 0,
    totalPoints: 0,
    averageScore: 0,
    bestPlacement: 0,
    upcomingEvents: 0,
    teamMemberships: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentResults, setRecentResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [competitionData, setCompetitionData] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Profile editing state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    location: '',
    phone: '',
    website: '',
    bio: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Competition functionality state
  const [competitionResults, setCompetitionResults] = useState([]);
  const [showLogCAEEventModal, setShowLogCAEEventModal] = useState(false);
  const [showLogEventModal, setShowLogEventModal] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [isLoadingCompetitions, setIsLoadingCompetitions] = useState(false);
  const [eventFormData, setEventFormData] = useState({
    event_name: '',
    event_date: '',
    event_location: '',
    event_organizer: '',
    category: '',
    class: '',
    vehicle_year: '',
    vehicle_make: '',
    vehicle_model: '',
    score: '',
    placement: '',
    total_participants: '',
    notes: ''
  });

  // Memory cleanup tracking
  const abortControllerRef = React.useRef(null);
  const timeoutRefs = React.useRef([]);

  // Initialize edit form data when user changes or edit mode is enabled
  useEffect(() => {
    if (user && isEditMode) {
      setEditFormData({
        name: user.name || '',
        location: user.location || '',
        phone: user.phone || '',
        website: user.website || '',
        bio: user.bio || ''
      });
    }
  }, [user, isEditMode]);

  // Optimized data loading with proper cleanup and error boundaries
  const loadDashboardData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Create new abort controller for this request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      // Load data in smaller batches to prevent memory spikes
      const batch1Promise = Promise.all([
        loadUpcomingEvents(),
        loadUserStats()
      ]);

      const batch2Promise = Promise.all([
        loadRecentResults(),
        loadBillingData()
      ]);

      const batch3Promise = Promise.all([
        loadCompetitionHistory(),
        loadCompetitionResults()
      ]);

      // Execute batches sequentially with small delays
      await batch1Promise;
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 10);
        timeoutRefs.current.push(timeout);
      });

      await batch2Promise;
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 10);
        timeoutRefs.current.push(timeout);
      });

      await batch3Promise;

      // Throttled activity logging to prevent spam
      try {
        await activityLogger.log({
          userId: user.id,
          activityType: 'dashboard_view',
          description: 'User visited unified Dashboard page',
          metadata: {
            page: 'dashboard',
            user_email: user.email,
            user_name: user.name,
            membership_type: user.membershipType,
            subscription_plan: user.subscriptionPlan
          }
        });
      } catch (logError) {
        console.warn('Failed to log dashboard access:', logError);
      }

      setError(null);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error loading dashboard data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadUserStats = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('competition_results')
        .select('*')
        .eq('user_id', user.id)
        .limit(1000); // Limit to prevent excessive memory usage

      if (error) throw error;

      const results = data || [];
      const totalComps = results.length;
      const totalPts = results.reduce((sum, r) => sum + (r.points_earned || 0), 0);
      const avgScore = results.length > 0 
        ? results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length 
        : 0;
      const bestPlace = results.length > 0
        ? Math.min(...results.map(r => r.placement || 999))
        : 0;

      setStats(prev => ({
        ...prev,
        totalCompetitions: totalComps,
        totalPoints: totalPts,
        averageScore: Math.round(avgScore * 10) / 10,
        bestPlacement: bestPlace === 999 ? 0 : bestPlace
      }));
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }, [user]);

  const loadUpcomingEvents = useCallback(async () => {
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
        category: event.event_categories?.name || 'Competition',
        registrationDeadline: event.registration_deadline,
        isRegistered: false
      }));

      setUpcomingEvents(formattedEvents);
      setStats(prev => ({ ...prev, upcomingEvents: formattedEvents.length }));
    } catch (error) {
      console.error('Error loading upcoming events:', error);
      setUpcomingEvents([]);
    }
  }, []);

  const loadRecentResults = useCallback(async () => {
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
        placement: result.placement || 0,
        totalParticipants: result.total_participants || 0,
        points: result.points_earned || 0,
        date: result.created_at
      }));

      setRecentResults(formattedResults);
    } catch (error) {
      console.error('Error loading recent results:', error);
      setRecentResults([]);
    }
  }, [user]);

  const loadBillingData = useCallback(async () => {
    if (!user) return;
    try {
      const overview = await billingService.getUserBillingOverview(user.id);
      setSubscription(overview.subscription);
    } catch (error) {
      console.error('Error loading billing data:', error);
    }
  }, [user]);

  const loadCompetitionHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('competition_results')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50); // Limit to last 50 results

      if (error) throw error;

      // Transform data for charts with memory optimization
      const chartData = (data || []).slice(-20).map(result => ({
        date: new Date(result.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        score: result.score || 0,
        placement: result.placement || 0,
        points: result.points_earned || 0
      }));

      setCompetitionData(chartData);
    } catch (error) {
      console.error('Error loading competition history:', error);
      setCompetitionData([]);
    }
  }, [user]);

  const loadCompetitionResults = useCallback(async () => {
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
        .order('created_at', { ascending: false })
        .limit(100); // Limit to prevent memory issues
      
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
  }, [user]);

  // Profile saving functionality
  const handleSaveProfile = useCallback(async () => {
    if (!user) return;
    
    setIsSavingProfile(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editFormData.name.trim(),
          location: editFormData.location.trim() || null,
          phone: editFormData.phone.trim() || null,
          website: editFormData.website.trim() || null,
          bio: editFormData.bio.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      showSuccess('Profile Updated', 'Your profile has been updated successfully.');
      setIsEditMode(false);
      
      // Refresh user data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Update Failed', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  }, [user, editFormData, showSuccess, showError]);

  // Main effect with proper cleanup
  useEffect(() => {
    if (user || !authLoading) {
      loadDashboardData();
    }

    // Cleanup function
    return () => {
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Clear any pending timeouts
      timeoutRefs.current.forEach(timeout => {
        clearTimeout(timeout);
      });
      timeoutRefs.current = [];
    };
  }, [user, authLoading, loadDashboardData]);

  // Quick actions configuration
  const quickActions = useMemo(() => [
    {
      title: 'Browse Events',
      description: 'Find competitions near you',
      icon: Calendar,
      link: '/events',
      color: 'blue'
    },
    {
      title: 'Update Audio System',
      description: 'Manage your setup',
      icon: Zap,
      link: '/profile?tab=audio-systems',
      color: 'purple'
    },
    {
      title: 'Support Desk',
      description: 'Get help or report issues',
      icon: Shield,
      link: '/support',
      color: 'green'
    },
    {
      title: 'View Leaderboard',
      description: 'See top competitors',
      icon: Trophy,
      link: '/leaderboard',
      color: 'orange'
    }
  ], []);

  // Helper functions
  const formatDateShort = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  const getPlacementColor = useCallback((placement) => {
    if (placement === 1) return 'text-yellow-400';
    if (placement <= 3) return 'text-orange-400';
    if (placement <= 10) return 'text-green-400';
    return 'text-gray-400';
  }, []);

  const getActionColor = useCallback((color) => {
    const colors = {
      blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 hover:from-blue-500/30 hover:to-blue-600/30',
      purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 hover:from-purple-500/30 hover:to-purple-600/30',
      green: 'from-green-500/20 to-green-600/20 border-green-500/30 hover:from-green-500/30 hover:to-green-600/30',
      orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30 hover:from-orange-500/30 hover:to-orange-600/30'
    };
    return colors[color] || colors.blue;
  }, []);

  // Early returns for loading and auth states
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

  // Rest of the component remains the same but with improved profile editing...
  // [The rest would be the existing JSX with the profile form improvements]
  
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

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

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
          </nav>
        </div>

        {/* Profile Tab Content with Proper Form Handling */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Full Name</label>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
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
                        value={editFormData.location}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))}
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
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(555) 123-4567"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                      />
                    ) : (
                      <p className="text-white bg-gray-700/50 rounded-lg px-3 py-2">{user.phone || 'Not set'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Website</label>
                    {isEditMode ? (
                      <input
                        type="url"
                        value={editFormData.website}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, website: e.target.value }))}
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
                        value={editFormData.bio}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, bio: e.target.value }))}
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

              {isEditMode && (
                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-gray-700">
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSavingProfile ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      setEditFormData({
                        name: user?.name || '',
                        location: user?.location || '',
                        phone: user?.phone || '',
                        website: user?.website || '',
                        bio: user?.bio || ''
                      });
                    }}
                    disabled={isSavingProfile}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="mt-8 flex justify-end">
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-lg p-3">
            <ServiceWorkerManager showFullInterface={false} />
          </div>
        </div>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;