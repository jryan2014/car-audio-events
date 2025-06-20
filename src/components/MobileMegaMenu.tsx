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
        is_active: true,
        target_blank: false,
      },
      {
        id: 'events',
        title: 'Events',
        href: '/events',
        icon: 'Calendar',
        nav_order: 2,
        is_active: true,
        target_blank: false,
      },
      {
        id: 'directory',
        title: 'Directory',
        href: '/directory',
        icon: 'MapPin',
        nav_order: 3,
        is_active: true,
        target_blank: false,
      },
      {
        id: 'resources',
        title: 'Resources',
        href: '/resources',
        icon: 'BookOpen',
        nav_order: 4,
        is_active: true,
        target_blank: false,
      },
    ];
  };

  const handleLinkClick = (href: string) => {
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

  const renderNavigationItems = (items: NavigationItem[], depth: number = 0): React.ReactNode => {
    return items.map((item) => {
      const Icon = getIcon(item.icon);
      const isExpanded = expandedItems.has(item.id);
      const hasChildren = item.children && item.children.length > 0;

      if (item.href) {
        return (
          <Link
            key={item.id}
            to={item.href}
            target={item.target_blank ? '_blank' : '_self'}
            rel={item.target_blank ? 'noopener noreferrer' : ''}
            onClick={() => handleLinkClick(item.href!)}
            className={`flex items-center p-3 text-base font-normal rounded-lg transition duration-75 group
              ${depth > 0 ? 'pl-11' : ''}
              ${location.pathname === item.href ? 'bg-electric-500/20 text-electric-300' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}
            `}
          >
            <Icon className="w-5 h-5 text-gray-400 group-hover:text-white transition duration-75" />
            <span className="flex-1 ml-3 whitespace-nowrap">{item.title}</span>
            {item.badge_text && (
              <Badge color={item.badge_color || 'blue'}>{item.badge_text}</Badge>
            )}
          </Link>
        );
      }

      return (
        <div key={item.id}>
          <button
            onClick={() => toggleExpanded(item.id)}
            className={`flex items-center w-full p-3 text-base font-normal rounded-lg transition duration-75 group
              ${depth > 0 ? 'pl-11' : ''}
              ${isExpanded ? 'bg-gray-700/50 text-white' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}
            `}
          >
            <Icon className="w-5 h-5 text-gray-400 group-hover:text-white transition duration-75" />
            <span className="flex-1 ml-3 text-left whitespace-nowrap">{item.title}</span>
            <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
          {isExpanded && hasChildren && (
            <div className="py-2 space-y-2">
              {renderNavigationItems(item.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="bg-gradient-to-b from-black/90 to-purple-900/90 backdrop-blur-lg border-t border-electric-500/20 px-4 py-4 space-y-4">
      {/* Search Bar */}
      <div className="px-2">
        <GlobalSearch 
          className="w-full"
          placeholder="Search..."
          onSearch={() => onLinkClick && onLinkClick()}
        />
      </div>

      {/* Main Navigation */}
      {loading ? (
        <div className="text-center text-gray-400 p-4">Loading Navigation...</div>
      ) : (
        renderNavigationItems(navigationItems)
      )}

      {/* Auth buttons */}
      {!isAuthenticated && (
        <div className="pt-4 mt-4 border-t border-gray-700 space-y-2">
          <Link 
            to="/login"
            onClick={onLinkClick}
            className="block w-full text-center bg-gray-700/50 hover:bg-gray-600/50 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Login
          </Link>
          <Link 
            to="/register"
            onClick={onLinkClick}
            className="block w-full text-center bg-electric-600 hover:bg-electric-500 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Register
          </Link>
        </div>
      )}
      
      {/* Logout button */}
      {isAuthenticated && onLogout && (
         <div className="pt-4 mt-4 border-t border-gray-700">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center p-3 text-base font-normal text-gray-300 rounded-lg hover:bg-red-500/20 hover:text-red-400 group transition-colors duration-200"
          >
            <Users className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}