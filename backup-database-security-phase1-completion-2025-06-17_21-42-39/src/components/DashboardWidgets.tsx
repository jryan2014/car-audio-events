import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Trophy,
  MapPin,
  Users,
  TrendingUp,
  Star,
  Target,
  Award,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  ChevronUp,
  ChevronDown,
  X,
  Settings,
  Plus,
  Grip
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { activityService } from '../services/activityService';
import ActivityFeed from './ActivityFeed';

// ================================
// WIDGET TYPES & INTERFACES
// ================================

export interface Widget {
  id: string;
  type: string;
  title: string;
  component: React.ComponentType<any>;
  size: 'small' | 'medium' | 'large';
  order: number;
  enabled: boolean;
  settings?: Record<string, any>;
}

export interface WidgetProps {
  widget: Widget;
  onUpdate?: (widget: Widget) => void;
  onRemove?: (widgetId: string) => void;
}

// ================================
// INDIVIDUAL WIDGET COMPONENTS
// ================================

const QuickStatsWidget: React.FC<WidgetProps> = ({ widget, onUpdate, onRemove }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalActivities: 0,
    totalLikes: 0,
    totalComments: 0,
    mostActiveDay: null as string | null
  });

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    const userStats = await activityService.getUserActivityStats(user.id);
    setStats(userStats);
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium flex items-center space-x-2">
          <BarChart3 className="h-4 w-4" />
          <span>Quick Stats</span>
        </h3>
        <button
          onClick={() => onRemove?.(widget.id)}
          className="text-gray-500 hover:text-red-400 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-700/30 rounded p-3 text-center">
          <div className="text-lg font-bold text-electric-400">{stats.totalActivities}</div>
          <div className="text-xs text-gray-400">Activities</div>
        </div>
        <div className="bg-gray-700/30 rounded p-3 text-center">
          <div className="text-lg font-bold text-red-400">{stats.totalLikes}</div>
          <div className="text-xs text-gray-400">Likes</div>
        </div>
        <div className="bg-gray-700/30 rounded p-3 text-center">
          <div className="text-lg font-bold text-blue-400">{stats.totalComments}</div>
          <div className="text-xs text-gray-400">Comments</div>
        </div>
        <div className="bg-gray-700/30 rounded p-3 text-center">
          <div className="text-lg font-bold text-green-400">
            {stats.mostActiveDay ? new Date(stats.mostActiveDay).getDate() : '-'}
          </div>
          <div className="text-xs text-gray-400">Most Active</div>
        </div>
      </div>
    </div>
  );
};

const PersonalActivityWidget: React.FC<WidgetProps> = ({ widget, onUpdate, onRemove }) => {
  const { user } = useAuth();

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-white font-medium flex items-center space-x-2">
          <Activity className="h-4 w-4" />
          <span>Your Activity</span>
        </h3>
        <button
          onClick={() => onRemove?.(widget.id)}
          className="text-gray-500 hover:text-red-400 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-0">
        <ActivityFeed 
          type="user" 
          userId={user?.id}
          limit={widget.settings?.limit || 10}
          className="border-0 bg-transparent"
        />
      </div>
    </div>
  );
};

const CommunityActivityWidget: React.FC<WidgetProps> = ({ widget, onUpdate, onRemove }) => {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-white font-medium flex items-center space-x-2">
          <Users className="h-4 w-4" />
          <span>Community Feed</span>
        </h3>
        <button
          onClick={() => onRemove?.(widget.id)}
          className="text-gray-500 hover:text-red-400 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-0">
        <ActivityFeed 
          type="community" 
          limit={widget.settings?.limit || 15}
          className="border-0 bg-transparent"
        />
      </div>
    </div>
  );
};

