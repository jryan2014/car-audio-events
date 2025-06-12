import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Trophy, Users, Star, ArrowRight, Volume2, Zap } from 'lucide-react';
import GoogleMap from '../components/GoogleMap';
import { supabase } from '../lib/supabase';

interface FeaturedEvent {
  id: string | number;
  title: string;
  start_date: string;
  end_date?: string;
  city: string;
  state: string;
  image_url?: string;
  category?: string;
  current_participants?: number;
  max_participants?: number;
}

export default function Home() {
  const [featuredEvents, setFeaturedEvents] = useState<FeaturedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Realistic car audio placeholder events with proper car audio images
  const placeholderEvents: FeaturedEvent[] = [
    {
      id: 'placeholder-1',
      title: "IASCA World Finals 2025",
      start_date: "2025-03-15",
      end_date: "2025-03-17",
      city: "Orlando",
      state: "FL",
      image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&h=400&q=80",
      category: "Championship",
      current_participants: 150,
      max_participants: 200
    },
    {
      id: 'placeholder-2',
      title: "dB Drag Racing National Event",
      start_date: "2025-04-22",
      end_date: "2025-04-24",
      city: "Phoenix",
      state: "AZ",
      image_url: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&h=400&q=80",
      category: "SPL Competition",
      current_participants: 89,
      max_participants: 120
    },
    {
      id: 'placeholder-3',
      title: "MECA Spring Sound Quality Championship",
      start_date: "2025-05-10",
      end_date: "2025-05-12",
      city: "Atlanta",
      state: "GA",
      image_url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&h=400&q=80",
      category: "Sound Quality",
      current_participants: 67,
      max_participants: 100
    }
  ];

  useEffect(() => {
    fetchFeaturedEvents();
  }, []);

  const fetchFeaturedEvents = async () => {
    try {
      setLoading(true);
      
      // Fetch featured events from database
      const { data: dbEvents, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          start_date,
          end_date,
          city,
          state,
          image_url,
          current_participants,
          max_participants,
          category_id,
          event_categories(name)
        `)
        .eq('is_featured', true)
        .eq('status', 'published')
        .gte('start_date', new Date().toISOString().split('T')[0]) // Only future events
        .order('start_date', { ascending: true })
        .limit(3);

      if (error) {
        console.error('Error fetching featured events:', error);
        setFeaturedEvents(placeholderEvents);
        return;
      }

      // Transform database events to match our interface
      const transformedEvents: FeaturedEvent[] = dbEvents?.map(event => ({
        id: event.id,
        title: event.title,
        start_date: event.start_date,
        end_date: event.end_date,
        city: event.city,
        state: event.state,
        image_url: event.image_url || getDefaultEventImage(event.event_categories?.[0]?.name),
        category: event.event_categories?.[0]?.name || 'Competition',
        current_participants: event.current_participants || 0,
        max_participants: event.max_participants || 100
      })) || [];

      // If we have database events, use them; otherwise use placeholders
      if (transformedEvents.length > 0) {
        setFeaturedEvents(transformedEvents);
      } else {
        setFeaturedEvents(placeholderEvents);
      }
    } catch (error) {
      console.error('Error in fetchFeaturedEvents:', error);
      setFeaturedEvents(placeholderEvents);
    } finally {
      setLoading(false);
    }
  };

  // Get default image based on event category
  const getDefaultEventImage = (category?: string): string => {
    const categoryImages: Record<string, string> = {
      'Bass Competition': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&h=400&q=80',
      'SPL Competition': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&h=400&q=80',
      'Sound Quality': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&h=400&q=80',
      'Championship': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&h=400&q=80',
      'Local Show': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&h=400&q=80',
      'Installation': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&h=400&q=80'
    };
    
    return categoryImages[category || ''] || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&h=400&q=80';
  };

  // Format date for display
  const formatEventDate = (startDate: string, endDate?: string): string => {
    const start = new Date(startDate);
    const startFormatted = start.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });

    if (endDate && endDate !== startDate) {
      const end = new Date(endDate);
      const endFormatted = end.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
      return `${startFormatted} - ${endFormatted}`;
    }

    return startFormatted;
  };

  const stats = [
    { label: "Active Events", value: "250+", icon: Calendar },
    { label: "Registered Competitors", value: "5,000+", icon: Users },
    { label: "Partner Retailers", value: "150+", icon: MapPin },
    { label: "Championships", value: "25", icon: Trophy }
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden h-[60vh] md:h-[70vh]">
        <div className="h-full relative">
          {/* World Map Background - NO OVERLAY */}
          <div className="absolute inset-0 z-0">
            <GoogleMap />
          </div>
          
          {/* Content positioned on the left side - NO OVERLAY ON MAP */}
          <div className="absolute left-0 top-0 h-full flex items-center z-10">
            <div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-4 md:ml-8 animate-slide-up">
              {/* Clean text container positioned to left - doesn't cover map */}
              <div className="bg-black/80 backdrop-blur-md rounded-2xl p-3 sm:p-4 md:p-5 border border-white/20 shadow-2xl">
              <div className="flex items-center space-x-1 mb-2 md:mb-3">
                <Volume2 className="h-5 w-5 md:h-6 md:w-6 text-electric-500 animate-pulse-glow" />
                <span className="text-electric-400 font-semibold text-xs sm:text-sm">TURN IT UP LOUD</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 md:mb-3 leading-tight">
                Car Audio 
                <span className="text-electric-400"> 
                  Competition
                </span>
                <br />Events
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-300 mb-3 md:mb-4 leading-relaxed">
                Connect with the car audio community. Find competitions, track your scores, 
                showcase your system, and compete with the best sound enthusiasts worldwide.
              </p>
              <div className="flex space-x-2">
                <Link to="/register" className="flex-1 bg-electric-500 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-electric-600 transition-all duration-200 shadow-lg flex items-center justify-center">Join</Link>
                <Link to="/events" className="flex-1 bg-white/10 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-white/20 transition-all duration-200 border border-white/20 flex items-center justify-center">Events</Link>
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-electric-500 rounded-full mb-4">
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
                <div className="text-3xl font-black text-white mb-2">{stat.value}</div>
                <div className="text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Zap className="h-6 w-6 text-electric-500" />
              <span className="text-electric-400 font-semibold">UPCOMING EVENTS</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
              Featured <span className="text-electric-400">Competitions</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Don't miss these high-energy competitions featuring the loudest and most refined car audio systems
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-700/50 animate-pulse">
                  <div className="w-full h-48 bg-gray-700"></div>
                  <div className="p-6">
                    <div className="h-6 bg-gray-700 rounded mb-3"></div>
                    <div className="h-4 bg-gray-700 rounded mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded mb-4"></div>
                    <div className="h-4 bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredEvents.map((event, index) => (
                <div 
                  key={event.id} 
                  className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl hover:shadow-electric-500/10 transition-all duration-300 hover:scale-105 animate-slide-up border border-gray-700/50"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="relative">
                    <img 
                      src={event.image_url || getDefaultEventImage(event.category)} 
                      alt={event.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = getDefaultEventImage(event.category);
                      }}
                    />
                    <div className="absolute top-4 left-4 bg-electric-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      {event.category || 'Competition'}
                    </div>
                    {event.current_participants && (
                      <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                        <Users className="h-3 w-3" />
                        <span>{event.current_participants}</span>
                        {event.max_participants && (
                          <span>/{event.max_participants}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-3 leading-tight">
                      {event.title}
                    </h3>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-400 text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-electric-500" />
                        {formatEventDate(event.start_date, event.end_date)}
                      </div>
                      <div className="flex items-center text-gray-400 text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-electric-500" />
                        {event.city}, {event.state}
                      </div>
                    </div>
                    <Link 
                      to={`/events/${event.id}`}
                      className="inline-flex items-center space-x-2 text-electric-400 hover:text-electric-300 font-semibold transition-colors duration-200"
                    >
                      <span>View Details</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link 
              to="/events"
              className="inline-flex items-center space-x-2 bg-electric-500 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-electric-600 transition-all duration-200 shadow-lg"
            >
              <span>View All Events</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-electric-500/10 to-accent-500/10 border-y border-electric-500/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Star className="h-8 w-8 text-electric-500 animate-pulse-glow" />
            <span className="text-electric-400 font-semibold text-lg">JOIN THE COMMUNITY</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
            Ready to <span className="text-electric-400">Compete</span>?
          </h2>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Create your competitor profile, showcase your sound system, and start tracking your competition scores today.
          </p>
          <Link 
            to="/register"
            className="inline-flex items-center space-x-2 bg-electric-500 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-electric-600 transition-all duration-200 shadow-lg"
          >
            <span>Get Started Now</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}