import React, { useState, useEffect } from 'react';
import { 
  X, Save, Calendar, Trophy, Award, Car, CheckCircle, AlertTriangle,
  User, MapPin, Hash, Target, FileText, Clock, Shield
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from './NotificationSystem';
import { competitionResultsAPI } from '../api/competition-results';
import { formatDateForInput, isWithinTimeWindow } from '../utils/dateFormatters';

interface CompetitionResult {
  id: string;
  user_id: string;
  event_id?: number;
  event_attendance_id?: string;
  category: string;
  class?: string;
  division_id?: string;
  class_id?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  score?: number;
  position?: number;
  total_participants?: number;
  points_earned: number;
  notes?: string;
  verified?: boolean;
  verified_by?: string;
  verified_at?: string;
  is_cae_event: boolean;
  event_name?: string;
  event_date?: string;
  event_location?: string;
  created_at: string;
  updated_at: string;
  events?: {
    id: number;
    title: string;
    start_date: string;
    city: string;
    state: string;
  };
  users?: {
    id: string;
    name: string;
    email: string;
  };
  competition_divisions?: {
    name: string;
  };
  competition_classes?: {
    name: string;
  };
}

interface Division {
  id: string;
  name: string;
  description?: string;
  display_order: number;
}

interface CompetitionClass {
  id: string;
  division_id: string;
  name: string;
  description?: string;
  display_order: number;
}

interface EditFormData {
  event_name: string;
  event_date: string;
  event_location: string;
  category: string;
  division_id: string;
  class_id: string;
  class_name: string;
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  score: string;
  position: string;
  total_participants: string;
  points_earned: string;
  notes: string;
  verified: boolean;
}

interface EditCompetitionResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: CompetitionResult;
  onSuccess: () => void;
  isAdmin: boolean;
}

