// Support Desk Type Definitions

export type UserRole = 
  | 'public' 
  | 'free_competitor' 
  | 'competitor_pro' 
  | 'retailer' 
  | 'manufacturer' 
  | 'organization'
  | 'org_admin'
  | 'org_support'
  | 'admin'
  | 'support_agent';

export type TicketStatus = 
  | 'open' 
  | 'in_progress' 
  | 'waiting_on_user' 
  | 'resolved' 
  | 'closed';

export type TicketPriority = 
  | 'low' 
  | 'normal' 
  | 'high' 
  | 'urgent';

export type RoutingType = 
  | 'internal' 
  | 'organization' 
  | 'hybrid';

export type RequestCategory = 
  | 'billing' 
  | 'technical' 
  | 'event' 
  | 'general' 
  | 'account';

export type MessageType = 
  | 'reply' 
  | 'status_change' 
  | 'assignment_change' 
  | 'system';

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'date' 
  | 'dropdown_static' 
  | 'dropdown_dynamic_event' 
  | 'file' 
  | 'checkbox';

// Database table types
export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id?: string;
  organization_id?: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  request_type_id?: string;
  event_id?: string;
  routing_type: RoutingType;
  assigned_to_org_id?: number;
  assigned_to_user_id?: string;
  custom_fields: Record<string, any>;
  source: 'web' | 'email' | 'api';
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  spam_score?: number;
  is_spam: boolean;
  captcha_verified: boolean;
}

export interface SupportRequestType {
  id: string;
  name: string;
  description?: string;
  category?: RequestCategory;
  default_routing: RoutingType;
  default_priority: TicketPriority;
  is_active: boolean;
  requires_event: boolean;
  allowed_roles: UserRole[];
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  user_id?: string;
  message: string;
  is_internal_note: boolean;
  attachments: Attachment[];
  message_type: MessageType;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    membership_type: string;
  };
}

export interface Attachment {
  url: string;
  filename: string;
  size: number;
  type: string;
}

export interface SupportOrganizationSettings {
  id: string;
  organization_id: number;
  is_provisioned: boolean;
  provisioned_at?: string;
  provisioned_by?: string;
  support_team_user_ids: string[];
  auto_assign_enabled: boolean;
  email_notifications_enabled: boolean;
  support_email?: string;
  support_phone?: string;
  custom_message?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationSupportSettings {
  id: string;
  organization_id: number;
  enable_support: boolean;
  auto_assign_tickets: boolean;
  notification_email?: string;
  sla_response_hours?: number;
  sla_resolution_hours?: number;
  business_hours_only: boolean;
  working_days: string[];
  business_hours_start: string;
  business_hours_end: string;
  ticket_prefix?: string;
  allow_anonymous_tickets: boolean;
  require_event_selection: boolean;
  auto_close_resolved_days?: number;
  satisfaction_survey_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportFieldDefinition {
  id: string;
  field_key: string;
  label: string;
  description?: string;
  field_type: FieldType;
  is_required: boolean;
  default_value?: string;
  placeholder?: string;
  options: FieldOption[];
  validation_rules: ValidationRules;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface ValidationRules {
  min_length?: number;
  max_length?: number;
  pattern?: string;
  min?: number;
  max?: number;
  required_if?: Record<string, any>;
  accept?: string;
  max_size?: number;
}

export interface SupportFieldVisibilityRule {
  id: string;
  field_definition_id: string;
  request_type_ids: string[];
  user_roles: UserRole[];
  show_on_frontend: boolean;
  show_on_backend: boolean;
  additional_conditions: Record<string, any>;
  created_at: string;
}

export interface SupportTicketAssignment {
  id: string;
  ticket_id: string;
  assigned_from_user_id?: string;
  assigned_to_user_id?: string;
  assigned_to_org_id?: number;
  assignment_reason?: string;
  assigned_at: string;
}

export interface SupportEmailVerificationToken {
  id: string;
  email: string;
  token: string;
  ip_address?: string;
  attempts: number;
  expires_at: string;
  used_at?: string;
  created_at: string;
}

export interface SupportRateLimit {
  id: string;
  identifier: string;
  identifier_type: 'ip' | 'email' | 'user_id';
  action: 'ticket_create' | 'email_verify' | 'message_send';
  attempt_count: number;
  window_start: string;
  is_blocked: boolean;
  blocked_until?: string;
  created_at: string;
  updated_at: string;
}

export interface SupportAgent {
  id: string;
  user_id: string;
  is_active: boolean;
  specialties: string[];
  max_tickets_per_day: number;
  can_view_all_tickets: boolean;
  can_assign_tickets: boolean;
  can_close_tickets: boolean;
  can_escalate_tickets: boolean;
  can_create_internal_notes: boolean;
  can_manage_organizations: boolean;
  email_notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface SupportAgentWithUser extends SupportAgent {
  email: string;
  name?: string;
  membership_type?: string;
  user_status?: string;
  user_created_at: string;
  created_by_email?: string;
  created_by_name?: string;
}

// Extended types with relationships
export interface SupportTicketWithRelations extends SupportTicket {
  request_type?: SupportRequestType;
  user?: {
    id: string;
    email: string;
    name?: string;
    membership_type: string;
  };
  organization?: {
    id: number;
    name: string;
    logo_url?: string;
  };
  event?: {
    id: string;
    name: string;
    title?: string;
    event_name?: string;
    start_date: string;
    organization_id?: number;
  };
  assigned_to_user?: {
    id: string;
    email: string;
    name?: string;
  };
  assigned_to_org?: {
    id: number;
    name: string;
  };
  messages?: SupportTicketMessage[];
  last_message?: SupportTicketMessage;
  message_count?: number;
}

// Form data types
export interface CreateTicketFormData {
  title: string;
  description: string;
  request_type_id: string;
  event_id?: string;
  priority?: TicketPriority;
  custom_fields?: Record<string, any>;
  attachments?: File[];
  captcha_token?: string;
  email?: string; // For public users
  csrf_token?: string; // CSRF protection
}

export interface CreateMessageFormData {
  message: string;
  is_internal_note?: boolean;
  attachments?: File[];
}

export interface UpdateTicketFormData {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to_user_id?: string;
  assigned_to_org_id?: number;
  routing_type?: RoutingType;
  is_spam?: boolean;
}

// Filter types
export interface TicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  request_type_id?: string[];
  assigned_to_user_id?: string[];
  assigned_to_org_id?: number[];
  organization_id?: number[];
  user_id?: string[];
  event_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  is_spam?: boolean;
}

// Utility types
export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Permission check types
export interface SupportPermissions {
  can_view_all_tickets: boolean;
  can_manage_tickets: boolean;
  can_assign_tickets: boolean;
  can_create_internal_notes: boolean;
  can_manage_organizations: boolean;
  can_manage_custom_fields: boolean;
  can_view_organization_tickets: boolean;
  organization_ids: number[];
}