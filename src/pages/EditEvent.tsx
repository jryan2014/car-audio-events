import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, MapPin, Users, DollarSign, Clock, Save, ArrowLeft, AlertCircle, CheckCircle, Globe, Building, Image } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useSystemConfiguration } from '../hooks/useSystemConfiguration';

interface EventFormData {
  title: string;
  description: string;
  category_id: string;
  sanction_body_id: string; // Organization that will sanction the event
  season_year: number; // Competition season year
  organizer_id: string; // Event organizer (can be different from creator)
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_participants: number | null;
  registration_fee: number; // Default/general registration fee
  // Note: Member/non-member fees removed - using single registration_fee only
  venue_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
  contact_email: string;
  contact_phone: string;
  website: string;
  image_url?: string; // Event flyer/header image
  
  // Event Director Contact Info
  event_director_first_name: string;
  event_director_last_name: string;
  event_director_email: string;
  event_director_phone: string;
  use_organizer_contact: boolean; // If true, pre-populate from user info
  
  // Event Status & Visibility
  is_active: boolean; // Active/Inactive toggle
  display_start_date: string; // When to start showing on frontend (up to 90 days before)
  display_end_date: string; // When to stop showing on frontend (auto-calculated)
  
  rules: string;
  prizes: any[];
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
  is_featured: boolean;
  status: string;
  approval_status: string;
  // Note: offered_competition_classes removed - not in database schema
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
  organization_type?: string;
  logo_url?: string;
  small_logo_url?: string;
  status?: string;
  default_rules_template_id?: string;
  default_rules_template_name?: string;
  default_rules_content?: string;
  competition_classes?: string[];
}

interface DatabaseUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  membership_type?: string;
}

