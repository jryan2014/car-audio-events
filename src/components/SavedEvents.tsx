import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Trophy, CheckCircle, Plus, Trash2, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { parseLocalDate } from '../utils/dateHelpers';

interface SavedEvent {
  id: string;
  event_id: string;
  saved_at: string;
  notes?: string;
  reminder_set: boolean;
  reminder_date?: string;
  event: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    city: string;
    state: string;
    category: string;
    image_url?: string;
    registration_deadline?: string;
    status: string;
  };
  attendance?: {
    id: string;
    attended_date: string;
    status: string;
  };
  competition_results?: {
    id: string;
    category: string;
    class?: string;
    score?: number;
    placement?: number;
    points_earned: number;
    verified: boolean;
  }[];
}

interface SavedEventsProps {
  limit?: number;
  showActions?: boolean;
}

export default function SavedEvents({ limit, showActions = true }: SavedEventsProps) {
  const { user } = useAuth();
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'attended'>('all');

  useEffect(() => {
    if (user) {
      loadSavedEvents();
    }
  }, [user, filter]);

  const loadSavedEvents = async () => {
    try {
      setLoading(true);
      
      // First get saved events
      const { data: savedEventsData, error: savedError } = await supabase
        .from('saved_events')
        .select('*')
        .eq('user_id', user!.id)
        .order('saved_at', { ascending: false });

      if (savedError) throw savedError;
      if (!savedEventsData || savedEventsData.length === 0) {
        setSavedEvents([]);
        setLoading(false);
        return;
      }

      // Get event IDs
      const eventIds = savedEventsData.map(se => se.event_id);
      
      // Load events data - simple approach without joins
      const eventsPromises = eventIds.map(async (eventId) => {
        try {
          const { data, error } = await supabase
            .from('events')
            .select('*, event_categories(name)')
            .eq('id', eventId)
            .single();
          
          if (error) throw error;
          return data;
        } catch (err) {
          console.error(`Error loading event ${eventId}:`, err);
          return null;
        }
      });

      const eventsData = await Promise.all(eventsPromises);
      const validEvents = eventsData.filter(e => e !== null);

      // Load attendance data
      const { data: attendanceData } = await supabase
        .from('event_attendance')
        .select('*')
        .eq('user_id', user!.id)
        .in('event_id', eventIds);

      // Load competition results
      const { data: resultsData } = await supabase
        .from('competition_results')
        .select('*')
        .eq('user_id', user!.id)
        .in('event_id', eventIds);

      // Combine all data
      const combinedData = savedEventsData.map(savedEvent => {
        const event = validEvents.find((e: any) => e.id === savedEvent.event_id);
        const attendance = attendanceData?.find(a => a.event_id === savedEvent.event_id);
        const results = resultsData?.filter(r => r.event_id === savedEvent.event_id);

        if (!event) {
          return null; // Skip if event not found
        }

        return {
          ...savedEvent,
          event: {
            id: event.id,
            title: event.title || 'Untitled Event',
            start_date: event.start_date,
            end_date: event.end_date || event.start_date,
            city: event.city || 'Unknown',
            state: event.state || 'Unknown',
            category: event.event_categories?.name || 'Competition',
            image_url: event.image_url,
            registration_deadline: event.registration_deadline,
            status: event.status || 'published'
          },
          attendance,
          competition_results: results
        };
      }).filter(item => item !== null);

      // Apply filters
      const now = new Date();
      let filteredData = combinedData;
      
      if (filter === 'upcoming') {
        filteredData = combinedData.filter(se => new Date(se.event.start_date) > now);
      } else if (filter === 'past') {
        filteredData = combinedData.filter(se => new Date(se.event.end_date) < now);
      } else if (filter === 'attended') {
        filteredData = combinedData.filter(se => !!se.attendance);
      }

      if (limit) {
        filteredData = filteredData.slice(0, limit);
      }

      setSavedEvents(filteredData);
    } catch (error) {
      console.error('Error loading saved events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = async (savedEventId: string) => {
    try {
      const { error } = await supabase
        .from('saved_events')
        .delete()
        .eq('id', savedEventId);

      if (error) throw error;
      
      // Remove from local state
      setSavedEvents(prev => prev.filter(se => se.id !== savedEventId));
    } catch (error) {
      console.error('Error removing saved event:', error);
      alert('Failed to remove saved event. Please try again.');
    }
  };

  const handleMarkAttended = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('event_attendance')
        .insert({
          user_id: user!.id,
          event_id: eventId,
          attended_date: new Date().toISOString().split('T')[0],
          status: 'attended'
        });

      if (error) throw error;
      
      // Reload events to show updated attendance
      loadSavedEvents();
    } catch (error) {
      console.error('Error marking event as attended:', error);
      alert('Failed to mark event as attended. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  if (savedEvents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 mb-4">No saved events yet.</p>
        <Link
          to="/events"
          className="inline-flex items-center space-x-2 bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Browse Events</span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {showActions && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-electric-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All ({savedEvents.length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'upcoming'
                ? 'bg-electric-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'past'
                ? 'bg-electric-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Past
          </button>
          <button
            onClick={() => setFilter('attended')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'attended'
                ? 'bg-electric-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Attended
          </button>
        </div>
      )}

      <div className="space-y-4">
        {savedEvents.map((savedEvent) => {
          const event = savedEvent.event;
          const isPast = new Date(event.end_date) < new Date();
          const isUpcoming = new Date(event.start_date) > new Date();
          const hasAttended = !!savedEvent.attendance;
          const hasResults = savedEvent.competition_results && savedEvent.competition_results.length > 0;

          return (
            <div
              key={savedEvent.id}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 hover:border-electric-500/50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start space-x-4">
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1">
                        <Link
                          to={`/events/${event.id}`}
                          className="hover:text-electric-400 transition-colors"
                        >
                          {event.title}
                        </Link>
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{parseLocalDate(event.start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{event.city}, {event.state}</span>
                        </div>
                        <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                          {event.category}
                        </span>
                      </div>

                      {/* Status badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {hasAttended && (
                          <span className="flex items-center space-x-1 bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
                            <CheckCircle className="h-3 w-3" />
                            <span>Attended</span>
                          </span>
                        )}
                        {hasResults && (
                          <span className="flex items-center space-x-1 bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs">
                            <Trophy className="h-3 w-3" />
                            <span>{savedEvent.competition_results![0].points_earned} pts</span>
                          </span>
                        )}
                        {event.registration_deadline && new Date(event.registration_deadline) > new Date() && (
                          <span className="flex items-center space-x-1 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs">
                            <Clock className="h-3 w-3" />
                            <span>Reg by {parseLocalDate(event.registration_deadline).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {showActions && (
                  <div className="flex items-center space-x-2 ml-4">
                    {isPast && !hasAttended && (
                      <button
                        onClick={() => handleMarkAttended(event.id)}
                        className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                        title="Mark as attended"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    {hasAttended && !hasResults && (
                      <Link
                        to={`/events/${event.id}/results`}
                        className="p-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                        title="Add competition results"
                      >
                        <Plus className="h-4 w-4" />
                      </Link>
                    )}
                    <Link
                      to={`/events/${event.id}`}
                      className="p-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                      title="View event"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleRemoveSaved(savedEvent.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      title="Remove from saved"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showActions && savedEvents.length > 0 && (
        <div className="mt-6 text-center">
          <Link
            to="/profile#saved-events"
            className="inline-flex items-center space-x-2 text-electric-400 hover:text-electric-300 transition-colors"
          >
            <span>View all saved events</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}