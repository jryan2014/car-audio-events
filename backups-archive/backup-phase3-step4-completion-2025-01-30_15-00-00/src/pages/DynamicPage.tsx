import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<CMSPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    loadPage();
  }, [slug]);

  const loadPage = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPage(data);
        
        // Update page title and meta tags
        if (data.meta_title) {
          document.title = data.meta_title;
        } else {
          document.title = data.title + ' - Car Audio Events';
        }
        
        // Update meta description
        const existingMetaDescription = document.querySelector('meta[name="description"]');
        if (existingMetaDescription && data.meta_description) {
          existingMetaDescription.setAttribute('content', data.meta_description);
        }
      }
    } catch (error) {
      console.error('Error loading page:', error);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading page...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-black text-white mb-6">
            {page.title}
          </h1>
          {page.meta_description && (
            <p className="page-subtitle">
              {page.meta_description}
            </p>
          )}
        </div>

        {/* Page Content */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
          <div 
            className="prose prose-invert prose-electric max-w-none"
            dangerouslySetInnerHTML={{ __html: page.content }}
            style={{
              color: '#e5e7eb',
              lineHeight: '1.7'
            }}
          />
        </div>

        {/* Page Meta */}
        <div className="mt-8 text-center text-sm text-gray-500">
          {page.published_at && (
            <p>Published on {new Date(page.published_at).toLocaleDateString()}</p>
          )}
        </div>
      </div>

      <style>{`
        .prose h1 { color: #ffffff; font-size: 2rem; margin-bottom: 1rem; }
        .prose h2 { color: #ffffff; font-size: 1.5rem; margin-bottom: 0.75rem; margin-top: 2rem; }
        .prose h3 { color: #ffffff; font-size: 1.25rem; margin-bottom: 0.5rem; margin-top: 1.5rem; }
        .prose h4 { color: #ffffff; font-size: 1.125rem; margin-bottom: 0.5rem; margin-top: 1rem; }
        .prose p { margin-bottom: 1rem; }
        .prose ul, .prose ol { margin-bottom: 1rem; padding-left: 1.5rem; }
        .prose li { margin-bottom: 0.5rem; }
        .prose a { color: #10b981; text-decoration: underline; }
        .prose a:hover { color: #059669; }
        .prose strong { color: #ffffff; font-weight: 600; }
        .prose em { font-style: italic; }
        .prose blockquote { 
          border-left: 4px solid #10b981; 
          padding-left: 1rem; 
          margin: 1rem 0; 
          font-style: italic;
          color: #d1d5db;
        }
        .prose code {
          background-color: rgba(55, 65, 81, 0.5);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          color: #10b981;
        }
        .prose pre {
          background-color: rgba(55, 65, 81, 0.5);
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        .prose th, .prose td {
          border: 1px solid #374151;
          padding: 0.5rem;
          text-align: left;
        }
        .prose th {
          background-color: rgba(55, 65, 81, 0.5);
          font-weight: 600;
          color: #ffffff;
        }
        .prose img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
      `}</style>
    </div>
  );
} 