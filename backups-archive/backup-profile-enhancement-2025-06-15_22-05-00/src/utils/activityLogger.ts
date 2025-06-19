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
      p_metadata: data.metadata ? JSON.stringify(data.metadata) : null
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
  })
};

export { logActivity };
export default ActivityLogger; 