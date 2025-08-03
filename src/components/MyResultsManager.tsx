import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, Edit3, Trash2, Calendar, Award, Eye, Plus, Filter,
  CheckCircle, X, Clock, Target, BarChart3, TrendingUp,
  AlertCircle, FileText, Settings, RefreshCw, Share2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from './NotificationSystem';
import LoadingSpinner from './LoadingSpinner';
import EditCompetitionResultModal from './EditCompetitionResultModal';
import CompetitionResultCard from './CompetitionResultCard';
import { formatDistanceToNow } from 'date-fns';
import { competitionResultsAPI } from '../api/competition-results';
import { formatDate, formatDateForDatabase, formatMediumDate } from '../utils/dateFormatters';

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
  is_cae_event: boolean;
  event_name?: string;
  event_date?: string;
  event_location?: string;
  created_at: string;
  updated_at: string;
  events?: {
    id: number;
    title: string;
    start_date: string;
    city: string;
    state: string;
  };
  competition_divisions?: {
    name: string;
  };
  competition_classes?: {
    name: string;
  };
}

interface UserStats {
  totalResults: number;
  verifiedResults: number;
  totalPoints: number;
  averageScore: number;
  bestPlacement: number;
  wins: number;
  podiums: number;
  caeEvents: number;
  nonCaeEvents: number;
}

interface Filters {
  category: string;
  verified: string;
  eventType: string;
  dateRange: string;
}

