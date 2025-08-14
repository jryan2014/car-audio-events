import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MemberProfileWithUser } from '../types/memberProfile';
import { FaSearch, FaFilter, FaCar, FaMusic, FaUsers, FaMapMarkerAlt, FaTimes } from 'react-icons/fa';

export default function PublicMemberDirectory() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<MemberProfileWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filteredProfiles, setFilteredProfiles] = useState<MemberProfileWithUser[]>([]);

  useEffect(() => {
    loadPublicProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [profiles, searchTerm, filterTeam, filterLocation]);

  const loadPublicProfiles = async () => {
    try {
      // Fetch only PUBLIC profiles (no auth required)
      const { data, error } = await supabase
        .from('member_profiles')
        .select(`
          *,
          user:users!user_id (
            name,
            first_name,
            last_name,
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
        .eq('visibility', 'public') // Only public profiles
        .eq('is_banned', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter to only include profiles with proper user data
      const validProfiles = (data || []).filter(profile => profile.user);
      
      setProfiles(validProfiles as MemberProfileWithUser[]);
    } catch (error) {
      console.error('Error loading public profiles:', error);
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
        
        return displayName.includes(search) ||
               firstName.includes(search) ||
               lastName.includes(search) ||
               teamName.includes(search) ||
               vehicleMake.includes(search) ||
               vehicleModel.includes(search);
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

    // First try to find a featured PUBLIC image that's not banned
    const featuredImage = profile.gallery_images.find(
      img => img.is_featured && !img.is_banned && img.visibility === 'public'
    );

    if (featuredImage) {
      return featuredImage.thumbnail_url || featuredImage.image_url;
    }

    // Otherwise use the first public image
    const firstImage = profile.gallery_images.find(
      img => !img.is_banned && img.visibility === 'public'
    );

    return firstImage ? (firstImage.thumbnail_url || firstImage.image_url) : null;
  };

  const getVehicleInfo = (profile: MemberProfileWithUser) => {
    if (!profile.show_vehicle_info) return null;
    
    const parts = [];
    if (profile.vehicle_year) parts.push(profile.vehicle_year);
    if (profile.vehicle_make) parts.push(profile.vehicle_make);
    if (profile.vehicle_model) parts.push(profile.vehicle_model);
    
    return parts.length > 0 ? parts.join(' ') : null;
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
          <h1 className="text-3xl font-bold text-white mb-2">Car Audio Community</h1>
          <p className="text-gray-400">
            Discover amazing car audio builds from our community
          </p>
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => navigate('/login')}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Join Our Community
            </button>
            <button
              onClick={() => navigate('/members')}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Member Directory
            </button>
          </div>
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
            Showing {filteredProfiles.length} public {filteredProfiles.length === 1 ? 'profile' : 'profiles'}
          </p>
        </div>

        {/* Member Grid */}
        {filteredProfiles.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-400">
              {searchTerm || filterTeam || filterLocation
                ? 'No profiles found matching your criteria'
                : 'No public profiles available yet'}
            </p>
            <p className="text-gray-500 mt-2">
              Check back soon or join our community to see member-only profiles!
            </p>
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
                  onClick={() => navigate(`/public-profile/${profile.user_id}`)}
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
                    
                    {/* Team Badge */}
                    {profile.team_name && profile.show_team_info && (
                      <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center space-x-1">
                        <FaUsers className="w-3 h-3" />
                        <span>{profile.team_name}</span>
                      </div>
                    )}

                    {/* Public Badge */}
                    <div className="absolute top-2 right-2 bg-green-600/80 text-white px-2 py-1 rounded text-xs">
                      Public
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

                    {/* Audio System Preview */}
                    {profile.show_audio_system && profile.audio_system_description && (
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {profile.audio_system_description}
                      </p>
                    )}

                    {/* Team Role */}
                    {profile.team_role && profile.show_team_info && (
                      <div className="mt-2 text-xs text-primary-400">
                        {profile.team_role}
                      </div>
                    )}
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