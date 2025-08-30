import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { EventFormData, EventScheduleItem, Organization, EventCategory, DatabaseUser, COUNTRIES } from '../../types/event';
import { validateEventForm, validateEventDraft, formatValidationErrors } from '../../schemas/eventValidation';
import { useDebounce } from '../../hooks/useDebounce';
import { geocodingService } from '../../services/geocoding';
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
    category_ids: [],
    sanction_body_id: '',
    season_year: new Date().getFullYear(),
    organizer_id: '',
    start_date: getDefaultDateTime(0, 9),  // Changed to 9am
    end_date: getDefaultDateTime(0, 19),   // Changed to 7pm same day
    registration_deadline: '',
    display_start_date: getTodayDate(),
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
    use_organizer_contact: false,
    max_participants: null,
    registration_fee: 0,
    member_price: 25,      // Default $25
    non_member_price: 30,   // Default $30
    gate_fee: null,
    multi_day_pricing: null,
    early_bird_fee: null,
    early_bird_deadline: '',
    early_bird_name: 'Early Bird Special',
    rules: '',
    prizes: [''],
    schedule: [
      { time: '09:00', activity: 'Registration Opens' },  // Match start time
      { time: '19:00', activity: 'Event Ends' }           // Match end time
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
    is_featured: true,  // Default to featured
    is_active: true,
    status: 'draft',
    approval_status: 'pending',
    allows_online_registration: false,
    ...initialData
  }));
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Update form data when initialData changes (for suggestion pre-population)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
    }
  }, [initialData]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showValidationSummary, setShowValidationSummary] = useState(false);

  // Hooks removed - useSystemConfiguration no longer needed
  
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
  function getDefaultDateTime(daysOffset: number = 0, defaultHour: number = 9) {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 1 + daysOffset);  // Tomorrow + offset
    targetDate.setHours(defaultHour, 0, 0, 0);
    
    return targetDate.toISOString().slice(0, 16);
  }

  // Helper function to get today's date
  function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // Update form field
  const updateField = useCallback(<K extends keyof EventFormData>(
    field: K,
    value: EventFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => new Set(prev).add(field));
  }, []);

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

  // Auto-calculate registration deadline when start date changes
  useEffect(() => {
    if (formData.start_date) {
      const startDate = new Date(formData.start_date);
      // Set registration deadline to 1 minute before event start
      startDate.setMinutes(startDate.getMinutes() - 1);
      updateField('registration_deadline', startDate.toISOString().slice(0, 16));
    }
  }, [formData.start_date]);

  // Auto-update schedule times when start/end dates change
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      // Extract times
      const startHour = String(startDate.getHours()).padStart(2, '0');
      const startMinute = String(startDate.getMinutes()).padStart(2, '0');
      const endHour = String(endDate.getHours()).padStart(2, '0');
      const endMinute = String(endDate.getMinutes()).padStart(2, '0');
      
      const startTime = `${startHour}:${startMinute}`;
      const endTime = `${endHour}:${endMinute}`;
      
      // Update schedule if it has the default structure
      if (formData.schedule.length >= 2) {
        const newSchedule = [...formData.schedule];
        // Update first item (Registration Opens) with start time
        if (newSchedule[0].activity === 'Registration Opens' || newSchedule[0].activity === '') {
          newSchedule[0] = { time: startTime, activity: 'Registration Opens' };
        }
        // Update last item (Event Ends) with end time
        const lastIndex = newSchedule.length - 1;
        if (newSchedule[lastIndex].activity === 'Event Ends' || newSchedule[lastIndex].activity === '') {
          newSchedule[lastIndex] = { time: endTime, activity: 'Event Ends' };
        }
        updateField('schedule', newSchedule);
      }
    }
  }, [formData.start_date, formData.end_date]);

  // Auto-calculate display dates when they are empty (initial setup)
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      const today = new Date().toISOString().split('T')[0];
      
      // Set display_start_date to today if it's empty
      const needsDisplayStart = !formData.display_start_date;
      
      // Set display_end_date to 1 day after event ends if it's empty
      const needsDisplayEnd = !formData.display_end_date;
      
      if (needsDisplayStart || needsDisplayEnd) {
        const displayEnd = new Date(endDate);
        displayEnd.setDate(displayEnd.getDate() + 1);
        const newDisplayEndDate = displayEnd.toISOString().split('T')[0];
        
        setFormData(prev => ({
          ...prev,
          ...(needsDisplayStart && { display_start_date: today }),
          ...(needsDisplayEnd && { display_end_date: newDisplayEndDate })
        }));
      }
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
          console.log('Geocoding result:', result);
          if ('latitude' in result) {
            // Only update if we still don't have coordinates
            setFormData(prev => {
              if (prev.latitude === null && prev.longitude === null) {
                console.log('Setting coordinates:', result.latitude, result.longitude);
                return {
                  ...prev,
                  latitude: result.latitude,
                  longitude: result.longitude
                };
              }
              console.log('Coordinates already set, not updating');
              return prev;
            });
          } else {
            console.error('Geocoding failed:', result);
          }
        })
        .catch(error => {
          console.error('Geocoding error:', error);
        });
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
    
    const validation = validateEventForm(cleanedFormData, isAdmin);
    
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
          selectedOrganization={selectedOrganization}
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