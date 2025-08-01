import { supabase } from '../../../lib/supabase';

export interface SupportGeneralSettings {
  system_enabled: boolean;
  allow_anonymous_tickets: boolean;
  require_captcha: boolean;
  auto_assign_enabled: boolean;
  default_priority: 'low' | 'normal' | 'high' | 'urgent';
  email_notifications_enabled: boolean;
  support_email: string;
  max_attachments: number;
  max_attachment_size: number;
  allowed_file_types: string[];
  ticket_number_prefix: string;
  auto_close_resolved_days: number;
  spam_detection_enabled: boolean;
}

const SUPPORT_SETTINGS_CATEGORY = 'support_desk';

export const systemConfigService = {
  async getSupportSettings(): Promise<SupportGeneralSettings> {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .eq('category', SUPPORT_SETTINGS_CATEGORY);

    if (error) {
      console.error('Error fetching support settings:', error);
      throw error;
    }

    // Convert key-value pairs to settings object
    const settings: Partial<SupportGeneralSettings> = {};
    
    if (data) {
      data.forEach(({ key, value }) => {
        // Remove the category prefix from the key
        const settingKey = key.replace(`${SUPPORT_SETTINGS_CATEGORY}.`, '');
        
        switch (settingKey) {
          case 'system_enabled':
          case 'allow_anonymous_tickets':
          case 'require_captcha':
          case 'auto_assign_enabled':
          case 'email_notifications_enabled':
          case 'spam_detection_enabled':
            (settings as any)[settingKey] = value === 'true';
            break;
          case 'max_attachments':
          case 'max_attachment_size':
          case 'auto_close_resolved_days':
            (settings as any)[settingKey] = parseInt(value);
            break;
          case 'allowed_file_types':
            (settings as any)[settingKey] = JSON.parse(value);
            break;
          case 'default_priority':
          case 'support_email':
          case 'ticket_number_prefix':
            (settings as any)[settingKey] = value;
            break;
        }
      });
    }

    // Return with defaults for any missing values
    return {
      system_enabled: settings.system_enabled ?? true,
      allow_anonymous_tickets: settings.allow_anonymous_tickets ?? true,
      require_captcha: settings.require_captcha ?? true,
      auto_assign_enabled: settings.auto_assign_enabled ?? false,
      default_priority: settings.default_priority ?? 'normal',
      email_notifications_enabled: settings.email_notifications_enabled ?? true,
      support_email: settings.support_email ?? '',
      max_attachments: settings.max_attachments ?? 5,
      max_attachment_size: settings.max_attachment_size ?? 10,
      allowed_file_types: settings.allowed_file_types ?? ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'],
      ticket_number_prefix: settings.ticket_number_prefix ?? 'SUP-',
      auto_close_resolved_days: settings.auto_close_resolved_days ?? 7,
      spam_detection_enabled: settings.spam_detection_enabled ?? true
    };
  },

  async updateSupportSettings(settings: SupportGeneralSettings): Promise<void> {
    const updates = [
      { key: 'system_enabled', value: settings.system_enabled.toString() },
      { key: 'allow_anonymous_tickets', value: settings.allow_anonymous_tickets.toString() },
      { key: 'require_captcha', value: settings.require_captcha.toString() },
      { key: 'auto_assign_enabled', value: settings.auto_assign_enabled.toString() },
      { key: 'default_priority', value: settings.default_priority },
      { key: 'email_notifications_enabled', value: settings.email_notifications_enabled.toString() },
      { key: 'support_email', value: settings.support_email },
      { key: 'max_attachments', value: settings.max_attachments.toString() },
      { key: 'max_attachment_size', value: settings.max_attachment_size.toString() },
      { key: 'allowed_file_types', value: JSON.stringify(settings.allowed_file_types) },
      { key: 'ticket_number_prefix', value: settings.ticket_number_prefix },
      { key: 'auto_close_resolved_days', value: settings.auto_close_resolved_days.toString() },
      { key: 'spam_detection_enabled', value: settings.spam_detection_enabled.toString() }
    ];

    // Use upsert to update existing or insert new settings
    for (const update of updates) {
      const settingKey = `${SUPPORT_SETTINGS_CATEGORY}.${update.key}`;
      
      const { error } = await supabase
        .from('site_settings')
        .upsert(
          {
            key: settingKey,
            value: update.value,
            category: SUPPORT_SETTINGS_CATEGORY,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'key'
          }
        );

      if (error) {
        console.error(`Error updating setting ${update.key}:`, error);
        throw error;
      }
    }
  }
};