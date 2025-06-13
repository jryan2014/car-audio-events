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
  AlertTriangle,
  Info,
  HelpCircle,
  Move,
  Link as LinkIcon
} from 'lucide-react';

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
  { value: 'Menu', label: 'Menu', icon: Menu },
  { value: 'LinkIcon', label: 'Link', icon: LinkIcon }
];

export default function NavigationManager() {
  const { user } = useAuth();
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [cmsPages, setCmsPages] = useState<CMSPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
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
    visibility_rules: { public: true } as { public?: boolean; membershipTypes?: string[] },
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
      setSuccess('CMS page navigation updated successfully');
      loadCMSPages();
    } catch (error: any) {
      setError(error.message);
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
            <div className="text-xs text-gray-500 font-medium">Sub-items:</div>
            {renderNavigationItems(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

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
            <h1 className="text-3xl font-bold text-white mb-2">Navigation Manager</h1>
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
              <h2 className="text-xl font-bold text-white">Navigation Structure</h2>
              <div className="text-sm text-gray-400">
                {navigationItems.length} top-level items
              </div>
            </div>
            
            <div className="space-y-4">
              {navigationItems.length > 0 ? (
                renderNavigationItems(navigationItems)
              ) : (
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
              )}
            </div>
          </div>

          {/* CMS Pages Panel */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">CMS Pages Integration</h2>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <p className="text-gray-400 text-sm mb-4">
                Automatically add CMS pages to navigation menus
              </p>
              
              {cmsPages.length > 0 ? (
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
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Navigation Manager Help</h3>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6 text-gray-300">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">What is the Navigation Manager?</h4>
                  <p className="mb-4">
                    The Navigation Manager allows you to control your website's menu structure. You can create menu items, 
                    organize them hierarchically, control who can see them, and manage their order.
                  </p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Key Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h5 className="font-medium text-electric-400 mb-2">Menu Structure</h5>
                      <p className="text-sm">Create parent and child menu items to build dropdown menus and organized navigation.</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h5 className="font-medium text-electric-400 mb-2">Visibility Control</h5>
                      <p className="text-sm">Set who can see each menu item: public users, specific membership types, or custom rules.</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h5 className="font-medium text-electric-400 mb-2">Order Management</h5>
                      <p className="text-sm">Use drag-and-drop or arrow buttons to reorder menu items exactly how you want them.</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h5 className="font-medium text-electric-400 mb-2">CMS Integration</h5>
                      <p className="text-sm">Automatically add CMS pages to your navigation without manual menu creation.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">How to Use</h4>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="bg-electric-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <h5 className="font-medium">Create Menu Items</h5>
                        <p className="text-sm text-gray-400">Click "Add Menu Item" to create new navigation links. Add a title, URL, and choose an icon.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="bg-electric-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <h5 className="font-medium">Organize Structure</h5>
                        <p className="text-sm text-gray-400">Set parent items to create dropdown menus. Child items will appear under their parent.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="bg-electric-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <h5 className="font-medium">Control Visibility</h5>
                        <p className="text-sm text-gray-400">Choose who can see each menu item: everyone, logged-in users, or specific membership types.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="bg-electric-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</div>
                      <div>
                        <h5 className="font-medium">Manage Order</h5>
                        <p className="text-sm text-gray-400">Use the up/down arrows to reorder items. The order here determines the menu order on your site.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Best Practices</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="h-4 w-4 text-electric-400 mt-0.5" />
                      <span>Keep menu titles short and descriptive</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="h-4 w-4 text-electric-400 mt-0.5" />
                      <span>Use icons consistently to improve visual navigation</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="h-4 w-4 text-electric-400 mt-0.5" />
                      <span>Limit dropdown menus to 2-3 levels deep for usability</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="h-4 w-4 text-electric-400 mt-0.5" />
                      <span>Test visibility rules to ensure the right users see the right content</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <ChevronRight className="h-4 w-4 text-electric-400 mt-0.5" />
                      <span>Use "Open in new tab" for external links to keep users on your site</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-electric-500"
                    placeholder="Menu item title (e.g., 'About Us', 'Contact')"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">URL/Link</label>
                  <input
                    type="text"
                    value={formData.href}
                    onChange={(e) => setFormData({...formData, href: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-electric-500"
                    placeholder="/about, https://example.com, or leave empty for dropdown parent"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Internal links start with / (e.g., /about). External links include https://. Leave empty for dropdown parents.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Icon</label>
                    <select
                      value={formData.icon}
                      onChange={(e) => setFormData({...formData, icon: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-electric-500"
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

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Visibility</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="visibility"
                        checked={formData.visibility_rules.public === true}
                        onChange={() => setFormData({...formData, visibility_rules: { public: true }})}
                        className="text-electric-500"
                      />
                      <span className="text-gray-300">Public (everyone can see)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="visibility"
                        checked={formData.visibility_rules.membershipTypes !== undefined}
                        onChange={() => setFormData({...formData, visibility_rules: { membershipTypes: ['competitor', 'pro_competitor', 'admin'] }})}
                        className="text-electric-500"
                      />
                      <span className="text-gray-300">Members only (logged-in users)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="visibility"
                        checked={formData.visibility_rules.membershipTypes?.includes('admin') && formData.visibility_rules.membershipTypes.length === 1}
                        onChange={() => setFormData({...formData, visibility_rules: { membershipTypes: ['admin'] }})}
                        className="text-electric-500"
                      />
                      <span className="text-gray-300">Admin only</span>
                    </label>
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
                    <span className="text-gray-300">Active (visible in menu)</span>
                  </label>
                </div>

                <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-700">
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
                    <span>{editingItem ? 'Update Item' : 'Create Item'}</span>
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