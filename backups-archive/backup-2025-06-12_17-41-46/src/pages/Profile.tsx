import React, { useState, useEffect } from 'react';
import { User, Car, Trophy, Star, Calendar, Edit, Save, X, Upload, Users, Settings, Plus, Trash2, Award, Target, Shield, AlertTriangle, CheckCircle, FileCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface AudioSystem {
  id: string;
  name: string;
  description: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  system_type: string;
  is_primary: boolean;
  components: AudioComponent[];
}

interface AudioComponent {
  id: string;
  category: string;
  brand: string;
  model: string;
  description?: string;
  power_watts?: number;
  price?: number;
}

interface CompetitionResult {
  id: string;
  event_title: string;
  category: string;
  overall_score?: number;
  placement?: number;
  total_participants?: number;
  points_earned: number;
  competed_at: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  role: string;
  member_count: number;
  total_points: number;
}

interface UserStats {
  total_competitions: number;
  total_points: number;
  average_score: number;
  best_placement: number;
  wins: number;
  podium_finishes: number;
}

export default function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [audioSystems, setAudioSystems] = useState<AudioSystem[]>([]);
  const [competitionResults, setCompetitionResults] = useState<CompetitionResult[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  
  // Form states
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    location: user?.location || '',
    phone: user?.phone || '',
    website: user?.website || '',
    bio: user?.bio || ''
  });

  // Verification states
  const [verificationDocuments, setVerificationDocuments] = useState<File[]>([]);
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [showSystemModal, setShowSystemModal] = useState(false);
  const [editingSystem, setEditingSystem] = useState<AudioSystem | null>(null);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'verification', label: 'Verification', icon: Shield },
    { id: 'system', label: 'Audio System', icon: Car },
    { id: 'competitions', label: 'Competitions', icon: Trophy },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  // Check URL for tab parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && tabs.some(tab => tab.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadAudioSystems(),
        loadCompetitionResults(),
        loadTeams(),
        loadUserStats()
      ]);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAudioSystems = async () => {
    const { data: systems, error } = await supabase
      .from('user_audio_systems')
      .select(`
        *,
        audio_components (*)
      `)
      .eq('user_id', user!.id)
      .order('is_primary', { ascending: false });

    if (error) {
      console.error('Error loading audio systems:', error);
      return;
    }

    setAudioSystems(systems || []);
  };

  const loadCompetitionResults = async () => {
    const { data: results, error } = await supabase
      .from('competition_results')
      .select(`
        *,
        events!inner(title)
      `)
      .eq('user_id', user!.id)
      .order('competed_at', { ascending: false });

    if (error) {
      console.error('Error loading competition results:', error);
      return;
    }

    const formattedResults = (results || []).map(result => ({
      id: result.id,
      event_title: result.events.title,
      category: result.category,
      overall_score: result.overall_score,
      placement: result.placement,
      total_participants: result.total_participants,
      points_earned: result.points_earned,
      competed_at: result.competed_at
    }));

    setCompetitionResults(formattedResults);
  };

  const loadTeams = async () => {
    const { data: teamData, error } = await supabase
      .from('team_members')
      .select(`
        role,
        teams!inner(
          id,
          name,
          description,
          total_points
        )
      `)
      .eq('user_id', user!.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error loading teams:', error);
      return;
    }

    // Get member counts for each team
    const teamsWithCounts = await Promise.all(
      (teamData || []).map(async (item) => {
        const { count } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', item.teams.id)
          .eq('is_active', true);

        return {
          id: item.teams.id,
          name: item.teams.name,
          description: item.teams.description,
          role: item.role,
          member_count: count || 0,
          total_points: item.teams.total_points
        };
      })
    );

    setTeams(teamsWithCounts);
  };

  const loadUserStats = async () => {
    const { data, error } = await supabase
      .rpc('get_user_competition_stats', { user_uuid: user!.id });

    if (error) {
      console.error('Error loading user stats:', error);
      return;
    }

    setUserStats(data);
  };

  const handleProfileUpdate = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profileData.name,
          location: profileData.location,
          phone: profileData.phone,
          website: profileData.website,
          bio: profileData.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsEditing(false);
      // You might want to update the auth context here
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCreateAudioSystem = async (systemData: any) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_audio_systems')
        .insert({
          user_id: user.id,
          ...systemData
        })
        .select()
        .single();

      if (error) throw error;

      await loadAudioSystems();
      setShowSystemModal(false);
    } catch (error) {
      console.error('Error creating audio system:', error);
    }
  };

  const handleAddComponent = async (componentData: any) => {
    if (!selectedSystemId) return;

    try {
      const { error } = await supabase
        .from('audio_components')
        .insert({
          system_id: selectedSystemId,
          ...componentData
        });

      if (error) throw error;

      await loadAudioSystems();
      setShowComponentModal(false);
    } catch (error) {
      console.error('Error adding component:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-8 mb-8 border border-gray-700/50">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            <div className="relative">
              <div className="w-24 h-24 bg-electric-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <button className="absolute bottom-0 right-0 bg-electric-500 text-white p-2 rounded-full hover:bg-electric-600 transition-colors">
                <Upload className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-white mb-2">{user?.name}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-gray-400 mb-4">
                <span className="bg-electric-500/20 text-electric-400 px-3 py-1 rounded-full text-sm font-medium">
                  {user?.membershipType}
                </span>
                {user?.location && <span>{user.location}</span>}
                <span>Member since {new Date().getFullYear()}</span>
              </div>
              <p className="text-gray-300 max-w-2xl leading-relaxed">{user?.bio || 'No bio provided'}</p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="bg-electric-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 flex items-center space-x-2"
            >
              {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              <span>{isEditing ? 'Save' : 'Edit'}</span>
            </button>
          </div>

          {/* Stats */}
          {userStats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6 mt-8 pt-8 border-t border-gray-700/50">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">{userStats.total_competitions}</div>
                <div className="text-gray-400 text-sm">Competitions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-electric-400 mb-1">{userStats.total_points}</div>
                <div className="text-gray-400 text-sm">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-400 mb-1">{userStats.average_score}</div>
                <div className="text-gray-400 text-sm">Avg Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">#{userStats.best_placement || 'N/A'}</div>
                <div className="text-gray-400 text-sm">Best Rank</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1">{userStats.wins}</div>
                <div className="text-gray-400 text-sm">Wins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">{userStats.podium_finishes}</div>
                <div className="text-gray-400 text-sm">Podiums</div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-800/50 p-1 rounded-xl border border-gray-700/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-electric-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'profile' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Full Name</label>
                    <input 
                      type="text" 
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      disabled={!isEditing}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Email</label>
                    <input 
                      type="email" 
                      value={profileData.email}
                      disabled
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Location</label>
                    <input 
                      type="text" 
                      value={profileData.location}
                      onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                      disabled={!isEditing}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Phone</label>
                    <input 
                      type="tel" 
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      disabled={!isEditing}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Website</label>
                    <input 
                      type="url" 
                      value={profileData.website}
                      onChange={(e) => setProfileData({...profileData, website: e.target.value})}
                      disabled={!isEditing}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Bio</label>
                  <textarea 
                    value={profileData.bio}
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    disabled={!isEditing}
                    rows={8}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50 resize-none"
                    placeholder="Tell us about yourself, your car audio journey, and your goals..."
                  />
                </div>
              </div>
              {isEditing && (
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProfileUpdate}
                    className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                <Shield className="h-5 w-5 text-electric-500" />
                <span>Account Verification</span>
              </h2>
              
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user?.verificationStatus === 'verified' ? 'bg-green-500' :
                    user?.verificationStatus === 'rejected' ? 'bg-red-500' :
                    user?.verificationStatus === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}>
                    {user?.verificationStatus === 'verified' ? <CheckCircle className="h-5 w-5 text-white" /> :
                     user?.verificationStatus === 'rejected' ? <X className="h-5 w-5 text-white" /> :
                     user?.verificationStatus === 'pending' ? <AlertTriangle className="h-5 w-5 text-white" /> :
                     <Shield className="h-5 w-5 text-white" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Verification Status: {user?.verificationStatus === 'verified' ? 'Verified' :
                                           user?.verificationStatus === 'rejected' ? 'Rejected' :
                                           user?.verificationStatus === 'pending' ? 'Pending Approval' : 'Unverified'}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {user?.verificationStatus === 'verified' ? 'Your account has been fully verified.' :
                       user?.verificationStatus === 'rejected' ? 'Your verification was rejected. Please submit new documents.' :
                       user?.verificationStatus === 'pending' ? 'Your verification is pending review by our team.' : 
                       'Please submit verification documents to verify your account.'}
                    </p>
                  </div>
                </div>
                
                {user?.verificationStatus === 'pending' && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-400">Verification In Progress</h4>
                        <p className="text-sm text-yellow-300 mt-1">
                          Your verification documents are being reviewed by our team. This process typically takes 1-2 business days.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {user?.verificationStatus === 'rejected' && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <X className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-red-400">Verification Rejected</h4>
                        <p className="text-sm text-red-300 mt-1">
                          Your verification was rejected. Please submit new documents that meet our requirements.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {user?.verificationStatus === 'verified' && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-green-400">Verification Complete</h4>
                        <p className="text-sm text-green-300 mt-1">
                          Your account has been fully verified. You now have access to all platform features.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {(user?.verificationStatus === 'unverified' || user?.verificationStatus === 'rejected') && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Submit Verification Documents</h3>
                  
                  {verificationError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        <span className="text-red-400">{verificationError}</span>
                      </div>
                    </div>
                  )}
                  
                  {verificationSuccess && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span className="text-green-400">Verification documents submitted successfully!</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Upload Verification Documents
                      </label>
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-electric-500 transition-colors">
                        <FileCheck className="h-10 w-10 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">
                          {user?.membershipType === 'competitor' ? 
                            'Upload a photo ID (driver\'s license, passport, etc.)' :
                            'Upload business documents (license, registration, etc.)'}
                        </p>
                        <p className="text-gray-500 text-sm mb-4">
                          Accepted formats: JPG, PNG, PDF (max 5MB)
                        </p>
                        <input
                          type="file"
                          multiple
                          onChange={(e) => {
                            if (e.target.files) {
                              setVerificationDocuments(Array.from(e.target.files));
                            }
                          }}
                          className="hidden"
                          id="verification-documents"
                          accept=".jpg,.jpeg,.png,.pdf"
                        />
                        <label
                          htmlFor="verification-documents"
                          className="bg-electric-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 cursor-pointer"
                        >
                          Select Files
                        </label>
                      </div>
                      
                      {verificationDocuments.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-white font-medium mb-2">Selected Files:</h4>
                          <ul className="space-y-2">
                            {verificationDocuments.map((file, index) => (
                              <li key={index} className="flex items-center justify-between bg-gray-700/30 p-2 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <FileCheck className="h-4 w-4 text-electric-500" />
                                  <span className="text-gray-300 text-sm">{file.name}</span>
                                </div>
                                <button
                                  onClick={() => {
                                    setVerificationDocuments(verificationDocuments.filter((_, i) => i !== index));
                                  }}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={async () => {
                        if (verificationDocuments.length === 0) {
                          setVerificationError('Please select at least one document to upload');
                          return;
                        }
                        
                        setIsSubmittingVerification(true);
                        setVerificationError('');
                        
                        try {
                          // Upload each document to Supabase Storage
                          const uploadPromises = verificationDocuments.map(async (file) => {
                            const fileName = `${user?.id}/${Date.now()}-${file.name}`;
                            const { data, error } = await supabase.storage
                              .from('verification-documents')
                              .upload(fileName, file);
                              
                            if (error) throw error;
                            
                            return {
                              path: data.path,
                              name: file.name,
                              type: file.type,
                              size: file.size,
                              uploaded_at: new Date().toISOString()
                            };
                          });
                          
                          const uploadedFiles = await Promise.all(uploadPromises);
                          
                          // Update user verification status and documents
                          const { error: updateError } = await supabase
                            .from('users')
                            .update({
                              verification_status: 'pending',
                              verification_documents: uploadedFiles,
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', user?.id);
                            
                          if (updateError) throw updateError;
                          
                          setVerificationSuccess(true);
                          setVerificationDocuments([]);
                          
                          // Update local user state
                          if (user) {
                            user.verificationStatus = 'pending';
                          }
                          
                          // Clear success message after 5 seconds
                          setTimeout(() => {
                            setVerificationSuccess(false);
                          }, 5000);
                          
                        } catch (error) {
                          console.error('Error submitting verification:', error);
                          setVerificationError('Failed to submit verification documents. Please try again.');
                        } finally {
                          setIsSubmittingVerification(false);
                        }
                      }}
                      disabled={verificationDocuments.length === 0 || isSubmittingVerification}
                      className="w-full bg-electric-500 text-white py-3 px-4 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isSubmittingVerification ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <>
                          <Shield className="h-5 w-5" />
                          <span>Submit for Verification</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Verification Requirements */}
              <div className="mt-8 bg-gray-700/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Verification Requirements</h3>
                
                {user?.membershipType === 'competitor' ? (
                  <div className="space-y-3">
                    <p className="text-gray-300">To verify your competitor account, please provide:</p>
                    <ul className="list-disc list-inside text-gray-400 space-y-1">
                      <li>A clear photo of your government-issued ID (driver's license, passport, etc.)</li>
                      <li>The ID must be valid and not expired</li>
                      <li>Your name and photo must be clearly visible</li>
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-300">To verify your business account, please provide:</p>
                    <ul className="list-disc list-inside text-gray-400 space-y-1">
                      <li>Business license or registration certificate</li>
                      <li>Tax ID or EIN documentation</li>
                      <li>Proof of business address (utility bill, lease agreement, etc.)</li>
                      <li>Photo ID of the business owner or authorized representative</li>
                    </ul>
                  </div>
                )}
                
                <div className="mt-4 text-gray-500 text-sm">
                  <p>All documents will be reviewed by our team within 1-2 business days.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Audio Systems</h2>
                <button
                  onClick={() => setShowSystemModal(true)}
                  className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add System</span>
                </button>
              </div>

              {audioSystems.map((system) => (
                <div key={system.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                        <span>{system.name}</span>
                        {system.is_primary && (
                          <span className="bg-electric-500 text-white px-2 py-1 rounded text-xs">Primary</span>
                        )}
                      </h3>
                      {system.vehicle_make && (
                        <p className="text-gray-400">
                          {system.vehicle_year} {system.vehicle_make} {system.vehicle_model}
                        </p>
                      )}
                      {system.description && (
                        <p className="text-gray-300 mt-2">{system.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedSystemId(system.id);
                        setShowComponentModal(true);
                      }}
                      className="bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-600 transition-colors flex items-center space-x-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Component</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {system.components.map((component) => (
                      <div key={component.id} className="bg-gray-700/30 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-white font-semibold capitalize">
                            {component.category.replace('_', ' ')}
                          </h4>
                          <button className="text-gray-400 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-electric-400 font-medium">{component.brand} {component.model}</p>
                        {component.description && (
                          <p className="text-gray-400 text-sm mt-1">{component.description}</p>
                        )}
                        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                          {component.power_watts && <span>{component.power_watts}W</span>}
                          {component.price && <span>${component.price}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {audioSystems.length === 0 && (
                <div className="text-center py-12 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl">
                  <Car className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No Audio Systems</h3>
                  <p className="text-gray-500 mb-4">Add your first audio system to get started</p>
                  <button
                    onClick={() => setShowSystemModal(true)}
                    className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Add Audio System
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'competitions' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Competition History</h2>
              
              {competitionResults.length > 0 ? (
                <div className="space-y-4">
                  {competitionResults.map((result) => (
                    <div key={result.id} className="bg-gray-700/30 p-4 rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{result.event_title}</h3>
                        <div className="text-gray-400 text-sm flex items-center space-x-4 mt-1">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(result.competed_at).toLocaleDateString()}</span>
                          </span>
                          <span className="bg-gray-600 px-2 py-1 rounded text-xs">{result.category}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        {result.placement && (
                          <div className="flex items-center space-x-2">
                            <Award className="h-4 w-4 text-yellow-400" />
                            <span className="text-yellow-400 font-bold">#{result.placement}</span>
                            {result.total_participants && (
                              <span className="text-gray-400 text-sm">of {result.total_participants}</span>
                            )}
                          </div>
                        )}
                        {result.overall_score && (
                          <div className="flex items-center space-x-2">
                            <Target className="h-4 w-4 text-electric-400" />
                            <span className="text-electric-400 font-medium">{result.overall_score}/10</span>
                          </div>
                        )}
                        <div className="text-purple-400 font-medium">{result.points_earned} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No Competition Results</h3>
                  <p className="text-gray-500">Your competition results will appear here once you participate in events</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Teams</h2>
                <button className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Create Team</span>
                </button>
              </div>
              
              {teams.length > 0 ? (
                <div className="space-y-4">
                  {teams.map((team) => (
                    <div key={team.id} className="bg-gray-700/30 p-4 rounded-lg flex items-center justify-between">
                      <div>
                        <h3 className="text-white font-semibold">{team.name}</h3>
                        <div className="text-gray-400 text-sm flex items-center space-x-4 mt-1">
                          <span className="capitalize bg-electric-500/20 text-electric-400 px-2 py-1 rounded text-xs">
                            {team.role}
                          </span>
                          <span>{team.member_count} members</span>
                          <span>{team.total_points} points</span>
                        </div>
                        {team.description && (
                          <p className="text-gray-300 text-sm mt-2">{team.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-electric-500" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No Teams</h3>
                  <p className="text-gray-500 mb-4">Join or create a team to collaborate with other enthusiasts</p>
                  <div className="flex justify-center space-x-4">
                    <button className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors">
                      Browse Teams
                    </button>
                    <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                      Create Team
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" defaultChecked />
                      <span className="text-gray-300">Event reminders</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" defaultChecked />
                      <span className="text-gray-300">Competition results</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" />
                      <span className="text-gray-300">Team invitations</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" />
                      <span className="text-gray-300">Marketing emails</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Privacy</h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" defaultChecked />
                      <span className="text-gray-300">Show profile in directory</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" defaultChecked />
                      <span className="text-gray-300">Show competition results</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500" defaultChecked />
                      <span className="text-gray-300">Show audio system details</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Account Actions</h3>
                  <div className="space-y-3">
                    <button className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors">
                      Change Password
                    </button>
                    <button className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors">
                      Download Data
                    </button>
                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals would go here - Audio System Modal, Component Modal, etc. */}
    </div>
  );
}