import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, DollarSign, Clock, Image, Save, ArrowLeft, AlertCircle, CheckCircle, Trophy, Gift, Building2, User, Phone, Mail, Globe, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface EventFormData {
  title: string;
  description: string;
  category_id: string;
  sanction_body_id: string; // Organization that will sanction the event
  season_year: number; // Competition season year
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_participants: number | null;
  registration_fee: number;
  early_bird_fee: number | null;
  early_bird_deadline: string;
  early_bird_name: string; // Custom name for early bird pricing
  event_name: string; // Changed from venue_name
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  contact_email: string;
  contact_phone: string;
  website: string;
  
  // Event Director Contact Info
  event_director_first_name: string;
  event_director_last_name: string;
  event_director_email: string;
  event_director_phone: string;
  use_organizer_contact: boolean; // If true, pre-populate from user info
  
  // Event Status & Visibility
  status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'cancelled' | 'completed';
  approval_status: 'pending' | 'approved' | 'rejected';
  is_active: boolean; // Active/Inactive toggle
  display_start_date: string; // When to start showing on frontend (up to 90 days before)
  display_end_date: string; // When to stop showing on frontend (auto-calculated)
  
  rules: string;
  prizes: string[];
  schedule: { time: string; activity: string }[];
  sponsors: string[];
  
  // Additional Details
  first_place_trophy: boolean;
  second_place_trophy: boolean;
  third_place_trophy: boolean;
  fourth_place_trophy: boolean;
  fifth_place_trophy: boolean;
  has_raffle: boolean;
  
  // Shop Sponsors
  shop_sponsors: string[];
  
  // Free Giveaways
  member_giveaways: string[];
  non_member_giveaways: string[];
  
  // SEO & Marketing
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  
  is_public: boolean;
}

interface EventCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Organization {
  id: string;
  name: string;
  type: string;
}

// Country and location data
const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
];

// US States data
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

