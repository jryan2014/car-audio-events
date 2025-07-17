import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Star, Clock, DollarSign, Trophy, ArrowLeft, Heart, Share2, Phone, Globe, Mail, X, ZoomIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PaymentForm from '../components/PaymentForm';
import EventLocationMap from '../components/EventLocationMap';
import { supabase } from '../lib/supabase';
import { memoryManager } from '../utils/memoryManager';
import { MemoryTestComponent } from '../components/MemoryTestComponent';

const EventDetails = React.memo(function EventDetails() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [showMemoryTest, setShowMemoryTest] = useState(false);
  
  // Use memory manager for better resource cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper function to get class color based on type
  const getClassColor = (className: string) => {
    const classLower = className.toLowerCase();
    
    // SPL classes - red variants
    if (classLower.includes('spl') || classLower.includes('sound pressure')) {
      return 'bg-red-500';
    }
    
    // Sound Quality classes - green variants  
    if (classLower.includes('sq') || classLower.includes('sound quality')) {
      return 'bg-green-500';
    }
    
    // Installation classes - green variants
    if (classLower.includes('install') || classLower.includes('installation')) {
      return 'bg-green-700';
    }
    
    // RTA classes - green variants
    if (classLower.includes('rta') || classLower.includes('real time')) {
      return 'bg-green-800';
    }
    
    // Show classes - gray variants
    if (classLower.includes('show') || classLower.includes('shine') || classLower.includes('light')) {
      return 'bg-gray-600';
    }
    
    // Bass Race - purple
    if (classLower.includes('bass') || classLower.includes('race')) {
      return 'bg-purple-500';
    }
    
    // Default - blue
    return 'bg-blue-500';
  };



  useEffect(() => {
    const abortController = new AbortController();
    
    const loadEventDetailsWithCleanup = async () => {
      try {
        await loadEventDetails();
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Error loading event details:', error);
        }
      }
    };
    
    loadEventDetailsWithCleanup();
    
    return () => {
      abortController.abort();
      // Clear state on unmount to prevent memory leaks
      setEvent(null);
      setIsRegistered(false);
      setIsFavorited(false);
      setShowPayment(false);
      setError(null);
      setShowDebug(false);
    };
  }, [id]);

  const loadEventDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Skip edge function for now due to CORS issues
      console.log('📱 Using direct database query for event details (edge function disabled)');
      
      // NOTE: Edge function disabled due to CORS configuration issues
      // TODO: Re-enable when edge function CORS is properly configured

      // Fallback to direct Supabase query
      console.log('🔍 Fetching event data for ID:', id, 'at', new Date().toISOString());
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          event_categories(*),
          organizations(*),
          users!organizer_id(name, email, phone)
        `)
        .eq('id', id)
        .single();

      console.log('📊 Raw event data received:', {
        id: eventData?.id,
        title: eventData?.title,
        latitude: eventData?.latitude,
        longitude: eventData?.longitude,
        timestamp: new Date().toISOString()
      });

      if (eventError) throw eventError;

      // NOTE: event_images table doesn't exist yet, using default image
      const imagesData: any[] = [];

      // Check if user is registered
      if (user) {
        const { data: registrationData } = await supabase
          .from('event_registrations')
          .select('id, payment_status')
          .eq('event_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        setIsRegistered(!!registrationData);
      }

      // Format the event data
      const formattedEvent = {
        ...eventData,
        category: eventData.event_categories?.name || 'Event',
        category_color: eventData.event_categories?.color || '#0ea5e9',
        image: eventData.image_url || 
               "https://images.pexels.com/photos/1127000/pexels-photo-1127000.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&dpr=2",
        imagePosition: eventData.image_position || 50,
        images: imagesData || [],
        featured: eventData.is_featured,
        date: `${new Date(eventData.start_date).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric' 
        })} - ${new Date(eventData.end_date).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })}`,
        location: `${eventData.city}, ${eventData.state}`,
        venue: eventData.venue_name,
        participants: eventData.current_participants,
        maxParticipants: eventData.max_participants,
        registrationFee: eventData.registration_fee,
        description: eventData.description,
        schedule: Array.isArray(eventData.schedule) ? eventData.schedule : [],
        prizes: Array.isArray(eventData.prizes) ? eventData.prizes : [],
        organizer: {
          name: eventData.users?.name || eventData.organizations?.name || 'Unknown',
          website: eventData.website || eventData.organizations?.website || '#',
          phone: eventData.contact_phone || eventData.users?.phone || '+1 (555) 123-4567'
        },
        eventDirector: {
          name: `${eventData.event_director_first_name || ''} ${eventData.event_director_last_name || ''}`.trim() || 'Unknown',
          email: eventData.event_director_email || '',
          phone: eventData.event_director_phone || ''
        },
        sponsors: Array.isArray(eventData.sponsors) ? eventData.sponsors : [],
        // Add organization data for competition classes
        organization: eventData.organizations || null,
        competitionClasses: eventData.organizations?.competition_classes || []
      };

      setEvent(formattedEvent);
    } catch (error) {
      console.error('Error loading event details:', error);
      setError('Failed to load event details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    if (!isAuthenticated) {
      // Redirect to login
      return;
    }
    
    if (isRegistered) {
      setIsRegistered(false);
    } else {
      setShowPayment(true);
    }
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      return;
    }
    setIsFavorited(!isFavorited);
  };

  const handleShare = async (platform: string) => {
    const eventUrl = window.location.href;
    const eventTitle = event?.title || 'Check out this event';
    const eventDescription = event?.description || '';

    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(eventTitle)}&url=${encodeURIComponent(eventUrl)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(eventTitle + ' ' + eventUrl)}`, '_blank');
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(eventUrl);
          alert('Event link copied to clipboard!');
        } catch (err) {
          console.error('Failed to copy:', err);
        }
        break;
    }
  };

  const handlePaymentSuccess = (paymentIntentId: string, userInfo?: any) => {
    setIsRegistered(true);
    setShowPayment(false);
    // Here you would typically save the registration to your database
    console.log('Registration payment successful:', paymentIntentId, userInfo);
  };

  const handlePaymentError = (error: string) => {
    console.error('Registration payment failed:', error);
    setShowPayment(false);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            to="/events"
            className="inline-flex items-center space-x-2 text-electric-400 hover:text-electric-300 font-semibold mb-8 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Events</span>
          </Link>
          
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Error Loading Event</h2>
            <p className="text-gray-300 mb-6">{error || 'Event not found or has been removed.'}</p>
            <Link 
              to="/events"
              className="bg-electric-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200"
            >
              Browse Other Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link 
          to="/events"
          className="inline-flex items-center space-x-2 text-electric-400 hover:text-electric-300 font-semibold mb-8 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Events</span>
        </Link>

        {/* Event Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl overflow-hidden mb-8 border border-gray-700/50">
          <div className="relative">
            {event.image && (
              <div 
                className="relative cursor-pointer group"
                onClick={() => setShowLightbox(true)}
              >
                <img 
                  src={event.image} 
                  alt={event.title}
                  className="w-full h-64 md:h-80 object-cover transition-transform group-hover:scale-105"
                  style={{
                    objectPosition: `center ${event.imagePosition}%`
                  }}
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-12 w-12 text-white" />
                </div>
              </div>
            )}
            {/* Mobile: Simple header without overlay text */}
            <div className="md:hidden p-6 bg-gray-900">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {event.featured && (
                  <div className="bg-electric-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                    <Star className="h-3 w-3" />
                    <span>Featured</span>
                  </div>
                )}
                <div className="bg-gray-700 text-white px-2 py-1 rounded-full text-xs font-medium">
                  {event.category}
                </div>
              </div>
              <h1 className="text-2xl font-black text-white mb-3 leading-tight">
                {event.title}
              </h1>
            </div>
            
            {/* Desktop: Original overlay design */}
            <div className="hidden md:block">
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {event.featured && (
                    <div className="bg-electric-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center space-x-1">
                      <Star className="h-3 w-3" />
                      <span>Featured Event</span>
                    </div>
                  )}
                  <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                    {event.category}
                  </div>
                  {event.registration_deadline && (
                    <div className="bg-yellow-500/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Register by {new Date(event.registration_deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <h1 className="text-3xl lg:text-5xl font-black text-white mb-4 leading-tight">
                  {event.title}
                </h1>
                <div className="flex flex-wrap items-center gap-6 text-gray-300">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-electric-500" />
                    <span className="font-medium">{event.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-electric-500" />
                    <span className="font-medium">{event.location}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-electric-500" />
                    <span className="font-medium">
                      {event.participants}
                      {event.maxParticipants ? `/${event.maxParticipants}` : ''} Registered
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Event Info Bar */}
        <div className="md:hidden bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-electric-500" />
              <span className="text-gray-300">{event.date}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-electric-500" />
              <span className="text-gray-300">{event.location}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-electric-500" />
              <span className="text-gray-300">
                {event.participants}
                {event.maxParticipants ? `/${event.maxParticipants}` : ''} Registered
              </span>
            </div>
            {event.registration_deadline && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-gray-300">Reg by {new Date(event.registration_deadline).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">About This Event</h2>
              <p className="text-gray-300 leading-relaxed">{event.description}</p>
            </div>

            {/* Events Offered */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Events Offered</h2>
              
              {event.organization?.name && (
                <div className="mb-6 flex items-center space-x-4 p-4 bg-gray-700/30 rounded-lg">
                  {event.organization.logo_url && (
                    <img
                      src={event.organization.logo_url}
                      alt={event.organization.name}
                      className="w-16 h-16 object-contain bg-white/10 rounded-lg p-2"
                    />
                  )}
                  <div>
                    <span className="text-gray-400 text-sm">Sanctioned by</span>
                    <div className="text-electric-400 font-semibold text-lg">{event.organization.name}</div>
                    {event.organization.website && (
                      <a 
                        href={event.organization.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-electric-300 text-sm hover:text-electric-200"
                      >
                        Visit Organization Website
                      </a>
                    )}
                  </div>
                </div>
              )}

              {event.competitionClasses && event.competitionClasses.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {event.competitionClasses.map((className, index) => (
                    <span
                      key={index}
                      className={`${getClassColor(className)} text-white px-3 py-2 rounded-lg text-sm font-semibold`}
                    >
                      {className}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400">
                  <p>Competition classes will be announced closer to the event date.</p>
                  {!event.organization && (
                    <p className="text-sm mt-2">This event is not currently sanctioned by a specific organization.</p>
                  )}
                </div>
              )}
            </div>

            {/* Additional Information */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Additional Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Event Director</h3>
                  <p className="text-gray-300 font-medium">{event.eventDirector?.name || 'Jason Antis'}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Event Contact</h3>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-electric-500" />
                    <span className="text-red-400 font-medium border border-red-400 px-2 py-1 rounded">
                      {event.eventDirector?.phone || event.contact_phone || '(614)345-8640'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Location Map */}
            {event.latitude && event.longitude && (
              <div>
                {/* Admin Debug Toggle */}
                {user?.membershipType === 'admin' && (
                  <div className="mb-4 flex justify-end">
                    <button
                      onClick={() => setShowDebug(!showDebug)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        showDebug 
                          ? 'bg-red-500/30 text-red-200 border border-red-500/50' 
                          : 'bg-gray-600/30 text-gray-300 border border-gray-600/50'
                      }`}
                    >
                      {showDebug ? '🐛 Hide Debug' : '🔧 Show Debug'}
                    </button>
                  </div>
                )}

                {/* Debug info - Admin only, toggleable */}
                {showDebug && user?.membershipType === 'admin' && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-red-200 font-semibold text-sm">🐛 DEBUG INFO (Event ID: {event.id})</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            console.log('🔄 Force refreshing event data...');
                            loadEventDetails();
                          }}
                          className="bg-red-500/30 hover:bg-red-500/50 text-red-200 px-2 py-1 rounded text-xs font-medium"
                        >
                          Refresh Data
                        </button>
                        <button
                          onClick={() => {
                            const info = memoryManager.getMemoryInfo();
                            setMemoryInfo(info);
                            console.log('🧠 Memory info:', info);
                          }}
                          className="bg-purple-500/30 hover:bg-purple-500/50 text-purple-200 px-2 py-1 rounded text-xs font-medium"
                        >
                          Memory Info
                        </button>
                        <button
                          onClick={() => {
                            memoryManager.forceGarbageCollection();
                            console.log('🗑️ Forced garbage collection');
                            setTimeout(() => setMemoryInfo(memoryManager.getMemoryInfo()), 1000);
                          }}
                          className="bg-green-500/30 hover:bg-green-500/50 text-green-200 px-2 py-1 rounded text-xs font-medium"
                        >
                          Force GC
                        </button>
                        <button
                          onClick={() => {
                            console.log('🗺️ Force reloading page to clear all caches...');
                            window.location.reload();
                          }}
                          className="bg-blue-500/30 hover:bg-blue-500/50 text-blue-200 px-2 py-1 rounded text-xs font-medium"
                        >
                          Reload Page
                        </button>
                        <button
                          onClick={() => setShowMemoryTest(true)}
                          className="bg-yellow-500/30 hover:bg-yellow-500/50 text-yellow-200 px-2 py-1 rounded text-xs font-medium"
                        >
                          Memory Test
                        </button>
                      </div>
                    </div>
                    <div className="text-red-100 text-xs space-y-1">
                      <div>Raw DB Latitude: {event.latitude}</div>
                      <div>Raw DB Longitude: {event.longitude}</div>
                      <div>Parsed Latitude: {parseFloat(event.latitude)}</div>
                      <div>Parsed Longitude: {parseFloat(event.longitude)}</div>
                      <div>Expected: 40.72081, -88.02913 (correct location from screenshot)</div>
                      <div>Match: {Math.abs(parseFloat(event.latitude) - 40.72081) < 0.00001 && Math.abs(parseFloat(event.longitude) - (-88.02913)) < 0.00001 ? '✅ YES' : '❌ NO'}</div>
                      <div>Data Loaded At: {new Date().toLocaleTimeString()}</div>
                      
                      {/* Memory Information */}
                      {memoryInfo && (
                        <div className="mt-3 p-2 bg-purple-500/20 border border-purple-500/30 rounded">
                          <div className="text-purple-200 font-semibold text-xs mb-1">🧠 Memory Usage:</div>
                          {memoryInfo.used && (
                            <>
                              <div>Used: {(memoryInfo.used / 1024 / 1024).toFixed(1)} MB</div>
                              <div>Total: {(memoryInfo.total / 1024 / 1024).toFixed(1)} MB</div>
                              <div>Usage: {memoryInfo.percentage.toFixed(1)}%</div>
                            </>
                          )}
                          <div>Checked: {new Date(memoryInfo.timestamp).toLocaleTimeString()}</div>
                        </div>
                      )}
                      
                      <div className="mt-2">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-300 hover:text-blue-200 underline text-xs"
                        >
                          🗺️ Test Coordinates in New Google Maps Tab ↗
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                <EventLocationMap
                  key={`map-${event.id}-${event.latitude}-${event.longitude}`} // Force re-render on coordinate change
                  latitude={parseFloat(event.latitude)}
                  longitude={parseFloat(event.longitude)}
                  eventName={event.title}
                  address={event.address || ''}
                  city={event.city || ''}
                  state={event.state || ''}
                  country={event.country || 'US'}
                  className="w-full"
                />
              </div>
            )}

            {/* Schedule - Only show if there are schedule items */}
            {event.schedule && event.schedule.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Event Schedule</h2>
                <div className="space-y-4">
                  {event.schedule.map((item: any, index: number) => (
                    <div key={index} className="flex items-center space-x-4 p-4 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center justify-center w-12 h-12 bg-electric-500 rounded-full text-white font-bold text-sm">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-electric-400">{item.time}</div>
                        <div className="text-white">{item.activity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prizes - Only show if there are prizes */}
            {event.prizes && event.prizes.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Prizes & Awards</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {event.prizes.map((prize: any, index: number) => (
                    <div key={index} className="flex items-center space-x-4 p-4 bg-gray-700/30 rounded-lg">
                      <div className="flex items-center justify-center w-12 h-12 bg-electric-500 rounded-full text-white">
                        <Trophy className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="font-semibold text-accent-400">{prize.place}</div>
                        <div className="text-white">{prize.prize}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sponsors - Only show if there are sponsors */}
            {event.sponsors && event.sponsors.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Event Sponsors</h2>
                <div className="flex flex-wrap gap-4">
                  {event.sponsors.map((sponsor: any, index: number) => (
                    <div key={index} className="flex flex-col items-center space-y-2">
                      <div className="flex items-center justify-center w-16 h-16 bg-gray-700 rounded-lg text-white font-bold text-lg border border-gray-600">
                        {typeof sponsor === 'string' 
                          ? sponsor.substring(0, 2).toUpperCase()
                          : sponsor.logo || (sponsor.name ? sponsor.name.substring(0, 2).toUpperCase() : 'SP')}
                      </div>
                      <span className="text-sm text-gray-300">
                        {typeof sponsor === 'string' ? sponsor : sponsor.name || 'Sponsor'}
                      </span>
                      {typeof sponsor !== 'string' && sponsor.level && (
                        <span className="text-xs text-gray-400">{sponsor.level}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration/Save Card */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl p-6 sticky top-6">
              {/* Show registration fee only if event has pre-registration and fee > 0 */}
              {event.registration_deadline && 
               new Date(event.registration_deadline) > new Date() &&
               event.registrationFee > 0 && (
                <div className="text-center mb-6">
                  <div className="text-3xl font-black text-white mb-2">
                    ${typeof event.registrationFee === 'number' ? event.registrationFee.toFixed(2) : '0.00'}
                  </div>
                  <div className="text-gray-400">Pre-Registration Fee</div>
                </div>
              )}

              <div className="space-y-4">
                {isAuthenticated ? (
                  <>
                    {/* Show Register button only if registration deadline exists and hasn't passed */}
                    {event.registration_deadline && 
                     new Date(event.registration_deadline) > new Date() &&
                     (!event.maxParticipants || event.participants < event.maxParticipants) && (
                      <button
                        onClick={handleRegister}
                        className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 ${
                          isRegistered
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-electric-500 text-white hover:bg-electric-600 shadow-lg'
                        }`}
                      >
                        {isRegistered ? 'Registered ✓' : event.registrationFee > 0 ? 'Pre-Register Now' : 'Register Now'}
                      </button>
                    )}
                    
                    {/* Save and Share buttons */}
                    <div className="flex space-x-2">
                      <button
                        onClick={handleFavorite}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                          isFavorited
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                        <span>{isFavorited ? 'Saved' : 'Save Event'}</span>
                      </button>
                      <div className="relative group">
                        <button className="flex items-center justify-center space-x-2 py-2 px-4 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-all duration-200">
                          <Share2 className="h-4 w-4" />
                          <span>Share</span>
                        </button>
                        {/* Share dropdown */}
                        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                          <button
                            onClick={() => handleShare('facebook')}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          >
                            <span>Facebook</span>
                          </button>
                          <button
                            onClick={() => handleShare('twitter')}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          >
                            <span>Twitter</span>
                          </button>
                          <button
                            onClick={() => handleShare('linkedin')}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          >
                            <span>LinkedIn</span>
                          </button>
                          <button
                            onClick={() => handleShare('whatsapp')}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          >
                            <span>WhatsApp</span>
                          </button>
                          <div className="border-t border-gray-700"></div>
                          <button
                            onClick={() => handleShare('copy')}
                            className="flex items-center space-x-3 w-full px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                          >
                            <span>Copy Link</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <Link
                      to="/login"
                      className="block w-full py-3 bg-electric-500 text-white rounded-lg font-bold text-lg text-center hover:bg-electric-600 transition-all duration-200 shadow-lg"
                    >
                      Login to Save Event
                    </Link>
                    <p className="text-gray-400 text-sm text-center">
                      Members can save events to their favorites and get notifications
                    </p>
                    <p className="text-gray-400 text-sm text-center">
                      New to Car Audio Events? <Link to="/register" className="text-electric-400 hover:text-electric-300">Create an account</Link>
                    </p>
                  </div>
                )}
              </div>
            </div>


            {/* Event Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Event Details</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-gray-400 text-sm">Venue</div>
                  <div className="text-white font-medium">{event.venue_name || event.venue}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Full Address</div>
                  <div className="text-white font-medium">{event.address}</div>
                  <div className="text-gray-300 text-sm">{event.city}, {event.state} {event.zip_code}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Event Dates</div>
                  <div className="text-white font-medium">
                    {new Date(event.start_date).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  {event.start_date !== event.end_date && (
                    <div className="text-gray-300 text-sm">
                      Ends: {new Date(event.end_date).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Event Director</div>
                  <div className="text-white font-medium">{event.eventDirector.name}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Contact</div>
                  <div className="text-electric-400 font-medium">{event.eventDirector.phone}</div>
                  {event.eventDirector.email && (
                    <div className="text-electric-400 text-sm">{event.eventDirector.email}</div>
                  )}
                  {event.website && (
                    <a 
                      href={event.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-electric-300 text-sm hover:text-electric-200 block"
                    >
                      Event Website
                    </a>
                  )}
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Registration</div>
                  <div className={`font-medium ${
                    event.registration_deadline && new Date(event.registration_deadline) > new Date() 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {event.registration_deadline && new Date(event.registration_deadline) > new Date() ? 'Open' : 'Closed'}
                  </div>
                  {event.registration_deadline && (
                    <div className="text-gray-300 text-sm">
                      Deadline: {new Date(event.registration_deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Participants</div>
                  <div className="text-white font-medium">
                    {event.participants || 0} registered
                    {event.maxParticipants && ` (${event.maxParticipants} max)`}
                  </div>
                </div>
                {event.organization?.name && (
                  <div>
                    <div className="text-gray-400 text-sm">Sanctioning Body</div>
                    <div className="text-electric-400 font-medium">{event.organization.name}</div>
                  </div>
                )}
                {(event.season_year || event.metadata?.season_year) && (
                  <div>
                    <div className="text-gray-400 text-sm">Competition Season</div>
                    <div className="text-white font-medium">{event.season_year || event.metadata?.season_year}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Flier Section */}
      {event.image && event.image !== "https://images.pexels.com/photos/1127000/pexels-photo-1127000.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&dpr=2" && (
        <div className="mt-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Event Flier</h3>
            <div 
              className="inline-block cursor-pointer group"
              onClick={() => setShowLightbox(true)}
            >
              <img 
                src={event.image} 
                alt={`${event.title} flier`}
                className="w-full max-w-md h-auto rounded-lg shadow-lg transition-transform group-hover:scale-105"
              />
              <p className="text-sm text-gray-400 mt-2 text-center">Click to view full size</p>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {showLightbox && event.image && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <img 
              src={event.image} 
              alt={event.title}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Memory Test Modal */}
      {showMemoryTest && (
        <MemoryTestComponent onClose={() => setShowMemoryTest(false)} />
      )}
    </div>
  );
});

export default EventDetails;