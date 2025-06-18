import React, { useState, useEffect, useRef } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Menu, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff,
  ExternalLink,
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
  ChevronRight,
  AlertTriangle,
  Info,
  HelpCircle,
  Move,
  Link as LinkIcon,
  Crown,
  Factory,
  Globe,
  Tag,
  Star,
  MessageSquare,
  Search,
  ChevronDown,
  BookOpen,
  FileQuestion,
  Lightbulb,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { scrollToRef, useAutoScrollToForm, useAutoFocusFirstInput } from '../utils/focusUtils';

interface NavigationItem {
  id: string;
  title: string;
  href?: string;
  icon?: string;
  nav_order: number;
  parent_id?: string;
  target_blank: boolean;
  visibility_rules: {
    public?: boolean;
    membershipTypes?: string[];
  };
  membership_context?: string;
  membership_contexts?: string[]; // New array field for multi-select
  badge_text?: string;
  badge_color?: string;
  description?: string;
  priority?: number;
  is_active: boolean;
  cms_page_id?: string;
  children?: NavigationItem[];
  created_at: string;
  updated_at: string;
}

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

interface FormData {
  title: string;
  href: string;
  icon: string;
  parent_id: string;
  target_blank: boolean;
  visibility_rules: { public?: boolean; membershipTypes?: string[] };
  membership_context: string;
  membership_contexts: string[]; // New array field for multi-select
  badge_text: string;
  badge_color: string;
  description: string;
  priority: number;
  is_active: boolean;
  cms_page_id: string;
}

