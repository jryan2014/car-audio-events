import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Trophy, Medal, Award, TrendingUp, Calendar, Filter, ChevronDown, 
  User, X, CheckCircle, BarChart3, Users, Target, Crown, 
  Share2, ArrowUp, ArrowDown, Minus, ExternalLink
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// TEMPORARY MOCK DATA - Remove when real data is available
const MOCK_COMPETITORS = [
  {
    user_id: '1',
    competitor_name: 'Mike "Bass King" Johnson',
    total_points: 2850,
    total_events: 12,
    best_placement: 1,
    average_score: 158.3,
    organization: 'MECA',
    division: 'Sound Pressure',
    class: 'SPL Pro',
    trend: 'up' as const,
    recent_placements: [1, 2, 1, 3, 1],
    audio_system: 'Sundown Audio ZV5 18" x4, Taramps Smart 5K',
    category_scores: {
      'SPL Pro': { points: 1200, events: 5, best_placement: 1, average_score: 158.3 },
      'SPL Amateur': { points: 800, events: 4, best_placement: 2, average_score: 155.2 },
      'SQ Expert': { points: 850, events: 3, best_placement: 1, average_score: 88.5 }
    },
    recent_results: [
      { event_name: 'Texas Thunder Showdown', event_date: '2024-12-15', category: 'SPL Pro', placement: 1, score: 158.3, points_earned: 300, organization: 'MECA' },
      { event_name: 'MECA World Finals', event_date: '2024-11-20', category: 'SPL Pro', placement: 2, score: 157.8, points_earned: 250, organization: 'MECA' },
      { event_name: 'Bass Wars National', event_date: '2024-10-10', category: 'SPL Amateur', placement: 1, score: 156.2, points_earned: 200, organization: 'Bass Wars' }
    ]
  },
  {
    user_id: '2',
    competitor_name: 'Sarah "SQ Queen" Williams',
    total_points: 2650,
    total_events: 15,
    best_placement: 1,
    average_score: 89.2,
    organization: 'IASCA',
    division: 'Sound Quality',
    class: 'SQ Expert',
    trend: 'stable' as const,
    recent_placements: [1, 1, 2, 1, 2],
    audio_system: 'Focal Utopia M, Mosconi ZERO 3, Helix DSP Ultra',
    category_scores: {
      'SQ Expert': { points: 1500, events: 8, best_placement: 1, average_score: 89.5 },
      'SQ Master': { points: 750, events: 4, best_placement: 2, average_score: 87.2 },
      'Install Quality': { points: 400, events: 3, best_placement: 1, average_score: 95.2 }
    },
    recent_results: [
      { event_name: 'IASCA Championship', event_date: '2024-12-01', category: 'SQ Expert', placement: 1, score: 89.5, points_earned: 300, organization: 'IASCA' },
      { event_name: 'Sound Quality Summit', event_date: '2024-11-15', category: 'SQ Expert', placement: 1, score: 88.9, points_earned: 250, organization: 'IASCA' },
      { event_name: 'West Coast Finals', event_date: '2024-10-25', category: 'SQ Master', placement: 2, score: 87.2, points_earned: 200, organization: 'IASCA' }
    ]
  },
  {
    user_id: '3',
    competitor_name: 'Carlos "Boom" Rodriguez',
    total_points: 2400,
    total_events: 10,
    best_placement: 1,
    average_score: 161.5,
    organization: 'Bass Wars',
    division: 'Sound Pressure',
    class: 'SPL Extreme',
    trend: 'up' as const,
    recent_placements: [1, 1, 2, 3, 1],
    audio_system: 'DD Audio 9918 x2, SoundQubed Q1-4500.1',
    category_scores: {
      'SPL Extreme': { points: 1800, events: 7, best_placement: 1, average_score: 162.7 },
      'SPL Pro': { points: 600, events: 3, best_placement: 3, average_score: 155.4 }
    },
    recent_results: [
      { event_name: 'Extreme Bass Challenge', event_date: '2024-12-10', category: 'SPL Extreme', placement: 1, score: 162.7, points_earned: 350, organization: 'Bass Wars' },
      { event_name: 'Desert Boom Fest', event_date: '2024-11-05', category: 'SPL Extreme', placement: 1, score: 161.9, points_earned: 300, organization: 'Bass Wars' },
      { event_name: 'Mountain Thunder', event_date: '2024-10-15', category: 'SPL Pro', placement: 3, score: 155.4, points_earned: 150, organization: 'MECA' }
    ]
  },
  {
    user_id: '4',
    competitor_name: 'David "The Professor" Chen',
    total_points: 2200,
    total_events: 18,
    best_placement: 1,
    average_score: 91.8,
    organization: 'IASCA',
    division: 'Sound Quality',
    class: 'SQ Master',
    trend: 'stable' as const,
    recent_placements: [1, 2, 1, 1, 3],
    audio_system: 'Audiofrog GB Series, JL Audio VXi Amps, miniDSP C-DSP 8x12',
    category_scores: {
      'SQ Master': { points: 1100, events: 9, best_placement: 1, average_score: 91.8 },
      'Install Quality': { points: 700, events: 6, best_placement: 1, average_score: 95.2 },
      'SQ Expert': { points: 400, events: 3, best_placement: 3, average_score: 86.5 }
    },
    recent_results: [
      { event_name: 'Install Excellence Awards', event_date: '2024-12-05', category: 'Install Quality', placement: 1, score: 95.2, points_earned: 200, organization: 'IASCA' },
      { event_name: 'SQ Master Series', event_date: '2024-11-10', category: 'SQ Master', placement: 1, score: 91.8, points_earned: 250, organization: 'IASCA' }
    ]
  },
  {
    user_id: '5',
    competitor_name: 'Ashley "Thunder" Thompson',
    total_points: 2000,
    total_events: 14,
    best_placement: 2,
    average_score: 152.3,
    organization: 'MECA',
    division: 'Sound Pressure',
    class: 'SPL Amateur',
    trend: 'down' as const,
    recent_placements: [2, 3, 2, 2, 4],
    audio_system: 'Skar Audio EVL-15 x2, Skar RP-4500.1D',
    category_scores: {
      'SPL Amateur': { points: 1200, events: 8, best_placement: 2, average_score: 152.3 },
      'SPL Street': { points: 800, events: 6, best_placement: 2, average_score: 148.6 }
    },
    recent_results: [
      { event_name: 'Street Bass Battle', event_date: '2024-12-08', category: 'SPL Street', placement: 2, score: 148.6, points_earned: 180, organization: 'MECA' },
      { event_name: 'Amateur Championship', event_date: '2024-11-25', category: 'SPL Amateur', placement: 2, score: 152.3, points_earned: 200, organization: 'MECA' }
    ]
  },
  {
    user_id: '6',
    competitor_name: 'Marcus "Low Hz" Davis',
    total_points: 1850,
    total_events: 11,
    best_placement: 1,
    average_score: 150.2,
    organization: 'Bass Wars',
    division: 'Sound Pressure',
    class: 'SPL Street',
    trend: 'up' as const,
    recent_placements: [1, 2, 1, 3, 2],
    audio_system: 'American Bass XFL1544 x2, Hifonics BRX5016.1D',
    category_scores: {
      'SPL Street': { points: 1000, events: 6, best_placement: 1, average_score: 150.2 },
      'SPL Amateur': { points: 850, events: 5, best_placement: 3, average_score: 151.8 }
    },
    recent_results: [
      { event_name: 'Street Kings Showdown', event_date: '2024-12-02', category: 'SPL Street', placement: 1, score: 150.2, points_earned: 250, organization: 'Bass Wars' }
    ]
  },
  {
    user_id: '7',
    competitor_name: 'Jennifer "Precision" Park',
    total_points: 1700,
    total_events: 13,
    best_placement: 2,
    average_score: 86.7,
    organization: 'IASCA',
    division: 'Sound Quality',
    class: 'SQ Expert',
    trend: 'stable' as const,
    recent_placements: [2, 3, 2, 2, 3],
    audio_system: 'Morel Elate Carbon Pro, Genesis Series 3, Audison bit One HD',
    category_scores: {
      'SQ Expert': { points: 1000, events: 8, best_placement: 2, average_score: 86.7 },
      'Install Quality': { points: 700, events: 5, best_placement: 2, average_score: 92.8 }
    },
    recent_results: [
      { event_name: 'Precision Audio Cup', event_date: '2024-11-30', category: 'SQ Expert', placement: 2, score: 86.7, points_earned: 180, organization: 'IASCA' }
    ]
  },
  {
    user_id: '8',
    competitor_name: 'Roberto "Bass Head" Martinez',
    total_points: 1500,
    total_events: 9,
    best_placement: 3,
    average_score: 154.1,
    organization: 'MECA',
    division: 'Sound Pressure',
    class: 'SPL Pro',
    trend: 'down' as const,
    recent_placements: [3, 4, 3, 5, 3],
    audio_system: 'Fi Audio BTL N2 18" x2, Crescendo BC5500',
    category_scores: {
      'SPL Pro': { points: 900, events: 5, best_placement: 3, average_score: 154.1 },
      'SPL Amateur': { points: 600, events: 4, best_placement: 4, average_score: 152.0 }
    },
    recent_results: [
      { event_name: 'Regional Bass Wars', event_date: '2024-11-18', category: 'SPL Pro', placement: 3, score: 154.1, points_earned: 150, organization: 'MECA' }
    ]
  },
  {
    user_id: '9',
    competitor_name: 'Emily "Clarity" Johnson',
    total_points: 1400,
    total_events: 12,
    best_placement: 2,
    average_score: 88.4,
    organization: 'IASCA',
    division: 'Sound Quality',
    class: 'SQ Master',
    trend: 'up' as const,
    recent_placements: [2, 2, 3, 2, 4],
    audio_system: 'Dynaudio Esotar², McIntosh MX5000, Helix DSP.3',
    category_scores: {
      'SQ Master': { points: 800, events: 7, best_placement: 2, average_score: 88.4 },
      'SQ Expert': { points: 600, events: 5, best_placement: 3, average_score: 85.9 }
    },
    recent_results: [
      { event_name: 'Sound Clarity Challenge', event_date: '2024-11-22', category: 'SQ Master', placement: 2, score: 88.4, points_earned: 180, organization: 'IASCA' }
    ]
  },
  {
    user_id: '10',
    competitor_name: 'Jake "Earthquake" Anderson',
    total_points: 1200,
    total_events: 8,
    best_placement: 4,
    average_score: 146.8,
    organization: 'Bass Wars',
    division: 'Sound Pressure',
    class: 'SPL Street',
    trend: 'stable' as const,
    recent_placements: [4, 5, 4, 4, 6],
    audio_system: 'Rockford Fosgate T2S2-16 x2, Rockford T2500-1bdCP',
    category_scores: {
      'SPL Street': { points: 700, events: 5, best_placement: 4, average_score: 146.8 },
      'SPL Amateur': { points: 500, events: 3, best_placement: 5, average_score: 148.2 }
    },
    recent_results: [
      { event_name: 'Local Thunder Meet', event_date: '2024-11-12', category: 'SPL Street', placement: 4, score: 146.8, points_earned: 120, organization: 'Bass Wars' }
    ]
  }
];

