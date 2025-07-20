import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { EventFormData, EventScheduleItem, Organization, EventCategory, DatabaseUser, COUNTRIES } from '../../types/event';
import { validateEventForm, validateEventDraft, formatValidationErrors } from '../../schemas/eventValidation';
import { useDebounce } from '../../hooks/useDebounce';
import { geocodingService } from '../../services/geocoding';
import { useSystemConfiguration } from '../../hooks/useSystemConfiguration';
import { AlertCircle } from 'lucide-react';

// Lazy load form sections for better performance
const BasicInfoSection = React.lazy(() => import('./sections/BasicInfoSection'));
const ImageSection = React.lazy(() => import('./sections/ImageSection'));
import CompetitionClassesSection from './sections/CompetitionClassesSection';
const ScheduleSection = React.lazy(() => import('./sections/ScheduleSection'));
const LocationSection = React.lazy(() => import('./sections/LocationSection'));
const PricingSection = React.lazy(() => import('./sections/PricingSection'));
const ContactSection = React.lazy(() => import('./sections/ContactSection'));
const AdditionalDetailsSection = React.lazy(() => import('./sections/AdditionalDetailsSection'));
const RulesSection = React.lazy(() => import('./sections/RulesSection'));
const SEOSection = React.lazy(() => import('./sections/SEOSection'));
const VisibilitySection = React.lazy(() => import('./sections/VisibilitySection'));

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => Promise<void>;
  isEditMode?: boolean;
  categories: EventCategory[];
  organizations: Organization[];
  users?: DatabaseUser[];
  isAdmin?: boolean;
  onCancel: () => void;
}

