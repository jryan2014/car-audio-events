import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Medal, Award, TrendingUp, Calendar, Filter, ChevronDown, User } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { Link } from 'react-router-dom';

interface CompetitorScore {
  user_id: string;
  competitor_name: string;
  total_points: number;
  total_events: number;
  best_placement: number;
  category_scores: {
    [category: string]: {
      points: number;
      events: number;
      best_placement: number;
    };
  };
  recent_results: {
    event_name: string;
    event_date: string;
    category: string;
    placement: number;
    score: number;
    points_earned: number;
  }[];
}

interface LeaderboardFilters {
  category: string;
  timeRange: string;
  minEvents: number;
}

const Leaderboard: React.FC = () => {
  const [competitors, setCompetitors] = useState<CompetitorScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LeaderboardFilters>({
    category: 'all',
    timeRange: 'all',
    minEvents: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadLeaderboardData();
  }, [filters]);

  const loadLeaderboardData = async () => {
    setLoading(true);
    try {
      // Build date filter
      let dateFilter = new Date();
      if (filters.timeRange === 'month') {
        dateFilter.setMonth(dateFilter.getMonth() - 1);
      } else if (filters.timeRange === 'year') {
        dateFilter.setFullYear(dateFilter.getFullYear() - 1);
      }

      // Query competition results
      let query = supabase
        .from('user_competition_results')
        .select(`
          user_id,
          event_name,
          event_date,
          category,
          placement,
          score,
          points_earned,
          users!inner(
            id,
            name,
            username
          )
        `)
        .order('event_date', { ascending: false });

      if (filters.timeRange !== 'all') {
        query = query.gte('event_date', dateFilter.toISOString());
      }

      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      const { data: results, error } = await query;

      if (error) throw error;

      // Process results to calculate leaderboard
      const competitorMap = new Map<string, CompetitorScore>();

      results?.forEach((result: any) => {
        const userId = result.user_id;
        const competitorName = result.users?.name || result.users?.username || 'Unknown Competitor';

        if (!competitorMap.has(userId)) {
          competitorMap.set(userId, {
            user_id: userId,
            competitor_name: competitorName,
            total_points: 0,
            total_events: 0,
            best_placement: 999,
            category_scores: {},
            recent_results: []
          });
        }

        const competitor = competitorMap.get(userId)!;
        
        // Update total points and events
        competitor.total_points += result.points_earned || 0;
        competitor.total_events += 1;
        
        // Update best placement
        if (result.placement && result.placement < competitor.best_placement) {
          competitor.best_placement = result.placement;
        }

        // Update category scores
        if (!competitor.category_scores[result.category]) {
          competitor.category_scores[result.category] = {
            points: 0,
            events: 0,
            best_placement: 999
          };
        }
        
        competitor.category_scores[result.category].points += result.points_earned || 0;
        competitor.category_scores[result.category].events += 1;
        
        if (result.placement && result.placement < competitor.category_scores[result.category].best_placement) {
          competitor.category_scores[result.category].best_placement = result.placement;
        }

        // Add to recent results (keep top 5)
        if (competitor.recent_results.length < 5) {
          competitor.recent_results.push({
            event_name: result.event_name,
            event_date: result.event_date,
            category: result.category,
            placement: result.placement,
            score: result.score,
            points_earned: result.points_earned
          });
        }
      });

      // Convert to array and filter by minimum events
      let leaderboard = Array.from(competitorMap.values())
        .filter(c => c.total_events >= filters.minEvents)
        .sort((a, b) => b.total_points - a.total_points);

      setCompetitors(leaderboard);

      // Extract unique categories
      const uniqueCategories = [...new Set(results?.map((r: any) => r.category).filter(Boolean))];
      setCategories(uniqueCategories);

    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
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
      <div className="container mx-auto px-4 py-8">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Time Range</label>
                <select
                  value={filters.timeRange}
                  onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="all">All Time</option>
                  <option value="year">Past Year</option>
                  <option value="month">Past Month</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Minimum Events</label>
                <select
                  value={filters.minEvents}
                  onChange={(e) => setFilters({ ...filters, minEvents: parseInt(e.target.value) })}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="0">No Minimum</option>
                  <option value="3">3+ Events</option>
                  <option value="5">5+ Events</option>
                  <option value="10">10+ Events</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : competitors.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No competition results found</p>
            <p className="text-gray-500 mt-2">Adjust your filters or check back later</p>
          </div>
        ) : (
          <div className="space-y-4">
            {competitors.map((competitor, index) => (
              <div
                key={competitor.user_id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-electric-500/50 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-12 text-center">
                      {getPlacementIcon(index + 1)}
                    </div>

                    {/* Competitor Info */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2 flex items-center space-x-2">
                        <User className="h-5 w-5 text-gray-400" />
                        <span>{competitor.competitor_name}</span>
                      </h3>

                      {/* Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-gray-400 text-sm">Total Points</p>
                          <p className="text-2xl font-bold text-electric-400">{competitor.total_points}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Events</p>
                          <p className="text-xl font-semibold text-white">{competitor.total_events}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Best Placement</p>
                          <p className={`text-xl font-semibold ${getPlacementColor(competitor.best_placement)}`}>
                            {competitor.best_placement === 999 ? '-' : `#${competitor.best_placement}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Avg Points/Event</p>
                          <p className="text-xl font-semibold text-white">
                            {Math.round(competitor.total_points / competitor.total_events)}
                          </p>
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

                  {/* Trend Indicator */}
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 bg-electric-500/10 border border-electric-500/20 rounded-xl p-8 text-center">
          <Award className="h-12 w-12 text-electric-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Want to Join the Leaderboard?</h3>
          <p className="text-gray-400 mb-6">
            Compete in Car Audio Events competitions and track your progress
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              to="/events"
              className="px-6 py-3 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors"
            >
              Find Events
            </Link>
            <Link
              to="/register"
              className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;