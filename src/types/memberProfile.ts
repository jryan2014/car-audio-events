export interface MemberProfile {
  id: string;
  user_id: string;
  
  // Display settings
  visibility: 'private' | 'members_only' | 'public';
  display_name?: string;
  show_first_name: boolean;
  show_last_name: boolean;
  bio?: string;
  
  // Car audio system information
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  audio_system_description?: string;
  amplifier_details?: string;
  speaker_details?: string;
  subwoofer_details?: string;
  head_unit_details?: string;
  
  // Social links
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  twitter_url?: string;
  website_url?: string;
  
  // Team information
  team_name?: string;
  team_role?: string;
  
  // Privacy settings
  show_vehicle_info: boolean;
  show_audio_system: boolean;
  show_social_links: boolean;
  show_team_info: boolean;
  show_bio: boolean;
  show_competition_results?: boolean;
  show_events_attended?: boolean;
  show_favorited_events?: boolean;
  
  // Admin controls
  is_banned: boolean;
  ban_reason?: string;
  banned_at?: string;
  banned_by?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface MemberGalleryImage {
  id: string;
  profile_id: string;
  user_id: string;
  
  // Image details
  image_url: string;
  thumbnail_url?: string;
  caption?: string;
  
  // Display settings
  visibility: 'public' | 'member_only' | 'private';
  display_order: number;
  is_featured: boolean;
  
  // Admin controls
  is_banned: boolean;
  ban_reason?: string;
  banned_at?: string;
  banned_by?: string;
  
  // Metadata
  file_size?: number;
  width?: number;
  height?: number;
  mime_type?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface MemberProfileWithUser extends MemberProfile {
  user?: {
    id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email: string;
    location?: string;
    membership_type?: string;
    status?: string;
    profile_image?: string;
  };
  gallery_images?: MemberGalleryImage[];
}