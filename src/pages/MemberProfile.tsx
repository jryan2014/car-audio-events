import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MemberProfileWithUser, MemberGalleryImage } from '../types/memberProfile';
import { 
  FaFacebook, FaInstagram, FaYoutube, FaTiktok, FaTwitter, FaGlobe,
  FaCar, FaMusic, FaUsers, FaMapMarkerAlt, FaArrowLeft, FaExpand,
  FaTimes, FaChevronLeft, FaChevronRight, FaVolumeUp, FaMicrophone,
  FaTrophy, FaCalendar, FaHeart
} from 'react-icons/fa';
import { Edit3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import CleanVehicleDiagram, { VehicleDiagramData, DiagramComponent, VehicleType } from '../components/CleanVehicleDiagram';
import AudioDiagramSettings from '../components/AudioDiagramSettings';
import AudioDiagramDisplay from '../components/AudioDiagramDisplay';

export default function MemberProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<MemberProfileWithUser | null>(null);
  const [galleryImages, setGalleryImages] = useState<MemberGalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<MemberGalleryImage | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [audioSystem, setAudioSystem] = useState<any>(null);
  const [competitionResults, setCompetitionResults] = useState<any[]>([]);
  const [eventsAttended, setEventsAttended] = useState<any[]>([]);
  const [favoritedEvents, setFavoritedEvents] = useState<any[]>([]);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId, user]);

  const loadProfile = async () => {
    try {
      // Check if user is authenticated
      if (!user) {
        toast.error('Please log in to view member profiles');
        navigate('/login');
        return;
      }

      // Fetch profile using RPC function
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_member_profile', { p_user_id: userId });

      if (profileError || !profileData || profileData.length === 0) {
        toast.error('Profile not found or not accessible');
        navigate('/members');
        return;
      }

      const memberProfile = profileData[0];
      
      // Check visibility
      if (memberProfile.visibility === 'private' || memberProfile.is_banned) {
        toast.error('This profile is not available');
        navigate('/members');
        return;
      }

      // Fetch user details separately
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, first_name, last_name, email, location, profile_image')
        .eq('id', userId)
        .single();

      if (userData) {
        memberProfile.user = userData;
      }

      setProfile(memberProfile as MemberProfileWithUser);

      // Fetch the primary audio system
      const { data: audioSystemData, error: audioError } = await supabase
        .from('user_audio_systems')
        .select('*')
        .eq('user_id', userId)
        .eq('is_primary', true)
        .single();

      if (audioSystemData) {
        setAudioSystem(audioSystemData);
      }

      // Fetch gallery images
      const { data: imagesData, error: imagesError } = await supabase
        .from('member_gallery_images')
        .select('*')
        .eq('user_id', userId)
        .eq('is_banned', false)
        .in('visibility', ['public', 'member_only'])
        .order('display_order', { ascending: true });

      if (imagesError) throw imagesError;

      setGalleryImages(imagesData || []);

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
      toast.error('Failed to load member profile');
      navigate('/members');
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
    
    return name || profile.user?.name || 'Anonymous Member';
  };

  const getVehicleInfo = () => {
    if (!profile || !(user?.id === userId || profile.show_vehicle_info)) return null;
    
    const parts = [];
    if (profile.vehicle_year) parts.push(profile.vehicle_year);
    if (profile.vehicle_make) parts.push(profile.vehicle_make);
    if (profile.vehicle_model) parts.push(profile.vehicle_model);
    
    return parts.length > 0 ? parts.join(' ') : null;
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
  const convertAudioSystemToDiagram = (audioSystem: any): VehicleDiagramData | null => {
    if (!audioSystem) return null;
    
    // Use stored vehicle_type or detect from make/model
    const vehicleType = audioSystem.vehicle_type || 
      (audioSystem.vehicle_make && audioSystem.vehicle_model 
        ? getVehicleType(audioSystem.vehicle_make, audioSystem.vehicle_model)
        : 'sedan');
    
    let components: DiagramComponent[] = [];
    
    // Convert components from the new JSON array format
    if (audioSystem.components && Array.isArray(audioSystem.components)) {
      // Get diagram display settings if available
      const displaySettings = audioSystem.diagram_display_settings || {};
      
      audioSystem.components.forEach((comp: any) => {
        if (!comp.category) return;
        
        // Check if this component should be shown on the diagram
        const isVisible = displaySettings[comp.id] !== undefined ? displaySettings[comp.id] : true;
        
        // Create diagram component
        components.push({
          id: comp.id || `comp-${Date.now()}-${Math.random()}`,
          name: comp.category,
          brand: comp.brand,
          model: comp.model,
          type: comp.category,
          isVisible: isVisible
        });
      });
    }
    
    return {
      vehicleType,
      vehicleColor: audioSystem.vehicle_color,
      components,
      totalPower: audioSystem.total_power_watts
    };
  };

  const openImageModal = (image: MemberGalleryImage, index: number) => {
    setSelectedImage(image);
    setCurrentImageIndex(index);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'next' 
      ? (currentImageIndex + 1) % galleryImages.length
      : (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    
    setCurrentImageIndex(newIndex);
    setSelectedImage(galleryImages[newIndex]);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Profile Not Found</h2>
          <p className="text-gray-400 mb-6">
            This profile is not available or has been set to private.
          </p>
          <button
            onClick={() => {
              // If user was trying to view their own profile, go to settings
              if (user?.id === userId) {
                navigate('/member-profile-settings');
              } else {
                navigate('/members');
              }
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md transition-colors"
          >
            {user?.id === userId ? 'Go to Profile Settings' : 'Back to Directory'}
          </button>
        </div>
      </div>
    );
  }

  const vehicleInfo = getVehicleInfo();
  const displayName = getDisplayName();

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Back Button */}
      <button
        onClick={() => {
          // If viewing own profile, go back to profile settings
          if (user?.id === userId) {
            navigate('/member-profile-settings');
          } else {
            // Otherwise go back to directory
            navigate('/members');
          }
        }}
        className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <FaArrowLeft />
        <span>{user?.id === userId ? 'Back to Profile Settings' : 'Back to Directory'}</span>
      </button>

      {/* Profile Header */}
      <div className="bg-gray-800 rounded-lg overflow-hidden mb-8">
        {/* Cover Image - Only show if there's an image to display */}
        {(() => {
          const featuredImage = galleryImages.find(img => img.is_featured);
          const firstImage = galleryImages[0];
          const coverImage = featuredImage || firstImage;
          
          if (coverImage && coverImage.image_url) {
            return (
              <div className="h-48 relative">
                <img
                  src={coverImage.image_url}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
                {coverImage.is_featured && (
                  <div className="absolute top-4 left-4 bg-primary-600 text-white px-3 py-1 rounded-md text-sm font-medium">
                    Featured
                  </div>
                )}
              </div>
            );
          }
          return null;
        })()}

        {/* Profile Info */}
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
            {/* Profile Picture Area - Show user's actual profile picture */}
            <div className={`${galleryImages.some(img => img.is_featured) || galleryImages.length > 0 ? '-mt-16' : ''} mb-4 md:mb-0 relative z-10`}>
              <div className="w-32 h-32 bg-gray-700 rounded-full border-4 border-gray-800 flex items-center justify-center overflow-hidden">
                {profile.user?.profile_image ? (
                  <img
                    src={profile.user.profile_image}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FaMusic className="text-gray-500 text-3xl" />
                )}
              </div>
            </div>

            {/* Name and Basic Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{displayName}</h1>
              
              {/* Team Info */}
              {profile.show_team_info && profile.team_name && (
                <div className="flex items-center space-x-2 text-primary-400 mb-2">
                  <FaUsers />
                  <span className="font-medium">{profile.team_name}</span>
                  {profile.team_role && (
                    <span className="text-gray-400">• {profile.team_role}</span>
                  )}
                </div>
              )}

              {/* Location */}
              {profile.user?.location && (
                <div className="flex items-center space-x-2 text-gray-400 mb-2">
                  <FaMapMarkerAlt />
                  <span>{profile.user.location}</span>
                </div>
              )}

              {/* Vehicle */}
              {(user?.id === userId || profile.show_vehicle_info) && vehicleInfo && (
                <div className="flex items-center space-x-2 text-gray-400">
                  <FaCar />
                  <span>{vehicleInfo}</span>
                </div>
              )}
            </div>

            {/* Social Links */}
            {profile.show_social_links && (
              <div className="flex space-x-3 mt-4 md:mt-0">
                {profile.facebook_url && (
                  <a
                    href={profile.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <FaFacebook className="w-6 h-6" />
                  </a>
                )}
                {profile.instagram_url && (
                  <a
                    href={profile.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-pink-500 transition-colors"
                  >
                    <FaInstagram className="w-6 h-6" />
                  </a>
                )}
                {profile.youtube_url && (
                  <a
                    href={profile.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <FaYoutube className="w-6 h-6" />
                  </a>
                )}
                {profile.tiktok_url && (
                  <a
                    href={profile.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <FaTiktok className="w-6 h-6" />
                  </a>
                )}
                {profile.twitter_url && (
                  <a
                    href={profile.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-blue-400 transition-colors"
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
            )}
          </div>

          {/* Bio */}
          {profile.show_bio && profile.bio && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h2 className="text-lg font-semibold text-white mb-2">About</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Audio System Details */}
      {(user?.id === userId || profile.show_audio_system) && audioSystem && (
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <FaVolumeUp />
            <span>Audio System</span>
          </h2>

          {/* Vehicle Information */}
          <div className="mb-6 pb-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-primary-400 mb-3 flex items-center space-x-2">
              <FaCar />
              <span>Vehicle</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {audioSystem.vehicle_year && (
                <div>
                  <span className="text-gray-500 text-sm">Year</span>
                  <p className="text-white font-medium">{audioSystem.vehicle_year}</p>
                </div>
              )}
              {audioSystem.vehicle_make && (
                <div>
                  <span className="text-gray-500 text-sm">Make</span>
                  <p className="text-white font-medium">{audioSystem.vehicle_make}</p>
                </div>
              )}
              {audioSystem.vehicle_model && (
                <div>
                  <span className="text-gray-500 text-sm">Model</span>
                  <p className="text-white font-medium">{audioSystem.vehicle_model}</p>
                </div>
              )}
              {audioSystem.vehicle_color && (
                <div>
                  <span className="text-gray-500 text-sm">Color</span>
                  <p className="text-white font-medium">{audioSystem.vehicle_color}</p>
                </div>
              )}
            </div>
          </div>

          {/* System Overview */}
          {(audioSystem.name || audioSystem.description) && (
            <div className="mb-6">
              {audioSystem.name && (
                <h3 className="text-lg font-semibold text-primary-400 mb-2">{audioSystem.name}</h3>
              )}
              {audioSystem.description && (
                <p className="text-gray-300 whitespace-pre-wrap">{audioSystem.description}</p>
              )}
              {audioSystem.system_type && (
                <div className="mt-2">
                  <span className="text-gray-500 text-sm">System Type: </span>
                  <span className="text-white">{audioSystem.system_type}</span>
                </div>
              )}
              {audioSystem.total_power_watts && (
                <div className="mt-1">
                  <span className="text-gray-500 text-sm">Total Power: </span>
                  <span className="text-white font-medium">{audioSystem.total_power_watts.toLocaleString()} Watts</span>
                </div>
              )}
            </div>
          )}

          {/* Audio System Diagram - Display only, no edit buttons on public profile */}
          {(audioSystem.diagram_configurations && audioSystem.diagram_configurations.length > 0) ? (
            <div className="mb-8">
              <AudioDiagramDisplay 
                configuration={audioSystem.diagram_configurations[0]?.data || audioSystem.diagram_configuration}
                fullComponentData={audioSystem.components}
                className="mb-6"
              />
            </div>
          ) : audioSystem.diagram_configuration ? (
            <div className="mb-8">
              <AudioDiagramDisplay 
                configuration={audioSystem.diagram_configuration}
                fullComponentData={audioSystem.components}
                className="mb-6"
              />
            </div>
          ) : (
            // Fallback to old diagram if no configuration saved
            (() => {
              const diagramData = convertAudioSystemToDiagram(audioSystem);
              return diagramData && diagramData.components.length > 0 ? (
                <div className="mb-8">
                  <CleanVehicleDiagram 
                    data={diagramData}
                    className="mb-6"
                  />
                </div>
              ) : null;
            })()
          )} 

          {/* Audio Components */}
          {audioSystem.components && (
            <div>
              <h3 className="text-lg font-semibold text-primary-400 mb-3 flex items-center space-x-2">
                <FaMusic />
                <span>Components</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {audioSystem.components.head_unit && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-1 flex items-center space-x-2">
                      <FaMicrophone className="w-4 h-4 text-primary-400" />
                      <span>Head Unit</span>
                    </h4>
                    <p className="text-gray-300">{audioSystem.components.head_unit}</p>
                  </div>
                )}
                
                {audioSystem.components.amplifiers && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-1 flex items-center space-x-2">
                      <FaMusic className="w-4 h-4 text-primary-400" />
                      <span>Amplifiers</span>
                    </h4>
                    <p className="text-gray-300">{audioSystem.components.amplifiers}</p>
                  </div>
                )}
                
                {audioSystem.components.subwoofers && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-1 flex items-center space-x-2">
                      <FaVolumeUp className="w-4 h-4 text-primary-400" />
                      <span>Subwoofers</span>
                    </h4>
                    <p className="text-gray-300">{audioSystem.components.subwoofers}</p>
                  </div>
                )}
                
                {audioSystem.components.speakers && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-1 flex items-center space-x-2">
                      <FaVolumeUp className="w-4 h-4 text-primary-400" />
                      <span>Speakers</span>
                    </h4>
                    <p className="text-gray-300">{audioSystem.components.speakers}</p>
                  </div>
                )}
                
                {audioSystem.components.dsp && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-1">DSP</h4>
                    <p className="text-gray-300">{audioSystem.components.dsp}</p>
                  </div>
                )}
                
                {audioSystem.components.wiring && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-1">Wiring</h4>
                    <p className="text-gray-300">{audioSystem.components.wiring}</p>
                  </div>
                )}
                
                {audioSystem.components.batteries && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-1">Batteries</h4>
                    <p className="text-gray-300">{audioSystem.components.batteries}</p>
                  </div>
                )}
                
                {audioSystem.components.alternator && (
                  <div className="bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-1">Alternator</h4>
                    <p className="text-gray-300">{audioSystem.components.alternator}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Details */}
          {(audioSystem.installation_date || audioSystem.estimated_cost) && (
            <div className="mt-6 pt-6 border-t border-gray-700 grid grid-cols-2 gap-4">
              {audioSystem.installation_date && (
                <div>
                  <span className="text-gray-500 text-sm">Installation Date</span>
                  <p className="text-white">{new Date(audioSystem.installation_date).toLocaleDateString()}</p>
                </div>
              )}
              {audioSystem.estimated_cost && (
                <div>
                  <span className="text-gray-500 text-sm">Estimated Cost</span>
                  <p className="text-white font-medium">${parseFloat(audioSystem.estimated_cost).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Competition Results */}
      {competitionResults.length > 0 && profile.show_competition_results !== false && (
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <FaTrophy className="text-primary-400" />
            <span>Competition Results</span>
          </h2>
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
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <FaCalendar className="text-primary-400" />
            <span>Events Attended</span>
          </h2>
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
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <FaHeart className="text-primary-400" />
            <span>Interested In</span>
          </h2>
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
          <h2 className="text-xl font-bold text-white mb-4">Gallery</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryImages.map((image, index) => (
              <div
                key={image.id}
                onClick={() => openImageModal(image, index)}
                className="aspect-square bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all group"
              >
                <img
                  src={image.thumbnail_url || image.image_url}
                  alt={image.caption || `Gallery image ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <button
            onClick={closeImageModal}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <FaTimes className="w-6 h-6" />
          </button>

          {/* Navigation Arrows */}
          {galleryImages.length > 1 && (
            <>
              <button
                onClick={() => navigateImage('prev')}
                className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10"
              >
                <FaChevronLeft className="w-8 h-8" />
              </button>
              
              <button
                onClick={() => navigateImage('next')}
                className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10"
              >
                <FaChevronRight className="w-8 h-8" />
              </button>
            </>
          )}

          <div className="max-w-6xl max-h-[90vh] relative">
            <img
              src={selectedImage.image_url}
              alt={selectedImage.caption || 'Gallery image'}
              className="max-w-full max-h-[85vh] object-contain"
            />
            
            {selectedImage.caption && (
              <div className="mt-4 text-center">
                <p className="text-white text-lg">{selectedImage.caption}</p>
              </div>
            )}

            <div className="mt-2 text-center text-gray-400">
              {currentImageIndex + 1} / {galleryImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}