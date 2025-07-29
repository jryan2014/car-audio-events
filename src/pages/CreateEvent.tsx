import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../hooks/usePermissions';
import EventForm from '../components/EventForm/EventForm';
import { EventFormData, EventCategory, Organization, DatabaseUser } from '../types/event';

export default function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Check permissions
  const { hasPermission } = usePermissions();
  const canCreateEvents = hasPermission('create_events');

  useEffect(() => {
    if (!canCreateEvents) {
      navigate('/membership-plans?message=You need a paid subscription to create events');
      return;
    }
    
    loadInitialData();
  }, [canCreateEvents, navigate]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        loadCategories(),
        loadOrganizations(),
        loadUsers()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load required data. Please try again.');
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
        .select('id, name, organization_type, logo_url, small_logo_url, status, default_rules_content, competition_classes')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      
      const transformedData: Organization[] = (data || []).map(org => ({
        id: org.id,
        name: org.name,
        type: org.organization_type || 'organization',
        organization_type: org.organization_type,
        logo_url: org.logo_url,
        small_logo_url: org.small_logo_url,
        status: org.status,
        default_rules_content: org.default_rules_content,
        competition_classes: org.competition_classes || []
      }));
      
      setOrganizations(transformedData);
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

  const handleSubmit = async (formData: EventFormData) => {
    try {
      // Get category name for legacy category field
      const selectedCategory = categories.find(cat => cat.id === formData.category_id);
      
      const eventData = {
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
        category: selectedCategory?.name || 'Competition', // Legacy field
        start_date: formData.start_date,
        end_date: formData.end_date,
        registration_deadline: formData.registration_deadline || null,
        max_participants: formData.max_participants,
        ticket_price: formData.registration_fee,
        member_price: formData.member_price || 0,
        non_member_price: formData.non_member_price || 0,
        venue_name: formData.venue_name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        country: formData.country,
        latitude: formData.latitude,
        longitude: formData.longitude,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        website_url: formData.website,
        image_url: formData.image_url || null,
        image_position: formData.image_position || 50,
        image_position_x: formData.image_position_x || 50,
        image_zoom: formData.image_zoom || 1,
        image_crop_x: formData.image_crop_x || 0,
        image_crop_y: formData.image_crop_y || 0,
        image_crop_width: formData.image_crop_width || null,
        image_crop_height: formData.image_crop_height || null,
        flyer_template_id: formData.flyer_template_id || null,
        rules: formData.rules,
        organization_id: formData.sanction_body_id || null,
        organizer_id: formData.organizer_id || user?.id || null,
        status: 'draft',
        is_featured: formData.is_featured,
        is_public: formData.is_public,
        allows_online_registration: formData.allows_online_registration || false,
        // Event director fields
        event_director_first_name: formData.event_director_first_name,
        event_director_last_name: formData.event_director_last_name,
        event_director_email: formData.event_director_email,
        event_director_phone: formData.event_director_phone,
        // Additional fields
        prizes: formData.prizes.filter(p => p.trim()),
        schedule: formData.schedule.filter(s => s.time && s.activity),
        sponsors: formData.sponsors.filter(s => s.trim()),
        // SEO fields
        seo_title: formData.seo_title,
        seo_description: formData.seo_description,
        seo_keywords: formData.seo_keywords.filter(k => k.trim())
      };

      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      // Save multiple categories if any were selected
      if (data && formData.category_ids && formData.category_ids.length > 0) {
        const categoriesData = formData.category_ids.map(categoryId => ({
          event_id: data.id,
          category_id: categoryId
        }));

        const { error: categoriesError } = await supabase
          .from('event_categories_junction')
          .insert(categoriesData);

        if (categoriesError) {
          console.error('Error saving event categories:', categoriesError);
          // Don't throw - event was created successfully
        }
      }

      // Save competition classes if any were selected
      if (data && formData.competition_classes && formData.competition_classes.length > 0) {
        const classesData = formData.competition_classes.map(className => ({
          event_id: data.id,
          competition_class: className
        }));

        const { error: classesError } = await supabase
          .from('event_competition_classes')
          .insert(classesData);

        if (classesError) {
          console.error('Error saving competition classes:', classesError);
          // Don't throw - event was created successfully
        }
      }

      setSuccess(true);
      
      // Redirect after success
      setTimeout(() => {
        if (user?.membershipType === 'admin') {
          navigate('/admin/events');
        } else {
          navigate('/events');
        }
      }, 2000);

    } catch (error: any) {
      console.error('Error creating event:', error);
      throw new Error(error.message || 'Failed to create event');
    }
  };

  const handleCancel = () => {
    if (user?.membershipType === 'admin') {
      navigate('/admin/events');
    } else {
      navigate('/events');
    }
  };

  // Initial form data with user defaults
  const initialFormData: Partial<EventFormData> = {
    organizer_id: user?.id || '',
    contact_email: user?.email || '',
    contact_phone: user?.phone || '',
    event_director_first_name: '',
    event_director_last_name: '',
    event_director_email: '',
    event_director_phone: '',
    use_organizer_contact: false
  };

  if (!canCreateEvents) {
    return <div>Access denied</div>;
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
          <h2 className="text-2xl font-bold text-white mb-4">Event Created Successfully!</h2>
          <p className="text-gray-400 mb-6">Your event has been created. Redirecting...</p>
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
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Create Event</h1>
            <p className="text-gray-400">Set up a new car audio event</p>
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
          initialData={initialFormData}
          onSubmit={handleSubmit}
          isEditMode={false}
          categories={categories}
          organizations={organizations}
          users={users}
          isAdmin={user?.membershipType === 'admin'}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}