export default function MyResultsManager() {
  const { user, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useNotifications();
  
  // State management
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResult, setEditingResult] = useState<CompetitionResult | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Filters
  const [filters, setFilters] = useState<Filters>({
    category: '',
    verified: '',
    eventType: '',
    dateRange: ''
  });
  
  // Statistics
  const [stats, setStats] = useState<UserStats>({
    totalResults: 0,
    verifiedResults: 0,
    totalPoints: 0,
    averageScore: 0,
    bestPlacement: 0,
    wins: 0,
    podiums: 0,
    caeEvents: 0,
    nonCaeEvents: 0
  });

  // Chart data for performance tracking
  const [performanceData, setPerformanceData] = useState<Array<{
    date: string;
    score: number;
    position: number;
    points: number;
  }>>([]);

  // Load data on component mount
  useEffect(() => {
    if (user && isAuthenticated) {
      loadResults();
      loadStats();
    }
  }, [user, isAuthenticated, filters]);

  // Permission check
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
          <p className="text-gray-400 mb-6">Please log in to view your competition results.</p>
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

  const loadResults = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      let query = supabase
        .from('competition_results')
        .select(`
          *,
          events(id, title, start_date, city, state),
          competition_divisions(name),
          competition_classes(name)
        `)
        .eq('user_id', user.id);

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters.verified !== '') {
        query = query.eq('verified', filters.verified === 'true');
      }
      
      if (filters.eventType !== '') {
        query = query.eq('is_cae_event', filters.eventType === 'cae');
      }

      // Date range filter
      if (filters.dateRange) {
        const now = new Date();
        let startDate: Date;
        
        switch (filters.dateRange) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'quarter':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setResults(data || []);
      
      // Generate performance chart data
      const chartData = (data || []).slice(-12).map(result => ({
        date: formatMediumDate(result.created_at).replace(/,.*/, ''), // Remove year for chart
        score: result.score || 0,
        position: result.position || 0,
        points: result.points_earned || 0
      }));
      
      setPerformanceData(chartData);
    } catch (error) {
      console.error('Error loading results:', error);
      showError('Error', 'Failed to load your competition results');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('competition_results')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const userResults = data || [];
      const totalComps = userResults.length;
      const verifiedComps = userResults.filter(r => r.verified).length;
      const totalPts = userResults.reduce((sum, r) => sum + (r.points_earned || 0), 0);
      const avgScore = totalComps > 0 
        ? userResults.reduce((sum, r) => sum + (r.score || 0), 0) / totalComps 
        : 0;
      const bestPlace = totalComps > 0
        ? Math.min(...userResults.map(r => r.position || 999))
        : 0;
      const winsCount = userResults.filter(r => r.position === 1).length;
      const podiumsCount = userResults.filter(r => r.position && r.position <= 3).length;
      const caeCount = userResults.filter(r => r.is_cae_event).length;
      const nonCaeCount = userResults.filter(r => !r.is_cae_event).length;

      setStats({
        totalResults: totalComps,
        verifiedResults: verifiedComps,
        totalPoints: totalPts,
        averageScore: Math.round(avgScore * 10) / 10,
        bestPlacement: bestPlace === 999 ? 0 : bestPlace,
        wins: winsCount,
        podiums: podiumsCount,
        caeEvents: caeCount,
        nonCaeEvents: nonCaeCount
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleEdit = useCallback((result: CompetitionResult) => {
    setEditingResult(result);
    setShowEditModal(true);
  }, []);

  const handleDelete = useCallback(async (result: CompetitionResult) => {
    // Check if result can be deleted (time restrictions apply)
    if (result.verified) {
      showError('Error', 'Verified results cannot be deleted. Contact an admin for assistance.');
      return;
    }

    const createdAt = new Date(result.created_at);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreation > 1) {
      showError('Error', 'Results can only be deleted within 1 hour of creation. Contact an admin for assistance.');
      return;
    }

    if (!confirm(`Are you sure you want to delete this result? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await competitionResultsAPI.delete(result.id);

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to delete result');
      }

      showSuccess('Success', 'Result deleted successfully');
      loadResults();
      loadStats();
    } catch (error) {
      console.error('Error deleting result:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to delete result');
    }
  }, [showSuccess, showError]);

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-yellow-400';
    if (position <= 3) return 'text-orange-400';
    if (position <= 10) return 'text-green-400';
    return 'text-gray-400';
  };

  const getVerificationStatus = (result: CompetitionResult) => {
    if (result.verified) {
      return {
        icon: CheckCircle,
        text: 'Verified',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20'
      };
    }
    return {
      icon: Clock,
      text: 'Pending Verification',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20'
    };
  };

  if (loading && results.length === 0) {
    return <LoadingSpinner size="large" message="Loading your results..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">My Competition Results</h1>
          <p className="text-gray-400 mt-2">Track your competition history and performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadResults}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/dashboard?logCAE=true"
            className="flex items-center gap-2 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Log New Result
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9 gap-4">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Results</p>
              <p className="text-2xl font-bold text-white">{stats.totalResults}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-electric-500" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Verified</p>
              <p className="text-2xl font-bold text-green-400">{stats.verifiedResults}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Points</p>
              <p className="text-2xl font-bold text-electric-400">{stats.totalPoints}</p>
            </div>
            <Target className="h-8 w-8 text-electric-500" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg Score</p>
              <p className="text-2xl font-bold text-white">{stats.averageScore}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Best Rank</p>
              <p className="text-2xl font-bold text-yellow-400">#{stats.bestPlacement || 'N/A'}</p>
            </div>
            <Award className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Wins</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.wins}</p>
            </div>
            <Trophy className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Podiums</p>
              <p className="text-2xl font-bold text-orange-400">{stats.podiums}</p>
            </div>
            <Award className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">CAE Events</p>
              <p className="text-2xl font-bold text-electric-400">{stats.caeEvents}</p>
            </div>
            <Trophy className="h-8 w-8 text-electric-500" />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Non-CAE</p>
              <p className="text-2xl font-bold text-purple-400">{stats.nonCaeEvents}</p>
            </div>
            <Target className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filters and View Mode */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full py-2 px-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              >
                <option value="">All Categories</option>
                <option value="SPL (Sound Pressure Level)">SPL</option>
                <option value="SQ (Sound Quality)">SQ</option>
                <option value="Install Quality">Install Quality</option>
                <option value="Bass Race">Bass Race</option>
                <option value="Demo">Demo</option>
              </select>
            </div>

            {/* Verified Filter */}
            <div>
              <select
                value={filters.verified}
                onChange={(e) => setFilters(prev => ({ ...prev, verified: e.target.value }))}
                className="w-full py-2 px-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              >
                <option value="">All Results</option>
                <option value="true">Verified Only</option>
                <option value="false">Unverified Only</option>
              </select>
            </div>

            {/* Event Type Filter */}
            <div>
              <select
                value={filters.eventType}
                onChange={(e) => setFilters(prev => ({ ...prev, eventType: e.target.value }))}
                className="w-full py-2 px-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              >
                <option value="">All Events</option>
                <option value="cae">CAE Events</option>
                <option value="non-cae">Non-CAE Events</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full py-2 px-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              >
                <option value="">All Time</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
                <option value="year">Last Year</option>
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Trophy className="h-4 w-4" />
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-electric-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="h-4 w-4" />
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Results Display */}
      {results.length === 0 ? (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-12 text-center">
          <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Results Found</h3>
          <p className="text-gray-400 mb-6">
            {Object.values(filters).some(f => f) 
              ? 'No results match your current filters. Try adjusting your search criteria.'
              : 'You haven\'t logged any competition results yet. Start by logging your first result!'
            }
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/dashboard?logCAE=true"
              className="flex items-center gap-2 px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Log CAE Event
            </Link>
            <Link
              to="/dashboard?logNonCAE=true"
              className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Log Non-CAE Event
            </Link>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map(result => (
            <CompetitionResultCard
              key={result.id}
              result={result}
              onEdit={handleEdit}
              onDelete={handleDelete}
              showAdminControls={false}
              showUserControls={true}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Event</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-medium">Category</th>
                  <th className="text-center py-4 px-6 text-gray-300 font-medium">Score</th>
                  <th className="text-center py-4 px-6 text-gray-300 font-medium">Placement</th>
                  <th className="text-center py-4 px-6 text-gray-300 font-medium">Points</th>
                  <th className="text-center py-4 px-6 text-gray-300 font-medium">Status</th>
                  <th className="text-center py-4 px-6 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {results.map(result => {
                  const verificationStatus = getVerificationStatus(result);
                  const StatusIcon = verificationStatus.icon;
                  
                  return (
                    <tr key={result.id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="py-4 px-6">
                        <div>
                          <div className="flex items-center gap-2">
                            {!result.is_cae_event && (
                              <span className="bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs">Non-CAE</span>
                            )}
                            <span className="text-white font-medium">
                              {result.event_name || result.events?.title || 'Competition Event'}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mt-1">
                            {result.event_date 
                              ? formatDate(result.event_date)
                              : result.events?.start_date 
                                ? formatDate(result.events.start_date)
                                : formatDate(result.created_at)
                            }
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-electric-500/20 text-electric-400 px-2 py-1 rounded text-sm">
                          {result.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center text-white font-medium">
                        {result.score || '-'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`font-bold ${getPositionColor(result.position || 0)}`}>
                          {result.position ? `#${result.position}` : '-'}
                        </span>
                        {result.total_participants && (
                          <span className="text-gray-500 text-sm ml-1">
                            /{result.total_participants}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center text-electric-400 font-medium">
                        {result.points_earned}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${verificationStatus.bgColor} ${verificationStatus.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {verificationStatus.text}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!result.is_cae_event && (
                            <button
                              onClick={() => handleEdit(result)}
                              className="text-electric-400 hover:text-electric-300 transition-colors p-1"
                              title="Edit result"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(result)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                            title="Delete result"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingResult && (
        <EditCompetitionResultModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingResult(null);
          }}
          result={editingResult}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingResult(null);
            loadResults();
            loadStats();
          }}
          isAdmin={false}
        />
      )}
    </div>
  );
}