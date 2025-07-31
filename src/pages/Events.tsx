import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Clock, Heart, Star, Filter, Search, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import AdDisplay from '../components/AdDisplay';
import { parseLocalDate } from '../utils/dateHelpers';
import { activityLogger } from '../services/activityLogger';

interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  venue_name: string;
  city: string;
  state: string;
  country: string;
  registration_fee: number;
  member_price: number;
  non_member_price: number;
  ticket_price: number;
  max_participants: number | null;
  event_director_first_name?: string;
  event_director_last_name?: string;
  organization_id?: string | null;
  event_categories: {
    name: string;
    color: string;
  };
  organizations?: {
    id: string;
    name: string;
  } | null;
  users: {
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
  interest_count?: number;
}

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [eventFilter, setEventFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [categories, setCategories] = useState<Array<{id: string, name: string, color: string}>>([]);
  const [organizations, setOrganizations] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    loadEvents();
    loadCategories();
    if (user) {
      loadUserFavorites();
      // Log page visit
      activityLogger.log({
        userId: user.id,
        activityType: 'event_view' as any,
        description: `User visited Events page`,
        metadata: {
          page: 'events',
          filter: eventFilter,
          user_email: user.email,
          user_name: user.name
        }
      });
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
          event_categories(name, color),
          users!organizer_id(name, company_name),
          organizations(id, name)
        `)
        .eq('status', 'published')
        .eq('approval_status', 'approved');

      // Filter by time period
      if (eventFilter === 'upcoming') {
        query = query.gte('end_date', now);
      } else if (eventFilter === 'past') {
        query = query.lt('end_date', now);
      }

      const { data: eventsData, error } = await query.order('start_date', { ascending: eventFilter === 'upcoming' });

      if (error) throw error;
      
      console.log('Loaded events data:', eventsData);
      
      // Load interest counts for all events
      if (eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map(e => e.id);
        const { data: interestData, error: interestError } = await supabase
          .from('event_interest_counts')
          .select('event_id, interest_count')
          .in('event_id', eventIds);
          
        if (!interestError && interestData) {
          // Create a map of event_id to interest_count
          const interestMap = new Map(interestData.map(item => [item.event_id, item.interest_count]));
          
          // Add interest count to each event
          const eventsWithInterest = eventsData.map(event => ({
            ...event,
            interest_count: interestMap.get(event.id) || 0
          }));
          
          setEvents(eventsWithInterest);
        } else {
          setEvents(eventsData);
        }
        
        // Extract unique organizations
        const uniqueOrgs = new Map<string, string>();
        eventsData.forEach(event => {
          console.log('Event org data:', { 
            event_id: event.id, 
            organization_id: event.organization_id,
            organizations: event.organizations 
          });
          if (event.organizations?.id && event.organizations?.name) {
            uniqueOrgs.set(event.organizations.id, event.organizations.name);
          }
        });
        console.log('Unique organizations:', uniqueOrgs);
        setOrganizations(Array.from(uniqueOrgs, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('event_categories')
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
    
    console.log('❤️ Skipping favorites loading due to database issues');
    // Skip loading favorites for now
    setFavorites(new Set());
  };

  const toggleFavorite = async (eventId: string) => {
    if (!user) return;

    console.log('❤️ Skipping favorite toggle due to database issues');
    // Just update local state for now
    if (favorites.has(eventId)) {
      setFavorites(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
    } else {
      setFavorites(prev => new Set([...prev, eventId]));
    }
  };

  const trackEventView = async (eventId: string) => {
    console.log('👁️ Skipping event view tracking due to database issues');
    // Skip analytics tracking for now
  };

  const getSeasonYears = () => {
    const years = new Set<number>();
    events.forEach(event => {
      const seasonYear = event.metadata?.season_year || parseLocalDate(event.start_date).getFullYear();
      years.add(seasonYear);
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const getUniqueCountries = () => {
    const countries = new Set<string>();
    events.forEach(event => {
      if (event.country) {
        countries.add(event.country);
      }
    });
    return Array.from(countries).sort();
  };

  const getUniqueStates = () => {
    const states = new Set<string>();
    events.forEach(event => {
      // If a country is selected, only show states from that country
      if (selectedCountry && event.country !== selectedCountry) {
        return;
      }
      if (event.state) {
        states.add(event.state);
      }
    });
    return Array.from(states).sort();
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.state.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || event.event_categories?.name === selectedCategory;
    
    const eventSeasonYear = event.metadata?.season_year || parseLocalDate(event.start_date).getFullYear();
    const matchesSeason = !selectedSeason || eventSeasonYear.toString() === selectedSeason;
    
    const matchesCountry = !selectedCountry || event.country === selectedCountry;
    const matchesState = !selectedState || event.state === selectedState;
    
    const matchesOrganization = !selectedOrganization || 
                               event.organizations?.id === selectedOrganization;
    
    const matchesMonth = !selectedMonth || 
                        (selectedMonth === parseLocalDate(event.start_date).toLocaleString('en-US', { month: 'long' }));
    
    return matchesSearch && matchesCategory && matchesSeason && matchesCountry && matchesState && matchesOrganization && matchesMonth;
  });

  const formatDate = (dateString: string) => {
    return parseLocalDate(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isEventPast = (endDate: string) => {
    return parseLocalDate(endDate) < new Date();
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
        <PageHeader
          title="Car Audio Events"
          subtitle="Discover and participate in car audio competitions, meets, and exhibitions across the country"
        />

        {/* Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

            {/* Country Filter */}
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                // Reset state when country changes
                setSelectedState('');
              }}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
            >
              <option value="">All Countries</option>
              {getUniqueCountries().map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>

            {/* State Filter */}
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
              disabled={!selectedCountry && getUniqueStates().length === 0}
            >
              <option value="">All States</option>
              {getUniqueStates().map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>

            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
            >
              <option value="">All Months</option>
              <option value="January">January</option>
              <option value="February">February</option>
              <option value="March">March</option>
              <option value="April">April</option>
              <option value="May">May</option>
              <option value="June">June</option>
              <option value="July">July</option>
              <option value="August">August</option>
              <option value="September">September</option>
              <option value="October">October</option>
              <option value="November">November</option>
              <option value="December">December</option>
            </select>

            {/* Organization Filter */}
            <select
              value={selectedOrganization}
              onChange={(e) => setSelectedOrganization(e.target.value)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
            >
              <option value="">All Organizations</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>

          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Results Count */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-300">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
              </h2>
            </div>
            
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No events found</p>
                <p className="text-gray-500">Try adjusting your filters or check back later for new events</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-electric-500/50 transition-all duration-300 group flex flex-col h-full">
                    {/* Event Header */}
                    <div className="p-6 pb-4 flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span 
                              className="px-2 py-1 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: `${event.event_categories?.color}20`,
                                color: event.event_categories?.color 
                              }}
                            >
                              {event.event_categories?.name}
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
                              {event.interest_count || 0} interested
                            </span>
                          </div>
                          
                          {event.metadata?.favorites_count && event.metadata.favorites_count > 0 && (
                            <div className="flex items-center text-red-400">
                              <Heart className="h-4 w-4 mr-1 fill-current" />
                              <span className="text-sm">{event.metadata.favorites_count}</span>
                            </div>
                          )}
                        </div>

                        {(event.member_price > 0 || event.non_member_price > 0 || event.ticket_price > 0 || event.registration_fee > 0) && (
                          <div className="flex items-center text-green-400">
                            {event.member_price > 0 || event.non_member_price > 0 ? (
                              <>
                                <span className="font-medium">
                                  ${event.member_price > 0 ? event.member_price : event.non_member_price}
                                </span>
                                {event.member_price !== event.non_member_price && event.member_price > 0 && event.non_member_price > 0 && (
                                  <span className="text-gray-400 ml-1">- ${event.non_member_price}</span>
                                )}
                                <span className="text-gray-400 ml-1">entry fee</span>
                              </>
                            ) : (
                              <>
                                <span className="font-medium">${event.ticket_price || event.registration_fee}</span>
                                <span className="text-gray-400 ml-1">entry fee</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Organizer */}
                      <div className="mt-auto pt-4 border-t border-gray-700">
                        <p className="text-xs text-gray-500">
                          Organized by <span className="text-gray-400 font-medium">
                            {event.event_director_first_name && event.event_director_last_name
                              ? `${event.event_director_first_name} ${event.event_director_last_name}`
                              : event.users?.company_name || event.users?.name}
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

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <AdDisplay placement="sidebar" pageType="events" />
          </div>
        </div>
      </div>
    </div>
  );
}