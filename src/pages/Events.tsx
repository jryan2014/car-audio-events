import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, Heart, Star, Filter, Search, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  venue_name: string;
  city: string;
  state: string;
  registration_fee: number;
  max_participants: number | null;
  category: {
    name: string;
    color: string;
  };
  organizer: {
    name: string;
    company_name?: string;
  };
  metadata?: {
    season_year?: number;
    favorites_count?: number;
    attendance_count?: number;
    display_start_date?: string;
    display_end_date?: string;
  };
  _count?: {
    registrations: number;
  };
}

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [eventFilter, setEventFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [categories, setCategories] = useState<Array<{id: string, name: string, color: string}>>([]);

  useEffect(() => {
    loadEvents();
    loadCategories();
    if (user) {
      loadUserFavorites();
    }
  }, [user, eventFilter]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      
      const now = new Date().toISOString();
      let query = supabase
        .from('events')
        .select(`
          *,
          category:categories(name, color),
          organizer:users(name, company_name),
          _count:event_registrations(count)
        `)
        .eq('status', 'published')
        .eq('approval_status', 'approved');

      // Filter by time period
      if (eventFilter === 'upcoming') {
        query = query.gte('end_date', now);
      } else if (eventFilter === 'past') {
        query = query.lt('end_date', now);
      }

      // Apply display date filtering for automated categorization
      if (eventFilter === 'upcoming') {
        query = query.or(`metadata->display_start_date.lte.${now},metadata->display_start_date.is.null`);
        query = query.or(`metadata->display_end_date.gte.${now},metadata->display_end_date.is.null`);
      }

      const { data, error } = await query.order('start_date', { ascending: eventFilter === 'upcoming' });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, color')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadUserFavorites = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('event_favorites')
        .select('event_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setFavorites(new Set(data?.map(f => f.event_id) || []));
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const toggleFavorite = async (eventId: string) => {
    if (!user) return;

    try {
      if (favorites.has(eventId)) {
        // Remove favorite
        const { error } = await supabase
          .from('event_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', eventId);

        if (error) throw error;
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
      } else {
        // Add favorite
        const { error } = await supabase
          .from('event_favorites')
          .insert([{ user_id: user.id, event_id: eventId }]);

        if (error) throw error;
        setFavorites(prev => new Set([...prev, eventId]));
      }

      // Track analytics
      await supabase
        .from('event_analytics')
        .insert([{
          event_id: eventId,
          metric_type: 'favorite',
          user_id: user.id
        }]);

    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const trackEventView = async (eventId: string) => {
    try {
      await supabase
        .from('event_analytics')
        .insert([{
          event_id: eventId,
          metric_type: 'view',
          user_id: user?.id || null
        }]);
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const getSeasonYears = () => {
    const years = new Set<number>();
    events.forEach(event => {
      const seasonYear = event.metadata?.season_year || new Date(event.start_date).getFullYear();
      years.add(seasonYear);
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.state.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || event.category?.name === selectedCategory;
    
    const eventSeasonYear = event.metadata?.season_year || new Date(event.start_date).getFullYear();
    const matchesSeason = !selectedSeason || eventSeasonYear.toString() === selectedSeason;
    
    return matchesSearch && matchesCategory && matchesSeason;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isEventPast = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Car Audio Events</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Discover and participate in car audio competitions, meets, and exhibitions across the country
          </p>
        </div>

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
              />
            </div>

            {/* Time Filter */}
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value as any)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
            >
              <option value="upcoming">Upcoming Events</option>
              <option value="past">Past Events</option>
              <option value="all">All Events</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>

            {/* Season Filter */}
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
            >
              <option value="">All Seasons</option>
              {getSeasonYears().map(year => (
                <option key={year} value={year.toString()}>{year} Season</option>
              ))}
            </select>

            {/* Results Count */}
            <div className="flex items-center justify-center bg-gray-700/50 rounded-lg px-4 py-2">
              <span className="text-gray-400 text-sm">
                {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg mb-2">No events found</p>
            <p className="text-gray-500">Try adjusting your filters or check back later for new events</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-electric-500/50 transition-all duration-300 group">
                {/* Event Header */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span 
                          className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${event.category?.color}20`,
                            color: event.category?.color 
                          }}
                        >
                          {event.category?.name}
                        </span>
                        {event.metadata?.season_year && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-electric-500/20 text-electric-400">
                            {event.metadata.season_year} Season
                          </span>
                        )}
                        {isEventPast(event.end_date) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                            Past Event
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white group-hover:text-electric-400 transition-colors">
                        {event.title}
                      </h3>
                    </div>
                    
                    {user && (
                      <button
                        onClick={() => toggleFavorite(event.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          favorites.has(event.id)
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-gray-700/50 text-gray-400 hover:bg-red-500/20 hover:text-red-400'
                        }`}
                        title={favorites.has(event.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart className={`h-4 w-4 ${favorites.has(event.id) ? 'fill-current' : ''}`} />
                      </button>
                    )}
                  </div>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{event.description}</p>

                  {/* Event Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-300">
                      <Calendar className="h-4 w-4 mr-2 text-electric-500" />
                      <span>{formatDate(event.start_date)}</span>
                      {event.start_date !== event.end_date && (
                        <span> - {formatDate(event.end_date)}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center text-gray-300">
                      <MapPin className="h-4 w-4 mr-2 text-electric-500" />
                      <span>{event.venue_name}, {event.city}, {event.state}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-gray-300">
                        <Users className="h-4 w-4 mr-2 text-electric-500" />
                        <span>
                          {event._count?.registrations || 0} registered
                          {event.max_participants && ` / ${event.max_participants}`}
                        </span>
                      </div>
                      
                      {event.metadata?.favorites_count && event.metadata.favorites_count > 0 && (
                        <div className="flex items-center text-red-400">
                          <Heart className="h-4 w-4 mr-1 fill-current" />
                          <span className="text-sm">{event.metadata.favorites_count}</span>
                        </div>
                      )}
                    </div>

                    {event.registration_fee > 0 && (
                      <div className="flex items-center text-green-400">
                        <span className="font-medium">${event.registration_fee}</span>
                        <span className="text-gray-400 ml-1">registration fee</span>
                      </div>
                    )}
                  </div>

                  {/* Organizer */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-500">
                      Organized by <span className="text-gray-400 font-medium">
                        {event.organizer?.company_name || event.organizer?.name}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="px-6 pb-6">
                  <Link
                    to={`/events/${event.id}`}
                    onClick={() => trackEventView(event.id)}
                    className="w-full bg-electric-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-electric-600 transition-colors duration-200 flex items-center justify-center space-x-2"
                  >
                    <span>View Details</span>
                    <Trophy className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}