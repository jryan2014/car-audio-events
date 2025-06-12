import React, { useState, useEffect } from 'react';
import { User, Trophy, Calendar, Users, TrendingUp, Star, ArrowRight, Plus, Target, Award, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
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

  // Debug logging (can be removed in production)
  // console.log('=== DASHBOARD RENDER ===');
  // console.log('authLoading:', authLoading);
  // console.log('isLoading:', isLoading);
  // console.log('user:', user);
  // console.log('error:', error);
  // console.log('========================');

  const quickActions: QuickAction[] = [
    {
      title: 'Browse Events',
      description: 'Find competitions near you',
      icon: Calendar,
      link: '/events',
      color: 'blue'
    },
    {
      title: 'Update Profile',
      description: 'Manage your profile and audio system',
      icon: User,
      link: '/profile',
      color: 'purple'
    },
    {
      title: 'Join Teams',
      description: 'Connect with other competitors',
      icon: Users,
      link: '/teams',
      color: 'green'
    },
    {
      title: 'View Directory',
      description: 'Find retailers and manufacturers',
      icon: MapPin,
      link: '/directory',
      color: 'orange'
    }
  ];

  useEffect(() => {
    const loadDashboardData = async () => {
      // console.log('=== DASHBOARD USEEFFECT ===');
      // console.log('user:', user?.email);
      // console.log('authLoading:', authLoading);
      // console.log('==========================');
      
      if (user) {
        // console.log('Loading dashboard data for user:', user.email);
        try {
          await Promise.all([
            loadUpcomingEvents(),
            loadUserStats()
          ]);
          // console.log('Dashboard data loaded successfully');
          setError(null);
        } catch (error) {
          console.error('Error loading dashboard data:', error);
          setError(error instanceof Error ? error.message : 'Unknown error occurred');
        } finally {
          // console.log('Setting isLoading to false');
          setIsLoading(false);
        }
      } else if (!authLoading) {
        // console.log('No user and not auth loading, setting isLoading to false');
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [user, authLoading]);

  // Scroll to top when component mounts or after data loads
  useEffect(() => {
    if (!isLoading && !authLoading) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isLoading, authLoading]);

  const loadUserStats = async () => {
    try {
      // Load real user statistics when implemented
      // For now, set defaults until proper stats system is built
      setStats({
        totalCompetitions: 0,
        totalPoints: 0,
        averageScore: 0,
        bestPlacement: 0,
        upcomingEvents: 0,
        teamMemberships: 0
      });
      
      setRecentResults([]);
    } catch (error) {
      console.error('Error loading user stats:', error);
      setStats({
        totalCompetitions: 0,
        totalPoints: 0,
        averageScore: 0,
        bestPlacement: 0,
        upcomingEvents: 0,
        teamMemberships: 0
      });
      setRecentResults([]);
    }
  };

  const loadUpcomingEvents = async () => {
    try {
      // Try to load real data
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
        isRegistered: false // This would need a separate query
      }));

      setUpcomingEvents(formattedEvents);
    } catch (error) {
      console.error('Error loading upcoming events:', error);
      // Set empty array instead of mock data
      setUpcomingEvents([]);
    }
  };

  const loadRecentResults = async () => {
    try {
      // Try to load real data
      const { data, error } = await supabase
        .from('competition_results')
        .select(`
          id,
          category,
          placement,
          total_participants,
          points_earned,
          competed_at,
          events!inner(title)
        `)
        .eq('user_id', user!.id)
        .order('competed_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formattedResults = (data || []).map(result => ({
        id: result.id,
        eventTitle: (result.events as any)?.title || 'Unknown Event',
        category: result.category,
        placement: result.placement,
        totalParticipants: result.total_participants,
        points: result.points_earned,
        date: result.competed_at
      }));

      setRecentResults(formattedResults);
    } catch (error) {
      console.error('Error loading recent results:', error);
      // Set empty array instead of mock data
      setRecentResults([]);
    }
  };

  const formatDate = (dateString: string) => {
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
    // console.log('Showing loading spinner - authLoading:', authLoading, 'isLoading:', isLoading);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
          <p className="text-gray-400 text-sm">Auth: {authLoading ? 'loading' : 'ready'}, Data: {isLoading ? 'loading' : 'ready'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // console.log('No user found, showing login prompt');
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

  if (error) {
    // console.log('Error state, showing error message:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Dashboard Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // console.log('Rendering dashboard content for user:', user.email);
  
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Welcome back, <span className="text-electric-400">{user?.name}</span>
              </h1>
              <p className="text-gray-400 mt-2">
                Here's what's happening with your car audio journey
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="bg-electric-500/20 text-electric-400 px-3 py-1 rounded-full text-sm font-medium">
                {user?.membershipType}
              </span>
              <Link
                to="/profile"
                className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span>View Profile</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
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
                <p className="text-gray-400 text-sm">Teams</p>
                <p className="text-2xl font-bold text-white">{stats.teamMemberships}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Events */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Upcoming Events</h2>
              <Link
                to="/events"
                className="text-electric-400 hover:text-electric-300 text-sm font-medium flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="bg-gray-700/30 p-4 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">{event.title}</h3>
                        <div className="text-gray-400 text-sm space-y-1">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(event.date)}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="bg-electric-500/20 text-electric-400 px-2 py-1 rounded text-xs">
                            {event.category}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        {event.isRegistered ? (
                          <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium">
                            Registered
                          </span>
                        ) : (
                          <Link
                            to={`/events/${event.id}`}
                            className="bg-electric-500 text-white px-3 py-1 rounded-full text-xs font-medium hover:bg-electric-600 transition-colors"
                          >
                            Register
                          </Link>
                        )}
                      </div>
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
              <Link
                to="/profile?tab=competitions"
                className="text-electric-400 hover:text-electric-300 text-sm font-medium flex items-center space-x-1"
              >
                <span>View All</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {recentResults.length > 0 ? (
              <div className="space-y-4">
                {recentResults.map((result) => (
                  <div key={result.id} className="bg-gray-700/30 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">{result.eventTitle}</h3>
                        <div className="text-gray-400 text-sm">
                          <span className="bg-gray-600 px-2 py-1 rounded text-xs mr-2">
                            {result.category}
                          </span>
                          <span>{formatDate(result.date)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getPlacementColor(result.placement)}`}>
                          #{result.placement}
                        </div>
                        <div className="text-gray-400 text-xs">
                          of {result.totalParticipants}
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
        </div>
      </div>
    </div>
  );
}