import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Heart, 
  MessageCircle, 
  Share, 
  User, 
  Calendar, 
  Plus, 
  MapPin, 
  Trophy, 
  Users, 
  Award, 
  Search, 
  LogIn, 
  Eye,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { activityService, ActivityFeedItem } from '../services/activityService';

interface ActivityFeedProps {
  type: 'user' | 'community';
  userId?: string;
  limit?: number;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  type = 'community',
  userId,
  limit = 20,
  className = ''
}) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    loadActivities(true);
  }, [type, userId, user?.id]);

  const loadActivities = async (reset: boolean = false) => {
    if (!user && type === 'user') return;
    
    setIsLoading(true);
    setError(null);

    try {
      const currentOffset = reset ? 0 : offset;
      let newActivities: ActivityFeedItem[] = [];

      if (type === 'user' && (userId || user?.id)) {
        newActivities = await activityService.getUserActivityFeed(
          userId || user!.id, 
          limit, 
          currentOffset
        );
      } else {
        newActivities = await activityService.getCommunityActivityFeed(
          limit, 
          currentOffset
        );
      }

      if (reset) {
        setActivities(newActivities);
        setOffset(limit);
      } else {
        setActivities(prev => [...prev, ...newActivities]);
        setOffset(prev => prev + limit);
      }

      setHasMore(newActivities.length === limit);
    } catch (error) {
      console.error('Error loading activities:', error);
      setError('Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadActivities(true);
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadActivities(false);
    }
  };

  const handleLike = async (activityId: number) => {
    if (!user) return;

    try {
      await activityService.addInteraction(activityId, user.id, 'like');
      
      // Update local state optimistically
      setActivities(prev => prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, like_count: activity.like_count + 1 }
          : activity
      ));
    } catch (error) {
      console.error('Error liking activity:', error);
    }
  };

  const getActivityIcon = (iconName: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      User,
      Calendar,
      Plus,
      MapPin,
      Trophy,
      Users,
      Award,
      Search,
      LogIn,
      Eye,
      Clock
    };

    const IconComponent = iconMap[iconName] || Clock;
    return <IconComponent className="h-4 w-4" />;
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const getActivityUrl = (activity: ActivityFeedItem) => {
    if (!activity.entity_type || !activity.entity_id) return null;

    switch (activity.entity_type) {
      case 'event':
        return `/events/${activity.entity_id}`;
      case 'business':
        return `/directory/${activity.entity_id}`;
      case 'user':
        return `/profile/${activity.entity_id}`;
      case 'team':
        return `/teams/${activity.entity_id}`;
      default:
        return null;
    }
  };

  if (error) {
    return (
      <div className={`bg-red-500/10 border border-red-500/20 rounded-lg p-4 ${className}`}>
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 text-red-400 hover:text-red-300 text-sm underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800/50 border border-gray-700 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-white font-medium">
          {type === 'user' ? 'Your Activity' : 'Community Activity'}
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-gray-700/50">
        {activities.length === 0 && !isLoading ? (
          <div className="p-8 text-center">
            <Clock className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {type === 'user' ? 'No activity yet' : 'No community activity yet'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {type === 'user' 
                ? 'Your activities will appear here as you use the platform'
                : 'Community activities will appear here as users engage'
              }
            </p>
          </div>
        ) : (
          activities.map((activity) => {
            const activityUrl = getActivityUrl(activity);
            
            return (
              <div key={activity.id} className="p-4 hover:bg-gray-700/30 transition-colors">
                <div className="flex items-start space-x-3">
                  {/* User Avatar */}
                  <div className="flex-shrink-0">
                    {activity.user_image ? (
                      <img
                        src={activity.user_image}
                        alt={activity.user_name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {/* Activity Icon */}
                      <div 
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${activity.activity_color}20`, color: activity.activity_color }}
                      >
                        {getActivityIcon(activity.activity_icon)}
                      </div>

                      {/* Activity Title and User */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm">
                          <span className="font-medium">{activity.user_name}</span>
                          {' '}
                          <span className="text-gray-300">{activity.title}</span>
                        </p>
                      </div>

                      {/* Timestamp */}
                      <span className="text-gray-500 text-xs flex-shrink-0">
                        {formatTimeAgo(activity.created_at)}
                      </span>
                    </div>

                    {/* Activity Description */}
                    {activity.description && (
                      <p className="text-gray-400 text-sm mb-2 ml-8">
                        {activity.description}
                      </p>
                    )}

                    {/* Entity Link */}
                    {activityUrl && (
                      <div className="ml-8 mb-2">
                        <a
                          href={activityUrl}
                          className="text-electric-400 hover:text-electric-300 text-sm underline"
                        >
                          View {activity.entity_type}
                        </a>
                      </div>
                    )}

                    {/* Activity Metadata Display */}
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="ml-8 mb-2">
                        <div className="bg-gray-700/50 rounded p-2 text-xs text-gray-400">
                          {activity.metadata.eventTitle && (
                            <span>Event: {activity.metadata.eventTitle}</span>
                          )}
                          {activity.metadata.businessName && (
                            <span>Business: {activity.metadata.businessName}</span>
                          )}
                          {activity.metadata.teamName && (
                            <span>Team: {activity.metadata.teamName}</span>
                          )}
                          {activity.metadata.achievementName && (
                            <span>Achievement: {activity.metadata.achievementName}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Interaction Buttons */}
                    <div className="flex items-center space-x-4 ml-8 mt-2">
                      {/* Like Button */}
                      <button
                        onClick={() => handleLike(activity.id)}
                        disabled={!user}
                        className="flex items-center space-x-1 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Heart className="h-4 w-4" />
                        <span className="text-xs">{activity.like_count}</span>
                      </button>

                      {/* Comment Button */}
                      <button
                        disabled={!user}
                        className="flex items-center space-x-1 text-gray-500 hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-xs">{activity.comment_count}</span>
                      </button>

                      {/* Share Button */}
                      <button
                        disabled={!user}
                        className="flex items-center space-x-1 text-gray-500 hover:text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Share className="h-4 w-4" />
                      </button>

                      {/* More Options */}
                      <button
                        disabled={!user}
                        className="text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Load More Button */}
      {hasMore && activities.length > 0 && (
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLoadMore}
            disabled={isLoading}
            className="w-full py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              'Load more activities'
            )}
          </button>
        </div>
      )}

      {/* Initial Loading State */}
      {isLoading && activities.length === 0 && (
        <div className="p-8 text-center">
          <RefreshCw className="h-8 w-8 text-gray-500 mx-auto mb-3 animate-spin" />
          <p className="text-gray-400">Loading activities...</p>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed; 