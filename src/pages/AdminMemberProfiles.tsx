import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MemberProfileWithUser, MemberGalleryImage } from '../types/memberProfile';
import { 
  FaSearch, FaBan, FaCheck, FaEdit, FaTrash, FaEye, FaImage,
  FaExclamationTriangle, FaTimes, FaEnvelope, FaUser
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface BanModalProps {
  profile: MemberProfileWithUser;
  onClose: () => void;
  onBan: (reason: string, sendEmail: boolean) => void;
}

const BanModal: React.FC<BanModalProps> = ({ profile, onClose, onBan }) => {
  const [reason, setReason] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a reason for the ban');
      return;
    }
    onBan(reason, sendEmail);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-white mb-4">Ban Member Profile</h3>
        <p className="text-gray-400 mb-4">
          You are about to ban the profile of <strong className="text-white">{profile.display_name || profile.user?.name}</strong>.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reason for Ban
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Explain why this profile is being banned..."
              required
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="mr-2 text-primary-600"
              />
              <span className="text-gray-300">Send email notification to member</span>
            </label>
          </div>

          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Ban Profile
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function AdminMemberProfiles() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<MemberProfileWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'banned'>('all');
  const [selectedProfile, setSelectedProfile] = useState<MemberProfileWithUser | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [profileToBan, setProfileToBan] = useState<MemberProfileWithUser | null>(null);
  const [galleryImages, setGalleryImages] = useState<Record<string, MemberGalleryImage[]>>({});

  useEffect(() => {
    if (user?.membershipType === 'admin') {
      loadProfiles();
    }
  }, [user]);

  const loadProfiles = async () => {
    try {
      // Fetch all profiles with user information
      const { data, error } = await supabase
        .from('member_profiles')
        .select(`
          *,
          user:users!user_id (
            id,
            name,
            first_name,
            last_name,
            email,
            location,
            membership_type,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProfiles(data as MemberProfileWithUser[]);

      // Load gallery images for all profiles
      const profileIds = data.map(p => p.id);
      const { data: imagesData, error: imagesError } = await supabase
        .from('member_gallery_images')
        .select('*')
        .in('profile_id', profileIds)
        .order('display_order', { ascending: true });

      if (imagesError) throw imagesError;

      // Group images by profile_id
      const imagesByProfile: Record<string, MemberGalleryImage[]> = {};
      imagesData?.forEach(img => {
        if (!imagesByProfile[img.profile_id]) {
          imagesByProfile[img.profile_id] = [];
        }
        imagesByProfile[img.profile_id].push(img);
      });
      
      setGalleryImages(imagesByProfile);
    } catch (error) {
      console.error('Error loading profiles:', error);
      toast.error('Failed to load member profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleBanProfile = async (profile: MemberProfileWithUser, reason: string, sendEmail: boolean) => {
    try {
      // Update profile ban status
      const { error: profileError } = await supabase
        .from('member_profiles')
        .update({
          is_banned: true,
          ban_reason: reason,
          banned_at: new Date().toISOString(),
          banned_by: user!.id
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Send email notification if requested
      if (sendEmail && profile.user?.email) {
        const { error: emailError } = await supabase
          .from('email_queue')
          .insert([{
            to_email: profile.user.email,
            subject: 'Your Member Profile Has Been Restricted',
            html_content: `
              <h2>Member Profile Restricted</h2>
              <p>Hello ${profile.user.name || 'Member'},</p>
              <p>Your member profile on Car Audio Events has been temporarily restricted by an administrator.</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p>If you believe this was done in error or would like to appeal this decision, please contact our support team.</p>
              <p>Once you have addressed the issue, your profile can be reinstated.</p>
              <p>Thank you for your understanding.</p>
              <p>Best regards,<br>Car Audio Events Team</p>
            `,
            status: 'pending',
            template_id: 'admin_notification'
          }]);

        if (emailError) {
          console.error('Failed to queue email:', emailError);
        }
      }

      toast.success('Profile banned successfully');
      setShowBanModal(false);
      setProfileToBan(null);
      loadProfiles();
    } catch (error) {
      console.error('Error banning profile:', error);
      toast.error('Failed to ban profile');
    }
  };

  const handleUnbanProfile = async (profile: MemberProfileWithUser) => {
    try {
      const { error } = await supabase
        .from('member_profiles')
        .update({
          is_banned: false,
          ban_reason: null,
          banned_at: null,
          banned_by: null
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Profile unbanned successfully');
      loadProfiles();
    } catch (error) {
      console.error('Error unbanning profile:', error);
      toast.error('Failed to unban profile');
    }
  };

  const handleBanImage = async (imageId: string, profileId: string) => {
    try {
      const { error } = await supabase
        .from('member_gallery_images')
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          banned_by: user!.id
        })
        .eq('id', imageId);

      if (error) throw error;

      toast.success('Image banned successfully');
      
      // Reload images for this profile
      const { data, error: fetchError } = await supabase
        .from('member_gallery_images')
        .select('*')
        .eq('profile_id', profileId)
        .order('display_order', { ascending: true });

      if (!fetchError && data) {
        setGalleryImages(prev => ({
          ...prev,
          [profileId]: data
        }));
      }
    } catch (error) {
      console.error('Error banning image:', error);
      toast.error('Failed to ban image');
    }
  };

  const handleUnbanImage = async (imageId: string, profileId: string) => {
    try {
      const { error } = await supabase
        .from('member_gallery_images')
        .update({
          is_banned: false,
          ban_reason: null,
          banned_at: null,
          banned_by: null
        })
        .eq('id', imageId);

      if (error) throw error;

      toast.success('Image unbanned successfully');
      
      // Reload images for this profile
      const { data, error: fetchError } = await supabase
        .from('member_gallery_images')
        .select('*')
        .eq('profile_id', profileId)
        .order('display_order', { ascending: true });

      if (!fetchError && data) {
        setGalleryImages(prev => ({
          ...prev,
          [profileId]: data
        }));
      }
    } catch (error) {
      console.error('Error unbanning image:', error);
      toast.error('Failed to unban image');
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        profile.display_name?.toLowerCase().includes(search) ||
        profile.user?.name?.toLowerCase().includes(search) ||
        profile.user?.email?.toLowerCase().includes(search) ||
        profile.team_name?.toLowerCase().includes(search);
      
      if (!matchesSearch) return false;
    }

    // Filter by status
    if (filterStatus === 'banned' && !profile.is_banned) return false;
    if (filterStatus === 'active' && profile.is_banned) return false;

    return true;
  });

  if (!user || user.membershipType !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-red-300">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Member Profile Management</h1>
        <p className="text-gray-400">Manage member profiles, galleries, and visibility settings</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or team..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Profiles</option>
            <option value="active">Active Only</option>
            <option value="banned">Banned Only</option>
          </select>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Visibility
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Images
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredProfiles.map((profile) => {
                const imageCount = galleryImages[profile.id]?.length || 0;
                const bannedImageCount = galleryImages[profile.id]?.filter(img => img.is_banned).length || 0;
                
                return (
                  <tr key={profile.id} className="hover:bg-gray-750">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FaUser className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {profile.display_name || profile.user?.name || 'No Name'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {profile.user?.membership_type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {profile.user?.email}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                      {profile.team_name || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {profile.is_banned ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/20 text-red-400 border border-red-800">
                          <FaBan className="mr-1" />
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/20 text-green-400 border border-green-800">
                          <FaCheck className="mr-1" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {profile.visibility === 'public' ? (
                        <span className="text-sm text-green-400">Public</span>
                      ) : (
                        <span className="text-sm text-gray-500">Private</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-300">{imageCount}</span>
                        {bannedImageCount > 0 && (
                          <span className="text-xs text-red-400">({bannedImageCount} banned)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedProfile(profile)}
                          className="text-blue-400 hover:text-blue-300"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        
                        {profile.is_banned ? (
                          <button
                            onClick={() => handleUnbanProfile(profile)}
                            className="text-green-400 hover:text-green-300"
                            title="Unban Profile"
                          >
                            <FaCheck />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setProfileToBan(profile);
                              setShowBanModal(true);
                            }}
                            className="text-red-400 hover:text-red-300"
                            title="Ban Profile"
                          >
                            <FaBan />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Details Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Profile Details</h2>
              <button
                onClick={() => setSelectedProfile(null)}
                className="text-gray-400 hover:text-white"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Profile Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Profile Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Display Name</p>
                    <p className="text-white">{selectedProfile.display_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Team</p>
                    <p className="text-white">{selectedProfile.team_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Visibility</p>
                    <p className="text-white">{selectedProfile.visibility === 'public' ? 'Public' : selectedProfile.visibility === 'members_only' ? 'Members Only' : 'Private'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Created</p>
                    <p className="text-white">
                      {format(new Date(selectedProfile.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {selectedProfile.is_banned && (
                  <div className="mt-4 p-4 bg-red-900/20 border border-red-700 rounded-lg">
                    <p className="text-red-400 font-semibold mb-2">Ban Information</p>
                    <p className="text-sm text-gray-300">
                      <strong>Reason:</strong> {selectedProfile.ban_reason}
                    </p>
                    <p className="text-sm text-gray-300">
                      <strong>Date:</strong> {selectedProfile.banned_at && format(new Date(selectedProfile.banned_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                )}
              </div>

              {/* Gallery Images */}
              {galleryImages[selectedProfile.id] && galleryImages[selectedProfile.id].length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Gallery Images</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {galleryImages[selectedProfile.id].map((image) => (
                      <div key={image.id} className="relative group">
                        <img
                          src={image.thumbnail_url || image.image_url}
                          alt={image.caption || 'Gallery image'}
                          className={`w-full h-32 object-cover rounded-lg ${image.is_banned ? 'opacity-50' : ''}`}
                        />
                        
                        {image.is_banned && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">
                              Banned
                            </span>
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p>{image.visibility}</p>
                          {image.caption && <p className="truncate">{image.caption}</p>}
                        </div>

                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {image.is_banned ? (
                            <button
                              onClick={() => handleUnbanImage(image.id, selectedProfile.id)}
                              className="bg-green-600 hover:bg-green-700 text-white p-1 rounded"
                              title="Unban Image"
                            >
                              <FaCheck className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBanImage(image.id, selectedProfile.id)}
                              className="bg-red-600 hover:bg-red-700 text-white p-1 rounded"
                              title="Ban Image"
                            >
                              <FaBan className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && profileToBan && (
        <BanModal
          profile={profileToBan}
          onClose={() => {
            setShowBanModal(false);
            setProfileToBan(null);
          }}
          onBan={(reason, sendEmail) => handleBanProfile(profileToBan, reason, sendEmail)}
        />
      )}
    </div>
  );
}