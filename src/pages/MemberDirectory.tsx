import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MemberProfileWithUser } from '../types/memberProfile';
import { FaSearch, FaFilter, FaCar, FaMusic, FaUsers, FaMapMarkerAlt, FaTimes } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function MemberDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<MemberProfileWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProfiles, setFilteredProfiles] = useState<MemberProfileWithUser[]>([]);
  
  // Determine if user is authenticated
  const isAuthenticated = !!user;

  useEffect(() => {
    loadProfiles();
  }, [user]);

  useEffect(() => {
    filterProfiles();
  }, [profiles, searchTerm, filterTeam, filterLocation]);

  const loadProfiles = async () => {
    try {
      // Determine which profiles to show based on authentication status
      const visibilityFilter = isAuthenticated 
        ? ['public', 'members_only']  // Logged-in users see both public and members_only
        : ['public'];                  // Non-logged-in users see only public

      // Fetch profiles based on visibility  
      // Note: We need to use a custom approach since member_profiles -> team_members
      // relationship through user_id isn't directly detectable by PostgREST
      const { data, error } = await supabase
        .from('member_profiles')
        .select(`
          *,
          user:users!user_id (
            name,
            first_name,
            last_name,
            email,
            location
          ),
          gallery_images:member_gallery_images!profile_id (
            id,
            image_url,
            thumbnail_url,
            caption,
            visibility,
            is_featured,
            is_banned
          )
        `)
        .in('visibility', visibilityFilter)
        .eq('is_banned', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter to only include profiles with proper user data
      const validProfiles = (data || []).filter(profile => profile.user);

      // Fetch team memberships and audio systems separately for all users
      let teamMemberships: any[] = [];
      let audioSystems: any[] = [];
      
      if (validProfiles.length > 0) {
        const userIds = validProfiles.map(profile => profile.user_id);
        
        // Fetch team memberships - split into two queries to avoid recursion
        const { data: membershipData, error: membershipError } = await supabase
          .from('team_members')
          .select('team_id, user_id, role, is_active')
          .in('user_id', userIds)
          .eq('is_active', true);

        if (membershipError) {
          console.error('Error loading team memberships:', membershipError);
          teamMemberships = [];
        } else if (membershipData && membershipData.length > 0) {
          // Fetch team details separately
          const teamIds = [...new Set(membershipData.map(m => m.team_id))];
          const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select('id, name, logo_url, is_public')
            .in('id', teamIds);

          if (teamsError) {
            console.error('Error loading teams:', teamsError);
            teamMemberships = [];
          } else {
            // Combine membership and team data
            teamMemberships = membershipData.map(membership => ({
              ...membership,
              teams: teamsData?.find(team => team.id === membership.team_id) || null
            }));
          }
        } else {
          teamMemberships = [];
        }

        // Fetch audio systems for vehicle information
        const { data: audioData, error: audioError } = await supabase
          .from('user_audio_systems')
          .select(`
            user_id,
            vehicle_year,
            vehicle_make,
            vehicle_model,
            description,
            is_primary,
            is_public
          `)
          .in('user_id', userIds)
          .eq('is_public', true);

        if (audioError) {
          console.error('Error loading audio systems:', audioError);
          // Don't fail completely if audio systems fail to load
          audioSystems = [];
        } else {
          audioSystems = audioData || [];
        }
      }

      // Merge team memberships and audio systems with profiles
      const profilesWithExtendedData = validProfiles.map(profile => {
        const userAudioSystems = audioSystems.filter(system => system.user_id === profile.user_id);
        const primaryAudioSystem = userAudioSystems.find(system => system.is_primary) || userAudioSystems[0];
        
        return {
          ...profile,
          team_memberships: teamMemberships
            .filter(membership => membership.user_id === profile.user_id),
          // Add vehicle info from primary audio system for backward compatibility
          vehicle_year: primaryAudioSystem?.vehicle_year,
          vehicle_make: primaryAudioSystem?.vehicle_make,
          vehicle_model: primaryAudioSystem?.vehicle_model,
          audio_system_description: primaryAudioSystem?.description,
          audio_systems: userAudioSystems
        };
      });
      
      setProfiles(profilesWithExtendedData as MemberProfileWithUser[]);
    } catch (error) {
      console.error('Error loading profiles:', error);
      // Only show error toast for authenticated users
      if (isAuthenticated) {
        toast.error('Failed to load member directory');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterProfiles = () => {
    let filtered = profiles;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(profile => {
        const displayName = profile.display_name?.toLowerCase() || '';
        const firstName = profile.user?.first_name?.toLowerCase() || '';
        const lastName = profile.user?.last_name?.toLowerCase() || '';
        const teamName = profile.team_name?.toLowerCase() || '';
        const vehicleMake = profile.vehicle_make?.toLowerCase() || '';
        const vehicleModel = profile.vehicle_model?.toLowerCase() || '';
        
        // Also search in team memberships
        const teamNames = (profile.team_memberships || [])
          .map(tm => tm.teams?.name?.toLowerCase() || '')
          .join(' ');
        
        return displayName.includes(search) ||
               firstName.includes(search) ||
               lastName.includes(search) ||
               teamName.includes(search) ||
               vehicleMake.includes(search) ||
               vehicleModel.includes(search) ||
               teamNames.includes(search);
      });
    }

    // Team filter
    if (filterTeam) {
      filtered = filtered.filter(profile => 
        profile.team_name?.toLowerCase().includes(filterTeam.toLowerCase())
      );
    }

    // Location filter
    if (filterLocation) {
      filtered = filtered.filter(profile => 
        profile.user?.location?.toLowerCase().includes(filterLocation.toLowerCase())
      );
    }

    setFilteredProfiles(filtered);
  };

  const getDisplayName = (profile: MemberProfileWithUser) => {
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

  const getFeaturedImage = (profile: MemberProfileWithUser) => {
    if (!profile.gallery_images || profile.gallery_images.length === 0) {
      return null;
    }

    // Determine which images to show based on authentication and profile visibility
    const allowedVisibility = isAuthenticated ? ['public', 'members_only'] : ['public'];

    // First try to find a featured image with allowed visibility
    const featuredImage = profile.gallery_images.find(
      img => img.is_featured && !img.is_banned && allowedVisibility.includes(img.visibility)
    );

    if (featuredImage) {
      return featuredImage.thumbnail_url || featuredImage.image_url;
    }

    // Otherwise use the first image with allowed visibility
    const firstImage = profile.gallery_images.find(
      img => !img.is_banned && allowedVisibility.includes(img.visibility)
    );

    return firstImage ? (firstImage.thumbnail_url || firstImage.image_url) : null;
  };

  const getVehicleInfo = (profile: MemberProfileWithUser) => {
    // If profile is public, always show vehicle info
    // Otherwise, check the show_vehicles flag (database uses show_vehicles, not show_vehicle_info)
    const shouldShowVehicle = profile.visibility === 'public' || 
                             (profile as any).show_vehicles !== false || 
                             (profile as any).show_vehicle_info !== false;
    
    if (!shouldShowVehicle) return null;
    
    // Vehicle info is now stored in the primary audio system
    const parts = [];
    if (profile.vehicle_year) parts.push(profile.vehicle_year);
    if (profile.vehicle_make) parts.push(profile.vehicle_make);
    if (profile.vehicle_model) parts.push(profile.vehicle_model);
    
    return parts.length > 0 ? parts.join(' ') : null;
  };

  const handleProfileClick = (profile: MemberProfileWithUser) => {
    if (isAuthenticated) {
      // Logged-in users go to member profile view
      navigate(`/member/${profile.user_id}`);
    } else {
      // Non-logged-in users go to public profile view
      navigate(`/public-profile/${profile.user_id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isAuthenticated ? 'Member Directory' : 'Car Audio Community'}
          </h1>
          <p className="text-gray-400">
            {isAuthenticated 
              ? 'Connect with fellow car audio enthusiasts in our community'
              : 'Discover amazing car audio builds from our community'}
          </p>
          
          {/* Join Community button for non-authenticated users */}
          {!isAuthenticated && (
            <div className="mt-4">
              <button
                onClick={() => navigate('/login')}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                Join Our Community
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Sign in to see member-only profiles and connect with more enthusiasts!
              </p>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, team, or vehicle..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-md text-white transition-colors"
            >
              <FaFilter />
              <span>Filters</span>
              {(filterTeam || filterLocation) && (
                <span className="bg-primary-600 text-xs px-2 py-1 rounded-full">
                  {[filterTeam, filterLocation].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Team
                  </label>
                  <input
                    type="text"
                    value={filterTeam}
                    onChange={(e) => setFilterTeam(e.target.value)}
                    placeholder="Filter by team name..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    placeholder="Filter by location..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {(filterTeam || filterLocation) && (
                <button
                  onClick={() => {
                    setFilterTeam('');
                    setFilterLocation('');
                  }}
                  className="mt-4 text-sm text-primary-400 hover:text-primary-300 flex items-center space-x-1"
                >
                  <FaTimes />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-400">
            Showing {filteredProfiles.length} {filteredProfiles.length === 1 ? 'profile' : 'profiles'}
            {!isAuthenticated && filteredProfiles.length > 0 && (
              <span className="text-gray-500"> (public profiles only)</span>
            )}
          </p>
        </div>

        {/* Member Grid */}
        {filteredProfiles.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">
              {searchTerm || filterTeam || filterLocation
                ? 'No profiles found matching your criteria'
                : isAuthenticated
                  ? 'No member profiles available yet'
                  : 'No public profiles available yet'}
            </p>
            {!isAuthenticated && (
              <p className="text-gray-500 mt-2">
                Sign in to see member-only profiles!
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => {
              const featuredImage = getFeaturedImage(profile);
              const vehicleInfo = getVehicleInfo(profile);
              const displayName = getDisplayName(profile);

              return (
                <div
                  key={profile.id}
                  onClick={() => handleProfileClick(profile)}
                  className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer group"
                >
                  {/* Image Section */}
                  <div className="aspect-w-16 aspect-h-9 bg-gray-700 relative h-48">
                    {featuredImage ? (
                      <img
                        src={featuredImage}
                        alt={displayName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FaMusic className="text-gray-600 text-4xl" />
                      </div>
                    )}
                    
                    {/* Team Badges - Show active public team memberships or legacy team_name */}
                    {(() => {
                      // Get public teams from team_memberships
                      const publicTeams = profile.team_memberships?.filter(tm => 
                        tm.is_active && tm.teams?.is_public
                      ) || [];
                      
                      // Use team_memberships if available, otherwise fall back to legacy team_name
                      if (publicTeams.length > 0) {
                        return publicTeams.slice(0, 2).map((membership, idx) => (
                          <div 
                            key={membership.team_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/team/${membership.team_id}`);
                            }}
                            className={`absolute ${idx === 0 ? 'top-2' : 'top-9'} left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center space-x-1 cursor-pointer hover:bg-black/90 transition-colors`}
                          >
                            <FaUsers className="w-3 h-3" />
                            <span>{membership.teams.name}</span>
                            {membership.role !== 'member' && (
                              <span className="text-primary-400">({membership.role})</span>
                            )}
                          </div>
                        ));
                      } else if (profile.team_name && (profile.visibility === 'public' || profile.show_team_info)) {
                        return (
                          <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                            <FaUsers className="w-3 h-3" />
                            <span>{profile.team_name}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Visibility Badge */}
                    <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs text-white ${
                      profile.visibility === 'public' 
                        ? 'bg-green-600/80' 
                        : 'bg-blue-600/80'
                    }`}>
                      {profile.visibility === 'public' ? 'Public' : 'Members Only'}
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">
                      {displayName}
                    </h3>

                    {/* Vehicle Info */}
                    {vehicleInfo && (
                      <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                        <FaCar className="w-4 h-4" />
                        <span>{vehicleInfo}</span>
                      </div>
                    )}

                    {/* Location */}
                    {profile.user?.location && (
                      <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                        <FaMapMarkerAlt className="w-4 h-4" />
                        <span>{profile.user.location}</span>
                      </div>
                    )}

                    {/* Audio System Preview - Always show for public profiles */}
                    {(profile.visibility === 'public' || profile.show_audio_system) && profile.audio_system_description && (
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {profile.audio_system_description}
                      </p>
                    )}

                    {/* Team Info - Show teams from team_memberships or legacy team_role */}
                    {(() => {
                      const publicTeams = profile.team_memberships?.filter(tm => 
                        tm.is_active && tm.teams?.is_public
                      ) || [];
                      
                      if (publicTeams.length > 0) {
                        return (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {publicTeams.map(membership => (
                              <button
                                key={membership.team_id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/team/${membership.team_id}`);
                                }}
                                className="text-xs bg-primary-600/20 text-primary-400 px-2 py-1 rounded hover:bg-primary-600/30 transition-colors cursor-pointer"
                              >
                                {membership.teams.name}
                                {membership.role !== 'member' && ` • ${membership.role}`}
                              </button>
                            ))}
                          </div>
                        );
                      } else if (profile.team_role && (profile.visibility === 'public' || profile.show_team_info)) {
                        return (
                          <div className="mt-2 text-xs text-primary-400">
                            {profile.team_role}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}