import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MemberProfile, MemberGalleryImage } from '../types/memberProfile';
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok, FaTwitter, FaGlobe, FaTrash, FaUpload, FaEye, FaEyeSlash, FaSave, FaCar, FaMusic, FaUsers, FaUser, FaImage, FaLock, FaCrown, FaPlus, FaArrowLeft, FaEdit, FaTimes, FaVolumeUp, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { hasDirectoryAccess, getMembershipFeatures } from '../utils/membershipChecks';

export default function MemberProfileSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Helper function to format system type for display
  const formatSystemType = (type: string | null | undefined): string => {
    if (!type) return 'Not specified';
    
    // Map database values to display values
    const displayMap: {[key: string]: string} = {
      'sound_quality': 'SQ',
      'sq': 'SQ',
      'sound_pressure_level': 'SPL',
      'spl': 'SPL',
      'hybrid': 'Hybrid',
      'stock': 'Stock',
      'daily': 'Daily',
      'competition': 'Competition',
      'show': 'Show'
    };
    
    const mapped = displayMap[type.toLowerCase()];
    if (mapped) return mapped;
    
    // For any other values, capitalize first letter
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };
  const [profile, setProfile] = useState<Partial<MemberProfile>>({});
  const [galleryImages, setGalleryImages] = useState<MemberGalleryImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'vehicle' | 'social' | 'gallery'>('profile');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [editedVehicle, setEditedVehicle] = useState<any>(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [newVehicle, setNewVehicle] = useState<any>({
    year: '',
    make: '',
    model: '',
    color: '',
    description: '',
    audio_components: []
  });
  const [editingComponent, setEditingComponent] = useState<{ vehicleId: string, index: number } | null>(null);
  const [editedComponent, setEditedComponent] = useState<any>(null);
  const [showAddComponent, setShowAddComponent] = useState<string | null>(null); // Vehicle ID for which to show add component form
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set()); // Track which vehicle accordions are expanded
  const [newComponent, setNewComponent] = useState<any>({
    category: '',
    brand: '',
    model: '',
    power_watts: '',
    description: '',
    cost: '',
    serial_number: '',
    quantity: 1,
    // Amplifier specific
    amplifier_type: '', // mono, stereo, multi-channel
    class_type: '', // A, AB, D, H, GH
    ohm_load: '',
    channels: '',
    // Speaker/Subwoofer specific
    voice_coil: '', // single, dual, quad
    size: '', // 8", 10", 12", etc.
    impedance: '', // 1Ω, 2Ω, 4Ω, 8Ω
    // Speaker specific (not subwoofer)
    driver_type: '', // tweeter, midrange, mid-bass, full-range
    cone_material: '', // carbon fiber, kevlar, paper, etc.
    magnet_type: '', // neodymium, ferrite, alnico
    surround_material: '', // rubber, foam, cloth
    sensitivity_db: '', // dB rating
    frequency_response: '', // Hz range
    mounting_depth: '', // inches or mm
    cutout_diameter: '', // inches or mm
    crossover_included: '', // yes/no
    crossover_points: '', // Hz if applicable
    // Wiring specific
    wire_type: '', // Power, Ground, Speaker, RCA
    wire_gauge: '',
    wire_length: '',
    wire_material: '', // OFC, CCA, Silver
    rca_length: '',
    // Enclosure specific
    enclosure_type: '', // Sealed, Ported, Bandpass
    internal_volume: '', // cubic feet
    port_area: '', // square inches
    port_length: '', // inches
    tuning_frequency: '', // Hz
    build_type: '', // Pre-built, Custom
    // Sound Dampening specific
    square_footage: '', // sq ft of coverage
    material_type: '', // Foam, MLV, CLD, etc.
    thickness: '', // mils
    // Battery specific
    amp_hours: '', // Ah
    cca: '', // Cold Cranking Amps
    battery_type: '', // AGM, Lithium, Flooded
    // Alternator specific
    max_output: '', // Amps
    idle_output: '', // Amps at idle
    // DSP specific
    channel_config: '', // e.g., 8x12, 6x8, etc.
    input_channels: '', // for custom config
    output_channels: '', // for custom config
    processing_type: '', // Parametric EQ, Time Alignment, etc.
    sample_rate: '', // 24-bit/96kHz, etc.
    control_interface: '', // PC Software, Mobile App, etc.
    presets: '', // Number of presets available
    // Head Unit specific
    screen_size: '',
    display_type: '', // Touch, Non-touch, etc.
    preamp_outputs: '',
    // Fuses specific
    fuse_type: '', // ANL, Mini-ANL, ATC, etc.
    amp_rating: '', // Current rating
    // Capacitor specific
    capacitance: '', // Farads
    voltage_rating: '' // Voltage rating
  });

  // Check if user has access to directory features
  const hasAccess = hasDirectoryAccess(user?.membershipType);
  const features = getMembershipFeatures(user?.membershipType);

  useEffect(() => {
    if (user) {
      if (!hasAccess) {
        // Redirect free members away from this page
        toast.error('Member directory is only available for Pro members');
        navigate('/pricing');
        return;
      }
      loadProfile();
      loadGalleryImages();
      loadVehicles();
    }
  }, [user, hasAccess, navigate]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_member_profile', { p_user_id: user!.id });

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
      }

      if (data && data.length > 0) {
        // Only load content fields, not privacy settings
        const { 
          display_name, bio, team_name, team_role,
          facebook_url, instagram_url, youtube_url, 
          tiktok_url, twitter_url, website_url, id
        } = data[0];
        
        setProfile({
          id,
          display_name,
          bio,
          team_name,
          team_role,
          facebook_url,
          instagram_url,
          youtube_url,
          tiktok_url,
          twitter_url,
          website_url
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGalleryImages = async () => {
    try {
      const { data, error } = await supabase
        .from('member_gallery_images')
        .select('*')
        .eq('user_id', user!.id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setGalleryImages(data || []);
    } catch (error) {
      console.error('Error loading gallery:', error);
      toast.error('Failed to load gallery images');
    }
  };

  const loadVehicles = async () => {
    try {
      // For now, we'll use the existing user_audio_systems table but treat it as vehicles
      // In a future migration, this could be moved to a dedicated user_vehicles table
      const { data, error } = await supabase
        .from('user_audio_systems')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Use the raw data without transformation to avoid field mapping issues
      const vehicleData = (data || []).map(item => ({
        ...item,
        audio_components: item.components || []
      }));

      setVehicles(vehicleData);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const toggleVehicleAccordion = (vehicleId: string) => {
    setExpandedVehicles(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(vehicleId)) {
        newExpanded.delete(vehicleId);
      } else {
        newExpanded.add(vehicleId);
      }
      return newExpanded;
    });
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      // Only save content fields, NOT privacy settings (those are managed in /profile?tab=settings)
      // First, get the current privacy settings to preserve them
      const { data: currentProfile } = await supabase
        .rpc('get_member_profile', { p_user_id: user!.id });
      
      const currentSettings = currentProfile?.[0] || {};
      
      // Use upsert function to update profile content ONLY
      const { data, error } = await supabase
        .rpc('upsert_member_profile', {
          p_user_id: user!.id,
          // Preserve existing privacy settings
          p_visibility: currentSettings.visibility || 'private',
          p_show_first_name: currentSettings.show_first_name ?? true,
          p_show_last_name: currentSettings.show_last_name ?? false,
          p_show_bio: currentSettings.show_bio ?? true,
          p_show_vehicles: currentSettings.show_vehicles ?? true,
          p_show_audio_systems: currentSettings.show_audio_systems ?? true,
          p_show_social_links: currentSettings.show_social_links ?? true,
          p_show_team_info: currentSettings.show_team_info ?? true,
          p_show_competition_results: currentSettings.show_competition_results ?? true,
          p_show_events_attended: currentSettings.show_events_attended ?? true,
          p_show_favorited_events: currentSettings.show_favorited_events ?? true,
          // Update only content fields from this page
          p_display_name: profile.display_name || null,
          p_bio: profile.bio || null,
          p_team_name: profile.team_name || null,
          p_team_role: profile.team_role || null,
          p_facebook_url: profile.facebook_url || null,
          p_instagram_url: profile.instagram_url || null,
          p_youtube_url: profile.youtube_url || null,
          p_tiktok_url: profile.tiktok_url || null,
          p_twitter_url: profile.twitter_url || null,
          p_website_url: profile.website_url || null
        });

      if (error) throw error;

      // Update the profile id if it was just created
      if (data && !profile.id) {
        setProfile({ ...profile, id: data });
      }

      toast.success('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Helper function to optimize image before upload
  const optimizeImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        // Calculate new dimensions (max 1920px width, maintain aspect ratio)
        let width = img.width;
        let height = img.height;
        const maxWidth = 1920;
        const maxHeight = 1920;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress image
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to optimize image'));
            }
          },
          'image/jpeg',
          0.85 // 85% quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if user has reached the 25 image limit
    if (galleryImages.length >= 25) {
      toast.error('You have reached the maximum limit of 25 images');
      return;
    }

    const file = files[0];
    
    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      toast.error('Only JPEG and PNG images are allowed');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      // First ensure profile exists
      let profileId = profile.id;
      if (!profileId) {
        // Create profile using the RPC function if it doesn't exist
        const { data: newProfileId, error: profileError } = await supabase
          .rpc('upsert_member_profile', {
            p_user_id: user!.id,
            p_visibility: 'private',
            p_display_name: null,
            p_bio: null,
            p_team_name: null,
            p_team_role: null,
            p_show_first_name: true,
            p_show_last_name: false,
            p_show_bio: true,
            p_show_vehicles: true,
            p_show_audio_systems: true,
            p_show_social_links: true,
            p_show_team_info: true,
            p_show_competition_results: true,
            p_show_events_attended: true,
            p_show_favorited_events: true,
            p_facebook_url: null,
            p_instagram_url: null,
            p_youtube_url: null,
            p_tiktok_url: null,
            p_twitter_url: null,
            p_website_url: null
          });

        if (profileError) throw profileError;
        profileId = newProfileId;
        setProfile({ ...profile, id: profileId });
      }

      // Optimize image before upload
      let imageToUpload: Blob | File = file;
      
      // Only optimize if it's an image that needs it
      if (file.size > 1024 * 1024 || file.type !== 'image/jpeg') { // If > 1MB or not JPEG
        try {
          const optimizedBlob = await optimizeImage(file);
          imageToUpload = optimizedBlob;
          console.log(`Image optimized: ${file.size} bytes -> ${optimizedBlob.size} bytes`);
        } catch (error) {
          console.warn('Image optimization failed, using original:', error);
          // Continue with original file if optimization fails
        }
      }

      // Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user!.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('member-gallery')
        .upload(fileName, imageToUpload, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('member-gallery')
        .getPublicUrl(fileName);

      // Generate thumbnail URL with transform parameters
      const thumbnailUrl = `${publicUrl}?width=400&height=400&resize=contain`;

      // Save image record to database
      const imageData: Partial<MemberGalleryImage> = {
        profile_id: profileId,
        user_id: user!.id,
        image_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        visibility: 'member_only',
        display_order: galleryImages.length,
        is_featured: galleryImages.length === 0, // First image is featured by default
        file_size: imageToUpload instanceof Blob ? imageToUpload.size : file.size,
        mime_type: file.type,
      };

      const { data: newImage, error: dbError } = await supabase
        .from('member_gallery_images')
        .insert([imageData])
        .select()
        .single();

      if (dbError) throw dbError;

      setGalleryImages([...galleryImages, newImage]);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const deleteImage = async (imageId: string, imageUrl: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('member_gallery_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;

      // Delete from storage
      const fileName = imageUrl.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('member-gallery')
          .remove([`${user!.id}/${fileName}`]);

        if (storageError) console.error('Storage deletion error:', storageError);
      }

      setGalleryImages(galleryImages.filter(img => img.id !== imageId));
      toast.success('Image deleted successfully');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
    }
  };

  const updateImageSettings = async (imageId: string, updates: Partial<MemberGalleryImage>) => {
    try {
      // If setting as featured, unset all other featured images first
      if (updates.is_featured === true) {
        // Unset any currently featured images
        const currentlyFeatured = galleryImages.filter(img => img.is_featured && img.id !== imageId);
        if (currentlyFeatured.length > 0) {
          const { error: unfeaturedError } = await supabase
            .from('member_gallery_images')
            .update({ is_featured: false })
            .eq('user_id', user!.id)
            .eq('is_featured', true);

          if (unfeaturedError) throw unfeaturedError;
        }
      }

      // Now update the selected image
      const { error } = await supabase
        .from('member_gallery_images')
        .update(updates)
        .eq('id', imageId);

      if (error) throw error;

      // Update local state
      if (updates.is_featured === true) {
        // Unset all other featured images in local state
        setGalleryImages(galleryImages.map(img => ({
          ...img,
          is_featured: img.id === imageId ? true : false,
          ...((img.id === imageId) ? updates : {})
        })));
        toast.success('Image set as featured for your profile header!');
      } else {
        setGalleryImages(galleryImages.map(img => 
          img.id === imageId ? { ...img, ...updates } : img
        ));
        toast.success('Image settings updated');
      }
    } catch (error) {
      console.error('Error updating image:', error);
      toast.error('Failed to update image settings');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-4">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <FaArrowLeft />
          <span>Back to Dashboard</span>
        </Link>
      </div>
      <div className="bg-gray-800 rounded-lg shadow-xl">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">Member Directory Profile Settings</h1>
              <p className="text-gray-400 mt-2">
                Manage your public profile that will be displayed in the member directory
              </p>
            </div>
            <Link
              to={`/member/${user?.id}`}
              target="_blank"
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors ml-4"
            >
              <FaEye />
              <span>Preview Profile</span>
            </Link>
          </div>
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>Privacy Settings:</strong> To control your profile visibility and what information is displayed, go to your{' '}
              <Link to="/profile?tab=settings" className="text-primary-400 hover:text-primary-300 underline font-semibold">
                Profile Settings → Member Profile Directory
              </Link>.
              This page is for editing your profile content only.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-700 bg-gray-750">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'profile', label: 'Profile Info', icon: FaUser },
              { id: 'vehicle', label: 'Vehicle & Audio', icon: FaCar },
              { id: 'social', label: 'Social Links', icon: FaGlobe },
              { id: 'gallery', label: 'Gallery', icon: FaImage },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Info Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Display Name (Nickname)
                  </label>
                  <input
                    type="text"
                    value={profile.display_name || ''}
                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter your display name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={profile.team_name || ''}
                    onChange={(e) => setProfile({ ...profile, team_name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Your team name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Team Role
                  </label>
                  <input
                    type="text"
                    value={profile.team_role || ''}
                    onChange={(e) => setProfile({ ...profile, team_role: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Your role in the team"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Tell others about yourself..."
                />
              </div>
            </div>
          )}

          {/* Vehicle & Audio Tab */}
          {activeTab === 'vehicle' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Your Vehicles</h3>
                <button
                  onClick={() => setShowAddVehicle(!showAddVehicle)}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
                >
                  <FaPlus />
                  <span>Add New Vehicle</span>
                </button>
              </div>

              {/* Add New Vehicle Form */}
              {showAddVehicle && (
                <div className="bg-gray-700 rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold text-white mb-4">Add New Vehicle</h4>
                  

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Year</label>
                      <input
                        type="number"
                        value={newVehicle.year}
                        onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_year: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                        placeholder="2024"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Make</label>
                      <input
                        type="text"
                        value={newVehicle.make}
                        onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_make: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                        placeholder="Ford"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Model</label>
                      <input
                        type="text"
                        value={newVehicle.model}
                        onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_model: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                        placeholder="F-150"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Color</label>
                      <input
                        type="text"
                        value={newVehicle.color}
                        onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                        placeholder="Black"
                      />
                    </div>
                  </div>


                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-1">Description</label>
                    <textarea
                      value={newVehicle.description}
                      onChange={(e) => setNewVehicle({ ...newVehicle, description: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded"
                      rows={3}
                      placeholder="Describe your vehicle and build..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setShowAddVehicle(false);
                        setNewVehicle({
                          year: '',
                          make: '',
                          model: '',
                          color: '',
                          description: '',
                          audio_components: []
                        });
                      }}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        const vehicleData = {
                          user_id: user!.id,
                          vehicle_year: newVehicle.year ? parseInt(newVehicle.year) : null,
                          vehicle_make: newVehicle.make,
                          vehicle_model: newVehicle.model,
                          vehicle_color: newVehicle.color,
                          description: newVehicle.description,
                          components: newVehicle.audio_components,
                          name: `${newVehicle.year || ''} ${newVehicle.make || ''} ${newVehicle.model || ''}`.trim(),
                          system_type: 'hybrid', // Default to hybrid for vehicle-based entry
                          is_primary: vehicles.length === 0
                        };
                        
                        const { error } = await supabase
                          .from('user_audio_systems')
                          .insert([vehicleData]);
                        
                        if (!error) {
                          toast.success('Vehicle added!');
                          loadVehicles();
                          setShowAddVehicle(false);
                          setNewVehicle({
                            year: '',
                            make: '',
                            model: '',
                            color: '',
                            description: '',
                            audio_components: []
                          });
                        } else {
                          toast.error('Failed to add vehicle');
                        }
                      }}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors"
                    >
                      Add Vehicle
                    </button>
                  </div>
                </div>
              )}
              
              {vehicles.length === 0 && !showAddVehicle ? (
                <div className="bg-gray-700 rounded-lg p-6 text-center">
                  <FaCar className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">No vehicles added yet</p>
                  <p className="text-sm text-gray-500">Add your first vehicle to display it on your member profile</p>
                </div>
              ) : vehicles.length > 0 ? (
                <div className="space-y-6">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="bg-gray-700 rounded-lg overflow-hidden">
                      {/* Vehicle Header - Always Visible */}
                      <div 
                        className="p-6 cursor-pointer hover:bg-gray-650 transition-colors"
                        onClick={() => toggleVehicleAccordion(vehicle.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-3">
                            {/* Chevron Icon */}
                            <div className="text-gray-400">
                              {expandedVehicles.has(vehicle.id) ? (
                                <FaChevronUp className="w-4 h-4" />
                              ) : (
                                <FaChevronDown className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              {vehicle.is_primary && (
                                <span className="inline-block px-2 py-1 bg-primary-600 text-white text-xs rounded mb-2">
                                  Primary System
                                </span>
                              )}
                              {editingVehicle === vehicle.id ? (
                                <input
                                  type="text"
                                  value={editedVehicle?.name || ''}
                                  onChange={(e) => setEditedVehicle({ ...editedVehicle, name: e.target.value })}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xl font-semibold bg-gray-600 text-white px-2 py-1 rounded"
                                  placeholder="Vehicle Name"
                                />
                              ) : (
                                vehicle.name && (
                                  <h4 className="text-xl font-semibold text-white">{vehicle.name}</h4>
                                )
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                            {editingVehicle === vehicle.id ? (
                            <>
                              <button
                                onClick={async () => {
                                  // Map system_type to valid database values
                                  let validSystemType = null;
                                  if (editedVehicle.system_type) {
                                    const typeMap: {[key: string]: string} = {
                                      'SQ': 'sound_quality',
                                      'SPL': 'spl',
                                      'Daily': 'hybrid',
                                      'Show': 'show',
                                      'Competition': 'hybrid',
                                      'sound_quality': 'sound_quality',
                                      'spl': 'spl',
                                      'hybrid': 'hybrid',
                                      'show': 'show'
                                    };
                                    validSystemType = typeMap[editedVehicle.system_type] || null;
                                  }
                                  
                                  // Clean up data before update - only send expected fields
                                  const updateData: any = {
                                    name: editedVehicle.name || `${editedVehicle.vehicle_year || ''} ${editedVehicle.vehicle_make || ''} ${editedVehicle.vehicle_model || ''}`.trim() || 'My Vehicle',
                                    description: editedVehicle.description || null,
                                    vehicle_year: editedVehicle.vehicle_year ? parseInt(editedVehicle.vehicle_year) : null,
                                    vehicle_make: editedVehicle.vehicle_make || null,
                                    vehicle_model: editedVehicle.vehicle_model || null,
                                    vehicle_color: editedVehicle.vehicle_color || null,
                                    system_type: validSystemType,
                                    total_power_watts: editedVehicle.total_power_watts ? parseInt(editedVehicle.total_power_watts) : null,
                                    estimated_cost: editedVehicle.estimated_cost ? parseFloat(editedVehicle.estimated_cost) : null,
                                    components: editedVehicle.audio_components || editedVehicle.components || []
                                  };
                                  
                                  // Remove any undefined values
                                  Object.keys(updateData).forEach(key => {
                                    if (updateData[key] === undefined) {
                                      delete updateData[key];
                                    }
                                  });
                                  
                                  const { error } = await supabase
                                    .from('user_audio_systems')
                                    .update(updateData)
                                    .eq('id', vehicle.id);
                                  
                                  if (!error) {
                                    toast.success('Vehicle updated!');
                                    loadVehicles();
                                    setEditingVehicle(null);
                                    setEditedVehicle(null);
                                  } else {
                                    console.error('Update error:', error);
                                    toast.error(`Failed to update vehicle: ${error.message}`);
                                  }
                                }}
                                className="text-green-400 hover:text-green-300"
                                title="Save"
                              >
                                <FaSave className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingVehicle(null);
                                  setEditedVehicle(null);
                                }}
                                className="text-gray-400 hover:text-gray-300"
                                title="Cancel"
                              >
                                <FaTimes className="w-5 h-5" />
                              </button>
                            </>
                          ) : (
                            <>
                              {vehicle.is_primary && (
                                <Link
                                  to="/audio-system/diagram-editor"
                                  className="text-blue-400 hover:text-blue-300"
                                  title="Edit Diagram"
                                >
                                  <Edit3 className="w-5 h-5" />
                                </Link>
                              )}
                              <button
                                onClick={() => {
                                  setEditingVehicle(vehicle.id);
                                  setEditedVehicle(vehicle);
                                }}
                                className="text-primary-400 hover:text-primary-300"
                                title="Edit"
                              >
                                <FaEdit className="w-5 h-5" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm('Are you sure you want to delete this vehicle?')) {
                                    const { error } = await supabase
                                      .from('user_audio_systems')
                                      .delete()
                                      .eq('id', vehicle.id);
                                    
                                    if (!error) {
                                      toast.success('Vehicle deleted');
                                      loadVehicles();
                                    } else {
                                      toast.error('Failed to delete vehicle');
                                    }
                                  }
                                }}
                                className="text-red-400 hover:text-red-300"
                                title="Delete"
                              >
                                <FaTrash className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                      
                      {/* Collapsible Content */}
                      {expandedVehicles.has(vehicle.id) && (
                        <div className="p-6 pt-0 border-t border-gray-600">
                          {/* Vehicle Information */}
                          <div className="mb-6">
                        <h5 className="text-white font-medium mb-3 flex items-center">
                          <FaCar className="mr-2" />
                          Vehicle Information
                        </h5>
                        {editingVehicle === vehicle.id ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Year</label>
                              <input
                                type="number"
                                value={editedVehicle?.vehicle_year || ''}
                                onChange={(e) => setEditedVehicle({ ...editedVehicle, vehicle_year: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g. 2020"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Make</label>
                              <input
                                type="text"
                                value={editedVehicle?.vehicle_make || ''}
                                onChange={(e) => setEditedVehicle({ ...editedVehicle, vehicle_make: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g. Honda"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Model</label>
                              <input
                                type="text"
                                value={editedVehicle?.vehicle_model || ''}
                                onChange={(e) => setEditedVehicle({ ...editedVehicle, vehicle_model: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g. Civic"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                              <input
                                type="text"
                                value={editedVehicle?.vehicle_color || ''}
                                onChange={(e) => setEditedVehicle({ ...editedVehicle, vehicle_color: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g. Red"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">System Type</label>
                              <select
                                value={editedVehicle?.system_type || ''}
                                onChange={(e) => setEditedVehicle({ ...editedVehicle, system_type: e.target.value })}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="">Select type</option>
                                <option value="sound_quality">SQ (Sound Quality)</option>
                                <option value="spl">SPL (Sound Pressure Level)</option>
                                <option value="hybrid">Hybrid</option>
                                <option value="stock">Stock</option>
                                <option value="daily">Daily Driver</option>
                                <option value="competition">Competition</option>
                                <option value="show">Show Car</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-1">Total Power (Watts)</label>
                              <input
                                type="number"
                                value={editedVehicle?.total_power_watts || ''}
                                onChange={(e) => setEditedVehicle({ ...editedVehicle, total_power_watts: parseInt(e.target.value) || '' })}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="e.g. 5000"
                              />
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                              <textarea
                                value={editedVehicle?.description || ''}
                                onChange={(e) => setEditedVehicle({ ...editedVehicle, description: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Describe your vehicle and audio setup..."
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <span className="text-gray-400 text-sm">Year:</span>
                              <p className="text-white">{vehicle.vehicle_year || 'Not specified'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 text-sm">Make:</span>
                              <p className="text-white">{vehicle.vehicle_make || 'Not specified'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 text-sm">Model:</span>
                              <p className="text-white">{vehicle.vehicle_model || 'Not specified'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 text-sm">Color:</span>
                              <p className="text-white">{vehicle.vehicle_color || 'Not specified'}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 text-sm">System Type:</span>
                              <p className="text-white">{formatSystemType(vehicle.system_type)}</p>
                            </div>
                            <div>
                              <span className="text-gray-400 text-sm">Total Power:</span>
                              <p className="text-white">{vehicle.total_power_watts ? `${vehicle.total_power_watts.toLocaleString()} Watts` : 'Not specified'}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Audio Components */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-white font-medium flex items-center">
                            <FaVolumeUp className="mr-2" />
                            Audio Components
                          </h5>
                          <button
                            onClick={() => setShowAddComponent(vehicle.id)}
                            className="text-sm bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded-md flex items-center"
                          >
                            <FaPlus className="mr-1" />
                            Add Component
                          </button>
                        </div>

                        {/* Add Component Form */}
                        {showAddComponent === vehicle.id && (
                          <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 mb-4">
                            <h6 className="text-white font-medium mb-3">Add Audio Component</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                                <select
                                  value={newComponent.category}
                                  onChange={(e) => setNewComponent({ ...newComponent, category: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                  <option value="">Select category</option>
                                  <option value="Head Unit">Head Unit</option>
                                  <option value="Amplifier">Amplifier</option>
                                  <option value="Subwoofer">Subwoofer</option>
                                  <option value="Speaker">Speaker</option>
                                  <option value="DSP">DSP/Signal Processor</option>
                                  <option value="Capacitor">Capacitor</option>
                                  <option value="Battery">Battery</option>
                                  <option value="Alternator">Alternator</option>
                                  <option value="Wiring">Wiring</option>
                                  <option value="Enclosure">Enclosure/Box</option>
                                  <option value="Sound Dampening">Sound Dampening</option>
                                  <option value="Fuses">Fuses/Distribution</option>
                                  <option value="Other">Other/Accessories</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Brand</label>
                                <input
                                  type="text"
                                  value={newComponent.brand}
                                  onChange={(e) => setNewComponent({ ...newComponent, brand: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  placeholder="e.g. Pioneer, Alpine, JL Audio"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Model</label>
                                <input
                                  type="text"
                                  value={newComponent.model}
                                  onChange={(e) => setNewComponent({ ...newComponent, model: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  placeholder="Model number or name"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                  Serial Number <span className="text-gray-500 text-xs">(For warranty/tracking)</span>
                                </label>
                                <input
                                  type="text"
                                  value={newComponent.serial_number}
                                  onChange={(e) => setNewComponent({ ...newComponent, serial_number: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  placeholder="Optional - for your records"
                                />
                              </div>
                              {/* Power rating - not for DSP */}
                              {newComponent.category !== 'DSP' && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Power Rating <span className="text-gray-500 text-xs">(RMS Watts per unit)</span>
                                  </label>
                                  <input
                                    type="number"
                                    value={newComponent.power_watts}
                                    onChange={(e) => setNewComponent({ ...newComponent, power_watts: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="RMS power rating (e.g. 1000)"
                                  />
                                </div>
                              )}
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                  Cost <span className="text-gray-500 text-xs">(Price per unit in USD)</span>
                                </label>
                                <input
                                  type="number"
                                  value={newComponent.cost}
                                  onChange={(e) => setNewComponent({ ...newComponent, cost: e.target.value })}
                                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  placeholder="Price per unit (e.g. 299.99)"
                                />
                              </div>
                              
                              {/* Amplifier specific fields */}
                              {newComponent.category === 'Amplifier' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Amplifier Type <span className="text-gray-500 text-xs">(Channel configuration)</span>
                                    </label>
                                    <select
                                      value={newComponent.amplifier_type}
                                      onChange={(e) => setNewComponent({ ...newComponent, amplifier_type: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select type</option>
                                      <option value="Mono">Mono</option>
                                      <option value="Stereo">Stereo</option>
                                      <option value="2-Channel">2-Channel</option>
                                      <option value="4-Channel">4-Channel</option>
                                      <option value="5-Channel">5-Channel</option>
                                      <option value="Multi-Channel">Multi-Channel</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Ohm Load <span className="text-gray-500 text-xs">(Impedance amp is wired to)</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={newComponent.ohm_load}
                                      onChange={(e) => setNewComponent({ ...newComponent, ohm_load: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 1 ohm, 2 ohm, 4 ohm"
                                    />
                                  </div>
                                </>
                              )}
                              
                              {/* Speaker specific fields (not subwoofer) */}
                              {newComponent.category === 'Speaker' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Driver Type <span className="text-gray-500 text-xs">(Frequency range)</span>
                                    </label>
                                    <select
                                      value={newComponent.driver_type}
                                      onChange={(e) => setNewComponent({ ...newComponent, driver_type: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select driver type</option>
                                      <option value="Tweeter">Tweeter (Highs: 2kHz-20kHz)</option>
                                      <option value="Midrange">Midrange (500Hz-4kHz)</option>
                                      <option value="Mid-Bass">Mid-Bass/Woofer (20Hz-2kHz)</option>
                                      <option value="Full-Range">Full-Range/Coaxial (50Hz-20kHz)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Speaker Size <span className="text-gray-500 text-xs">(Diameter)</span>
                                    </label>
                                    <select
                                      value={newComponent.size}
                                      onChange={(e) => setNewComponent({ ...newComponent, size: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select size</option>
                                      <option value="1">1" (25mm) - Tweeter</option>
                                      <option value="1.5">1.5" (38mm) - Tweeter</option>
                                      <option value="2">2" (50mm)</option>
                                      <option value="3">3" (75mm)</option>
                                      <option value="3.5">3.5" (89mm)</option>
                                      <option value="4">4" (102mm)</option>
                                      <option value="5.25">5.25" (130mm)</option>
                                      <option value="6.5">6.5" (165mm)</option>
                                      <option value="6.75">6.75" (171mm)</option>
                                      <option value="6x9">6x9" (152x229mm)</option>
                                      <option value="8">8" (203mm)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Cone/Dome Material <span className="text-gray-500 text-xs">(Primary material)</span>
                                    </label>
                                    <select
                                      value={newComponent.cone_material}
                                      onChange={(e) => setNewComponent({ ...newComponent, cone_material: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select material</option>
                                      <option value="Carbon Fiber">Carbon Fiber</option>
                                      <option value="Kevlar">Kevlar</option>
                                      <option value="Glass Fiber">Glass Fiber</option>
                                      <option value="Aluminum">Aluminum</option>
                                      <option value="Titanium">Titanium</option>
                                      <option value="Silk">Silk Dome</option>
                                      <option value="Polypropylene">Polypropylene</option>
                                      <option value="Paper">Paper/Treated Paper</option>
                                      <option value="Mica">Mica-Reinforced</option>
                                      <option value="Mylar">Mylar</option>
                                      <option value="Other">Other/Custom</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Magnet Type <span className="text-gray-500 text-xs">(Motor structure)</span>
                                    </label>
                                    <select
                                      value={newComponent.magnet_type}
                                      onChange={(e) => setNewComponent({ ...newComponent, magnet_type: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select magnet type</option>
                                      <option value="Neodymium">Neodymium (NEO)</option>
                                      <option value="Ferrite">Ferrite (Ceramic)</option>
                                      <option value="Alnico">Alnico</option>
                                      <option value="Strontium">Strontium Ferrite</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Surround Material <span className="text-gray-500 text-xs">(Edge suspension)</span>
                                    </label>
                                    <select
                                      value={newComponent.surround_material}
                                      onChange={(e) => setNewComponent({ ...newComponent, surround_material: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select surround material</option>
                                      <option value="Rubber">Rubber</option>
                                      <option value="Foam">Foam</option>
                                      <option value="Cloth">Cloth</option>
                                      <option value="Butyl Rubber">Butyl Rubber</option>
                                      <option value="Santoprene">Santoprene</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Sensitivity <span className="text-gray-500 text-xs">(dB @ 1W/1m)</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={newComponent.sensitivity_db}
                                      onChange={(e) => setNewComponent({ ...newComponent, sensitivity_db: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 92"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Frequency Response <span className="text-gray-500 text-xs">(Hz range)</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={newComponent.frequency_response}
                                      onChange={(e) => setNewComponent({ ...newComponent, frequency_response: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 60-20000"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Mounting Depth <span className="text-gray-500 text-xs">(inches)</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={newComponent.mounting_depth}
                                      onChange={(e) => setNewComponent({ ...newComponent, mounting_depth: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 2.5"
                                    />
                                  </div>
                                </>
                              )}
                              
                              {/* Speaker/Subwoofer common fields */}
                              {(newComponent.category === 'Speaker' || newComponent.category === 'Subwoofer') && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Voice Coil Configuration <span className="text-gray-500 text-xs">(SVC/DVC/QVC)</span>
                                    </label>
                                    <select
                                      value={newComponent.voice_coil}
                                      onChange={(e) => setNewComponent({ ...newComponent, voice_coil: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select configuration</option>
                                      <option value="Single">Single Voice Coil (SVC)</option>
                                      <option value="Dual">Dual Voice Coil (DVC)</option>
                                      <option value="Quad">Quad Voice Coil (QVC)</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Impedance <span className="text-gray-500 text-xs">(Ohms per coil)</span>
                                    </label>
                                    <select
                                      value={newComponent.impedance}
                                      onChange={(e) => setNewComponent({ ...newComponent, impedance: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select impedance</option>
                                      <option value="1">1 Ohm</option>
                                      <option value="2">2 Ohm</option>
                                      <option value="4">4 Ohm</option>
                                      <option value="8">8 Ohm</option>
                                    </select>
                                  </div>
                                </>
                              )}
                              
                              {/* Wiring specific fields */}
                              {newComponent.category === 'Wiring' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Wire Gauge <span className="text-gray-500 text-xs">(AWG size)</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={newComponent.wire_gauge}
                                      onChange={(e) => setNewComponent({ ...newComponent, wire_gauge: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 0 AWG, 4 AWG"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Wire Length (ft)</label>
                                    <input
                                      type="text"
                                      value={newComponent.wire_length}
                                      onChange={(e) => setNewComponent({ ...newComponent, wire_length: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 20"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">RCA Length (ft)</label>
                                    <input
                                      type="text"
                                      value={newComponent.rca_length}
                                      onChange={(e) => setNewComponent({ ...newComponent, rca_length: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 15"
                                    />
                                  </div>
                                </>
                              )}
                              
                              {/* Quantity field for applicable categories */}
                              {['Amplifier', 'Subwoofer', 'Speaker', 'DSP', 'Battery', 'Alternator', 'Capacitor'].includes(newComponent.category) && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Quantity <span className="text-gray-500 text-xs">(How many of this exact item)</span>
                                  </label>
                                  <input
                                    type="number"
                                    value={newComponent.quantity}
                                    onChange={(e) => setNewComponent({ ...newComponent, quantity: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    min="1"
                                    placeholder="Number of units installed"
                                  />
                                </div>
                              )}
                              
                              {/* Head Unit specific fields */}
                              {newComponent.category === 'Head Unit' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Screen Size</label>
                                    <input
                                      type="text"
                                      value={newComponent.screen_size}
                                      onChange={(e) => setNewComponent({ ...newComponent, screen_size: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder='e.g. 7", 10.1"'
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Display Type</label>
                                    <select
                                      value={newComponent.display_type}
                                      onChange={(e) => setNewComponent({ ...newComponent, display_type: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select type</option>
                                      <option value="Capacitive Touch">Capacitive Touch</option>
                                      <option value="Resistive Touch">Resistive Touch</option>
                                      <option value="Non-Touch">Non-Touch</option>
                                      <option value="QLED">QLED</option>
                                      <option value="LED">LED</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Preamp Outputs</label>
                                    <input
                                      type="text"
                                      value={newComponent.preamp_outputs}
                                      onChange={(e) => setNewComponent({ ...newComponent, preamp_outputs: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 3 pairs, 5V"
                                    />
                                  </div>
                                </>
                              )}
                              
                              {/* Enclosure/Box specific fields */}
                              {newComponent.category === 'Enclosure' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Enclosure Type</label>
                                    <select
                                      value={newComponent.enclosure_type}
                                      onChange={(e) => setNewComponent({ ...newComponent, enclosure_type: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select type</option>
                                      <option value="Sealed">Sealed</option>
                                      <option value="Ported">Ported/Vented</option>
                                      <option value="Bandpass">Bandpass</option>
                                      <option value="Infinite Baffle">Infinite Baffle</option>
                                      <option value="Transmission Line">Transmission Line</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Build Type</label>
                                    <select
                                      value={newComponent.build_type}
                                      onChange={(e) => setNewComponent({ ...newComponent, build_type: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select type</option>
                                      <option value="Pre-built">Pre-built/Prefab</option>
                                      <option value="Custom">Custom Built</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Internal Volume <span className="text-gray-500 text-xs">(Cubic feet after displacement)</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={newComponent.internal_volume}
                                      onChange={(e) => setNewComponent({ ...newComponent, internal_volume: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 2.5"
                                    />
                                  </div>
                                  {newComponent.enclosure_type === 'Ported' && (
                                    <>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Port Area (sq in)</label>
                                        <input
                                          type="text"
                                          value={newComponent.port_area}
                                          onChange={(e) => setNewComponent({ ...newComponent, port_area: e.target.value })}
                                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                          placeholder="e.g. 16"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Port Length (inches)</label>
                                        <input
                                          type="text"
                                          value={newComponent.port_length}
                                          onChange={(e) => setNewComponent({ ...newComponent, port_length: e.target.value })}
                                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                          placeholder="e.g. 14"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Tuning Frequency (Hz)</label>
                                        <input
                                          type="text"
                                          value={newComponent.tuning_frequency}
                                          onChange={(e) => setNewComponent({ ...newComponent, tuning_frequency: e.target.value })}
                                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                          placeholder="e.g. 32"
                                        />
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                              
                              {/* Sound Dampening specific fields */}
                              {newComponent.category === 'Sound Dampening' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Material Type</label>
                                    <select
                                      value={newComponent.material_type}
                                      onChange={(e) => setNewComponent({ ...newComponent, material_type: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select type</option>
                                      <option value="CLD">CLD (Constrained Layer Damper)</option>
                                      <option value="MLV">MLV (Mass Loaded Vinyl)</option>
                                      <option value="CCF">CCF (Closed Cell Foam)</option>
                                      <option value="High Density Foam">High Density Foam</option>
                                      <option value="Expanding Foam">Expanding Foam</option>
                                      <option value="Butyl">Butyl Sheets</option>
                                      <option value="Other">Other</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Coverage Area <span className="text-gray-500 text-xs">(Total square feet)</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={newComponent.square_footage}
                                      onChange={(e) => setNewComponent({ ...newComponent, square_footage: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 36"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Thickness (mils)</label>
                                    <input
                                      type="text"
                                      value={newComponent.thickness}
                                      onChange={(e) => setNewComponent({ ...newComponent, thickness: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 80"
                                    />
                                  </div>
                                </>
                              )}
                              
                              {/* Battery specific fields */}
                              {newComponent.category === 'Battery' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Battery Type</label>
                                    <select
                                      value={newComponent.battery_type}
                                      onChange={(e) => setNewComponent({ ...newComponent, battery_type: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select type</option>
                                      <option value="AGM">AGM</option>
                                      <option value="Lithium">Lithium (LiFePO4)</option>
                                      <option value="Flooded">Flooded/Wet Cell</option>
                                      <option value="Gel">Gel</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Amp Hours (Ah)</label>
                                    <input
                                      type="text"
                                      value={newComponent.amp_hours}
                                      onChange={(e) => setNewComponent({ ...newComponent, amp_hours: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 100"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">CCA (Cold Cranking Amps)</label>
                                    <input
                                      type="text"
                                      value={newComponent.cca}
                                      onChange={(e) => setNewComponent({ ...newComponent, cca: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 800"
                                    />
                                  </div>
                                </>
                              )}
                              
                              {/* Alternator specific fields */}
                              {newComponent.category === 'Alternator' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Max Output <span className="text-gray-500 text-xs">(Amps at full RPM)</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={newComponent.max_output}
                                      onChange={(e) => setNewComponent({ ...newComponent, max_output: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 370"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Idle Output <span className="text-gray-500 text-xs">(Amps at idle RPM)</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={newComponent.idle_output}
                                      onChange={(e) => setNewComponent({ ...newComponent, idle_output: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 200"
                                    />
                                  </div>
                                </>
                              )}
                              
                              {/* DSP/Signal Processor specific fields */}
                              {newComponent.category === 'DSP' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Channel Configuration <span className="text-gray-500 text-xs">(Input x Output)</span>
                                    </label>
                                    <select
                                      value={newComponent.channel_config}
                                      onChange={(e) => setNewComponent({ ...newComponent, channel_config: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select configuration</option>
                                      <option value="2x4">2x4 (2 in, 4 out)</option>
                                      <option value="2x6">2x6 (2 in, 6 out)</option>
                                      <option value="2x8">2x8 (2 in, 8 out)</option>
                                      <option value="4x4">4x4 (4 in, 4 out)</option>
                                      <option value="4x6">4x6 (4 in, 6 out)</option>
                                      <option value="4x8">4x8 (4 in, 8 out)</option>
                                      <option value="4x10">4x10 (4 in, 10 out)</option>
                                      <option value="6x6">6x6 (6 in, 6 out)</option>
                                      <option value="6x8">6x8 (6 in, 8 out)</option>
                                      <option value="6x10">6x10 (6 in, 10 out)</option>
                                      <option value="8x8">8x8 (8 in, 8 out)</option>
                                      <option value="8x10">8x10 (8 in, 10 out)</option>
                                      <option value="8x12">8x12 (8 in, 12 out)</option>
                                      <option value="8x16">8x16 (8 in, 16 out)</option>
                                      <option value="custom">Custom Configuration</option>
                                    </select>
                                  </div>
                                  
                                  {/* Show custom input/output fields if custom is selected */}
                                  {newComponent.channel_config === 'custom' && (
                                    <>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Input Channels</label>
                                        <input
                                          type="number"
                                          value={newComponent.input_channels}
                                          onChange={(e) => setNewComponent({ ...newComponent, input_channels: e.target.value })}
                                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                          placeholder="Number of inputs"
                                          min="1"
                                          max="16"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Output Channels</label>
                                        <input
                                          type="number"
                                          value={newComponent.output_channels}
                                          onChange={(e) => setNewComponent({ ...newComponent, output_channels: e.target.value })}
                                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                          placeholder="Number of outputs"
                                          min="1"
                                          max="20"
                                        />
                                      </div>
                                    </>
                                  )}
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Processing Features <span className="text-gray-500 text-xs">(Select main features)</span>
                                    </label>
                                    <select
                                      value={newComponent.processing_type}
                                      onChange={(e) => setNewComponent({ ...newComponent, processing_type: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select processing type</option>
                                      <option value="Parametric EQ">Parametric EQ</option>
                                      <option value="31-Band Graphic EQ">31-Band Graphic EQ</option>
                                      <option value="Time Alignment">Time Alignment</option>
                                      <option value="Active Crossover">Active Crossover</option>
                                      <option value="Full Processing">Full Processing (EQ + Time + Crossover)</option>
                                      <option value="OEM Integration">OEM Integration Processor</option>
                                    </select>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Sample Rate/Bit Depth
                                    </label>
                                    <select
                                      value={newComponent.sample_rate}
                                      onChange={(e) => setNewComponent({ ...newComponent, sample_rate: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select sample rate</option>
                                      <option value="24-bit/48kHz">24-bit / 48kHz</option>
                                      <option value="24-bit/96kHz">24-bit / 96kHz</option>
                                      <option value="24-bit/192kHz">24-bit / 192kHz</option>
                                      <option value="32-bit/48kHz">32-bit / 48kHz</option>
                                      <option value="32-bit/96kHz">32-bit / 96kHz</option>
                                      <option value="32-bit/192kHz">32-bit / 192kHz</option>
                                    </select>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Control Interface
                                    </label>
                                    <select
                                      value={newComponent.control_interface}
                                      onChange={(e) => setNewComponent({ ...newComponent, control_interface: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select control method</option>
                                      <option value="PC Software">PC Software (USB)</option>
                                      <option value="Mobile App">Mobile App (iOS/Android)</option>
                                      <option value="PC + Mobile">PC Software + Mobile App</option>
                                      <option value="Physical Remote">Physical Remote Control</option>
                                      <option value="Built-in Display">Built-in Display/Controls</option>
                                    </select>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Number of Presets
                                    </label>
                                    <input
                                      type="text"
                                      value={newComponent.presets}
                                      onChange={(e) => setNewComponent({ ...newComponent, presets: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 4, 8, Unlimited"
                                    />
                                  </div>
                                </>
                              )}
                              
                              {/* Fuses specific fields */}
                              {newComponent.category === 'Fuses' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Fuse Type</label>
                                    <select
                                      value={newComponent.fuse_type}
                                      onChange={(e) => setNewComponent({ ...newComponent, fuse_type: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select type</option>
                                      <option value="ANL">ANL</option>
                                      <option value="Mini-ANL">Mini-ANL/MIDI</option>
                                      <option value="ATC">ATC/ATO</option>
                                      <option value="AGU">AGU</option>
                                      <option value="MAXI">MAXI</option>
                                      <option value="Circuit Breaker">Circuit Breaker</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Amp Rating</label>
                                    <input
                                      type="text"
                                      value={newComponent.amp_rating}
                                      onChange={(e) => setNewComponent({ ...newComponent, amp_rating: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 200A"
                                    />
                                  </div>
                                </>
                              )}
                              
                              {/* Capacitor specific fields */}
                              {newComponent.category === 'Capacitor' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Capacitance <span className="text-gray-500 text-xs">(Farads)</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={newComponent.capacitance}
                                      onChange={(e) => setNewComponent({ ...newComponent, capacitance: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 2.0, 5.0"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Voltage Rating <span className="text-gray-500 text-xs">(Max voltage)</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={newComponent.voltage_rating}
                                      onChange={(e) => setNewComponent({ ...newComponent, voltage_rating: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      placeholder="e.g. 16V, 20V"
                                    />
                                  </div>
                                </>
                              )}
                              
                              {/* Subwoofer specific additional fields */}
                              {newComponent.category === 'Subwoofer' && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Subwoofer Size <span className="text-gray-500 text-xs">(Diameter)</span>
                                    </label>
                                    <select
                                      value={newComponent.size}
                                      onChange={(e) => setNewComponent({ ...newComponent, size: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select size</option>
                                      <option value="8">8"</option>
                                      <option value="10">10"</option>
                                      <option value="12">12"</option>
                                      <option value="15">15"</option>
                                      <option value="18">18"</option>
                                      <option value="21">21"</option>
                                      <option value="24">24"</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Cone Material <span className="text-gray-500 text-xs">(Primary material)</span>
                                    </label>
                                    <select
                                      value={newComponent.cone_material}
                                      onChange={(e) => setNewComponent({ ...newComponent, cone_material: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select material</option>
                                      <option value="Carbon Fiber">Carbon Fiber</option>
                                      <option value="Kevlar">Kevlar</option>
                                      <option value="Aluminum">Aluminum</option>
                                      <option value="Paper">Paper/Treated Paper</option>
                                      <option value="Polypropylene">Polypropylene</option>
                                      <option value="Glass Fiber">Glass Fiber</option>
                                      <option value="Composite">Composite Blend</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Magnet Type <span className="text-gray-500 text-xs">(Motor structure)</span>
                                    </label>
                                    <select
                                      value={newComponent.magnet_type}
                                      onChange={(e) => setNewComponent({ ...newComponent, magnet_type: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select magnet type</option>
                                      <option value="Ferrite">Ferrite (Ceramic)</option>
                                      <option value="Neodymium">Neodymium (NEO)</option>
                                      <option value="Double Stack">Double Stack Ferrite</option>
                                      <option value="Triple Stack">Triple Stack Ferrite</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                      Surround Material <span className="text-gray-500 text-xs">(Edge suspension)</span>
                                    </label>
                                    <select
                                      value={newComponent.surround_material}
                                      onChange={(e) => setNewComponent({ ...newComponent, surround_material: e.target.value })}
                                      className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select surround material</option>
                                      <option value="Rubber">Rubber</option>
                                      <option value="Foam">Foam</option>
                                      <option value="Santoprene">Santoprene</option>
                                      <option value="Butyl Rubber">Butyl Rubber</option>
                                      <option value="Cloth">Cloth</option>
                                    </select>
                                  </div>
                                </>
                              )}
                              
                              {/* Amplifier specific additional fields */}
                              {newComponent.category === 'Amplifier' && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-300 mb-1">Class Type</label>
                                  <select
                                    value={newComponent.class_type}
                                    onChange={(e) => setNewComponent({ ...newComponent, class_type: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  >
                                    <option value="">Select class</option>
                                    <option value="A">Class A</option>
                                    <option value="AB">Class AB</option>
                                    <option value="D">Class D</option>
                                    <option value="H">Class H</option>
                                    <option value="GH">Class GH</option>
                                  </select>
                                </div>
                              )}
                              
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                                <textarea
                                  value={newComponent.description}
                                  onChange={(e) => setNewComponent({ ...newComponent, description: e.target.value })}
                                  rows={2}
                                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  placeholder="Additional details about this component..."
                                />
                              </div>
                            </div>
                            <div className="flex space-x-3 mt-4">
                              <button
                                onClick={async () => {
                                  if (!newComponent.category || !newComponent.brand) {
                                    toast.error('Please fill in category and brand');
                                    return;
                                  }
                                  
                                  const updatedVehicles = vehicles.map(v => {
                                    if (v.id === vehicle.id) {
                                      return {
                                        ...v,
                                        audio_components: [...(v.audio_components || []), newComponent]
                                      };
                                    }
                                    return v;
                                  });
                                  
                                  const { error } = await supabase
                                    .from('user_audio_systems')
                                    .update({ 
                                      components: updatedVehicles.find(v => v.id === vehicle.id)?.audio_components 
                                    })
                                    .eq('id', vehicle.id);
                                  
                                  if (!error) {
                                    setVehicles(updatedVehicles);
                                    setNewComponent({ 
                                      category: '', 
                                      brand: '', 
                                      model: '', 
                                      power_watts: '', 
                                      description: '',
                                      cost: '',
                                      serial_number: '',
                                      quantity: 1,
                                      amplifier_type: '',
                                      class_type: '',
                                      ohm_load: '',
                                      channels: '',
                                      voice_coil: '',
                                      size: '',
                                      impedance: '',
                                      driver_type: '',
                                      cone_material: '',
                                      magnet_type: '',
                                      surround_material: '',
                                      sensitivity_db: '',
                                      frequency_response: '',
                                      mounting_depth: '',
                                      cutout_diameter: '',
                                      crossover_included: '',
                                      crossover_points: '',
                                      wire_type: '',
                                      wire_gauge: '',
                                      wire_length: '',
                                      wire_material: '',
                                      rca_length: '',
                                      enclosure_type: '',
                                      internal_volume: '',
                                      port_area: '',
                                      port_length: '',
                                      tuning_frequency: '',
                                      build_type: '',
                                      square_footage: '',
                                      material_type: '',
                                      thickness: '',
                                      amp_hours: '',
                                      cca: '',
                                      battery_type: '',
                                      max_output: '',
                                      idle_output: '',
                                      input_channels: '',
                                      output_channels: '',
                                      processing_type: '',
                                      screen_size: '',
                                      display_type: '',
                                      preamp_outputs: '',
                                      fuse_type: '',
                                      amp_rating: ''
                                    });
                                    setShowAddComponent(null);
                                    toast.success('Component added successfully!');
                                  } else {
                                    toast.error('Failed to add component');
                                  }
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm"
                              >
                                Add Component
                              </button>
                              <button
                                onClick={() => {
                                  setShowAddComponent(null);
                                  setNewComponent({ 
                                    category: '', 
                                    brand: '', 
                                    model: '', 
                                    power_watts: '', 
                                    description: '',
                                    cost: '',
                                    serial_number: '',
                                    amplifier_type: '',
                                    ohm_load: '',
                                    voice_coil: '',
                                    wire_gauge: '',
                                    wire_length: '',
                                    rca_length: ''
                                  });
                                }}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Components List */}
                        {vehicle.audio_components && vehicle.audio_components.length > 0 ? (
                          <div className="space-y-3">
                            {vehicle.audio_components.map((component: any, index: number) => (
                              <div key={index} className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                                {editingComponent?.vehicleId === vehicle.id && editingComponent?.index === index ? (
                                  <div className="space-y-3">
                                    {/* Show what's being edited */}
                                    <div className="text-white font-medium mb-2">
                                      Editing: {component.category} - {component.brand} {component.model}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-300 mb-1">Category</label>
                                        <select
                                          value={editedComponent.category}
                                          onChange={(e) => setEditedComponent({ ...editedComponent, category: e.target.value })}
                                          className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                        >
                                          <option value="">Select category</option>
                                          <option value="Head Unit">Head Unit</option>
                                          <option value="Amplifier">Amplifier</option>
                                          <option value="Subwoofer">Subwoofer</option>
                                          <option value="Speaker">Speaker</option>
                                          <option value="DSP">DSP/Signal Processor</option>
                                          <option value="Capacitor">Capacitor</option>
                                          <option value="Battery">Battery</option>
                                          <option value="Alternator">Alternator</option>
                                          <option value="Wiring">Wiring</option>
                                          <option value="Enclosure">Enclosure/Box</option>
                                          <option value="Sound Dampening">Sound Dampening</option>
                                          <option value="Fuses">Fuses/Distribution</option>
                                          <option value="Other">Other/Accessories</option>
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-300 mb-1">Brand</label>
                                        <input
                                          type="text"
                                          value={editedComponent.brand || ''}
                                          onChange={(e) => setEditedComponent({ ...editedComponent, brand: e.target.value })}
                                          className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                          placeholder="Enter brand"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-300 mb-1">Model</label>
                                        <input
                                          type="text"
                                          value={editedComponent.model || ''}
                                          onChange={(e) => setEditedComponent({ ...editedComponent, model: e.target.value })}
                                          className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                          placeholder="Enter model"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-300 mb-1">Serial Number</label>
                                        <input
                                          type="text"
                                          value={editedComponent.serial_number || ''}
                                          onChange={(e) => setEditedComponent({ ...editedComponent, serial_number: e.target.value })}
                                          className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                          placeholder="Optional"
                                        />
                                      </div>
                                      {/* Power rating - not for DSP */}
                                      {editedComponent.category !== 'DSP' && (
                                        <div>
                                          <label className="block text-xs font-medium text-gray-300 mb-1">Power (RMS Watts)</label>
                                          <input
                                            type="number"
                                            value={editedComponent.power_watts || ''}
                                            onChange={(e) => setEditedComponent({ ...editedComponent, power_watts: e.target.value })}
                                            className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            placeholder="Per unit"
                                          />
                                        </div>
                                      )}
                                      <div>
                                        <label className="block text-xs font-medium text-gray-300 mb-1">Cost ($)</label>
                                        <input
                                          type="number"
                                          value={editedComponent.cost || ''}
                                          onChange={(e) => setEditedComponent({ ...editedComponent, cost: e.target.value })}
                                          className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                          placeholder="Per unit"
                                        />
                                      </div>
                                      
                                      {/* Conditional fields based on category */}
                                      {['Amplifier', 'Subwoofer', 'Speaker', 'DSP', 'Battery', 'Alternator', 'Capacitor'].includes(editedComponent.category) && (
                                        <div>
                                          <label className="block text-xs font-medium text-gray-300 mb-1">Quantity</label>
                                          <input
                                            type="number"
                                            value={editedComponent.quantity || 1}
                                            onChange={(e) => setEditedComponent({ ...editedComponent, quantity: parseInt(e.target.value) || 1 })}
                                            className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            placeholder="# of units"
                                            min="1"
                                          />
                                        </div>
                                      )}
                                      
                                      {/* Head Unit specific fields */}
                                      {editedComponent.category === 'Head Unit' && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Screen Size</label>
                                            <input
                                              type="text"
                                              value={editedComponent.screen_size || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, screen_size: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder='e.g. 7", 10.1"'
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Display Type</label>
                                            <select
                                              value={editedComponent.display_type || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, display_type: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select type</option>
                                              <option value="Capacitive Touch">Capacitive Touch</option>
                                              <option value="Resistive Touch">Resistive Touch</option>
                                              <option value="Non-Touch">Non-Touch</option>
                                              <option value="QLED">QLED</option>
                                              <option value="LED">LED</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Preamp Outputs</label>
                                            <input
                                              type="text"
                                              value={editedComponent.preamp_outputs || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, preamp_outputs: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="e.g. 3 pairs, 5V"
                                            />
                                          </div>
                                        </>
                                      )}

                                      {editedComponent.category === 'Amplifier' && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Amplifier Type</label>
                                            <select
                                              value={editedComponent.amplifier_type || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, amplifier_type: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select type</option>
                                              <option value="Mono">Mono</option>
                                              <option value="Stereo">Stereo</option>
                                              <option value="2-Channel">2-Channel</option>
                                              <option value="4-Channel">4-Channel</option>
                                              <option value="5-Channel">5-Channel</option>
                                              <option value="Multi-Channel">Multi-Channel</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Class Type</label>
                                            <select
                                              value={editedComponent.class_type || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, class_type: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select class</option>
                                              <option value="A">Class A</option>
                                              <option value="AB">Class AB</option>
                                              <option value="D">Class D</option>
                                              <option value="H">Class H</option>
                                              <option value="GH">Class GH</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Ohm Load</label>
                                            <input
                                              type="text"
                                              value={editedComponent.ohm_load || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, ohm_load: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="e.g. 1Ω, 2Ω"
                                            />
                                          </div>
                                        </>
                                      )}
                                      
                                      {/* Speaker specific fields */}
                                      {editedComponent.category === 'Speaker' && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Driver Type</label>
                                            <select
                                              value={editedComponent.driver_type || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, driver_type: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select type</option>
                                              <option value="Tweeter">Tweeter (Highs)</option>
                                              <option value="Midrange">Midrange</option>
                                              <option value="Mid-Bass">Mid-Bass</option>
                                              <option value="Full-Range">Full-Range</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Size</label>
                                            <select
                                              value={editedComponent.size || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, size: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select size</option>
                                              <option value="1">1"</option>
                                              <option value="2">2"</option>
                                              <option value="3.5">3.5"</option>
                                              <option value="4">4"</option>
                                              <option value="5.25">5.25"</option>
                                              <option value="6.5">6.5"</option>
                                              <option value="6x9">6x9"</option>
                                              <option value="8">8"</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Cone Material</label>
                                            <select
                                              value={editedComponent.cone_material || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, cone_material: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select material</option>
                                              <option value="Carbon Fiber">Carbon Fiber</option>
                                              <option value="Kevlar">Kevlar</option>
                                              <option value="Titanium">Titanium</option>
                                              <option value="Aluminum">Aluminum</option>
                                              <option value="Silk">Silk</option>
                                              <option value="Paper">Paper</option>
                                              <option value="Polypropylene">Polypropylene</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Magnet Type</label>
                                            <select
                                              value={editedComponent.magnet_type || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, magnet_type: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select magnet</option>
                                              <option value="Neodymium">Neodymium (NEO)</option>
                                              <option value="Ferrite">Ferrite</option>
                                              <option value="Alnico">Alnico</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Surround Material</label>
                                            <select
                                              value={editedComponent.surround_material || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, surround_material: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select surround</option>
                                              <option value="Rubber">Rubber</option>
                                              <option value="Foam">Foam</option>
                                              <option value="Cloth">Cloth</option>
                                              <option value="Butyl Rubber">Butyl</option>
                                            </select>
                                          </div>
                                        </>
                                      )}
                                      
                                      {/* Subwoofer specific fields */}
                                      {editedComponent.category === 'Subwoofer' && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Size</label>
                                            <select
                                              value={editedComponent.size || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, size: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select size</option>
                                              <option value="8">8"</option>
                                              <option value="10">10"</option>
                                              <option value="12">12"</option>
                                              <option value="15">15"</option>
                                              <option value="18">18"</option>
                                              <option value="21">21"</option>
                                              <option value="24">24"</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Cone Material</label>
                                            <select
                                              value={editedComponent.cone_material || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, cone_material: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select material</option>
                                              <option value="Carbon Fiber">Carbon Fiber</option>
                                              <option value="Kevlar">Kevlar</option>
                                              <option value="Aluminum">Aluminum</option>
                                              <option value="Paper">Paper</option>
                                              <option value="Polypropylene">Polypropylene</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Magnet Type</label>
                                            <select
                                              value={editedComponent.magnet_type || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, magnet_type: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select magnet</option>
                                              <option value="Ferrite">Ferrite</option>
                                              <option value="Neodymium">NEO</option>
                                              <option value="Double Stack">Double Stack</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Surround Material</label>
                                            <select
                                              value={editedComponent.surround_material || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, surround_material: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select surround</option>
                                              <option value="Rubber">Rubber</option>
                                              <option value="Foam">Foam</option>
                                              <option value="Santoprene">Santoprene</option>
                                            </select>
                                          </div>
                                        </>
                                      )}
                                      
                                      {/* Common speaker/subwoofer fields */}
                                      {(editedComponent.category === 'Speaker' || editedComponent.category === 'Subwoofer') && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Voice Coil</label>
                                            <select
                                              value={editedComponent.voice_coil || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, voice_coil: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select config</option>
                                              <option value="Single">SVC</option>
                                              <option value="Dual">DVC</option>
                                              <option value="Quad">QVC</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Impedance (Ohms)</label>
                                            <select
                                              value={editedComponent.impedance || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, impedance: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select ohms</option>
                                              <option value="1">1Ω</option>
                                              <option value="2">2Ω</option>
                                              <option value="4">4Ω</option>
                                              <option value="8">8Ω</option>
                                            </select>
                                          </div>
                                        </>
                                      )}
                                      
                                      {/* DSP/Signal Processor specific fields */}
                                      {editedComponent.category === 'DSP' && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Channel Config</label>
                                            <select
                                              value={editedComponent.channel_config || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, channel_config: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select config</option>
                                              <option value="2x4">2x4</option>
                                              <option value="2x6">2x6</option>
                                              <option value="2x8">2x8</option>
                                              <option value="4x4">4x4</option>
                                              <option value="4x6">4x6</option>
                                              <option value="4x8">4x8</option>
                                              <option value="4x10">4x10</option>
                                              <option value="6x6">6x6</option>
                                              <option value="6x8">6x8</option>
                                              <option value="6x10">6x10</option>
                                              <option value="8x8">8x8</option>
                                              <option value="8x10">8x10</option>
                                              <option value="8x12">8x12</option>
                                              <option value="8x16">8x16</option>
                                              <option value="custom">Custom</option>
                                            </select>
                                          </div>
                                          
                                          {/* Show custom fields if needed */}
                                          {editedComponent.channel_config === 'custom' && (
                                            <>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-300 mb-1">Input Ch</label>
                                                <input
                                                  type="number"
                                                  value={editedComponent.input_channels || ''}
                                                  onChange={(e) => setEditedComponent({ ...editedComponent, input_channels: e.target.value })}
                                                  className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                                  placeholder="# inputs"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-300 mb-1">Output Ch</label>
                                                <input
                                                  type="number"
                                                  value={editedComponent.output_channels || ''}
                                                  onChange={(e) => setEditedComponent({ ...editedComponent, output_channels: e.target.value })}
                                                  className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                                  placeholder="# outputs"
                                                />
                                              </div>
                                            </>
                                          )}
                                          
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Processing</label>
                                            <select
                                              value={editedComponent.processing_type || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, processing_type: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select type</option>
                                              <option value="Parametric EQ">Parametric EQ</option>
                                              <option value="31-Band Graphic EQ">31-Band EQ</option>
                                              <option value="Time Alignment">Time Alignment</option>
                                              <option value="Active Crossover">Active Crossover</option>
                                              <option value="Full Processing">Full Processing</option>
                                              <option value="OEM Integration">OEM Integration</option>
                                            </select>
                                          </div>
                                          
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Sample Rate</label>
                                            <select
                                              value={editedComponent.sample_rate || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, sample_rate: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select rate</option>
                                              <option value="24-bit/48kHz">24-bit/48kHz</option>
                                              <option value="24-bit/96kHz">24-bit/96kHz</option>
                                              <option value="24-bit/192kHz">24-bit/192kHz</option>
                                              <option value="32-bit/48kHz">32-bit/48kHz</option>
                                              <option value="32-bit/96kHz">32-bit/96kHz</option>
                                            </select>
                                          </div>
                                          
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Control</label>
                                            <select
                                              value={editedComponent.control_interface || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, control_interface: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select control</option>
                                              <option value="PC Software">PC Software</option>
                                              <option value="Mobile App">Mobile App</option>
                                              <option value="PC + Mobile">PC + Mobile</option>
                                              <option value="Physical Remote">Remote Control</option>
                                              <option value="Built-in Display">Built-in</option>
                                            </select>
                                          </div>
                                          
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Presets</label>
                                            <input
                                              type="text"
                                              value={editedComponent.presets || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, presets: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="e.g. 4, 8"
                                            />
                                          </div>
                                        </>
                                      )}
                                      
                                      {/* Battery specific fields */}
                                      {editedComponent.category === 'Battery' && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Battery Type</label>
                                            <select
                                              value={editedComponent.battery_type || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, battery_type: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select type</option>
                                              <option value="AGM">AGM</option>
                                              <option value="Lithium">Lithium (LiFePO4)</option>
                                              <option value="Flooded">Flooded/Wet Cell</option>
                                              <option value="Gel">Gel</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Amp Hours (Ah)</label>
                                            <input
                                              type="text"
                                              value={editedComponent.amp_hours || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, amp_hours: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="e.g. 100"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">CCA</label>
                                            <input
                                              type="text"
                                              value={editedComponent.cca || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, cca: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="Cold cranking amps"
                                            />
                                          </div>
                                        </>
                                      )}
                                      
                                      {/* Alternator specific fields */}
                                      {editedComponent.category === 'Alternator' && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Max Output</label>
                                            <input
                                              type="text"
                                              value={editedComponent.max_output || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, max_output: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="Amps at full RPM"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Idle Output</label>
                                            <input
                                              type="text"
                                              value={editedComponent.idle_output || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, idle_output: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="Amps at idle"
                                            />
                                          </div>
                                        </>
                                      )}
                                      
                                      {/* Enclosure specific fields */}
                                      {editedComponent.category === 'Enclosure' && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Enclosure Type</label>
                                            <select
                                              value={editedComponent.enclosure_type || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, enclosure_type: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select type</option>
                                              <option value="Sealed">Sealed</option>
                                              <option value="Ported">Ported/Vented</option>
                                              <option value="Bandpass">Bandpass</option>
                                              <option value="Infinite Baffle">Infinite Baffle</option>
                                              <option value="Transmission Line">Transmission Line</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Build Type</label>
                                            <select
                                              value={editedComponent.build_type || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, build_type: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select build</option>
                                              <option value="Pre-built">Pre-built</option>
                                              <option value="Custom">Custom Built</option>
                                              <option value="Prefab">Prefab (Modified)</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Volume (cu ft)</label>
                                            <input
                                              type="text"
                                              value={editedComponent.internal_volume || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, internal_volume: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="Internal volume"
                                            />
                                          </div>
                                          {editedComponent.enclosure_type === 'Ported' && (
                                            <>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-300 mb-1">Port Area</label>
                                                <input
                                                  type="text"
                                                  value={editedComponent.port_area || ''}
                                                  onChange={(e) => setEditedComponent({ ...editedComponent, port_area: e.target.value })}
                                                  className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                                  placeholder="sq inches"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-300 mb-1">Port Length</label>
                                                <input
                                                  type="text"
                                                  value={editedComponent.port_length || ''}
                                                  onChange={(e) => setEditedComponent({ ...editedComponent, port_length: e.target.value })}
                                                  className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                                  placeholder="inches"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-medium text-gray-300 mb-1">Tuning (Hz)</label>
                                                <input
                                                  type="text"
                                                  value={editedComponent.tuning_frequency || ''}
                                                  onChange={(e) => setEditedComponent({ ...editedComponent, tuning_frequency: e.target.value })}
                                                  className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                                  placeholder="e.g. 32"
                                                />
                                              </div>
                                            </>
                                          )}
                                        </>
                                      )}
                                      
                                      {/* Sound Dampening specific fields */}
                                      {editedComponent.category === 'Sound Dampening' && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Material Type</label>
                                            <select
                                              value={editedComponent.material_type || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, material_type: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select type</option>
                                              <option value="CLD">CLD (Constrained Layer Damper)</option>
                                              <option value="MLV">MLV (Mass Loaded Vinyl)</option>
                                              <option value="CCF">CCF (Closed Cell Foam)</option>
                                              <option value="High Density Foam">High Density Foam</option>
                                              <option value="Expanding Foam">Expanding Foam</option>
                                              <option value="Butyl">Butyl Sheets</option>
                                              <option value="Other">Other</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Coverage (sq ft)</label>
                                            <input
                                              type="text"
                                              value={editedComponent.square_footage || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, square_footage: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="Total coverage"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Thickness</label>
                                            <input
                                              type="text"
                                              value={editedComponent.thickness || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, thickness: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="mils or mm"
                                            />
                                          </div>
                                        </>
                                      )}
                                      
                                      {/* Wiring specific fields */}
                                      {editedComponent.category === 'Wiring' && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Wire Gauge</label>
                                            <input
                                              type="text"
                                              value={editedComponent.wire_gauge || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, wire_gauge: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="e.g. 0 AWG"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Wire Material</label>
                                            <select
                                              value={editedComponent.wire_material || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, wire_material: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select material</option>
                                              <option value="OFC">OFC (Oxygen Free Copper)</option>
                                              <option value="CCA">CCA (Copper Clad Aluminum)</option>
                                              <option value="Silver">Silver Tinned</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Wire Length</label>
                                            <input
                                              type="text"
                                              value={editedComponent.wire_length || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, wire_length: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="feet"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">RCA Length</label>
                                            <input
                                              type="text"
                                              value={editedComponent.rca_length || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, rca_length: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="feet"
                                            />
                                          </div>
                                        </>
                                      )}
                                      
                                      {/* Fuses specific fields */}
                                      {editedComponent.category === 'Fuses' && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Fuse Type</label>
                                            <select
                                              value={editedComponent.fuse_type || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, fuse_type: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                            >
                                              <option value="">Select type</option>
                                              <option value="ANL">ANL</option>
                                              <option value="Mini-ANL">Mini-ANL</option>
                                              <option value="MAXI">MAXI</option>
                                              <option value="ATC">ATC/ATO</option>
                                              <option value="MIDI">MIDI</option>
                                              <option value="Circuit Breaker">Circuit Breaker</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Amp Rating</label>
                                            <input
                                              type="text"
                                              value={editedComponent.amp_rating || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, amp_rating: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="e.g. 200A"
                                            />
                                          </div>
                                        </>
                                      )}
                                      
                                      {/* Capacitor specific fields */}
                                      {editedComponent.category === 'Capacitor' && (
                                        <>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Capacitance</label>
                                            <input
                                              type="text"
                                              value={editedComponent.capacitance || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, capacitance: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="e.g. 2.0 Farad"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-gray-300 mb-1">Voltage</label>
                                            <input
                                              type="text"
                                              value={editedComponent.voltage_rating || ''}
                                              onChange={(e) => setEditedComponent({ ...editedComponent, voltage_rating: e.target.value })}
                                              className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                              placeholder="e.g. 16V"
                                            />
                                          </div>
                                        </>
                                      )}
                                    </div>
                                    <textarea
                                      value={editedComponent.description || ''}
                                      onChange={(e) => setEditedComponent({ ...editedComponent, description: e.target.value })}
                                      className="w-full px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                      rows={2}
                                      placeholder="Description"
                                    />
                                    <div className="flex justify-end space-x-2">
                                      <button
                                        onClick={async () => {
                                          const updatedVehicles = vehicles.map(v => {
                                            if (v.id === vehicle.id) {
                                              const updatedComponents = [...v.audio_components];
                                              updatedComponents[index] = editedComponent;
                                              return { ...v, audio_components: updatedComponents };
                                            }
                                            return v;
                                          });
                                          
                                          const { error } = await supabase
                                            .from('user_audio_systems')
                                            .update({ 
                                              components: updatedVehicles.find(v => v.id === vehicle.id)?.audio_components 
                                            })
                                            .eq('id', vehicle.id);
                                          
                                          if (!error) {
                                            setVehicles(updatedVehicles);
                                            setEditingComponent(null);
                                            setEditedComponent(null);
                                            toast.success('Component updated successfully!');
                                          } else {
                                            toast.error('Failed to update component');
                                          }
                                        }}
                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingComponent(null);
                                          setEditedComponent(null);
                                        }}
                                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <h6 className="text-white font-medium">
                                        {component.category} - {component.brand} {component.model}
                                      </h6>
                                      <div className="text-sm text-gray-300 mt-1 space-y-1">
                                        {component.quantity && component.quantity > 1 && <p className="font-semibold">Quantity: {component.quantity}</p>}
                                        {component.power_watts && <p>Power: {component.power_watts} Watts</p>}
                                        {component.cost && <p>Cost: ${component.cost}</p>}
                                        {component.serial_number && <p>Serial: {component.serial_number}</p>}
                                        {/* Amplifier specific */}
                                        {component.amplifier_type && <p>Type: {component.amplifier_type}</p>}
                                        {component.class_type && <p>Class: {component.class_type}</p>}
                                        {component.ohm_load && <p>Ohm Load: {component.ohm_load}</p>}
                                        {/* Speaker specific */}
                                        {component.driver_type && <p>Driver Type: {component.driver_type}</p>}
                                        {/* Subwoofer/Speaker common */}
                                        {component.size && <p>Size: {component.size}{component.category === 'Subwoofer' ? '"' : ''}</p>}
                                        {component.impedance && <p>Impedance: {component.impedance}Ω</p>}
                                        {component.voice_coil && <p>Voice Coil: {component.voice_coil}</p>}
                                        {component.cone_material && <p>Cone Material: {component.cone_material}</p>}
                                        {component.magnet_type && <p>Magnet: {component.magnet_type}</p>}
                                        {component.surround_material && <p>Surround: {component.surround_material}</p>}
                                        {component.sensitivity_db && <p>Sensitivity: {component.sensitivity_db} dB</p>}
                                        {component.frequency_response && <p>Frequency: {component.frequency_response} Hz</p>}
                                        {component.mounting_depth && <p>Mounting Depth: {component.mounting_depth}"</p>}
                                        {/* Wiring specific */}
                                        {component.wire_type && <p>Wire Type: {component.wire_type}</p>}
                                        {component.wire_gauge && <p>Wire Gauge: {component.wire_gauge}</p>}
                                        {component.wire_length && <p>Wire Length: {component.wire_length} ft</p>}
                                        {component.wire_material && <p>Material: {component.wire_material}</p>}
                                        {component.rca_length && <p>RCA Length: {component.rca_length} ft</p>}
                                        {/* Enclosure specific */}
                                        {component.enclosure_type && <p>Enclosure: {component.enclosure_type}</p>}
                                        {component.build_type && <p>Build: {component.build_type}</p>}
                                        {component.internal_volume && <p>Volume: {component.internal_volume} cu ft</p>}
                                        {component.port_area && <p>Port Area: {component.port_area} sq in</p>}
                                        {component.port_length && <p>Port Length: {component.port_length}"</p>}
                                        {component.tuning_frequency && <p>Tuning: {component.tuning_frequency} Hz</p>}
                                        {/* Sound Dampening specific */}
                                        {component.material_type && <p>Material: {component.material_type}</p>}
                                        {component.square_footage && <p>Coverage: {component.square_footage} sq ft</p>}
                                        {component.thickness && <p>Thickness: {component.thickness} mils</p>}
                                        {/* Battery specific */}
                                        {component.battery_type && <p>Battery Type: {component.battery_type}</p>}
                                        {component.amp_hours && <p>Amp Hours: {component.amp_hours} Ah</p>}
                                        {component.cca && <p>CCA: {component.cca}</p>}
                                        {/* Alternator specific */}
                                        {component.max_output && <p>Max Output: {component.max_output} Amps</p>}
                                        {component.idle_output && <p>Idle Output: {component.idle_output} Amps</p>}
                                        {/* DSP specific */}
                                        {component.channel_config && <p>Channels: {component.channel_config}</p>}
                                        {component.channel_config === 'custom' && component.input_channels && <p>Inputs: {component.input_channels} ch</p>}
                                        {component.channel_config === 'custom' && component.output_channels && <p>Outputs: {component.output_channels} ch</p>}
                                        {component.processing_type && <p>Processing: {component.processing_type}</p>}
                                        {component.sample_rate && <p>Sample Rate: {component.sample_rate}</p>}
                                        {component.control_interface && <p>Control: {component.control_interface}</p>}
                                        {component.presets && <p>Presets: {component.presets}</p>}
                                        {/* Head Unit specific */}
                                        {component.screen_size && <p>Screen: {component.screen_size}</p>}
                                        {component.display_type && <p>Display: {component.display_type}</p>}
                                        {component.preamp_outputs && <p>Preamp: {component.preamp_outputs}</p>}
                                        {/* Fuses specific */}
                                        {component.fuse_type && <p>Fuse Type: {component.fuse_type}</p>}
                                        {component.amp_rating && <p>Rating: {component.amp_rating}</p>}
                                      </div>
                                      {component.description && (
                                        <p className="text-gray-400 text-sm mt-1">{component.description}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => {
                                          setEditingComponent({ vehicleId: vehicle.id, index });
                                          setEditedComponent({ ...component });
                                        }}
                                        className="text-primary-400 hover:text-primary-300"
                                        title="Edit Component"
                                      >
                                        <FaEdit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (confirm('Are you sure you want to delete this component?')) {
                                            const updatedVehicles = vehicles.map(v => {
                                              if (v.id === vehicle.id) {
                                                return {
                                                  ...v,
                                                  audio_components: v.audio_components.filter((_: any, i: number) => i !== index)
                                                };
                                              }
                                              return v;
                                            });
                                            
                                            const { error } = await supabase
                                              .from('user_audio_systems')
                                              .update({ 
                                                components: updatedVehicles.find(v => v.id === vehicle.id)?.audio_components 
                                              })
                                              .eq('id', vehicle.id);
                                            
                                            if (!error) {
                                              setVehicles(updatedVehicles);
                                              toast.success('Component deleted successfully!');
                                            } else {
                                              toast.error('Failed to delete component');
                                            }
                                          }
                                        }}
                                        className="text-red-400 hover:text-red-300"
                                        title="Delete Component"
                                      >
                                        <FaTrash className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm">No audio components added yet.</p>
                        )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                    <p className="text-blue-300 text-sm">
                      <strong>Note:</strong> Select which vehicle to display on your public member profile using the radio button.
                      You can add, edit, and delete your vehicles directly on this page.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Social Links Tab */}
          {activeTab === 'social' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FaFacebook className="inline mr-2" />
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={profile.facebook_url || ''}
                    onChange={(e) => setProfile({ ...profile, facebook_url: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://facebook.com/yourprofile"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FaInstagram className="inline mr-2" />
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={profile.instagram_url || ''}
                    onChange={(e) => setProfile({ ...profile, instagram_url: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://instagram.com/yourprofile"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FaYoutube className="inline mr-2" />
                    YouTube
                  </label>
                  <input
                    type="url"
                    value={profile.youtube_url || ''}
                    onChange={(e) => setProfile({ ...profile, youtube_url: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://youtube.com/@yourchannel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FaTiktok className="inline mr-2" />
                    TikTok
                  </label>
                  <input
                    type="url"
                    value={profile.tiktok_url || ''}
                    onChange={(e) => setProfile({ ...profile, tiktok_url: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://tiktok.com/@yourprofile"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FaTwitter className="inline mr-2" />
                    Twitter/X
                  </label>
                  <input
                    type="url"
                    value={profile.twitter_url || ''}
                    onChange={(e) => setProfile({ ...profile, twitter_url: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://twitter.com/yourprofile"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FaGlobe className="inline mr-2" />
                    Website
                  </label>
                  <input
                    type="url"
                    value={profile.website_url || ''}
                    onChange={(e) => setProfile({ ...profile, website_url: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">Gallery Images</h3>
                  <p className="text-sm text-gray-400">
                    {galleryImages.length} of 25 images uploaded
                  </p>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploadingImage || galleryImages.length >= 25}
                  />
                  <div className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    galleryImages.length >= 25 
                      ? 'bg-gray-600 cursor-not-allowed' 
                      : 'bg-primary-600 hover:bg-primary-700'
                  } text-white`}>
                    <FaUpload />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {galleryImages.map((image) => (
                  <div key={image.id} className="bg-gray-700 rounded-lg overflow-hidden">
                    <div className="aspect-w-16 aspect-h-9 relative">
                      <img
                        src={image.thumbnail_url || image.image_url}
                        alt={image.caption || 'Gallery image'}
                        className="w-full h-48 object-cover"
                      />
                      {image.is_featured && (
                        <div className="absolute top-2 left-2 bg-primary-600 text-white px-2 py-1 rounded text-xs">
                          Featured
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <input
                        type="text"
                        value={image.caption || ''}
                        onChange={(e) => updateImageSettings(image.id, { caption: e.target.value })}
                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                        placeholder="Add caption..."
                      />
                      
                      <select
                        value={image.visibility}
                        onChange={(e) => updateImageSettings(image.id, { visibility: e.target.value as any })}
                        className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                      >
                        <option value="private">Private</option>
                        <option value="member_only">Members Only</option>
                        <option value="public">Public</option>
                      </select>

                      <div className="flex justify-between">
                        <button
                          onClick={() => updateImageSettings(image.id, { is_featured: !image.is_featured })}
                          className={`text-sm flex items-center space-x-1 ${
                            image.is_featured 
                              ? 'text-yellow-400 hover:text-yellow-300' 
                              : 'text-primary-400 hover:text-primary-300'
                          }`}
                          title={image.is_featured ? 'This image appears in your profile header' : 'Set this as your profile header image'}
                        >
                          <FaCrown className={`${image.is_featured ? 'text-yellow-400' : ''}`} />
                          <span>{image.is_featured ? 'Featured' : 'Set Featured'}</span>
                        </button>
                        <button
                          onClick={() => deleteImage(image.id, image.image_url)}
                          className="text-sm text-red-400 hover:text-red-300 flex items-center space-x-1"
                        >
                          <FaTrash />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 flex justify-between">
            <Link
              to={`/member/${user?.id}`}
              target="_blank"
              className="flex items-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              <FaEye />
              <span>Preview Public Profile</span>
            </Link>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaSave />
              <span>{saving ? 'Saving...' : 'Save Profile Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}