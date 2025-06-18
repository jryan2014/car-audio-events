import { supabase } from '../lib/supabase';

// ================================
// TYPES & INTERFACES
// ================================

export interface ActivityType {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_public: boolean;
  created_at: string;
}

export interface UserActivity {
  id: number;
  user_id: string;
  activity_type_id: number;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  entity_type?: string;
  entity_id?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityFeedItem {
  id: number;
  title: string;
  description?: string;
  activity_type: string;
  activity_icon: string;
  activity_color: string;
  metadata: Record<string, any>;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
  user_name: string;
  user_image?: string;
  like_count: number;
  comment_count: number;
}

export interface ActivityInteraction {
  id: number;
  activity_id: number;
  user_id: string;
  interaction_type: 'like' | 'comment' | 'share';
  content?: string;
  created_at: string;
}

export interface CreateActivityOptions {
  activityType: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  entityType?: string;
  entityId?: string;
  isPublic?: boolean;
}

// ================================
// ACTIVITY SERVICE CLASS
// ================================

class ActivityService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheExpiry = 2 * 60 * 1000; // 2 minutes

  /**
   * Create a new user activity
   */
  async createActivity(userId: string, options: CreateActivityOptions): Promise<number | null> {
    try {
      const { data, error } = await supabase.rpc('create_user_activity', {
        p_user_id: userId,
        p_activity_type: options.activityType,
        p_title: options.title,
        p_description: options.description || null,
        p_metadata: options.metadata || {},
        p_entity_type: options.entityType || null,
        p_entity_id: options.entityId || null,
        p_is_public: options.isPublic !== false
      });

      if (error) throw error;
      
      // Clear relevant caches
      this.clearUserCache(userId);
      this.clearCache('community_feed');
      
      return data;
    } catch (error) {
      console.error('Error creating activity:', error);
      return null;
    }
  }

  /**
   * Get user's personal activity feed
   */
  async getUserActivityFeed(
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ActivityFeedItem[]> {
    const cacheKey = `user_feed_${userId}_${limit}_${offset}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_activity_feed', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw error;

      const results = data || [];
      
      // Cache results
      this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
      
      return results;
    } catch (error) {
      console.error('Error loading user activity feed:', error);
      return [];
    }
  }

  /**
   * Get community activity feed
   */
  async getCommunityActivityFeed(
    limit: number = 50, 
    offset: number = 0
  ): Promise<ActivityFeedItem[]> {
    const cacheKey = `community_feed_${limit}_${offset}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase.rpc('get_community_activity_feed', {
        p_limit: limit,
        p_offset: offset
      });

      if (error) throw error;

      const results = data || [];
      
      // Cache results
      this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
      
      return results;
    } catch (error) {
      console.error('Error loading community activity feed:', error);
      return [];
    }
  }

  /**
   * Get available activity types
   */
  async getActivityTypes(): Promise<ActivityType[]> {
    const cacheKey = 'activity_types';
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry * 5) { // Longer cache for types
      return cached.data;
    }

