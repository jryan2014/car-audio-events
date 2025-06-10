import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, MapPin, Users, DollarSign, Clock, Save, ArrowLeft, AlertCircle, CheckCircle, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface EventFormData {
  title: string;
  description: string;
  category_id: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_participants: number | null;
  registration_fee: number;
  early_bird_fee: number | null;
  early_bird_deadline: string;
  venue_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  rules: string;
  prizes: any[];
  schedule: { time: string; activity: string }[];
  sponsors: string[];
  is_public: boolean;
  status: string;
  approval_status: string;
  latitude?: number;
  longitude?: number;
}

interface EventCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export default function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [selectedTimezone, setSelectedTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    category_id: '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    max_participants: null,
    registration_fee: 0,
    early_bird_fee: null,
    early_bird_deadline: '',
    venue_name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
    contact_email: '',
    contact_phone: '',
    website: '',
    rules: '',
    prizes: [],
    schedule: [],
    sponsors: [],
    is_public: true,
    status: 'draft',
    approval_status: 'pending'
  });

  // Check if user can edit events
  const canEditEvents = user && (
    user.membershipType === 'admin' ||
    user.membershipType === 'organization' ||
    (user.membershipType === 'retailer' && user.subscriptionPlan !== 'free') ||
    (user.membershipType === 'manufacturer' && user.subscriptionPlan !== 'free')
  );

  useEffect(() => {
    if (!canEditEvents) {
      navigate('/pricing');
      return;
    }
    
    loadCategories();
    loadEventData();
  }, [id, canEditEvents, navigate]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('event_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadEventData = async () => {
    if (!id) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Convert UTC dates to local timezone for editing
      const localStartDate = convertUTCToTimezone(event.start_date, selectedTimezone);
      const localEndDate = convertUTCToTimezone(event.end_date, selectedTimezone);
      const localRegistrationDeadline = event.registration_deadline ? 
        convertUTCToTimezone(event.registration_deadline, selectedTimezone) : '';
      const localEarlyBirdDeadline = event.early_bird_deadline ? 
        convertUTCToTimezone(event.early_bird_deadline, selectedTimezone) : '';

      // Format dates for datetime-local input
      const formatForInput = (dateString: string) => {
        if (!dateString) return '';
        return dateString.substring(0, 16); // Format as YYYY-MM-DDTHH:MM
      };

      // Process arrays that might be stored as strings
      const processPrizes = () => {
        if (!event.prizes) return [''];
        if (typeof event.prizes === 'string') {
          try {
            return JSON.parse(event.prizes).map((p: any) => String(p));
          } catch (e) {
            return [''];
          }
        }
        return Array.isArray(event.prizes) ? 
          (event.prizes.length > 0 ? event.prizes.map((p: any) => String(p)) : ['']) : 
          [''];
      };

      const processSchedule = () => {
        if (!event.schedule) return [{ time: '', activity: '' }];
        if (typeof event.schedule === 'string') {
          try {
            return JSON.parse(event.schedule);
          } catch (e) {
            return [{ time: '', activity: '' }];
          }
        }
        return Array.isArray(event.schedule) ? 
          (event.schedule.length > 0 ? event.schedule : [{ time: '', activity: '' }]) : 
          [{ time: '', activity: '' }];
      };

      const processSponsors = () => {
        if (!event.sponsors) return [''];
        if (typeof event.sponsors === 'string') {
          try {
            return JSON.parse(event.sponsors).map((s: any) => String(s));
          } catch (e) {
            return [''];
          }
        }
        return Array.isArray(event.sponsors) ? 
          (event.sponsors.length > 0 ? event.sponsors.map((s: any) => String(s)) : ['']) : 
          [''];
      };

      setFormData({
        title: event.title || '',
        description: event.description || '',
        category_id: event.category_id || '',
        start_date: formatForInput(localStartDate),
        end_date: formatForInput(localEndDate),
        registration_deadline: formatForInput(localRegistrationDeadline),
        max_participants: event.max_participants,
        registration_fee: event.registration_fee || 0,
        early_bird_fee: event.early_bird_fee,
        early_bird_deadline: formatForInput(localEarlyBirdDeadline),
        venue_name: event.venue_name || '',
        address: event.address || '',
        city: event.city || '',
        state: event.state || '',
        zip_code: event.zip_code || '',
        country: event.country || 'US',
        contact_email: event.contact_email || '',
        contact_phone: event.contact_phone || '',
        website: event.website || '',
        rules: event.rules || '',
        prizes: processPrizes(),
        schedule: processSchedule(),
        sponsors: processSponsors(),
        is_public: event.is_public !== false,
        status: event.status || 'draft',
        approval_status: event.approval_status || 'pending',
        latitude: event.latitude,
        longitude: event.longitude
      });
    } catch (error: any) {
      console.error('Error loading event:', error);
      setError(error.message || 'Failed to load event data');
    } finally {
      setIsLoading(false);
    }
  };

  const convertUTCToTimezone = (utcDateString: string, timezone: string) => {
    if (!utcDateString) return '';
    
    try {
      const date = new Date(utcDateString);
      return new Date(date.toLocaleString('en-US', { timeZone: timezone })).toISOString();
    } catch (error) {
      console.error('Error converting date:', error);
      return utcDateString;
    }
  };

  const convertTimezoneToUTC = (localDateString: string, timezone: string) => {
    if (!localDateString) return '';
    
    try {
      // Create a date object in the local timezone
      const date = new Date(localDateString);
      
      // Get the timezone offset in minutes
      const tzOffset = new Date().getTimezoneOffset();
      
      // Convert to UTC
      const utcDate = new Date(date.getTime() - (tzOffset * 60000));
      return utcDate.toISOString();
    } catch (error) {
      console.error('Error converting to UTC:', error);
      return localDateString;
    }
  };

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimezone = e.target.value;
    setSelectedTimezone(newTimezone);
    
    // Convert all dates to the new timezone
    if (formData.start_date) {
      const utcStartDate = convertTimezoneToUTC(formData.start_date, selectedTimezone);
      const newLocalStartDate = convertUTCToTimezone(utcStartDate, newTimezone);
      setFormData(prev => ({
        ...prev,
        start_date: newLocalStartDate.substring(0, 16)
      }));
    }
    
    if (formData.end_date) {
      const utcEndDate = convertTimezoneToUTC(formData.end_date, selectedTimezone);
      const newLocalEndDate = convertUTCToTimezone(utcEndDate, newTimezone);
      setFormData(prev => ({
        ...prev,
        end_date: newLocalEndDate.substring(0, 16)
      }));
    }
    
    if (formData.registration_deadline) {
      const utcRegDeadline = convertTimezoneToUTC(formData.registration_deadline, selectedTimezone);
      const newLocalRegDeadline = convertUTCToTimezone(utcRegDeadline, newTimezone);
      setFormData(prev => ({
        ...prev,
        registration_deadline: newLocalRegDeadline.substring(0, 16)
      }));
    }
    
    if (formData.early_bird_deadline) {
      const utcEarlyDeadline = convertTimezoneToUTC(formData.early_bird_deadline, selectedTimezone);
      const newLocalEarlyDeadline = convertUTCToTimezone(utcEarlyDeadline, newTimezone);
      setFormData(prev => ({
        ...prev,
        early_bird_deadline: newLocalEarlyDeadline.substring(0, 16)
      }));
    }
  };

  const addArrayItem = (field: 'prizes' | 'schedule' | 'sponsors') => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'schedule' 
        ? [...prev[field], { time: '', activity: '' }]
        : [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'prizes' | 'schedule' | 'sponsors', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (field: 'prizes' | 'schedule' | 'sponsors', index: number, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      // Force update coordinates first if needed
      if (!formData.latitude || !formData.longitude || formData.latitude === 0 || formData.longitude === 0) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          await fetch(`${supabaseUrl}/functions/v1/force-update-coordinates`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ eventId: id })
          });
          console.log('Forced coordinate update before saving');
        } catch (coordError) {
          console.warn('Failed to force update coordinates:', coordError);
          // Continue with save anyway
        }
      }

      // Convert local dates back to UTC for storage
      const utcStartDate = convertTimezoneToUTC(formData.start_date, selectedTimezone);
      const utcEndDate = convertTimezoneToUTC(formData.end_date, selectedTimezone);
      const utcRegistrationDeadline = formData.registration_deadline ? 
        convertTimezoneToUTC(formData.registration_deadline, selectedTimezone) : null;
      const utcEarlyBirdDeadline = formData.early_bird_deadline ? 
        convertTimezoneToUTC(formData.early_bird_deadline, selectedTimezone) : null;

      const eventData = {
        id,
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
        start_date: utcStartDate,
        end_date: utcEndDate,
        registration_deadline: utcRegistrationDeadline,
        max_participants: formData.max_participants,
        registration_fee: formData.registration_fee,
        early_bird_fee: formData.early_bird_fee,
        early_bird_deadline: utcEarlyBirdDeadline,
        venue_name: formData.venue_name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        country: formData.country,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        website: formData.website,
        rules: formData.rules,
        prizes: formData.prizes.filter(p => p.trim()),
        schedule: formData.schedule.filter(s => s.time && s.activity),
        sponsors: formData.sponsors.filter(s => s.trim()),
        is_public: formData.is_public,
        status: formData.status,
        approval_status: formData.approval_status,
        latitude: formData.latitude,
        longitude: formData.longitude
      };

      // Try to use the update-event edge function first for proper geocoding
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/update-event`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update event');
        }

        const result = await response.json();
        console.log('Event updated successfully:', result);
      } catch (edgeFunctionError) {
        console.warn('Edge function failed, falling back to direct update:', edgeFunctionError);
        
        // Fallback to direct update
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', id);

        if (error) throw error;
      }

      setSuccess(true);
      
      setTimeout(() => {
        if (user?.membershipType === 'admin') {
          navigate('/admin/events');
        } else {
          navigate('/events');
        }
      }, 2000);

    } catch (error: any) {
      console.error('Error updating event:', error);
      setError(error.message || 'Failed to update event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Get list of timezones
  const getTimezones = () => {
    return [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'America/Honolulu',
      'America/Toronto',
      'America/Vancouver',
      'America/Mexico_City',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Rome',
      'Europe/Madrid',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Singapore',
      'Australia/Sydney',
      'Pacific/Auckland'
    ];
  };

  if (!canEditEvents) {
    return null; // Will redirect to pricing
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Event Updated Successfully!</h2>
          <p className="text-gray-400 mb-6">
            {user?.membershipType === 'admin' 
              ? 'Your changes have been saved and published.'
              : 'Your changes have been saved and will be reviewed if needed.'
            }
          </p>
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
            className="text-electric-400 hover:text-electric-300 transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Edit Event</h1>
            <p className="text-gray-400">
              Update event details and settings
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-red-400 font-medium">Error</span>
              </div>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Timezone Selector */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Globe className="h-5 w-5 text-electric-500" />
              <span>Timezone Settings</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Select Timezone for Editing</label>
                <select
                  value={selectedTimezone}
                  onChange={handleTimezoneChange}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  {getTimezones().map(tz => (
                    <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                  ))}
                </select>
                <p className="text-gray-500 text-xs mt-2">
                  All dates and times will be displayed and edited in this timezone, but stored in UTC.
                </p>
              </div>

              {user?.membershipType === 'admin' && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Event Status</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="pending_approval">Pending Approval</option>
                        <option value="published">Published</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">Approval</label>
                      <select
                        value={formData.approval_status}
                        onChange={(e) => handleInputChange('approval_status', e.target.value)}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-electric-500" />
              <span>Basic Information</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-gray-400 text-sm mb-2">Event Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Enter event title"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-400 text-sm mb-2">Description *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 resize-none"
                  placeholder="Describe your event"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Category *</label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => handleInputChange('category_id', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Max Participants</label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_participants || ''}
                  onChange={(e) => handleInputChange('max_participants', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}