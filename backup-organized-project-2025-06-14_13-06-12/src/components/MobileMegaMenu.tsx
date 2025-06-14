import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Calendar, MapPin, Users, Target, FileText, Home, Building2, Shield, Settings, BarChart3, Package, User, Menu, Crown, Factory, Globe, Tag, Star, Info, HelpCircle, BookOpen, FileQuestion, Lightbulb, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Badge from './Badge';

interface NavigationItem {
  id: string;
  title: string;
  href?: string;
  icon?: string;
  nav_order: number;
  parent_id?: string;
  target_blank: boolean;
  membership_context?: string;
  membership_contexts?: string[];
  badge_text?: string;
  badge_color?: string;
  description?: string;
  priority?: number;
  is_active: boolean;
  children?: NavigationItem[];
}

interface MobileMegaMenuProps {
  isAuthenticated: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    membershipType: 'competitor' | 'manufacturer' | 'retailer' | 'organization' | 'admin';
    subscriptionLevel?: 'free' | 'pro' | 'business' | 'enterprise';
    profileImage?: string;
  };
  onLinkClick?: () => void;
  isOpen: boolean;
}

// Icon mapping for dynamic icon rendering
const iconMap: { [key: string]: React.ComponentType<any> } = {
  Home,
  Calendar,
  MapPin,
  Users,
  Target,
  FileText,
  Building2,
  Shield,
  Settings,
  BarChart3,
  Package,
  Crown,
  Factory,
  Globe,
  Tag,
  Star,
  User,
  Menu,
  Info,
  HelpCircle,
  BookOpen,
  FileQuestion,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  MessageSquare
};

export default function MobileMegaMenu({ isAuthenticated, user, onLinkClick, isOpen }: MobileMegaMenuProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load navigation items from database
  useEffect(() => {
    if (isOpen) {
      loadNavigationItems();
    }
  }, [user?.membershipType, isAuthenticated, isOpen]);

  const loadNavigationItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('navigation_menu_items')
        .select('*')
        .eq('is_active', true)
        .order('nav_order');

      if (error) {
        console.error('Mobile - Supabase error loading navigation:', error);
        setNavigationItems(getFallbackNavigation());
        return;
      }

      console.log('Mobile - Raw navigation data from database:', data);

      // Build hierarchical structure
      const itemsMap = new Map<string, NavigationItem>();
      const rootItems: NavigationItem[] = [];

      // First pass: create all items
      data?.forEach(item => {
        const navItem: NavigationItem = {
          id: item.id,
          title: item.title,
          href: item.href,
          icon: item.icon,
          nav_order: item.nav_order,
          parent_id: item.parent_id,
          target_blank: item.target_blank,
          membership_context: item.membership_context,
          membership_contexts: item.membership_contexts,
          badge_text: item.badge_text,
          badge_color: item.badge_color,
          description: item.description,
          priority: item.priority,
          is_active: item.is_active,
          children: []
        };
        itemsMap.set(item.id, navItem);
      });

      // Second pass: build hierarchy
      itemsMap.forEach(item => {
        if (item.parent_id && itemsMap.has(item.parent_id)) {
          const parent = itemsMap.get(item.parent_id)!;
          parent.children = parent.children || [];
          parent.children.push(item);
        } else {
          rootItems.push(item);
        }
      });

      // Sort children by nav_order
      const sortItems = (items: NavigationItem[]) => {
        items.sort((a, b) => a.nav_order - b.nav_order);
        items.forEach(item => {
          if (item.children && item.children.length > 0) {
            sortItems(item.children);
          }
        });
      };

      sortItems(rootItems);
      console.log('Mobile - Hierarchical navigation items:', rootItems);

      // Filter by membership
      const filteredItems = filterItemsByMembership(rootItems);
      console.log('Mobile - Filtered navigation items:', filteredItems);

      setNavigationItems(filteredItems);
    } catch (error) {
      console.error('Mobile - Error loading navigation:', error);
      setNavigationItems(getFallbackNavigation());
    } finally {
      setIsLoading(false);
    }
  };

  const filterItemsByMembership = (items: NavigationItem[]): NavigationItem[] => {
    const userContext = getUserMembershipContext();
    
    return items.filter(item => {
      // Check if item is visible to current user context
      if (item.membership_contexts && item.membership_contexts.length > 0) {
        // If item has 'base' context, everyone can see it
        if (item.membership_contexts.includes('base')) {
          return true;
        }
        // Admin can see everything
        if (userContext === 'admin') {
          return true;
        }
        // Check if user's context is in the allowed contexts
        return item.membership_contexts.includes(userContext);
      }
      
      // Fallback to old membership_context field
      if (item.membership_context) {
        return isItemVisibleToUser(item.membership_context);
      }
      
      // Default to visible (everyone can see)
      return true;
    }).map(item => ({
      ...item,
      children: item.children ? filterItemsByMembership(item.children) : []
    }));
  };

  const getUserMembershipContext = (): string => {
    if (!isAuthenticated) return 'base';
    
    switch (user?.membershipType) {
      case 'admin': return 'admin';
      case 'competitor': 
        return user?.subscriptionLevel === 'pro' ? 'pro_competitor' : 'free_competitor';
      case 'retailer': return 'retailer';
      case 'manufacturer': return 'manufacturer';
      case 'organization': return 'organization';
      default: return 'base';
    }
  };

  const isItemVisibleToUser = (membershipContext: string): boolean => {
    if (membershipContext === 'base') return true;
    if (!isAuthenticated && membershipContext !== 'base') return false;
    
    const userContext = getUserMembershipContext();
    
    // Admin can see everything
    if (userContext === 'admin') return true;
    
    // Check specific contexts
    switch (membershipContext) {
      case 'free_competitor':
        return ['free_competitor', 'pro_competitor'].includes(userContext);
      case 'pro_competitor':
        return userContext === 'pro_competitor';
      case 'retailer':
        return userContext === 'retailer';
      case 'manufacturer':
        return userContext === 'manufacturer';
      case 'organization':
        return userContext === 'organization';
      case 'admin':
        return userContext === 'admin';
      default:
        return true;
    }
  };

  // Fallback navigation if database fails
  const getFallbackNavigation = (): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      {
        id: 'home',
        title: 'Home',
        href: '/',
        icon: 'Home',
        nav_order: 1,
        target_blank: false,
        membership_context: 'base',
        is_active: true
      },
      {
        id: 'events',
        title: 'Events',
        href: '/events',
        icon: 'Calendar',
        nav_order: 2,
        target_blank: false,
        membership_context: 'base',
        is_active: true
      },
      {
        id: 'directory',
        title: 'Directory',
        href: '/directory',
        icon: 'MapPin',
        nav_order: 3,
        target_blank: false,
        membership_context: 'base',
        is_active: true
      }
    ];

    // Add membership-specific items for unauthenticated users
    if (!isAuthenticated) {
      baseItems.push({
        id: 'pricing',
        title: 'Join Now',
        href: '/pricing',
        icon: 'Crown',
        nav_order: 4,
        target_blank: false,
        membership_context: 'base',
        is_active: true
      });
    }

    return baseItems;
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleLinkClick = (href: string) => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
  };

  const renderNavigationItems = (items: NavigationItem[], depth: number = 0): React.ReactNode => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems.has(item.id);
      const paddingLeft = depth * 16 + 16;

      return (
        <div key={item.id} className="border-b border-gray-700/30 last:border-b-0">
          {item.href && !hasChildren ? (
            <Link
              to={item.href}
              target={item.target_blank ? '_blank' : undefined}
              rel={item.target_blank ? 'noopener noreferrer' : undefined}
              onClick={() => handleLinkClick(item.href!)}
              className="flex items-center justify-between px-6 py-4 text-gray-300 hover:text-white hover:bg-gray-700/30 transition-colors duration-200"
              style={{ paddingLeft: `${paddingLeft}px` }}
            >
              <div className="flex items-center space-x-3">
                {renderIcon(item.icon)}
                <span className="font-medium">{item.title}</span>
              </div>
            </Link>
          ) : (
            <button
              onClick={() => hasChildren ? toggleExpanded(item.id) : item.href && handleLinkClick(item.href)}
              className="w-full flex items-center justify-between px-6 py-4 text-gray-300 hover:text-white hover:bg-gray-700/30 transition-colors duration-200"
              style={{ paddingLeft: `${paddingLeft}px` }}
            >
              <div className="flex items-center space-x-3">
                {renderIcon(item.icon)}
                <span className="font-medium">{item.title}</span>
              </div>
              {hasChildren && (
                <ChevronRight className={`h-5 w-5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              )}
            </button>
          )}
          
          {hasChildren && isExpanded && (
            <div className="bg-gray-800/50">
              {renderNavigationItems(item.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="lg:hidden fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-sm">
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-700 rounded w-24"></div>
                <div className="h-6 bg-gray-700 rounded w-32"></div>
                <div className="h-6 bg-gray-700 rounded w-28"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-sm">
      <div className="flex flex-col h-full">
        {/* User Profile Section */}
        {isAuthenticated && user && (
          <div className="bg-gradient-to-r from-electric-500/20 to-purple-500/20 border-b border-gray-700/50 p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-electric-400 to-purple-500 rounded-full flex items-center justify-center">
                {user.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="h-6 w-6 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold truncate">{user.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-sm text-gray-300 capitalize">{user.membershipType}</span>
                  {user.subscriptionLevel && (
                    <Badge 
                      text={user.subscriptionLevel.toUpperCase()} 
                      color={user.subscriptionLevel === 'pro' ? 'purple' : 'green'} 
                      size="sm"
                    />
                  )}
                </div>
              </div>
            </div>
            
            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Link
                to="/dashboard"
                onClick={() => handleLinkClick('/dashboard')}
                className="flex items-center justify-center space-x-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg py-3 px-4 transition-colors duration-200"
              >
                <Settings className="h-4 w-4 text-electric-400" />
                <span className="text-sm font-medium text-gray-300">Dashboard</span>
              </Link>
              <Link
                to="/profile"
                onClick={() => handleLinkClick('/profile')}
                className="flex items-center justify-center space-x-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg py-3 px-4 transition-colors duration-200"
              >
                <User className="h-4 w-4 text-electric-400" />
                <span className="text-sm font-medium text-gray-300">Profile</span>
              </Link>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto">
          <div className="py-2">
            {renderNavigationItems(navigationItems)}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-gray-700/50 p-6 bg-gray-800/30">
          {!isAuthenticated ? (
            <div className="space-y-3">
              <Link
                to="/login"
                onClick={() => handleLinkClick('/login')}
                className="block w-full text-center bg-electric-500 hover:bg-electric-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => handleLinkClick('/register')}
                className="block w-full text-center border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Join Free
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {user?.membershipType !== 'admin' && (
                <Link
                  to="/pricing"
                  onClick={() => handleLinkClick('/pricing')}
                  className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-purple-500 to-electric-500 hover:from-purple-600 hover:to-electric-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  <Crown className="h-4 w-4" />
                  <span>Upgrade to Pro</span>
                </Link>
              )}
              <button
                onClick={() => {
                  // Handle logout
                  handleLinkClick('/logout');
                }}
                className="w-full text-center border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 