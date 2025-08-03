import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, Search, Filter, Edit3, Trash2, Download, CheckCircle, X, 
  AlertTriangle, Users, Calendar, Award, Eye, MoreVertical, RefreshCw,
  ChevronLeft, ChevronRight, Settings, BarChart3, FileText, Plus,
  Shield, Clock, Target, UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from './NotificationSystem';
import LoadingSpinner from './LoadingSpinner';
import EditCompetitionResultModal from './EditCompetitionResultModal';
import ResultsDataTable from './ResultsDataTable';
import { formatDistanceToNow } from 'date-fns';
import { competitionResultsAPI } from '../api/competition-results';
import { formatDate, formatDateForDatabase } from '../utils/dateFormatters';

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
  users: {
    id: string;
    name: string;
    email: string;
    membership_type: string;
  };
  competition_divisions?: {
    name: string;
  };
  competition_classes?: {
    name: string;
  };
}

interface SearchFilters {
  search: string;
  category: string;
  division: string;
  verified: string;
  dateRange: string;
  organization: string;
  eventType: string;
}

interface BulkActionResult {
  success: boolean;
  message: string;
  affectedIds: string[];
}

export default function AdminLeaderboardManager() {
  const { user, isAuthenticated } = useAuth();
  const { showSuccess, showError } = useNotifications();
  
  // State management
  const [results, setResults] = useState<CompetitionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResult, setEditingResult] = useState<CompetitionResult | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Filters and pagination
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    category: '',
    division: '',
    verified: '',
    dateRange: '',
    organization: '',
    eventType: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalResults, setTotalResults] = useState(0);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Filter options
  const [categories, setCategories] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<Array<{id: string; name: string}>>([]);
  const [organizations, setOrganizations] = useState<Array<{id: string; name: string}>>([]);
  
  // Statistics
  const [stats, setStats] = useState({
    totalResults: 0,
    verifiedResults: 0,
    unverifiedResults: 0,
    caeEvents: 0,
    nonCaeEvents: 0,
    recentActivity: 0
  });

  // Load data on component mount
  useEffect(() => {
    if (user?.membershipType === 'admin') {
      loadFilterOptions();
      loadResults();
      loadStats();
    }
  }, [user, filters, currentPage, sortBy, sortOrder]);

  // Permission check
  if (!isAuthenticated || user?.membershipType !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  const loadFilterOptions = async () => {
    try {
      // Load categories from results
      const { data: categoryData, error: categoryError } = await supabase
        .from('competition_results')
        .select('category')
        .not('category', 'is', null);
      
      if (!categoryError) {
        const uniqueCategories = [...new Set(categoryData?.map(r => r.category).filter(Boolean) || [])] as string[];
        setCategories(uniqueCategories);
      }

      // Load divisions (handle table not existing)
      try {
        const { data: divisionData, error: divisionError } = await supabase
          .from('competition_divisions')
          .select('id, name')
          .eq('is_active', true)
          .order('display_order');
        
        if (!divisionError) {
          setDivisions(divisionData || []);
        }
      } catch (divisionError) {
        // Table doesn't exist, set empty array
        setDivisions([]);
      }

      // Load organizations (handle table not existing)
      try {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('status', 'active')
          .order('name');
        
        if (!orgError) {
          setOrganizations(orgData || []);
        }
      } catch (orgError) {
        // Table doesn't exist, set empty array
        setOrganizations([]);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
      // Set defaults to prevent UI errors
      setCategories([]);
      setDivisions([]);
      setOrganizations([]);
    }
  };

  const loadResults = async () => {
    try {
      setLoading(true);
      
      // Build query without problematic joins
      let query = supabase
        .from('competition_results')
        .select(`
          *,
          events(id, title, start_date, city, state)
        `, { count: 'exact' });

      // Apply filters
      if (filters.search) {
        query = query.or(`event_name.ilike.%${filters.search}%`);
      }
      
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      
      if (filters.division) {
        query = query.eq('division_id', filters.division);
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
        
        query = query.gte('created_at', formatDateForDatabase(startDate) || '');
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Get user data separately if we have results
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(result => result.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, email, membership_type')
            .in('id', userIds);
          
          if (!userError && userData) {
            // Map user data to results
            const userMap = new Map(userData.map(user => [user.id, user]));
            const resultsWithUsers = data.map(result => ({
              ...result,
              users: userMap.get(result.user_id) || null
            }));
            setResults(resultsWithUsers);
          } else {
            // Set results without user data if users table query fails
            setResults(data);
          }
        } else {
          setResults(data);
        }
      } else {
        setResults(data || []);
      }
      
      setTotalResults(count || 0);
    } catch (error) {
      console.error('Error loading results:', error);
      showError('Error', 'Failed to load competition results');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Calculate stats directly from the competition_results table
      const { data: allResults, error: resultsError } = await supabase
        .from('competition_results')
        .select('id, verified, is_cae_event, created_at');

      if (resultsError) {
        console.error('Error loading competition results for stats:', resultsError);
        return;
      }

      const results = allResults || [];
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      setStats({
        totalResults: results.length,
        verifiedResults: results.filter(r => r.verified).length,
        unverifiedResults: results.filter(r => !r.verified).length,
        caeEvents: results.filter(r => r.is_cae_event).length,
        nonCaeEvents: results.filter(r => !r.is_cae_event).length,
        recentActivity: results.filter(r => new Date(r.created_at) >= sevenDaysAgo).length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      // Set default stats to prevent UI errors
      setStats({
        totalResults: 0,
        verifiedResults: 0,
        unverifiedResults: 0,
        caeEvents: 0,
        nonCaeEvents: 0,
        recentActivity: 0
      });
    }
  };

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedResults(new Set(results.map(r => r.id)));
    } else {
      setSelectedResults(new Set());
    }
  }, [results]);

  const handleSelectResult = useCallback((id: string, checked: boolean) => {
    const newSelected = new Set(selectedResults);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedResults(newSelected);
  }, [selectedResults]);

  const handleBulkVerify = async () => {
    if (selectedResults.size === 0) return;
    
    setBulkActionLoading(true);
    try {
      // Show progress for bulk operations > 100 records (QA requirement)
      const showProgress = selectedResults.size > 100;
      if (showProgress) {
        showError('Processing', `Verifying ${selectedResults.size} results. This may take a moment...`);
      }

      const response = await competitionResultsAPI.bulkUpdate({
        ids: Array.from(selectedResults),
        updates: { verified: true },
        reason: 'Admin bulk verification'
      });

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to verify results');
      }

      const successCount = response.data?.updated || 0;
      const failedCount = response.data?.failed || 0;
      
      if (failedCount > 0) {
        showError('Partial Success', `Verified ${successCount} results. ${failedCount} failed.`);
      } else {
        showSuccess('Success', `${successCount} results verified successfully`);
      }
      
      setSelectedResults(new Set());
      loadResults();
      loadStats();
    } catch (error) {
      console.error('Error verifying results:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to verify selected results');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedResults.size === 0) return;
    
    // Improved confirmation message with exact count (QA requirement)
    if (!confirm(`Are you sure you want to delete ${selectedResults.size} result${selectedResults.size !== 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      // Show progress for bulk operations > 100 records (QA requirement)
      const showProgress = selectedResults.size > 100;
      if (showProgress) {
        showError('Processing', `Deleting ${selectedResults.size} results. This may take a moment...`);
      }

      // Delete results one by one through the secure API
      const results = {
        success: 0,
        failed: 0
      };

      for (const id of Array.from(selectedResults)) {
        const response = await competitionResultsAPI.delete(id);
        if (response.success) {
          results.success++;
        } else {
          results.failed++;
          console.error(`Failed to delete result ${id}:`, response.error);
        }
      }

      if (results.failed > 0) {
        showError('Partial Success', `Deleted ${results.success} results. ${results.failed} failed.`);
      } else {
        showSuccess('Success', `${results.success} results deleted successfully`);
      }
      
      setSelectedResults(new Set());
      loadResults();
      loadStats();
    } catch (error) {
      console.error('Error deleting results:', error);
      showError('Error', 'Failed to delete selected results');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Export all results matching current filters (not just current page)
      let query = supabase
        .from('competition_results')
        .select(`
          *,
          events(title, start_date, city, state)
        `);

      // Apply same filters as main query
      if (filters.search) {
        query = query.or(`event_name.ilike.%${filters.search}%`);
      }
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.division) query = query.eq('division_id', filters.division);
      if (filters.verified !== '') query = query.eq('verified', filters.verified === 'true');
      if (filters.eventType !== '') query = query.eq('is_cae_event', filters.eventType === 'cae');

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get user data for export if we have results
      let resultsWithUsers = data || [];
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(result => result.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', userIds);
          
          if (!userError && userData) {
            const userMap = new Map(userData.map(user => [user.id, user]));
            resultsWithUsers = data.map(result => ({
              ...result,
              users: userMap.get(result.user_id) || { name: 'Unknown User', email: 'N/A' }
            }));
          }
        }
      }

      // Convert to CSV
      const headers = [
        'ID', 'User Name', 'User Email', 'Event Name', 'Event Date', 'Category',
        'Division', 'Class', 'Vehicle', 'Score', 'Placement', 'Total Participants',
        'Points Earned', 'Verified', 'Is CAE Event', 'Created At'
      ];

      // For large exports, consider making async (QA recommendation)
      if (resultsWithUsers && resultsWithUsers.length > 5000) {
        showError('Note', 'Large export detected. Consider implementing async export for better performance.');
      }

      const csvData = [
        headers.join(','),
        ...(resultsWithUsers || []).map(result => [
          result.id,
          `"${result.users?.name || 'Unknown User'}"`,
          result.users?.email || 'N/A',
          `"${result.event_name || result.events?.title || ''}"`,
          result.event_date || result.events?.start_date || '',
          result.category,
          '', // Division data not available
          '', // Class data not available
          `"${[result.vehicle_year, result.vehicle_make, result.vehicle_model].filter(Boolean).join(' ')}"`,
          result.score || '',
          result.position || '',
          result.total_participants || '',
          result.points_earned,
          result.verified ? 'Yes' : 'No',
          result.is_cae_event ? 'Yes' : 'No',
          formatDate(result.created_at)
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `competition-results-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showSuccess('Success', 'Results exported successfully');
    } catch (error) {
      console.error('Error exporting results:', error);
      showError('Error', 'Failed to export results');
    } finally {
      setExporting(false);
    }
  };

  const handleEdit = (result: CompetitionResult) => {
    setEditingResult(result);
    setShowEditModal(true);
  };

  const handleDelete = async (result: CompetitionResult) => {
    if (!confirm(`Are you sure you want to delete this result for ${result.users.name}? This action cannot be undone.`)) {
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
  };

  const handleToggleVerified = async (result: CompetitionResult) => {
    try {
      const response = await competitionResultsAPI.update(
        result.id,
        { verified: !result.verified }
      );

      if (!response.success) {
        // Handle verified result error with clear message (QA requirement)
        if (response.error?.code === 'VERIFIED_RESULT') {
          showError('Error', response.error.message);
          return;
        }
        throw new Error(response.error?.message || 'Failed to update verification status');
      }

      showSuccess('Success', `Result ${result.verified ? 'unverified' : 'verified'} successfully`);
      loadResults();
      loadStats();
    } catch (error) {
      console.error('Error updating verification:', error);
      showError('Error', error instanceof Error ? error.message : 'Failed to update verification status');
    }
  };

  const totalPages = Math.ceil(totalResults / pageSize);
  const hasSelection = selectedResults.size > 0;

  if (loading && results.length === 0) {
    return <LoadingSpinner size="large" message="Loading competition results..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Competition Results Manager</h1>
          <p className="text-gray-400 mt-2">Manage and moderate all competition results</p>
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
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50"
          >
            <Download className={`h-4 w-4 ${exporting ? 'animate-spin' : ''}`} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
              <p className="text-gray-400 text-sm">Unverified</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.unverifiedResults}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
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

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Recent Activity</p>
              <p className="text-2xl font-bold text-white">{stats.recentActivity}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users, events..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="w-full py-2 px-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Division Filter */}
          <div>
            <select
              value={filters.division}
              onChange={(e) => setFilters(prev => ({ ...prev, division: e.target.value }))}
              className="w-full py-2 px-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            >
              <option value="">All Divisions</option>
              {divisions.map(division => (
                <option key={division.id} value={division.id}>{division.name}</option>
              ))}
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
      </div>

      {/* Bulk Actions */}
      {hasSelection && (
        <div className="bg-electric-500/10 border border-electric-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-electric-500" />
              <span className="text-white font-medium">
                {selectedResults.size} result{selectedResults.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkVerify}
                disabled={bulkActionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <UserCheck className="h-4 w-4" />
                Verify Selected
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedResults(new Set())}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="h-4 w-4" />
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      <ResultsDataTable
        results={results}
        loading={loading}
        selectedResults={selectedResults}
        onSelectAll={handleSelectAll}
        onSelectResult={handleSelectResult}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleVerified={handleToggleVerified}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        showAdminControls={true}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalResults)} of {totalResults} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-electric-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
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
          isAdmin={true}
        />
      )}
    </div>
  );
}