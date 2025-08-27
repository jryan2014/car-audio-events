import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MemberProfileWithUser, MemberGalleryImage } from '../types/memberProfile';
import { 
  FaCar, FaMusic, FaUsers, FaMapMarkerAlt, FaFacebook, 
  FaInstagram, FaYoutube, FaTiktok, FaTwitter, FaGlobe,
  FaEnvelope, FaArrowLeft, FaTimes, FaExpand, FaTrophy,
  FaCalendar, FaHeart
} from 'react-icons/fa';
import VehicleAudioDiagram, { AudioSystemData, AudioComponent, VehicleType } from '../components/VehicleAudioDiagram';

export default function PublicMemberProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MemberProfileWithUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<MemberGalleryImage | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [audioSystem, setAudioSystem] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [competitionResults, setCompetitionResults] = useState<any[]>([]);
  const [eventsAttended, setEventsAttended] = useState<any[]>([]);
  const [favoritedEvents, setFavoritedEvents] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      loadPublicProfile();
    }
  }, [userId]);

  const loadPublicProfile = async () => {
    try {
      // Get current user to check if viewing own profile
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const isOwnProfile = currentUser?.id === userId;
      setIsAuthenticated(!!currentUser);

      // Fetch public profile using RPC function
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_member_profile', { p_user_id: userId });

      if (profileError || !profileData || profileData.length === 0) {
        console.error('Error loading profile:', profileError);
        setProfile(null);
        setLoading(false);
        return;
      }

      const memberProfile = profileData[0];
      
      // Check if profile is viewable (allow own profile regardless of visibility)
      if (!isOwnProfile && (memberProfile.visibility !== 'public' || memberProfile.is_banned)) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Fetch user details
      const { data: userData } = await supabase
        .from('users')
        .select('name, first_name, last_name, location, profile_image')
        .eq('id', userId)
        .single();

      if (userData) {
        memberProfile.user = userData;
      }

      // Fetch gallery images - show all images if viewing own profile
      let galleryQuery = supabase
        .from('member_gallery_images')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });

      // Only filter by banned status if not viewing own profile
      // Let RLS policies handle visibility based on profile visibility
      if (!isOwnProfile) {
        galleryQuery = galleryQuery
          .eq('is_banned', false);
      }

      const { data: galleryData } = await galleryQuery;

      if (galleryData) {
        memberProfile.gallery_images = galleryData;
      }

      setProfile(memberProfile as MemberProfileWithUser);

      // Fetch the primary audio system
      const { data: audioSystemData } = await supabase
        .from('user_audio_systems')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .single();

      if (audioSystemData) {
        setAudioSystem(audioSystemData);
      }

      // Fetch competition results if profile allows
      if (memberProfile.show_competition_results !== false) {
        const { data: resultsData } = await supabase
          .from('competition_results')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (resultsData) {
          // Format results with event info from the results table itself
          const formattedResults = resultsData.map(result => ({
            ...result,
            event: {
              name: result.event_name || 'Competition',
              event_date: result.event_date,
              location: result.event_location
            }
          }));
          setCompetitionResults(formattedResults);
        }
      }

      // Fetch events attended if profile allows
      if (memberProfile.show_events_attended !== false) {
        const { data: attendedData } = await supabase
          .from('event_registrations')
          .select(`
            *,
            event:events(id, event_name, title, start_date, city, state, image_url)
          `)
          .eq('user_id', userId)
          .eq('payment_status', 'paid')
          .order('created_at', { ascending: false })
          .limit(10);

        if (attendedData && attendedData.length > 0) {
          // Format events with proper field names
          const formattedAttended = attendedData.map(reg => ({
            ...reg,
            event: reg.event ? {
              ...reg.event,
              name: reg.event.event_name || reg.event.title || 'Event',
              event_date: reg.event.start_date,
              location: reg.event.city && reg.event.state ? `${reg.event.city}, ${reg.event.state}` : 'Location TBD'
            } : null
          }));
          setEventsAttended(formattedAttended);
        }
      }

      // Fetch favorited events if profile allows
      if (memberProfile.show_favorited_events !== false) {
        const { data: favoritedData } = await supabase
          .from('event_favorites')
          .select(`
            *,
            event:events(id, event_name, title, start_date, city, state, image_url)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (favoritedData && favoritedData.length > 0) {
          // Format events with proper field names
          const formattedFavorites = favoritedData.map(fav => ({
            ...fav,
            event: fav.event ? {
              ...fav.event,
              name: fav.event.event_name || fav.event.title || 'Event',
              event_date: fav.event.start_date,
              location: fav.event.city && fav.event.state ? `${fav.event.city}, ${fav.event.state}` : 'Location TBD'
            } : null
          }));
          setFavoritedEvents(formattedFavorites);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (!profile) return '';
    if (profile.display_name) return profile.display_name;
    
    let name = '';
    if (profile.show_first_name && profile.user?.first_name) {
      name += profile.user.first_name;
    }
    if (profile.show_last_name && profile.user?.last_name) {
      if (name) name += ' ';
      name += profile.user.last_name;
    }
    
    return name || 'Car Audio Enthusiast';
  };

  const openLightbox = (image: MemberGalleryImage, index: number) => {
    setLightboxImage(image);
    setCurrentImageIndex(index);
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!profile?.gallery_images) return;
    
    let newIndex = currentImageIndex;
    if (direction === 'prev') {
      newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : profile.gallery_images.length - 1;
    } else {
      newIndex = currentImageIndex < profile.gallery_images.length - 1 ? currentImageIndex + 1 : 0;
    }
    
    setCurrentImageIndex(newIndex);
    setLightboxImage(profile.gallery_images[newIndex]);
  };

  // Convert vehicle make/model to vehicle type for diagram
  const getVehicleType = (make: string, model: string): VehicleType => {
    const vehicleString = `${make} ${model}`.toLowerCase();
    
    // Truck patterns
    if (vehicleString.includes('f-150') || vehicleString.includes('f150') ||
        vehicleString.includes('silverado') || vehicleString.includes('sierra') ||
        vehicleString.includes('ram ') || vehicleString.includes('tacoma') ||
        vehicleString.includes('tundra') || vehicleString.includes('ranger') ||
        vehicleString.includes('colorado') || vehicleString.includes('frontier') ||
        vehicleString.includes('ridgeline') || vehicleString.includes('titan')) {
      return 'truck';
    }
    
    // SUV patterns
    if (vehicleString.includes('tahoe') || vehicleString.includes('suburban') ||
        vehicleString.includes('explorer') || vehicleString.includes('expedition') ||
        vehicleString.includes('4runner') || vehicleString.includes('sequoia') ||
        vehicleString.includes('highlander') || vehicleString.includes('pilot') ||
        vehicleString.includes('pathfinder') || vehicleString.includes('armada') ||
        vehicleString.includes('escalade') || vehicleString.includes('denali') ||
        vehicleString.includes('yukon') || vehicleString.includes('traverse') ||
        vehicleString.includes('acadia') || vehicleString.includes('enclave')) {
      return 'suv';
    }
    
    // Van patterns
    if (vehicleString.includes('sienna') || vehicleString.includes('odyssey') ||
        vehicleString.includes('transit') || vehicleString.includes('sprinter') ||
        vehicleString.includes('express') || vehicleString.includes('savana') ||
        vehicleString.includes('promaster') || vehicleString.includes('nv200') ||
        vehicleString.includes('caravan') || vehicleString.includes('pacifica')) {
      return 'van';
    }
    
    // Default to sedan
    return 'sedan';
  };

  // Convert audio components from database format to diagram format
  const convertAudioSystemToDiagram = (audioSystem: any): AudioSystemData | null => {
    if (!audioSystem) return null;
    
    const vehicleType = audioSystem.vehicle_make && audioSystem.vehicle_model 
      ? getVehicleType(audioSystem.vehicle_make, audioSystem.vehicle_model)
      : 'sedan';
    
    let components: AudioComponent[] = [];
    let componentId = 1;
    
    // Convert components from the old format (string-based) if it exists
    if (audioSystem.components) {
      const oldComponents = audioSystem.components;
      
      if (oldComponents.head_unit) {
        components.push({
          id: `comp-${componentId++}`,
          type: 'head_unit',
          name: oldComponents.head_unit,
          location: { x: 25, y: 40 },
          brand: oldComponents.head_unit.split(' ')[0] || 'Unknown'
        });
      }
      
      if (oldComponents.amplifiers) {
        components.push({
          id: `comp-${componentId++}`,
          type: 'amplifier',
          name: oldComponents.amplifiers,
          location: { x: 75, y: 25 },
          brand: oldComponents.amplifiers.split(' ')[0] || 'Unknown'
        });
      }
      
      if (oldComponents.subwoofers) {
        components.push({
          id: `comp-${componentId++}`,
          type: 'subwoofer',
          name: oldComponents.subwoofers,
          location: { x: 80, y: 70 },
          brand: oldComponents.subwoofers.split(' ')[0] || 'Unknown'
        });
      }
      
      if (oldComponents.speakers) {
        components.push({
          id: `comp-${componentId++}`,
          type: 'component_speaker',
          name: oldComponents.speakers,
          location: { x: 20, y: 60 },
          brand: oldComponents.speakers.split(' ')[0] || 'Unknown'
        });
      }
      
      if (oldComponents.dsp) {
        components.push({
          id: `comp-${componentId++}`,
          type: 'dsp',
          name: oldComponents.dsp,
          location: { x: 50, y: 30 },
          brand: oldComponents.dsp.split(' ')[0] || 'Unknown'
        });
      }
      
      if (oldComponents.batteries) {
        components.push({
          id: `comp-${componentId++}`,
          type: 'battery',
          name: oldComponents.batteries,
          location: { x: 85, y: 45 },
          brand: oldComponents.batteries.split(' ')[0] || 'Unknown'
        });
      }
      
      if (oldComponents.alternator) {
        components.push({
          id: `comp-${componentId++}`,
          type: 'alternator',
          name: oldComponents.alternator,
          location: { x: 15, y: 30 },
          brand: oldComponents.alternator.split(' ')[0] || 'Unknown'
        });
      }
    }
    
    // Convert from new JSON array format if it exists
    if (audioSystem.audio_components && Array.isArray(audioSystem.audio_components)) {
      audioSystem.audio_components.forEach((comp: any, index: number) => {
        let componentType: AudioComponent['type'] = 'component_speaker';
        
        // Map category to component type
        switch (comp.category?.toLowerCase()) {
          case 'head_unit':
          case 'head unit':
          case 'receiver':
            componentType = 'head_unit';
            break;
          case 'amplifier':
          case 'amp':
            componentType = 'amplifier';
            break;
          case 'subwoofer':
          case 'sub':
            componentType = 'subwoofer';
            break;
          case 'speakers':
          case 'speaker':
          case 'component_speaker':
            componentType = 'component_speaker';
            break;
          case 'tweeter':
            componentType = 'tweeter';
            break;
          case 'dsp':
          case 'processor':
            componentType = 'dsp';
            break;
          case 'battery':
            componentType = 'battery';
            break;
          case 'alternator':
            componentType = 'alternator';
            break;
          case 'capacitor':
            componentType = 'capacitor';
            break;
        }
        
        // Generate location based on component type and index
        let location = { x: 50, y: 50 };
        switch (componentType) {
          case 'head_unit':
            location = { x: 25, y: 40 };
            break;
          case 'amplifier':
            location = { x: 75 + (index % 2) * 10, y: 25 + (index % 2) * 15 };
            break;
          case 'subwoofer':
            location = { x: 80, y: 70 + (index % 2) * 10 };
            break;
          case 'component_speaker':
            location = { x: 20 + (index % 4) * 15, y: 55 + (index % 2) * 10 };
            break;
          case 'tweeter':
            location = { x: 25 + (index % 2) * 20, y: 35 };
            break;
          case 'dsp':
            location = { x: 50, y: 30 };
            break;
          case 'battery':
            location = { x: 85, y: 45 + (index % 2) * 15 };
            break;
          case 'alternator':
            location = { x: 15, y: 30 };
            break;
          case 'capacitor':
            location = { x: 70, y: 40 };
            break;
        }
        
        components.push({
          id: `comp-${componentId++}`,
          type: componentType,
          name: comp.model || comp.brand || `${comp.category} Component`,
          location,
          brand: comp.brand,
          model: comp.model,
          power: comp.specifications?.rms_watts || comp.specifications?.power_watts
        });
      });
    }
    
    return {
      vehicleType,
      components,
      totalPower: audioSystem.total_power_watts,
      description: audioSystem.description
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Profile Not Found</h2>
          <p className="text-gray-400 mb-6">
            This profile is either private or doesn't exist.
          </p>
          <button
            onClick={() => navigate('/members')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md transition-colors"
          >
            Back to Directory
          </button>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName();
  const featuredImage = profile.gallery_images?.find(img => img.is_featured);
  const firstImage = profile.gallery_images?.[0];
  const galleryImages = profile.gallery_images || [];

  // Use featured image if available, otherwise use first gallery image
  const heroImage = featuredImage || firstImage;

  // Debug logging to understand what's happening
  console.log('Hero image selection:', {
    featuredImage,
    firstImage,
    heroImage,
    totalGalleryImages: galleryImages.length
  });

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header/Hero Section - Show hero image if available */}
      {heroImage && heroImage.image_url && (
        <div className="relative h-64 md:h-96">
          <img
            src={heroImage.image_url}
            alt={displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Failed to load hero image:', heroImage.image_url);
              // Hide the entire hero section container if image fails to load
              const heroSection = e.currentTarget.parentElement;
              if (heroSection) {
                heroSection.style.display = 'none';
              }
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
          
          {/* Featured badge if this is a featured image */}
          {heroImage.is_featured && (
            <div className="absolute top-4 left-4 bg-primary-600 text-white px-3 py-1 rounded-md text-sm font-medium">
              Featured
            </div>
          )}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/members')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <FaArrowLeft />
          <span>Back to Directory</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-white mb-2">{displayName}</h1>
              
              {/* Location */}
              {profile.user?.location && (
                <div className="flex items-center space-x-2 text-gray-400 mb-4">
                  <FaMapMarkerAlt className="w-4 h-4" />
                  <span>{profile.user.location}</span>
                </div>
              )}

              {/* Team Info */}
              {profile.show_team_info && profile.team_name && (
                <div className="mb-4">
                  <div className="flex items-center space-x-2 text-primary-400">
                    <FaUsers className="w-4 h-4" />
                    <span className="font-semibold">{profile.team_name}</span>
                  </div>
                  {profile.team_role && (
                    <p className="text-sm text-gray-400 ml-6">{profile.team_role}</p>
                  )}
                </div>
              )}

              {/* Bio */}
              {profile.show_bio && profile.bio && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-2">About</h3>
                  <p className="text-gray-300 whitespace-pre-wrap">{profile.bio}</p>
                </div>
              )}

              {/* Social Links */}
              {profile.show_social_links && (
                profile.facebook_url || profile.instagram_url || profile.youtube_url || 
                profile.tiktok_url || profile.twitter_url || profile.website_url
              ) && (
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-3">Connect</h3>
                  <div className="flex flex-wrap gap-3">
                    {profile.facebook_url && (
                      <a
                        href={profile.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-primary-400 transition-colors"
                      >
                        <FaFacebook className="w-6 h-6" />
                      </a>
                    )}
                    {profile.instagram_url && (
                      <a
                        href={profile.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-primary-400 transition-colors"
                      >
                        <FaInstagram className="w-6 h-6" />
                      </a>
                    )}
                    {profile.youtube_url && (
                      <a
                        href={profile.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-primary-400 transition-colors"
                      >
                        <FaYoutube className="w-6 h-6" />
                      </a>
                    )}
                    {profile.tiktok_url && (
                      <a
                        href={profile.tiktok_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-primary-400 transition-colors"
                      >
                        <FaTiktok className="w-6 h-6" />
                      </a>
                    )}
                    {profile.twitter_url && (
                      <a
                        href={profile.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-primary-400 transition-colors"
                      >
                        <FaTwitter className="w-6 h-6" />
                      </a>
                    )}
                    {profile.website_url && (
                      <a
                        href={profile.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-primary-400 transition-colors"
                      >
                        <FaGlobe className="w-6 h-6" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Vehicle Info from Audio System */}
            {profile.show_vehicle_info && audioSystem && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                  <FaCar className="w-5 h-5 text-primary-400" />
                  <span>Vehicle</span>
                </h3>
                <div className="space-y-2">
                  {audioSystem.vehicle_year && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Year:</span>
                      <span className="text-white">{audioSystem.vehicle_year}</span>
                    </div>
                  )}
                  {audioSystem.vehicle_make && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Make:</span>
                      <span className="text-white">{audioSystem.vehicle_make}</span>
                    </div>
                  )}
                  {audioSystem.vehicle_model && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Model:</span>
                      <span className="text-white">{audioSystem.vehicle_model}</span>
                    </div>
                  )}
                  {audioSystem.vehicle_color && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Color:</span>
                      <span className="text-white">{audioSystem.vehicle_color}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Audio System & Gallery */}
          <div className="lg:col-span-2 space-y-6">
            {/* Audio System from user_audio_systems */}
            {profile.show_audio_system && audioSystem && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <FaMusic className="w-5 h-5 text-primary-400" />
                  <span>Audio System</span>
                </h3>
                
                {/* System Name and Description */}
                {audioSystem.name && (
                  <h4 className="text-lg font-semibold text-primary-400 mb-2">{audioSystem.name}</h4>
                )}
                {audioSystem.description && (
                  <div className="mb-6">
                    <p className="text-gray-300 whitespace-pre-wrap">{audioSystem.description}</p>
                  </div>
                )}

                {/* Audio System Diagram */}
                {(() => {
                  const diagramData = convertAudioSystemToDiagram(audioSystem);
                  return diagramData && diagramData.components.length > 0 ? (
                    <div className="mb-8">
                      <VehicleAudioDiagram 
                        audioSystem={diagramData}
                        className="mb-6"
                        interactive={true}
                        showComponentDetails={true}
                      />
                    </div>
                  ) : null;
                })()} 

                {/* System Info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {audioSystem.system_type && (
                    <div>
                      <span className="text-gray-400 text-sm">Type:</span>
                      <p className="text-white">{audioSystem.system_type}</p>
                    </div>
                  )}
                  {audioSystem.total_power_watts && (
                    <div>
                      <span className="text-gray-400 text-sm">Total Power:</span>
                      <p className="text-white font-medium">{audioSystem.total_power_watts.toLocaleString()} Watts</p>
                    </div>
                  )}
                  {audioSystem.installation_date && (
                    <div>
                      <span className="text-gray-400 text-sm">Installed:</span>
                      <p className="text-white">{new Date(audioSystem.installation_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {audioSystem.estimated_cost && (
                    <div>
                      <span className="text-gray-400 text-sm">Est. Cost:</span>
                      <p className="text-white">${parseFloat(audioSystem.estimated_cost).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                {/* Components */}
                {audioSystem.components && Array.isArray(audioSystem.components) && audioSystem.components.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-400 uppercase mb-3">Components</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Group components by category */}
                      {(() => {
                        const componentsByCategory: Record<string, any[]> = {};
                        audioSystem.components.forEach((comp: any) => {
                          const category = comp.category || 'other';
                          if (!componentsByCategory[category]) {
                            componentsByCategory[category] = [];
                          }
                          componentsByCategory[category].push(comp);
                        });

                        const categoryLabels: Record<string, string> = {
                          head_unit: 'Head Unit',
                          amplifier: 'Amplifiers',
                          subwoofer: 'Subwoofers',
                          speakers: 'Speakers',
                          dsp: 'DSP',
                          wiring: 'Wiring',
                          batteries: 'Batteries',
                          alternator: 'Alternator',
                          enclosure: 'Enclosure',
                          sound_dampening: 'Sound Dampening',
                          accessories: 'Accessories'
                        };

                        return Object.entries(componentsByCategory).map(([category, items]) => (
                          <div key={category} className="bg-gray-700/50 rounded p-3">
                            <h5 className="text-sm font-semibold text-gray-400 mb-1">
                              {categoryLabels[category] || category}
                            </h5>
                            {items.map((item, idx) => (
                              <div key={idx} className="text-gray-300">
                                {item.brand} {item.model}
                                {item.specifications?.quantity > 1 && ` (x${item.specifications.quantity})`}
                                {item.specifications?.rms_watts && ` - ${item.specifications.rms_watts}W RMS`}
                              </div>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Competition Results */}
            {competitionResults.length > 0 && profile.show_competition_results !== false && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <FaTrophy className="w-5 h-5 text-primary-400" />
                  <span>Competition Results</span>
                </h3>
                <div className="space-y-3">
                  {competitionResults.slice(0, 5).map((result, index) => (
                    <div key={result.id || index} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
                      <div>
                        <div className="font-medium text-white">{result.event?.name || 'Competition'}</div>
                        <div className="text-sm text-gray-400">
                          {result.event?.event_date && new Date(result.event.event_date).toLocaleDateString()}
                          {result.event?.location && ` • ${result.event.location}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-primary-400">
                          {result.placement ? `#${result.placement}` : result.score || 'Participated'}
                        </div>
                        {result.class_name && (
                          <div className="text-xs text-gray-400">{result.class_name}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Events Attended */}
            {eventsAttended.length > 0 && profile.show_events_attended !== false && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <FaCalendar className="w-5 h-5 text-primary-400" />
                  <span>Events Attended</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {eventsAttended.slice(0, 6).map((registration, index) => (
                    <div key={registration.id || index} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="font-medium text-white text-sm">{registration.event?.name}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {registration.event?.event_date && new Date(registration.event.event_date).toLocaleDateString()}
                        {registration.event?.location && ` • ${registration.event.location}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Favorited Events */}
            {favoritedEvents.length > 0 && profile.show_favorited_events !== false && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <FaHeart className="w-5 h-5 text-primary-400" />
                  <span>Interested In</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {favoritedEvents.slice(0, 4).map((favorite, index) => (
                    <div key={favorite.id || index} className="bg-gray-700/50 rounded-lg p-3">
                      <div className="font-medium text-white text-sm">{favorite.event?.name}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {favorite.event?.event_date && new Date(favorite.event.event_date).toLocaleDateString()}
                        {favorite.event?.location && ` • ${favorite.event.location}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery */}
            {galleryImages.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Gallery</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryImages.map((image, index) => (
                    <div
                      key={image.id}
                      onClick={() => openLightbox(image, index)}
                      className="aspect-square bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all group"
                    >
                      <img
                        src={image.thumbnail_url || image.image_url}
                        alt={image.caption || `Gallery image ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {image.is_featured && (
                        <div className="absolute top-2 left-2 bg-primary-600 text-white px-2 py-1 rounded text-xs">
                          Featured
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Call to Action - Only show for non-authenticated users */}
            {!isAuthenticated && (
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Join Our Community!</h3>
                <p className="text-white/90 mb-4">
                  Connect with car audio enthusiasts, share your builds, and compete in events.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => navigate('/register')}
                    className="bg-white text-primary-600 hover:bg-gray-100 px-6 py-2 rounded-md font-semibold transition-colors"
                  >
                    Sign Up Free
                  </button>
                  <button
                    onClick={() => navigate('/login')}
                    className="bg-primary-800 text-white hover:bg-primary-900 px-6 py-2 rounded-md font-semibold transition-colors"
                  >
                    Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <FaTimes className="w-6 h-6" />
          </button>

          <button
            onClick={() => navigateImage('prev')}
            className="absolute left-4 text-white hover:text-gray-300 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            onClick={() => navigateImage('next')}
            className="absolute right-4 text-white hover:text-gray-300 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="max-w-6xl max-h-[90vh] overflow-hidden">
            <img
              src={lightboxImage.image_url}
              alt={lightboxImage.caption || 'Gallery image'}
              className="max-w-full max-h-[85vh] object-contain"
            />
            {lightboxImage.caption && (
              <p className="text-white text-center mt-4">{lightboxImage.caption}</p>
            )}
            <div className="text-center text-gray-400 mt-2">
              {currentImageIndex + 1} / {galleryImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}