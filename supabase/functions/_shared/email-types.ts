// supabase/functions/_shared/email-types.ts

// Email template types for car audio events
export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

// Email types for the platform
export type EmailType = 
  | 'welcome'
  | 'event_registration_confirmation'
  | 'event_reminder'
  | 'event_cancellation'
  | 'password_reset'
  | 'organization_claim_verification'
  | 'event_approval_notification'
  | 'competition_results'
  | 'newsletter'
  | 'system_notification'
  | 'membership_upsell'; 