const UpcomingEventsWidget: React.FC<WidgetProps> = ({ widget, onUpdate, onRemove }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This would load real upcoming events
    // For now, showing placeholder
    setEvents([]);
    setIsLoading(false);
  }, []);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <span>Upcoming Events</span>
        </h3>
        <button
          onClick={() => onRemove?.(widget.id)}
          className="text-gray-500 hover:text-red-400 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-electric-500 border-t-transparent rounded-full mx-auto"></div>
        </div>
      ) : events.length > 0 ? (
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={index} className="bg-gray-700/30 p-3 rounded">
              <div className="font-medium text-white text-sm">{event.title}</div>
              <div className="text-gray-400 text-xs">{event.date}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Calendar className="h-8 w-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No upcoming events</p>
        </div>
      )}
    </div>
  );
};

const RecommendationsWidget: React.FC<WidgetProps> = ({ widget, onUpdate, onRemove }) => {
  const recommendations = [
    {
      type: 'event',
      title: 'Join a local competition',
      description: 'Based on your location and interests',
      action: 'Browse Events',
      icon: Trophy,
      color: 'text-yellow-400'
    },
    {
      type: 'business',
      title: 'Find audio retailers near you',
      description: 'Discover new gear and services',
      action: 'View Directory',
      icon: MapPin,
      color: 'text-green-400'
    },
    {
      type: 'social',
      title: 'Connect with other enthusiasts',
      description: 'Join teams and build your network',
      action: 'Find Teams',
      icon: Users,
      color: 'text-blue-400'
    }
  ];

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium flex items-center space-x-2">
          <Zap className="h-4 w-4" />
          <span>Recommendations</span>
        </h3>
        <button
          onClick={() => onRemove?.(widget.id)}
          className="text-gray-500 hover:text-red-400 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div key={index} className="bg-gray-700/30 p-3 rounded hover:bg-gray-700/50 transition-colors cursor-pointer">
            <div className="flex items-start space-x-3">
              <rec.icon className={`h-5 w-5 ${rec.color} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm">{rec.title}</div>
                <div className="text-gray-400 text-xs mt-1">{rec.description}</div>
                <button className="text-electric-400 hover:text-electric-300 text-xs mt-2">
                  {rec.action} →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ================================
// WIDGET REGISTRY
// ================================

export const WIDGET_REGISTRY: Record<string, Omit<Widget, 'id' | 'order' | 'enabled'>> = {
  quickStats: {
    type: 'quickStats',
    title: 'Quick Stats',
    component: QuickStatsWidget,
    size: 'medium'
  },
  personalActivity: {
    type: 'personalActivity',
    title: 'Your Activity',
    component: PersonalActivityWidget,
    size: 'large',
    settings: { limit: 10 }
  },
  communityActivity: {
    type: 'communityActivity',
    title: 'Community Feed',
    component: CommunityActivityWidget,
    size: 'large',
    settings: { limit: 15 }
  },
  upcomingEvents: {
    type: 'upcomingEvents',
    title: 'Upcoming Events',
    component: UpcomingEventsWidget,
    size: 'medium'
  },
  recommendations: {
    type: 'recommendations',
    title: 'Recommendations',
    component: RecommendationsWidget,
    size: 'medium'
  }
};

// ================================
// MAIN WIDGET CONTAINER
// ================================

interface DashboardWidgetsProps {
  initialWidgets?: Widget[];
  onWidgetsChange?: (widgets: Widget[]) => void;
  isEditMode?: boolean;
  onEditModeChange?: (editMode: boolean) => void;
}

export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({
  initialWidgets,
  onWidgetsChange,
  isEditMode = false,
  onEditModeChange
}) => {
  const [widgets, setWidgets] = useState<Widget[]>(
    initialWidgets || [
      { 
        id: 'quickStats-1', 
        ...WIDGET_REGISTRY.quickStats, 
        order: 1, 
        enabled: true 
      },
      { 
        id: 'personalActivity-1', 
        ...WIDGET_REGISTRY.personalActivity, 
        order: 2, 
        enabled: true 
      },
      { 
        id: 'recommendations-1', 
        ...WIDGET_REGISTRY.recommendations, 
        order: 3, 
        enabled: true 
      },
      { 
        id: 'upcomingEvents-1', 
        ...WIDGET_REGISTRY.upcomingEvents, 
        order: 4, 
        enabled: true 
      }
    ]
  );

  const [availableWidgets, setAvailableWidgets] = useState<string[]>([]);

  useEffect(() => {
    const usedTypes = widgets.map(w => w.type);
    const available = Object.keys(WIDGET_REGISTRY).filter(type => 
      !usedTypes.includes(type) || type === 'personalActivity' || type === 'communityActivity'
    );
    setAvailableWidgets(available);
  }, [widgets]);

  const updateWidgets = (newWidgets: Widget[]) => {
    setWidgets(newWidgets);
    onWidgetsChange?.(newWidgets);
  };

  const handleWidgetUpdate = (updatedWidget: Widget) => {
    const newWidgets = widgets.map(w => 
      w.id === updatedWidget.id ? updatedWidget : w
    );
    updateWidgets(newWidgets);
  };

  const handleWidgetRemove = (widgetId: string) => {
    const newWidgets = widgets.filter(w => w.id !== widgetId);
    updateWidgets(newWidgets);
  };

  const handleAddWidget = (type: string) => {
    const registry = WIDGET_REGISTRY[type];
    if (!registry) return;

    const newWidget: Widget = {
      id: `${type}-${Date.now()}`,
      ...registry,
      order: widgets.length + 1,
      enabled: true
    };

    updateWidgets([...widgets, newWidget]);
  };

  const moveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const currentIndex = widgets.findIndex(w => w.id === widgetId);
    if (currentIndex === -1) return;

    const newWidgets = [...widgets];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= widgets.length) return;

    // Swap widgets
    [newWidgets[currentIndex], newWidgets[targetIndex]] = [newWidgets[targetIndex], newWidgets[currentIndex]];
    
    // Update order
    newWidgets.forEach((widget, index) => {
      widget.order = index + 1;
    });

    updateWidgets(newWidgets);
  };

  const getWidgetGridClass = (size: Widget['size']) => {
    switch (size) {
      case 'small': return 'lg:col-span-1';
      case 'medium': return 'lg:col-span-1';
      case 'large': return 'lg:col-span-2';
      default: return 'lg:col-span-1';
    }
  };

  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order);

  return (
    <div>
      {/* Edit Mode Controls */}
      {isEditMode && (
        <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Customize Dashboard</h3>
            <button
              onClick={() => onEditModeChange?.(false)}
              className="text-gray-400 hover:text-white"
            >
              Done
            </button>
          </div>

          {availableWidgets.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-gray-400 text-sm">Add Widgets:</h4>
              <div className="flex flex-wrap gap-2">
                {availableWidgets.map(type => (
                  <button
                    key={type}
                    onClick={() => handleAddWidget(type)}
                    className="bg-electric-500/20 text-electric-400 px-3 py-1 rounded-full text-sm hover:bg-electric-500/30 transition-colors flex items-center space-x-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{WIDGET_REGISTRY[type].title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Widget Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {enabledWidgets.map((widget) => {
          const WidgetComponent = widget.component;
          
          return (
            <div key={widget.id} className={getWidgetGridClass(widget.size)}>
              <div className="relative group">
                {/* Edit Mode Controls */}
                {isEditMode && (
                  <div className="absolute top-2 right-2 z-10 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveWidget(widget.id, 'up')}
                      className="bg-gray-700 text-white p-1 rounded hover:bg-gray-600"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveWidget(widget.id, 'down')}
                      className="bg-gray-700 text-white p-1 rounded hover:bg-gray-600"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <div className="bg-gray-700 text-white p-1 rounded cursor-grab">
                      <Grip className="h-3 w-3" />
                    </div>
                  </div>
                )}

                <WidgetComponent
                  widget={widget}
                  onUpdate={handleWidgetUpdate}
                  onRemove={isEditMode ? handleWidgetRemove : undefined}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Widget Button (when not in edit mode) */}
      {!isEditMode && (
        <div className="mt-6 text-center">
          <button
            onClick={() => onEditModeChange?.(true)}
            className="bg-gray-800/50 border border-gray-700 text-gray-400 hover:text-white hover:border-electric-500 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
          >
            <Settings className="h-4 w-4" />
            <span>Customize Dashboard</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardWidgets; 