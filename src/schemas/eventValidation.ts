import { z } from 'zod';

// Custom error messages
const requiredString = (fieldName: string) => 
  z.string().min(1, `${fieldName} is required`);

const optionalString = z.string().optional();

const phoneRegex = /^[\d\s()+-]+$/;
const emailSchema = z.string().email('Invalid email address');

// Create base schema without refinements
const baseEventSchema = z.object({
  // Basic Information
  title: requiredString('Event title')
    .max(200, 'Event title must be less than 200 characters'),
  
  description: requiredString('Description')
    .max(5000, 'Description must be less than 5000 characters'),
  
  category_id: requiredString('Event category'),
  
  sanction_body_id: optionalString,
  
  season_year: z.number()
    .min(new Date().getFullYear() - 2, 'Season year cannot be more than 2 years in the past')
    .max(new Date().getFullYear() + 10, 'Season year cannot be more than 10 years in the future'),
  
  organizer_id: optionalString,
  
  // Schedule validation with custom refinements
  start_date: requiredString('Start date'),
  end_date: requiredString('End date'),
  registration_deadline: optionalString,
  display_start_date: optionalString,
  display_end_date: optionalString,
  
  // Location
  venue_name: requiredString('Venue name')
    .max(200, 'Venue name must be less than 200 characters'),
  
  address: requiredString('Address')
    .max(300, 'Address must be less than 300 characters'),
  
  city: requiredString('City')
    .max(100, 'City name must be less than 100 characters'),
  
  state: requiredString('State/Province')
    .max(100, 'State/Province must be less than 100 characters'),
  
  zip_code: z.string()
    .refine((val) => !val || /^[\w\s-]+$/.test(val), 'Invalid ZIP/postal code format')
    .optional(),
  
  country: requiredString('Country'),
  
  latitude: z.number().nullable()
    .refine((val) => val === null || (val >= -90 && val <= 90), 'Latitude must be between -90 and 90'),
  
  longitude: z.number().nullable()
    .refine((val) => val === null || (val >= -180 && val <= 180), 'Longitude must be between -180 and 180'),
  
  // Contact Information
  contact_email: z.union([emailSchema, z.literal('')]).optional(),
  
  contact_phone: z.string()
    .refine((val) => !val || phoneRegex.test(val), 'Invalid phone number format')
    .optional(),
  
  website: z.string()
    .refine((val) => !val || val.startsWith('http'), 'Website must start with http:// or https://')
    .optional(),
  
  // Event Director
  event_director_first_name: optionalString,
  event_director_last_name: optionalString,
  event_director_email: z.union([emailSchema, z.literal('')]).optional(),
  event_director_phone: z.string()
    .refine((val) => !val || phoneRegex.test(val), 'Invalid phone number format')
    .optional(),
  use_organizer_contact: z.boolean(),
  
  // Pricing
  max_participants: z.number().nullable()
    .refine((val) => val === null || val > 0, 'Max participants must be greater than 0'),
  
  registration_fee: z.number()
    .min(0, 'Registration fee cannot be negative')
    .max(10000, 'Registration fee seems too high. Please verify.'),
  
  member_price: z.number()
    .min(0, 'Member price cannot be negative')
    .max(10000, 'Member price seems too high. Please verify.')
    .default(0),
  
  non_member_price: z.number()
    .min(0, 'Non-member price cannot be negative')
    .max(10000, 'Non-member price seems too high. Please verify.')
    .default(0),
  
  early_bird_fee: z.number().nullable()
    .refine((val) => val === null || val >= 0, 'Early bird fee cannot be negative'),
  
  early_bird_deadline: optionalString,
  early_bird_name: optionalString,
  
  // Details
  rules: z.string().max(10000, 'Rules text is too long. Consider using a link to external rules.').optional(),
  
  prizes: z.array(z.string()),
  
  schedule: z.array(z.object({
    time: z.string(),
    activity: z.string()
  })),
  
  sponsors: z.array(z.string()),
  
  image_url: z.string()
    .refine((val) => !val || val.startsWith('http') || val.startsWith('data:'), 
      'Image URL must be a valid URL or data URI')
    .optional(),
  
  // Additional Details
  first_place_trophy: z.boolean(),
  second_place_trophy: z.boolean(),
  third_place_trophy: z.boolean(),
  fourth_place_trophy: z.boolean(),
  fifth_place_trophy: z.boolean(),
  has_raffle: z.boolean(),
  shop_sponsors: z.array(z.string()),
  member_giveaways: z.array(z.string()),
  non_member_giveaways: z.array(z.string()),
  
  // SEO & Marketing
  seo_title: z.string().max(100, 'SEO title must be less than 100 characters').optional(),
  seo_description: z.string().max(200, 'SEO description must be less than 200 characters').optional(),
  seo_keywords: z.array(z.string()),
  
  // Visibility
  is_public: z.boolean(),
  is_featured: z.boolean(),
  is_active: z.boolean(),
  status: z.enum(['draft', 'pending_approval', 'approved', 'published', 'cancelled', 'completed']),
  approval_status: z.enum(['pending', 'approved', 'rejected'])
});