// Tooltip component
const Tooltip = ({ children, content }: { children: React.ReactNode; content: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      const triggerRect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Set initial position to measure tooltip dimensions
      tooltip.style.visibility = 'hidden';
      tooltip.style.display = 'block';
      const tooltipRect = tooltip.getBoundingClientRect();
      tooltip.style.visibility = 'visible';

      // Determine best position based on available space
      let bestPosition: 'top' | 'bottom' | 'left' | 'right' = 'bottom';
      let adjustX = 0;
      let adjustY = 0;

      // Check space above
      const spaceAbove = triggerRect.top;
      // Check space below  
      const spaceBelow = viewportHeight - triggerRect.bottom;
      // Check space left
      const spaceLeft = triggerRect.left;
      // Check space right
      const spaceRight = viewportWidth - triggerRect.right;

      // Prefer bottom if there's enough space, otherwise top
      if (spaceBelow >= tooltipRect.height + 8) {
        bestPosition = 'bottom';
      } else if (spaceAbove >= tooltipRect.height + 8) {
        bestPosition = 'top';
      } else if (spaceRight >= tooltipRect.width + 8) {
        bestPosition = 'right';
      } else if (spaceLeft >= tooltipRect.width + 8) {
        bestPosition = 'left';
      } else {
        // Force bottom and adjust if needed
        bestPosition = 'bottom';
      }

      // For horizontal positions (top/bottom), ensure tooltip doesn't go off screen horizontally
      if (bestPosition === 'top' || bestPosition === 'bottom') {
        const tooltipLeft = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        if (tooltipLeft < 8) {
          adjustX = 8 - tooltipLeft;
        } else if (tooltipLeft + tooltipRect.width > viewportWidth - 8) {
          adjustX = (viewportWidth - 8) - (tooltipLeft + tooltipRect.width);
        }
      }

      // For vertical positions (left/right), ensure tooltip doesn't go off screen vertically
      if (bestPosition === 'left' || bestPosition === 'right') {
        const tooltipTop = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        if (tooltipTop < 8) {
          adjustY = 8 - tooltipTop;
        } else if (tooltipTop + tooltipRect.height > viewportHeight - 8) {
          adjustY = (viewportHeight - 8) - (tooltipTop + tooltipRect.height);
        }
      }

      setPosition(bestPosition);
      setAdjustedPosition({ x: adjustX, y: adjustY });
    }
  }, [isVisible]);

  const getTooltipClasses = () => {
    const baseClasses = "absolute z-[9999] px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-xl border border-gray-700 w-max max-w-xs sm:max-w-sm md:max-w-md";
    
    switch (position) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
    }
  };

  const getArrowClasses = () => {
    const baseClasses = "absolute w-0 h-0";
    
    switch (position) {
      case 'top':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900`;
      case 'bottom':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900`;
      case 'left':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900`;
      case 'right':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900`;
      default:
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900`;
    }
  };

  const getTooltipStyle = () => {
    return {
      transform: `translate(${adjustedPosition.x}px, ${adjustedPosition.y}px)`,
    };
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {isVisible && (
        <div 
          ref={tooltipRef} 
          className={getTooltipClasses()}
          style={getTooltipStyle()}
        >
          <div className="relative">
            <div className="whitespace-pre-line leading-relaxed break-words text-left">{content}</div>
            <div className={getArrowClasses()}></div>
          </div>
        </div>
      )}
    </div>
  );
};

const iconOptions = [
  { value: 'Home', label: 'Home', icon: Home },
  { value: 'Calendar', label: 'Calendar', icon: Calendar },
  { value: 'MapPin', label: 'Map Pin', icon: MapPin },
  { value: 'Users', label: 'Users', icon: Users },
  { value: 'Target', label: 'Target', icon: Target },
  { value: 'FileText', label: 'File Text', icon: FileText },
  { value: 'Building2', label: 'Building', icon: Building2 },
  { value: 'Shield', label: 'Shield', icon: Shield },
  { value: 'Settings', label: 'Settings', icon: Settings },
  { value: 'BarChart3', label: 'Analytics', icon: BarChart3 },
  { value: 'Menu', label: 'Menu', icon: Menu },
  { value: 'LinkIcon', label: 'Link', icon: LinkIcon },
  { value: 'Crown', label: 'Crown', icon: Crown },
  { value: 'Factory', label: 'Factory', icon: Factory },
  { value: 'Globe', label: 'Globe', icon: Globe },
  { value: 'Tag', label: 'Tag', icon: Tag },
  { value: 'Star', label: 'Star', icon: Star },
  // Informational Icons
  { value: 'Info', label: 'Info (i)', icon: Info },
  { value: 'HelpCircle', label: 'Help Circle', icon: HelpCircle },
  { value: 'BookOpen', label: 'Book/Guide', icon: BookOpen },
  { value: 'FileQuestion', label: 'FAQ', icon: FileQuestion },
  { value: 'Lightbulb', label: 'Tips/Ideas', icon: Lightbulb },
  { value: 'AlertCircle', label: 'Important Info', icon: AlertCircle },
  { value: 'CheckCircle', label: 'Guidelines', icon: CheckCircle },
  { value: 'MessageSquare', label: 'Discussion', icon: MessageSquare }
];

export default function NavigationManager() {
  const { user } = useAuth();
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<NavigationItem[]>([]);
  const [cmsPages, setCmsPages] = useState<CMSPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterContext, setFilterContext] = useState('all');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  
  // Icon dropdown state
  const [showIconDropdown, setShowIconDropdown] = useState(false);

  // Ref for modal auto-scroll
  const modalRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    href: '',
    icon: '',
    parent_id: '',
    target_blank: false,
    visibility_rules: { public: true },
    membership_context: 'base',
    membership_contexts: ['base'], // Initialize with base context
    badge_text: '',
    badge_color: '',
    description: '',
    priority: 1,
    is_active: true,
    cms_page_id: ''
  });

  // Check authentication and admin status
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    loadData();
  }, []);

  // Auto-scroll to modal when it becomes visible
  useAutoScrollToForm(modalRef, showItemModal);
  
  // Auto-focus first input when modal becomes visible
  useAutoFocusFirstInput(modalRef, showItemModal);

  // Filter navigation items based on search and filters
  useEffect(() => {
    let filtered = [...navigationItems];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesUrl = item.href?.toLowerCase().includes(query);
        const matchesDescription = item.description?.toLowerCase().includes(query);
        const matchesBadge = item.badge_text?.toLowerCase().includes(query);
        
        return matchesTitle || matchesUrl || matchesDescription || matchesBadge;
      });
    }

    // Apply membership context filter
    if (filterContext !== 'all') {
      filtered = filtered.filter(item => {
        if (item.membership_contexts && item.membership_contexts.length > 0) {
          return item.membership_contexts.includes(filterContext);
        }
        return item.membership_context === filterContext;
      });
    }

    // Apply active filter
    if (showActiveOnly) {
      filtered = filtered.filter(item => item.is_active);
    }

    setFilteredItems(filtered);
  }, [navigationItems, searchQuery, filterContext, showActiveOnly]);

  // Close icon dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showIconDropdown) {
        const target = event.target as Element;
        if (!target.closest('.icon-dropdown-container')) {
          setShowIconDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showIconDropdown]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadNavigationItems(),
        loadCMSPages()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load navigation data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNavigationItems = async () => {
    const { data, error } = await supabase
      .from('navigation_menu_items')
      .select('*')
      .order('nav_order');

    if (error) {
      console.error('Error loading navigation items:', error);
      throw error;
    }

    // Build hierarchical structure
    const items = buildHierarchy(data || []);
    setNavigationItems(items);
  };

  const loadCMSPages = async () => {
    const { data, error } = await supabase
      .from('cms_pages')
      .select('id, title, slug, navigation_placement, parent_nav_item, nav_order, nav_title, status')
      .eq('status', 'published')
      .order('nav_order');

    if (error) {
      console.error('Error loading CMS pages:', error);
      // Don't throw error for CMS pages as they might not exist
      setCmsPages([]);
      return;
    }

    setCmsPages(data || []);
  };

  const buildHierarchy = (items: NavigationItem[]): NavigationItem[] => {
    const itemMap = new Map<string, NavigationItem>();
    const roots: NavigationItem[] = [];

    // Initialize all items with children array
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Build hierarchy
    items.forEach(item => {
      const navItem = itemMap.get(item.id)!;
      if (item.parent_id) {
        const parent = itemMap.get(item.parent_id);
        if (parent) {
          parent.children!.push(navItem);
        }
      } else {
        roots.push(navItem);
      }
    });

    return roots;
  };

  const handleCreateItem = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      href: '',
      icon: '',
      parent_id: '',
      target_blank: false,
      visibility_rules: { public: true },
      membership_context: 'base',
      membership_contexts: ['base'], // Initialize with base context
      badge_text: '',
      badge_color: '',
      description: '',
      priority: 1,
      is_active: true,
      cms_page_id: ''
    });
    setShowItemModal(true);
  };

  const handleEditItem = (item: NavigationItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      href: item.href || '',
      icon: item.icon || '',
      parent_id: item.parent_id || '',
      target_blank: item.target_blank,
      visibility_rules: item.visibility_rules,
      membership_context: item.membership_context || 'base',
      membership_contexts: (item as any).membership_contexts || [item.membership_context || 'base'], // Support both old and new format
      badge_text: item.badge_text || '',
      badge_color: item.badge_color || '',
      description: item.description || '',
      priority: item.priority || 1,
      is_active: item.is_active,
      cms_page_id: item.cms_page_id || ''
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    try {
      setError('');
      
      if (!formData.title.trim()) {
        setError('Title is required');
        return;
      }

      const itemData = {
        title: formData.title.trim(),
        href: formData.href.trim() || null,
        icon: formData.icon || null,
        parent_id: formData.parent_id || null,
        target_blank: formData.target_blank,
        visibility_rules: formData.visibility_rules,
        membership_context: formData.membership_contexts[0] || 'base', // Keep backward compatibility
        // membership_contexts: formData.membership_contexts, // TODO: Enable after running enhance-navigation-multi-context.sql
        badge_text: formData.badge_text || null,
        badge_color: formData.badge_color || null,
        description: formData.description || null,
        priority: formData.priority,
        is_active: formData.is_active,
        cms_page_id: formData.cms_page_id || null,
        nav_order: editingItem ? editingItem.nav_order : getNextOrder(formData.parent_id)
      };

      if (editingItem) {
        const { error } = await supabase
          .from('navigation_menu_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        setSuccess('Navigation item updated successfully');
      } else {
        const { error } = await supabase
          .from('navigation_menu_items')
          .insert([itemData]);

        if (error) throw error;
        setSuccess('Navigation item created successfully');
      }

      setShowItemModal(false);
      loadNavigationItems();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this navigation item? This will also delete any sub-items.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('navigation_menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      setSuccess('Navigation item deleted successfully');
      loadNavigationItems();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleToggleActive = async (item: NavigationItem) => {
    try {
      const { error } = await supabase
        .from('navigation_menu_items')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) throw error;
      setSuccess(`Navigation item ${!item.is_active ? 'activated' : 'deactivated'}`);
      loadNavigationItems();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleUpdateOrder = async (itemId: string, direction: 'up' | 'down') => {
    try {
      const allItems = getAllItems(navigationItems);
      const currentItem = allItems.find(item => item.id === itemId);
      if (!currentItem) return;

      const siblings = allItems.filter(item => item.parent_id === currentItem.parent_id);
      const currentIndex = siblings.findIndex(item => item.id === itemId);
      
      if (direction === 'up' && currentIndex > 0) {
        const swapItem = siblings[currentIndex - 1];
        await swapOrders(currentItem, swapItem);
      } else if (direction === 'down' && currentIndex < siblings.length - 1) {
        const swapItem = siblings[currentIndex + 1];
        await swapOrders(currentItem, swapItem);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const swapOrders = async (item1: NavigationItem, item2: NavigationItem) => {
    const { error } = await supabase.rpc('swap_navigation_orders', {
      id1: item1.id,
      id2: item2.id,
      order1: item2.nav_order,
      order2: item1.nav_order
    });

    if (error) {
      // Fallback to individual updates if RPC doesn't exist
      await supabase.from('navigation_menu_items').update({ nav_order: item2.nav_order }).eq('id', item1.id);
      await supabase.from('navigation_menu_items').update({ nav_order: item1.nav_order }).eq('id', item2.id);
    }

    setSuccess('Navigation order updated');
    loadNavigationItems();
  };

  const getAllItems = (items: NavigationItem[]): NavigationItem[] => {
    let allItems: NavigationItem[] = [];
    items.forEach(item => {
      allItems.push(item);
      if (item.children && item.children.length > 0) {
        allItems = allItems.concat(getAllItems(item.children));
      }
    });
    return allItems;
  };

  const getNextOrder = (parentId?: string): number => {
    const allItems = getAllItems(navigationItems);
    const siblings = allItems.filter(item => item.parent_id === parentId);
    return siblings.length > 0 ? Math.max(...siblings.map(item => item.nav_order)) + 1 : 1;
  };

  const updateCMSPagePlacement = async (pageId: string, placement: string, parentNavItem?: string) => {
    try {
      const { error } = await supabase
        .from('cms_pages')
        .update({
          navigation_placement: placement,
          parent_nav_item: parentNavItem || null
        })
        .eq('id', pageId);

      if (error) throw error;
      
      // If setting to sub_nav with a parent, automatically create navigation item
      if (placement === 'sub_nav' && parentNavItem) {
        await createNavigationFromCMSPage(pageId, parentNavItem);
      }
      
      setSuccess('CMS page navigation updated successfully');
      loadCMSPages();
      loadNavigationItems(); // Reload navigation to show new items
    } catch (error: any) {
      setError(error.message);
    }
  };

  const createNavigationFromCMSPage = async (pageId: string, parentId: string) => {
    try {
      // Get the CMS page details
      const { data: page, error: pageError } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('id', pageId)
        .single();

      if (pageError) throw pageError;

      // Check if navigation item already exists for this CMS page
      const { data: existingNav } = await supabase
        .from('navigation_menu_items')
        .select('id')
        .eq('cms_page_id', pageId)
        .single();

      if (existingNav) {
        // Update existing navigation item
        const { error: updateError } = await supabase
          .from('navigation_menu_items')
          .update({
            parent_id: parentId,
            title: page.nav_title || page.title,
            href: `/pages/${page.slug}`,
            nav_order: getNextOrder(parentId)
          })
          .eq('id', existingNav.id);

        if (updateError) throw updateError;
      } else {
        // Create new navigation item
        const { error: insertError } = await supabase
          .from('navigation_menu_items')
          .insert([{
            title: page.nav_title || page.title,
            href: `/pages/${page.slug}`,
            icon: 'FileText',
            nav_order: getNextOrder(parentId),
            parent_id: parentId,
            target_blank: false,
            visibility_rules: { public: true },
            membership_context: 'base',
            membership_contexts: ['base'],
            is_active: true,
            cms_page_id: pageId
          }]);

        if (insertError) throw insertError;
      }
    } catch (error: any) {
      console.error('Error creating navigation from CMS page:', error);
      throw error;
    }
  };

  const syncAllCMSPages = async () => {
    try {
      setIsLoading(true);
      
      // Get all CMS pages that should be in navigation
      const { data: cmsPages, error } = await supabase
        .from('cms_pages')
        .select('*')
        .in('navigation_placement', ['main', 'sub_nav'])
        .eq('status', 'published');

      if (error) throw error;

      let created = 0;
      let updated = 0;

      for (const page of cmsPages || []) {
        // Check if navigation item already exists
        const { data: existingNav } = await supabase
          .from('navigation_menu_items')
          .select('id')
          .eq('cms_page_id', page.id)
          .single();

        const navData = {
          title: page.nav_title || page.title,
          href: `/pages/${page.slug}`,
          icon: 'FileText',
          parent_id: page.navigation_placement === 'sub_nav' ? page.parent_nav_item : null,
          target_blank: false,
          visibility_rules: { public: true },
          membership_context: 'base',
          membership_contexts: ['base'],
          is_active: true,
          cms_page_id: page.id
        };

        if (existingNav) {
          // Update existing
          const { error: updateError } = await supabase
            .from('navigation_menu_items')
            .update(navData)
            .eq('id', existingNav.id);

          if (updateError) throw updateError;
          updated++;
        } else {
          // Create new
          const { error: insertError } = await supabase
            .from('navigation_menu_items')
            .insert([{
              ...navData,
              nav_order: getNextOrder(navData.parent_id)
            }]);

          if (insertError) throw insertError;
          created++;
        }
      }

      setSuccess(`Sync complete: ${created} created, ${updated} updated`);
      loadNavigationItems();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderNavigationItems = (items: NavigationItem[], level: number = 0) => {
    return items.map((item, index) => (
      <div key={item.id} className="border border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-8 rounded ${item.is_active ? 'bg-electric-500' : 'bg-gray-600'}`}></div>
            
            <div className="flex items-center space-x-2">
              {item.icon && (() => {
                const IconComponent = iconOptions.find(opt => opt.value === item.icon)?.icon;
                return IconComponent ? <IconComponent className="h-4 w-4 text-gray-400" /> : null;
              })()}
              <span className="text-white font-medium">{item.title}</span>
              {!item.is_active && <EyeOff className="h-4 w-4 text-gray-500" />}
              {item.target_blank && <ExternalLink className="h-3 w-3 text-gray-500" />}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">#{item.nav_order}</span>
            
            {/* Order controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleUpdateOrder(item.id, 'up')}
                className="p-1 text-gray-400 hover:text-white rounded"
                title="Move up"
                disabled={index === 0}
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleUpdateOrder(item.id, 'down')}
                className="p-1 text-gray-400 hover:text-white rounded"
                title="Move down"
                disabled={index === items.length - 1}
              >
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>

            <button
              onClick={() => handleToggleActive(item)}
              className={`p-1 rounded ${item.is_active ? 'text-electric-400 hover:text-electric-300' : 'text-gray-500 hover:text-gray-400'}`}
              title={item.is_active ? 'Hide' : 'Show'}
            >
              {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>

            <button
              onClick={() => handleEditItem(item)}
              className="p-1 text-blue-400 hover:text-blue-300 rounded"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>

            <button
              onClick={() => handleDeleteItem(item.id)}
              className="p-1 text-red-400 hover:text-red-300 rounded"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-400 space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">URL:</span> {item.href || '(No URL)'}
            </div>
            <div>
              <span className="font-medium">Context:</span> {
                // Show multiple contexts if available, otherwise fall back to single context
                item.membership_contexts && item.membership_contexts.length > 0 
                  ? item.membership_contexts.map(ctx => 
                      membershipContextOptions.find(opt => opt.value === ctx)?.label
                    ).filter(Boolean).join(', ')
                  : membershipContextOptions.find(opt => opt.value === (item.membership_context || 'base'))?.label || 'Base (Everyone)'
              }
            </div>
          </div>
          
          {(item.badge_text || item.description) && (
            <div className="flex items-center space-x-4">
              {item.badge_text && (
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Badge:</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    item.badge_color === 'green' ? 'bg-green-500/20 text-green-400' :
                    item.badge_color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                    item.badge_color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                    item.badge_color === 'red' ? 'bg-red-500/20 text-red-400' :
                    item.badge_color === 'indigo' ? 'bg-indigo-500/20 text-indigo-400' :
                    item.badge_color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                    item.badge_color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {item.badge_text}
                  </span>
                </div>
              )}
              
              {item.description && (
                <div className="flex-1">
                  <span className="font-medium">Description:</span> {item.description}
                </div>
              )}
            </div>
          )}
          
          {item.priority && item.priority > 1 && (
            <div>
              <span className="font-medium">Priority:</span> {item.priority}/10
            </div>
          )}
        </div>

        {item.children && item.children.length > 0 && (
          <div className="ml-6 space-y-2 border-l border-gray-700 pl-4">
            <div className="text-xs text-gray-500 font-medium">Sub-items:</div>
            {renderNavigationItems(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const membershipContextOptions = [
    { value: 'base', label: 'Base (Everyone)', description: 'Visible to all users including non-members' },
    { value: 'free_competitor', label: 'Free Competitor', description: 'Visible to free competitor members' },
    { value: 'pro_competitor', label: 'Pro Competitor', description: 'Visible to pro competitor members' },
    { value: 'retailer', label: 'Retailer', description: 'Visible to retailer members' },
    { value: 'manufacturer', label: 'Manufacturer', description: 'Visible to manufacturer members' },
    { value: 'organization', label: 'Organization', description: 'Visible to organization members' },
    { value: 'admin', label: 'Admin Only', description: 'Visible only to administrators' }
  ];

  const badgeColorOptions = [
    { value: '', label: 'No Badge' },
    { value: 'green', label: 'Green (FREE)' },
    { value: 'purple', label: 'Purple (PRO)' },
    { value: 'orange', label: 'Orange (BUSINESS)' },
    { value: 'red', label: 'Red (ENTERPRISE/ADMIN)' },
    { value: 'indigo', label: 'Indigo (ORG)' },
    { value: 'yellow', label: 'Yellow (LIMITED)' },
    { value: 'blue', label: 'Blue (UPGRADE)' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <div className="text-white">Loading navigation manager...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Navigation Manager</h1>
            <p className="text-gray-400">Control your website's navigation structure and menu items</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowHelpModal(true)}
              className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-2"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Help</span>
            </button>
            
            <button
              onClick={handleCreateItem}
              className="bg-electric-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-600 transition-colors duration-200 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Menu Item</span>
            </button>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="mb-8 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-blue-400 font-medium mb-2">Quick Start Guide</h3>
              <div className="text-gray-300 text-sm space-y-1">
                <p>• <strong>Add Menu Items:</strong> Click "Add Menu Item" to create new navigation links</p>
                <p>• <strong>Organize Structure:</strong> Use parent/child relationships to create dropdown menus</p>
                <p>• <strong>Control Visibility:</strong> Set who can see each menu item (public, members, admins)</p>
                <p>• <strong>Reorder Items:</strong> Use the up/down arrows to change menu order</p>
                <p>• <strong>Toggle Active:</strong> Use the eye icon to show/hide menu items without deleting them</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-8 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Search className="h-5 w-5 text-gray-400" />
            <h3 className="text-white font-medium">Search & Filter Navigation Items</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-electric-500"
                  placeholder="Search by title, URL, description, or badge..."
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Membership Context Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Filter by Context</label>
              <select
                value={filterContext}
                onChange={(e) => setFilterContext(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-electric-500"
              >
                <option value="all">All Contexts</option>
                {membershipContextOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <label className="flex items-center space-x-2 p-2 bg-gray-700 rounded-lg border border-gray-600">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-electric-500"
                />
                <span className="text-white text-sm">Active only</span>
              </label>
            </div>
          </div>

          {/* Search Results Summary */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-gray-400">
              {searchQuery || filterContext !== 'all' || showActiveOnly ? (
                <>
                  Showing {filteredItems.length} of {navigationItems.length} items
                  {searchQuery && <span className="ml-2">• Search: "{searchQuery}"</span>}
                  {filterContext !== 'all' && (
                    <span className="ml-2">• Context: {membershipContextOptions.find(opt => opt.value === filterContext)?.label}</span>
                  )}
                  {showActiveOnly && <span className="ml-2">• Active only</span>}
                </>
              ) : (
                `${navigationItems.length} total navigation items`
              )}
            </div>
            
            {(searchQuery || filterContext !== 'all' || showActiveOnly) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterContext('all');
                  setShowActiveOnly(false);
                }}
                className="text-electric-400 hover:text-electric-300 text-sm font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center space-x-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400">
            {success}
          </div>
        )}

        {/* Navigation Structure */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Navigation Items */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">Navigation Structure</h2>
              <div className="text-sm text-gray-400">
                {searchQuery || filterContext !== 'all' || showActiveOnly ? (
                  `${filteredItems.length} of ${navigationItems.length} items`
                ) : (
                  `${navigationItems.length} top-level items`
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              {filteredItems.length > 0 ? (
                renderNavigationItems(filteredItems)
              ) : navigationItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-gray-800/30 rounded-lg border border-gray-700">
                  <Menu className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Navigation Items</h3>
                  <p className="mb-4">Get started by creating your first menu item</p>
                  <button
                    onClick={handleCreateItem}
                    className="bg-electric-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-electric-600 transition-colors duration-200 flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create First Menu Item</span>
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 bg-gray-800/30 rounded-lg border border-gray-700">
                  <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Results Found</h3>
                  <p className="mb-4">
                    {searchQuery ? (
                      <>No navigation items match "<strong className="text-white">{searchQuery}</strong>"</>
                    ) : (
                      <>No navigation items match your current filters</>
                    )}
                  </p>
                  <div className="flex items-center justify-center space-x-3">
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterContext('all');
                        setShowActiveOnly(false);
                      }}
                      className="bg-gray-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-600 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>Clear Filters</span>
                    </button>
                    <button
                      onClick={handleCreateItem}
                      className="bg-electric-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-600 transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add New Item</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CMS Pages Panel */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">CMS Pages Integration</h2>
              <div className="flex items-center space-x-2">
                <Tooltip content="Automatically creates navigation items for all published CMS pages that are set to 'main' or 'sub_nav' placement. This will create or update navigation items to match your CMS page settings.">
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                </Tooltip>
                <button
                  onClick={syncAllCMSPages}
                  disabled={isLoading}
                  className="bg-electric-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-electric-600 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
                >
                  <Settings className="h-4 w-4" />
                  <span>Sync All</span>
                </button>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm mb-4">
                Automatically add CMS pages to navigation menus. Use "Sync All" to create navigation items for all published pages.
                <br />
                <strong>Sub Navigation:</strong> Select "Sub navigation" and choose a parent menu item to create dropdown menus.
              </p>
              
              {cmsPages.length > 0 ? (
                <div className="space-y-3">
                  {cmsPages.map((page) => (
                    <div key={page.id} className="border border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium text-sm">{page.title}</span>
                          {/* Show if navigation item exists */}
                          {navigationItems.some(item => 
                            getAllItems([item]).some(navItem => navItem.cms_page_id === page.id)
                          ) && (
                            <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                              ✓ In Navigation
                            </span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          page.navigation_placement === 'main' ? 'bg-electric-500/20 text-electric-400' :
                          page.navigation_placement === 'sub_nav' ? 'bg-purple-500/20 text-purple-400' :
                          page.navigation_placement === 'footer' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {page.navigation_placement || 'none'}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <select
                          value={page.navigation_placement || 'none'}
                          onChange={(e) => updateCMSPagePlacement(page.id, e.target.value, page.parent_nav_item)}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                        >
                          <option value="none">Not in navigation</option>
                          <option value="main">Main navigation</option>
                          <option value="footer">Footer</option>
                          <option value="sub_nav">Sub navigation</option>
                        </select>
                        
                        {page.navigation_placement === 'sub_nav' && (
                          <select
                            value={page.parent_nav_item || ''}
                            onChange={(e) => updateCMSPagePlacement(page.id, page.navigation_placement, e.target.value)}
                            className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-xs"
                          >
                            <option value="">Select parent menu item</option>
                            {getAllItems(navigationItems)
                              .filter(item => !item.parent_id) // Only show top-level items as potential parents
                              .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.title}
                              </option>
                            ))}
                          </select>
                        )}
                        
                        {page.navigation_placement === 'sub_nav' && page.parent_nav_item && (
                          <div className="text-xs text-gray-400">
                            Will appear under: {getAllItems(navigationItems).find(item => item.id === page.parent_nav_item)?.title || 'Unknown'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No CMS pages found</p>
                  <p className="text-xs">Create pages in the CMS to manage their navigation placement</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                                  <h3 className="text-lg sm:text-xl font-bold text-white">Navigation Manager Help</h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6 text-gray-300">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <Crown className="h-5 w-5 text-electric-400" />
                    <span>Enhanced Navigation System</span>
                  </h4>
                  <p className="mb-4">
                    This advanced navigation system creates membership-specific menus that encourage upgrades by showing users 
                    what features are available at different membership levels. Each user sees navigation tailored to their membership tier.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <Users className="h-5 w-5 text-electric-400" />
                    <span>Membership Contexts Explained</span>
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Globe className="h-4 w-4 text-green-400" />
                        <h5 className="font-medium text-green-400">Base (Everyone)</h5>
                      </div>
                      <p className="text-sm">Visible to all users including non-members. Use for: Home, About, Events, Contact, etc.</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="h-4 w-4 text-blue-400" />
                        <h5 className="font-medium text-blue-400">Free Competitor</h5>
                      </div>
                      <p className="text-sm">Basic member features. Use for: Basic Dashboard, Limited Events, Profile. Add "UPGRADE" badges to encourage Pro.</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Crown className="h-4 w-4 text-purple-400" />
                        <h5 className="font-medium text-purple-400">Pro Competitor</h5>
                      </div>
                      <p className="text-sm">Premium features. Use for: Pro Dashboard, Analytics, Team Management, System Showcase.</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Building2 className="h-4 w-4 text-orange-400" />
                        <h5 className="font-medium text-orange-400">Retailer</h5>
                      </div>
                      <p className="text-sm">Business features. Use for: Business Dashboard, Create Events, Customer Analytics, Inventory.</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Factory className="h-4 w-4 text-red-400" />
                        <h5 className="font-medium text-red-400">Manufacturer</h5>
                      </div>
                      <p className="text-sm">Enterprise features. Use for: Product Catalog, Dealer Network, Brand Showcase, API Access.</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Users className="h-4 w-4 text-indigo-400" />
                        <h5 className="font-medium text-indigo-400">Organization</h5>
                      </div>
                      <p className="text-sm">Group management. Use for: Organization Hub, Member Management, Event Hosting, Custom Branding.</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Shield className="h-4 w-4 text-red-500" />
                        <h5 className="font-medium text-red-500">Admin Only</h5>
                      </div>
                      <p className="text-sm">Administrative features. Use for: User Management, System Settings, Navigation Manager, Analytics.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <Tag className="h-5 w-5 text-electric-400" />
                    <span>Badge System</span>
                  </h4>
                  <p className="mb-3">Badges help highlight features and encourage upgrades:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400">FREE</span>
                      <span className="text-sm">Green - Free features</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-purple-500/20 text-purple-400">PRO</span>
                      <span className="text-sm">Purple - Pro features</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-orange-500/20 text-orange-400">BUSINESS</span>
                      <span className="text-sm">Orange - Business features</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400">ENTERPRISE</span>
                      <span className="text-sm">Red - Enterprise features</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400">LIMITED</span>
                      <span className="text-sm">Yellow - Limited access</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-blue-500/20 text-blue-400">UPGRADE</span>
                      <span className="text-sm">Blue - Upgrade prompts</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-electric-400" />
                    <span>Setup Guide</span>
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="bg-electric-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <h5 className="font-medium text-white">Create Base Navigation</h5>
                        <p className="text-sm text-gray-400">Start with "Base (Everyone)" items: Home, About, Events, Directory, Resources</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="bg-electric-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <h5 className="font-medium text-white">Add Member-Specific Items</h5>
                        <p className="text-sm text-gray-400">Create items for each membership level with appropriate badges and priorities</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="bg-electric-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <h5 className="font-medium text-white">Use Upgrade Prompts</h5>
                        <p className="text-sm text-gray-400">Add "UPGRADE" badges to Free Competitor items that link to premium features</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="bg-electric-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</div>
                      <div>
                        <h5 className="font-medium text-white">Set Priorities</h5>
                        <p className="text-sm text-gray-400">Use priority (1-10) to control order within each membership context</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="bg-electric-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">5</div>
                      <div>
                        <h5 className="font-medium text-white">Test Different Views</h5>
                        <p className="text-sm text-gray-400">Log in as different membership types to see how navigation appears to each user</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                    <Star className="h-5 w-5 text-electric-400" />
                    <span>Best Practices</span>
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="h-4 w-4 text-electric-400 mt-0.5" />
                      <span><strong>Progressive Disclosure:</strong> Show basic features to free users, advanced to paid users</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="h-4 w-4 text-electric-400 mt-0.5" />
                      <span><strong>Clear Upgrade Paths:</strong> Use badges and descriptions to show what's available at higher tiers</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="h-4 w-4 text-electric-400 mt-0.5" />
                      <span><strong>Consistent Branding:</strong> Use color-coded badges consistently across membership levels</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="h-4 w-4 text-electric-400 mt-0.5" />
                      <span><strong>Priority Ordering:</strong> Put most important/profitable features first in each context</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="h-4 w-4 text-electric-400 mt-0.5" />
                      <span><strong>Test Regularly:</strong> Check navigation from different user perspectives</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-blue-400 font-medium mb-2">Important Notes</h5>
                      <ul className="text-sm space-y-1">
                        <li>• Navigation changes take effect immediately for all users</li>
                        <li>• Users only see items for their membership level and below</li>
                        <li>• Use the CMS integration to automatically add pages to navigation</li>
                        <li>• Higher priority items (8-10) appear first, lower priority (1-3) appear last</li>
                        <li>• Inactive items are hidden but not deleted - useful for temporary features</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit/Create Item Modal */}
        {showItemModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div ref={modalRef} className="bg-gray-800 rounded-xl w-full max-w-sm sm:max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col">
              {/* Modal Header - Fixed */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
                                  <h3 className="text-lg sm:text-xl font-bold text-white">
                  {editingItem ? 'Edit Navigation Item' : 'Create Navigation Item'}
                </h3>
                <button
                  onClick={() => setShowItemModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                      Basic Information
                    </h4>
                    
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <label className="block text-sm font-medium text-gray-300">Title *</label>
                        <Tooltip content="The text that appears in the navigation menu. Keep it short and descriptive.">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Tooltip>
                      </div>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-electric-500"
                        placeholder="Menu item title"
                      />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <label className="block text-sm font-medium text-gray-300">URL/Link</label>
                        <Tooltip content="Where this menu item should link to. Use /page for internal links, https:// for external links, or leave empty for dropdown parents.">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Tooltip>
                      </div>
                      <input
                        type="text"
                        value={formData.href}
                        onChange={(e) => setFormData({...formData, href: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-electric-500"
                        placeholder="/events/create or https://example.com"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Internal links start with / (e.g., /about). External links include https://. Leave empty for dropdown parents.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <label className="block text-sm font-medium text-gray-300">Icon</label>
                          <Tooltip content="Optional icon to display next to the menu item. Icons help users quickly identify different sections.">
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Tooltip>
                        </div>
                        
                        {/* Custom Icon Dropdown */}
                        <div className="relative icon-dropdown-container">
                          <button
                            type="button"
                            onClick={() => setShowIconDropdown(!showIconDropdown)}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-electric-500 flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-2">
                              {formData.icon ? (
                                <>
                                  {(() => {
                                    const IconComponent = iconOptions.find(opt => opt.value === formData.icon)?.icon;
                                    return IconComponent ? <IconComponent className="h-4 w-4 text-gray-400" /> : null;
                                  })()}
                                  <span>{iconOptions.find(opt => opt.value === formData.icon)?.label || 'No icon'}</span>
                                </>
                              ) : (
                                <span>No icon</span>
                              )}
                            </div>
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          </button>
                          
                          {showIconDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                              {/* No Icon Option */}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({...formData, icon: ''});
                                  setShowIconDropdown(false);
                                }}
                                className={`w-full px-3 py-2 text-left hover:bg-gray-600 flex items-center space-x-2 ${
                                  !formData.icon ? 'bg-gray-600' : ''
                                }`}
                              >
                                <div className="w-4 h-4"></div>
                                <span className="text-white">No icon</span>
                              </button>
                              
                              {/* Icon Options */}
                              {iconOptions.map((option) => {
                                const IconComponent = option.icon;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      setFormData({...formData, icon: option.value});
                                      setShowIconDropdown(false);
                                    }}
                                    className={`w-full px-3 py-2 text-left hover:bg-gray-600 flex items-center space-x-2 ${
                                      formData.icon === option.value ? 'bg-gray-600' : ''
                                    }`}
                                  >
                                    <IconComponent className="h-4 w-4 text-gray-400" />
                                    <span className="text-white">{option.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <label className="block text-sm font-medium text-gray-300">Parent Item</label>
                          <Tooltip content="Select a parent to create a dropdown menu. Child items appear when users hover over the parent.">
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Tooltip>
                        </div>
                        <select
                          value={formData.parent_id}
                          onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-electric-500"
                        >
                          <option value="">Top level (main menu)</option>
                          {getAllItems(navigationItems)
                            .filter(item => !item.parent_id && item.id !== editingItem?.id)
                            .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Membership & Visibility Section */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                      Membership & Visibility
                    </h4>
                    
                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <label className="block text-sm font-medium text-gray-300">Who Can See This Item</label>
                        <Tooltip content="Select multiple membership types that can see this menu item. This allows one menu item to be visible to multiple user types (e.g., both Retailers and Organizations).">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Tooltip>
                      </div>
                      
                      {/* Multi-Select Membership Contexts */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {membershipContextOptions.map((option) => (
                          <label key={option.value} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.membership_contexts.includes(option.value)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  if (!formData.membership_contexts.includes(option.value)) {
                                    setFormData({
                                      ...formData,
                                      membership_contexts: [...formData.membership_contexts, option.value]
                                    });
                                  }
                                } else {
                                  setFormData({
                                    ...formData,
                                    membership_contexts: formData.membership_contexts.filter(ctx => ctx !== option.value)
                                  });
                                }
                              }}
                              className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500 focus:ring-offset-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-medium text-sm">{option.label}</div>
                              <div className="text-xs text-gray-400 truncate">{option.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                      
                      <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <div className="text-xs text-blue-400">
                          <strong>Selected:</strong> {
                            formData.membership_contexts.length > 0 
                              ? formData.membership_contexts.map(ctx => 
                                  membershipContextOptions.find(opt => opt.value === ctx)?.label
                                ).join(', ')
                              : 'None selected'
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Badge & Styling Section */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                      Badge & Styling
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <label className="block text-sm font-medium text-gray-300">Badge Text</label>
                          <Tooltip content="Optional promotional badge text (e.g., 'PRO', 'NEW', 'FREE'). Badges help highlight special features or encourage upgrades.">
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Tooltip>
                        </div>
                        <input
                          type="text"
                          value={formData.badge_text}
                          onChange={(e) => setFormData({...formData, badge_text: e.target.value})}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-electric-500"
                          placeholder="e.g., PRO, FREE, NEW"
                        />
                      </div>

                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <label className="block text-sm font-medium text-gray-300">Badge Color</label>
                          <Tooltip content="Badge colors communicate feature tiers and create clear upgrade paths:

🟢 Green (FREE)
Free features available to everyone, encourages sign-ups

🟣 Purple (PRO)
Professional/Premium features, main upgrade target

🟠 Orange (BUSINESS)
Business/Retailer level features, commercial tier

🔴 Red (ENTERPRISE/ADMIN)
High-tier/Enterprise features, premium tier

🟦 Indigo (ORG)
Organization-specific features, community tier

🟡 Yellow (LIMITED)
Limited-time offers, beta features, urgency

🔵 Blue (UPGRADE)
General upgrade prompts, call-to-action

⚪ No Badge
Standard features, no special promotion needed">
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </Tooltip>
                        </div>
                        <select
                          value={formData.badge_color}
                          onChange={(e) => setFormData({...formData, badge_color: e.target.value})}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-electric-500"
                        >
                          {badgeColorOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Badge Preview */}
                    {formData.badge_text && (
                      <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="text-sm text-gray-300 mb-2">Badge Preview:</div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          formData.badge_color === 'green' ? 'bg-green-500/20 text-green-400' :
                          formData.badge_color === 'purple' ? 'bg-purple-500/20 text-purple-400' :
                          formData.badge_color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
                          formData.badge_color === 'red' ? 'bg-red-500/20 text-red-400' :
                          formData.badge_color === 'indigo' ? 'bg-indigo-500/20 text-indigo-400' :
                          formData.badge_color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
                          formData.badge_color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {formData.badge_text}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Advanced Settings Section */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                      Advanced Settings
                    </h4>
                    
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <label className="block text-sm font-medium text-gray-300">Description</label>
                        <Tooltip content="Optional internal description for this menu item. Helps you remember what this menu item is for - not shown to users.">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Tooltip>
                      </div>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-electric-500"
                        placeholder="Optional description for this menu item"
                        rows={2}
                      />
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <label className="block text-sm font-medium text-gray-300">Priority</label>
                        <Tooltip content="Priority level (1-10) determines the order within the same membership context. Higher priority items appear first.">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Tooltip>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 1})}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-electric-500"
                        placeholder="1-10 (higher = more important)"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Higher priority items appear first in their context
                      </p>
                    </div>

                    <div className="flex items-center space-x-6">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.target_blank}
                          onChange={(e) => setFormData({...formData, target_blank: e.target.checked})}
                          className="rounded border-gray-600 bg-gray-700 text-electric-500"
                        />
                        <span className="text-gray-300">Open in new tab</span>
                        <Tooltip content="Check this for external links to keep users on your site.">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Tooltip>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                          className="rounded border-gray-600 bg-gray-700 text-electric-500"
                        />
                        <span className="text-gray-300">Active (visible in menu)</span>
                        <Tooltip content="Uncheck to hide this menu item without deleting it.">
                          <HelpCircle className="h-4 w-4 text-gray-400" />
                        </Tooltip>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer - Fixed */}
              <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-700 flex-shrink-0">
                <button
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveItem}
                  className="bg-electric-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-electric-600 transition-colors duration-200 flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingItem ? 'Update Item' : 'Create Item'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 