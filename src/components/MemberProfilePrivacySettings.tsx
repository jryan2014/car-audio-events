import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FaEye, FaEyeSlash, FaSave, FaInfoCircle, FaExternalLinkAlt, FaCar, FaCheck } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { hasDirectoryAccess } from '../utils/membershipChecks';

interface ProfilePrivacySettings {
  id?: string;
  visibility: 'private' | 'members_only' | 'public';
  display_name?: string;
  show_first_name: boolean;
  show_last_name: boolean;
  show_bio: boolean;
  show_vehicles: boolean;  // Fixed: was show_vehicle_info
  show_audio_systems: boolean;  // Fixed: was show_audio_system
  show_social_links: boolean;
  show_team_info: boolean;
  show_competition_results: boolean;
  show_events_attended: boolean;
  show_favorited_events: boolean;
  bio?: string;
  team_name?: string;
  team_role?: string;
  // Social links
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  website_url?: string;
}

// Force reload: v2
export default function MemberProfilePrivacySettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [settings, setSettings] = useState<ProfilePrivacySettings>({
    visibility: 'private',
    display_name: '',
    show_first_name: true,
    show_last_name: false,
    show_bio: true,
    show_vehicles: true,
    show_audio_systems: true,
    show_social_links: true,
    show_team_info: true,
    show_competition_results: true,
    show_events_attended: true,
    show_favorited_events: true,
    bio: '',
    team_name: '',
    team_role: ''
  });

  const hasAccess = hasDirectoryAccess(user?.membershipType);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadVehicles();
    }
  }, [user]);

  const loadVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_audio_systems')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const handleVehicleSelection = async (vehicleId: string) => {
    // Update all vehicles to not primary
    await supabase
      .from('user_audio_systems')
      .update({ is_primary: false })
      .eq('user_id', user!.id);
    
    // Set selected vehicle as primary
    const { error } = await supabase
      .from('user_audio_systems')
      .update({ is_primary: true })
      .eq('id', vehicleId);
    
    if (!error) {
      toast.success('Primary vehicle updated!');
      loadVehicles();
    } else {
      toast.error('Failed to update primary vehicle');
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_member_profile', { p_user_id: user!.id });

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
      }

      if (data && data.length > 0) {
        // Ensure all boolean fields have defined values
        setSettings({
          ...data[0],
          show_first_name: data[0].show_first_name ?? true,
          show_last_name: data[0].show_last_name ?? false,
          show_bio: data[0].show_bio ?? true,
          show_vehicles: data[0].show_vehicles ?? true,
          show_audio_systems: data[0].show_audio_systems ?? true,
          show_social_links: data[0].show_social_links ?? true,
          show_team_info: data[0].show_team_info ?? true,
          show_competition_results: data[0].show_competition_results ?? true,
          show_events_attended: data[0].show_events_attended ?? true,
          show_favorited_events: data[0].show_favorited_events ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading profile settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!hasAccess) {
      toast.error('Pro membership required for member profile');
      return;
    }

    setSaving(true);
    try {
      const profileData = {
        ...settings,
        user_id: user!.id,
      };

      // Use upsert function to create or update profile - include all parameters to avoid ambiguity
      const { data, error } = await supabase
        .rpc('upsert_member_profile', {
          p_user_id: user!.id,
          p_visibility: settings.visibility,
          p_display_name: settings.display_name || null,
          p_bio: settings.bio || null,
          p_team_name: settings.team_name || null,
          p_team_role: settings.team_role || null,
          p_show_first_name: settings.show_first_name,
          p_show_last_name: settings.show_last_name,
          p_show_bio: settings.show_bio,
          p_show_vehicles: settings.show_vehicles,
          p_show_audio_systems: settings.show_audio_systems,
          p_show_social_links: settings.show_social_links,
          p_show_team_info: settings.show_team_info,
          p_show_competition_results: true,  // Add missing parameters with defaults
          p_show_events_attended: true,
          p_show_favorited_events: true,
          p_facebook_url: settings.facebook_url || null,
          p_instagram_url: settings.instagram_url || null,
          p_youtube_url: settings.youtube_url || null,
          p_tiktok_url: settings.tiktok_url || null,
          p_twitter_url: settings.twitter_url || null,
          p_website_url: settings.website_url || null
        });

      if (error) throw error;

      toast.success('Profile settings saved successfully!');
    } catch (error) {
      console.error('Error saving profile settings:', error);
      toast.error('Failed to save profile settings');
    } finally {
      setSaving(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FaInfoCircle className="text-yellow-400 mt-1 flex-shrink-0" />
            <div>
              <h4 className="text-yellow-300 font-semibold mb-1">Pro Membership Required</h4>
              <p className="text-gray-400 text-sm">
                Member profiles are available for Pro members only. Upgrade to create your public profile, 
                upload gallery images, and connect with other members.
              </p>
              <Link 
                to="/pricing" 
                className="inline-flex items-center space-x-1 text-primary-400 hover:text-primary-300 text-sm mt-2"
              >
                <span>View Pricing</span>
                <FaExternalLinkAlt className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-700 rounded"></div>
        <div className="h-4 bg-gray-700 rounded w-1/3"></div>
        <div className="h-10 bg-gray-700 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <div>
        <h4 className="text-white font-medium mb-3">Profile Visibility</h4>
        <div className="space-y-3">
          <label className="flex items-start cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value="private"
              checked={settings.visibility === 'private'}
              onChange={(e) => setSettings({ ...settings, visibility: 'private' })}
              className="mt-1 text-primary-600 bg-gray-600 border-gray-500"
            />
            <div className="ml-3">
              <span className="text-white font-medium">Private</span>
              <p className="text-sm text-gray-400">Only you can see your profile</p>
            </div>
          </label>

          <label className="flex items-start cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value="members_only"
              checked={settings.visibility === 'members_only'}
              onChange={(e) => setSettings({ ...settings, visibility: 'members_only' })}
              className="mt-1 text-primary-600 bg-gray-600 border-gray-500"
            />
            <div className="ml-3">
              <span className="text-white font-medium">Members Only</span>
              <p className="text-sm text-gray-400">Only logged-in members can see your profile</p>
            </div>
          </label>

          <label className="flex items-start cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value="public"
              checked={settings.visibility === 'public'}
              onChange={(e) => setSettings({ ...settings, visibility: 'public' })}
              className="mt-1 text-primary-600 bg-gray-600 border-gray-500"
            />
            <div className="ml-3">
              <span className="text-white font-medium">Public</span>
              <p className="text-sm text-gray-400">Anyone can see your profile (including non-members)</p>
            </div>
          </label>
        </div>
      </div>

      {/* Display Name / Nickname */}
      <div>
        <label className="block text-gray-400 text-sm mb-2">
          Display Name (Nickname)
        </label>
        <input
          type="text"
          value={settings.display_name || ''}
          onChange={(e) => setSettings({ ...settings, display_name: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Your nickname or display name"
        />
        <p className="text-xs text-gray-500 mt-1">
          This will be shown instead of your real name if provided
        </p>
      </div>

      {/* Display Vehicle Selection */}
      <div>
        <h4 className="text-white font-medium mb-3 flex items-center">
          <FaCar className="h-5 w-5 mr-2" />
          Display Vehicle on Profile
        </h4>
        {vehicles.length > 0 ? (
          <div className="space-y-2 mb-6">
            {vehicles.map((vehicle) => (
              <label 
                key={vehicle.id} 
                className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
              >
                <input
                  type="radio"
                  name="primary_vehicle"
                  checked={vehicle.is_primary}
                  onChange={() => handleVehicleSelection(vehicle.id)}
                  className="text-primary-600"
                />
                <div className="flex-1">
                  <span className="text-gray-300 font-medium">{vehicle.name || 'Unnamed Vehicle'}</span>
                  <p className="text-gray-500 text-sm">
                    {[vehicle.vehicle_year, vehicle.vehicle_make, vehicle.vehicle_model]
                      .filter(Boolean)
                      .join(' ') || 'No details'}
                  </p>
                </div>
                {vehicle.is_primary && (
                  <FaCheck className="text-green-500" />
                )}
              </label>
            ))}
            <p className="text-xs text-gray-500 mt-2">
              The selected vehicle will be displayed on your public member profile
            </p>
          </div>
        ) : (
          <div className="bg-gray-700/50 rounded-lg p-4 text-center mb-6">
            <p className="text-gray-400 mb-2">No vehicles added yet</p>
            <Link 
              to="/member-profile-settings?tab=vehicle" 
              className="text-primary-400 hover:text-primary-300 underline"
            >
              Add your first vehicle
            </Link>
          </div>
        )}
      </div>

      {/* Information Display Settings */}
      <div>
        <h4 className="text-white font-medium mb-3">Information Display Settings</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-300">Show First Name</span>
            <input
              type="checkbox"
              checked={!!settings.show_first_name}
              onChange={(e) => setSettings({ ...settings, show_first_name: e.target.checked })}
              className="w-5 h-5 text-primary-600 bg-gray-600 border-gray-500 rounded focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-300">Show Last Name</span>
            <input
              type="checkbox"
              checked={!!settings.show_last_name}
              onChange={(e) => setSettings({ ...settings, show_last_name: e.target.checked })}
              className="w-5 h-5 text-primary-600 bg-gray-600 border-gray-500 rounded focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-300">Show Bio</span>
            <input
              type="checkbox"
              checked={!!settings.show_bio}
              onChange={(e) => setSettings({ ...settings, show_bio: e.target.checked })}
              className="w-5 h-5 text-primary-600 bg-gray-600 border-gray-500 rounded focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-300">Show Vehicle Information</span>
            <input
              type="checkbox"
              checked={!!settings.show_vehicles}
              onChange={(e) => setSettings({ ...settings, show_vehicles: e.target.checked })}
              className="w-5 h-5 text-primary-600 bg-gray-600 border-gray-500 rounded focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-300">Show Audio System Details</span>
            <input
              type="checkbox"
              checked={!!settings.show_audio_systems}
              onChange={(e) => setSettings({ ...settings, show_audio_systems: e.target.checked })}
              className="w-5 h-5 text-primary-600 bg-gray-600 border-gray-500 rounded focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-300">Show Team Information</span>
            <input
              type="checkbox"
              checked={!!settings.show_team_info}
              onChange={(e) => setSettings({ ...settings, show_team_info: e.target.checked })}
              className="w-5 h-5 text-primary-600 bg-gray-600 border-gray-500 rounded focus:ring-primary-500"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-300">Show Social Links</span>
            <input
              type="checkbox"
              checked={!!settings.show_social_links}
              onChange={(e) => setSettings({ ...settings, show_social_links: e.target.checked })}
              className="w-5 h-5 text-primary-600 bg-gray-600 border-gray-500 rounded focus:ring-primary-500"
            />
          </label>
        </div>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-gray-400 text-sm mb-2">Bio</label>
        <textarea
          value={settings.bio || ''}
          onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Tell others about yourself..."
        />
      </div>

      {/* Team Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-400 text-sm mb-2">Team Name</label>
          <input
            type="text"
            value={settings.team_name || ''}
            onChange={(e) => setSettings({ ...settings, team_name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Your team name"
          />
        </div>
        <div>
          <label className="block text-gray-400 text-sm mb-2">Team Role</label>
          <input
            type="text"
            value={settings.team_role || ''}
            onChange={(e) => setSettings({ ...settings, team_role: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Your role in the team"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Manage Your Profile</h4>
        <div className="space-y-2">
          <Link 
            to="/member-profile-settings" 
            className="flex items-center justify-between text-primary-400 hover:text-primary-300"
          >
            <span>Edit Full Profile & Gallery</span>
            <FaExternalLinkAlt className="w-4 h-4" />
          </Link>
          {settings.visibility === 'public' && (
            <Link 
              to={`/public-profile/${user?.id}`} 
              className="flex items-center justify-between text-primary-400 hover:text-primary-300"
            >
              <span>View Public Profile</span>
              <FaExternalLinkAlt className="w-4 h-4" />
            </Link>
          )}
          {settings.visibility !== 'private' && (
            <Link 
              to={`/member/${user?.id}`} 
              className="flex items-center justify-between text-primary-400 hover:text-primary-300"
            >
              <span>View Member Profile</span>
              <FaExternalLinkAlt className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Privacy Note */}
      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
        <p className="text-yellow-300 text-sm">
          <strong>Privacy Note:</strong> Your email address, phone number, and physical address will never be displayed publicly.
          Only the information you choose to share will be visible to other members.
        </p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaSave />
          <span>{saving ? 'Saving...' : 'Save Profile Settings'}</span>
        </button>
      </div>
    </div>
  );
}