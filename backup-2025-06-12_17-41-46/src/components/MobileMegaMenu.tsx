import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Calendar, MapPin, Users, Target, FileText, Home, Building2, Shield, Settings, BarChart3, Package, User, Menu } from 'lucide-react';
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

interface MobileMegaMenuProps {
  isAuthenticated: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    membershipType: 'competitor' | 'manufacturer' | 'retailer' | 'organization' | 'admin';
    profileImage?: string;
  };
  onLinkClick?: () => void;
  isOpen: boolean;
}

export default function MobileMegaMenu({ isAuthenticated, user, onLinkClick, isOpen }: MobileMegaMenuProps) {
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNavigation();
  }, [isAuthenticated, user]);

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

    // Note: Business tools moved to user section for better organization
    // Note: Admin tools are now in the user section at the top of mobile menu

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
        href: `/pages/${page.slug}`
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

    // Add built-in children for specific sections
    const eventsParent = coreItems.find(item => item.id === 'events');
    if (eventsParent && eventsParent.children) {
      if (isAuthenticated) {
        eventsParent.children.push({
          id: 'manage-events',
          title: 'Manage Events',
          href: '/admin/events'
        });
      }
      eventsParent.children.push({
        id: 'browse-events',
        title: 'Browse All Events',
        href: '/events'
      });
    }

    const directoryParent = coreItems.find(item => item.id === 'directory');
    if (directoryParent && directoryParent.children) {
      directoryParent.children.push({
        id: 'view-members',
        title: 'View All Members',
        href: '/directory'
      });
      if (!isAuthenticated) {
        directoryParent.children.push({
          id: 'join-directory',
          title: 'Join Directory',
          href: '/register'
        });
      }
    }

    // Combine core items with CMS items
    return [...coreItems, ...items].filter(item => 
      // Show item if it has children or it's not a placeholder
      item.children?.length || item.href !== '#'
    );
  };

  const getFallbackNavigation = (): NavigationItem[] => {
    return [
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
    setExpandedItems(new Set()); // Collapse all items
    if (onLinkClick) {
      onLinkClick();
    }
  };

  if (!isOpen) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="md:hidden py-4 border-t border-electric-500/20">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 bg-gray-600 rounded mx-4"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <nav className="md:hidden py-4 border-t border-electric-500/20 bg-gray-900/50 backdrop-blur-sm">
      <div className="max-w-sm mx-auto px-4">
        {/* User Section for Authenticated Users */}
        {isAuthenticated && user && (
          <div className="mb-6 pb-4 border-b border-gray-700">
            <div className="flex items-center space-x-3 px-4 py-2 mb-3">
              {user.profileImage ? (
                <img 
                  src={user.profileImage} 
                  alt={user.name}
                  className="w-10 h-10 rounded-full border-2 border-electric-500"
                />
              ) : (
                <User className="h-10 w-10 p-2 bg-electric-500 rounded-full text-white" />
              )}
              <div>
                <div className="text-white font-medium">{user.name}</div>
                <div className="text-xs text-gray-400 capitalize">{user.membershipType}</div>
              </div>
            </div>
            <div className="space-y-1">
              <Link
                to={user.membershipType === 'admin' ? '/admin/dashboard' : '/dashboard'}
                onClick={() => handleLinkClick(user.membershipType === 'admin' ? '/admin/dashboard' : '/dashboard')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-electric-400 hover:bg-gray-800/50 rounded-lg transition-colors duration-200"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/profile"
                onClick={() => handleLinkClick('/profile')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-electric-400 hover:bg-gray-800/50 rounded-lg transition-colors duration-200"
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
              <Link
                to="/profile?tab=settings"
                onClick={() => handleLinkClick('/profile?tab=settings')}
                className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-electric-400 hover:bg-gray-800/50 rounded-lg transition-colors duration-200"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>

              {/* Admin Tools for Admin Users */}
              {user.membershipType === 'admin' && (
                <>
                  <div className="border-t border-gray-700 my-3"></div>
                  <div className="px-2">
                    <div className="text-xs text-gray-500 font-medium mb-2 px-2">Admin Tools</div>
                    
                    <Link
                      to="/admin/users"
                      onClick={() => handleLinkClick('/admin/users')}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-400 hover:text-electric-400 hover:bg-gray-800/30 rounded transition-colors duration-200"
                    >
                      <Users className="h-3 w-3" />
                      <span>User Management</span>
                    </Link>
                    
                    <Link
                      to="/admin/events"
                      onClick={() => handleLinkClick('/admin/events')}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-400 hover:text-electric-400 hover:bg-gray-800/30 rounded transition-colors duration-200"
                    >
                      <Calendar className="h-3 w-3" />
                      <span>Event Management</span>
                    </Link>
                    
                    <Link
                      to="/admin/cms-pages"
                      onClick={() => handleLinkClick('/admin/cms-pages')}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-400 hover:text-electric-400 hover:bg-gray-800/30 rounded transition-colors duration-200"
                    >
                      <FileText className="h-3 w-3" />
                      <span>CMS Pages</span>
                    </Link>
                    
                    <Link
                      to="/admin/ad-management"
                      onClick={() => handleLinkClick('/admin/ad-management')}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-400 hover:text-electric-400 hover:bg-gray-800/30 rounded transition-colors duration-200"
                    >
                      <Target className="h-3 w-3" />
                      <span>Advertisement Management</span>
                    </Link>
                    
                    <Link
                      to="/admin/organizations"
                      onClick={() => handleLinkClick('/admin/organizations')}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-400 hover:text-electric-400 hover:bg-gray-800/30 rounded transition-colors duration-200"
                    >
                      <Building2 className="h-3 w-3" />
                      <span>Organizations</span>
                    </Link>
                    
                    <Link
                      to="/admin/navigation-manager"
                      onClick={() => handleLinkClick('/admin/navigation-manager')}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-400 hover:text-electric-400 hover:bg-gray-800/30 rounded transition-colors duration-200"
                    >
                      <Menu className="h-3 w-3" />
                      <span>Navigation Manager</span>
                    </Link>
                    
                    <Link
                      to="/admin/system-configuration"
                      onClick={() => handleLinkClick('/admin/system-configuration')}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-400 hover:text-electric-400 hover:bg-gray-800/30 rounded transition-colors duration-200"
                    >
                      <Settings className="h-3 w-3" />
                      <span>System Config</span>
                    </Link>
                    
                    <Link
                      to="/admin/analytics"
                      onClick={() => handleLinkClick('/admin/analytics')}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-400 hover:text-electric-400 hover:bg-gray-800/30 rounded transition-colors duration-200"
                    >
                      <BarChart3 className="h-3 w-3" />
                      <span>Analytics</span>
                    </Link>
                  </div>
                </>
              )}

              {/* Business Tools for eligible users */}
              {user.membershipType && ['retailer', 'manufacturer', 'organization'].includes(user.membershipType) && (
                <>
                  <div className="border-t border-gray-700 my-3"></div>
                  <div className="px-2">
                    <div className="text-xs text-gray-500 font-medium mb-2 px-2">Business Tools</div>
                    
                    <Link
                      to="/admin/ad-management"
                      onClick={() => handleLinkClick('/admin/ad-management')}
                      className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-400 hover:text-electric-400 hover:bg-gray-800/30 rounded transition-colors duration-200"
                    >
                      <Target className="h-3 w-3" />
                      <span>Advertisement Management</span>
                    </Link>
                    
                    {user.membershipType === 'organization' && (
                      <Link
                        to="/admin/organizations"
                        onClick={() => handleLinkClick('/admin/organizations')}
                        className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-400 hover:text-electric-400 hover:bg-gray-800/30 rounded transition-colors duration-200"
                      >
                        <Building2 className="h-3 w-3" />
                        <span>Organization Management</span>
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {navigation.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedItems.has(item.id);
            const Icon = item.icon;
            
            return (
              <div key={item.id} className="space-y-2">
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpanded(item.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:text-electric-400 hover:bg-gray-800/50 rounded-lg transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-2">
                      {Icon && <Icon className="h-5 w-5" />}
                      <span className="font-medium">{item.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                    )}
                  </button>
                ) : (
                  <Link
                    to={item.href}
                    onClick={() => handleLinkClick(item.href)}
                    className="w-full flex items-center space-x-2 px-4 py-3 text-gray-300 hover:text-electric-400 hover:bg-gray-800/50 rounded-lg transition-colors duration-200"
                  >
                    {Icon && <Icon className="h-5 w-5" />}
                    <span className="font-medium">{item.title}</span>
                  </Link>
                )}

                {/* Submenu */}
                {hasChildren && isExpanded && (
                  <div className="ml-2 space-y-1 border-l border-gray-700 pl-2">
                    {item.children?.map((child) => {
                      const childHasChildren = child.children && child.children.length > 0;
                      const isChildExpanded = expandedItems.has(child.id);
                      
                      return (
                        <div key={child.id} className="space-y-1">
                          {childHasChildren ? (
                            <button
                              onClick={() => toggleExpanded(child.id)}
                              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:text-electric-400 hover:bg-gray-800/30 rounded-md transition-colors duration-200"
                            >
                              <div className="flex items-center space-x-2">
                                {child.icon && <child.icon className="h-4 w-4" />}
                                <span>{child.title}</span>
                              </div>
                              {isChildExpanded ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </button>
                          ) : (
                            <Link
                              to={child.href}
                              onClick={() => handleLinkClick(child.href)}
                              className="block px-3 py-2 text-sm text-gray-400 hover:text-electric-400 hover:bg-gray-800/30 rounded-md transition-colors duration-200"
                            >
                              <div className="flex items-center space-x-2">
                                {child.icon && <child.icon className="h-4 w-4" />}
                                <span>{child.title}</span>
                              </div>
                            </Link>
                          )}
                          
                          {/* Third level menu */}
                          {childHasChildren && isChildExpanded && (
                            <div className="ml-2 space-y-1 border-l border-gray-600 pl-2">
                              {child.children?.map((grandChild) => (
                                <Link
                                  key={grandChild.id}
                                  to={grandChild.href}
                                  onClick={() => handleLinkClick(grandChild.href)}
                                  className="block px-3 py-1.5 text-xs text-gray-500 hover:text-electric-400 hover:bg-gray-800/20 rounded transition-colors duration-200"
                                >
                                  {grandChild.title}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Authentication Actions */}
        {!isAuthenticated && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="space-y-2">
              <Link
                to="/login"
                onClick={() => handleLinkClick('/login')}
                className="block px-4 py-2 text-gray-400 hover:text-electric-400 transition-colors text-center"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => handleLinkClick('/register')}
                className="block px-4 py-2 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 shadow-lg text-center mx-4"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 