const EditEvent = React.memo(function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [showAddNewOrganizer, setShowAddNewOrganizer] = useState(false);
  const [newOrganizerData, setNewOrganizerData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  // Use our system configuration hook
  const { 
    getOptionsByCategory, 
    getRulesTemplates, 
    saveFormData,
    isLoading: configLoading,
    error: configError 
  } = useSystemConfiguration();
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    category_id: '',
    sanction_body_id: '',
    season_year: new Date().getFullYear(),
    organizer_id: user?.id || '',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    max_participants: null,
    registration_fee: 0,
    venue_name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
    latitude: null,
    longitude: null,
    contact_email: '',
    contact_phone: '',
    website: '',
    image_url: '',
    
    // Event Director Contact Info
    event_director_first_name: '',
    event_director_last_name: '',
    event_director_email: '',
    event_director_phone: '',
    use_organizer_contact: false,
    
    // Event Status & Visibility
    is_active: true,
    display_start_date: '',
    display_end_date: '',
    
    rules: '',
    prizes: [],
    schedule: [],
    sponsors: [],
    
    // Additional Details
    first_place_trophy: false,
    second_place_trophy: false,
    third_place_trophy: false,
    fourth_place_trophy: false,
    fifth_place_trophy: false,
    has_raffle: false,
    
    // Shop Sponsors
    shop_sponsors: [],
    
    // Free Giveaways
    member_giveaways: [],
    non_member_giveaways: [],
    
    // SEO & Marketing
    seo_title: '',
    seo_description: '',
    seo_keywords: [],
    
    is_public: true,
    is_featured: false,
    status: 'draft',
    approval_status: 'pending',
    // Competition classes removed - not in database schema
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
    
    const abortController = new AbortController();
    
    const loadAllData = async () => {
      try {
        await Promise.all([
          loadCategories(),
          loadOrganizations(),
          loadUsers(),
          loadEventData()
        ]);
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Error loading data:', error);
        }
      }
    };
    
    loadAllData();
    
    return () => {
      abortController.abort();
    };
  }, [id, canEditEvents, navigate]);

  // Auto-populate organization details when sanctioning body changes
  useEffect(() => {
    if (formData.sanction_body_id && organizations.length > 0) {
      const org = organizations.find(o => o.id === formData.sanction_body_id);
      setSelectedOrganization(org || null);
      
      console.log('🏢 Organization lookup:', {
        searchId: formData.sanction_body_id,
        foundOrg: org?.name || 'Not found',
        hasRules: !!org?.default_rules_content,
        totalOrgs: organizations.length
      });
    }
  }, [formData.sanction_body_id, organizations]);

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
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const loadUsers = async () => {
    try {
      // Only load users if current user is admin
      if (user?.membershipType === 'admin') {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email, phone, membership_type')
          .order('name');

        if (error) throw error;
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
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
        sanction_body_id: event.organization_id || '',
        season_year: event.season_year || new Date().getFullYear(),
        organizer_id: event.organizer_id || user?.id || '',
        start_date: formatForInput(localStartDate),
        end_date: formatForInput(localEndDate),
        registration_deadline: formatForInput(localRegistrationDeadline),
        max_participants: event.max_participants,
        registration_fee: event.ticket_price || event.registration_fee || 0,
        venue_name: event.venue_name || '',
        address: event.address || '',
        city: event.city || '',
        state: event.state || '',
        zip_code: event.zip_code || '',
        country: event.country || 'US',
        latitude: event.latitude,
        longitude: event.longitude,
        contact_email: event.contact_email || '',
        contact_phone: event.contact_phone || '',
        website: event.website || '',
        image_url: event.image_url || '',
        
        // Event Director Contact Info
        event_director_first_name: event.event_director_first_name || '',
        event_director_last_name: event.event_director_last_name || '',
        event_director_email: event.event_director_email || '',
        event_director_phone: event.event_director_phone || '',
        use_organizer_contact: event.use_organizer_contact || false,
        
        // Event Status & Visibility
        is_active: event.is_active !== false,
        display_start_date: event.display_start_date ? formatForInput(event.display_start_date) : '',
        display_end_date: event.display_end_date ? formatForInput(event.display_end_date) : '',
        
        rules: event.rules || '',
        prizes: processPrizes(),
        schedule: processSchedule(),
        sponsors: processSponsors(),
        
        // Additional Details
        first_place_trophy: event.first_place_trophy || false,
        second_place_trophy: event.second_place_trophy || false,
        third_place_trophy: event.third_place_trophy || false,
        fourth_place_trophy: event.fourth_place_trophy || false,
        fifth_place_trophy: event.fifth_place_trophy || false,
        has_raffle: event.has_raffle || false,
        
        // Shop Sponsors
        shop_sponsors: Array.isArray(event.shop_sponsors) ? event.shop_sponsors : (event.shop_sponsors ? [event.shop_sponsors] : []),
        
        // Free Giveaways
        member_giveaways: Array.isArray(event.member_giveaways) ? event.member_giveaways : (event.member_giveaways ? [event.member_giveaways] : []),
        non_member_giveaways: Array.isArray(event.non_member_giveaways) ? event.non_member_giveaways : (event.non_member_giveaways ? [event.non_member_giveaways] : []),
        
        // SEO & Marketing
        seo_title: event.seo_title || '',
        seo_description: event.seo_description || '',
        seo_keywords: Array.isArray(event.seo_keywords) ? event.seo_keywords : (event.seo_keywords ? [event.seo_keywords] : []),
        
        is_public: event.is_public !== false,
        is_featured: event.is_featured || false,
        status: event.status || 'draft',
        approval_status: event.approval_status || 'pending',
        // Competition classes feature removed from form
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
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // If use_organizer_contact is being checked, sync organizer data to event director fields
      if (field === 'use_organizer_contact' && value === true) {
        const selectedOrganizer = users.find(u => u.id === prev.organizer_id);
        if (selectedOrganizer) {
          newData.event_director_first_name = selectedOrganizer.name?.split(' ')[0] || '';
          newData.event_director_last_name = selectedOrganizer.name?.split(' ').slice(1).join(' ') || '';
          newData.event_director_email = selectedOrganizer.email || '';
          newData.event_director_phone = selectedOrganizer.phone || '';
        }
      }

      return newData;
    });
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
    
    // Early bird deadline removed - no longer needed
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
      // Early bird deadline removed - no longer needed

      const eventData = {
        id,
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
        organization_id: formData.sanction_body_id || null,
        season_year: formData.season_year,
        organizer_id: formData.organizer_id || null, // Optional - can use event director fields instead
        start_date: utcStartDate,
        end_date: utcEndDate,
        registration_deadline: utcRegistrationDeadline,
        max_participants: formData.max_participants,
        ticket_price: formData.registration_fee,
        venue_name: formData.venue_name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        country: formData.country,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        website: formData.website,
        image_url: formData.image_url || null,
        
        // Event Director Contact Info
        event_director_first_name: formData.event_director_first_name,
        event_director_last_name: formData.event_director_last_name,
        event_director_email: formData.event_director_email,
        event_director_phone: formData.event_director_phone,
        use_organizer_contact: formData.use_organizer_contact,
        
        // Event Status & Visibility
        is_active: formData.is_active,
        display_start_date: formData.display_start_date ? convertTimezoneToUTC(formData.display_start_date, selectedTimezone) : null,
        display_end_date: formData.display_end_date ? convertTimezoneToUTC(formData.display_end_date, selectedTimezone) : null,
        
        rules: formData.rules,
        prizes: formData.prizes.filter(p => p.trim()),
        schedule: formData.schedule.filter(s => s.time && s.activity),
        sponsors: formData.sponsors.filter(s => s.trim()),
        
        // Additional Details
        first_place_trophy: formData.first_place_trophy,
        second_place_trophy: formData.second_place_trophy,
        third_place_trophy: formData.third_place_trophy,
        fourth_place_trophy: formData.fourth_place_trophy,
        fifth_place_trophy: formData.fifth_place_trophy,
        has_raffle: formData.has_raffle,
        
        // Shop Sponsors
        shop_sponsors: formData.shop_sponsors.filter(s => s.trim()),
        
        // Free Giveaways
        member_giveaways: formData.member_giveaways.filter(g => g.trim()),
        non_member_giveaways: formData.non_member_giveaways.filter(g => g.trim()),
        
        // SEO & Marketing
        seo_title: formData.seo_title,
        seo_description: formData.seo_description,
        seo_keywords: formData.seo_keywords.filter(k => k.trim()),
        
        is_public: formData.is_public,
        is_featured: formData.is_featured,
        status: formData.status,
        approval_status: formData.approval_status,
        // Competition classes removed from database save
        latitude: formData.latitude,
        longitude: formData.longitude
      };

      // Direct database update (removed edge function due to CORS issues)
      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', id);

      if (error) throw error;
      
      console.log('Event updated successfully via direct database update');

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

  const loadRulesTemplate = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('rules_templates')
        .select('content')
        .eq('id', templateId)
        .single();
        
      if (error) throw error;
      
      if (data?.content) {
        handleInputChange('rules', data.content);
      }
    } catch (error) {
      console.error('Error loading rules template:', error);
    }
  };

  const handleCreateNewOrganizer = async () => {
    try {
      setIsLoading(true);
      
      // Validate required fields
      if (!newOrganizerData.name.trim() || !newOrganizerData.email.trim()) {
        throw new Error('Name and email are required');
      }
      
      // Instead of creating a user record, populate event director contact fields
      const nameParts = newOrganizerData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Update form data with organizer contact info
      setFormData(prev => ({
        ...prev,
        organizer_id: '', // Clear organizer selection (using custom contact)
        event_director_first_name: firstName,
        event_director_last_name: lastName,
        event_director_email: newOrganizerData.email.trim(),
        event_director_phone: newOrganizerData.phone?.trim() || '',
        use_organizer_contact: false // Using custom contact info
      }));
      
      // Reset form and close modal
      setNewOrganizerData({
        name: '',
        email: '',
        phone: ''
      });
      setShowAddNewOrganizer(false);
      
      // Show success message without triggering redirect
      console.log('✅ Organizer contact information added:', firstName, lastName);
      
      // Temporarily clear any errors and show visual confirmation
      setError('');
      
      // Auto-scroll to event director section to show populated fields
      setTimeout(() => {
        const eventDirectorSection = document.querySelector('[data-section="event-director"]');
        if (eventDirectorSection) {
          eventDirectorSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 500);
      
    } catch (error: any) {
      console.error('Error adding organizer contact:', error);
      setError(error.message || 'Failed to add organizer contact');
    } finally {
      setIsLoading(false);
    }
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4">
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
                <div className="lg:col-span-8">
                  <label className="block text-gray-400 text-sm mb-2">Event Status</label>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

              {/* Competition Classes feature temporarily removed - database schema mismatch */}
              {selectedOrganization?.competition_classes && selectedOrganization.competition_classes.length > 0 && (
                <div className="p-3 bg-gray-700/30 border border-gray-600 rounded-lg">
                  <p className="text-gray-400 text-sm">
                    📋 Available Competition Classes: {selectedOrganization.competition_classes.join(', ')}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    (Information display only - class selection feature temporarily disabled)
                  </p>
                </div>
              )}

              <div>
                <label className="block text-gray-400 text-sm mb-2">Sanctioning Body</label>
                <select
                  value={formData.sanction_body_id}
                  onChange={(e) => handleInputChange('sanction_body_id', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="">No sanctioning body</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name} ({org.type || org.organization_type || 'Organization'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Competition Season Year</label>
                <select
                  value={formData.season_year}
                  onChange={(e) => handleInputChange('season_year', parseInt(e.target.value))}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  {[...Array(6)].map((_, i) => {
                    const year = new Date().getFullYear() - 1 + i;
                    return (
                      <option key={year} value={year}>{year}</option>
                    );
                  })}
                </select>
              </div>

              {user?.membershipType === 'admin' && (
                <div className="md:col-span-2">
                  <label className="block text-gray-400 text-sm mb-2">Event Organizer</label>
                  <select
                    value={formData.organizer_id}
                    onChange={(e) => {
                      if (e.target.value === 'add_new') {
                        setShowAddNewOrganizer(true);
                      } else {
                        handleInputChange('organizer_id', e.target.value);
                      }
                    }}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    <option value="">Select organizer</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email}) - {u.membership_type}
                      </option>
                    ))}
                    <option value="add_new">+ Add External Organizer Contact (no account required)</option>
                  </select>
                                      <p className="text-gray-500 text-xs mt-1">
                      Select a registered user as organizer, or add external contact info without requiring an account. If not set, uses the event director contact fields.
                    </p>
                </div>
              )}
            </div>
          </div>

          {/* Date & Time Information */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Clock className="h-5 w-5 text-electric-500" />
              <span>Event Schedule</span>
            </h2>

            <div className="space-y-6">
              {/* Event Duration */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Event Duration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Event Start Date & Time *
                      <span className="text-gray-500 text-xs block">When your event begins</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Event End Date & Time *
                      <span className="text-gray-500 text-xs block">When your event concludes (can be multiple days later)</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.end_date}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                  </div>
                </div>
                
                {/* Event Duration Calculator */}
                {formData.start_date && formData.end_date && (
                  <div className="mt-3 p-3 bg-electric-500/10 border border-electric-500/20 rounded-lg">
                    <p className="text-electric-400 text-sm">
                      📅 Event Duration: {(() => {
                        const start = new Date(formData.start_date);
                        const end = new Date(formData.end_date);
                        const diffTime = end.getTime() - start.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
                        
                        if (diffDays > 1) {
                          return `${diffDays} days (Multi-day event)`;
                        } else if (diffHours > 24) {
                          return `${diffHours} hours (Single day event)`;
                        } else {
                          return `${diffHours} hours (Same day event)`;
                        }
                      })()}
                    </p>
                  </div>
                )}
              </div>

              {/* Registration Settings */}
              <div className="border-t border-gray-600/30 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Registration Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">
                      Registration Deadline
                      <span className="text-gray-500 text-xs block">When registration closes (optional)</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.registration_deadline}
                      onChange={(e) => handleInputChange('registration_deadline', e.target.value)}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <div className="text-gray-400 text-sm">
                      <p className="mb-2">💡 <strong>Multi-Day Event Tips:</strong></p>
                      <ul className="text-xs space-y-1 text-gray-500">
                        <li>• Set start/end times to span entire event duration</li>
                        <li>• Registration deadline typically 1-2 weeks before start</li>
                        <li>• Use the Event Schedule section below for daily activities</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location Information */}
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
                  placeholder="Enter venue name"
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
                <label className="block text-gray-400 text-sm mb-2">State/Province *</label>
                <input
                  type="text"
                  required
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="State or Province"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">ZIP/Postal Code</label>
                <input
                  type="text"
                  value={formData.zip_code}
                  onChange={(e) => handleInputChange('zip_code', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="ZIP or Postal Code"
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

              {/* Coordinate Override Section */}
              <div className="md:col-span-2">
                <div className="border-t border-gray-600/50 pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-electric-500" />
                    <span>Location Coordinates</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Latitude
                        <span className="text-gray-500 text-xs block">Decimal degrees (e.g. 40.715432)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude || ''}
                        onChange={(e) => handleInputChange('latitude', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="Auto-generated from address"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">
                        Longitude
                        <span className="text-gray-500 text-xs block">Decimal degrees (e.g. -88.006928)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.longitude || ''}
                        onChange={(e) => handleInputChange('longitude', e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="Auto-generated from address"
                      />
                    </div>
                    <div className="flex flex-col justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          // Re-geocode from address
                          if (formData.address && formData.city && formData.state) {
                            const fullAddress = `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip_code}`;
                            // Note: This would normally call a geocoding service
                            console.log('Re-geocoding address:', fullAddress);
                            // For now, just show a message
                            alert(`Re-geocoding functionality would query coordinates for: ${fullAddress}`);
                          } else {
                            alert('Please fill in the address fields first');
                          }
                        }}
                        className="w-full py-3 bg-electric-500/20 border border-electric-500/50 text-electric-400 rounded-lg hover:bg-electric-500/30 transition-colors text-sm font-medium"
                      >
                        Re-geocode Address
                      </button>
                    </div>
                  </div>
                  
                  {formData.latitude && formData.longitude && (
                    <div className="mt-4 p-3 bg-gray-700/30 border border-gray-600/50 rounded-lg">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Current coordinates:</span>
                        <span className="text-electric-400 font-mono">
                          {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${formData.latitude},${formData.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-electric-400 hover:text-electric-300 text-xs underline"
                        >
                          View on Google Maps ↗
                        </a>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3 text-xs text-gray-500">
                    💡 Tip: If the map shows the wrong location, you can manually adjust these coordinates for accuracy.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-electric-500" />
              <span>Registration Pricing</span>
            </h2>

            <div className="space-y-6">
              {/* General Registration Fee */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  General Registration Fee *
                  <span className="text-gray-500 text-xs block">Default registration fee (used if member/non-member pricing not set)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.registration_fee}
                  onChange={(e) => handleInputChange('registration_fee', parseFloat(e.target.value) || 0)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="0.00"
                />
              </div>

              {/* Single Registration Fee - Member/Non-Member pricing removed */}
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Users className="h-5 w-5 text-electric-500" />
              <span>Contact Information</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="contact@example.com"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Contact Phone</label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Phone number"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-400 text-sm mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Event Image/Flyer */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Image className="h-5 w-5 text-electric-500" />
              <span>Event Image/Flyer</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Event Flyer/Header Image</label>
                <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Handle image upload
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const imageUrl = e.target?.result as string;
                          handleInputChange('image_url', imageUrl);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="event-image-upload"
                  />
                  <label
                    htmlFor="event-image-upload"
                    className="cursor-pointer inline-flex items-center space-x-2 bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    <span>Choose Image</span>
                  </label>
                  <p className="text-gray-500 text-sm mt-2">
                    Upload an image that will be used as the event flyer and header on the event details page
                  </p>
                </div>
                
                {formData.image_url && (
                  <div className="mt-4">
                    <img
                      src={formData.image_url}
                      alt="Event flyer preview"
                      className="max-w-xs mx-auto rounded-lg shadow-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleInputChange('image_url', '')}
                      className="mt-2 text-red-500 hover:text-red-400 text-sm block mx-auto"
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Image URL (Alternative)</label>
                <input
                  type="url"
                  value={formData.image_url || ''}
                  onChange={(e) => handleInputChange('image_url', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="https://example.com/event-image.jpg"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Alternatively, you can enter a direct URL to an image hosted elsewhere
                </p>
              </div>
            </div>
          </div>

          {/* Event Director Contact */}
          <div data-section="event-director" className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Users className="h-5 w-5 text-electric-500" />
              <span>Event Director Contact</span>
            </h2>
            
            <div className="mb-4">
              <label className="flex items-center space-x-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={formData.use_organizer_contact}
                  onChange={(e) => handleInputChange('use_organizer_contact', e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500"
                />
                <span>Use organizer's contact information</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">First Name</label>
                <input
                  type="text"
                  value={formData.event_director_first_name}
                  onChange={(e) => handleInputChange('event_director_first_name', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Event director's first name"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Last Name</label>
                <input
                  type="text"
                  value={formData.event_director_last_name}
                  onChange={(e) => handleInputChange('event_director_last_name', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Event director's last name"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={formData.event_director_email}
                  onChange={(e) => handleInputChange('event_director_email', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="director@example.com"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.event_director_phone}
                  onChange={(e) => handleInputChange('event_director_phone', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Phone number"
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Globe className="h-5 w-5 text-electric-500" />
              <span>Additional Details</span>
            </h2>

            <div className="space-y-6">
              {/* Trophy Placements */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Trophy Placements</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <label className="flex items-center space-x-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.first_place_trophy}
                      onChange={(e) => handleInputChange('first_place_trophy', e.target.checked)}
                      className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500"
                    />
                    <span>1st Place</span>
                  </label>
                  <label className="flex items-center space-x-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.second_place_trophy}
                      onChange={(e) => handleInputChange('second_place_trophy', e.target.checked)}
                      className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500"
                    />
                    <span>2nd Place</span>
                  </label>
                  <label className="flex items-center space-x-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.third_place_trophy}
                      onChange={(e) => handleInputChange('third_place_trophy', e.target.checked)}
                      className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500"
                    />
                    <span>3rd Place</span>
                  </label>
                  <label className="flex items-center space-x-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.fourth_place_trophy}
                      onChange={(e) => handleInputChange('fourth_place_trophy', e.target.checked)}
                      className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500"
                    />
                    <span>4th Place</span>
                  </label>
                  <label className="flex items-center space-x-2 text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.fifth_place_trophy}
                      onChange={(e) => handleInputChange('fifth_place_trophy', e.target.checked)}
                      className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500"
                    />
                    <span>5th Place</span>
                  </label>
                </div>
              </div>

              {/* Raffle */}
              <div>
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.has_raffle}
                    onChange={(e) => handleInputChange('has_raffle', e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500"
                  />
                  <span className="font-medium">Has Raffle/Door Prizes</span>
                </label>
              </div>

              {/* Shop Sponsors */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Shop Sponsors</h3>
                <div className="space-y-3">
                  {formData.shop_sponsors.map((sponsor, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={sponsor}
                        onChange={(e) => {
                          const newSponsors = [...formData.shop_sponsors];
                          newSponsors[index] = e.target.value;
                          handleInputChange('shop_sponsors', newSponsors);
                        }}
                        className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="Shop sponsor name"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newSponsors = formData.shop_sponsors.filter((_, i) => i !== index);
                          handleInputChange('shop_sponsors', newSponsors);
                        }}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleInputChange('shop_sponsors', [...formData.shop_sponsors, ''])}
                    className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Add Shop Sponsor
                  </button>
                </div>
              </div>

              {/* Free Giveaways for Members */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Free Giveaways - Members</h3>
                <div className="space-y-3">
                  {formData.member_giveaways.map((giveaway, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={giveaway}
                        onChange={(e) => {
                          const newGiveaways = [...formData.member_giveaways];
                          newGiveaways[index] = e.target.value;
                          handleInputChange('member_giveaways', newGiveaways);
                        }}
                        className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="Member giveaway item"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newGiveaways = formData.member_giveaways.filter((_, i) => i !== index);
                          handleInputChange('member_giveaways', newGiveaways);
                        }}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleInputChange('member_giveaways', [...formData.member_giveaways, ''])}
                    className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Add Member Giveaway
                  </button>
                </div>
              </div>

              {/* Free Giveaways for Non-Members */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Free Giveaways - Non-Members</h3>
                <div className="space-y-3">
                  {formData.non_member_giveaways.map((giveaway, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={giveaway}
                        onChange={(e) => {
                          const newGiveaways = [...formData.non_member_giveaways];
                          newGiveaways[index] = e.target.value;
                          handleInputChange('non_member_giveaways', newGiveaways);
                        }}
                        className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="Non-member giveaway item"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newGiveaways = formData.non_member_giveaways.filter((_, i) => i !== index);
                          handleInputChange('non_member_giveaways', newGiveaways);
                        }}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleInputChange('non_member_giveaways', [...formData.non_member_giveaways, ''])}
                    className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Add Non-Member Giveaway
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SEO & Marketing */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <Globe className="h-5 w-5 text-electric-500" />
              <span>SEO & Marketing</span>
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-gray-400 text-sm mb-2">SEO Title</label>
                <input
                  type="text"
                  value={formData.seo_title}
                  onChange={(e) => handleInputChange('seo_title', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  placeholder="Custom title for search engines"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">SEO Description</label>
                <textarea
                  rows={3}
                  value={formData.seo_description}
                  onChange={(e) => handleInputChange('seo_description', e.target.value)}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 resize-none"
                  placeholder="Brief description for search engines"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">SEO Keywords</label>
                <div className="space-y-3">
                  {formData.seo_keywords.map((keyword, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="text"
                        value={keyword}
                        onChange={(e) => {
                          const newKeywords = [...formData.seo_keywords];
                          newKeywords[index] = e.target.value;
                          handleInputChange('seo_keywords', newKeywords);
                        }}
                        className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="SEO keyword"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newKeywords = formData.seo_keywords.filter((_, i) => i !== index);
                          handleInputChange('seo_keywords', newKeywords);
                        }}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleInputChange('seo_keywords', [...formData.seo_keywords, ''])}
                    className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                  >
                    Add Keyword
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => handleInputChange('is_featured', e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500"
                  />
                  <span>Featured Event</span>
                </label>

                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => handleInputChange('is_public', e.target.checked)}
                    className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500"
                  />
                  <span>Public Event</span>
                </label>
              </div>
            </div>
          </div>

          {/* Rules & Regulations */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Rules & Regulations</h2>

            {/* Organization Rules Option */}
            {selectedOrganization?.default_rules_content && (
              <div className="mb-4">
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleInputChange('rules', selectedOrganization.default_rules_content || '');
                      }
                    }}
                    className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500"
                  />
                  <span>Use standard organization rules ({selectedOrganization.default_rules_template_name || 'No template available'})</span>
                </label>
              </div>
            )}

            {/* Template Selection */}
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Or select from rules templates:</label>
              {configLoading ? (
                <div className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  <span>Loading templates...</span>
                </div>
              ) : configError ? (
                <div className="w-full p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  Error loading templates: {configError}
                </div>
              ) : (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      loadRulesTemplate(e.target.value);
                    }
                  }}
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                >
                  <option value="">Choose a rules template...</option>
                  {getRulesTemplates().map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Custom Rules Content */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Rules & Regulations Content</label>
              <textarea
                rows={8}
                value={formData.rules}
                onChange={(e) => handleInputChange('rules', e.target.value)}
                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 resize-none"
                placeholder="Enter event rules and regulations..."
              />
              <p className="text-gray-500 text-xs mt-2">
                You can use the templates above or write custom rules for your event.
              </p>
            </div>
          </div>

          {/* Save Button */}
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
              disabled={isSaving}
              className="bg-electric-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
            >
              {isSaving ? (
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
        </form>

        {/* Add New Organizer Modal */}
        {showAddNewOrganizer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Add External Organizer Contact</h3>
              <p className="text-gray-400 text-sm mb-4">
                Enter contact details for an external event organizer. No user account is required - this will simply populate the event director contact fields for display purposes.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={newOrganizerData.name}
                    onChange={(e) => setNewOrganizerData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Email *</label>
                  <input
                    type="email"
                    value={newOrganizerData.email}
                    onChange={(e) => setNewOrganizerData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Phone</label>
                  <input
                    type="tel"
                    value={newOrganizerData.phone}
                    onChange={(e) => setNewOrganizerData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Enter phone number"
                  />
                </div>
                

              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddNewOrganizer(false);
                    setNewOrganizerData({
                      name: '',
                      email: '',
                      phone: ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-600 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewOrganizer}
                  disabled={!newOrganizerData.name || !newOrganizerData.email}
                  className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Organizer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default EditEvent;