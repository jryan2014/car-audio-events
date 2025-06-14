import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Target, 
  Building2, 
  Menu as MenuIcon, 
  Settings, 
  BarChart3 
} from 'lucide-react';

interface AdminNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const adminNavItems: AdminNavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    description: 'Overview and statistics'
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'User management'
  },
  {
    name: 'Events',
    href: '/admin/events',
    icon: Calendar,
    description: 'Event management'
  },
  {
    name: 'CMS Pages',
    href: '/admin/cms-pages',
    icon: FileText,
    description: 'Content management'
  },
  {
    name: 'Organizations',
    href: '/admin/organizations',
    icon: Building2,
    description: 'Organization management'
  },
  {
    name: 'Ads',
    href: '/admin/ad-management',
    icon: Target,
    description: 'Advertisement management'
  },
  {
    name: 'Navigation',
    href: '/admin/navigation-manager',
    icon: MenuIcon,
    description: 'Site navigation'
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'System settings'
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'Analytics and reports'
  }
];

export default function AdminNavigation() {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  return (
    <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto py-3">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200
                  ${active 
                    ? 'bg-electric-500/20 text-electric-400 border border-electric-500/30' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }
                `}
                title={item.description}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
} 