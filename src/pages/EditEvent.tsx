import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import EventForm from '../components/EventForm/EventForm';
import { EventFormData, EventCategory, Organization, DatabaseUser } from '../types/event';

const EditEvent = React.memo(function EditEvent() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [eventData, setEventData] = useState<EventFormData | null>(null);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<DatabaseUser[]>([]);

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
    
    loadInitialData();
  }, [id, canEditEvents, navigate]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadCategories(),
        loadOrganizations(),
        loadUsers(),
        loadEventData()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load event data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
      throw error;
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
      throw error;
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
      // Don't throw - this is optional for non-admins
    }
  };

  const loadEventData = async () => {
    if (!id) return;
    
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

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

      // Transform database data to form data with proper type conversion
      const transformedData: EventFormData = {
        title: event.title || '',
        description: event.description || '',
        category_id: event.category_id ? String(event.category_id) : '',
        sanction_body_id: event.organization_id ? String(event.organization_id) : '',
        season_year: Number(event.season_year) || new Date().getFullYear(),
        organizer_id: event.organizer_id ? String(event.organizer_id) : (user?.id || ''),
        start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
        end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
        registration_deadline: event.registration_deadline ? 
          new Date(event.registration_deadline).toISOString().slice(0, 16) : '',
        display_start_date: event.display_start_date || '',
        display_end_date: event.display_end_date || '',
        venue_name: event.venue_name || '',
        address: event.address || '',
        city: event.city || '',
        state: event.state || '',
        zip_code: event.zip_code || '',
        country: event.country || 'US',
        latitude: event.latitude !== null && event.latitude !== undefined ? Number(event.latitude) : null,
        longitude: event.longitude !== null && event.longitude !== undefined ? Number(event.longitude) : null,
        contact_email: event.contact_email || '',
        contact_phone: event.contact_phone || '',
        website: event.website_url || event.website || '',
        event_director_first_name: event.event_director_first_name || '',
        event_director_last_name: event.event_director_last_name || '',
        event_director_email: event.event_director_email || '',
        event_director_phone: event.event_director_phone || '',
        use_organizer_contact: event.use_organizer_contact || false,
        max_participants: event.max_participants !== null && event.max_participants !== undefined ? Number(event.max_participants) : null,
        registration_fee: Number(event.ticket_price || event.registration_fee || 0),
        early_bird_fee: event.early_bird_fee !== null && event.early_bird_fee !== undefined ? Number(event.early_bird_fee) : null,
        early_bird_deadline: event.early_bird_deadline || '',
        early_bird_name: event.early_bird_name || 'Early Bird Special',
        rules: event.rules || '',
        prizes: processPrizes(),
        schedule: processSchedule(),
        sponsors: processSponsors(),
        image_url: event.image_url || '',
        image_position: event.image_position || 50,
        first_place_trophy: event.first_place_trophy || false,
        second_place_trophy: event.second_place_trophy || false,
        third_place_trophy: event.third_place_trophy || false,
        fourth_place_trophy: event.fourth_place_trophy || false,
        fifth_place_trophy: event.fifth_place_trophy || false,
        has_raffle: event.has_raffle || false,
        shop_sponsors: Array.isArray(event.shop_sponsors) ? event.shop_sponsors.map((s: any) => String(s)) : (event.shop_sponsors ? [String(event.shop_sponsors)] : []),
        member_giveaways: Array.isArray(event.member_giveaways) ? event.member_giveaways.map((g: any) => String(g)) : (event.member_giveaways ? [String(event.member_giveaways)] : []),
        non_member_giveaways: Array.isArray(event.non_member_giveaways) ? event.non_member_giveaways.map((g: any) => String(g)) : (event.non_member_giveaways ? [String(event.non_member_giveaways)] : []),
        seo_title: event.seo_title || '',
        seo_description: event.seo_description || '',
        seo_keywords: Array.isArray(event.seo_keywords) ? event.seo_keywords.map((k: any) => String(k)) : (event.seo_keywords ? [String(event.seo_keywords)] : []),
        is_public: event.is_public !== false,
        is_featured: event.is_featured || false,
        is_active: event.is_active !== false,
        status: event.status || 'draft',
        approval_status: event.approval_status || 'pending'
      };

      setEventData(transformedData);
    } catch (error: any) {
      console.error('Error loading event:', error);
      throw error;
    }
  };

  const handleSubmit = async (formData: EventFormData) => {
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

      // Get category name for legacy category field
      const selectedCategory = categories.find(cat => cat.id === formData.category_id);

      const eventUpdateData = {
        id,
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
        category: selectedCategory?.name || 'Competition', // Legacy field
        organization_id: formData.sanction_body_id || null,
        season_year: formData.season_year,
        organizer_id: formData.organizer_id || null,
        start_date: formData.start_date,
        end_date: formData.end_date,
        registration_deadline: formData.registration_deadline || null,
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
        website_url: formData.website,
        image_url: formData.image_url || null,
        image_position: formData.image_position || 50,
        event_director_first_name: formData.event_director_first_name,
        event_director_last_name: formData.event_director_last_name,
        event_director_email: formData.event_director_email,
        event_director_phone: formData.event_director_phone,
        use_organizer_contact: formData.use_organizer_contact,
        is_active: formData.is_active,
        display_start_date: formData.display_start_date || null,
        display_end_date: formData.display_end_date || null,
        rules: formData.rules,
        prizes: formData.prizes.filter(p => p.trim()),
        schedule: formData.schedule.filter(s => s.time && s.activity),
        sponsors: formData.sponsors.filter(s => s.trim()),
        first_place_trophy: formData.first_place_trophy,
        second_place_trophy: formData.second_place_trophy,
        third_place_trophy: formData.third_place_trophy,
        fourth_place_trophy: formData.fourth_place_trophy,
        fifth_place_trophy: formData.fifth_place_trophy,
        has_raffle: formData.has_raffle,
        shop_sponsors: formData.shop_sponsors.filter(s => s.trim()),
        member_giveaways: formData.member_giveaways.filter(g => g.trim()),
        non_member_giveaways: formData.non_member_giveaways.filter(g => g.trim()),
        seo_title: formData.seo_title,
        seo_description: formData.seo_description,
        seo_keywords: formData.seo_keywords.filter(k => k.trim()),
        is_public: formData.is_public,
        is_featured: formData.is_featured,
        status: formData.status,
        approval_status: formData.approval_status,
        latitude: formData.latitude,
        longitude: formData.longitude
      };

      const { error } = await supabase
        .from('events')
        .update(eventUpdateData)
        .eq('id', id);

      if (error) throw error;
      
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
      throw new Error(error.message || 'Failed to update event. Please try again.');
    }
  };

  const handleCancel = () => {
    if (user?.membershipType === 'admin') {
      navigate('/admin/events');
    } else {
      navigate('/events');
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

  if (!eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center py-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Event Not Found</h2>
          <p className="text-gray-400">The event you're looking for doesn't exist.</p>
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
            onClick={() => user?.membershipType === 'admin' ? navigate('/admin/events') : navigate('/events')}
            className="text-electric-400 hover:text-electric-300 transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Edit Event</h1>
            <p className="text-gray-400">Update event details and settings</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
          </div>
        )}

        {/* Event Form */}
        <EventForm
          initialData={eventData}
          onSubmit={handleSubmit}
          isEditMode={true}
          categories={categories}
          organizations={organizations}
          users={users}
          isAdmin={user?.membershipType === 'admin'}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
});

export default EditEvent;