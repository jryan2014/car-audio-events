import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Calendar, MapPin, Users, FileText, Home, Building2, Settings, BarChart3, User, Crown, BookOpen, HelpCircle, MessageSquare, Lightbulb, Search, LogOut, CreditCard } from 'lucide-react';
import Badge from './Badge';
import { GlobalSearch } from './GlobalSearch';
import { supabase } from '../lib/supabase';

interface MobileMegaMenuProps {
  isAuthenticated: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    membershipType: 'competitor' | 'pro_competitor' | 'retailer' | 'manufacturer' | 'organization' | 'admin';
    subscriptionLevel?: 'free' | 'pro' | 'business' | 'enterprise';
    profileImage?: string;
  };
  onLinkClick?: () => void;
  onLogout?: () => void;
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

export default function MobileMegaMenu({ isAuthenticated, user, onLinkClick, onLogout }: MobileMegaMenuProps) {
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
        setLoading(false);
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
      
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchNavigationItems:', error);
      setNavigationItems(getDefaultNavigation());
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
      case 'competitor': return 'free_competitor';
      case 'pro_competitor': return 'pro_competitor';
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
        is_active: true,
        target_blank: false,
      },
      {
        id: 'events',
        title: 'Events',
        icon: 'Calendar',
        nav_order: 2,
        is_active: true,
        target_blank: false,
        children: [
          {
            id: 'events-all',
            title: 'Browse Events',
            href: '/events',
            nav_order: 1,
            is_active: true,
            target_blank: false,
          },
          {
            id: 'events-create',
            title: 'Create Event',
            href: '/events/create',
            nav_order: 2,
            is_active: true,
            target_blank: false,
          },
        ]
      },
      {
        id: 'directory',
        title: 'Directory',
        icon: 'MapPin',
        nav_order: 3,
        is_active: true,
        target_blank: false,
        children: [
          {
            id: 'directory-browse',
            title: 'Browse Directory',
            href: '/directory',
            nav_order: 1,
            is_active: true,
            target_blank: false,
          },
          {
            id: 'directory-add',
            title: 'Add Business',
            href: '/directory/add',
            nav_order: 2,
            is_active: true,
            target_blank: false,
          },
        ]
      },
      {
        id: 'resources',
        title: 'Resources',
        icon: 'BookOpen',
        nav_order: 4,
        is_active: true,
        target_blank: false,
        children: [
          {
            id: 'resources-all',
            title: 'All Resources',
            href: '/resources',
            nav_order: 1,
            is_active: true,
            target_blank: false,
          },
          {
            id: 'resources-faq',
            title: 'FAQ',
            href: '/faq',
            nav_order: 2,
            is_active: true,
            target_blank: false,
          },
          {
            id: 'resources-contact',
            title: 'Contact',
            href: '/contact',
            nav_order: 3,
            is_active: true,
            target_blank: false,
          },
        ]
      },
    ];
  };

  const handleLinkClick = (href?: string) => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const ParentItem = ({ item, depth }: { item: NavigationItem; depth: number }) => (
    <div
      className={`flex items-center justify-between w-full text-left text-lg font-semibold text-gray-300 hover:text-white transition-colors ${depth > 0 ? 'pl-4' : ''}`}
      onClick={() => toggleExpanded(item.id)}
    >
      <span className="flex items-center">
        {item.icon && React.createElement(getIcon(item.icon), { className: "w-6 h-6 mr-3" })}
        {item.title}
      </span>
      <ChevronRight
        className={`w-6 h-6 transform transition-transform ${expandedItems.has(item.id) ? 'rotate-90' : ''}`}
      />
    </div>
  );

  const renderNavigationItems = (items: NavigationItem[], depth: number = 0): React.ReactNode => {
    return items.map(item => (
      <div key={item.id} className="py-2 border-b border-gray-700">
        {item.children && item.children.length > 0 ? (
          <>
            <ParentItem item={item} depth={depth} />
            {expandedItems.has(item.id) && (
              <div className="mt-2 pl-6">
                {renderNavigationItems(item.children, depth + 1)}
              </div>
            )}
          </>
        ) : (
          <Link
            to={item.href || '#'}
            target={item.target_blank ? '_blank' : '_self'}
            rel={item.target_blank ? 'noopener noreferrer' : ''}
            onClick={() => handleLinkClick(item.href)}
            className={`flex items-center text-lg text-gray-300 hover:text-white transition-colors ${depth > 0 ? 'pl-4' : ''}`}
          >
            {item.icon && React.createElement(getIcon(item.icon), { className: "w-6 h-6 mr-3" })}
            {item.title}
            {item.badge_text && (
              <Badge text={item.badge_text} color={item.badge_color || 'blue'} className="ml-2" />
            )}
          </Link>
        )}
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-full bg-black/95" style={{ height: 'calc(100vh - 88px)' }}>
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-700/50">
        <GlobalSearch 
          className="w-full"
          placeholder="Search..."
        />
      </div>

      <nav className="flex-grow overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-gray-400">
            <p>Loading navigation...</p>
          </div>
        ) : (
          <>
            {/* User Profile Section for logged-in users */}
            {isAuthenticated && user && (
              <div className="mb-6 pb-6 border-b border-gray-700">
                <div className="flex items-center mb-4">
                  {user.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt={user.name}
                      className="w-12 h-12 rounded-full border-2 border-electric-500 mr-3"
                    />
                  ) : (
                    <User className="h-12 w-12 p-2 bg-electric-500 rounded-full text-white mr-3" />
                  )}
                  <div>
                    <div className="text-white font-semibold">{user.name}</div>
                    <div className="text-gray-400 text-sm">{user.email}</div>
                  </div>
                </div>
                
                {/* User Navigation Links */}
                <div className="space-y-2">
                  <Link
                    to={user.membershipType === 'admin' ? '/admin/dashboard' : '/dashboard'}
                    onClick={onLinkClick}
                    className="flex items-center text-gray-300 hover:text-white py-2 transition-colors"
                  >
                    <BarChart3 className="w-5 h-5 mr-3" />
                    Dashboard
                  </Link>
                  
                  <Link
                    to="/profile"
                    onClick={onLinkClick}
                    className="flex items-center text-gray-300 hover:text-white py-2 transition-colors"
                  >
                    <User className="w-5 h-5 mr-3" />
                    Profile
                  </Link>
                  
                  <Link
                    to="/profile?tab=settings"
                    onClick={onLinkClick}
                    className="flex items-center text-gray-300 hover:text-white py-2 transition-colors"
                  >
                    <Settings className="w-5 h-5 mr-3" />
                    Settings
                  </Link>
                  
                  <Link
                    to="/billing"
                    onClick={onLinkClick}
                    className="flex items-center text-gray-300 hover:text-white py-2 transition-colors"
                  >
                    <CreditCard className="w-5 h-5 mr-3" />
                    Billing & Subscription
                  </Link>
                  
                  {user.membershipType && ['retailer', 'manufacturer', 'organization'].includes(user.membershipType) && (
                    <Link
                      to="/my-ads"
                      onClick={onLinkClick}
                      className="flex items-center text-gray-300 hover:text-white py-2 transition-colors"
                    >
                      <MessageSquare className="w-5 h-5 mr-3" />
                      My Ads
                    </Link>
                  )}
                </div>
              </div>
            )}
            
            {/* Regular Navigation Items */}
            {renderNavigationItems(navigationItems)}
          </>
        )}
      </nav>
      
      {/* Auth buttons */}
      <div className="p-4 border-t border-gray-700/50">
        {isAuthenticated ? (
          <button
            onClick={onLogout}
            className="w-full text-left flex items-center p-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors duration-200"
          >
            <LogOut className="mr-3 h-5 w-5" />
            <span className="font-semibold">Logout</span>
          </button>
        ) : (
          <div className="space-y-2">
            <Link
              to="/login"
              onClick={onLinkClick}
              className="block w-full text-center px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors duration-200"
            >
              Login
            </Link>
            <Link
              to="/pricing"
              onClick={onLinkClick}
              className="block w-full text-center px-4 py-2 rounded-lg bg-electric-600 hover:bg-electric-500 text-white font-bold transition-colors duration-200"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}