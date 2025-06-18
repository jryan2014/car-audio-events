import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Calendar, MapPin, Users, Target, FileText, Home, Building2, Shield, Settings, BarChart3, Package, Crown, Factory, Globe, Tag, Star, Info, HelpCircle, BookOpen, FileQuestion, Lightbulb, AlertCircle, CheckCircle, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

interface MegaMenuProps {
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
  Info,
  HelpCircle,
  BookOpen,
  FileQuestion,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  MessageSquare
};

export default function MegaMenu({ isAuthenticated, user, onLinkClick }: MegaMenuProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mouseLeaveTimeout, setMouseLeaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load navigation items from database
  useEffect(() => {
    loadNavigationItems();
  }, [user?.membershipType, isAuthenticated]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mouseLeaveTimeout) {
        clearTimeout(mouseLeaveTimeout);
      }
    };
  }, [mouseLeaveTimeout]);

  const loadNavigationItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('navigation_menu_items')
        .select('*')
        .eq('is_active', true)
        .order('nav_order');

      if (error) {
        console.error('Supabase error loading navigation:', error);
        setNavigationItems(getFallbackNavigation());
        return;
      }

      if (import.meta.env.MODE === 'development') {
        console.log('Raw navigation data from database:', data);
      }

      if (!data || data.length === 0) {
        // No data in database, use fallback
        setNavigationItems(getFallbackNavigation());
        return;
      }

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
      if (import.meta.env.MODE === 'development') {
        console.log('Hierarchical navigation items:', rootItems);
      }

      // Filter by membership
      const filteredItems = filterItemsByMembership(rootItems);
      if (import.meta.env.MODE === 'development') {
        console.log('Filtered navigation items:', filteredItems);
      }

      // If no items after filtering for non-authenticated users, use fallback
      if (filteredItems.length === 0 && !isAuthenticated) {
        setNavigationItems(getFallbackNavigation());
      } else {
        setNavigationItems(filteredItems);
      }
    } catch (error) {
      console.error('Error loading navigation:', error);
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

  const handleLinkClick = (href: string) => {
    if (onLinkClick) {
      onLinkClick();
    }
    setOpenDropdown(null);
  };

  const handleMouseEnter = (itemId: string) => {
    if (mouseLeaveTimeout) {
      clearTimeout(mouseLeaveTimeout);
      setMouseLeaveTimeout(null);
    }
    setOpenDropdown(itemId);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setOpenDropdown(null);
    }, 150);
    setMouseLeaveTimeout(timeout);
  };

  const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  if (isLoading) {
    return (
      <nav className="hidden lg:flex items-center space-x-8">
        <div className="animate-pulse flex space-x-8">
          <div className="h-4 bg-gray-700 rounded w-16"></div>
          <div className="h-4 bg-gray-700 rounded w-16"></div>
          <div className="h-4 bg-gray-700 rounded w-16"></div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="hidden lg:flex items-center space-x-8">
      {navigationItems.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        const isOpen = openDropdown === item.id;

        return (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => hasChildren && handleMouseEnter(item.id)}
            onMouseLeave={() => hasChildren && handleMouseLeave()}
          >
            {item.href ? (
              <Link
                to={item.href}
                target={item.target_blank ? '_blank' : undefined}
                rel={item.target_blank ? 'noopener noreferrer' : undefined}
                onClick={() => handleLinkClick(item.href!)}
                className="flex items-center space-x-2 text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium py-2 group"
              >
                {renderIcon(item.icon)}
                <span>{item.title}</span>
                {hasChildren && (
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                )}
              </Link>
            ) : (
              <button
                className="flex items-center space-x-2 text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium py-2 group"
              >
                {renderIcon(item.icon)}
                <span>{item.title}</span>
                {hasChildren && (
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                )}
              </button>
            )}

            {/* Dropdown Menu */}
            {hasChildren && isOpen && (
              <div
                className="absolute left-0 top-full mt-2 w-80 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl z-50"
                onMouseEnter={() => handleMouseEnter(item.id)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="p-4">
                  <div className="space-y-1">
                    {item.children!.map((child) => (
                      <Link
                        key={child.id}
                        to={child.href || '#'}
                        target={child.target_blank ? '_blank' : undefined}
                        rel={child.target_blank ? 'noopener noreferrer' : undefined}
                        onClick={() => handleLinkClick(child.href || '#')}
                        className="flex items-start space-x-3 px-3 py-3 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors duration-200 group"
                      >
                        {renderIcon(child.icon)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">{child.title}</span>
                          </div>
                          {child.description && (
                            <p className="text-xs text-gray-400 leading-relaxed">{child.description}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
} 