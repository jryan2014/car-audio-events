import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Eye, FileText, Globe, Search, HelpCircle, Info, X, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import RichTextEditor from '../components/RichTextEditor';
import AIWritingAssistant from '../components/AIWritingAssistant';
import CMSPageHelp from '../components/CMSPageHelp';
import { useNotifications } from '../components/NotificationSystem';


interface CMSPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string[];
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  author_id: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Navigation placement fields
  navigation_placement: 'none' | 'top_nav' | 'sub_nav' | 'footer' | 'main';
  parent_nav_item?: string;
  footer_section?: 'company' | 'quick_links' | 'legal' | 'support' | 'social';
  nav_order?: number;
  nav_title?: string;
  show_in_sitemap: boolean;
}

interface PageFormData {
  title: string;
  slug: string;
  content: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string[];
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  // Navigation placement fields
  navigation_placement: 'none' | 'top_nav' | 'sub_nav' | 'footer' | 'main';
  parent_nav_item?: string;
  footer_section?: 'company' | 'quick_links' | 'legal' | 'support' | 'social';
  nav_order?: number;
  nav_title?: string;
  show_in_sitemap: boolean;
}

export default function CMSPages() {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning, showInfo } = useNotifications();
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showHelp, setShowHelp] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const [hasFocusedOnFormShow, setHasFocusedOnFormShow] = useState(false);
  const [formData, setFormData] = useState<PageFormData>({
    title: '',
    slug: '',
    content: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: [],
    status: 'draft',
    is_featured: false,
    navigation_placement: 'none',
    show_in_sitemap: true
  });

  useEffect(() => {
    loadPages();
  }, []);

  // Auto-scroll to form and focus first input when it becomes visible (but only once per form show)
  useEffect(() => {
    if (showCreateForm && !hasFocusedOnFormShow && formRef.current) {
      // Scroll to form first
      setTimeout(() => {
        if (formRef.current) {
          try {
            formRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });
          } catch (error) {
            console.warn('ScrollIntoView failed, using fallback:', error);
            formRef.current.scrollIntoView(true);
          }
        }
      }, 100);

      // Then focus first input after scroll
      const firstInput = formRef.current.querySelector(
        'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled])'
      ) as HTMLElement;
      
      if (firstInput) {
        setTimeout(() => {
          try {
            if ('focus' in firstInput && typeof firstInput.focus === 'function') {
              firstInput.focus({ preventScroll: true }); // Prevent additional scrolling from focus
            }
          } catch (error) {
            console.warn('Focus failed:', error);
          }
        }, 300); // Wait for scroll to complete
      }
      setHasFocusedOnFormShow(true);
    } else if (!showCreateForm) {
      // Reset focus tracking when form is hidden
      setHasFocusedOnFormShow(false);
    }
  }, [showCreateForm, hasFocusedOnFormShow]);

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const loadPages = async () => {
    try {
      setIsLoading(true);
      
      // Try to load with all fields first
      let { data, error } = await supabase
        .from('cms_pages')
        .select('*')
        .order('updated_at', { ascending: false });

      // If that fails (likely due to missing navigation fields), try with basic fields only
      if (error && error.message?.includes('column') && error.message?.includes('does not exist')) {
        console.warn('Navigation fields not available, loading basic page data only');
        
        const { data: basicData, error: basicError } = await supabase
          .from('cms_pages')
          .select('id, title, slug, content, meta_title, meta_description, meta_keywords, status, is_featured, author_id, published_at, created_at, updated_at')
          .order('updated_at', { ascending: false });

        if (basicError) throw basicError;
        
        // Add default navigation values for pages loaded without navigation fields
        data = basicData?.map(page => ({
          ...page,
          navigation_placement: 'none' as const,
          parent_nav_item: undefined,
          footer_section: undefined,
          nav_order: undefined,
          nav_title: undefined,
          show_in_sitemap: true
        })) || [];
      } else if (error) {
        throw error;
      }

      setPages(data || []);
    } catch (error) {
      console.error('Error loading pages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
      meta_title: prev.meta_title || title
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔄 Starting page save...', { editingPage: !!editingPage, user: user?.email, userType: user?.membershipType });
    
    // Check if user is authenticated and admin
    if (!user || user.membershipType !== 'admin') {
      showError('Access Denied', 'Only administrators can save pages.');
      return;
    }
    
    try {
      // Get current session to ensure we're authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ Session error:', sessionError);
        showError('Session Expired', 'Please log in again to continue.');
        return;
      }
      
      console.log('✅ Authenticated session found:', session.user.email);
      
      // First, try to detect which fields are available in the database
      let pageData: any = {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        meta_title: formData.meta_title,
        meta_description: formData.meta_description,
        meta_keywords: formData.meta_keywords,
        status: formData.status,
        is_featured: formData.is_featured,
        author_id: session.user.id, // Use the authenticated user's ID
        published_at: formData.status === 'published' ? new Date().toISOString() : null
      };

      console.log('📝 Basic page data prepared:', pageData);

      // Try to add navigation fields - if they fail, we'll catch and retry without them
      try {
        pageData = {
          ...pageData,
          navigation_placement: formData.navigation_placement,
          parent_nav_item: formData.parent_nav_item,
          footer_section: formData.footer_section,
          nav_order: formData.nav_order,
          nav_title: formData.nav_title,
          show_in_sitemap: formData.show_in_sitemap
        };

        console.log('📝 Enhanced page data with navigation:', pageData);

        if (editingPage) {
          console.log('✏️ Updating existing page:', editingPage.id);
          const { data, error } = await supabase
            .from('cms_pages')
            .update(pageData)
            .eq('id', editingPage.id)
            .select()
            .single();

          if (error) throw error;
          console.log('✅ Page updated successfully:', data);
        } else {
          console.log('➕ Creating new page');
          const { data, error } = await supabase
            .from('cms_pages')
            .insert([pageData])
            .select()
            .single();

          if (error) throw error;
          console.log('✅ Page created successfully:', data);
        }

      } catch (navError: any) {
        console.warn('⚠️ Navigation fields not supported, falling back to basic fields:', navError.message);
        
        // Retry without navigation fields
        const basicPageData = {
          title: formData.title,
          slug: formData.slug,
          content: formData.content,
          meta_title: formData.meta_title,
          meta_description: formData.meta_description,
          meta_keywords: formData.meta_keywords,
          status: formData.status,
          is_featured: formData.is_featured,
          author_id: session.user.id,
          published_at: formData.status === 'published' ? new Date().toISOString() : null
        };

        if (editingPage) {
          const { data, error } = await supabase
            .from('cms_pages')
            .update(basicPageData)
            .eq('id', editingPage.id)
            .select()
            .single();

          if (error) throw error;
          console.log('✅ Page updated successfully (basic fields):', data);
        } else {
          const { data, error } = await supabase
            .from('cms_pages')
            .insert([basicPageData])
            .select()
            .single();

          if (error) throw error;
          console.log('✅ Page created successfully (basic fields):', data);
        }
      }

      // Reset form and reload pages
      setFormData({
        title: '',
        slug: '',
        content: '',
        meta_title: '',
        meta_description: '',
        meta_keywords: [],
        status: 'draft',
        is_featured: false,
        navigation_placement: 'none',
        show_in_sitemap: true
      });
      setShowCreateForm(false);
      setEditingPage(null);
      await loadPages();
      
      showSuccess(
        editingPage ? 'Page Updated!' : 'Page Created!',
        editingPage 
          ? 'Your page has been updated successfully and is now live.' 
          : 'Your new page has been created successfully and is ready to publish.'
      );
      
    } catch (error: any) {
      console.error('❌ Error saving page:', error);
      showError(
        'Save Failed',
        `Unable to save page: ${error.message}`,
        true // persistent error
      );
    }
  };

  const handleEdit = (page: CMSPage) => {
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      meta_keywords: page.meta_keywords || [],
      status: page.status,
      is_featured: page.is_featured,
      navigation_placement: page.navigation_placement || 'none',
      parent_nav_item: page.parent_nav_item,
      footer_section: page.footer_section,
      nav_order: page.nav_order,
      nav_title: page.nav_title,
      show_in_sitemap: page.show_in_sitemap !== false
    });
    setEditingPage(page);
    setHasFocusedOnFormShow(false); // Reset focus tracking for edit mode
    setShowCreateForm(true);
  };

  const handleDelete = async (pageId: string) => {
    // Show warning notification first
    showWarning(
      'Delete Confirmation Required',
      'This action cannot be undone. Please confirm you want to delete this page.',
      8000
    );
    
    if (!confirm('⚠️ PERMANENT DELETE: Are you absolutely sure you want to delete this page? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cms_pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;
      await loadPages();
      showSuccess('Page Deleted!', 'The page has been permanently removed from your website.');
    } catch (error: any) {
      console.error('Error deleting page:', error);
      showError('Delete Failed', `Unable to delete page: ${error.message}`);
    }
  };

  const handleKeywordChange = (index: number, value: string) => {
    const newKeywords = [...formData.meta_keywords];
    newKeywords[index] = value;
    setFormData(prev => ({ ...prev, meta_keywords: newKeywords }));
  };

  const addKeyword = () => {
    setFormData(prev => ({ ...prev, meta_keywords: [...prev.meta_keywords, ''] }));
  };

  const removeKeyword = (index: number) => {
    const newKeywords = formData.meta_keywords.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, meta_keywords: newKeywords }));
  };

  const handleAIContentInsert = (content: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + '\n\n' + content
    }));
  };

  const handleCreateNew = () => {
    setHasFocusedOnFormShow(false); // Reset focus tracking for new page
    setShowCreateForm(true);
    showInfo('Page Editor Opened', 'Fill in the form below to create your new page.');
  };

  const getPageTypeFromSlug = (slug: string): string => {
    if (slug.includes('about')) return 'About';
    if (slug.includes('privacy')) return 'Privacy';
    if (slug.includes('terms')) return 'Terms';
    return 'Page';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-green-400 bg-green-400/10';
      case 'draft': return 'text-yellow-400 bg-yellow-400/10';
      case 'archived': return 'text-gray-400 bg-gray-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getNavigationPlacementDisplay = (page: CMSPage) => {
    switch (page.navigation_placement) {
      case 'main':
      case 'top_nav':
        return { text: 'Main Navigation', color: 'text-blue-400 bg-blue-400/10' };
      case 'sub_nav':
        return { 
          text: `Sub Nav (${page.parent_nav_item || 'No Parent'})`, 
          color: 'text-purple-400 bg-purple-400/10' 
        };
      case 'footer':
        const sectionLabel = page.footer_section ? 
          page.footer_section.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
          'General';
        return { 
          text: `Footer (${sectionLabel})`, 
          color: 'text-orange-400 bg-orange-400/10' 
        };
      case 'none':
      default:
        return { text: 'Standalone', color: 'text-gray-400 bg-gray-400/10' };
    }
  };

  const filteredPages = pages.filter(page => {
    const matchesSearch = page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         page.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || page.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading pages...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">CMS Pages</h1>
            <p className="text-gray-400">Manage website pages and content</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
              title="View Help Guide"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Help</span>
            </button>
            
            <button
              type="button"
              onClick={handleCreateNew}
              className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create Page</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:border-electric-500"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Pages List - Hidden when creating/editing */}
        {!showCreateForm && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">Website Pages</h2>
            
            {filteredPages.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No pages found</p>
                <p className="text-gray-500">Create your first page to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPages.map((page) => (
                  <div key={page.id} className="bg-gray-700/30 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-white font-medium">{page.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(page.status)}`}>
                            {page.status.charAt(0).toUpperCase() + page.status.slice(1)}
                          </span>
                          {page.is_featured && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium text-electric-400 bg-electric-400/10">
                              Featured
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getNavigationPlacementDisplay(page).color}`}>
                            {getNavigationPlacementDisplay(page).text}
                          </span>
                        </div>
                        
                        <p className="text-gray-400 text-sm mb-3">/{page.slug}</p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Created: {new Date(page.created_at).toLocaleDateString()}</span>
                          <span>Updated: {new Date(page.updated_at).toLocaleDateString()}</span>
                          {page.published_at && (
                            <span>Published: {new Date(page.published_at).toLocaleDateString()}</span>
                          )}
                          {page.nav_order && (
                            <span>Order: {page.nav_order}</span>
                          )}
                          {page.show_in_sitemap && (
                            <span className="text-green-400">✓ Sitemap</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {page.status === 'published' && (
                          <a
                            href={`/pages/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                            title="View Page"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        )}
                        
                        <button
                          type="button"
                          onClick={() => handleEdit(page)}
                          className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                          title="Edit Page"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleDelete(page.id)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                          title="Delete Page"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div ref={formRef} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCreateForm(false);
                    setEditingPage(null);
                    setHasFocusedOnFormShow(false);
                    setFormData({
                      title: '',
                      slug: '',
                      content: '',
                      meta_title: '',
                      meta_description: '',
                      meta_keywords: [],
                      status: 'draft',
                      is_featured: false,
                      navigation_placement: 'none',
                      parent_nav_item: '',
                      footer_section: 'quick_links',
                      nav_order: 0,
                      nav_title: '',
                      show_in_sitemap: true
                    });
                  }}
                  className="text-gray-400 hover:text-electric-400 transition-colors flex items-center space-x-2"
                  title="Back to CMS Pages list"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-sm">Back to Pages</span>
                </button>
                <h2 className="text-xl font-bold text-white">
                  {editingPage ? 'Edit Page' : 'Create New Page'}
                </h2>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowHelp(true);
                  }}
                  className="text-gray-400 hover:text-electric-400 transition-colors flex items-center space-x-1"
                  title="Need help? Click for detailed field explanations"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span className="text-sm">Need Help?</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCreateForm(false);
                    setEditingPage(null);
                    setHasFocusedOnFormShow(false); // Reset focus tracking
                    setFormData({
                      title: '',
                      slug: '',
                      content: '',
                      meta_title: '',
                      meta_description: '',
                      meta_keywords: [],
                      status: 'draft',
                      is_featured: false,
                      navigation_placement: 'none',
                      parent_nav_item: '',
                      footer_section: 'quick_links',
                      nav_order: 0,
                      nav_title: '',
                      show_in_sitemap: true
                    });
                  }}
                  className="text-gray-400 hover:text-red-400 transition-colors flex items-center space-x-1"
                  title="Cancel and return to pages list"
                >
                  <X className="h-4 w-4" />
                  <span className="text-sm">Cancel</span>
                </button>
              </div>
            </div>
            
            {/* Navigation Features Status */}
            {pages.length > 0 && pages[0].navigation_placement === undefined && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <p className="text-yellow-400 text-sm">
                    <strong>Limited Functionality:</strong> Navigation features require database migration. 
                    Pages will be saved with basic fields only. See <code>CMS_NAVIGATION_SETUP.md</code> for setup instructions.
                  </p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <label className="block text-gray-400 text-sm">Page Title *</label>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-gray-500 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        Appears in page header, browser tab, and navigation menus
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Enter page title"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will appear as the main heading on your page and in browser tabs
                  </p>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <label className="block text-gray-400 text-sm">URL Slug *</label>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-gray-500 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        The URL path for your page (auto-generated from title)
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="page-url-slug"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Public URL:</strong> /pages/{formData.slug || 'your-slug'}
                  </p>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <label className="block text-gray-400 text-sm">Status</label>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-gray-500 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        Controls page visibility: Draft (hidden), Published (live), Archived (hidden but preserved)
                      </div>
                    </div>
                  </div>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    <option value="draft">Draft (Hidden from public)</option>
                    <option value="published">Published (Live and visible)</option>
                    <option value="archived">Archived (Hidden but preserved)</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                      className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                    />
                    <span className="text-gray-400">Featured Page</span>
                    <div className="group relative">
                      <Info className="h-3 w-3 text-gray-500 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        Adds a "Featured" badge and may appear prominently in listings
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Navigation Settings Section */}
              <div className="border-t border-gray-700 pt-6">
                <div className="flex items-center space-x-2 mb-4">
                  <h3 className="text-lg font-medium text-white">Navigation Settings</h3>
                  <div className="group relative">
                    <Info className="h-4 w-4 text-gray-500 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      Controls where this page appears in your site navigation
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Navigation Placement</label>
                    <select
                      value={formData.navigation_placement}
                      onChange={(e) => setFormData(prev => ({ ...prev, navigation_placement: e.target.value as any }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="none">None - Standalone Page (accessible only via direct link)</option>
                      <option value="main">Main Navigation (appears in header + Resources section)</option>
                      <option value="top_nav">Top Navigation (appears in header)</option>
                      <option value="sub_nav">Sub Navigation (appears under parent menu + Resources section)</option>
                      <option value="footer">Footer (appears in website footer)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      <strong>Resources Section:</strong> Pages with "main" or "sub_nav" placement automatically appear in the Resources section, categorized by content type
                    </p>
                  </div>

                  {/* Conditional fields based on navigation placement */}
                  {formData.navigation_placement === 'sub_nav' && (
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Parent Navigation Item</label>
                      <select
                        value={formData.parent_nav_item || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, parent_nav_item: e.target.value }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        <option value="">Select Parent Menu</option>
                        <option value="events">Events</option>
                        <option value="directory">Directory</option>
                        <option value="about">About</option>
                        <option value="resources">Resources</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        This page will appear in the dropdown menu under the selected parent item
                      </p>
                    </div>
                  )}

                  {formData.navigation_placement === 'footer' && (
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Footer Section</label>
                      <select
                        value={formData.footer_section || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, footer_section: e.target.value as any }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        <option value="">Select Footer Section</option>
                        <option value="company">Company Info</option>
                        <option value="quick_links">Quick Links</option>
                        <option value="legal">Legal</option>
                        <option value="support">Support</option>
                        <option value="social">Social Media</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose which footer column this page will appear in
                      </p>
                    </div>
                  )}

                  {/* Navigation title and order for all placements except 'none' */}
                  {formData.navigation_placement !== 'none' && (
                    <>
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Navigation Title (optional)</label>
                        <input
                          type="text"
                          value={formData.nav_title || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, nav_title: e.target.value }))}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                          placeholder="Leave blank to use page title"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Custom shorter title for navigation menus (e.g., "Privacy Policy" → "Privacy")
                        </p>
                      </div>

                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Navigation Order</label>
                        <input
                          type="number"
                          value={formData.nav_order || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, nav_order: e.target.value ? parseInt(e.target.value) : undefined }))}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                          placeholder="1, 2, 3..."
                          min="1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Lower numbers appear first. Use increments of 10 (10, 20, 30) to easily insert items later
                        </p>
                      </div>
                    </>
                  )}

                  {/* Sitemap inclusion */}
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.show_in_sitemap}
                        onChange={(e) => setFormData(prev => ({ ...prev, show_in_sitemap: e.target.checked }))}
                        className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                      />
                      <span className="text-gray-400">Include in Sitemap</span>
                      <div className="group relative">
                        <Info className="h-3 w-3 text-gray-500 cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          Include this page in XML sitemap for search engines
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <label className="block text-gray-400 text-sm">Page Content *</label>
                  <div className="group relative">
                    <Info className="h-3 w-3 text-gray-500 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      Main content that appears on your page - supports rich formatting
                    </div>
                  </div>
                </div>
                <RichTextEditor
                  value={formData.content}
                  onChange={(value: string) => setFormData(prev => ({ ...prev, content: value }))}
                  placeholder="Start writing your page content here... You can use the toolbar above to format text, add links, images, and more."
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Use the toolbar to format text, add links, images, lists, and more. The content will be saved as HTML.
                </p>
              </div>

              {/* SEO Section */}
              <div className="border-t border-gray-700 pt-6">
                <div className="flex items-center space-x-2 mb-4">
                  <h3 className="text-lg font-medium text-white">SEO Settings</h3>
                  <div className="group relative">
                    <Info className="h-4 w-4 text-gray-500 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      Optimize your page for search engines and social media
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Meta Title</label>
                    <input
                      type="text"
                      value={formData.meta_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="SEO title for search engines"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Appears in browser tabs and search engine results (50-60 characters recommended)
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Meta Description</label>
                    <textarea
                      value={formData.meta_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                      rows={3}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Brief description for search engines"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Appears in search results and Resources page cards (150-160 characters recommended)
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Meta Keywords</label>
                    <div className="space-y-2">
                      {formData.meta_keywords.map((keyword, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={keyword}
                            onChange={(e) => handleKeywordChange(index, e.target.value)}
                            className="flex-1 p-2 bg-gray-700/50 border border-gray-600 rounded text-white focus:outline-none focus:border-electric-500"
                            placeholder={`Keyword ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeKeyword(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addKeyword}
                        className="text-electric-400 hover:text-electric-300 text-sm"
                      >
                        + Add Keyword
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Add relevant terms that describe your page content (helps with categorization)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  type="submit"
                  className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors"
                >
                  {editingPage ? 'Update Page' : 'Create Page'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingPage(null);
                    setHasFocusedOnFormShow(false); // Reset focus tracking
                    setFormData({
                      title: '',
                      slug: '',
                      content: '',
                      meta_title: '',
                      meta_description: '',
                      meta_keywords: [],
                      status: 'draft',
                      is_featured: false,
                      navigation_placement: 'none',
                      show_in_sitemap: true
                    });
                  }}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* AI Writing Assistant */}
        <AIWritingAssistant onInsertContent={handleAIContentInsert} />
      </div>

      {/* Help Modal */}
      <CMSPageHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
} 