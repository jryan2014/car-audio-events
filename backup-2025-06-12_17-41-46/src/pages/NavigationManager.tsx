import React, { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';

interface NavigationItem {
  id: string;
  title: string;
  href?: string;
  icon?: string;
  nav_order: number;
  parent_id?: string;
  target_blank: boolean;
  visibility_rules: any;
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
  { value: 'Menu', label: 'Menu', icon: Menu }
];

export default function NavigationManager() {
  const { user } = useAuth();
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [cmsPages, setCmsPages] = useState<CMSPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<NavigationItem | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    href: '',
    icon: '',
    parent_id: '',
    target_blank: false,
    visibility_rules: { public: true },
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
      return;
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
      is_active: item.is_active,
      cms_page_id: item.cms_page_id || ''
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    try {
      const itemData = {
        ...formData,
        nav_order: editingItem ? editingItem.nav_order : getNextOrder(formData.parent_id),
        updated_at: new Date().toISOString()
      };

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('navigation_menu_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        setSuccess('Navigation item updated successfully');
      } else {
        // Create new item
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
    if (!confirm('Are you sure you want to delete this navigation item? This will also delete all child items.')) {
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
      loadNavigationItems();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleUpdateOrder = async (itemId: string, newOrder: number) => {
    try {
      const { error } = await supabase
        .from('navigation_menu_items')
        .update({ nav_order: newOrder })
        .eq('id', itemId);

      if (error) throw error;
      loadNavigationItems();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const getNextOrder = (parentId?: string): number => {
    const siblings = parentId 
      ? navigationItems.find(item => item.id === parentId)?.children || []
      : navigationItems;
    
    return Math.max(0, ...siblings.map(item => item.nav_order)) + 10;
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
      setSuccess('CMS page navigation updated successfully');
      loadCMSPages();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const renderNavigationItems = (items: NavigationItem[], level: number = 0) => {
    return items.map((item) => (
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
            <span className="text-xs text-gray-500">Order: {item.nav_order}</span>
            
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

        <div className="text-sm text-gray-400 grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium">URL:</span> {item.href || '(No URL)'}
          </div>
          <div>
            <span className="font-medium">Visibility:</span> {
              item.visibility_rules?.public ? 'Public' : 
              item.visibility_rules?.membershipTypes ? `Members: ${item.visibility_rules.membershipTypes.join(', ')}` :
              'Custom'
            }
          </div>
        </div>

        {item.children && item.children.length > 0 && (
          <div className="ml-6 space-y-2 border-l border-gray-700 pl-4">
            {renderNavigationItems(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Navigation Manager</h1>
            <p className="text-gray-400">Manage website navigation structure and menu items</p>
          </div>
          
          <button
            onClick={handleCreateItem}
            className="bg-electric-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-600 transition-colors duration-200 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Menu Item</span>
          </button>
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
            <h2 className="text-xl font-bold text-white mb-4">Navigation Structure</h2>
            <div className="space-y-4">
              {navigationItems.length > 0 ? (
                renderNavigationItems(navigationItems)
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Menu className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No navigation items configured</p>
                  <button
                    onClick={handleCreateItem}
                    className="mt-4 text-electric-400 hover:text-electric-300"
                  >
                    Create your first menu item
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CMS Pages Panel */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">CMS Pages</h2>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-4">
                Manage where CMS pages appear in navigation
              </p>
              
              <div className="space-y-3">
                {cmsPages.map((page) => (
                  <div key={page.id} className="border border-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm">{page.title}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        page.navigation_placement === 'main' ? 'bg-electric-500/20 text-electric-400' :
                        page.navigation_placement === 'footer' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {page.navigation_placement || 'none'}
                      </span>
                    </div>
                    
                    <select
                      value={page.navigation_placement || 'none'}
                      onChange={(e) => updateCMSPagePlacement(page.id, e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                    >
                      <option value="none">Not in navigation</option>
                      <option value="main">Main navigation</option>
                      <option value="footer">Footer</option>
                      <option value="sub_nav">Sub navigation</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal for Adding/Editing Items */}
        {showItemModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingItem ? 'Edit Navigation Item' : 'Add Navigation Item'}
                </h3>
                <button
                  onClick={() => setShowItemModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    placeholder="Menu item title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">URL/Link</label>
                  <input
                    type="text"
                    value={formData.href}
                    onChange={(e) => setFormData({...formData, href: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    placeholder="/path or https://example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Icon</label>
                    <select
                      value={formData.icon}
                      onChange={(e) => setFormData({...formData, icon: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">No icon</option>
                      {iconOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Parent Item</label>
                    <select
                      value={formData.parent_id}
                      onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="">Top level</option>
                      {navigationItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.target_blank}
                      onChange={(e) => setFormData({...formData, target_blank: e.target.checked})}
                      className="rounded border-gray-600 bg-gray-700 text-electric-500"
                    />
                    <span className="text-gray-300">Open in new tab</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="rounded border-gray-600 bg-gray-700 text-electric-500"
                    />
                    <span className="text-gray-300">Active</span>
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-4 pt-4">
                  <button
                    onClick={() => setShowItemModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveItem}
                    className="bg-electric-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-600 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>{editingItem ? 'Update' : 'Create'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 