import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Target, 
  Building2, 
  Menu as MenuIcon, 
  Settings, 
  BarChart3,
  Bot,
  Trophy,
  ChevronDown,
  UserCheck,
  Megaphone,
  Cog,
  CreditCard,
  Mail
} from 'lucide-react';

interface AdminNavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface AdminNavGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: AdminNavItem[];
}

const adminNavGroups: AdminNavGroup[] = [
  {
    name: 'Content',
    icon: FileText,
    items: [
      {
        name: 'Events',
        href: '/admin/events',
        icon: Calendar,
        description: 'Event management'
      },
      {
        name: 'Competitions',
        href: '/admin/competition-management',
        icon: Trophy,
        description: 'Competition scoring & judging'
      },
      {
        name: 'CMS Pages',
        href: '/admin/cms-pages',
        icon: FileText,
        description: 'Content management'
      },
      {
        name: 'Navigation',
        href: '/admin/navigation-manager',
        icon: MenuIcon,
        description: 'Site navigation'
      }
    ]
  },
  {
    name: 'Users',
    icon: UserCheck,
    items: [
      {
        name: 'Users',
        href: '/admin/users',
        icon: Users,
        description: 'User management'
      },
      {
        name: 'Organizations',
        href: '/admin/organizations',
        icon: Building2,
        description: 'Organization management'
      },
      {
        name: 'Membership',
        href: '/admin/membership',
        icon: UserCheck,
        description: 'Membership management'
      },
      {
        name: 'Directory',
        href: '/admin/directory-manager',
        icon: Building2,
        description: 'Directory management'
      }
    ]
  },
  {
    name: 'Marketing',
    icon: Megaphone,
    items: [
      {
        name: 'Advertisements',
        href: '/admin/ad-management',
        icon: Target,
        description: 'Advertisement management'
      },
      {
        name: 'AI Config',
        href: '/admin/ai-configuration',
        icon: Bot,
        description: 'AI services configuration'
      },
      {
        name: 'Contact Settings',
        href: '/admin/contact-settings',
        icon: Settings,
        description: 'Contact configuration'
      },
      {
        name: 'Email Settings',
        href: '/admin/email-settings',
        icon: Settings,
        description: 'Email configuration'
      },
      {
        name: 'Newsletter',
        href: '/admin/newsletter',
        icon: Mail,
        description: 'Newsletter management'
      }
    ]
  },
  {
    name: 'System',
    icon: Cog,
    items: [
      {
        name: 'Billing',
        href: '/admin/billing',
        icon: CreditCard,
        description: 'Billing & subscriptions'
      },
      {
        name: 'Billing Configuration',
        href: '/admin/billing-configuration',
        icon: Settings,
        description: 'Advanced billing settings'
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
      },
      {
        name: 'Backup',
        href: '/admin/backup',
        icon: Settings,
        description: 'Backup management'
      },
      {
        name: 'System Config',
        href: '/admin/system-configuration',
        icon: Cog,
        description: 'System configuration'
      }
    ]
  }
];

export default function AdminNavigation() {
  const location = useLocation();
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  const isGroupActive = (group: AdminNavGroup) => {
    return group.items.some(item => isActive(item.href));
  };

  const updateDropdownPosition = (groupName: string) => {
    const button = buttonRefs.current[groupName];
    if (button) {
      const rect = button.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
  };

  const handleDropdownToggle = (groupName: string) => {
    // Clear any pending close timeout
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    
    if (activeDropdown === groupName) {
      setActiveDropdown(null);
    } else {
      updateDropdownPosition(groupName);
      setActiveDropdown(groupName);
    }
  };

  const handleMouseEnter = (groupName: string) => {
    // Clear any pending close timeout
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    
    // Only update if not already active to prevent repositioning issues
    if (activeDropdown !== groupName) {
      updateDropdownPosition(groupName);
      setActiveDropdown(groupName);
    }
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setActiveDropdown(null);
    }, 300); // Increased timeout for better UX
    setCloseTimeout(timeout);
  };

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is on any button or dropdown
      const isOnButton = Object.values(buttonRefs.current).some(button => 
        button && button.contains(target)
      );
      const isOnDropdown = dropdownRef.current && dropdownRef.current.contains(target);
      
      if (!isOnButton && !isOnDropdown) {
        setActiveDropdown(null);
        if (closeTimeout) {
          clearTimeout(closeTimeout);
          setCloseTimeout(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (closeTimeout) {
        clearTimeout(closeTimeout);
      }
    };
  }, [closeTimeout]);

  return (
    <div className="bg-gray-800/30 backdrop-blur-sm border-b border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center py-3 space-x-1">
          
          {/* Dashboard - Standalone */}
          <Link
            to="/admin/dashboard"
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${isActive('/admin/dashboard')
                ? 'bg-electric-500/20 text-electric-400 border border-electric-500/30' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }
            `}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          {/* Dropdown Groups */}
          {adminNavGroups.map((group) => {
            const GroupIcon = group.icon;
            const isGroupCurrentlyActive = isGroupActive(group);
            const isDropdownOpen = activeDropdown === group.name;
            
            return (
              <div 
                key={group.name} 
                className="relative"
                onMouseLeave={handleMouseLeave}
                onMouseEnter={() => handleMouseEnter(group.name)}
              >
                <button
                  ref={(el) => { buttonRefs.current[group.name] = el; }}
                  onClick={() => handleDropdownToggle(group.name)}
                  className={`
                    flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isGroupCurrentlyActive || isDropdownOpen
                      ? 'bg-electric-500/20 text-electric-400 border border-electric-500/30' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }
                  `}
                >
                  <GroupIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">{group.name}</span>
                  <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* Portal-based Dropdown Menu */}
                {isDropdownOpen && createPortal(
                  <div 
                    ref={dropdownRef}
                    className="fixed w-64 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl z-[999999]"
                    style={{
                      top: `${dropdownPosition.top}px`,
                      left: `${dropdownPosition.left}px`
                    }}
                    onMouseEnter={() => handleMouseEnter(group.name)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div className="p-2">
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        const itemActive = isActive(item.href);
                        
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setActiveDropdown(null)}
                            className={`
                              flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 w-full
                              ${itemActive
                                ? 'bg-electric-500/25 text-electric-300 border border-electric-500/40' 
                                : 'text-white hover:text-electric-400 hover:bg-gray-700'
                              }
                            `}
                          >
                            <ItemIcon className="h-4 w-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-gray-400 truncate">{item.description}</div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 