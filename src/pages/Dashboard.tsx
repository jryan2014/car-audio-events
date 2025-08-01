import React, { useState, useEffect } from 'react';
import { 
  User, Trophy, Calendar, Users, TrendingUp, Star, ArrowRight, 
  Plus, Target, Award, MapPin, CreditCard, Package, Clock, 
  DollarSign, FileText, Shield, Activity, Heart, Settings,
  ChevronRight, Home, BarChart3, Zap, Bell
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
import { formatDate } from '../utils/date-utils';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

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
  placement: number;
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

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
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
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'competitions' | 'billing'>('overview');

  const quickActions: QuickAction[] = [
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
  ];

  useEffect(() => {
    const loadDashboardData = async () => {
      if (user) {
        try {
          await Promise.all([
            loadUpcomingEvents(),
            loadUserStats(),
            loadRecentResults(),
            loadBillingData(),
            loadCompetitionHistory()
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
      const overview = await billingService.getBillingOverview(user.id);
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
        .order('competed_at', { ascending: true });

      if (error) throw error;

      // Transform data for charts
      const chartData = (data || []).map(result => ({
        date: new Date(result.competed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        score: result.score || 0,
        placement: result.placement || 0,
        points: result.points_earned || 0
      }));

      setCompetitionData(chartData);
    } catch (error) {
      console.error('Error loading competition history:', error);
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
        ? Math.min(...results.map(r => r.placement || 999))
        : 0;
      const wins = results.filter(r => r.placement === 1).length;
      const podiums = results.filter(r => r.placement && r.placement <= 3).length;

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
          competed_at,
          score,
          is_cae_event,
          event_name
        `)
        .eq('user_id', user.id)
        .order('competed_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formattedResults = (data || []).map(result => ({
        id: result.id,
        eventTitle: result.event_name || 'Event',
        category: result.category,
        placement: result.placement || 0,
        totalParticipants: result.total_participants || 0,
        points: result.points_earned || 0,
        date: result.competed_at
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

  const getPlacementColor = (placement: number) => {
    if (placement === 1) return 'text-yellow-400';
    if (placement <= 3) return 'text-orange-400';
    if (placement <= 10) return 'text-green-400';
    return 'text-gray-400';
  };

  const getActionColor = (color: string) => {
    const colors = {
      blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 hover:from-blue-500/30 hover:to-blue-600/30',
      purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 hover:from-purple-500/30 hover:to-purple-600/30',
      green: 'from-green-500/20 to-green-600/20 border-green-500/30 hover:from-green-500/30 hover:to-green-600/30',
      orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30 hover:from-orange-500/30 hover:to-orange-600/30'
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
              <Link
                to="/notifications"
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 relative"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 bg-electric-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
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
                            <div className={`text-lg font-bold ${getPlacementColor(result.placement)}`}>
                              #{result.placement}
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
                          {subscription.plan_name || subscription.plan}
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
                  <div className="text-center py-4">
                    <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-4">Free Member</p>
                    <Link
                      to="/pricing"
                      className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors inline-block"
                    >
                      Upgrade to Pro
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'profile' && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Profile Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Name</span>
                    <span className="text-white">{user.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Email</span>
                    <span className="text-white">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Location</span>
                    <span className="text-white">{user.location || 'Not set'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Member Since</span>
                    <span className="text-white">
                      {formatDateShort(user.createdAt || new Date().toISOString())}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    to="/profile"
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-white">
                      <User className="h-4 w-4" />
                      Edit Profile
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </Link>
                  <Link
                    to="/profile?tab=audio-systems"
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-white">
                      <Zap className="h-4 w-4" />
                      Manage Audio Systems
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </Link>
                  <Link
                    to="/profile?tab=saved-events"
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-white">
                      <Heart className="h-4 w-4" />
                      Saved Events
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </Link>
                  <Link
                    to="/profile?tab=notifications"
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-white">
                      <Bell className="h-4 w-4" />
                      Notification Settings
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'competitions' && (
          <div className="space-y-6">
            {/* Competition Stats Overview */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Competition Statistics</h2>
              
              {competitionData.length > 0 ? (
                <div className="space-y-6">
                  {/* Score Trend Chart */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Score Trend</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={competitionData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                            labelStyle={{ color: '#F3F4F6' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#A78BFA" 
                            strokeWidth={2}
                            dot={{ fill: '#A78BFA' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Points Accumulated Chart */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Points Accumulated</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={competitionData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="date" stroke="#9CA3AF" />
                          <YAxis stroke="#9CA3AF" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                            labelStyle={{ color: '#F3F4F6' }}
                          />
                          <Bar dataKey="points" fill="#10B981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No competition data to display</p>
                </div>
              )}
            </div>

            {/* Recent Competition Results */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">All Competition Results</h2>
                <Link
                  to="/profile?tab=competitions"
                  className="text-electric-400 hover:text-electric-300 text-sm font-medium"
                >
                  Manage Results
                </Link>
              </div>

              {recentResults.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left border-b border-gray-700">
                        <th className="pb-3 text-gray-400 font-medium">Event</th>
                        <th className="pb-3 text-gray-400 font-medium">Category</th>
                        <th className="pb-3 text-gray-400 font-medium">Date</th>
                        <th className="pb-3 text-gray-400 font-medium text-center">Placement</th>
                        <th className="pb-3 text-gray-400 font-medium text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {recentResults.map((result) => (
                        <tr key={result.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="py-3 text-white">{result.eventTitle}</td>
                          <td className="py-3">
                            <span className="bg-gray-600 px-2 py-1 rounded text-xs text-white">
                              {result.category}
                            </span>
                          </td>
                          <td className="py-3 text-gray-400">{formatDateShort(result.date)}</td>
                          <td className="py-3 text-center">
                            <span className={`font-bold ${getPlacementColor(result.placement)}`}>
                              #{result.placement}
                            </span>
                          </td>
                          <td className="py-3 text-right text-electric-400 font-medium">
                            +{result.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No competition results yet</p>
                </div>
              )}
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
                        {subscription.plan_name || subscription.plan}
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

        {/* Saved Events Widget (Always visible) */}
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

        {/* System Status */}
        <div className="mt-8 flex justify-end">
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/30 rounded-lg p-3">
            <ServiceWorkerManager showFullInterface={false} />
          </div>
        </div>
      </div>
    </div>
  );
}