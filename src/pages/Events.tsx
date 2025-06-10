import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Search, Filter, Star, ArrowRight, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Events() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [locationSearch, setLocationSearch] = useState('');
  const [radiusSearch, setRadiusSearch] = useState('50');
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(['all']);
  const [locations, setLocations] = useState<string[]>(['all']);
  const [countries, setCountries] = useState<string[]>(['all', 'United States', 'Canada']);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
    loadCategories();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch events with their primary images and categories
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          start_date,
          end_date,
          city,
          state,
          country,
          current_participants,
          max_participants,
          is_featured,
          event_categories(name, color)
        `)
        .eq('status', 'published') // Only show published events
        .eq('is_public', true)
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (eventsError) throw eventsError;

      // Fetch event images separately
      const { data: imagesData, error: imagesError } = await supabase
        .from('event_images')
        .select('event_id, image_url, is_primary')
        .in('event_id', eventsData.map(event => event.id))
        .order('is_primary', { ascending: false });

      if (imagesError) throw imagesError;

      // Combine events with their images
      const formattedEvents = eventsData.map(event => {
        const eventImages = imagesData.filter(img => img.event_id === event.id);
        const primaryImage = eventImages.find(img => img.is_primary)?.image_url || 
                            eventImages[0]?.image_url || 
                            "https://images.pexels.com/photos/1127000/pexels-photo-1127000.jpeg?auto=compress&cs=tinysrgb&w=600&h=300&dpr=2";
        
        // Build a list of unique locations
        const locationString = `${event.city}, ${event.state}`;
        if (!locations.includes(locationString)) {
          setLocations(prev => [...prev, locationString]);
        }
        
        // Build a list of unique countries
        if (event.country && !countries.includes(event.country)) {
          setCountries(prev => [...prev, event.country]);
        }
        
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          date: `${new Date(event.start_date).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric' 
          })} - ${new Date(event.end_date).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
          })}`,
          location: `${event.city}, ${event.state}`,
          category: event.event_categories?.name || 'Event',
          category_color: event.event_categories?.color || '#0ea5e9',
          participants: event.current_participants || 0,
          max_participants: event.max_participants,
          image: primaryImage,
          featured: event.is_featured,
          start_date: event.start_date,
          end_date: event.end_date,
          city: event.city,
          state: event.state,
          country: event.country
        };
      });

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load events. Please try again later.');
      
      // Use mock data as fallback in development
      if (import.meta.env.DEV) {
        setEvents([
          {
            id: '1',
            title: "IASCA World Finals 2025",
            date: "March 15-17, 2025",
            location: "Orlando, FL",
            category: "Championship",
            participants: 150,
            image: "https://images.pexels.com/photos/1127000/pexels-photo-1127000.jpeg?auto=compress&cs=tinysrgb&w=600&h=300&dpr=2",
            featured: true,
            description: "The ultimate car audio championship featuring the world's best competitors."
          },
          {
            id: '2',
            title: "dB Drag National Event",
            date: "April 22-24, 2025",
            location: "Phoenix, AZ",
            category: "SPL Competition",
            participants: 89,
            image: "https://images.pexels.com/photos/1644888/pexels-photo-1644888.jpeg?auto=compress&cs=tinysrgb&w=600&h=300&dpr=2",
            featured: false,
            description: "Pure loudness competition - see who can hit the highest decibel levels."
          }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('event_categories')
        .select('name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const categoryNames = ['all', ...data.map((cat: any) => cat.name)];
      setCategories(categoryNames);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Keep the default categories
    }
  };

  const radiusOptions = ['25', '50', '100', '250', '500'];

  // Check if user can create events
  const canCreateEvents = user && (
    user.membershipType === 'admin' ||
    user.membershipType === 'organization' ||
    (user.membershipType === 'retailer' && user.subscriptionPlan !== 'free') ||
    (user.membershipType === 'manufacturer' && user.subscriptionPlan !== 'free')
  );

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || event.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesLocation = selectedLocation === 'all' || event.location === selectedLocation;
    const matchesCountry = selectedCountry === 'all' || event.country === selectedCountry;
    
    return matchesSearch && matchesCategory && matchesLocation && matchesCountry;
  });

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
          <h1 className="text-4xl lg:text-5xl font-black text-white mb-6">
            Car Audio <span className="text-electric-400">Events</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Discover competitions, exhibitions, and gatherings in the car audio community
          </p>
            </div>
            {canCreateEvents && (
              <Link
                to="/create-event"
                className="bg-electric-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200 shadow-lg flex items-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Create Event</span>
              </Link>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 transition-colors"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                {categories.map(category => (
                  <option key={category} value={category} className="bg-gray-800">
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>

            {/* State/Location Filter */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                {locations.map(location => (
                  <option key={location} value={location} className="bg-gray-800">
                    {location === 'all' ? 'All Locations' : location}
                  </option>
                ))}
              </select>
            </div>

            {/* Country Filter */}
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                {countries.map(country => (
                  <option key={country} value={country} className="bg-gray-800">
                    {country === 'all' ? 'All Countries' : country}
                  </option>
                ))}
              </select>
            </div>

            {/* Radius Search */}
            <div className="relative">
              <select
                value={radiusSearch}
                onChange={(e) => setRadiusSearch(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                {radiusOptions.map(radius => (
                  <option key={radius} value={radius} className="bg-gray-800">
                    {radius} miles
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Search */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={user?.location ? `Search within ${radiusSearch} miles of ${user.location}` : "Enter address to search by distance"}
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 transition-colors"
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex justify-between items-center">
          <p className="text-gray-400">
            Showing <span className="text-white font-semibold">{filteredEvents.length}</span> events
          </p>
          {error && (
            <p className="text-red-400 text-sm">
              {error}
            </p>
          )}
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event, index) => (
              <div 
                key={event.id}
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl hover:shadow-electric-500/10 transition-all duration-300 hover:scale-105 border border-gray-700/50 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative">
                  <img 
                    src={event.image} 
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                  {event.featured && (
                    <div className="absolute top-4 left-4 bg-gradient-to-r from-electric-500 to-accent-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
                      <Star className="h-3 w-3" />
                      <span>Featured</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                    {event.category}
                  </div>
                  <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                    <Users className="h-3 w-3" />
                    <span>{event.participants}{event.max_participants ? `/${event.max_participants}` : ''}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-3 leading-tight">
                    {event.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed line-clamp-2">
                    {event.description}
                  </p>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-gray-400 text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-electric-500" />
                      {event.date}
                    </div>
                    <div className="flex items-center text-gray-400 text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-electric-500" />
                      {event.location}
                    </div>
                  </div>
                  <Link 
                    to={`/events/${event.id}`}
                    className="inline-flex items-center space-x-2 bg-electric-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-electric-600 transition-all duration-200 text-sm"
                  >
                    <span>View Details</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No events found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            {canCreateEvents && (
              <Link
                to="/create-event"
                className="inline-block mt-4 bg-electric-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200"
              >
                Create the First Event
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}