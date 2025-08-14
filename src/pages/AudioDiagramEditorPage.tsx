import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AudioDiagramEditor from '../components/AudioDiagramEditor';
import { ArrowLeft, Car } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AudioDiagramEditorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [audioSystem, setAudioSystem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to access the diagram editor');
      navigate('/login');
      return;
    }
    loadAudioSystem();
  }, [user]);

  const loadAudioSystem = async () => {
    try {
      // Fetch the primary audio system with diagram configurations
      const { data: audioSystemData, error } = await supabase
        .from('user_audio_systems')
        .select('*, diagram_configurations')
        .eq('user_id', user?.id)
        .eq('is_primary', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No audio system found
          toast.error('Please create an audio system first');
          navigate('/member-profile-settings');
          return;
        }
        throw error;
      }

      setAudioSystem(audioSystemData);
    } catch (error) {
      console.error('Error loading audio system:', error);
      toast.error('Failed to load audio system');
      navigate('/member-profile-settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    // Optionally refresh the data or navigate back
    toast.success('Diagram saved! View it on your profile.');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!audioSystem) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Audio System Found</h2>
          <p className="text-gray-400 mb-6">
            Please create an audio system before creating a diagram.
          </p>
          <button
            onClick={() => navigate('/member-profile-settings')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md transition-colors"
          >
            Go to Profile Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/member-profile-settings')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Profile Settings</span>
        </button>

        <div className="flex items-center space-x-3">
          <Car className="h-8 w-8 text-primary-500" />
          <div>
            <h1 className="text-3xl font-bold text-white">Audio System Diagram Editor</h1>
            <p className="text-gray-400 mt-1">
              Create a visual diagram of your audio system installation
            </p>
          </div>
        </div>
      </div>

      {/* Vehicle Info */}
      {audioSystem && (
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
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
            {audioSystem.total_power_watts && (
              <div>
                <span className="text-gray-500 text-sm">Total Power</span>
                <p className="text-white font-medium">{audioSystem.total_power_watts.toLocaleString()} Watts</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diagram Editor */}
      <AudioDiagramEditor
        audioSystemId={audioSystem.id}
        initialData={audioSystem.diagram_configurations ? 
          audioSystem.diagram_configurations.find((c: any) => c.slot === 1)?.data :
          audioSystem.diagram_configuration}
        components={audioSystem.components || []}
        onSave={handleSave}
      />
    </div>
  );
}