export default function EditCompetitionResultModal({
  isOpen,
  onClose,
  result,
  onSuccess,
  isAdmin
}: EditCompetitionResultModalProps) {
  const { user } = useAuth();
  const { showSuccess, showError } = useNotifications();

  // State management
  const [loading, setSaving] = useState(false);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [classes, setClasses] = useState<CompetitionClass[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<CompetitionClass[]>([]);
  const [showNewClassInput, setShowNewClassInput] = useState(false);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form data
  const [formData, setFormData] = useState<EditFormData>({
    event_name: '',
    event_date: '',
    event_location: '',
    category: '',
    division_id: '',
    class_id: '',
    class_name: '',
    vehicle_year: '',
    vehicle_make: '',
    vehicle_model: '',
    score: '',
    position: '',
    total_participants: '',
    points_earned: '',
    notes: '',
    verified: false
  });

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && result) {
      const eventDate = result.event_date || result.events?.start_date || '';
      const eventLocation = result.event_location || 
        (result.events ? `${result.events.city}, ${result.events.state}` : '');

      setFormData({
        event_name: result.event_name || result.events?.title || '',
        event_date: formatDateForInput(eventDate),
        event_location: eventLocation,
        category: result.category || '',
        division_id: result.division_id || '',
        class_id: result.class_id || '',
        class_name: '',
        vehicle_year: result.vehicle_year?.toString() || '',
        vehicle_make: result.vehicle_make || '',
        vehicle_model: result.vehicle_model || '',
        score: result.score?.toString() || '',
        position: result.position?.toString() || '',
        total_participants: result.total_participants?.toString() || '',
        points_earned: result.points_earned?.toString() || '',
        notes: result.notes || '',
        verified: result.verified || false
      });
      
      loadDivisions();
      if (result.division_id) {
        loadClasses(result.division_id);
      }
      setHasChanges(false);
    }
  }, [isOpen, result]);

  // Track form changes
  useEffect(() => {
    if (result) {
      const hasFormChanges = 
        formData.event_name !== (result.event_name || result.events?.title || '') ||
        formData.category !== (result.category || '') ||
        formData.division_id !== (result.division_id || '') ||
        formData.class_id !== (result.class_id || '') ||
        formData.vehicle_year !== (result.vehicle_year?.toString() || '') ||
        formData.vehicle_make !== (result.vehicle_make || '') ||
        formData.vehicle_model !== (result.vehicle_model || '') ||
        formData.score !== (result.score?.toString() || '') ||
        formData.position !== (result.position?.toString() || '') ||
        formData.total_participants !== (result.total_participants?.toString() || '') ||
        formData.points_earned !== (result.points_earned?.toString() || '') ||
        formData.notes !== (result.notes || '') ||
        (isAdmin && formData.verified !== (result.verified || false));
      
      setHasChanges(hasFormChanges);
    }
  }, [formData, result, isAdmin]);

  const loadDivisions = async () => {
    setIsLoadingDivisions(true);
    try {
      const { data, error } = await supabase
        .from('competition_divisions')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        // Table might not exist, set empty array and don't log error
        setDivisions([]);
      } else {
        setDivisions(data || []);
      }
    } catch (error) {
      // Table doesn't exist, set empty array
      setDivisions([]);
    } finally {
      setIsLoadingDivisions(false);
    }
  };

  const loadClasses = async (divisionId: string) => {
    setIsLoadingClasses(true);
    try {
      const { data, error } = await supabase
        .from('competition_classes')
        .select('*')
        .eq('division_id', divisionId)
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        // Table might not exist, set empty array and don't log error
        setClasses([]);
        setFilteredClasses([]);
      } else {
        setClasses(data || []);
        setFilteredClasses(data || []);
      }
    } catch (error) {
      // Table doesn't exist, set empty array
      setClasses([]);
      setFilteredClasses([]);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const handleInputChange = (field: keyof EditFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDivisionChange = (divisionId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      division_id: divisionId, 
      class_id: '', 
      class_name: '' 
    }));
    setShowNewClassInput(false);
    if (divisionId) {
      loadClasses(divisionId);
    } else {
      setFilteredClasses([]);
    }
  };

  const handleClassChange = (classId: string) => {
    if (classId === 'new') {
      setShowNewClassInput(true);
      setFormData(prev => ({ ...prev, class_id: '', class_name: '' }));
    } else {
      setFormData(prev => ({ ...prev, class_id: classId, class_name: '' }));
      setShowNewClassInput(false);
    }
  };

  const validateForm = (): string | null => {
    if (!formData.event_name.trim()) {
      return 'Event name is required';
    }
    if (!formData.category) {
      return 'Category is required';
    }
    if (!formData.division_id) {
      return 'Division is required';
    }
    if (!formData.class_id && !formData.class_name.trim()) {
      return 'Class is required';
    }
    if (!formData.score) {
      return 'Score is required';
    }
    if (!formData.position) {
      return 'Placement is required';
    }
    if (!formData.points_earned) {
      return 'Points earned is required';
    }
    
    // Validate numeric fields
    const score = parseFloat(formData.score);
    if (isNaN(score)) {
      return 'Score must be a valid number';
    }
    if (score < 0 || score > 200) {
      return 'Score must be between 0 and 200';
    }
    
    const position = parseInt(formData.position);
    if (isNaN(position) || position < 1) {
      return 'Placement must be a valid positive number';
    }
    
    if (formData.total_participants) {
      const participants = parseInt(formData.total_participants);
      if (isNaN(participants) || participants < 1) {
        return 'Total participants must be a valid positive number';
      }
      if (participants < position) {
        return 'Total participants must be greater than or equal to position';
      }
    }
    
    const pointsEarned = parseInt(formData.points_earned);
    if (isNaN(pointsEarned) || pointsEarned < 0) {
      return 'Points earned must be a valid non-negative number';
    }
    if (formData.vehicle_year && (isNaN(parseInt(formData.vehicle_year)) || parseInt(formData.vehicle_year) < 1900 || parseInt(formData.vehicle_year) > new Date().getFullYear() + 1)) {
      return 'Vehicle year must be a valid year';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const validationError = validateForm();
    if (validationError) {
      showError('Validation Error', validationError);
      return;
    }

    // Check permissions for verified results
    if (result.verified && !isAdmin) {
      showError('Permission Denied', 'Verified results cannot be edited. Contact an admin for changes.');
      return;
    }

    // Check time restrictions for non-admin users
    if (!isAdmin) {
      if (!isWithinTimeWindow(result.created_at, 24)) {
        showError('Time Limit Exceeded', 'Results can only be edited within 24 hours of creation');
        return;
      }

      // Check ownership
      if (result.user_id !== user?.id) {
        showError('Permission Denied', 'You can only edit your own results');
        return;
      }

      // CAE event restriction
      if (result.is_cae_event) {
        showError('Permission Denied', 'CAE event results can only be edited by administrators');
        return;
      }
    }

    setSaving(true);
    try {
      let classId = formData.class_id;
      
      // Create new class if needed
      if (!classId && formData.class_name.trim()) {
        const { data: classResult, error: classError } = await supabase
          .rpc('create_or_get_competition_class', {
            p_division_id: formData.division_id,
            p_class_name: formData.class_name.trim(),
            p_created_by: user?.id
          });
        
        if (classError) throw classError;
        classId = classResult;
      }

      // Prepare update data
      const updateData: any = {
        category: formData.category,
        division_id: formData.division_id,
        class_id: classId,
        vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
        vehicle_make: formData.vehicle_make || null,
        vehicle_model: formData.vehicle_model || null,
        score: parseFloat(formData.score),
        position: parseInt(formData.position),
        total_participants: formData.total_participants ? parseInt(formData.total_participants) : null,
        points_earned: parseInt(formData.points_earned),
        notes: formData.notes || null,
        updated_at: new Date().toISOString()
      };

      // Only update event details for non-CAE events
      if (!result.is_cae_event) {
        updateData.event_name = formData.event_name;
        updateData.event_date = formData.event_date || null;
        updateData.event_location = formData.event_location || null;
      }

      // Admin-only fields
      if (isAdmin) {
        if (formData.verified && !result.verified) {
          updateData.verified = true;
          updateData.verified_by = user?.id;
          updateData.verified_at = new Date().toISOString();
        } else if (!formData.verified && result.verified) {
          updateData.verified = false;
          updateData.verified_by = null;
          updateData.verified_at = null;
        }
      }

      // Use secure API for update
      const response = await competitionResultsAPI.update(result.id, updateData);

      if (!response.success) {
        // Handle specific error codes
        if (response.error?.code === 'VERIFIED_RESULT') {
          showError('Update Failed', response.error.message);
          return;
        }
        throw new Error(response.error?.message || 'Failed to update result');
      }

      showSuccess('Success', 'Competition result updated successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating result:', error);
      showError('Update Failed', error.message || 'Failed to update competition result');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Check if this is a CAE event that user cannot edit
  const canEditEventDetails = isAdmin || !result.is_cae_event;
  const canEditVerification = isAdmin;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-electric-500" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Edit Competition Result</h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {result.is_cae_event ? 'CAE Event Result' : 'Non-CAE Event Result'}
                    {result.users && ` • ${result.users.name}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Warning for CAE events */}
            {result.is_cae_event && !isAdmin && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="text-yellow-400 font-medium">CAE Event Result</h4>
                    <p className="text-yellow-200 text-sm mt-1">
                      Event details cannot be modified for CAE events. Only competition details and vehicle information can be updated.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Event Information */}
            <div>
              <h4 className="text-white font-semibold mb-4 flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-electric-500" />
                <span>Event Information</span>
                {!canEditEventDetails && <Shield className="h-4 w-4 text-yellow-500" />}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Event Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.event_name}
                    onChange={(e) => handleInputChange('event_name', e.target.value)}
                    disabled={!canEditEventDetails}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter event name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Event Date</label>
                  <input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => handleInputChange('event_date', e.target.value)}
                    disabled={!canEditEventDetails}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.event_location}
                    onChange={(e) => handleInputChange('event_location', e.target.value)}
                    disabled={!canEditEventDetails}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Enter event location"
                  />
                </div>
              </div>
            </div>

            {/* Competition Details */}
            <div>
              <h4 className="text-white font-semibold mb-4 flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-electric-500" />
                <span>Competition Details</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    required
                  >
                    <option value="">Select category...</option>
                    <option value="SPL (Sound Pressure Level)">SPL (Sound Pressure Level)</option>
                    <option value="SQ (Sound Quality)">SQ (Sound Quality)</option>
                    <option value="Install Quality">Install Quality</option>
                    <option value="Bass Race">Bass Race</option>
                    <option value="Demo">Demo</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Division <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.division_id}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    required
                    disabled={isLoadingDivisions}
                  >
                    <option value="">Select division...</option>
                    {divisions.map(division => (
                      <option key={division.id} value={division.id}>
                        {division.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">
                    Class <span className="text-red-500">*</span>
                  </label>
                  {!showNewClassInput ? (
                    <select
                      value={formData.class_id}
                      onChange={(e) => handleClassChange(e.target.value)}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      required
                      disabled={!formData.division_id || isLoadingClasses}
                    >
                      <option value="">Select class...</option>
                      {filteredClasses.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                      {formData.division_id && (
                        <option value="new">+ Add New Class</option>
                      )}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={formData.class_name}
                        onChange={(e) => handleInputChange('class_name', e.target.value)}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                        placeholder="Enter new class name..."
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewClassInput(false);
                          setFormData(prev => ({ ...prev, class_id: '', class_name: '' }));
                        }}
                        className="text-sm text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div>
              <h4 className="text-white font-semibold mb-4 flex items-center space-x-2">
                <Car className="h-5 w-5 text-electric-500" />
                <span>Vehicle Information</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Year</label>
                  <input
                    type="number"
                    value={formData.vehicle_year}
                    onChange={(e) => handleInputChange('vehicle_year', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="2023"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Make</label>
                  <input
                    type="text"
                    value={formData.vehicle_make}
                    onChange={(e) => handleInputChange('vehicle_make', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                    placeholder="Toyota"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Model</label>
                  <input
                    type="text"
                    value={formData.vehicle_model}
                    onChange={(e) => handleInputChange('vehicle_model', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
                    placeholder="Camry"
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            <div>
              <h4 className="text-white font-semibold mb-4 flex items-center space-x-2">
                <Award className="h-5 w-5 text-electric-500" />
                <span>Results</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Score <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.score}
                    onChange={(e) => handleInputChange('score', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="155.3"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Placement <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="1"
                    min="1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Total Participants</label>
                  <input
                    type="number"
                    value={formData.total_participants}
                    onChange={(e) => handleInputChange('total_participants', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="25"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Points Earned <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.points_earned}
                    onChange={(e) => handleInputChange('points_earned', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="100"
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Admin Controls */}
            {canEditVerification && (
              <div>
                <h4 className="text-white font-semibold mb-4 flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-electric-500" />
                  <span>Admin Controls</span>
                </h4>
                
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.verified}
                      onChange={(e) => handleInputChange('verified', e.target.checked)}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
                    />
                    <div>
                      <span className="text-white font-medium">Verified Result</span>
                      <p className="text-gray-400 text-sm">Mark this result as verified and official</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 resize-none"
                rows={3}
                placeholder="Additional details about the competition..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-700 flex justify-between items-center">
            <div className="text-gray-400 text-sm">
              {hasChanges && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>You have unsaved changes</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !hasChanges}
                className="flex items-center gap-2 px-6 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}