import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Star, Clock, DollarSign, Trophy, ArrowLeft, Heart, Share2, Phone, Globe, Mail, X, ZoomIn, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import PaymentForm from '../components/PaymentForm';
import EventLocationMap from '../components/EventLocationMap';
import { supabase } from '../lib/supabase';
import { memoryManager } from '../utils/memoryManager';
import { parseLocalDate, formatTime12Hour } from '../utils/dateHelpers';
import { MemoryTestComponent } from '../components/MemoryTestComponent';
import SEO from '../components/SEO';
import * as ga from '../utils/googleAnalytics';

const EventDetails = React.memo(function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [isInterested, setIsInterested] = useState(false);
  const [interestCount, setInterestCount] = useState(0);
  
  // Use memory manager for better resource cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const shareDropdownRef = useRef<HTMLDivElement | null>(null);
  const shareButtonRef = useRef<HTMLButtonElement | null>(null);

  // Helper function to get or create session ID for interest tracking
  const getOrCreateSessionId = () => {
    let sessionId = localStorage.getItem('event_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('event_session_id', sessionId);
    }
    return sessionId;
  };

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

  // Handle click outside for share dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(event.target as Node) && 
          shareButtonRef.current && !shareButtonRef.current.contains(event.target as Node)) {
        setShowShareDropdown(false);
      }
    };

    const handleScroll = () => {
      // Close dropdown on scroll to prevent positioning issues
      setShowShareDropdown(false);
    };

    if (showShareDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [showShareDropdown]);

  const loadEventDetails = async () => {
    if (!id) return;
    
    // Safety check - don't try to load if the ID is "suggest"
    // This shouldn't happen with proper routing but protects against edge cases
    if (id === 'suggest') {
      console.warn('EventDetails received "suggest" as ID - routing may be misconfigured');
      setLoading(false);
      return;
    }
    
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
      console.log('🎯 Image position from DB:', eventData.image_position);
      console.log('📊 Full eventData:', eventData);
      const formattedEvent = {
        ...eventData,
        category: eventData.event_categories?.name || 'Event',
        category_color: eventData.event_categories?.color || '#0ea5e9',
        image: eventData.image_url || 
               "https://images.pexels.com/photos/1127000/pexels-photo-1127000.jpeg?auto=compress&cs=tinysrgb&w=1200&h=600&dpr=2",
        imagePosition: eventData.image_position !== null && eventData.image_position !== undefined ? eventData.image_position : 50,
        imagePositionX: eventData.image_position_x !== null && eventData.image_position_x !== undefined ? eventData.image_position_x : 50,
        imageZoom: eventData.image_zoom || 1,
        images: imagesData || [],
        featured: eventData.is_featured,
        date: (() => {
          const startDateStr = parseLocalDate(eventData.start_date).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric' 
          });
          const endDateStr = parseLocalDate(eventData.end_date).toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          });
          
          // Add time if available
          const startTime = eventData.start_date.includes('T') ? 
            ` ${formatTime12Hour(eventData.start_date.split('T')[1])}` : '';
          const endTime = eventData.end_date.includes('T') ? 
            ` ${formatTime12Hour(eventData.end_date.split('T')[1])}` : '';
          
          if (eventData.start_date === eventData.end_date) {
            return `${startDateStr}${startTime}`;
          }
          
          return `${startDateStr}${startTime} - ${endDateStr}${endTime}`;
        })(),
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
          website: eventData.website || eventData.organizations?.website || '',
          phone: eventData.contact_phone || eventData.users?.phone || ''
        },
        eventDirector: {
          name: `${eventData.event_director_first_name || ''} ${eventData.event_director_last_name || ''}`.trim() || 'Unknown',
          email: eventData.event_director_email || '',
          phone: eventData.event_director_phone || ''
        },
        sponsors: Array.isArray(eventData.sponsors) ? eventData.sponsors : [],
        // Add organization data for competition classes
        organization: eventData.organizations || null,
        competitionClasses: [], // Will be loaded separately
        allows_online_registration: eventData.allows_online_registration,
        external_registration_url: eventData.external_registration_url
      };

      // Load competition classes for this specific event
      const { data: competitionClasses, error: classesError } = await supabase
        .from('event_competition_classes')
        .select('competition_class')
        .eq('event_id', id);

      if (classesError) {
        console.error('Error loading competition classes:', classesError);
      }

      // Update event with competition classes
      formattedEvent.competitionClasses = competitionClasses?.map(item => item.competition_class) || [];

      console.log('🎨 Setting formatted event with imagePosition:', formattedEvent.imagePosition);
      setEvent(formattedEvent);
      
      // Track event view in our analytics table
      try {
        const sessionId = getOrCreateSessionId();
        await supabase.from('event_analytics').insert({
          event_id: parseInt(id),
          metric_type: 'view',
          user_id: user?.id || null,
          session_id: sessionId,
          user_agent: navigator.userAgent,
          referrer: document.referrer,
          metadata: {
            page_load_time: performance.now(),
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight
          }
        });
        console.log('📊 Event view tracked in analytics');
      } catch (analyticsError) {
        console.error('Failed to track event view:', analyticsError);
      }
      
      // Track event view in Google Analytics with enhanced parameters
      // Send the actual event name as part of the event action for better visibility
      const eventName = formattedEvent.title || formattedEvent.event_name || 'Unknown Event';
      
      // Track as a custom event with the event name in the action
      ga.event({
        action: `viewed_event_${eventName.replace(/\s+/g, '_').toLowerCase()}`,
        category: 'event_engagement',
        label: eventName,
        value: formattedEvent.id
      });
      
      // Also send a standard view_item event for e-commerce tracking
      if (window.gtag) {
        window.gtag('event', 'view_item', {
          currency: 'USD',
          value: formattedEvent.registration_fee || 0,
          items: [{
            item_id: String(formattedEvent.id),
            item_name: eventName,
            item_category: formattedEvent.category_name || 'General',
            item_category2: formattedEvent.sanctioning_body,
            item_category3: formattedEvent.state,
            item_category4: formattedEvent.city,
            price: formattedEvent.registration_fee || 0,
            quantity: 1
          }]
        });
      }
      
      // Track event category view with more detail
      if (formattedEvent.category_name) {
        ga.event({
          action: `view_category_${formattedEvent.category_name.toLowerCase()}`,
          category: 'event_categories',
          label: `${formattedEvent.category_name} - ${eventName}`
        });
      }
      
      // Check if user has saved this event
      if (user) {
        const { data: savedEvents, error: savedError } = await supabase
          .from('saved_events')
          .select('id')
          .eq('user_id', user.id)
          .eq('event_id', parseInt(id));
          
        if (!savedError && savedEvents && savedEvents.length > 0) {
          setIsFavorited(true);
        }
      }
      
      // Load interest count
      const { data: interestData, error: interestError } = await supabase
        .from('event_interest_counts')
        .select('interest_count')
        .eq('event_id', parseInt(id))
        .maybeSingle();
        
      if (!interestError && interestData) {
        setInterestCount(interestData.interest_count);
      } else {
        // If no record exists, the count is 0
        setInterestCount(0);
      }
      
      // Check if current user has expressed interest
      const sessionId = getOrCreateSessionId();
      const { data: userInterest } = await supabase
        .from('event_interests')
        .select('id')
        .eq('event_id', parseInt(id))
        .eq('session_id', sessionId);
        
      if (userInterest && userInterest.length > 0) {
        setIsInterested(true);
      }
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
      // Track registration intent in Google Analytics
      ga.event({
        action: 'registration_started',
        category: 'conversion',
        label: `${event?.title || event?.event_name} (ID: ${event?.id})`
      });
      setShowPayment(true);
    }
  };


  const handleInterest = async () => {
    try {
      const sessionId = getOrCreateSessionId();
      
      if (isInterested) {
        // Remove interest
        const { error } = await supabase
          .from('event_interests')
          .delete()
          .eq('event_id', parseInt(id))
          .eq('session_id', sessionId);
          
        if (error) throw error;
        setIsInterested(false);
        setInterestCount(Math.max(0, interestCount - 1));
      } else {
        // Add interest
        const { error } = await supabase
          .from('event_interests')
          .insert({
            event_id: parseInt(id),
            session_id: sessionId,
            user_id: user?.id || null,
            ip_address: null, // We don't track IP for privacy
            user_agent: navigator.userAgent
          });
          
        if (error) throw error;
        
        // Track interest in analytics
        await supabase.from('event_analytics').insert({
          event_id: parseInt(id),
          metric_type: 'interest',
          user_id: user?.id || null,
          session_id: sessionId,
          user_agent: navigator.userAgent,
          metadata: { action: 'added' }
        });
        
        setIsInterested(true);
        setInterestCount(interestCount + 1);
      }
    } catch (error) {
      console.error('Error toggling interest:', error);
    }
  };


  const handleFavorite = async () => {
    if (!isAuthenticated || !user) {
      return;
    }
    
    try {
      if (isFavorited) {
        // Track unfavorite action
        ga.event({
          action: 'unfavorite_event',
          category: 'engagement',
          label: `${event?.title || event?.event_name} (ID: ${event?.id})`
        });
        
        // Remove from saved events
        const { error } = await supabase
          .from('saved_events')
          .delete()
          .eq('user_id', user.id)
          .eq('event_id', parseInt(id));
          
        if (error) throw error;
        
        // Track unfavorite in analytics
        await supabase.from('event_analytics').insert({
          event_id: parseInt(id),
          metric_type: 'favorite',
          user_id: user?.id || null,
          session_id: getOrCreateSessionId(),
          user_agent: navigator.userAgent,
          metadata: { action: 'removed' }
        });
        
        setIsFavorited(false);
      } else {
        // Track favorite action
        ga.event({
          action: 'favorite_event',
          category: 'engagement',
          label: `${event?.title || event?.event_name} (ID: ${event?.id})`
        });
        
        // Add to saved events
        const { error } = await supabase
          .from('saved_events')
          .insert({
            user_id: user.id,
            event_id: parseInt(id)
          });
          
        if (error) throw error;
        
        // Track favorite in analytics
        await supabase.from('event_analytics').insert({
          event_id: parseInt(id),
          metric_type: 'favorite',
          user_id: user?.id || null,
          session_id: getOrCreateSessionId(),
          user_agent: navigator.userAgent,
          metadata: { action: 'added' }
        });
        
        setIsFavorited(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Failed to save event. Please try again.');
    }
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
    
    // Close dropdown after action
    setShowShareDropdown(false);
  };

  const handlePaymentSuccess = async (paymentIntentId: string, userInfo?: any) => {
    setIsRegistered(true);
    setShowPayment(false);
    
    // Track registration in analytics
    try {
      await supabase.from('event_analytics').insert({
        event_id: parseInt(id),
        metric_type: 'registration',
        user_id: user?.id || null,
        session_id: getOrCreateSessionId(),
        user_agent: navigator.userAgent,
        metadata: { 
          payment_intent_id: paymentIntentId,
          registration_fee: event?.registration_fee || 0
        }
      });
    } catch (error) {
      console.error('Failed to track registration:', error);
    }
    
    // Track successful payment and event registration
    const registrationFee = event?.registration_fee || 0;
    const eventName = event?.title || event?.event_name || 'Unknown Event';
    
    // Track payment completion
    ga.trackPaymentCompletion(registrationFee, 'stripe');
    
    // Track event registration
    ga.trackEventRegistration(eventName, event?.id);
    
    // Track as purchase event for e-commerce
    if (window.gtag) {
      window.gtag('event', 'purchase', {
        transaction_id: paymentIntentId,
        value: registrationFee,
        currency: 'USD',
        items: [{
          item_id: String(event?.id),
          item_name: eventName,
          item_category: 'Event Registration',
          item_category2: event?.category_name,
          price: registrationFee,
          quantity: 1
        }]
      });
    }
    
    console.log('Registration payment successful:', paymentIntentId, userInfo);
  };

  const handlePaymentError = (error: string) => {
    console.error('Registration payment failed:', error);
    setShowPayment(false);
  };
  
  // Special case: if ID is "suggest", render the suggest form component
  // This handles mobile routing issues where /events/suggest might be caught by /events/:id
  if (id === 'suggest') {
    const SuggestEventComponent = React.lazy(() => import('./SuggestEvent'));
    return (
      <React.Suspense fallback={
        <div className="min-h-screen py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
        </div>
      }>
        <SuggestEventComponent />
      </React.Suspense>
    );
  }

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

  // Enhanced keyword generation
  const generateKeywords = () => {
    const keywords = [];
    
    // Basic event keywords
    keywords.push(event.title);
    keywords.push(`${event.city} car audio event`);
    keywords.push(`${event.state} car audio competition`);
    
    // Competition format keywords
    if (event.competition_format) {
      const formatMap = {
        'spl': 'SPL competition, sound pressure level',
        'sq': 'SQ competition, sound quality',
        'spl_sq': 'SPL and SQ competition',
        'demo': 'demo competition, bass demo',
        'show_shine': 'show and shine, car show'
      };
      keywords.push(formatMap[event.competition_format] || event.competition_format);
    }
    
    // Sanctioning body keywords
    if (event.sanctioning_body) {
      keywords.push(`${event.sanctioning_body} event`);
      keywords.push(`${event.sanctioning_body} ${event.state}`);
    }
    
    // Competition class keywords
    if (event.competition_classes?.length) {
      event.competition_classes.forEach(cls => {
        keywords.push(`${cls} class`);
      });
    }
    
    // Event feature keywords
    if (event.event_features?.length) {
      const featureMap = {
        'vendor_booths': 'vendor expo, car audio vendors',
        'demo_vehicles': 'demo cars, show vehicles',
        'workshops': 'car audio workshops, installation clinic',
        'meet_greet': 'meet and greet',
        'dyno_testing': 'dyno test, SPL testing',
        'installation_demos': 'install demos, installation showcase'
      };
      
      event.event_features.forEach(feature => {
        keywords.push(featureMap[feature] || feature.replace('_', ' '));
      });
    }
    
    // Custom keywords if provided
    if (event.seo_keywords?.length) {
      keywords.push(...event.seo_keywords);
    }
    
    return keywords.join(', ');
  };

  // Create enhanced structured data for the event
  const eventStructuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.title,
    "description": event.description,
    "startDate": event.start_date,
    "endDate": event.end_date,
    "location": {
      "@type": "Place",
      "name": event.venue_name || "TBA",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": event.city,
        "addressRegion": event.state,
        "addressCountry": event.country || "USA"
      }
    },
    "organizer": {
      "@type": "Organization",
      "name": event.sanctioning_body || event.organizations?.name || "Car Audio Events"
    },
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "eventStatus": "https://schema.org/EventScheduled",
    "offers": {
      "@type": "Offer",
      "price": event.registration_fee || 0,
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
      "validFrom": new Date().toISOString()
    },
    "performer": {
      "@type": "Organization",
      "name": "Car Audio Competitors"
    },
    // Add competition-specific structured data
    ...(event.competition_format && {
      "additionalType": `https://schema.org/SportsEvent`,
      "sport": event.competition_format === 'spl' ? "Sound Pressure Level Competition" :
               event.competition_format === 'sq' ? "Sound Quality Competition" :
               "Car Audio Competition"
    }),
    ...(event.awards_prizes && {
      "award": event.awards_prizes
    })
  };

  return (
    <div className="min-h-screen py-8">
      <SEO 
        title={event.seo_title || `${event.title} - Car Audio Competition Event`}
        description={event.seo_description || `${event.title} in ${event.city}, ${event.state}. ${event.description?.substring(0, 150) || 'Join us for this exciting car audio competition event.'}`}
        keywords={generateKeywords()}
        url={`https://caraudioevents.com/events/${id}`}
        type="event"
        image={event.image || undefined}
        jsonLd={eventStructuredData}
      />
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
                className="relative cursor-pointer group h-64 md:h-80 overflow-hidden"
                onClick={() => setShowLightbox(true)}
              >
                {/* Mobile Image - Same positioning as desktop but scaled down */}
                <img 
                  src={event.image} 
                  alt={event.title}
                  className="md:hidden absolute inset-0 w-auto h-auto max-w-none max-h-none"
                  style={{
                    transform: `translate(${50 - event.imagePositionX}%, ${50 - event.imagePosition}%) scale(${event.imageZoom})`,
                    transformOrigin: 'center',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                  }}
                />
                {/* Desktop Image - Matches editor preview exactly */}
                <img 
                  src={event.image} 
                  alt={event.title}
                  className="hidden md:block absolute inset-0 w-auto h-auto max-w-none max-h-none"
                  style={{
                    transform: `translate(${50 - event.imagePositionX}%, ${50 - event.imagePosition}%) scale(${event.imageZoom})`,
                    transformOrigin: 'center',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
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
                      <span>Register by {parseLocalDate(event.registration_deadline).toLocaleDateString()}</span>
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
                      {interestCount} Interested
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
              <span className="text-gray-300">{interestCount} Interested</span>
            </div>
            {event.registration_deadline && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-gray-300">Reg by {parseLocalDate(event.registration_deadline).toLocaleDateString()}</span>
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
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{event.description}</p>
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
                {event.eventDirector?.name && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Event Director</h3>
                    <p className="text-gray-300 font-medium">{event.eventDirector.name}</p>
                  </div>
                )}
                {(event.eventDirector?.phone || event.contact_phone) && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Event Contact</h3>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-electric-500" />
                      <span className="text-red-400 font-medium border border-red-400 px-2 py-1 rounded">
                        {event.eventDirector?.phone || event.contact_phone}
                      </span>
                    </div>
                  </div>
                )}
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
                  organizationColor={event.organizations?.marker_color}
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
                        <div className="font-semibold text-electric-400">{formatTime12Hour(item.time)}</div>
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
            {/* Actions Card */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700/50 rounded-xl p-6 sticky top-6">

              <div className="space-y-4">
                {/* Event Registration Section */}
                {event.allows_online_registration && 
                 event.registration_deadline && 
                 parseLocalDate(event.registration_deadline) > new Date() &&
                 (!event.maxParticipants || event.participants < event.maxParticipants) ? (
                  <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Event Registration</h3>
                    {isAuthenticated ? (
                      <button
                        onClick={handleRegister}
                        className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 ${
                          isRegistered
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-electric-500 text-white hover:bg-electric-600 shadow-lg'
                        }`}
                      >
                        {isRegistered ? 'Registered for Event ✓' : 'Register for This Event'}
                      </button>
                    ) : (
                      <Link
                        to="/login"
                        className="block w-full py-3 bg-electric-500 text-white rounded-lg font-bold text-lg text-center hover:bg-electric-600 transition-all duration-200 shadow-lg"
                      >
                        Sign In to Register
                      </Link>
                    )}
                  </div>
                ) : event.external_registration_url && !event.allows_online_registration ? (
                  <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">External Registration</h3>
                    <a
                      href={event.external_registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-electric-500 text-white rounded-lg font-bold text-lg flex items-center justify-center space-x-2 hover:bg-electric-600 transition-all duration-200 shadow-lg"
                    >
                      <span>Register Externally</span>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <p className="text-gray-400 text-xs text-center mt-2">
                      You will be redirected to an external registration site
                    </p>
                  </div>
                ) : null}
                
                {/* I'm Interested Button */}
                <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4">
                  <button
                    onClick={handleInterest}
                    className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 ${
                      isInterested
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
                    }`}
                  >
                    {isInterested ? '✓ I\'m Interested' : 'I\'m Interested'}
                  </button>
                  <p className="text-gray-400 text-xs text-center mt-2">
                    {interestCount} {interestCount === 1 ? 'person is' : 'people are'} interested
                  </p>
                </div>
                    
                {/* Save and Share buttons - Only for authenticated users */}
                {isAuthenticated && (
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
                    <div className="relative">
                      <button 
                        ref={shareButtonRef}
                        onClick={() => setShowShareDropdown(!showShareDropdown)}
                        className="flex items-center justify-center space-x-2 py-2 px-4 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-all duration-200"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Login prompt for non-authenticated users */}
                {!isAuthenticated && (
                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-2">
                      Want to save events and access competitor features?
                    </p>
                    <Link 
                      to="/login" 
                      className="inline-block px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-all duration-200"
                    >
                      Sign In
                    </Link>
                    <span className="text-gray-400 text-sm mx-2">or</span>
                    <Link 
                      to="/pricing" 
                      className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all duration-200"
                    >
                      Join Free
                    </Link>
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
                    {parseLocalDate(event.start_date).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                    {event.start_date.includes('T') && (
                      <span className="text-electric-400 ml-2">
                        {formatTime12Hour(event.start_date.split('T')[1])}
                      </span>
                    )}
                  </div>
                  {event.start_date !== event.end_date && (
                    <div className="text-gray-300 text-sm">
                      Ends: {parseLocalDate(event.end_date).toLocaleDateString('en-US', { 
                        weekday: 'long',
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                      {event.end_date.includes('T') && (
                        <span className="text-electric-400 ml-2">
                          {formatTime12Hour(event.end_date.split('T')[1])}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {/* Only show Event Director if name exists */}
                {event.eventDirector?.name && (
                  <div>
                    <div className="text-gray-400 text-sm">Event Director</div>
                    <div className="text-white font-medium">{event.eventDirector.name}</div>
                  </div>
                )}
                
                {/* Only show Contact section if any contact info exists */}
                {(event.eventDirector?.phone || event.eventDirector?.email || event.contact_phone || event.contact_email || event.website) && (
                  <div>
                    <div className="text-gray-400 text-sm">Contact</div>
                    {(event.eventDirector?.phone || event.contact_phone) && (
                      <div className="text-electric-400 font-medium">
                        {event.eventDirector?.phone || event.contact_phone}
                      </div>
                    )}
                    {(event.eventDirector?.email || event.contact_email) && (
                      <div className="text-electric-400 text-sm">
                        {event.eventDirector?.email || event.contact_email}
                      </div>
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
                )}
                <div>
                  <div className="text-gray-400 text-sm">Registration</div>
                  <div className={`font-medium ${
                    event.registration_deadline && parseLocalDate(event.registration_deadline) > new Date() 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {event.registration_deadline && parseLocalDate(event.registration_deadline) > new Date() ? 'Open' : 'Closed'}
                  </div>
                  {event.registration_deadline && (
                    <div className="text-gray-300 text-sm">
                      Deadline: {parseLocalDate(event.registration_deadline).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                {/* Event Pricing */}
                {(event.member_price > 0 || event.non_member_price > 0 || event.registrationFee > 0) && (
                  <div>
                    <div className="text-gray-400 text-sm mb-2">Event Pricing</div>
                    {event.member_price > 0 && (
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm">Member Price:</span>
                        <span className="text-white font-medium">${event.member_price.toFixed(2)}</span>
                      </div>
                    )}
                    {event.non_member_price > 0 && (
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-300 text-sm">Non-Member Price:</span>
                        <span className="text-white font-medium">${event.non_member_price.toFixed(2)}</span>
                      </div>
                    )}
                    {!event.member_price && !event.non_member_price && event.registrationFee > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm">Registration Fee:</span>
                        <span className="text-white font-medium">${event.registrationFee.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
                {/* Show participants count only to event organizers */}
                {isAuthenticated && user?.id === event.organizer_id && (
                  <div>
                    <div className="text-gray-400 text-sm">Participants</div>
                    <div className="text-white font-medium">
                      {event.participants || 0} registered
                      {event.maxParticipants && ` (${event.maxParticipants} max)`}
                    </div>
                  </div>
                )}
                {/* Show interested count to everyone */}
                <div>
                  <div className="text-gray-400 text-sm">Interest</div>
                  <div className="text-white font-medium">
                    {interestCount} {interestCount === 1 ? 'person' : 'people'} interested
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

      {/* Share Dropdown Portal */}
      {showShareDropdown && shareButtonRef.current && (
        <div 
          ref={shareDropdownRef}
          className="fixed w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-[9999]"
          style={{
            top: `${shareButtonRef.current.getBoundingClientRect().bottom + 8}px`,
            left: `${shareButtonRef.current.getBoundingClientRect().right - 192}px`
          }}
        >
          <button
            onClick={() => handleShare('facebook')}
            className="flex items-center space-x-3 w-full px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded-t-lg"
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
            className="flex items-center space-x-3 w-full px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors rounded-b-lg"
          >
            <span>Copy Link</span>
          </button>
        </div>
      )}
      
      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl w-full max-w-2xl lg:max-w-4xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-white">Complete Event Registration</h3>
              <button
                onClick={() => setShowPayment(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <PaymentForm
              amount={
                user?.membershipType === 'competitor' && event.member_price > 0
                  ? event.member_price
                  : event.non_member_price > 0
                  ? event.non_member_price
                  : event.registrationFee || 0
              }
              planName={`Registration for ${event.title}`}
              description={`Event registration for ${event.title} on ${parseLocalDate(event.start_date).toLocaleDateString()}`}
              metadata={{
                eventId: event.id,
                eventTitle: event.title,
                eventDate: event.start_date
              }}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </div>
        </div>
      )}
    </div>
  );
});

export default EventDetails;