// Create event form schema with admin-specific validations
export const createEventFormSchema = (isAdmin: boolean = false) => {
  return baseEventSchema.superRefine((data, ctx) => {
    // Custom validations that depend on multiple fields
    
    // End date must be after start date
    if (data.start_date && data.end_date) {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date must be after start date',
          path: ['end_date']
        });
      }
    }
    
    // Registration deadline should be before start date
    if (data.registration_deadline && data.start_date) {
      const deadline = new Date(data.registration_deadline);
      const start = new Date(data.start_date);
      if (deadline > start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Registration deadline should be before the event start date',
          path: ['registration_deadline']
        });
      }
    }
    
    // Early bird deadline validation
    if (data.early_bird_fee !== null && data.early_bird_fee !== undefined) {
      if (!data.early_bird_deadline) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Early bird deadline is required when early bird fee is set',
          path: ['early_bird_deadline']
        });
      } else if (data.registration_deadline) {
        const earlyBird = new Date(data.early_bird_deadline);
        const regular = new Date(data.registration_deadline);
        if (earlyBird > regular) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Early bird deadline must be before regular registration deadline',
            path: ['early_bird_deadline']
          });
        }
      }
    }
    
    // Contact validation - only required for non-admin users
    if (!isAdmin) {
      // Require at least one form of general contact
      if (!data.contact_email && !data.contact_phone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one general contact method (email or phone) is required',
          path: ['contact_email']
        });
      }
      
      // Require event director info if not using organizer contact
      if (!data.use_organizer_contact) {
        if (!data.event_director_first_name || !data.event_director_last_name) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Event director name is required',
            path: ['event_director_first_name']
          });
        }
        
        if (!data.event_director_email && !data.event_director_phone) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Event director must have at least one contact method (email or phone)',
            path: ['event_director_email']
          });
        }
      }
    }
    // For admin users, all contact info is optional
  });
};

// Keep backward compatibility by exporting default schema
export const eventFormSchema = createEventFormSchema(false);

// Type inference from schema
export type ValidatedEventFormData = z.infer<typeof eventFormSchema>;

// Partial schema for draft saves
export const eventDraftSchema = baseEventSchema.partial();

// Helper function to validate form data
export function validateEventForm(data: unknown, isAdmin: boolean = false) {
  const schema = createEventFormSchema(isAdmin);
  return schema.safeParse(data);
}

// Helper function to validate draft
export function validateEventDraft(data: unknown) {
  return eventDraftSchema.safeParse(data);
}

// Get user-friendly error messages
export function getFieldError(errors: z.ZodError<any>, fieldPath: string): string | undefined {
  const fieldError = errors.issues.find(err => 
    err.path.join('.') === fieldPath
  );
  return fieldError?.message;
}

// Format all errors for display
export function formatValidationErrors(errors: z.ZodError<any>): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  errors.issues.forEach(error => {
    const path = error.path.join('.');
    if (!formatted[path]) {
      formatted[path] = error.message;
    }
  });
  
  return formatted;
}