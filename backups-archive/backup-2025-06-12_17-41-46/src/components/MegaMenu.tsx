import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Calendar, MapPin, Users, Target, FileText, Home, Building2, Shield, Settings, BarChart3, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CMSPage {
  id: string;
  title: string;
  slug: string;
  navigation_placement: 'none' | 'top_nav' | 'sub_nav' | 'footer' | 'main';
  parent_nav_item?: string;
  nav_order?: number;
  nav_title?: string;
  status: 'draft' | 'published' | 'archived';
}

interface NavigationItem {
  id: string;
  title: string;
  href: string;
  icon?: React.ComponentType<any>;
  children?: NavigationItem[];
  external?: boolean;
  depth?: number;
  description?: string;
}

interface MegaMenuProps {
  isAuthenticated: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    membershipType: 'competitor' | 'manufacturer' | 'retailer' | 'organization' | 'admin';
    profileImage?: string;
  };
  onLinkClick?: () => void;
}

export default function MegaMenu({ isAuthenticated, user, onLinkClick }: MegaMenuProps) {
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mouseLeaveTimeout, setMouseLeaveTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadNavigation();
  }, [isAuthenticated, user]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mouseLeaveTimeout) {
        clearTimeout(mouseLeaveTimeout);
      }
    };
  }, [mouseLeaveTimeout]);

  const loadNavigation = async () => {
    try {
      setIsLoading(true);
      
      // Load CMS pages for navigation
      let { data: cmsPages, error } = await supabase
        .from('cms_pages')
        .select('id, title, slug, navigation_placement, parent_nav_item, nav_order, nav_title, status')
        .eq('status', 'published')
        .in('navigation_placement', ['top_nav', 'sub_nav', 'main'])
        .order('nav_order', { ascending: true });

      if (error && !error.message?.includes('column')) {
        throw error;
      }

      // If navigation fields don't exist, fallback to empty array
      if (!cmsPages) {
        cmsPages = [];
      }

      // Build navigation structure
      const navItems = buildNavigationStructure(cmsPages);
      setNavigation(navItems);
    } catch (error) {
      console.error('Error loading navigation:', error);
      // Use fallback navigation
      setNavigation(getFallbackNavigation());
    } finally {
      setIsLoading(false);
    }
  };

    const buildNavigationStructure = (cmsPages: CMSPage[]): NavigationItem[] => {
    const items: NavigationItem[] = [];

    // Core navigation items with their structure
    const coreItems = [
      {
        id: 'home',
        title: 'Home',
        href: '/',
        icon: Home
      },
      {
        id: 'events',
        title: 'Events',
        href: '/events',
        icon: Calendar,
        children: [] as NavigationItem[]
      },
      {
        id: 'directory',
        title: 'Directory',
        href: '/directory',
        icon: MapPin,
        children: [] as NavigationItem[]
      },
      {
        id: 'about',
        title: 'About',
        href: '#',
        icon: Building2,
        children: [] as NavigationItem[]
      },
      {
        id: 'resources',
        title: 'Resources',
        href: '#',
        icon: FileText,
        children: [] as NavigationItem[]
      }
    ];

    // Add membership link (show different content based on user status)
    if (!isAuthenticated) {
      coreItems.push({
        id: 'membership',
        title: 'Join Now',
        href: '/pricing',
        icon: Target
      });
    } else if (user?.membershipType !== 'admin') {
      coreItems.push({
        id: 'membership',
        title: 'Membership',
        href: '/pricing',
        icon: Target
      });
    }

    // Note: Business tools moved to user dropdown for better organization
    // Note: Admin tools are now in the user dropdown, not main navigation

    // Process CMS pages and assign them to appropriate parent items
    cmsPages.forEach(page => {
      // Skip CMS pages that would duplicate our core navigation items
      const skipSlugs = ['home', 'events', 'organizations', 'directory', 'about', 'resources'];
      if (skipSlugs.includes(page.slug.toLowerCase())) {
        return;
      }

      const navItem: NavigationItem = {
        id: page.id,
        title: page.nav_title || page.title,
        href: `/pages/${page.slug}`,
        depth: 1
      };

      if (page.navigation_placement === 'top_nav' || page.navigation_placement === 'main') {
        // Add as top-level item
        items.push(navItem);
      } else if (page.navigation_placement === 'sub_nav' && page.parent_nav_item) {
        // Add as child to appropriate parent
        const parentItem = coreItems.find(item => item.id === page.parent_nav_item);
        if (parentItem && parentItem.children) {
          parentItem.children.push(navItem);
        }
      }
    });

    // Combine core items with CMS items
    return [...coreItems, ...items].filter(item => 
      // Show item if it has children or it's not a placeholder
      item.children?.length || item.href !== '#'
    );
  };

  const getFallbackNavigation = (): NavigationItem[] => {
    const items = [
      {
        id: 'home',
        title: 'Home',
        href: '/',
        icon: Home
      },
      {
        id: 'events',
        title: 'Events',
        href: '/events',
        icon: Calendar
      },
      {
        id: 'directory',
        title: 'Directory',
        href: '/directory',
        icon: MapPin
      },
      {
        id: 'membership',
        title: 'Membership',
        href: '/pricing',
        icon: Target
      }
    ];

    if (isAuthenticated) {
      items.splice(1, 0, {
        id: 'dashboard',
        title: 'Dashboard',
        href: user?.membershipType === 'admin' ? '/admin/dashboard' : '/dashboard',
        icon: Users
      });
    }

    return items;
  };

  const handleDropdownToggle = (itemId: string) => {
    setOpenDropdown(openDropdown === itemId ? null : itemId);
  };

  const handleLinkClick = (href: string) => {
    setOpenDropdown(null);
    if (onLinkClick) {
      onLinkClick();
    }
  };

  const handleMouseEnter = (itemId: string) => {
    // Clear any pending close timeout
    if (mouseLeaveTimeout) {
      clearTimeout(mouseLeaveTimeout);
      setMouseLeaveTimeout(null);
    }
    setOpenDropdown(itemId);
  };

  const handleMouseLeave = () => {
    // Set a delay before closing to allow user to move mouse to dropdown
    const timeout = setTimeout(() => {
      setOpenDropdown(null);
      setMouseLeaveTimeout(null);
    }, 150); // 150ms delay
    setMouseLeaveTimeout(timeout);
  };

  // Calculate dropdown width based on content (max 80 characters)
  const calculateDropdownWidth = (items: NavigationItem[]): string => {
    if (!items || items.length === 0) return 'w-64';
    
    const maxLength = Math.max(
      ...items.flatMap(item => [
        item.title.length,
        ...(item.children ? item.children.map(child => child.title.length + 4) : []) // +4 for indentation
      ])
    );
    
    if (maxLength <= 20) return 'w-64';        // 16rem = 256px
    if (maxLength <= 30) return 'w-80';        // 20rem = 320px  
    if (maxLength <= 40) return 'w-96';        // 24rem = 384px
    if (maxLength <= 60) return 'w-[32rem]';   // 32rem = 512px
    return 'w-[40rem]'; // 40rem = 640px for very long text like "Advertisement Management"
  };

  // Render multi-level menu items recursively
  const renderMenuItems = (items: NavigationItem[], level: number = 0): React.ReactNode => {
    return items.map((child) => {
      const hasGrandChildren = child.children && child.children.length > 0;
      const indentClass = level > 0 ? `ml-${level * 4}` : '';
      
      if (hasGrandChildren) {
        return (
          <div key={child.id} className={`${indentClass}`}>
            <div className="px-4 py-2 text-xs text-gray-500 font-medium border-t border-gray-700 mt-2 pt-3 first:border-t-0 first:mt-0 first:pt-0">
              {child.title}
            </div>
            {renderMenuItems(child.children!, level + 1)}
          </div>
        );
      }
      
      return (
        <Link
          key={child.id}
          to={child.href}
          onClick={() => handleLinkClick(child.href)}
          className={`block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors duration-200 ${indentClass}`}
        >
          <div className="flex items-center space-x-2">
            {child.icon && <child.icon className="h-4 w-4" />}
            <span className={level > 0 ? 'text-sm' : ''}>{child.title}</span>
          </div>
          {child.description && (
            <div className="text-xs text-gray-500 mt-1">{child.description}</div>
          )}
        </Link>
      );
    });
  };

  if (isLoading) {
    return (
      <nav className="flex items-center space-x-8">
        <div className="animate-pulse flex space-x-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-4 w-16 bg-gray-600 rounded"></div>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav className="relative flex items-center space-x-6">
      {navigation.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        const Icon = item.icon;
        
        return (
          <div key={item.id} className="relative group">
            {hasChildren ? (
              <div
                onMouseEnter={() => handleMouseEnter(item.id)}
                onMouseLeave={handleMouseLeave}
                className="relative"
              >
                <button
                  className="flex items-center space-x-1 text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium py-2"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.title}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                    openDropdown === item.id ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* Mega Menu Dropdown */}
                {openDropdown === item.id && (
                  <div 
                    className={`absolute left-0 top-full ${calculateDropdownWidth(item.children || [])} bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl z-50`}
                  >
                    <div className="p-4">
                      <div className="space-y-1">
                        {renderMenuItems(item.children || [])}
                      </div>

                      {/* Additional sections for specific dropdowns */}
                      {item.id === 'events' && (
                        <div className="border-t border-gray-700 mt-4 pt-4">
                          <div className="text-xs text-gray-500 mb-2 px-4">Quick Actions</div>
                          {isAuthenticated && user?.membershipType === 'admin' && (
                            <Link
                              to="/admin/events"
                              onClick={() => handleLinkClick('/admin/events')}
                              className="block px-4 py-2 text-sm text-gray-400 hover:text-electric-400 transition-colors"
                            >
                              Manage Events
                            </Link>
                          )}
                          {isAuthenticated && (
                            <Link
                              to="/create-event"
                              onClick={() => handleLinkClick('/create-event')}
                              className="block px-4 py-2 text-sm text-gray-400 hover:text-electric-400 transition-colors"
                            >
                              Create Event
                            </Link>
                          )}
                          <Link
                            to="/events"
                            onClick={() => handleLinkClick('/events')}
                            className="block px-4 py-2 text-sm text-gray-400 hover:text-electric-400 transition-colors"
                          >
                            Browse All Events
                          </Link>
                        </div>
                      )}

                      {item.id === 'directory' && (
                        <div className="border-t border-gray-700 mt-4 pt-4">
                          <div className="text-xs text-gray-500 mb-2 px-4">Explore</div>
                          <Link
                            to="/directory"
                            onClick={() => handleLinkClick('/directory')}
                            className="block px-4 py-2 text-sm text-gray-400 hover:text-electric-400 transition-colors"
                          >
                            View All Members
                          </Link>
                          {!isAuthenticated && (
                            <Link
                              to="/register"
                              onClick={() => handleLinkClick('/register')}
                              className="block px-4 py-2 text-sm text-gray-400 hover:text-electric-400 transition-colors"
                            >
                              Join Directory
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to={item.href}
                onClick={() => handleLinkClick(item.href)}
                className="flex items-center space-x-1 text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium py-2"
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{item.title}</span>
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
} 