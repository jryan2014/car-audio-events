// Advertisement Image Management & A/B Testing Types

export interface AdvertisementImage {
  id: string;
  advertisement_id: string;
  image_url: string;
  image_title?: string;
  
  // Image status and variant information
  status: 'active' | 'inactive' | 'archived';
  variant_type: 'single' | 'a' | 'b';
  
  // AI Generation metadata
  ai_prompt?: string;
  ai_provider?: string;
  ai_model?: string;
  ai_style?: string;
  ai_quality?: string;
  generation_cost?: number;
  
  // Image specifications
  width?: number;
  height?: number;
  file_size?: number;
  file_format?: string;
  
  // Performance tracking
  impressions: number;
  clicks: number;
  click_through_rate: number;
  cost: number;
  
  // A/B Testing metrics
  ab_test_start_date?: string;
  ab_test_end_date?: string;
  ab_test_impressions: number;
  ab_test_clicks: number;
  ab_test_conversions: number;
  
  // Metadata and timestamps
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AdvertisementImageAnalytics {
  id: string;
  advertisement_id: string;
  advertisement_image_id: string;
  
  // Date and time tracking
  date: string;
  hour: number;
  
  // Performance metrics
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  
  // Context information
  placement_type?: string;
  device_type?: string;
  user_type?: string;
  geographic_location?: string;
  
  // A/B testing specific
  variant_shown?: string;
  ab_test_active: boolean;
  
  created_at: string;
}

export interface AdvertisementABTest {
  id: string;
  advertisement_id: string;
  
  // Test configuration
  test_name: string;
  test_description?: string;
  
  // Images being tested
  image_a_id: string;
  image_b_id: string;
  
  // Test parameters
  traffic_split: number;
  confidence_level: number;
  minimum_sample_size: number;
  
  // Test status and dates
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  
  // Results
  winning_variant?: 'a' | 'b';
  statistical_significance?: number;
  improvement_percentage?: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface AdvertisementImageSummary {
  id: string;
  advertisement_id: string;
  image_url: string;
  image_title?: string;
  status: 'active' | 'inactive' | 'archived';
  variant_type: 'single' | 'a' | 'b';
  impressions: number;
  clicks: number;
  click_through_rate: number;
  cost: number;
  created_at: string;
  advertisement_title: string;
  advertiser_name: string;
  ctr_percentage: number;
}

export interface ABTestPerformance {
  test_id: string;
  test_name: string;
  advertisement_id: string;
  test_status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  traffic_split: number;
  
  // Image A metrics
  image_a_url: string;
  image_a_impressions: number;
  image_a_clicks: number;
  image_a_ctr: number;
  
  // Image B metrics  
  image_b_url: string;
  image_b_impressions: number;
  image_b_clicks: number;
  image_b_ctr: number;
  
  // Performance comparison
  leading_variant: 'A' | 'B' | 'Tie';
  improvement_percentage: number;
}

// Enhanced Advertisement interface with image management
export interface Advertisement {
  id: string;
  title: string;
  description: string;
  image_url: string; // Kept for backward compatibility
  click_url: string;
  advertiser_name: string;
  advertiser_email: string;
  advertiser_user_id?: string;
  placement_type: 'header' | 'sidebar' | 'event_page' | 'mobile_banner' | 'footer' | 'directory_listing' | 'search_results';
  size: 'small' | 'medium' | 'large' | 'banner' | 'square' | 'leaderboard' | 'skyscraper';
  target_pages: string[];
  target_keywords: string[];
  target_categories: string[];
  target_user_types: string[];
  budget: number;
  cost_per_click: number;
  cost_per_impression: number;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected';
  clicks: number;
  impressions: number;
  spent: number;
  conversion_rate: number;
  roi: number;
  created_at: string;
  updated_at: string;
  priority: number;
  frequency_cap: number;
  geographic_targeting: string[];
  device_targeting: string[];
  time_targeting: any;
  a_b_test_variant?: string;
  notes: string;
  
  // New image management fields
  images?: AdvertisementImage[];
  active_image?: AdvertisementImage;
  ab_tests?: AdvertisementABTest[];
}

// Request types for API calls
export interface CreateAdvertisementImageRequest {
  advertisement_id: string;
  image_url: string;
  image_title?: string;
  ai_prompt?: string;
  ai_provider?: string;
  ai_model?: string;
  ai_style?: string;
  ai_quality?: string;
  generation_cost?: number;
  width?: number;
  height?: number;
}

export interface SetupABTestRequest {
  advertisement_id: string;
  test_name: string;
  test_description?: string;
  image_a_id: string;
  image_b_id: string;
  traffic_split?: number;
  confidence_level?: number;
  minimum_sample_size?: number;
}

export interface TrackImageImpressionRequest {
  image_id: string;
  placement_type?: string;
  device_type?: string;
  user_type?: string;
  geographic_location?: string;
}

export interface TrackImageClickRequest {
  image_id: string;
  placement_type?: string;
  device_type?: string;
  user_type?: string;
  geographic_location?: string;
}

// Response types
export interface ImageManagementResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface AdvertisementWithImages extends Advertisement {
  images: AdvertisementImage[];
  active_image?: AdvertisementImage;
  ab_test?: AdvertisementABTest;
}

// Filter and search types
export interface ImageFilter {
  status?: 'active' | 'inactive' | 'archived' | 'all';
  variant_type?: 'single' | 'a' | 'b' | 'all';
  advertisement_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface ABTestFilter {
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled' | 'all';
  advertisement_id?: string;
  date_from?: string;
  date_to?: string;
}

// Statistics and analytics types
export interface ImageAnalyticsData {
  image_id: string;
  image_url: string;
  total_impressions: number;
  total_clicks: number;
  total_cost: number;
  avg_ctr: number;
  performance_by_date: Array<{
    date: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  performance_by_placement: Array<{
    placement_type: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
}

export interface ABTestAnalyticsData {
  test_id: string;
  test_name: string;
  status: string;
  duration_days: number;
  
  variant_a: {
    image_url: string;
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
  };
  
  variant_b: {
    image_url: string;
    impressions: number;
    clicks: number;
    ctr: number;
    conversions: number;
  };
  
  winner: 'A' | 'B' | 'Tie' | 'Insufficient Data';
  confidence_level: number;
  improvement_percentage: number;
  statistical_significance: number;
} 