// Major cities by state for US
const US_CITIES: { [state: string]: string[] } = {
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Fresno', 'Oakland'],
  'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso'],
  'Florida': ['Miami', 'Tampa', 'Orlando', 'Jacksonville', 'St. Petersburg', 'Tallahassee'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany', 'Yonkers'],
  // Add more states and cities as needed
};

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    category_id: '',
    sanction_body_id: '',
    season_year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
    registration_deadline: '',
    max_participants: null,
    registration_fee: 0,
    early_bird_fee: null,
    early_bird_deadline: '',
    early_bird_name: 'Early Bird Special',
    event_name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
    latitude: null,
    longitude: null,
    contact_email: user?.email || '',
    contact_phone: user?.phone || '',
    website: '',
    
    event_director_first_name: user?.name?.split(' ')[0] || '',
    event_director_last_name: user?.name?.split(' ').slice(1).join(' ') || '',
    event_director_email: user?.email || '',
    event_director_phone: user?.phone || '',
    use_organizer_contact: true,
    
    status: 'draft',
    approval_status: 'pending',
    is_active: true,
    display_start_date: '',
    display_end_date: '',
    
    rules: '',
    prizes: [''],
    schedule: [{ time: '', activity: '' }],
    sponsors: [''],
    
    first_place_trophy: false,
    second_place_trophy: false,
    third_place_trophy: false,
    fourth_place_trophy: false,
    fifth_place_trophy: false,
    has_raffle: false,
    
    shop_sponsors: [''],
    member_giveaways: [''],
    non_member_giveaways: [''],
    
    seo_title: '',
    seo_description: '',
    seo_keywords: [],
    
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
    loadOrganizations();
  }, [canCreateEvents, navigate]);

  // Update available cities when state changes
  useEffect(() => {
    if (formData.country === 'US' && formData.state) {
      setAvailableCities(US_CITIES[formData.state] || []);
    } else {
      setAvailableCities([]);
    }
  }, [formData.country, formData.state]);

  // Update event director info when "use organizer contact" changes
  useEffect(() => {
    if (formData.use_organizer_contact) {
      setFormData(prev => ({
        ...prev,
        event_director_first_name: user?.name?.split(' ')[0] || '',
        event_director_last_name: user?.name?.split(' ').slice(1).join(' ') || '',
        event_director_email: user?.email || '',
        event_director_phone: user?.phone || ''
      }));
    }
  }, [formData.use_organizer_contact, user]);

  // Auto-calculate display dates when event dates change
  useEffect(() => {
    if (formData.start_date) {
      const eventStartDate = new Date(formData.start_date);
      
      // Display start date: 90 days before event (or now if less than 90 days)
      const displayStartDate = new Date(eventStartDate);
      displayStartDate.setDate(displayStartDate.getDate() - 90);
      const now = new Date();
      const actualDisplayStart = displayStartDate < now ? now : displayStartDate;
      
      // Display end date: 1 day after event ends (moves to past events)
      const eventEndDate = formData.end_date ? new Date(formData.end_date) : eventStartDate;
      const displayEndDate = new Date(eventEndDate);
      displayEndDate.setDate(displayEndDate.getDate() + 1);
      
      setFormData(prev => ({
        ...prev,
        display_start_date: actualDisplayStart.toISOString().slice(0, 16),
        display_end_date: displayEndDate.toISOString().slice(0, 16),
        seo_title: prev.seo_title || prev.title,
        seo_description: prev.seo_description || prev.description
      }));
    }
  }, [formData.start_date, formData.end_date, formData.title, formData.description]);

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

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, type')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  // Simple geocoding function - in production you'd use a real geocoding service
  const geocodeAddress = async (address: string, city: string, state: string, country: string) => {
    // For now, return mock coordinates or use a simple lookup
    // In production, you'd integrate with Google Maps, OpenCage, or similar service
    try {
      // Mock geocoding for demo purposes
      // You can replace this with actual geocoding service later
      const mockCoordinates: { [key: string]: { latitude: number; longitude: number } } = {
        'california': { latitude: 36.7783, longitude: -119.4179 },
        'texas': { latitude: 31.9686, longitude: -99.9018 },
        'florida': { latitude: 27.6648, longitude: -81.5158 },
        'new york': { latitude: 42.1657, longitude: -74.9481 },
        'nevada': { latitude: 38.4199, longitude: -117.1219 },
        // Add more as needed
      };
      
      const stateKey = state.toLowerCase();
      if (mockCoordinates[stateKey]) {
        return mockCoordinates[stateKey];
      }
      
      return { latitude: null, longitude: null };
    } catch (error) {
      console.error('Geocoding error:', error);
      return { latitude: null, longitude: null };
    }
  };

  const handleInputChange = (field: keyof EventFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-geocode when address fields change (debounced)
    if (['address', 'city', 'state', 'country'].includes(field)) {
      const updatedFormData = { ...formData, [field]: value };
      if (updatedFormData.address && updatedFormData.city && updatedFormData.state) {
        // Debounce the geocoding
        setTimeout(() => {
          geocodeAddress(
            updatedFormData.address,
            updatedFormData.city,
            updatedFormData.state,
            updatedFormData.country
          ).then(({ latitude, longitude }) => {
            if (latitude && longitude) {
              setFormData(prev => ({ ...prev, latitude, longitude }));
            }
          });
        }, 1000);
      }
    }
  };

  const handleArrayInputChange = (field: 'prizes' | 'sponsors' | 'shop_sponsors' | 'member_giveaways' | 'non_member_giveaways', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: 'prizes' | 'sponsors' | 'shop_sponsors' | 'member_giveaways' | 'non_member_giveaways') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'prizes' | 'sponsors' | 'shop_sponsors' | 'member_giveaways' | 'non_member_giveaways', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleScheduleChange = (index: number, field: 'time' | 'activity', value: string) => {
    setFormData(prev => ({
      ...prev,
      schedule: prev.schedule.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addScheduleItem = () => {
    setFormData(prev => ({
      ...prev,
      schedule: [...prev.schedule, { time: '', activity: '' }]
    }));
  };

  const removeScheduleItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schedule: prev.schedule.filter((_, i) => i !== index)
    }));
  };

  const handleKeywordChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      seo_keywords: prev.seo_keywords.map((keyword, i) => i === index ? value : keyword)
    }));
  };

  const addKeyword = () => {
    setFormData(prev => ({
      ...prev,
      seo_keywords: [...prev.seo_keywords, '']
    }));
  };

  const removeKeyword = (index: number) => {
    setFormData(prev => ({
      ...prev,
      seo_keywords: prev.seo_keywords.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    setIsLoading(true);
    setError('');

    try {
      // Determine approval status based on user type
      const approvalStatus = user?.membershipType === 'admin' ? 'approved' : 'pending';
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
        venue_name: formData.event_name, // Store in venue_name field but labeled as Event Name
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        country: formData.country,
        latitude: formData.latitude,
        longitude: formData.longitude,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        website: formData.website,
        rules: formData.rules,
        prizes: formData.prizes.filter(p => p.trim()),
        schedule: formData.schedule.filter(s => s.time && s.activity),
        sponsors: formData.sponsors.filter(s => s.trim()),
        is_public: formData.is_public,
        organizer_id: user!.id,
        organization_id: formData.sanction_body_id || null,
        status: user?.membershipType === 'admin' ? formData.status : status,
        approval_status: user?.membershipType === 'admin' ? formData.approval_status : approvalStatus,
        approved_by: user?.membershipType === 'admin' ? user.id : null,
        approved_at: user?.membershipType === 'admin' ? new Date().toISOString() : null,
        
        // Store additional details in metadata
        metadata: {
          season_year: formData.season_year,
          is_active: formData.is_active,
          display_start_date: formData.display_start_date,
          display_end_date: formData.display_end_date,
          early_bird_name: formData.early_bird_name,
          event_director: {
            first_name: formData.event_director_first_name,
            last_name: formData.event_director_last_name,
            email: formData.event_director_email,
            phone: formData.event_director_phone
          },
          trophies: {
            first_place: formData.first_place_trophy,
            second_place: formData.second_place_trophy,
            third_place: formData.third_place_trophy,
            fourth_place: formData.fourth_place_trophy,
            fifth_place: formData.fifth_place_trophy
          },
          has_raffle: formData.has_raffle,
          shop_sponsors: formData.shop_sponsors.filter(s => s.trim()),
          giveaways: {
            members: formData.member_giveaways.filter(g => g.trim()),
            non_members: formData.non_member_giveaways.filter(g => g.trim())
          },
          seo: {
            title: formData.seo_title,
            description: formData.seo_description,
            keywords: formData.seo_keywords.filter(k => k.trim())
          },
          // Analytics tracking fields
          favorites_count: 0,
          attendance_count: 0,
          view_count: 0
        }
      };

      const { error: insertError } = await supabase
        .from('events')
        .insert([eventData]);

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        navigate('/events');
      }, 2000);

    } catch (err) {
      console.error('Failed to create event:', err);
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  if (!canCreateEvents) {
    return <div>Access denied</div>;
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate('/events')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Create Event</h1>
            <p className="text-gray-400">Set up a new car audio event</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <span className="text-green-400">Event created successfully! Redirecting...</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-electric-500" />
              <span>Event Information</span>
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
                  placeholder="Name of your event"
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
                <label className="block text-gray-400 text-sm mb-2">Sanctioning Body *</label>
                <select
                  required
                  value={formData.sanction_body_id}
                  onChange={(e) => handleInputChange('sanction_body_id', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="">Select sanctioning organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Competition Season Year *</label>
                <select
                  required
                  value={formData.season_year}
                  onChange={(e) => handleInputChange('season_year', parseInt(e.target.value))}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() + i;
                    return (
                      <option key={year} value={year}>{year} Season</option>
                    );
                  })}
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

              {/* Admin-only status controls */}
              {user?.membershipType === 'admin' && (
                <>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Event Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="pending_approval">Pending Approval</option>
                      <option value="approved">Approved</option>
                      <option value="published">Published</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Approval Status</label>
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

                  <div className="md:col-span-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => handleInputChange('is_active', e.target.checked)}
                        className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                      />
                      <span className="text-gray-400">Event is Active</span>
                    </label>
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="block text-gray-400 text-sm mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Describe your event..."
                />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Clock className="h-5 w-5 text-electric-500" />
              <span>Schedule</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              {/* Display Date Controls */}
              <div className="md:col-span-2 bg-gray-700/30 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">🤖 Automated Display Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Show on Frontend From</label>
                    <input
                      type="datetime-local"
                      value={formData.display_start_date}
                      onChange={(e) => handleInputChange('display_start_date', e.target.value)}
                      className="w-full p-2 bg-gray-600/50 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-electric-500"
                      title="Auto-calculated: 90 days before event or now"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto: 90 days before event</p>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Hide from Frontend After</label>
                    <input
                      type="datetime-local"
                      value={formData.display_end_date}
                      onChange={(e) => handleInputChange('display_end_date', e.target.value)}
                      className="w-full p-2 bg-gray-600/50 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-electric-500"
                      title="Auto-calculated: 1 day after event ends"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto: 1 day after event ends</p>
                  </div>
                </div>
                <p className="text-xs text-yellow-400 mt-2">
                  ℹ️ Events automatically move to "Past Events" after the display end date
                </p>
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
                <label className="block text-gray-400 text-sm mb-2">Event Name *</label>
                <input
                  type="text"
                  required
                  value={formData.event_name}
                  onChange={(e) => handleInputChange('event_name', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Convention center, park, venue name, etc."
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
                  {COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">State/Province *</label>
                {formData.country === 'US' ? (
                  <select
                    required
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    <option value="">Select a state</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="State or Province"
                  />
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">City *</label>
                {availableCities.length > 0 ? (
                  <select
                    required
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    <option value="">Select a city</option>
                    {availableCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                    <option value="other">Other (type below)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="City name"
                  />
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">ZIP/Postal Code</label>
                <input
                  type="text"
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="ZIP or postal code"
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
                {formData.latitude && formData.longitude && (
                  <p className="text-xs text-green-400 mt-1">
                    📍 Location found: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Event Director Contact */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <User className="h-5 w-5 text-electric-500" />
              <span>Event Director Contact</span>
            </h2>

            <div className="mb-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.use_organizer_contact}
                  onChange={(e) => handleInputChange('use_organizer_contact', e.target.checked)}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="text-gray-400">Use my contact information</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.event_director_first_name}
                  onChange={(e) => handleInputChange('event_director_first_name', e.target.value)}
                  disabled={formData.use_organizer_contact}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
                  placeholder="First name"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.event_director_last_name}
                  onChange={(e) => handleInputChange('event_director_last_name', e.target.value)}
                  disabled={formData.use_organizer_contact}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
                  placeholder="Last name"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.event_director_email}
                    onChange={(e) => handleInputChange('event_director_email', e.target.value)}
                    disabled={formData.use_organizer_contact}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
                    placeholder="director@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Phone *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={formData.event_director_phone}
                    onChange={(e) => handleInputChange('event_director_phone', e.target.value)}
                    disabled={formData.use_organizer_contact}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 disabled:opacity-50"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* General Contact & Website */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Globe className="h-5 w-5 text-electric-500" />
              <span>General Contact & Website</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Contact Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => handleInputChange('contact_email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="info@event.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-400 text-sm mb-2">Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="https://www.eventwebsite.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-electric-500" />
              <span>Pricing & Registration</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Registration Fee</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.registration_fee}
                    onChange={(e) => handleInputChange('registration_fee', parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Early Bird Name</label>
                <input
                  type="text"
                  value={formData.early_bird_name}
                  onChange={(e) => handleInputChange('early_bird_name', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Early Bird Special"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">{formData.early_bird_name} Fee</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.early_bird_fee || ''}
                    onChange={(e) => handleInputChange('early_bird_fee', e.target.value ? parseFloat(e.target.value) : null)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">{formData.early_bird_name} Deadline</label>
                <input
                  type="datetime-local"
                  value={formData.early_bird_deadline}
                  onChange={(e) => handleInputChange('early_bird_deadline', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-electric-500" />
              <span>Additional Details</span>
            </h2>

            {/* Trophy Placements */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Trophy Placements</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { key: 'first_place_trophy', label: '1st Place' },
                  { key: 'second_place_trophy', label: '2nd Place' },
                  { key: 'third_place_trophy', label: '3rd Place' },
                  { key: 'fourth_place_trophy', label: '4th Place' },
                  { key: 'fifth_place_trophy', label: '5th Place' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData[key as keyof EventFormData] as boolean}
                      onChange={(e) => handleInputChange(key as keyof EventFormData, e.target.checked)}
                      className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                    />
                    <span className="text-gray-400 text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Raffle */}
            <div className="mb-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.has_raffle}
                  onChange={(e) => handleInputChange('has_raffle', e.target.checked)}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="text-gray-400">Will there be a raffle?</span>
              </label>
            </div>

            {/* Shop Sponsors */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Shop Sponsors</h3>
              <div className="space-y-3">
                {formData.shop_sponsors.map((sponsor, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="relative flex-1">
                      <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={sponsor}
                        onChange={(e) => handleArrayInputChange('shop_sponsors', index, e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder={`Shop sponsor ${index + 1}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeArrayItem('shop_sponsors', index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('shop_sponsors')}
                  className="text-electric-400 hover:text-electric-300 text-sm"
                >
                  + Add Shop Sponsor
                </button>
              </div>
            </div>

            {/* Free Giveaways for Members */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Free Giveaways - Members</h3>
              <p className="text-gray-400 text-sm mb-3">Items given away free to members (no entry required)</p>
              <div className="space-y-3">
                {formData.member_giveaways.map((giveaway, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="relative flex-1">
                      <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={giveaway}
                        onChange={(e) => handleArrayInputChange('member_giveaways', index, e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder={`Member giveaway ${index + 1}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeArrayItem('member_giveaways', index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('member_giveaways')}
                  className="text-electric-400 hover:text-electric-300 text-sm"
                >
                  + Add Member Giveaway
                </button>
              </div>
            </div>

            {/* Free Giveaways for Non-Members */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Free Giveaways - Non-Members</h3>
              <p className="text-gray-400 text-sm mb-3">Items given away free to non-members (no entry required)</p>
              <div className="space-y-3">
                {formData.non_member_giveaways.map((giveaway, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="relative flex-1">
                      <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={giveaway}
                        onChange={(e) => handleArrayInputChange('non_member_giveaways', index, e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder={`Non-member giveaway ${index + 1}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeArrayItem('non_member_giveaways', index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addArrayItem('non_member_giveaways')}
                  className="text-electric-400 hover:text-electric-300 text-sm"
                >
                  + Add Non-Member Giveaway
                </button>
              </div>
            </div>
          </div>

          {/* Prizes & Schedule */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-electric-500" />
              <span>Prizes & Schedule</span>
            </h2>

            {/* Prizes */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Competition Prizes</h3>
              <div className="space-y-3">
                {formData.prizes.map((prize, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={prize}
                      onChange={(e) => handleArrayInputChange('prizes', index, e.target.value)}
                      className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder={`Prize ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('prizes', index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-5 w-5" />
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
            </div>

            {/* Schedule */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Event Schedule</h3>
              <div className="space-y-3">
                {formData.schedule.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="time"
                      value={item.time}
                      onChange={(e) => handleScheduleChange(index, 'time', e.target.value)}
                      className="w-32 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                    <input
                      type="text"
                      value={item.activity}
                      onChange={(e) => handleScheduleChange(index, 'activity', e.target.value)}
                      className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Activity description"
                    />
                    <button
                      type="button"
                      onClick={() => removeScheduleItem(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addScheduleItem()}
                  className="text-electric-400 hover:text-electric-300 text-sm"
                >
                  + Add Schedule Item
                </button>
              </div>
            </div>

            {/* General Sponsors */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">General Sponsors</h3>
              <div className="space-y-3">
                {formData.sponsors.map((sponsor, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="text"
                      value={sponsor}
                      onChange={(e) => handleArrayInputChange('sponsors', index, e.target.value)}
                      className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder={`Sponsor ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('sponsors', index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="h-5 w-5" />
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
            </div>
          </div>

          {/* Rules */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Rules & Regulations</h2>
            <textarea
              value={formData.rules}
              onChange={(e) => handleInputChange('rules', e.target.value)}
              rows={6}
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              placeholder="Enter event rules and regulations..."
            />
          </div>

          {/* Privacy */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Visibility</h2>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => handleInputChange('is_public', e.target.checked)}
                className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
              />
              <span className="text-gray-400">Make this event publicly visible</span>
            </label>
          </div>

          {/* SEO */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">SEO</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-gray-400 text-sm mb-2">SEO Title</label>
                <input
                  type="text"
                  value={formData.seo_title}
                  onChange={(e) => handleInputChange('seo_title', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="SEO Title"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">SEO Description</label>
                <textarea
                  value={formData.seo_description}
                  onChange={(e) => handleInputChange('seo_description', e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="SEO Description"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-2">SEO Keywords</label>
                <div className="space-y-3">
                  {formData.seo_keywords.map((keyword, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <input
                        type="text"
                        value={keyword}
                        onChange={(e) => handleKeywordChange(index, e.target.value)}
                        className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder={`Keyword ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeKeyword(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addKeyword()}
                    className="text-electric-400 hover:text-electric-300 text-sm"
                  >
                    + Add Keyword
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="px-6 py-3 border border-gray-600 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Save className="h-5 w-5" />
              <span>{isLoading ? 'Creating...' : 'Create Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}