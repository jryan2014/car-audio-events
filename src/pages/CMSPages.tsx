import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, FileText, Globe, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import AIWritingAssistant from '../components/AIWritingAssistant';

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
  navigation_placement: 'none' | 'top_nav' | 'sub_nav' | 'footer';
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
  navigation_placement: 'none' | 'top_nav' | 'sub_nav' | 'footer';
  parent_nav_item?: string;
  footer_section?: 'company' | 'quick_links' | 'legal' | 'support' | 'social';
  nav_order?: number;
  nav_title?: string;
  show_in_sitemap: boolean;
}

export default function CMSPages() {
  const { user } = useAuth();
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPage, setEditingPage] = useState<CMSPage | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  // Quill editor configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'indent',
    'align', 'link', 'image', 'video', 'blockquote', 'code-block'
  ];

  // Check if user is admin
  if (!user || user.membershipType !== 'admin') {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadPages();
  }, []);

  useEffect(() => {
    // Inject custom CSS for Quill editor dark theme
    const style = document.createElement('style');
    style.textContent = `
      .ql-toolbar {
        background: rgba(55, 65, 81, 0.5) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        border-bottom: none !important;
        border-radius: 0.5rem 0.5rem 0 0 !important;
      }
      
      .ql-container {
        background: rgba(55, 65, 81, 0.5) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        border-top: none !important;
        border-radius: 0 0 0.5rem 0.5rem !important;
        color: white !important;
        min-height: 300px;
      }
      
      .ql-editor {
        color: white !important;
        font-size: 14px;
        line-height: 1.6;
      }
      
      .ql-editor.ql-blank::before {
        color: rgb(156, 163, 175) !important;
        font-style: italic;
      }
      
      .ql-toolbar .ql-stroke {
        stroke: rgb(156, 163, 175) !important;
      }
      
      .ql-toolbar .ql-fill {
        fill: rgb(156, 163, 175) !important;
      }
      
      .ql-toolbar .ql-picker-label {
        color: rgb(156, 163, 175) !important;
      }
      
      .ql-toolbar .ql-picker-options {
        background: rgb(55, 65, 81) !important;
        border: 1px solid rgb(75, 85, 99) !important;
      }
      
      .ql-toolbar .ql-picker-item {
        color: rgb(156, 163, 175) !important;
      }
      
      .ql-toolbar .ql-picker-item:hover {
        background: rgba(59, 130, 246, 0.1) !important;
        color: rgb(59, 130, 246) !important;
      }
      
      .ql-toolbar button:hover {
        color: rgb(59, 130, 246) !important;
      }
      
      .ql-toolbar button:hover .ql-stroke {
        stroke: rgb(59, 130, 246) !important;
      }
      
      .ql-toolbar button:hover .ql-fill {
        fill: rgb(59, 130, 246) !important;
      }
      
      .ql-toolbar button.ql-active {
        color: rgb(59, 130, 246) !important;
      }
      
      .ql-toolbar button.ql-active .ql-stroke {
        stroke: rgb(59, 130, 246) !important;
      }
      
      .ql-toolbar button.ql-active .ql-fill {
        fill: rgb(59, 130, 246) !important;
      }
      
      .ql-snow .ql-tooltip {
        background: rgb(55, 65, 81) !important;
        border: 1px solid rgb(75, 85, 99) !important;
        color: white !important;
      }
      
      .ql-snow .ql-tooltip input {
        background: rgb(75, 85, 99) !important;
        border: 1px solid rgb(107, 114, 128) !important;
        color: white !important;
      }
      
      .ql-snow .ql-tooltip a {
        color: rgb(59, 130, 246) !important;
      }
    `;
    
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
    
    try {
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
        author_id: user.id,
        published_at: formData.status === 'published' ? new Date().toISOString() : null
      };

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

        if (editingPage) {
          const { error } = await supabase
            .from('cms_pages')
            .update(pageData)
            .eq('id', editingPage.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('cms_pages')
            .insert([pageData]);
          
          if (error) throw error;
        }
      } catch (navError: any) {
        // If navigation fields failed, try again with just basic fields
        console.warn('Navigation fields not available, saving basic page data only:', navError);
        
        const basicPageData = {
          title: formData.title,
          slug: formData.slug,
          content: formData.content,
          meta_title: formData.meta_title,
          meta_description: formData.meta_description,
          meta_keywords: formData.meta_keywords,
          status: formData.status,
          is_featured: formData.is_featured,
          author_id: user.id,
          published_at: formData.status === 'published' ? new Date().toISOString() : null
        };

        if (editingPage) {
          const { error } = await supabase
            .from('cms_pages')
            .update(basicPageData)
            .eq('id', editingPage.id);
          
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('cms_pages')
            .insert([basicPageData]);
          
          if (error) throw error;
        }

        // Show a warning about limited functionality
        alert('Page saved successfully! Note: Navigation features require database migration. See CMS_NAVIGATION_SETUP.md for instructions.');
      }

      // Reset form and reload data
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
      loadPages();
      
    } catch (error) {
      console.error('Error saving page:', error);
      alert('Failed to save page. Please try again.');
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
      show_in_sitemap: page.show_in_sitemap !== undefined ? page.show_in_sitemap : true
    });
    setEditingPage(page);
    setShowCreateForm(true);
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    
    try {
      const { error } = await supabase
        .from('cms_pages')
        .delete()
        .eq('id', pageId);
      
      if (error) throw error;
      loadPages();
    } catch (error) {
      console.error('Error deleting page:', error);
      alert('Failed to delete page. Please try again.');
    }
  };

  const handleKeywordChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      meta_keywords: prev.meta_keywords.map((keyword, i) => i === index ? value : keyword)
    }));
  };

  const addKeyword = () => {
    setFormData(prev => ({
      ...prev,
      meta_keywords: [...prev.meta_keywords, '']
    }));
  };

  const removeKeyword = (index: number) => {
    setFormData(prev => ({
      ...prev,
      meta_keywords: prev.meta_keywords.filter((_, i) => i !== index)
    }));
  };

  const handleAIContentInsert = (content: string) => {
    // Insert AI-generated content into the Quill editor
    setFormData(prev => ({
      ...prev,
      content: prev.content ? prev.content + '\n\n' + content : content
    }));
  };

  const getPageTypeFromSlug = (slug: string): string => {
    if (slug.includes('privacy')) return 'privacy-policy';
    if (slug.includes('terms')) return 'terms-of-service';
    if (slug.includes('about')) return 'about';
    return 'general';
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
    const placement = page.navigation_placement || 'none';
    switch (placement) {
      case 'top_nav':
        return { text: 'Top Navigation', color: 'text-blue-400 bg-blue-400/10' };
      case 'sub_nav':
        return { 
          text: `Sub Nav (${page.parent_nav_item || 'No Parent'})`, 
          color: 'text-purple-400 bg-purple-400/10' 
        };
      case 'footer':
        return { 
          text: `Footer (${page.footer_section || 'No Section'})`, 
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
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create Page</span>
          </button>
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

        {/* Create/Edit Form */}
        {showCreateForm && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingPage ? 'Edit Page' : 'Create New Page'}
            </h2>
            
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
                  <label className="block text-gray-400 text-sm mb-2">Page Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="Enter page title"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">URL Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    placeholder="page-url-slug"
                  />
                  <p className="text-xs text-gray-500 mt-1">URL: /pages/{formData.slug}</p>
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
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
                  </label>
                </div>

              </div>

              {/* Navigation Settings Section */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">Navigation Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2">Navigation Placement</label>
                    <select
                      value={formData.navigation_placement}
                      onChange={(e) => setFormData(prev => ({ ...prev, navigation_placement: e.target.value as any }))}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                    >
                      <option value="none">None - Standalone Page</option>
                      <option value="top_nav">Top Navigation</option>
                      <option value="sub_nav">Sub Navigation</option>
                      <option value="footer">Footer</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Choose where this page will appear in your site navigation
                    </p>
                  </div>

                  {/* Conditional fields based on navigation placement */}
                  {formData.navigation_placement === 'sub_nav' && (
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Parent Navigation Item</label>
                      <select
                        value={formData.parent_nav_item}
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
                        Select which main navigation item this page will appear under
                      </p>
                    </div>
                  )}

                  {formData.navigation_placement === 'footer' && (
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Footer Section</label>
                      <select
                        value={formData.footer_section}
                        onChange={(e) => setFormData(prev => ({ ...prev, footer_section: e.target.value as any }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        <option value="company">Company</option>
                        <option value="quick_links">Quick Links</option>
                        <option value="legal">Legal</option>
                        <option value="support">Support</option>
                        <option value="social">Social</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose which footer section this page will appear in
                      </p>
                    </div>
                  )}

                  {formData.navigation_placement !== 'none' && (
                    <>
                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Navigation Title</label>
                        <input
                          type="text"
                          value={formData.nav_title || formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, nav_title: e.target.value }))}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                          placeholder="Title to show in navigation (defaults to page title)"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Leave blank to use the page title
                        </p>
                      </div>

                      <div>
                        <label className="block text-gray-400 text-sm mb-2">Navigation Order</label>
                        <input
                          type="number"
                          value={formData.nav_order || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, nav_order: e.target.value ? Number(e.target.value) : undefined }))}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                          placeholder="1, 2, 3... (lower numbers appear first)"
                          min="1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Order in which this page appears in the navigation (1 = first)
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex items-center">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.show_in_sitemap}
                        onChange={(e) => setFormData(prev => ({ ...prev, show_in_sitemap: e.target.checked }))}
                        className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                      />
                      <span className="text-gray-400">Show in Sitemap</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">
                      Include this page in XML sitemap for search engines
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Page Content *</label>
                <div className="quill-wrapper">
                  <ReactQuill
                    value={formData.content}
                    onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Start writing your page content here... You can use the toolbar above to format text, add links, images, and more."
                    theme="snow"
                    style={{
                      backgroundColor: 'rgba(55, 65, 81, 0.5)',
                      borderRadius: '0.5rem',
                      border: '1px solid rgb(75, 85, 99)'
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 Use the toolbar to format text, add links, images, lists, and more. The content will be saved as HTML.
                </p>
              </div>

              {/* SEO Section */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-white mb-4">SEO Settings</h3>
                
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

        {/* Pages List */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
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
                        onClick={() => handleEdit(page)}
                        className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                        title="Edit Page"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <button
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
      </div>

      {/* AI Writing Assistant - Only show when creating/editing */}
      {showCreateForm && (
        <AIWritingAssistant
          onInsertContent={handleAIContentInsert}
          pageType={getPageTypeFromSlug(formData.slug)}
          currentContent={formData.content}
        />
      )}
    </div>
  );
} 