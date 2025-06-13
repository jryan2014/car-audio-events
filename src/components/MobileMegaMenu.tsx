import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Calendar, MapPin, Users, Target, FileText, Home, Building2, Shield, Settings, BarChart3, Package, User, Menu, Crown, Factory, Globe, Tag, Star } from 'lucide-react';
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
  Menu
};

export default function MobileMegaMenu({ isAuthenticated, user, onLinkClick, isOpen }: MobileMegaMenuProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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

  const renderIcon = (iconName?: string) => {
    if (!iconName) return null;
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
  };

  const renderNavigationItems = (items: NavigationItem[], depth: number = 0): React.ReactNode => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems.has(item.id);
      const paddingLeft = depth * 16 + 16; // 16px base + 16px per depth level

      return (
        <div key={item.id} className="border-b border-gray-700/30 last:border-b-0">
          {item.href ? (
            <Link
              to={item.href}
              target={item.target_blank ? '_blank' : undefined}
              rel={item.target_blank ? 'noopener noreferrer' : undefined}
              onClick={() => handleLinkClick(item.href!)}
              className="flex items-center justify-between py-4 text-gray-300 hover:text-white hover:bg-gray-700/20 transition-colors duration-200"
              style={{ paddingLeft: `${paddingLeft}px` }}
            >
              <div className="flex items-center space-x-3">
                {renderIcon(item.icon)}
                <span className="font-medium">{item.title}</span>
                {item.badge_text && item.badge_color && (
                  <Badge 
                    text={item.badge_text} 
                    color={item.badge_color} 
                    size="sm"
                  />
                )}
              </div>
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleExpanded(item.id);
                  }}
                  className="p-1 hover:bg-gray-600/50 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
            </Link>
          ) : (
            <button
              onClick={() => hasChildren && toggleExpanded(item.id)}
              className="flex items-center justify-between w-full py-4 text-gray-300 hover:text-white hover:bg-gray-700/20 transition-colors duration-200 text-left"
              style={{ paddingLeft: `${paddingLeft}px` }}
            >
              <div className="flex items-center space-x-3">
                {renderIcon(item.icon)}
                <span className="font-medium">{item.title}</span>
                {item.badge_text && item.badge_color && (
                  <Badge 
                    text={item.badge_text} 
                    color={item.badge_color} 
                    size="sm"
                  />
                )}
              </div>
              {hasChildren && (
                <div className="p-1">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              )}
            </button>
          )}

          {/* Render children if expanded */}
          {hasChildren && isExpanded && (
            <div className="bg-gray-800/30">
              {renderNavigationItems(item.children!, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (!isOpen) {
    return null;
  }

  const navigation = getNavigationItems();

  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-sm">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <h2 className="text-lg font-semibold text-white">Navigation</h2>
          <button
            onClick={onLinkClick}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Section */}
        {isAuthenticated && user && (
          <div className="p-4 border-b border-gray-700/50 bg-gray-800/30">
            <div className="flex items-center space-x-3 mb-4">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="h-12 w-12 rounded-full object-cover border-2 border-electric-500/50"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-electric-500 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <p className="font-semibold text-white">{user.name}</p>
                <p className="text-sm text-gray-400 capitalize">
                  {user.membershipType}
                  {user.subscriptionLevel && user.subscriptionLevel !== 'free' && (
                    <span className="ml-1 text-electric-400">({user.subscriptionLevel})</span>
                  )}
                </p>
              </div>
            </div>

            {/* User Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/dashboard"
                onClick={() => handleLinkClick('/dashboard')}
                className="flex items-center justify-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors text-sm"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/profile"
                onClick={() => handleLinkClick('/profile')}
                className="flex items-center justify-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors text-sm"
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
              {user.membershipType === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => handleLinkClick('/admin')}
                  className="flex items-center justify-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors text-sm col-span-2"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin Panel</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="py-2">
            {renderNavigationItems(navigation)}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-700/50 bg-gray-800/30">
          {!isAuthenticated ? (
            <div className="space-y-3">
              <Link
                to="/login"
                onClick={() => handleLinkClick('/login')}
                className="block w-full text-center py-3 px-4 bg-electric-600 hover:bg-electric-700 text-white rounded-lg transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => handleLinkClick('/register')}
                className="block w-full text-center py-3 px-4 border border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white rounded-lg transition-colors"
              >
                Join Now
              </Link>
            </div>
          ) : (
            <Link
              to="/logout"
              onClick={() => handleLinkClick('/logout')}
              className="block w-full text-center py-3 px-4 border border-red-600/50 hover:border-red-500 text-red-400 hover:text-red-300 rounded-lg transition-colors"
            >
              Sign Out
            </Link>
          )}
        </div>
      </div>
    </div>
  );
} 