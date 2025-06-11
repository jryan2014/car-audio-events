import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, FileText, Globe, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

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
    is_featured: false
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
      
      const { data, error } = await supabase
        .from('cms_pages')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
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
      const pageData = {
        ...formData,
        author_id: user.id,
        published_at: formData.status === 'published' ? new Date().toISOString() : null
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

      // Reset form and reload data
      setFormData({
        title: '',
        slug: '',
        content: '',
        meta_title: '',
        meta_description: '',
        meta_keywords: [],
        status: 'draft',
        is_featured: false
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
      is_featured: page.is_featured
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-green-400 bg-green-400/10';
      case 'draft': return 'text-yellow-400 bg-yellow-400/10';
      case 'archived': return 'text-gray-400 bg-gray-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
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
                      is_featured: false
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
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-3">/{page.slug}</p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Created: {new Date(page.created_at).toLocaleDateString()}</span>
                        <span>Updated: {new Date(page.updated_at).toLocaleDateString()}</span>
                        {page.published_at && (
                          <span>Published: {new Date(page.published_at).toLocaleDateString()}</span>
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
    </div>
  );
} 