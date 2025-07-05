import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Star, Clock, DollarSign, Trophy, ArrowLeft, Heart, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PaymentForm from '../components/PaymentForm';
import { supabase } from '../lib/supabase';

export default function EventDetails() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEventDetails();
  }, [id]);

  const loadEventDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Try to fetch using the edge function first
      try {
        // Get Supabase URL from environment or use hardcoded value for production
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mpewqdnoyuutexadhljd.supabase.co';
        
        const response = await fetch(`${supabaseUrl}/functions/v1/get-event-data?id=${id}`, {
          headers: {
            'Authorization': user ? `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` : '',
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setEvent(data.event);
          setIsRegistered(data.event.is_registered);
          setLoading(false);
          return;
        }
      } catch (edgeFunctionError) {
        console.warn('Edge function failed, falling back to direct query:', edgeFunctionError);
      }

      // Fallback to direct Supabase query
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

      if (eventError) throw eventError;

      // Get event images
      const { data: imagesData } = await supabase
        .from('event_images')
        .select('*')
        .eq('event_id', id)
        .order('is_primary', { ascending: false });

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
        image: imagesData?.find(img => img.is_primary)?.image_url || 
               imagesData?.[0]?.image_url || 
               "https://images.pexels.com/photos/1127000/pexels-photo-1127000.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&dpr=2",
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
        sponsors: Array.isArray(eventData.sponsors) ? eventData.sponsors : []
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
              <img 
                src={event.image} 
                alt={event.title}
                className="w-full h-64 md:h-80 object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">About This Event</h2>
              <p className="text-gray-300 leading-relaxed">{event.description}</p>
            </div>

            {/* Schedule */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Event Schedule</h2>
              {event.schedule && event.schedule.length > 0 ? (
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
              ) : (
                <p className="text-gray-400">No schedule information available for this event.</p>
              )}
            </div>

            {/* Prizes */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Prizes & Awards</h2>
              {event.prizes && event.prizes.length > 0 ? (
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
              ) : (
                <p className="text-gray-400">No prize information available for this event.</p>
              )}
            </div>

            {/* Sponsors */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Event Sponsors</h2>
              {event.sponsors && event.sponsors.length > 0 ? (
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
              ) : (
                <p className="text-gray-400">No sponsor information available for this event.</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Registration Card */}
            {showPayment ? (
              <PaymentForm
                amount={event.registrationFee}
                planName="Event Registration"
                description={`Registration for ${event.title}`}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                metadata={{
                  event_id: event.id,
                  event_title: event.title
                }}
              />
            ) : (
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl p-6 sticky top-8">
                <div className="text-center mb-6">
                  <div className="text-3xl font-black text-white mb-2">
                    ${typeof event.registrationFee === 'number' ? event.registrationFee.toFixed(2) : event.registration_fee.toFixed(2)}
                  </div>
                  <div className="text-gray-400">Registration Fee</div>
                </div>

                <div className="space-y-4">
                  {isAuthenticated ? (
                    <>
                      <button
                        onClick={handleRegister}
                        className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 ${
                          isRegistered
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-electric-500 text-white hover:bg-electric-600 shadow-lg'
                        }`}
                      >
                        {isRegistered ? 'Registered ✓' : 'Register Now'}
                      </button>
                      
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
                          <span>{isFavorited ? 'Saved' : 'Save'}</span>
                        </button>
                        <button className="flex items-center justify-center space-x-2 py-2 px-4 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-all duration-200">
                          <Share2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <Link
                        to="/login"
                        className="block w-full py-3 bg-electric-500 text-white rounded-lg font-bold text-lg text-center hover:bg-electric-600 transition-all duration-200 shadow-lg"
                      >
                        Login to Register
                      </Link>
                      <p className="text-gray-400 text-sm text-center">
                        New to Car Audio Events? <Link to="/register" className="text-electric-400 hover:text-electric-300">Create an account</Link>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Event Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Event Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-gray-400 text-sm">Venue</div>
                  <div className="text-white font-medium">{event.venue_name || event.venue}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Organizer</div>
                  <div className="text-white font-medium">{event.organizer.name}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Contact</div>
                  <div className="text-electric-400 font-medium">{event.organizer.phone}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm">Registration Status</div>
                  <div className="text-green-400 font-medium">
                    {new Date(event.registration_deadline) > new Date() ? 'Open' : 'Closed'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}