    try {
      const { data, error } = await supabase
        .from('activity_types')
        .select('*')
        .order('name');

      if (error) throw error;

      const results = data || [];
      
      // Cache results (longer cache time for relatively static data)
      this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
      
      return results;
    } catch (error) {
      console.error('Error loading activity types:', error);
      return [];
    }
  }

  /**
   * Add interaction to an activity (like, comment, share)
   */
  async addInteraction(
    activityId: number,
    userId: string,
    type: 'like' | 'comment' | 'share',
    content?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('activity_interactions')
        .insert({
          activity_id: activityId,
          user_id: userId,
          interaction_type: type,
          content: content || null
        });

      if (error) throw error;

      // Clear activity feed caches
      this.clearUserCache(userId);
      this.clearCache('community_feed');
      
      return true;
    } catch (error) {
      console.error('Error adding interaction:', error);
      return false;
    }
  }

  /**
   * Remove interaction from an activity
   */
  async removeInteraction(
    activityId: number,
    userId: string,
    type: 'like' | 'comment' | 'share'
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('activity_interactions')
        .delete()
        .eq('activity_id', activityId)
        .eq('user_id', userId)
        .eq('interaction_type', type);

      if (error) throw error;

      // Clear activity feed caches
      this.clearUserCache(userId);
      this.clearCache('community_feed');
      
      return true;
    } catch (error) {
      console.error('Error removing interaction:', error);
      return false;
    }
  }

  /**
   * Get interactions for a specific activity
   */
  async getActivityInteractions(activityId: number): Promise<ActivityInteraction[]> {
    try {
      const { data, error } = await supabase
        .from('activity_interactions')
        .select(`
          *,
          users!activity_interactions_user_id_fkey(name, profile_image)
        `)
        .eq('activity_id', activityId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error loading activity interactions:', error);
      return [];
    }
  }

  /**
   * Helper methods for common activity tracking
   */

  // Track profile updates
  async trackProfileUpdate(userId: string, changes: Record<string, any>): Promise<void> {
    await this.createActivity(userId, {
      activityType: 'profile_update',
      title: 'Updated their profile',
      description: 'Made changes to their profile information',
      metadata: { changes },
      isPublic: true
    });
  }

  // Track event registration
  async trackEventRegistration(
    userId: string, 
    eventId: string, 
    eventTitle: string
  ): Promise<void> {
    await this.createActivity(userId, {
      activityType: 'event_registration',
      title: `Registered for ${eventTitle}`,
      description: `Successfully registered for the upcoming event`,
      entityType: 'event',
      entityId: eventId,
      metadata: { eventTitle },
      isPublic: true
    });
  }

  // Track event creation
  async trackEventCreation(
    userId: string, 
    eventId: string, 
    eventTitle: string
  ): Promise<void> {
    await this.createActivity(userId, {
      activityType: 'event_creation',
      title: `Created "${eventTitle}"`,
      description: `Created a new event for the community`,
      entityType: 'event',
      entityId: eventId,
      metadata: { eventTitle },
      isPublic: true
    });
  }

  // Track business listing
  async trackBusinessListing(
    userId: string, 
    businessId: string, 
    businessName: string
  ): Promise<void> {
    await this.createActivity(userId, {
      activityType: 'business_listing',
      title: `Added "${businessName}" to directory`,
      description: `Listed their business in the directory`,
      entityType: 'business',
      entityId: businessId,
      metadata: { businessName },
      isPublic: true
    });
  }

  // Track team joining
  async trackTeamJoin(
    userId: string, 
    teamId: string, 
    teamName: string
  ): Promise<void> {
    await this.createActivity(userId, {
      activityType: 'team_join',
      title: `Joined team "${teamName}"`,
      description: `Became a member of a new team`,
      entityType: 'team',
      entityId: teamId,
      metadata: { teamName },
      isPublic: true
    });
  }

  // Track achievement unlocks
  async trackAchievementUnlock(
    userId: string, 
    achievementId: string, 
    achievementName: string
  ): Promise<void> {
    await this.createActivity(userId, {
      activityType: 'achievement_unlock',
      title: `Unlocked "${achievementName}"`,
      description: `Earned a new achievement!`,
      entityType: 'achievement',
      entityId: achievementId,
      metadata: { achievementName },
      isPublic: true
    });
  }

  // Track search activities (private)
  async trackSearch(
    userId: string, 
    query: string, 
    resultCount: number
  ): Promise<void> {
    await this.createActivity(userId, {
      activityType: 'search_performed',
      title: `Searched for "${query}"`,
      description: `Found ${resultCount} results`,
      metadata: { query, resultCount },
      isPublic: false // Private activity
    });
  }

  // Track login (private)
  async trackLogin(userId: string): Promise<void> {
    await this.createActivity(userId, {
      activityType: 'login',
      title: 'Logged in',
      description: 'Started a new session',
      metadata: { timestamp: new Date().toISOString() },
      isPublic: false // Private activity
    });
  }

  // Track content viewing (private)
  async trackContentView(
    userId: string, 
    contentType: string, 
    contentId: string, 
    contentTitle: string
  ): Promise<void> {
    await this.createActivity(userId, {
      activityType: 'content_view',
      title: `Viewed ${contentType}`,
      description: `Looked at "${contentTitle}"`,
      entityType: contentType,
      entityId: contentId,
      metadata: { contentTitle, contentType },
      isPublic: false // Private activity
    });
  }

  /**
   * Cache management
   */
  private clearUserCache(userId: string): void {
    // Clear all user-specific cache entries
    for (const [key] of this.cache) {
      if (key.includes(`user_feed_${userId}`)) {
        this.cache.delete(key);
      }
    }
  }

  private clearCache(pattern: string): void {
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Get activity statistics for a user
   */
  async getUserActivityStats(userId: string): Promise<{
    totalActivities: number;
    publicActivities: number;
    totalLikes: number;
    totalComments: number;
    mostActiveDay: string | null;
  }> {
    try {
      // Get total activity counts
      const { data: totalData, error: totalError } = await supabase
        .from('user_activities')
        .select('id, is_public, created_at')
        .eq('user_id', userId);

      if (totalError) throw totalError;

      const totalActivities = totalData?.length || 0;
      const publicActivities = totalData?.filter(a => a.is_public).length || 0;

      // Get interaction counts
      const { data: interactionData, error: interactionError } = await supabase
        .from('activity_interactions')
        .select('interaction_type')
        .in('activity_id', (totalData || []).map(a => a.id));

      if (interactionError) throw interactionError;

      const totalLikes = interactionData?.filter(i => i.interaction_type === 'like').length || 0;
      const totalComments = interactionData?.filter(i => i.interaction_type === 'comment').length || 0;

      // Calculate most active day (simplified)
      const dayCount: Record<string, number> = {};
      totalData?.forEach(activity => {
        const day = new Date(activity.created_at).toLocaleDateString();
        dayCount[day] = (dayCount[day] || 0) + 1;
      });

      const mostActiveDay = Object.keys(dayCount).length > 0 
        ? Object.keys(dayCount).reduce((a, b) => 
            dayCount[a] > dayCount[b] ? a : b
          )
        : null;

      return {
        totalActivities,
        publicActivities,
        totalLikes,
        totalComments,
        mostActiveDay
      };
    } catch (error) {
      console.error('Error loading user activity stats:', error);
      return {
        totalActivities: 0,
        publicActivities: 0,
        totalLikes: 0,
        totalComments: 0,
        mostActiveDay: null
      };
    }
  }
}

// Export singleton instance
export const activityService = new ActivityService(); 