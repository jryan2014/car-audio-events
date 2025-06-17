import React, { useState } from 'react';
import { X, HelpCircle, Eye, Globe, Search, Navigation, FileText, Settings } from 'lucide-react';

interface CMSPageHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CMSPageHelp({ isOpen, onClose }: CMSPageHelpProps) {
  const [activeSection, setActiveSection] = useState('overview');

  if (!isOpen) return null;

  const sections = [
    { id: 'overview', title: 'Overview', icon: FileText },
    { id: 'basic-fields', title: 'Basic Fields', icon: Settings },
    { id: 'navigation', title: 'Navigation', icon: Navigation },
    { id: 'seo', title: 'SEO Settings', icon: Search },
    { id: 'examples', title: 'Examples', icon: Eye }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <HelpCircle className="h-6 w-6 text-electric-400" />
            <h2 className="text-xl font-bold text-white">CMS Pages Help Guide</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-900/50 border-r border-gray-700 p-4">
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeSection === section.id
                      ? 'bg-electric-500/20 text-electric-400'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <section.icon className="h-4 w-4" />
                  <span className="text-sm">{section.title}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeSection === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">What are CMS Pages?</h3>
                  <p className="text-gray-300 mb-4">
                    CMS (Content Management System) pages allow you to create and manage static content pages on your website. 
                    These pages can be used for various purposes like About pages, Terms of Service, Privacy Policy, 
                    Help documentation, and more.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">How Pages Appear on Your Site</h3>
                  <div className="space-y-3">
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h4 className="font-medium text-electric-400 mb-2">🌐 Public URL</h4>
                      <p className="text-gray-300 text-sm">
                        All published pages are accessible at: <code className="bg-gray-600 px-2 py-1 rounded text-electric-300">/pages/your-slug</code>
                      </p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h4 className="font-medium text-electric-400 mb-2">📱 Navigation Integration</h4>
                      <p className="text-gray-300 text-sm">
                        Pages can automatically appear in your site's navigation menus, footer, or as standalone pages.
                      </p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h4 className="font-medium text-electric-400 mb-2">📚 Resources Section</h4>
                      <p className="text-gray-300 text-sm">
                        Pages with navigation placement "sub_nav" or "main" automatically appear in the Resources section, 
                        categorized by their content type.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'basic-fields' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white mb-4">Basic Page Fields</h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">📝 Page Title</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      <strong>Where it appears:</strong> Page header, browser tab, navigation menus (if no custom nav title)
                    </p>
                    <p className="text-gray-300 text-sm">
                      <strong>Best practices:</strong> Keep it clear and descriptive (50-60 characters max)
                    </p>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">🔗 URL Slug</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      <strong>Where it appears:</strong> Browser address bar as /pages/your-slug
                    </p>
                    <p className="text-gray-300 text-sm">
                      <strong>Auto-generated:</strong> Automatically created from title, but you can customize it
                    </p>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">📄 Page Content</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      <strong>Where it appears:</strong> Main content area of the page
                    </p>
                    <p className="text-gray-300 text-sm">
                      <strong>Features:</strong> Rich text editor with formatting, links, images, lists, and more
                    </p>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">🎯 Status</h4>
                    <div className="text-gray-300 text-sm space-y-1">
                      <p><strong>Draft:</strong> Not visible to public, only admins can see</p>
                      <p><strong>Published:</strong> Live and accessible to all visitors</p>
                      <p><strong>Archived:</strong> Hidden from public but preserved</p>
                    </div>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">⭐ Featured Page</h4>
                    <p className="text-gray-300 text-sm">
                      <strong>Effect:</strong> Adds a "Featured" badge and may appear prominently in listings
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'navigation' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white mb-4">Navigation Settings</h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">🧭 Navigation Placement</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start space-x-2">
                        <span className="text-gray-400 font-mono">none:</span>
                        <span className="text-gray-300">Standalone page, not in any navigation</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-400 font-mono">main:</span>
                        <span className="text-gray-300">Appears in main navigation bar + Resources section</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-purple-400 font-mono">sub_nav:</span>
                        <span className="text-gray-300">Appears under a parent menu + Resources section</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-400 font-mono">footer:</span>
                        <span className="text-gray-300">Appears in website footer</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">👨‍👩‍👧‍👦 Parent Navigation Item</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      <strong>When to use:</strong> Only appears when Navigation Placement is "sub_nav"
                    </p>
                    <p className="text-gray-300 text-sm">
                      <strong>Effect:</strong> Page appears in dropdown menu under the selected parent item
                    </p>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">🏷️ Navigation Title</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      <strong>Purpose:</strong> Custom shorter title for navigation menus
                    </p>
                    <p className="text-gray-300 text-sm">
                      <strong>Example:</strong> Page title "Privacy Policy and Terms" → Nav title "Privacy"
                    </p>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">🔢 Navigation Order</h4>
                    <p className="text-gray-300 text-sm">
                      <strong>How it works:</strong> Lower numbers appear first (1, 2, 3...)
                    </p>
                    <p className="text-gray-300 text-sm">
                      <strong>Tip:</strong> Use increments of 10 (10, 20, 30) to easily insert items later
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'seo' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white mb-4">SEO Settings</h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">🏷️ Meta Title</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      <strong>Where it appears:</strong> Browser tab, search engine results title
                    </p>
                    <p className="text-gray-300 text-sm">
                      <strong>Best practices:</strong> 50-60 characters, include target keywords
                    </p>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">📝 Meta Description</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      <strong>Where it appears:</strong> Search engine results snippet, Resources page cards
                    </p>
                    <p className="text-gray-300 text-sm">
                      <strong>Best practices:</strong> 150-160 characters, compelling summary of page content
                    </p>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">🔍 Meta Keywords</h4>
                    <p className="text-gray-300 text-sm mb-2">
                      <strong>Purpose:</strong> Help categorize content (less important for modern SEO)
                    </p>
                    <p className="text-gray-300 text-sm">
                      <strong>Usage:</strong> Add relevant terms that describe your page content
                    </p>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">🗺️ Include in Sitemap</h4>
                    <p className="text-gray-300 text-sm">
                      <strong>Effect:</strong> When checked, page is included in XML sitemap for search engines
                    </p>
                    <p className="text-gray-300 text-sm">
                      <strong>Recommendation:</strong> Keep checked unless page is private/internal
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'examples' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white mb-4">Common Page Examples</h3>
                
                <div className="space-y-4">
                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">📋 Competition Rules Page</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Title:</strong> "IASCA Competition Rules 2024"</p>
                      <p><strong>Navigation:</strong> sub_nav → Resources</p>
                      <p><strong>Result:</strong> Appears in Resources → Competition Rules & Guidelines</p>
                    </div>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">📖 Installation Guide</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Title:</strong> "Car Audio Installation Guide"</p>
                      <p><strong>Navigation:</strong> sub_nav → Resources</p>
                      <p><strong>Result:</strong> Appears in Resources → Guides & Tutorials</p>
                    </div>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">🏢 About Us Page</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Title:</strong> "About Car Audio Events"</p>
                      <p><strong>Navigation:</strong> main</p>
                      <p><strong>Result:</strong> Appears in main navigation + Resources</p>
                    </div>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">⚖️ Legal Page</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Title:</strong> "Privacy Policy"</p>
                      <p><strong>Navigation:</strong> footer → legal</p>
                      <p><strong>Result:</strong> Appears in footer Legal section</p>
                    </div>
                  </div>

                  <div className="bg-gray-700/30 rounded-lg p-4">
                    <h4 className="font-medium text-electric-400 mb-2">📄 Standalone Page</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Title:</strong> "Event Submission Guidelines"</p>
                      <p><strong>Navigation:</strong> none</p>
                      <p><strong>Result:</strong> Accessible only via direct link</p>
                    </div>
                  </div>
                </div>

                <div className="bg-electric-500/10 border border-electric-500/20 rounded-lg p-4">
                  <h4 className="font-medium text-electric-400 mb-2">💡 Pro Tip</h4>
                  <p className="text-gray-300 text-sm">
                    Pages with keywords like "rule", "guide", "organization", or "iasca" in their titles 
                    are automatically categorized in the Resources section for better organization!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 