const MOCK_ORGANIZATIONS = [
  { id: '1', name: 'MECA', logo: '', color: '#22D3EE' },
  { id: '2', name: 'IASCA', logo: '', color: '#A78BFA' },
  { id: '3', name: 'Bass Wars', logo: '', color: '#EF4444' },
  { id: '4', name: 'dB Drag', logo: '', color: '#F59E0B' },
  { id: '5', name: 'USACI', logo: '', color: '#34D399' }
];

interface CompetitorScore {
  user_id: string;
  competitor_name: string;
  total_points: number;
  total_events: number;
  best_placement: number;
  average_score: number;
  organization: string;
  division: string;
  class: string;
  trend: 'up' | 'down' | 'stable';
  recent_placements: number[];
  audio_system?: string;
  category_scores: {
    [category: string]: {
      points: number;
      events: number;
      best_placement: number;
      average_score: number;
    };
  };
  recent_results: {
    event_name: string;
    event_date: string;
    category: string;
    placement: number;
    score: number;
    points_earned: number;
    organization: string;
  }[];
}

interface LeaderboardFilters {
  organization: string;
  division: string;
  class: string;
  season: string;
}

interface Organization {
  id: string;
  name: string;
  logo?: string;
  color?: string;
}

const CHART_COLORS = ['#22D3EE', '#A78BFA', '#34D399', '#F59E0B', '#EF4444', '#EC4899'];

