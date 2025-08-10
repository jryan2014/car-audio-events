import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import EventForm from '../components/EventForm/EventForm';
import { EventFormData, EventCategory, Organization, DatabaseUser } from '../types/event';
import { formatDateForInput, formatDateForDateInput, formatDateForDatabase } from '../utils/dateHelpers';

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
      
      console.log('Loaded event data:', event);
      console.log('Event dates from DB:', {
        start_date: event.start_date,
        end_date: event.end_date,
        registration_deadline: event.registration_deadline,
        early_bird_deadline: event.early_bird_deadline
      });
      console.log('Event schedule:', event.schedule);
      console.log('Event image_url:', event.image_url);
      console.log('Event trophies:', {
        first: event.first_place_trophy,
        second: event.second_place_trophy,
        third: event.third_place_trophy,
        fourth: event.fourth_place_trophy,
        fifth: event.fifth_place_trophy
      });
      console.log('Event visibility:', {
        is_public: event.is_public,
        is_featured: event.is_featured,
        allows_online_registration: event.allows_online_registration
      });

      // Load competition classes for this event
      const { data: competitionClasses, error: classesError } = await supabase
        .from('event_competition_classes')
        .select('competition_class')
        .eq('event_id', id);

      if (classesError) {
        console.error('Error loading competition classes:', classesError);
      }

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
        console.log('processSchedule - Raw event.schedule:', event.schedule);
        console.log('processSchedule - Type of event.schedule:', typeof event.schedule);
        console.log('processSchedule - Is Array?:', Array.isArray(event.schedule));
        
        if (!event.schedule) {
          console.log('processSchedule - No schedule, returning empty');
          return [{ time: '', activity: '' }];
        }
        
        if (typeof event.schedule === 'string') {
          console.log('processSchedule - Schedule is string, parsing...');
          try {
            const parsed = JSON.parse(event.schedule);
            console.log('processSchedule - Parsed schedule:', parsed);
            return parsed.map((item: any) => ({
              time: item.time || '',
              activity: item.activity || ''
            }));
          } catch (e) {
            console.error('processSchedule - Parse error:', e);
            return [{ time: '', activity: '' }];
          }
        }
        
        if (Array.isArray(event.schedule)) {
          console.log('processSchedule - Schedule is array');
          if (event.schedule.length > 0) {
            const result = event.schedule.map((item: any) => ({
              time: item.time || '',
              activity: item.activity || ''
            }));
            console.log('processSchedule - Mapped schedule:', result);
            return result;
          } else {
            console.log('processSchedule - Empty array, returning default');
            return [{ time: '', activity: '' }];
          }
        }
        
        console.log('processSchedule - Schedule is neither string nor array, returning default');
        return [{ time: '', activity: '' }];
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
        start_date: formatDateForInput(event.start_date),
        end_date: formatDateForInput(event.end_date),
        registration_deadline: formatDateForInput(event.registration_deadline),
        display_start_date: formatDateForDateInput(event.display_start_date) || new Date().toISOString().split('T')[0],
        display_end_date: formatDateForDateInput(event.display_end_date),
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
        use_organizer_contact: event.use_organizer_contact === true,
        max_participants: event.max_participants !== null && event.max_participants !== undefined ? Number(event.max_participants) : null,
        registration_fee: Number(event.ticket_price || event.registration_fee || 0),
        member_price: Number(event.member_price || 0),
        non_member_price: Number(event.non_member_price || 0),
        early_bird_fee: event.early_bird_fee !== null && event.early_bird_fee !== undefined ? Number(event.early_bird_fee) : null,
        early_bird_deadline: formatDateForInput(event.early_bird_deadline),
        early_bird_name: event.early_bird_name || 'Early Bird Special',
        gate_fee: event.gate_fee !== null && event.gate_fee !== undefined ? Number(event.gate_fee) : null,
        multi_day_pricing: event.multi_day_pricing || null,
        rules: event.rules || '',
        prizes: processPrizes(),
        schedule: processSchedule(),
        sponsors: processSponsors(),
        image_url: event.image_url || '',
        image_position: event.image_position !== null && event.image_position !== undefined ? event.image_position : 50,
        image_position_x: event.image_position_x !== null && event.image_position_x !== undefined ? event.image_position_x : 50,
        image_zoom: event.image_zoom !== null && event.image_zoom !== undefined ? Number(event.image_zoom) : 1,
        image_crop_x: event.image_crop_x !== null && event.image_crop_x !== undefined ? Number(event.image_crop_x) : 0,
        image_crop_y: event.image_crop_y !== null && event.image_crop_y !== undefined ? Number(event.image_crop_y) : 0,
        image_crop_width: event.image_crop_width !== null && event.image_crop_width !== undefined ? Number(event.image_crop_width) : null,
        image_crop_height: event.image_crop_height !== null && event.image_crop_height !== undefined ? Number(event.image_crop_height) : null,
        flyer_template_id: event.flyer_template_id || null,
        first_place_trophy: !!event.first_place_trophy,
        second_place_trophy: !!event.second_place_trophy,
        third_place_trophy: !!event.third_place_trophy,
        fourth_place_trophy: !!event.fourth_place_trophy,
        fifth_place_trophy: !!event.fifth_place_trophy,
        has_raffle: !!event.has_raffle,
        shop_sponsors: Array.isArray(event.shop_sponsors) ? event.shop_sponsors.map((s: any) => String(s)) : (event.shop_sponsors ? [String(event.shop_sponsors)] : []),
        member_giveaways: Array.isArray(event.member_giveaways) ? event.member_giveaways.map((g: any) => String(g)) : (event.member_giveaways ? [String(event.member_giveaways)] : []),
        non_member_giveaways: Array.isArray(event.non_member_giveaways) ? event.non_member_giveaways.map((g: any) => String(g)) : (event.non_member_giveaways ? [String(event.non_member_giveaways)] : []),
        seo_title: event.seo_title || '',
        seo_description: event.seo_description || '',
        seo_keywords: Array.isArray(event.seo_keywords) ? event.seo_keywords.map((k: any) => String(k)) : (event.seo_keywords ? [String(event.seo_keywords)] : []),
        is_public: !!event.is_public,
        is_featured: !!event.is_featured,
        is_active: event.is_active !== false,
        status: event.status || 'draft',
        approval_status: event.approval_status || 'pending',
        competition_classes: competitionClasses?.map(item => item.competition_class) || [],
        allows_online_registration: !!event.allows_online_registration,
        external_registration_url: event.external_registration_url || ''
      };


      console.log('Transformed data:', transformedData);
      console.log('Formatted dates:', {
        start_date: transformedData.start_date,
        end_date: transformedData.end_date,
        registration_deadline: transformedData.registration_deadline,
        early_bird_deadline: transformedData.early_bird_deadline
      });
      console.log('Transformed schedule:', transformedData.schedule);
      console.log('Transformed image_url:', transformedData.image_url);
      
      setEventData(transformedData);
    } catch (error: any) {
      console.error('Error loading event:', error);
      throw error;
    }
  };

  const handleSubmit = async (formData: EventFormData) => {
    try {
      // Don't force coordinate updates - let user control them

      // Get category name for legacy category field
      const selectedCategory = categories.find(cat => cat.id === formData.category_id);

      // Ensure image_position is a number
      const imagePosition = typeof formData.image_position === 'number' 
        ? formData.image_position 
        : 50;
      
      // Ensure image position values are within valid range (0-100)
      const imagePositionX = Math.max(0, Math.min(100, formData.image_position_x || 50));
      const imagePositionY = Math.max(0, Math.min(100, imagePosition));
      
      const eventUpdateData = {
        id,
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
        category: selectedCategory?.name || 'Competition', // Legacy field
        organization_id: formData.sanction_body_id || null,
        season_year: formData.season_year,
        organizer_id: formData.organizer_id || null,
        start_date: formatDateForDatabase(formData.start_date),
        end_date: formatDateForDatabase(formData.end_date),
        registration_deadline: formatDateForDatabase(formData.registration_deadline),
        max_participants: formData.max_participants,
        ticket_price: formData.registration_fee,
        member_price: formData.member_price || 0,
        non_member_price: formData.non_member_price || 0,
        early_bird_fee: formData.early_bird_fee,
        early_bird_deadline: formatDateForDatabase(formData.early_bird_deadline),
        early_bird_name: formData.early_bird_name || 'Early Bird Special',
        gate_fee: formData.gate_fee || null,
        multi_day_pricing: formData.multi_day_pricing || null,
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
        image_position: imagePositionY,
        image_position_x: imagePositionX,
        image_zoom: formData.image_zoom || 1,
        image_crop_x: formData.image_crop_x || 0,
        image_crop_y: formData.image_crop_y || 0,
        image_crop_width: formData.image_crop_width || null,
        image_crop_height: formData.image_crop_height || null,
        flyer_template_id: formData.flyer_template_id || null,
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
        longitude: formData.longitude,
        allows_online_registration: formData.allows_online_registration || false,
        external_registration_url: formData.external_registration_url || null
      };

      
      const { data: updateResult, error } = await supabase
        .from('events')
        .update(eventUpdateData)
        .eq('id', id)
        .select();

      if (error) throw error;

      // Update competition classes
      // First, delete existing classes
      const { error: deleteError } = await supabase
        .from('event_competition_classes')
        .delete()
        .eq('event_id', id);

      if (deleteError) {
        console.error('Error deleting existing competition classes:', deleteError);
      }

      // Then insert new classes if any
      if (formData.competition_classes && formData.competition_classes.length > 0) {
        const classesData = formData.competition_classes.map(className => ({
          event_id: id,
          competition_class: className
        }));

        const { error: insertError } = await supabase
          .from('event_competition_classes')
          .insert(classesData);

        if (insertError) {
          console.error('Error inserting competition classes:', insertError);
        }
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
        <div className="max-w-2xl w-full text-center">
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
    console.log('DEBUG: eventData is null, loading...');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

        {/* Event Form - Only render when data is loaded */}
        {eventData && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
});

export default EditEvent;