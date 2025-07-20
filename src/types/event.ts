// Event-related types and interfaces

export interface EventFormData {
  // Basic Information
  title: string;
  description: string;
  category_id: string;
  sanction_body_id: string;
  season_year: number;
  organizer_id: string;
  
  // Schedule
  start_date: string;
  end_date: string;
  registration_deadline: string;
  display_start_date: string;
  display_end_date: string;
  
  // Location
  venue_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  
  // Contact Information
  contact_email: string;
  contact_phone: string;
  website: string;
  
  // Event Director
  event_director_first_name: string;
  event_director_last_name: string;
  event_director_email: string;
  event_director_phone: string;
  use_organizer_contact: boolean;
  
  // Pricing
  max_participants: number | null;
  registration_fee: number;
  early_bird_fee: number | null;
  early_bird_deadline: string;
  early_bird_name: string;
  member_price: number;
  non_member_price: number;
  
  // Details
  rules: string;
  prizes: string[];
  schedule: EventScheduleItem[];
  sponsors: string[];
  image_url?: string;
  image_position?: number;
  
  // Additional Details
  first_place_trophy: boolean;
  second_place_trophy: boolean;
  third_place_trophy: boolean;
  fourth_place_trophy: boolean;
  fifth_place_trophy: boolean;
  has_raffle: boolean;
  shop_sponsors: string[];
  member_giveaways: string[];
  non_member_giveaways: string[];
  
  // SEO & Marketing
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  
  // Visibility
  is_public: boolean;
  is_featured: boolean;
  is_active: boolean;
  status: EventStatus;
  approval_status: ApprovalStatus;
  
  // Competition Classes
  competition_classes?: string[];
  
  // Online Registration
  allows_online_registration?: boolean;
}

export interface EventScheduleItem {
  time: string;
  activity: string;
}

export type EventStatus = 'draft' | 'pending_approval' | 'approved' | 'published' | 'cancelled' | 'completed';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Organization {
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

export interface EventCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_active?: boolean;
}

export interface DatabaseUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  membership_type?: string;
}

// Country data
export const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'GR', name: 'Greece' },
  { code: 'TR', name: 'Turkey' },
  { code: 'RU', name: 'Russia' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'KR', name: 'South Korea' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Philippines' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'EG', name: 'Egypt' },
  { code: 'BR', name: 'Brazil' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'PA', name: 'Panama' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'VI', name: 'U.S. Virgin Islands' },
  { code: 'VG', name: 'British Virgin Islands' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'KY', name: 'Cayman Islands' },
  { code: 'BM', name: 'Bermuda' },
  { code: 'CU', name: 'Cuba' },
  { code: 'HT', name: 'Haiti' },
  { code: 'GU', name: 'Guam' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'NF', name: 'Norfolk Island' },
] as const;

// US States data
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
] as const;

// Major cities by state for US
export const US_CITIES: { [state: string]: string[] } = {
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Fresno', 'Oakland'],
  'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso'],
  'Florida': ['Miami', 'Tampa', 'Orlando', 'Jacksonville', 'St. Petersburg', 'Tallahassee'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Syracuse', 'Albany', 'Yonkers'],
  // Add more states and cities as needed
};