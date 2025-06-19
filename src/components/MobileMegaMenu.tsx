import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Calendar, MapPin, Users, FileText, Home, Building2, Settings, BarChart3, User, Crown, BookOpen, HelpCircle, MessageSquare, Lightbulb, Search } from 'lucide-react';
import Badge from './Badge';
import { GlobalSearch } from './GlobalSearch';

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

interface SimpleNavItem {
  id: string;
  title: string;
  href?: string;
  icon: React.ComponentType<any>;
  children?: SimpleNavItem[];
}

export default function MobileMegaMenu({ isAuthenticated, user, onLinkClick, isOpen }: MobileMegaMenuProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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

  // Simple hardcoded navigation - no database calls, no complex logic
  const navigationItems: SimpleNavItem[] = [
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
      id: 'resources',
      title: 'Resources',
      icon: BookOpen,
      children: [
        {
          id: 'get-holt',
          title: 'Get Holt',
          href: '/get-holt',
          icon: Lightbulb
        },
        {
          id: 'organizations',
          title: 'Organizations',
          href: '/organizations',
          icon: Building2
        },
        {
          id: 'help-center',
          title: 'Help Center',
          href: '/help',
          icon: HelpCircle
        },
        {
          id: 'contact-us',
          title: 'Contact Us',
          href: '/contact',
          icon: MessageSquare
        }
      ]
    }
  ];

  // Add membership-specific items
  if (isAuthenticated && user) {
    navigationItems.push({
      id: 'dashboard',
      title: 'Dashboard',
      href: user.membershipType === 'admin' ? '/admin/dashboard' : '/dashboard',
      icon: BarChart3
    });
  }

  const renderNavigationItems = (items: SimpleNavItem[], depth: number = 0): React.ReactNode => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems.has(item.id);
      const paddingLeft = depth * 16 + 16;
      const IconComponent = item.icon;

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