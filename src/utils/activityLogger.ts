import { supabase } from '../lib/supabase';

export interface ActivityLogData {
  activityType: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Log an activity to the activity tracking system
 * This will be automatically associated with the current authenticated user
 */
const logActivity = async (data: ActivityLogData): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('log_activity', {
      p_activity_type: data.activityType,
      p_description: data.description,
      p_metadata: data.metadata || {}
    });

    if (error) {
      console.error('Failed to log activity:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error logging activity:', error);
    return false;
  }
};

/**
 * Predefined activity logging functions for common actions
 */
export const ActivityLogger = {
  // Admin actions
  adminDashboardAccess: () => logActivity({
    activityType: 'admin_action',
    description: 'Admin dashboard accessed',
    metadata: { module: 'dashboard' }
  }),

  navigationManagerAccess: () => logActivity({
    activityType: 'admin_action', 
    description: 'Navigation Manager accessed',
    metadata: { module: 'navigation' }
  }),

  userManagementAccess: () => logActivity({
    activityType: 'admin_action',
    description: 'User Management accessed',
    metadata: { module: 'users' }
  }),

  cmsPageAccess: () => logActivity({
    activityType: 'admin_action',
    description: 'CMS Pages accessed',
    metadata: { module: 'cms' }
  }),

  eventManagementAccess: () => logActivity({
    activityType: 'admin_action',
    description: 'Event Management accessed', 
    metadata: { module: 'events' }
  }),

  systemConfigAccess: () => logActivity({
    activityType: 'admin_action',
    description: 'System Configuration accessed',
    metadata: { module: 'system_config' }
  }),

  organizationManagementAccess: () => logActivity({
    activityType: 'admin_action',
    description: 'Organization Management accessed',
    metadata: { module: 'organizations' }
  }),

  backupManagementAccess: () => logActivity({
    activityType: 'admin_action',
    description: 'Backup Management accessed',
    metadata: { module: 'backup' }
  }),

  // User actions
  userLogin: () => logActivity({
    activityType: 'user_action',
    description: 'User logged in',
    metadata: { action: 'login' }
  }),

  userLogout: () => logActivity({
    activityType: 'user_action', 
    description: 'User logged out',
    metadata: { action: 'logout' }
  }),

  profileUpdate: () => logActivity({
    activityType: 'user_action',
    description: 'Profile updated',
    metadata: { action: 'profile_update' }
  }),

  // Event actions
  eventRegistration: (eventTitle: string) => logActivity({
    activityType: 'event_action',
    description: `Registered for event: ${eventTitle}`,
    metadata: { action: 'registration', event_title: eventTitle }
  }),

  // CMS actions
  cmsPageCreated: (pageTitle: string) => logActivity({
    activityType: 'cms_page_created',
    description: `New CMS page created: ${pageTitle}`,
    metadata: { page_title: pageTitle }
  }),

  cmsPageUpdated: (pageTitle: string) => logActivity({
    activityType: 'cms_page_updated', 
    description: `CMS page updated: ${pageTitle}`,
    metadata: { page_title: pageTitle }
  }),

  cmsPagePublished: (pageTitle: string) => logActivity({
    activityType: 'cms_page_updated',
    description: `CMS page published: ${pageTitle}`,
    metadata: { page_title: pageTitle, action: 'published' }
  }),

  // Navigation actions
  navigationMenuUpdated: () => logActivity({
    activityType: 'admin_action',
    description: 'Navigation menu structure updated',
    metadata: { module: 'navigation', action: 'menu_update' }
  }),

  navigationItemAdded: (itemName: string) => logActivity({
    activityType: 'admin_action',
    description: `Navigation item added: ${itemName}`,
    metadata: { module: 'navigation', action: 'item_added', item_name: itemName }
  }),

  navigationItemRemoved: (itemName: string) => logActivity({
    activityType: 'admin_action',
    description: `Navigation item removed: ${itemName}`,
    metadata: { module: 'navigation', action: 'item_removed', item_name: itemName }
  }),

  // System actions
  systemSettingsUpdated: () => logActivity({
    activityType: 'admin_action',
    description: 'System settings updated',
    metadata: { module: 'system', action: 'settings_update' }
  }),

  backupCreated: () => logActivity({
    activityType: 'admin_action',
    description: 'Database backup created',
    metadata: { module: 'backup', action: 'backup_created' }
  }),

  backupRestored: () => logActivity({
    activityType: 'admin_action',
    description: 'Database backup restored',
    metadata: { module: 'backup', action: 'backup_restored' }
  }),

  directoryManagementAccess: () => logActivity({
    activityType: 'admin_action',
    description: 'Directory Management accessed',
    metadata: { module: 'directory' }
  }),

  // Enhanced User Management Actions
  userApproved: (userEmail: string, userName?: string) => logActivity({
    activityType: 'user_management',
    description: `User approved: ${userEmail}${userName ? ` (${userName})` : ''}`,
    metadata: { action: 'user_approved', user_email: userEmail, user_name: userName }
  }),

  userRejected: (userEmail: string, userName?: string, reason?: string) => logActivity({
    activityType: 'user_management',
    description: `User rejected: ${userEmail}${userName ? ` (${userName})` : ''}${reason ? ` - Reason: ${reason}` : ''}`,
    metadata: { action: 'user_rejected', user_email: userEmail, user_name: userName, reason }
  }),

  userVerified: (userEmail: string, userName?: string) => logActivity({
    activityType: 'user_management',
    description: `User verified: ${userEmail}${userName ? ` (${userName})` : ''}`,
    metadata: { action: 'user_verified', user_email: userEmail, user_name: userName }
  }),

  userSuspended: (userEmail: string, userName?: string, reason?: string) => logActivity({
    activityType: 'user_management',
    description: `User suspended: ${userEmail}${userName ? ` (${userName})` : ''}${reason ? ` - Reason: ${reason}` : ''}`,
    metadata: { action: 'user_suspended', user_email: userEmail, user_name: userName, reason }
  }),

  userActivated: (userEmail: string, userName?: string) => logActivity({
    activityType: 'user_management',
    description: `User activated: ${userEmail}${userName ? ` (${userName})` : ''}`,
    metadata: { action: 'user_activated', user_email: userEmail, user_name: userName }
  }),

  userBanned: (userEmail: string, userName?: string, reason?: string) => logActivity({
    activityType: 'user_management',
    description: `User banned: ${userEmail}${userName ? ` (${userName})` : ''}${reason ? ` - Reason: ${reason}` : ''}`,
    metadata: { action: 'user_banned', user_email: userEmail, user_name: userName, reason }
  }),

  userUnbanned: (userEmail: string, userName?: string) => logActivity({
    activityType: 'user_management',
    description: `User unbanned: ${userEmail}${userName ? ` (${userName})` : ''}`,
    metadata: { action: 'user_unbanned', user_email: userEmail, user_name: userName }
  }),

  userEdited: (userEmail: string, userName?: string, changedFields?: string[]) => logActivity({
    activityType: 'user_management',
    description: `User profile edited: ${userEmail}${userName ? ` (${userName})` : ''}${changedFields ? ` - Changed: ${changedFields.join(', ')}` : ''}`,
    metadata: { action: 'user_edited', user_email: userEmail, user_name: userName, changed_fields: changedFields }
  }),

  userDeleted: (userEmail: string, userName?: string) => logActivity({
    activityType: 'user_management',
    description: `User deleted: ${userEmail}${userName ? ` (${userName})` : ''}`,
    metadata: { action: 'user_deleted', user_email: userEmail, user_name: userName }
  }),

  userMembershipChanged: (userEmail: string, userName?: string, oldMembership?: string, newMembership?: string) => logActivity({
    activityType: 'user_management',
    description: `User membership changed: ${userEmail}${userName ? ` (${userName})` : ''} from ${oldMembership || 'unknown'} to ${newMembership || 'unknown'}`,
    metadata: { action: 'membership_changed', user_email: userEmail, user_name: userName, old_membership: oldMembership, new_membership: newMembership }
  }),

  // Enhanced Event Management Actions
  eventApproved: (eventTitle: string, eventId?: string) => logActivity({
    activityType: 'event_management',
    description: `Event approved: ${eventTitle}`,
    metadata: { action: 'event_approved', event_title: eventTitle, event_id: eventId }
  }),

  eventRejected: (eventTitle: string, eventId?: string, reason?: string) => logActivity({
    activityType: 'event_management',
    description: `Event rejected: ${eventTitle}${reason ? ` - Reason: ${reason}` : ''}`,
    metadata: { action: 'event_rejected', event_title: eventTitle, event_id: eventId, reason }
  }),

  eventDeleted: (eventTitle: string, eventId?: string) => logActivity({
    activityType: 'event_management',
    description: `Event deleted: ${eventTitle}`,
    metadata: { action: 'event_deleted', event_title: eventTitle, event_id: eventId }
  }),

  // Enhanced System Actions
  settingsChanged: (settingCategory: string, settingKey?: string, oldValue?: string, newValue?: string) => logActivity({
    activityType: 'system_config',
    description: `System setting updated: ${settingCategory}${settingKey ? ` - ${settingKey}` : ''}`,
    metadata: { action: 'setting_changed', category: settingCategory, setting_key: settingKey, old_value: oldValue, new_value: newValue }
  }),

  adminLoginAttempt: (successful: boolean, ipAddress?: string) => logActivity({
    activityType: 'admin_security',
    description: `Admin login ${successful ? 'successful' : 'failed'}${ipAddress ? ` from ${ipAddress}` : ''}`,
    metadata: { action: 'admin_login', successful, ip_address: ipAddress }
  }),

  securityPolicyChanged: (policyName: string, details?: string) => logActivity({
    activityType: 'admin_security',
    description: `Security policy changed: ${policyName}${details ? ` - ${details}` : ''}`,
    metadata: { action: 'security_policy_changed', policy_name: policyName, details }
  }),

  // User Dashboard Access by Type
  userDashboardAccess: (userType: string) => logActivity({
    activityType: 'user_action',
    description: `${userType.charAt(0).toUpperCase() + userType.slice(1)} dashboard accessed`,
    metadata: { action: 'dashboard_access', user_type: userType }
  }),

  // Advertising Dashboard Access
  advertisingDashboardAccess: (userType: string) => logActivity({
    activityType: 'advertising_action',
    description: `${userType.charAt(0).toUpperCase() + userType.slice(1)} advertising dashboard accessed`,
    metadata: { action: 'advertising_dashboard_access', user_type: userType }
  }),

  // Advertising Actions
  adCampaignCreated: (campaignTitle: string, userType: string) => logActivity({
    activityType: 'advertising_action',
    description: `Ad campaign created: ${campaignTitle} by ${userType}`,
    metadata: { action: 'campaign_created', campaign_title: campaignTitle, user_type: userType }
  }),

  adCampaignUpdated: (campaignTitle: string, userType: string) => logActivity({
    activityType: 'advertising_action',
    description: `Ad campaign updated: ${campaignTitle} by ${userType}`,
    metadata: { action: 'campaign_updated', campaign_title: campaignTitle, user_type: userType }
  }),

  adCampaignPaused: (campaignTitle: string, userType: string) => logActivity({
    activityType: 'advertising_action',
    description: `Ad campaign paused: ${campaignTitle} by ${userType}`,
    metadata: { action: 'campaign_paused', campaign_title: campaignTitle, user_type: userType }
  }),

  adCampaignDeleted: (campaignTitle: string, userType: string) => logActivity({
    activityType: 'advertising_action',
    description: `Ad campaign deleted: ${campaignTitle} by ${userType}`,
    metadata: { action: 'campaign_deleted', campaign_title: campaignTitle, user_type: userType }
  })
};

export { logActivity };
export default ActivityLogger; 