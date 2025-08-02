import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { X, Calendar, Trophy, Award, Car, Save, CheckCircle, Search } from 'lucide-react';

interface LogCAEEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

interface Event {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  location_name: string;
  city: string;
  state: string;
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

interface EventFormData {
  event_id: string;
  division_id: string;
  class_id: string;
  class_name: string; // For new class creation
  vehicle_year: string;
  vehicle_make: string;
  vehicle_model: string;
  score: string;
  placement: string;
  total_participants: string;
  points_earned: string;
  notes: string;
}

const LogCAEEventModal: React.FC<LogCAEEventModalProps> = ({ 
  isOpen, 
  onClose, 
  userId,
  onSuccess 
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [classes, setClasses] = useState<CompetitionClass[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<CompetitionClass[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showNewClassInput, setShowNewClassInput] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [formData, setFormData] = useState<EventFormData>({
    event_id: '',
    division_id: '',
    class_id: '',
    class_name: '',
    vehicle_year: '',
    vehicle_make: '',
    vehicle_model: '',
    score: '',
    placement: '',
    total_participants: '',
    points_earned: '',
    notes: ''
  });

  // Load recent events and divisions on mount
  useEffect(() => {
    if (isOpen) {
      loadRecentEvents();
      loadDivisions();
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Load classes when division changes
  useEffect(() => {
    if (formData.division_id) {
      loadClasses(formData.division_id);
    } else {
      setFilteredClasses([]);
      setShowNewClassInput(false);
    }
  }, [formData.division_id]);

  const loadRecentEvents = async () => {
    setIsLoadingEvents(true);
    try {
      // Get events from the last year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_date, end_date, city, state')
        .gte('start_date', oneYearAgo.toISOString())
        .order('start_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const searchEvents = async (term?: string) => {
    const searchQuery = term !== undefined ? term : searchTerm;
    
    if (!searchQuery.trim()) {
      loadRecentEvents();
      return;
    }

    setIsLoadingEvents(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_date, end_date, city, state')
        .or(`title.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%,state.ilike.%${searchQuery}%`)
        .order('start_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error searching events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const loadDivisions = async () => {
    setIsLoadingDivisions(true);
    try {
      const { data, error } = await supabase
        .from('competition_divisions')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setDivisions(data || []);
    } catch (error) {
      console.error('Error loading divisions:', error);
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

      if (error) throw error;
      setClasses(data || []);
      setFilteredClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    setFormData({ ...formData, event_id: event.id.toString() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEvent) {
      alert('Please select an event');
      return;
    }

    // Validate required fields
    if (!formData.division_id || (!formData.class_id && !formData.class_name) || !formData.score || !formData.placement || !formData.points_earned) {
      alert('Please fill in all required fields');
      return;
    }

    setSaveStatus('saving');
    
    try {
      let classId = formData.class_id;
      
      // If creating a new class, call the function to create or get it
      if (!classId && formData.class_name) {
        const { data: classResult, error: classError } = await supabase
          .rpc('create_or_get_competition_class', {
            p_division_id: formData.division_id,
            p_class_name: formData.class_name,
            p_created_by: userId
          });
        
        if (classError) throw classError;
        classId = classResult;
      }

      const competitionData = {
        user_id: userId,
        event_id: parseInt(formData.event_id),
        is_cae_event: true,
        event_name: selectedEvent.title,
        event_date: selectedEvent.start_date,
        event_location: `${selectedEvent.city}, ${selectedEvent.state}`,
        division_id: formData.division_id,
        class_id: classId,
        vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : null,
        vehicle_make: formData.vehicle_make || null,
        vehicle_model: formData.vehicle_model || null,
        score: formData.score ? parseFloat(formData.score) : null,
        placement: formData.placement ? parseInt(formData.placement) : null,
        total_participants: formData.total_participants ? parseInt(formData.total_participants) : null,
        points_earned: parseInt(formData.points_earned) || 0,
        notes: formData.notes || null
      };

      const { error } = await supabase
        .from('competition_results')
        .insert(competitionData);

      if (error) throw error;

      setSaveStatus('success');
      
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 1500);
      
    } catch (error) {
      console.error('Error saving competition result:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const resetForm = () => {
    setFormData({
      event_id: '',
      division_id: '',
      class_id: '',
      class_name: '',
      vehicle_year: '',
      vehicle_make: '',
      vehicle_model: '',
      score: '',
      placement: '',
      total_participants: '',
      points_earned: '',
      notes: ''
    });
    setSelectedEvent(null);
    setSearchTerm('');
    setSaveStatus('idle');
    setShowNewClassInput(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">
                Log CAE Event Competition Result
              </h3>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  resetForm();
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Event Selection */}
            <div>
              <h4 className="text-white font-semibold mb-4 flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-electric-500" />
                <span>Select CAE Event</span>
              </h4>
              
              {/* Search Bar */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchTerm(value);
                      // Clear existing timeout
                      if (searchTimeoutRef.current) {
                        clearTimeout(searchTimeoutRef.current);
                      }
                      // Set new timeout to search after user stops typing
                      searchTimeoutRef.current = setTimeout(() => {
                        searchEvents(value);
                      }, 500);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        searchEvents();
                      }
                    }}
                    placeholder="Search events by name, city, or state..."
                    className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  />
                  <button
                    type="button"
                    onClick={() => searchEvents()}
                    className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Event List */}
              <div className="border border-gray-700 rounded-lg max-h-60 overflow-y-auto">
                {isLoadingEvents ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading events...</p>
                  </div>
                ) : events.length === 0 ? (
                  <div className="p-8 text-center text-gray-400">
                    No events found. Try a different search.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => handleEventSelect(event)}
                        className={`p-4 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                          selectedEvent?.id === event.id ? 'bg-electric-500/20 border-l-4 border-electric-500' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="text-white font-medium">{event.title}</h5>
                            <p className="text-gray-400 text-sm">
                              {event.city}, {event.state}
                            </p>
                            <p className="text-gray-500 text-xs mt-1">
                              {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                            </p>
                          </div>
                          {selectedEvent?.id === event.id && (
                            <CheckCircle className="h-5 w-5 text-electric-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedEvent && (
                <div className="mt-4 p-4 bg-electric-500/10 border border-electric-500/20 rounded-lg">
                  <p className="text-electric-400 text-sm">
                    <strong>Selected:</strong> {selectedEvent.title} • {selectedEvent.city}, {selectedEvent.state}
                  </p>
                </div>
              )}
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
                    Division <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.division_id}
                    onChange={(e) => setFormData({ ...formData, division_id: e.target.value, class_id: '', class_name: '' })}
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
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Class <span className="text-red-500">*</span>
                  </label>
                  {!showNewClassInput ? (
                    <select
                      value={formData.class_id}
                      onChange={(e) => {
                        if (e.target.value === 'new') {
                          setShowNewClassInput(true);
                          setFormData({ ...formData, class_id: '', class_name: '' });
                        } else {
                          setFormData({ ...formData, class_id: e.target.value, class_name: '' });
                        }
                      }}
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
                        onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="Enter new class name..."
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewClassInput(false);
                          setFormData({ ...formData, class_id: '', class_name: '' });
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
                    onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Toyota"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Model</label>
                  <input
                    type="text"
                    value={formData.vehicle_model}
                    onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
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
                  <label className="block text-gray-400 text-sm mb-2">Score <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="155.3"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Placement <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={formData.placement}
                    onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, total_participants: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="25"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Points Earned <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={formData.points_earned}
                    onChange={(e) => setFormData({ ...formData, points_earned: e.target.value })}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="100"
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 resize-none"
                rows={3}
                placeholder="Additional details about the competition..."
              />
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              disabled={saveStatus === 'saving'}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                saveStatus === 'success'
                  ? 'bg-green-600 text-white'
                  : saveStatus === 'error'
                  ? 'bg-red-600 text-white'
                  : 'bg-electric-500 text-white hover:bg-electric-600'
              } disabled:opacity-50`}
              disabled={saveStatus === 'saving' || !selectedEvent}
            >
              {saveStatus === 'saving' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : saveStatus === 'success' ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Saved!</span>
                </>
              ) : saveStatus === 'error' ? (
                <>
                  <X className="h-4 w-4" />
                  <span>Error</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Log Result</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogCAEEventModal;