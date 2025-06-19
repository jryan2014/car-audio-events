import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Calendar, MapPin, Users, FileText, Home, Building2, Settings, BarChart3, User, Crown, BookOpen, HelpCircle, MessageSquare, Lightbulb, Search } from 'lucide-react';
import Badge from './Badge';
import { GlobalSearch } from './GlobalSearch';
import { supabase } from '../lib/supabase';

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

export default function MobileMegaMenu({ isAuthenticated, user, onLinkClick, isOpen }: MobileMegaMenuProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Icon mapping
  const getIcon = (iconName?: string) => {
    const iconMap: Record<string, React.ComponentType<any>> = {
      'Home': Home,
      'Calendar': Calendar,
      'MapPin': MapPin,
      'BookOpen': BookOpen,
      'Building2': Building2,
      'HelpCircle': HelpCircle,
      'MessageSquare': MessageSquare,
      'Lightbulb': Lightbulb,
      'BarChart3': BarChart3,
      'Settings': Settings,
      'Users': Users,
      'FileText': FileText
    };
    return iconMap[iconName || 'FileText'] || FileText;
  };

  useEffect(() => {
    fetchNavigationItems();
  }, [isAuthenticated, user]);

  const fetchNavigationItems = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('navigation_menu_items')
        .select('*')
        .eq('is_active', true)
        .order('nav_order', { ascending: true });

      if (error) {
        console.error('Error fetching navigation:', error);
        // Fallback to hardcoded items
        setNavigationItems(getDefaultNavigation());
        return;
      }

      // Build hierarchical structure (same as desktop MegaMenu)
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
      
      console.log('Mobile Menu Debug:', {
        isAuthenticated,
        userContext: getUserMembershipContext(),
        rootItemsCount: rootItems.length,
        rootItems: rootItems.map(item => ({ id: item.id, title: item.title, membership_contexts: item.membership_contexts }))
      });

      // Filter by membership (same logic as desktop)
      const filteredItems = filterItemsByMembership(rootItems);
      
      console.log('Filtered items for mobile menu:', {
        filteredCount: filteredItems.length,
        filteredItems: filteredItems.map(item => ({ id: item.id, title: item.title }))
      });
      
      // If no items after filtering for non-authenticated users, use fallback
      if (filteredItems.length === 0 && !isAuthenticated) {
        console.log('No items found for non-authenticated users, using fallback navigation');
        setNavigationItems(getDefaultNavigation());
      } else {
        setNavigationItems(filteredItems);
      }
    } catch (error) {
      console.error('Error in fetchNavigationItems:', error);
      setNavigationItems(getDefaultNavigation());
    } finally {
      setLoading(false);
    }
  };

  const filterItemsByMembership = (items: NavigationItem[]): NavigationItem[] => {
    const userContext = getUserMembershipContext();
    
    // For non-authenticated users, show ALL items (fuck the filtering for now)
    if (!isAuthenticated) {
      return items.map(item => ({
        ...item,
        children: item.children ? filterItemsByMembership(item.children) : []
      }));
    }
    
    // For authenticated users, apply normal filtering
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
      
      // If no membership context specified, show to everyone
      return true;
    }).map(item => ({
      ...item,
      children: item.children ? filterItemsByMembership(item.children) : []
    }));
  };

  const getUserMembershipContext = (): string => {
    if (!isAuthenticated || !user) {
      return 'base';
    }
    
    // Map membership types to contexts
    switch (user.membershipType) {
      case 'admin': return 'admin';
      case 'competitor': return 'competitor';
      case 'manufacturer': return 'manufacturer';
      case 'retailer': return 'retailer';
      case 'organization': return 'organization';
      default: return 'base';
    }
  };

  const isItemVisibleToUser = (membershipContext: string): boolean => {
    // Handle 'all' context - visible to everyone
    if (membershipContext === 'all' || membershipContext === 'base') {
      return true;
    }
    
    // Handle 'authenticated' context - requires login
    if (membershipContext === 'authenticated') {
      return isAuthenticated;
    }
    
    // Handle 'admin' context - requires admin role
    if (membershipContext === 'admin') {
      return isAuthenticated && user?.membershipType === 'admin';
    }
    
    // Handle specific membership types
    if (isAuthenticated && user) {
      return user.membershipType === membershipContext;
    }
    
    return false;
  };

  const getDefaultNavigation = (): NavigationItem[] => {
    return [
      {
        id: 'home',
        title: 'Home',
        href: '/',
        icon: 'Home',
        nav_order: 1,
        target_blank: false,
        membership_contexts: ['base'],
        is_active: true,
        children: []
      },
      {
        id: 'events',
        title: 'Events',
        href: '/events',
        icon: 'Calendar',
        nav_order: 2,
        target_blank: false,
        membership_contexts: ['base'],
        is_active: true,
        children: []
      },
      {
        id: 'directory',
        title: 'Directory',
        href: '/directory',
        icon: 'MapPin',
        nav_order: 3,
        target_blank: false,
        membership_contexts: ['base'],
        is_active: true,
        children: []
      },
      {
        id: 'resources',
        title: 'Resources',
        icon: 'BookOpen',
        nav_order: 4,
        target_blank: false,
        membership_contexts: ['base'],
        is_active: true,
        children: [
          {
            id: 'get-holt',
            title: 'Get Holt',
            href: '/get-holt',
            icon: 'Lightbulb',
            nav_order: 1,
            parent_id: 'resources',
            target_blank: false,
            membership_contexts: ['base'],
            is_active: true,
            children: []
          },
          {
            id: 'organizations',
            title: 'Organizations',
            href: '/organizations',
            icon: 'Building2',
            nav_order: 2,
            parent_id: 'resources',
            target_blank: false,
            membership_contexts: ['base'],
            is_active: true,
            children: []
          },
          {
            id: 'help-center',
            title: 'Help Center',
            href: '/help',
            icon: 'HelpCircle',
            nav_order: 3,
            parent_id: 'resources',
            target_blank: false,
            membership_contexts: ['base'],
            is_active: true,
            children: []
          },
          {
            id: 'contact-us',
            title: 'Contact Us',
            href: '/contact',
            icon: 'MessageSquare',
            nav_order: 4,
            parent_id: 'resources',
            target_blank: false,
            membership_contexts: ['base'],
            is_active: true,
            children: []
          }
        ]
      }
    ];
  };

  const handleLinkClick = (href: string) => {
    if (onLinkClick) {
      onLinkClick();
    }
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

  const renderNavigationItems = (items: NavigationItem[], depth: number = 0): React.ReactNode => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems.has(item.id);
      const paddingLeft = depth * 16 + 16;
      const IconComponent = getIcon(item.icon);

      return (
        <div key={item.id} className="border-b border-gray-700/30 last:border-b-0">
          {item.href && !hasChildren ? (
            <Link
              to={item.href}
              onClick={() => handleLinkClick(item.href!)}
              className="flex items-center justify-between px-6 py-4 text-gray-300 hover:text-white hover:bg-gray-700/30 transition-colors duration-200"
              style={{ paddingLeft: `${paddingLeft}px` }}
            >
              <div className="flex items-center space-x-3">
                <IconComponent className="h-5 w-5" />
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
                <IconComponent className="h-5 w-5" />
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

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-sm">
      <div className="flex flex-col h-full">
        {/* DEBUG BANNER */}
        <div className="bg-red-500 text-white text-center py-4 font-bold text-lg">
          🚨 MOBILE MENU v1.5.19 OPEN 🚨<br/>
          isAuthenticated: {isAuthenticated ? 'YES' : 'NO'}<br/>
          navItems: {navigationItems.length}
        </div>

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

        {/* Search Section */}
        <div className="border-b border-gray-700/50 p-4">
          <GlobalSearch 
            className="w-full"
            placeholder="Search events, businesses, users..."
          />
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto">
          <div className="py-2">
            {/* DEBUG INFO */}
            <div className="bg-yellow-500 text-black p-2 text-sm">
              DEBUG: loading={loading ? 'true' : 'false'}, isAuthenticated={isAuthenticated ? 'true' : 'false'}, navItems={navigationItems.length}
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-400">Loading navigation...</div>
              </div>
            ) : !isAuthenticated ? (
              // HARDCODED NAVIGATION FOR NON-AUTHENTICATED USERS (FUCK THE DATABASE)
              <>
                <div className="bg-green-500 text-black p-2 text-sm">DEBUG: HARDCODED NAV SECTION</div>
                <Link to="/" onClick={() => handleLinkClick('/')} className="flex items-center px-6 py-4 text-gray-300 hover:text-white hover:bg-gray-700/30 transition-colors duration-200">
                  <Home className="h-5 w-5 mr-3" />
                  <span className="font-medium">Home</span>
                </Link>
                <Link to="/events" onClick={() => handleLinkClick('/events')} className="flex items-center px-6 py-4 text-gray-300 hover:text-white hover:bg-gray-700/30 transition-colors duration-200">
                  <Calendar className="h-5 w-5 mr-3" />
                  <span className="font-medium">Events</span>
                </Link>
                <Link to="/directory" onClick={() => handleLinkClick('/directory')} className="flex items-center px-6 py-4 text-gray-300 hover:text-white hover:bg-gray-700/30 transition-colors duration-200">
                  <MapPin className="h-5 w-5 mr-3" />
                  <span className="font-medium">Directory</span>
                </Link>
                <div className="border-b border-gray-700/30">
                  <button className="w-full flex items-center justify-between px-6 py-4 text-gray-300 hover:text-white hover:bg-gray-700/30 transition-colors duration-200">
                    <div className="flex items-center">
                      <BookOpen className="h-5 w-5 mr-3" />
                      <span className="font-medium">Resources</span>
                    </div>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-blue-500 text-white p-2 text-sm">DEBUG: AUTHENTICATED NAV SECTION</div>
                {renderNavigationItems(navigationItems)}
              </>
            )}
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