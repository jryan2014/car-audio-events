import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, DollarSign, Clock, Image, Save, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
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
  prizes: string[];
  schedule: { time: string; activity: string }[];
  sponsors: string[];
  is_public: boolean;
}

interface EventCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  
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
    contact_email: user?.email || '',
    contact_phone: user?.phone || '',
    website: '',
    rules: '',
    prizes: [''],
    schedule: [{ time: '', activity: '' }],
    sponsors: [''],
    is_public: true
  });

  // Check if user can create events
  const canCreateEvents = user && (
    user.membershipType === 'admin' ||
    user.membershipType === 'organization' ||
    (user.membershipType === 'retailer' && user.subscriptionPlan !== 'free') ||
    (user.membershipType === 'manufacturer' && user.subscriptionPlan !== 'free')
  );

  useEffect(() => {
    if (!canCreateEvents) {
      navigate('/pricing');
      return;
    }
    loadCategories();
  }, [canCreateEvents, navigate]);

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

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
    setIsLoading(true);
    setError('');

    try {
      // Determine approval status based on user type
      const approvalStatus = user?.membershipType === 'admin' ? 'approved' : 'pending';
      // Always set status to pending_approval unless admin explicitly publishes
      const status = 'pending_approval';

      const eventData = {
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        registration_deadline: formData.registration_deadline || null,
        max_participants: formData.max_participants,
        registration_fee: formData.registration_fee,
        early_bird_fee: formData.early_bird_fee,
        early_bird_deadline: formData.early_bird_deadline || null,
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
        organizer_id: user!.id,
        status,
        approval_status: approvalStatus,
        approved_by: user?.membershipType === 'admin' ? user.id : null,
        approved_at: user?.membershipType === 'admin' ? new Date().toISOString() : null
      };

      // Try to use the create-event edge function first for proper geocoding
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const response = await fetch(`${supabaseUrl}/functions/v1/create-event`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create event');
        }

        const result = await response.json();
        console.log('Event created successfully:', result);
        
        // If admin, redirect to admin events page
        if (user?.membershipType === 'admin') {
          setTimeout(() => {
            navigate('/admin/events');
          }, 2000);
        } else {
          setTimeout(() => {
            navigate('/events');
          }, 2000);
        }
        
        setSuccess(true);
        return;
      } catch (edgeFunctionError) {
        console.warn('Edge function failed, falling back to direct insert:', edgeFunctionError);
        
        // Fallback to direct insert
        const { error } = await supabase
          .from('events')
          .insert(eventData);

        if (error) throw error;
      }


      setSuccess(true);

    } catch (error: any) {
      console.error('Error creating event:', error);
      setError(error.message || 'Failed to create event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canCreateEvents) {
    return null; // Will redirect to pricing
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Event Created Successfully!</h2>
          <p className="text-gray-400 mb-6">
            {user?.membershipType === 'admin' 
              ? 'Your event has been published and is now live.'
              : 'Your event has been submitted for admin approval and will be reviewed shortly.'
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
            <h1 className="text-3xl font-bold text-white">Create New Event</h1>
            <p className="text-gray-400">
              {user?.membershipType === 'admin' 
                ? 'Create and publish events instantly'
                : 'Submit your event for admin approval'
              }
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

          {/* Date & Time */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Clock className="h-5 w-5 text-electric-500" />
              <span>Date & Time</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_date}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">End Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.end_date}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Registration Deadline</label>
                <input
                  type="datetime-local"
                  value={formData.registration_deadline}
                  onChange={(e) => handleInputChange('registration_deadline', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-electric-500" />
              <span>Location</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-gray-400 text-sm mb-2">Venue Name *</label>
                <input
                  type="text"
                  required
                  value={formData.venue_name}
                  onChange={(e) => handleInputChange('venue_name', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Convention center, park, etc."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-400 text-sm mb-2">Address *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">State *</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="State/Province"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">ZIP Code</label>
                <input
                  type="text"
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="ZIP/Postal code"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Country *</label>
                <select
                  required
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="MX">Mexico</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="JP">Japan</option>
                </select>
              </div>
            </div>
          </div>

          {/* Registration & Pricing */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-electric-500" />
              <span>Registration & Pricing</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Registration Fee ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.registration_fee}
                  onChange={(e) => handleInputChange('registration_fee', parseFloat(e.target.value) || 0)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Early Bird Fee ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.early_bird_fee || ''}
                  onChange={(e) => handleInputChange('early_bird_fee', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Early Bird Deadline</label>
                <input
                  type="datetime-local"
                  value={formData.early_bird_deadline}
                  onChange={(e) => handleInputChange('early_bird_deadline', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Users className="h-5 w-5 text-electric-500" />
              <span>Contact Information</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="contact@event.com"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Contact Phone</label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="https://event-website.com"
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Additional Details</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Rules & Regulations</label>
                <textarea
                  rows={4}
                  value={formData.rules}
                  onChange={(e) => handleInputChange('rules', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 resize-none"
                  placeholder="Competition rules, safety requirements, etc."
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Prizes</label>
                {formData.prizes.map((prize, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={prize}
                      onChange={(e) => updateArrayItem('prizes', index, e.target.value)}
                      className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder={`Prize ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('prizes', index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('prizes')}
                  className="text-electric-400 hover:text-electric-300 text-sm"
                >
                  + Add Prize
                </button>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Event Schedule</label>
                {formData.schedule.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="time"
                      value={item.time}
                      onChange={(e) => updateArrayItem('schedule', index, { ...item, time: e.target.value })}
                      className="w-32 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                    <input
                      type="text"
                      value={item.activity}
                      onChange={(e) => updateArrayItem('schedule', index, { ...item, activity: e.target.value })}
                      className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Activity description"
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('schedule', index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('schedule')}
                  className="text-electric-400 hover:text-electric-300 text-sm"
                >
                  + Add Schedule Item
                </button>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Sponsors</label>
                {formData.sponsors.map((sponsor, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={sponsor}
                      onChange={(e) => updateArrayItem('sponsors', index, e.target.value)}
                      className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder={`Sponsor ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('sponsors', index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('sponsors')}
                  className="text-electric-400 hover:text-electric-300 text-sm"
                >
                  + Add Sponsor
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={formData.is_public}
                  onChange={(e) => handleInputChange('is_public', e.target.checked)}
                  className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500"
                />
                <label htmlFor="is_public" className="text-gray-300">
                  Make this event publicly visible
                </label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-electric-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Creating Event...</span>
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  <span>
                    {user?.membershipType === 'admin' ? 'Create & Publish Event' : 'Submit for Approval'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}