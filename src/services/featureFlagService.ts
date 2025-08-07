import { supabase } from '../lib/supabase';

export type AccessMode = 'disabled' | 'all_pro' | 'specific_users';

export interface FeatureFlag {
  id: string;
  feature_name: string;
  is_enabled: boolean;
  access_mode: AccessMode;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface UserFeatureAccess {
  user_id: string;
  email: string;
  name: string;
  membership_type: string;
  has_access: boolean;
  access_granted_at: string | null;
  access_expires_at: string | null;
}

class FeatureFlagService {
  /**
   * Check if current user has access to subwoofer designer
   */
  async checkSubwooferAccess(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .rpc('check_subwoofer_designer_access', {
          p_user_id: user.id
        });

      if (error) {
        console.error('Error checking subwoofer access:', error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error('Error checking subwoofer access:', error);
      return false;
    }
  }

  /**
   * Get feature flag settings (admin only)
   */
  async getFeatureFlag(): Promise<FeatureFlag | null> {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('feature_name', 'subwoofer_designer')
        .single();

      if (error) {
        console.error('Error fetching feature flag:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching feature flag:', error);
      return null;
    }
  }

  /**
   * Toggle feature flag settings (admin only)
   */
  async toggleFeature(accessMode: AccessMode, isEnabled: boolean = true): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('toggle_subwoofer_designer_feature', {
          p_access_mode: accessMode,
          p_is_enabled: isEnabled
        });

      if (error) {
        console.error('Error toggling feature:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error toggling feature:', error);
      return false;
    }
  }

  /**
   * Grant or revoke user access (admin only)
   */
  async manageUserAccess(
    userId: string, 
    grantAccess: boolean, 
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .rpc('manage_user_subwoofer_access', {
          p_user_id: userId,
          p_grant_access: grantAccess,
          p_expires_at: expiresAt?.toISOString() || null
        });

      if (error) {
        console.error('Error managing user access:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error managing user access:', error);
      return false;
    }
  }

  /**
   * Get list of users with potential access (admin only)
   */
  async getSubwooferUsers(): Promise<UserFeatureAccess[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_subwoofer_designer_users');

      if (error) {
        console.error('Error fetching users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }

  /**
   * Check if feature should be shown in navigation
   */
  async shouldShowInNavigation(): Promise<boolean> {
    // First check if user has access
    const hasAccess = await this.checkSubwooferAccess();
    if (!hasAccess) return false;

    // Then check if feature is enabled
    const flag = await this.getFeatureFlag();
    return flag?.is_enabled || false;
  }
}

export const featureFlagService = new FeatureFlagService();