const Leaderboard: React.FC = () => {
  const [competitors, setCompetitors] = useState<CompetitorScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LeaderboardFilters>({
    organization: 'all',
    division: 'all',
    class: 'all',
    season: '2025'
  });
  const [showFilters, setShowFilters] = useState(true); // Show filters by default
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [showLogResultsModal, setShowLogResultsModal] = useState(false);
  const [viewMode, setViewMode] = useState<'rankings' | 'charts' | 'organizations'>('rankings');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    loadLeaderboardData();
  }, [filters]);

  const loadOrganizations = async () => {
    // Use mock data
    setOrganizations(MOCK_ORGANIZATIONS);
  };

  const loadLeaderboardData = async () => {
    setLoading(true);
    try {
      // TEMPORARY: Use mock data instead of database query
      let filteredCompetitors = [...MOCK_COMPETITORS];
      
      // Apply filters
      if (filters.organization !== 'all') {
        filteredCompetitors = filteredCompetitors.filter(c => c.organization === filters.organization);
      }
      
      if (filters.division !== 'all') {
        filteredCompetitors = filteredCompetitors.filter(c => c.division === filters.division);
      }
      
      if (filters.class !== 'all') {
        filteredCompetitors = filteredCompetitors.filter(c => c.class === filters.class);
      }
      
      // Apply season filter (for now using mock data, will be database-driven later)
      if (filters.season !== 'all') {
        // In real implementation, this would filter by competition season
        // For now, keeping all competitors as mock data doesn't have season info
      }
      
      // Sort by total points
      filteredCompetitors.sort((a, b) => b.total_points - a.total_points);
      
      setCompetitors(filteredCompetitors);
      
      // Extract unique divisions and classes
      const uniqueDivisions = [...new Set(MOCK_COMPETITORS.map(c => c.division))];
      setDivisions(uniqueDivisions);
      
      const uniqueClasses = [...new Set(MOCK_COMPETITORS.map(c => c.class))];
      setClasses(uniqueClasses);

    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Data for charts
  const topCompetitorsByOrg = useMemo(() => {
    const orgMap = new Map<string, CompetitorScore[]>();
    
    competitors.forEach(comp => {
      const org = comp.organization || 'Independent';
      if (!orgMap.has(org)) {
        orgMap.set(org, []);
      }
      orgMap.get(org)!.push(comp);
    });

    const result: any[] = [];
    orgMap.forEach((comps, org) => {
      const sorted = comps.sort((a, b) => b.total_points - a.total_points);
      if (sorted.length > 0) {
        result.push({
          organization: org,
          topCompetitor: sorted[0].competitor_name,
          points: sorted[0].total_points,
          competitors: sorted.length
        });
      }
    });

    return result.sort((a, b) => b.points - a.points);
  }, [competitors]);

  const pointsDistribution = useMemo(() => {
    const ranges = [
      { range: '0-500', count: 0 },
      { range: '501-1000', count: 0 },
      { range: '1001-1500', count: 0 },
      { range: '1501-2000', count: 0 },
      { range: '2000+', count: 0 }
    ];

    competitors.forEach(comp => {
      if (comp.total_points <= 500) ranges[0].count++;
      else if (comp.total_points <= 1000) ranges[1].count++;
      else if (comp.total_points <= 1500) ranges[2].count++;
      else if (comp.total_points <= 2000) ranges[3].count++;
      else ranges[4].count++;
    });

    return ranges;
  }, [competitors]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <ArrowUp className="h-4 w-4 text-green-400" />;
    if (trend === 'down') return <ArrowDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getPlacementIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-orange-400" />;
    return <span className="text-gray-500 font-bold">#{rank}</span>;
  };

  const getPlacementColor = (placement: number) => {
    if (placement === 1) return 'text-yellow-400';
    if (placement === 2) return 'text-gray-400';
    if (placement === 3) return 'text-orange-400';
    return 'text-white';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4 flex items-center space-x-3">
            <Trophy className="h-10 w-10 text-electric-500" />
            <span>Competition Leaderboard</span>
          </h1>
          <p className="text-gray-400">
            Track the top competitors across all Car Audio Events competitions
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode('rankings')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'rankings'
                ? 'bg-electric-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Trophy className="inline h-4 w-4 mr-2" />
            Rankings
          </button>
          <button
            onClick={() => setViewMode('charts')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'charts'
                ? 'bg-electric-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="inline h-4 w-4 mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setViewMode('organizations')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'organizations'
                ? 'bg-electric-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Users className="inline h-4 w-4 mr-2" />
            By Organization
          </button>
        </div>

        {/* Filters */}
        <div className="mb-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-electric-400 hover:text-electric-300 mb-4"
          >
            <Filter className="h-5 w-5" />
            <span>Filters</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {/* Organization Filter */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Organization</label>
                <select
                  value={filters.organization}
                  onChange={(e) => setFilters({ ...filters, organization: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="all">All Organizations</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.name}>{org.name}</option>
                  ))}
                </select>
              </div>

              {/* Division Filter */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Division</label>
                <select
                  value={filters.division}
                  onChange={(e) => setFilters({ ...filters, division: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="all">All Divisions</option>
                  <option value="Sound Pressure">Sound Pressure (SPL)</option>
                  <option value="Sound Quality">Sound Quality (SQ)</option>
                </select>
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Class</label>
                <select
                  value={filters.class}
                  onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="all">All Classes</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Season Filter */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Competition Season</label>
                <select
                  value={filters.season}
                  onChange={(e) => setFilters({ ...filters, season: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="all">All Seasons</option>
                  <option value="2025">2025 Season</option>
                  <option value="2024">2024 Season</option>
                  <option value="2023">2023 Season</option>
                  <option value="2022">2022 Season</option>
                  <option value="2021">2021 Season</option>
                </select>
              </div>

              {/* Share Action */}
              <div className="flex items-end">
                <button className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                  <Share2 className="h-4 w-4" />
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Content based on view mode */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : competitors.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No competition results found</p>
            <p className="text-gray-500 mt-2">
              {user ? 'Be the first to log your competition results!' : 'Adjust your filters or check back later'}
            </p>
            {user && (
              <button
                onClick={() => setShowLogResultsModal(true)}
                className="inline-block mt-4 px-6 py-3 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors"
              >
                Log Competition Results
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Rankings View */}
            {viewMode === 'rankings' && (
              <div className="space-y-4">
                {competitors.map((competitor, index) => (
                  <div
                    key={competitor.user_id}
                    className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-electric-500/50 transition-all duration-200 ${
                      user && competitor.user_id === user.id ? 'ring-2 ring-electric-500/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-12 text-center">
                          {getPlacementIcon(index + 1)}
                        </div>

                        {/* Competitor Info */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                              <Link 
                                to={`/profile/${competitor.user_id}`}
                                className="hover:text-electric-400 transition-colors flex items-center space-x-2"
                              >
                                <User className="h-5 w-5 text-gray-400" />
                                <span>{competitor.competitor_name}</span>
                                <ExternalLink className="h-4 w-4 text-gray-500" />
                              </Link>
                              {user && competitor.user_id === user.id && (
                                <span className="text-sm text-electric-400 ml-2">(You)</span>
                              )}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="bg-gray-700/50 px-3 py-1 rounded-full text-gray-300">
                                {competitor.organization}
                              </span>
                              <span className="bg-gray-700/50 px-3 py-1 rounded-full text-gray-300">
                                {competitor.division}
                              </span>
                              <span className="bg-gray-700/50 px-3 py-1 rounded-full text-gray-300">
                                {competitor.class}
                              </span>
                            </div>
                          </div>

                          {/* Audio System Info */}
                          {competitor.audio_system && (
                            <p className="text-sm text-gray-500 mb-3 italic">
                              🔊 {competitor.audio_system}
                            </p>
                          )}

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                            <div>
                              <p className="text-gray-400 text-sm">Total Points</p>
                              <p className="text-2xl font-bold text-electric-400">{competitor.total_points}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Events</p>
                              <p className="text-xl font-semibold text-white">{competitor.total_events}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Best Place</p>
                              <p className={`text-xl font-semibold ${getPlacementColor(competitor.best_placement)}`}>
                                {competitor.best_placement === 999 ? '-' : `#${competitor.best_placement}`}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Avg Score</p>
                              <p className="text-xl font-semibold text-white">
                                {competitor.average_score}
                                <span className="text-sm text-gray-500 ml-1">
                                  {competitor.division === 'Sound Pressure' ? 'dB' : 'pts'}
                                </span>
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400 text-sm">Trend</p>
                              <div className="text-xl">{getTrendIcon(competitor.trend)}</div>
                            </div>
                          </div>

                          {/* Category Breakdown */}
                          {Object.keys(competitor.category_scores).length > 1 && (
                            <div className="mb-4">
                              <p className="text-gray-400 text-sm mb-2">Category Performance</p>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(competitor.category_scores).map(([cat, stats]) => (
                                  <div
                                    key={cat}
                                    className="bg-gray-700/50 px-3 py-1 rounded-lg text-sm"
                                  >
                                    <span className="text-gray-300">{cat}:</span>
                                    <span className="text-electric-400 font-semibold ml-2">
                                      {stats.points} pts
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recent Results */}
                          {competitor.recent_results.length > 0 && (
                            <div>
                              <p className="text-gray-400 text-sm mb-2">Recent Competitions</p>
                              <div className="space-y-1">
                                {competitor.recent_results.slice(0, 3).map((result, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-2">
                                      <Calendar className="h-3 w-3 text-gray-500" />
                                      <span className="text-gray-300">{result.event_name}</span>
                                      <span className="text-gray-500">•</span>
                                      <span className="text-gray-400">{result.category}</span>
                                      <span className="text-gray-500">•</span>
                                      <span className="text-gray-500 text-xs">{result.organization}</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      {result.placement && (
                                        <span className={`font-semibold ${getPlacementColor(result.placement)}`}>
                                          #{result.placement}
                                        </span>
                                      )}
                                      <span className="text-electric-400 font-semibold">
                                        +{result.points_earned} pts
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Trend/Actions */}
                      <div className="flex-shrink-0 flex flex-col items-end space-y-2 ml-4">
                        {getTrendIcon(competitor.trend)}
                        {user && competitor.user_id === user.id && (
                          <button
                            onClick={() => navigate('/dashboard?tab=competitions')}
                            className="text-xs text-electric-400 hover:text-electric-300"
                          >
                            View All
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Analytics View */}
            {viewMode === 'charts' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Competitors by Organization */}
                  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Top Competitors by Organization</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topCompetitorsByOrg.slice(0, 5)} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" stroke="#9CA3AF" />
                        <YAxis type="category" dataKey="organization" stroke="#9CA3AF" width={100} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                          itemStyle={{ color: '#E5E7EB' }}
                        />
                        <Bar dataKey="points" fill="#A78BFA" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top Points per Class */}
                  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Top Points per Class</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={classes.map(cls => {
                        const classCompetitors = competitors.filter(c => c.class === cls);
                        const topPoints = classCompetitors.length > 0 
                          ? Math.max(...classCompetitors.map(c => c.total_points)) 
                          : 0;
                        return { class: cls, topPoints, competitors: classCompetitors.length };
                      })}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="class" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                          itemStyle={{ color: '#E5E7EB' }}
                        />
                        <Bar dataKey="topPoints" fill="#34D399" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Performance Trends Overall per Class */}
                  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Performance Trends by Class</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={classes.map(cls => {
                        const classCompetitors = competitors.filter(c => c.class === cls);
                        const avgScore = classCompetitors.length > 0
                          ? classCompetitors.reduce((sum, c) => sum + c.average_score, 0) / classCompetitors.length
                          : 0;
                        const avgPoints = classCompetitors.length > 0
                          ? classCompetitors.reduce((sum, c) => sum + c.total_points, 0) / classCompetitors.length
                          : 0;
                        return { 
                          class: cls.length > 10 ? cls.substring(0, 10) + '...' : cls, 
                          avgScore: Math.round(avgScore * 10) / 10,
                          avgPoints: Math.round(avgPoints),
                          competitors: classCompetitors.length
                        };
                      })}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="class" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                          itemStyle={{ color: '#E5E7EB' }}
                        />
                        <Line type="monotone" dataKey="avgPoints" stroke="#22D3EE" strokeWidth={2} name="Avg Points" />
                        <Line type="monotone" dataKey="avgScore" stroke="#F59E0B" strokeWidth={2} name="Avg Score" />
                        <Legend />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Enhanced Division Breakdown */}
                  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Division Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { 
                              name: 'Sound Pressure', 
                              value: competitors.filter(c => c.division === 'Sound Pressure').length,
                              avgPoints: competitors.filter(c => c.division === 'Sound Pressure')
                                .reduce((sum, c) => sum + c.total_points, 0) / 
                                (competitors.filter(c => c.division === 'Sound Pressure').length || 1)
                            },
                            { 
                              name: 'Sound Quality', 
                              value: competitors.filter(c => c.division === 'Sound Quality').length,
                              avgPoints: competitors.filter(c => c.division === 'Sound Quality')
                                .reduce((sum, c) => sum + c.total_points, 0) / 
                                (competitors.filter(c => c.division === 'Sound Quality').length || 1)
                            }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent, payload }) => `${name}: ${(percent * 100).toFixed(0)}% (${Math.round(payload.avgPoints)} avg pts)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#22D3EE" />
                          <Cell fill="#A78BFA" />
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                          formatter={(value, name, props) => [
                            `${value} competitors`,
                            `${name} (Avg: ${Math.round(props.payload.avgPoints)} pts)`
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Additional Analytics Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Points Distribution */}
                  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Points Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={pointsDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="range" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                          itemStyle={{ color: '#E5E7EB' }}
                        />
                        <Bar dataKey="count" fill="#22D3EE" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Competition Activity by Organization */}
                  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Competition Activity by Organization</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topCompetitorsByOrg.map(org => ({
                        organization: org.organization,
                        totalEvents: competitors
                          .filter(c => c.organization === org.organization)
                          .reduce((sum, c) => sum + c.total_events, 0),
                        avgEventsPerCompetitor: Math.round(
                          competitors.filter(c => c.organization === org.organization)
                            .reduce((sum, c) => sum + c.total_events, 0) / org.competitors
                        )
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="organization" stroke="#9CA3AF" />
                        <YAxis stroke="#9CA3AF" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                          itemStyle={{ color: '#E5E7EB' }}
                        />
                        <Bar dataKey="totalEvents" fill="#EF4444" name="Total Events" />
                        <Bar dataKey="avgEventsPerCompetitor" fill="#EC4899" name="Avg per Competitor" />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Organizations View */}
            {viewMode === 'organizations' && (
              <div className="space-y-6">
                {topCompetitorsByOrg.map((org, index) => {
                  const orgCompetitors = competitors
                    .filter(c => c.organization === org.organization)
                    .slice(0, 10);

                  return (
                    <div key={org.organization} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                            <Crown className="h-5 w-5 text-yellow-400" />
                            <span>{org.organization}</span>
                          </h3>
                          <p className="text-gray-400">{org.competitors} competitors</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Leader</p>
                          <p className="text-lg font-semibold text-electric-400">{org.topCompetitor}</p>
                          <p className="text-sm text-gray-500">{org.points} points</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {orgCompetitors.map((comp, idx) => (
                          <div key={comp.user_id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className="text-gray-500 font-bold w-8">#{idx + 1}</span>
                              <Link 
                                to={`/profile/${comp.user_id}`}
                                className="text-white hover:text-electric-400 transition-colors"
                              >
                                {comp.competitor_name}
                              </Link>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-electric-400 font-semibold">{comp.total_points} pts</span>
                              <span className="text-gray-500 text-sm">{comp.total_events} events</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Call to Action for logged in users with results */}
        {user && competitors.length > 0 && (
          <div className="mt-12 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Track Your Competition Progress</h3>
                <p className="text-gray-400">
                  Log your competition results to climb the leaderboard rankings
                </p>
              </div>
              <button
                onClick={() => setShowLogResultsModal(true)}
                className="px-6 py-3 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors flex items-center space-x-2"
              >
                <Trophy className="h-5 w-5" />
                <span>Log Results</span>
              </button>
            </div>
          </div>
        )}

        {/* Log Results Modal */}
        {showLogResultsModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Log Competition Results</h3>
                <button
                  onClick={() => setShowLogResultsModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-gray-300 mb-6">
                Choose how you'd like to log your competition results:
              </p>

              <div className="space-y-4">
                {/* CAE Event Option */}
                <button
                  onClick={() => {
                    setShowLogResultsModal(false);
                    navigate('/dashboard?tab=competitions&logCAE=true');
                  }}
                  className="w-full p-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-electric-500 rounded-lg transition-all text-left group"
                >
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-electric-400 mt-0.5 group-hover:text-electric-300" />
                    <div>
                      <h4 className="text-white font-semibold mb-1">Log CAE Event Results</h4>
                      <p className="text-gray-400 text-sm">
                        Log results from an official Car Audio Events competition
                      </p>
                    </div>
                  </div>
                </button>

                {/* Non-CAE Event Option */}
                <button
                  onClick={() => {
                    setShowLogResultsModal(false);
                    navigate('/dashboard?tab=competitions&logNonCAE=true');
                  }}
                  className="w-full p-4 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-electric-500 rounded-lg transition-all text-left group"
                >
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-electric-400 mt-0.5 group-hover:text-electric-300" />
                    <div>
                      <h4 className="text-white font-semibold mb-1">Log Non-CAE Event Results</h4>
                      <p className="text-gray-400 text-sm">
                        Log results from any other car audio competition not on our platform
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowLogResultsModal(false)}
                className="w-full mt-6 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;