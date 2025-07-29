import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Trophy, Star, Users, Car } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../components/NotificationSystem';

interface EventData {
  id: string;
  title: string;
  start_date: string;
  city: string;
  state: string;
  category: string;
  organization?: {
    competition_classes?: string[];
  };
}

interface CompetitionClass {
  value: string;
  label: string;
}

export default function EventResults() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasAttendance, setHasAttendance] = useState(false);
  const [existingResults, setExistingResults] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    category: '',
    class: '',
    vehicle_year: '',
    vehicle_make: '',
    vehicle_model: '',
    score: '',
    placement: '',
    total_participants: '',
    points_earned: '',
    notes: ''
  });

  // Competition categories
  const categories = [
    'SPL',
    'Sound Quality',
    'Installation',
    'RTA',
    'Bass Race',
    'Show & Shine',
    'Other'
  ];

  // Competition classes - will be loaded from organization
  const [competitionClasses, setCompetitionClasses] = useState<CompetitionClass[]>([]);

  useEffect(() => {
    if (user && id) {
      loadEventAndAttendance();
    }
  }, [user, id]);

  const loadEventAndAttendance = async () => {
    try {
      setLoading(true);
      
      // Load event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          organizations (
            id,
            name,
            competition_classes
          )
        `)
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Load competition classes from organization
      if (eventData.organizations?.competition_classes) {
        const classes = eventData.organizations.competition_classes.map((c: string) => ({
          value: c,
          label: c
        }));
        setCompetitionClasses(classes);
      }

      // Check if user has marked attendance
      const { data: attendance, error: attendanceError } = await supabase
        .from('event_attendance')
        .select('id')
        .eq('user_id', user!.id)
        .eq('event_id', id)
        .single();

      if (!attendanceError && attendance) {
        setHasAttendance(true);
      }

      // Check if user already has results for this event
      const { data: results, error: resultsError } = await supabase
        .from('competition_results')
        .select('id')
        .eq('user_id', user!.id)
        .eq('event_id', id)
        .single();

      if (!resultsError && results) {
        setExistingResults(true);
      }

    } catch (error) {
      console.error('Error loading event:', error);
      showError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !event) return;

    try {
      setSaving(true);

      // First, ensure attendance is marked
      if (!hasAttendance) {
        const { error: attendanceError } = await supabase
          .from('event_attendance')
          .insert({
            user_id: user.id,
            event_id: event.id,
            attended_date: event.start_date.split('T')[0],
            status: 'attended'
          });

        if (attendanceError && attendanceError.code !== '23505') { // Ignore duplicate key error
          throw attendanceError;
        }
      }

      // Get attendance record
      const { data: attendance, error: attendanceError } = await supabase
        .from('event_attendance')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_id', event.id)
        .single();

      if (attendanceError) throw attendanceError;

      // Calculate points based on placement
      const placement = parseInt(formData.placement);
      let pointsEarned = 0;
      
      if (placement === 1) pointsEarned = 10;
      else if (placement === 2) pointsEarned = 8;
      else if (placement === 3) pointsEarned = 6;
      else if (placement <= 5) pointsEarned = 4;
      else if (placement <= 10) pointsEarned = 2;
      else pointsEarned = 1;

      // Save competition results
      const { error: resultsError } = await supabase
        .from('competition_results')
        .insert({
          user_id: user.id,
          event_id: event.id,
          event_attendance_id: attendance.id,
          category: formData.category,
          class: formData.class || null,
          vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
          vehicle_make: formData.vehicle_make || null,
          vehicle_model: formData.vehicle_model || null,
          score: formData.score ? parseFloat(formData.score) : null,
          placement: placement,
          total_participants: formData.total_participants ? parseInt(formData.total_participants) : null,
          points_earned: formData.points_earned ? parseInt(formData.points_earned) : pointsEarned,
          notes: formData.notes || null
        });

      if (resultsError) throw resultsError;

      showSuccess('Competition results saved successfully!');
      navigate('/profile#competitions');

    } catch (error: any) {
      console.error('Error saving results:', error);
      showError(error.message || 'Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Event Not Found</h2>
          <Link
            to="/dashboard"
            className="text-electric-400 hover:text-electric-300"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (existingResults) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Results Already Submitted</h2>
          <p className="text-gray-400 mb-6">
            You have already submitted results for this event.
          </p>
          <Link
            to="/profile#competitions"
            className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors"
          >
            View Your Results
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Add Competition Results</h1>
            <p className="text-gray-400">Submit your scores and placement for {event.title}</p>
          </div>
        </div>

        {/* Event Info */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">{event.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-400">
            <div>
              <span className="block text-gray-500 text-sm">Date</span>
              {new Date(event.start_date).toLocaleDateString()}
            </div>
            <div>
              <span className="block text-gray-500 text-sm">Location</span>
              {event.city}, {event.state}
            </div>
            <div>
              <span className="block text-gray-500 text-sm">Category</span>
              {event.category}
            </div>
          </div>
        </div>

        {/* Results Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Competition Details */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-electric-500" />
              <span>Competition Details</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Competition Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Competition Class
                </label>
                <select
                  value={formData.class}
                  onChange={(e) => updateField('class', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="">Select class (optional)</option>
                  {competitionClasses.map(cls => (
                    <option key={cls.value} value={cls.value}>{cls.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Car className="h-5 w-5 text-electric-500" />
              <span>Vehicle Information</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Year
                </label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.vehicle_year}
                  onChange={(e) => updateField('vehicle_year', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="2024"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Make
                </label>
                <input
                  type="text"
                  value={formData.vehicle_make}
                  onChange={(e) => updateField('vehicle_make', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Honda"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Model
                </label>
                <input
                  type="text"
                  value={formData.vehicle_model}
                  onChange={(e) => updateField('vehicle_model', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Civic"
                />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
              <Star className="h-5 w-5 text-electric-500" />
              <span>Competition Results</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Score (if applicable)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.score}
                  onChange={(e) => updateField('score', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="150.5"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Placement *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.placement}
                  onChange={(e) => updateField('placement', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Total Participants
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.total_participants}
                  onChange={(e) => updateField('total_participants', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="25"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Points Earned (auto-calculated)
                </label>
                <input
                  type="number"
                  value={formData.points_earned}
                  onChange={(e) => updateField('points_earned', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Auto-calculated based on placement"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-gray-400 text-sm mb-2">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={3}
                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                placeholder="Any additional notes about your performance..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              <span>{saving ? 'Saving...' : 'Save Results'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}