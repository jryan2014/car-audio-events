import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Calendar, MapPin, Users, Target, FileText, Home, Building2, Shield, Settings, BarChart3, Package, Crown, Factory, Globe, Tag, Star } from 'lucide-react';
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
  Star
};

export default function MegaMenu({ isAuthenticated, user, onLinkClick }: MegaMenuProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mouseLeaveTimeout, setMouseLeaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (mouseLeaveTimeout) {
        clearTimeout(mouseLeaveTimeout);
      }
    };
  }, [mouseLeaveTimeout]);

  // Clean, curated navigation based on user context
  const getNavigationItems = (): NavigationItem[] => {
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
        is_active: true,
        children: [
          {
            id: 'browse-events',
            title: 'Browse Events',
            href: '/events',
            icon: 'Calendar',
            nav_order: 1,
            target_blank: false,
            membership_context: 'base',
            is_active: true,
            description: 'Find car audio competitions near you'
          },
          ...(isAuthenticated ? [{
            id: 'create-event',
            title: 'Create Event',
            href: '/create-event',
            icon: 'Target',
            nav_order: 2,
            target_blank: false,
            membership_context: 'free_competitor',
            is_active: true,
            description: 'Host your own competition'
          }] : []),
          ...(user?.membershipType === 'admin' ? [{
            id: 'manage-events',
            title: 'Manage Events',
            href: '/admin/events',
            icon: 'Settings',
            nav_order: 3,
            target_blank: false,
            membership_context: 'admin',
            is_active: true,
            description: 'Administrative event management'
          }] : [])
        ]
      },
      {
        id: 'directory',
        title: 'Directory',
        href: '/directory',
        icon: 'MapPin',
        nav_order: 3,
        target_blank: false,
        membership_context: 'base',
        is_active: true,
        children: [
          {
            id: 'browse-members',
            title: 'Browse Members',
            href: '/directory',
            icon: 'Users',
            nav_order: 1,
            target_blank: false,
            membership_context: 'base',
            is_active: true,
            description: 'Connect with the community'
          },
          ...(!isAuthenticated ? [{
            id: 'join-directory',
            title: 'Join Directory',
            href: '/register',
            icon: 'Target',
            nav_order: 2,
            target_blank: false,
            membership_context: 'base',
            badge_text: 'FREE',
            badge_color: 'green',
            is_active: true,
            description: 'Get listed in our directory'
          }] : [])
        ]
      }
    ];

    // Add membership-specific items
    if (!isAuthenticated) {
      baseItems.push({
        id: 'pricing',
        title: 'Join Now',
        href: '/pricing',
        icon: 'Crown',
        nav_order: 4,
        target_blank: false,
        membership_context: 'base',
        badge_text: 'FREE',
        badge_color: 'green',
        is_active: true
      });
    } else if (user?.membershipType !== 'admin') {
      baseItems.push({
        id: 'upgrade',
        title: 'Upgrade',
        href: '/pricing',
        icon: 'Crown',
        nav_order: 4,
        target_blank: false,
        membership_context: 'base',
        badge_text: 'PRO',
        badge_color: 'purple',
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

  const navigation = getNavigationItems();

  return (
    <nav className="hidden lg:flex items-center space-x-8">
      {navigation.map((item) => {
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
                {item.badge_text && item.badge_color && (
                  <Badge 
                    text={item.badge_text} 
                    color={item.badge_color} 
                    size="sm"
                    className="ml-1"
                  />
                )}
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
                {item.badge_text && item.badge_color && (
                  <Badge 
                    text={item.badge_text} 
                    color={item.badge_color} 
                    size="sm"
                    className="ml-1"
                  />
                )}
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
                            {child.badge_text && child.badge_color && (
                              <Badge 
                                text={child.badge_text} 
                                color={child.badge_color} 
                                size="sm"
                              />
                            )}
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