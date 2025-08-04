import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Trophy, Medal, Award, TrendingUp, Calendar, Filter, ChevronDown, 
  User, X, CheckCircle, BarChart3, Users, Target, Crown, 
  Share2, ArrowUp, ArrowDown, Minus, ExternalLink
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import LogCAEEventModal from '../components/LogCAEEventModal';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Real leaderboard data now loaded from competition_results table

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
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [availableDivisions, setAvailableDivisions] = useState<string[]>(['all']);
  const [availableClasses, setAvailableClasses] = useState<string[]>(['all']);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorScore | null>(null);
  const [showFilters, setShowFilters] = useState(false);
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
    try {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('id, name, logo_url')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      const organizationList = [
        { id: 'all', name: 'All Organizations' },
        { id: 'independent', name: 'Independent' },
        ...(orgs || []).map(org => ({
          id: org.id,
          name: org.name,
          logo: org.logo_url
        }))
      ];

      setOrganizations(organizationList);
    } catch (error) {
      console.error('Error loading organizations:', error);
      // Fallback to basic options
      setOrganizations([
        { id: 'all', name: 'All Organizations' },
        { id: 'independent', name: 'Independent' }
      ]);
    }
  };

  const loadLeaderboardData = async () => {
    setLoading(true);
    try {
      // Fetch real competition results from database
      let query = supabase
        .from('competition_results')
        .select(`
          *,
          competition_divisions(id, name),
          competition_classes(id, name),
          events(id, title, start_date, organization_id, organizations(id, name))
        `)
        .eq('verified', true)
        .order('created_at', { ascending: false });

      // Apply season filter
      if (filters.season !== 'all') {
        const year = parseInt(filters.season);
        const startOfYear = `${year}-01-01`;
        const endOfYear = `${year}-12-31`;
        query = query.gte('event_date', startOfYear).lte('event_date', endOfYear);
      }

      const { data: results, error } = await query;
      if (error) throw error;

      if (!results || results.length === 0) {
        setCompetitors([]);
        setAvailableDivisions(['all']);
        setAvailableClasses(['all']);
        setLoading(false);
        return;
      }

      // Get unique user IDs to fetch user data separately
      const userIds = [...new Set(results.map(r => r.user_id))];
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Create a map of user data for easy lookup
      const userMap = new Map();
      (users || []).forEach(user => {
        userMap.set(user.id, user);
      });

      // Group results by user and calculate aggregated stats
      const userStats = results.reduce((acc: any, result: any) => {
        const userId = result.user_id;
        const user = userMap.get(userId);
        const userName = user?.name || user?.email || 'Unknown';
        const organization = result.events?.organizations?.name || 'Independent';
        const division = result.competition_divisions?.name || result.category || 'Unknown';
        const className = result.competition_classes?.name || 'Unknown';

        if (!acc[userId]) {
          acc[userId] = {
            user_id: userId,
            competitor_name: userName,
            total_points: 0,
            total_events: 0,
            best_placement: Number.MAX_SAFE_INTEGER,
            total_score: 0,
            organization: organization,
            division: division,
            class: className,
            recent_placements: [],
            category_scores: {},
            recent_results: []
          };
        }

        // Update stats
        acc[userId].total_points += result.points_earned || 0;
        acc[userId].total_events += 1;
        acc[userId].total_score += result.score || 0;
        
        if (result.placement && result.placement < acc[userId].best_placement) {
          acc[userId].best_placement = result.placement;
        }

        // Track recent placements (last 5)
        if (acc[userId].recent_placements.length < 5) {
          acc[userId].recent_placements.push(result.placement || 999);
        }

        // Category scores
        const category = result.category || 'Unknown';
        if (!acc[userId].category_scores[category]) {
          acc[userId].category_scores[category] = {
            points: 0,
            events: 0,
            best_placement: Number.MAX_SAFE_INTEGER,
            total_score: 0
          };
        }
        
        acc[userId].category_scores[category].points += result.points_earned || 0;
        acc[userId].category_scores[category].events += 1;
        acc[userId].category_scores[category].total_score += result.score || 0;
        if (result.placement && result.placement < acc[userId].category_scores[category].best_placement) {
          acc[userId].category_scores[category].best_placement = result.placement;
        }

        // Recent results
        if (acc[userId].recent_results.length < 5) {
          acc[userId].recent_results.push({
            event_name: result.event_name || result.events?.title || 'Unknown Event',
            event_date: result.event_date || result.events?.start_date || '',
            category: category,
            placement: result.placement || 999,
            score: result.score || 0,
            points_earned: result.points_earned || 0,
            organization: organization
          });
        }

        return acc;
      }, {});

      // Convert to array and calculate final stats
      let filteredCompetitors = Object.values(userStats).map((competitor: any) => {
        // Calculate average score
        competitor.average_score = competitor.total_events > 0 ? 
          competitor.total_score / competitor.total_events : 0;

        // Calculate average scores for categories
        Object.keys(competitor.category_scores).forEach(category => {
          const categoryData = competitor.category_scores[category];
          categoryData.average_score = categoryData.events > 0 ? 
            categoryData.total_score / categoryData.events : 0;
          delete categoryData.total_score; // Clean up temp field
        });

        // Determine trend (simplified - could be more sophisticated)
        const recentPlacements = competitor.recent_placements;
        if (recentPlacements.length >= 2) {
          const avg1 = recentPlacements.slice(0, Math.ceil(recentPlacements.length / 2))
            .reduce((sum: number, p: number) => sum + p, 0) / Math.ceil(recentPlacements.length / 2);
          const avg2 = recentPlacements.slice(Math.ceil(recentPlacements.length / 2))
            .reduce((sum: number, p: number) => sum + p, 0) / Math.floor(recentPlacements.length / 2);
          
          if (avg2 < avg1 - 0.5) competitor.trend = 'up';
          else if (avg2 > avg1 + 0.5) competitor.trend = 'down';
          else competitor.trend = 'stable';
        } else {
          competitor.trend = 'stable';
        }

        // Clean up temp field
        delete competitor.total_score;

        return competitor;
      });

      // Apply filters
      if (filters.organization !== 'all') {
        filteredCompetitors = filteredCompetitors.filter((c: any) => 
          c.organization === filters.organization);
      }
      
      if (filters.division !== 'all') {
        filteredCompetitors = filteredCompetitors.filter((c: any) => 
          c.division === filters.division);
      }
      
      if (filters.class !== 'all') {
        filteredCompetitors = filteredCompetitors.filter((c: any) => 
          c.class === filters.class);
      }

      // Sort by total points
      filteredCompetitors.sort((a: any, b: any) => b.total_points - a.total_points);

      setCompetitors(filteredCompetitors);
      
      // Extract unique divisions and classes from real data
      const uniqueDivisions = [...new Set(results.map(r => 
        r.competition_divisions?.name || r.category || 'Unknown'
      ).filter(Boolean))] as string[];
      setAvailableDivisions(['all', ...uniqueDivisions]);
      
      const uniqueClasses = [...new Set(results.map(r => 
        r.competition_classes?.name || 'Unknown'
      ).filter(Boolean))] as string[];
      setAvailableClasses(['all', ...uniqueClasses]);

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
      if (!orgMap.has(comp.organization)) {
        orgMap.set(comp.organization, []);
      }
      orgMap.get(comp.organization)!.push(comp);
    });

    const result: any[] = [];
    orgMap.forEach((comps, org) => {
      const sorted = comps.sort((a, b) => b.total_points - a.total_points);
      result.push({
        organization: org,
        competitors: sorted.slice(0, 3),
        total_points: comps.reduce((sum, c) => sum + c.total_points, 0),
        avg_points: Math.round(comps.reduce((sum, c) => sum + c.total_points, 0) / comps.length)
      });
    });

    return result.sort((a, b) => b.total_points - a.total_points);
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

  const getRankSuffix = (rank: number) => {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <ArrowDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
      <SEO 
        title="Competition Leaderboard - Top Car Audio Competitors"
        description="View the top car audio competitors across IASCA, MECA, and Bass Wars events. Real-time rankings, scores, and competition statistics for the 2025 season."
        keywords="car audio leaderboard, competition rankings, top competitors, IASCA rankings, MECA standings, Bass Wars scores, car audio champions"
        url="https://caraudioevents.com/leaderboard"
      />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-electric-400 to-blue-400 bg-clip-text text-transparent">
            Leaderboard
          </h1>
          <p className="text-gray-400 text-lg">
            Track the top competitors and their achievements across all competitions
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800/50 rounded-lg p-1 flex space-x-1">
            {[
              { key: 'rankings', label: 'Rankings', icon: Trophy },
              { key: 'charts', label: 'Analytics', icon: BarChart3 },
              { key: 'organizations', label: 'Organizations', icon: Users }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setViewMode(key as any)}
                className={`px-6 py-3 rounded-md flex items-center space-x-2 transition-all ${
                  viewMode === key
                    ? 'bg-electric-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <select
                value={filters.organization}
                onChange={(e) => setFilters({ ...filters, organization: e.target.value })}
                className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-electric-500"
              >
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>

              <select
                value={filters.division}
                onChange={(e) => setFilters({ ...filters, division: e.target.value })}
                className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-electric-500"
              >
                {availableDivisions.map(division => (
                  <option key={division} value={division}>
                    {division === 'all' ? 'All Divisions' : division}
                  </option>
                ))}
              </select>

              <select
                value={filters.class}
                onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-electric-500"
              >
                {availableClasses.map(cls => (
                  <option key={cls} value={cls}>
                    {cls === 'all' ? 'All Classes' : cls}
                  </option>
                ))}
              </select>

              <select
                value={filters.season}
                onChange={(e) => setFilters({ ...filters, season: e.target.value })}
                className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-electric-500"
              >
                <option value="2025">2025 Season</option>
                <option value="2024">2024 Season</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {user && (
              <button
                onClick={() => setShowLogResultsModal(true)}
                className="bg-electric-500 hover:bg-electric-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Trophy className="h-5 w-5" />
                <span>Log Results</span>
              </button>
            )}
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'rankings' && (
          <div className="space-y-6">
            {competitors.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400 mb-2">No Results Found</h3>
                <p className="text-gray-500">
                  No competition results match the current filters. Try adjusting your search criteria.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {competitors.map((competitor, index) => (
                  <div
                    key={competitor.user_id}
                    className={`bg-gray-800/50 border rounded-lg p-6 cursor-pointer transition-all hover:bg-gray-700/50 ${
                      index < 3 ? 'border-electric-500/30 bg-gradient-to-r from-electric-500/10 to-transparent' : 'border-gray-700'
                    }`}
                    onClick={() => setSelectedCompetitor(competitor)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                          <div className={`text-2xl font-bold ${
                            index === 0 ? 'text-yellow-400' :
                            index === 1 ? 'text-gray-300' :
                            index === 2 ? 'text-amber-600' :
                            'text-gray-400'
                          }`}>
                            #{index + 1}
                          </div>
                          {index < 3 && (
                            <div className={`p-2 rounded-full ${
                              index === 0 ? 'bg-yellow-400/20' :
                              index === 1 ? 'bg-gray-300/20' :
                              'bg-amber-600/20'
                            }`}>
                              {index === 0 ? <Crown className="h-6 w-6 text-yellow-400" /> :
                               index === 1 ? <Medal className="h-6 w-6 text-gray-300" /> :
                               <Award className="h-6 w-6 text-amber-600" />}
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-semibold">{competitor.competitor_name}</h3>
                          <p className="text-gray-400">
                            {competitor.organization} • {competitor.division} • {competitor.class}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center space-x-3">
                          <div>
                            <div className="text-2xl font-bold text-electric-400">
                              {competitor.total_points.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-400">
                              {competitor.total_events} events • Best: {competitor.best_placement}{getRankSuffix(competitor.best_placement)}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            {getTrendIcon(competitor.trend)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Points Distribution */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Points Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pointsDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="range" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="#22D3EE" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Organizations */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Top Organizations</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topCompetitorsByOrg.slice(0, 6)}
                    dataKey="total_points"
                    nameKey="organization"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ organization, percent }) => `${organization} ${(percent * 100).toFixed(0)}%`}
                  >
                    {topCompetitorsByOrg.slice(0, 6).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {viewMode === 'organizations' && (
          <div className="grid gap-6">
            {topCompetitorsByOrg.map((org, index) => (
              <div key={org.organization} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">{org.organization}</h3>
                  <div className="text-electric-400 font-semibold">
                    {org.total_points.toLocaleString()} total points
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {org.competitors.map((competitor: CompetitorScore, idx: number) => (
                    <div key={competitor.user_id} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{competitor.competitor_name}</h4>
                        <span className="text-sm text-gray-400">#{idx + 1}</span>
                      </div>
                      <div className="text-electric-400 font-semibold">
                        {competitor.total_points.toLocaleString()} pts
                      </div>
                      <div className="text-sm text-gray-400">
                        {competitor.total_events} events • Best: {competitor.best_placement}{getRankSuffix(competitor.best_placement)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log Results Modal */}
      {user && (
        <LogCAEEventModal
          isOpen={showLogResultsModal}
          onClose={() => setShowLogResultsModal(false)}
          userId={user.id}
          onSuccess={() => {
            loadLeaderboardData();
            setShowLogResultsModal(false);
          }}
        />
      )}
    </div>
  );
};

export default Leaderboard;