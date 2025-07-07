// supabase/functions/_shared/email-types.ts

// Email template types for car audio events
export interface EmailTemplate {
  id?: string;
  name?: string;
  subject: string;
  body?: string; // HTML body
  htmlBody?: string; // Legacy field
  textBody?: string; // Legacy field
  from_name?: string;
  membership_level?: string;
  is_active?: boolean;
  email_type?: string;
}

// Email types for the platform
export type EmailType = 
  // User Account
  | 'welcome'
  | 'email_verification'
  | 'password_reset'
  | 'password_changed'
  | 'password_reset_instructions'
  | 'profile_updated'
  | 'account_creation'
  | 'account_reactivation'
  | 'account_approved'
  | 'inactive_account_reminder'
  | 'pre_registration_verification'
  | 'email_change_verification'
  | 'pro_competitor_welcome'
  
  // Events & Competitions
  | 'event_registration'
  | 'event_registration_confirmation'
  | 'event_reminder'
  | 'event_reminder_48h'
  | 'event_cancellation'
  | 'event_update'
  | 'event_approved'
  | 'event_approved_notification'
  | 'event_created'
  | 'upcoming_event_alert'
  | 'competition_results'
  | 'competition_analysis'
  | 'championship_invitation'
  
  // Billing & Payments
  | 'payment_success'
  | 'payment_failed'
  | 'payment_receipt'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'subscription_expired'
  | 'subscription_renewal'
  | 'subscription_expiry_reminder'
  | 'invoice_generated'
  | 'invoice_created'
  | 'invoice_due'
  | 'invoice_overdue'
  | 'invoice_paid'
  | 'invoice_ready'
  | 'refund_processed'
  
  // Membership
  | 'membership_upsell'
  | 'membership_upgrade'
  | 'membership_downgrade'
  | 'membership_approved'
  | 'membership_upgrade_approved'
  | 'membership_benefits_overview'
  | 'pro_membership_welcome'
  | 'free_membership_welcome'
  | 'admin_membership_welcome'
  
  // Organization
  | 'organization_claim_verification'
  | 'organization_account'
  | 'organization_verification'
  | 'retailer_account'
  | 'retailer_verification'
  | 'manufacturer_account'
  | 'manufacturer_verification'
  | 'advertising_account'
  | 'judge_application_approved'
  
  // Marketing & Newsletter
  | 'newsletter'
  | 'newsletter_signup'
  | 'newsletter_unsubscribe'
  | 'weekly_digest'
  | 'promotion'
  | 'seasonal_sale'
  | 'product_launch'
  | 'sponsorship_opportunity'
  | 'exclusive_event_marketing'
  | 'feature_announcement'
  
  // Support & System
  | 'system_notification'
  | 'system_update'
  | 'security_alert'
  | 'inactivity_warning'
  | 'support_ticket_created'
  | 'support_ticket_resolved'
  | 'support_ticket_closed'
  | 'support_received'
  | 'support_reply'
  
  // Approval & Verification
  | 'ad_approved'
  | 'phone_verification'
  | 'certificate_delivery'
  | 'account_security_update'
  | 'password_security_update'
  | 'password_expiry_reminder'
  | 'password_reset_complete'
  | 'profile_completion_reminder'
  
  // Custom
  | 'custom'
  | 'welcome_general'; 