export const EventForm: React.FC<EventFormProps> = ({
  initialData,
  onSubmit,
  isEditMode = false,
  categories,
  organizations,
  users = [],
  isAdmin = false,
  onCancel
}) => {
  // Form state
  const [formData, setFormData] = useState<EventFormData>(() => ({
    // Default values
    title: '',
    description: '',
    category_id: '',
    sanction_body_id: '',
    season_year: new Date().getFullYear(),
    organizer_id: '',
    start_date: getDefaultDateTime(0, 8),
    end_date: getDefaultDateTime(11, 8),
    registration_deadline: '',
    display_start_date: '',
    display_end_date: '',
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
    event_director_first_name: '',
    event_director_last_name: '',
    event_director_email: '',
    event_director_phone: '',
    use_organizer_contact: true,
    max_participants: null,
    registration_fee: 0,
    member_price: 0,
    non_member_price: 0,
    early_bird_fee: null,
    early_bird_deadline: '',
    early_bird_name: 'Early Bird Special',
    rules: '',
    prizes: [''],
    schedule: [
      { time: '08:00', activity: 'Registration Opens' },
      { time: '19:00', activity: 'Event Ends' }
    ],
    sponsors: [''],
    image_url: '',
    image_position: 50,
    competition_classes: [],
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
    is_public: true,
    is_featured: false,
    is_active: true,
    status: 'draft',
    approval_status: 'pending',
    ...initialData
  }));
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  // Hooks
  const { saveFormData } = useSystemConfiguration();
  
  // Debounced address for geocoding
  const debouncedAddress = useDebounce(
    `${formData.address}, ${formData.city}, ${formData.state} ${formData.zip_code}`,
    1500 // 1.5 second delay
  );

  // Selected organization details
  const selectedOrganization = useMemo(() => {
    // Convert both to strings for comparison since IDs might be numbers or strings
    const org = organizations.find(org => String(org.id) === String(formData.sanction_body_id));
    return org;
  }, [formData.sanction_body_id, organizations]);

  // Helper function to generate default datetime values
  function getDefaultDateTime(hoursOffset: number = 0, defaultHour: number = 8) {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(defaultHour, 0, 0, 0);
    
    if (hoursOffset > 0) {
      tomorrow.setHours(tomorrow.getHours() + hoursOffset);
    }
    
    return tomorrow.toISOString().slice(0, 16);
  }

  // Update form field
  const updateField = useCallback(<K extends keyof EventFormData>(
    field: K,
    value: EventFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => new Set(prev).add(field));
    
    // Auto-save certain fields
    if (['title', 'description', 'venue_name'].includes(field) && typeof value === 'string') {
      saveFormData(isEditMode ? 'edit_event' : 'create_event', field, value);
    }
  }, [isEditMode, saveFormData]);

  // Mark field as touched
  const touchField = useCallback((field: string) => {
    setTouched(prev => new Set(prev).add(field));
  }, []);

  // Validate form on changes
  useEffect(() => {
    const result = validateEventDraft(formData);
    const newErrors = !result.success ? formatValidationErrors(result.error) : {};
    
    // Only update if errors actually changed
    setValidationErrors(prev => {
      const prevKeys = Object.keys(prev).sort().join(',');
      const newKeys = Object.keys(newErrors).sort().join(',');
      const prevValues = Object.values(prev).sort().join(',');
      const newValues = Object.values(newErrors).sort().join(',');
      
      if (prevKeys !== newKeys || prevValues !== newValues) {
        return newErrors;
      }
      return prev;
    });
  }, [formData]);

  // Auto-calculate display dates ONLY when they are empty (initial setup)
  useEffect(() => {
    if (formData.start_date && formData.end_date && !formData.display_start_date && !formData.display_end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      const displayStart = new Date(startDate);
      displayStart.setDate(displayStart.getDate() - 90);
      
      const displayEnd = new Date(endDate);
      displayEnd.setDate(displayEnd.getDate() + 30);
      
      const newDisplayStartDate = displayStart.toISOString().split('T')[0];
      const newDisplayEndDate = displayEnd.toISOString().split('T')[0];
      
      setFormData(prev => ({
        ...prev,
        display_start_date: newDisplayStartDate,
        display_end_date: newDisplayEndDate
      }));
    }
  }, [formData.start_date, formData.end_date]);

  // Geocode address ONLY if coordinates are not already set
  // This prevents overwriting manually entered or saved coordinates
  useEffect(() => {
    // Don't geocode if:
    // 1. We already have coordinates (prevents overwriting saved/manual coords)
    // 2. We're in edit mode and initial data had coordinates
    if (formData.latitude !== null && formData.longitude !== null) {
      return;
    }
    
    // Only geocode if we have a complete address
    if (debouncedAddress && formData.address && formData.city && formData.state) {
      // Convert country code to country name for geocoding
      const countryName = COUNTRIES.find(c => c.code === formData.country)?.name || formData.country;
      
      geocodingService.geocodeAddress(
        formData.city, 
        formData.state, 
        countryName,
        formData.address,
        formData.zip_code
      )
        .then(result => {
          if ('latitude' in result) {
            // Only update if we still don't have coordinates
            setFormData(prev => {
              if (prev.latitude === null && prev.longitude === null) {
                return {
                  ...prev,
                  latitude: result.latitude,
                  longitude: result.longitude
                };
              }
              return prev;
            });
          }
        })
        .catch(console.error);
    }
  }, [debouncedAddress, formData.address, formData.city, formData.state, formData.country, formData.zip_code]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidationSummary(true);
    
    // Ensure registration_deadline is always a string for validation
    const cleanedFormData = {
      ...formData,
      registration_deadline: formData.registration_deadline ? String(formData.registration_deadline) : ''
    };
    
    const validation = validateEventForm(cleanedFormData);
    
    if (!validation.success) {
      setValidationErrors(formatValidationErrors(validation.error));
      // Scroll to first error
      const firstErrorField = Object.keys(formatValidationErrors(validation.error))[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(cleanedFormData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get field error
  const getFieldError = (field: string): string | undefined => {
    if (touched.has(field) || showValidationSummary) {
      return validationErrors[field];
    }
    return undefined;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {/* Validation Summary */}
      {showValidationSummary && Object.keys(validationErrors).length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4" role="alert">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-400 font-medium">Please fix the following errors:</h3>
              <ul className="mt-2 space-y-1 text-sm text-red-300">
                {Object.entries(validationErrors).slice(0, 5).map(([field, error]) => (
                  <li key={field}>• {error}</li>
                ))}
                {Object.keys(validationErrors).length > 5 && (
                  <li className="text-red-400">
                    ...and {Object.keys(validationErrors).length - 5} more errors
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Form Sections with Loading Fallback */}
      <React.Suspense fallback={<SectionSkeleton />}>
        <BasicInfoSection
          formData={formData}
          categories={categories}
          organizations={organizations}
          users={users}
          selectedOrganization={selectedOrganization}
          isAdmin={isAdmin}
          updateField={updateField}
          getFieldError={getFieldError}
          touchField={touchField}
        />
      </React.Suspense>

      <React.Suspense fallback={<SectionSkeleton />}>
        <ImageSection
          formData={formData}
          updateField={updateField}
          getFieldError={getFieldError}
          touchField={touchField}
        />
      </React.Suspense>

      <CompetitionClassesSection
        formData={formData}
        selectedOrganization={selectedOrganization}
        updateField={updateField}
      />

      <React.Suspense fallback={<SectionSkeleton />}>
        <ScheduleSection
          formData={formData}
          updateField={updateField}
          getFieldError={getFieldError}
          touchField={touchField}
        />
      </React.Suspense>

      <React.Suspense fallback={<SectionSkeleton />}>
        <LocationSection
          formData={formData}
          updateField={updateField}
          getFieldError={getFieldError}
          touchField={touchField}
        />
      </React.Suspense>

      <React.Suspense fallback={<SectionSkeleton />}>
        <ContactSection
          formData={formData}
          updateField={updateField}
          getFieldError={getFieldError}
          touchField={touchField}
        />
      </React.Suspense>

      <React.Suspense fallback={<SectionSkeleton />}>
        <PricingSection
          formData={formData}
          updateField={updateField}
          getFieldError={getFieldError}
          touchField={touchField}
        />
      </React.Suspense>

      <React.Suspense fallback={<SectionSkeleton />}>
        <AdditionalDetailsSection
          formData={formData}
          updateField={updateField}
          getFieldError={getFieldError}
          touchField={touchField}
        />
      </React.Suspense>

      <React.Suspense fallback={<SectionSkeleton />}>
        <RulesSection
          formData={formData}
          selectedOrganization={selectedOrganization}
          updateField={updateField}
          getFieldError={getFieldError}
          touchField={touchField}
        />
      </React.Suspense>

      <React.Suspense fallback={<SectionSkeleton />}>
        <VisibilitySection
          formData={formData}
          updateField={updateField}
          getFieldError={getFieldError}
          touchField={touchField}
        />
      </React.Suspense>

      <React.Suspense fallback={<SectionSkeleton />}>
        <SEOSection
          formData={formData}
          updateField={updateField}
          getFieldError={getFieldError}
          touchField={touchField}
        />
      </React.Suspense>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-4 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border border-gray-600 text-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Saving...</span>
            </>
          ) : (
            <span>{isEditMode ? 'Update Event' : 'Create Event'}</span>
          )}
        </button>
      </div>
    </form>
  );
};

// Loading skeleton for sections
const SectionSkeleton: React.FC = () => (
  <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
    <div className="animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-1/4 mb-6" />
      <div className="space-y-4">
        <div className="h-10 bg-gray-700 rounded" />
        <div className="h-10 bg-gray-700 rounded" />
      </div>
    </div>
  </div>
);

export default EventForm;