import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { activityLogger } from '../services/activityLogger';
import { 
  BookOpen, 
  FileText, 
  ExternalLink, 
  Search,
  Filter,
  Calendar,
  Users,
  Award,
  Info,
  HelpCircle,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Shield,
  Wrench,
  Trophy,
  Settings,
  AlertTriangle,
  Target,
  Zap
} from 'lucide-react';

interface CMSPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_description: string;
  status: string;
  navigation_placement: string;
  parent_nav_item: string;
  nav_title: string;
  created_at: string;
  updated_at: string;
}

interface ResourceCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  pages: CMSPage[];
}


export default function Resources() {
  const { user } = useAuth();
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadResourcePages();
    
    // Log page visit
    if (user) {
      activityLogger.log({
        userId: user.id,
        activityType: 'resource_view',
        description: `User visited Resources page`,
        metadata: {
          page: 'resources',
          user_email: user.email,
          user_name: user.name,
          membership_type: user.membershipType
        }
      });
    }
  }, []);

  const loadResourcePages = async () => {
    try {
      setIsLoading(true);
      
      // Load CMS pages that are published and meant for resources
      const { data, error } = await supabase
        .from('cms_pages')
        .select('*')
        .eq('status', 'published')
        .in('navigation_placement', ['sub_nav', 'main'])
        .order('nav_order', { ascending: true });

      if (error) throw error;
      setPages(data || []);
    } catch (error) {
      console.error('Error loading resource pages:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const getIconForPage = (title: string) => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('rule') || titleLower.includes('regulation')) return Shield;
    if (titleLower.includes('guide') || titleLower.includes('tutorial')) return BookOpen;
    if (titleLower.includes('organization') || titleLower.includes('iasca') || titleLower.includes('meca')) return Users;
    if (titleLower.includes('competition') || titleLower.includes('contest')) return Trophy;
    if (titleLower.includes('install') || titleLower.includes('setup')) return Wrench;
    if (titleLower.includes('safety') || titleLower.includes('warning')) return AlertTriangle;
    if (titleLower.includes('setting') || titleLower.includes('config')) return Settings;
    return FileText;
  };

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.meta_description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resourceCategories: ResourceCategory[] = [
    {
      id: 'rules-guidelines',
      title: 'Competition Rules & Guidelines',
      description: 'Official rules, guidelines, and codes of conduct for car audio competitions',
      icon: CheckCircle,
      pages: filteredPages.filter(page => 
        page.title.toLowerCase().includes('rule') || 
        page.title.toLowerCase().includes('guideline') ||
        page.title.toLowerCase().includes('ethics') ||
        page.title.toLowerCase().includes('code')
      )
    },
    {
      id: 'guides-tutorials',
      title: 'Guides & Tutorials',
      description: 'Educational content to help you improve your car audio system and competition skills',
      icon: BookOpen,
      pages: filteredPages.filter(page => 
        page.title.toLowerCase().includes('guide') || 
        page.title.toLowerCase().includes('tutorial') ||
        page.title.toLowerCase().includes('how to')
      )
    },
    {
      id: 'organization-info',
      title: 'Organization Information',
      description: 'Learn about different car audio competition organizations and their specific requirements',
      icon: Users,
      pages: filteredPages.filter(page => 
        page.title.toLowerCase().includes('organization') || 
        page.title.toLowerCase().includes('iasca') ||
        page.title.toLowerCase().includes('meca') ||
        page.title.toLowerCase().includes('db drag')
      )
    },
    {
      id: 'general-info',
      title: 'General Information',
      description: 'General resources and information for car audio enthusiasts',
      icon: Info,
      pages: filteredPages.filter(page => 
        !page.title.toLowerCase().includes('rule') && 
        !page.title.toLowerCase().includes('guide') &&
        !page.title.toLowerCase().includes('organization') &&
        !page.title.toLowerCase().includes('ethics') &&
        !page.title.toLowerCase().includes('code')
      )
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <div className="text-white">Loading resources...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Car Audio Resources
          </h1>
          <p className="page-subtitle">
            Everything you need to know about car audio competitions, rules, organizations, and best practices.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Link
            to="/events"
            className="bg-gradient-to-r from-electric-500/20 to-purple-500/20 border border-electric-500/30 rounded-xl p-6 hover:border-electric-500/50 transition-all duration-300 group"
          >
            <Calendar className="h-8 w-8 text-electric-400 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-white mb-2">Find Events</h3>
            <p className="text-gray-400 text-sm">Discover upcoming car audio competitions near you</p>
          </Link>

          <Link
            to="/directory"
            className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300 group"
          >
            <Users className="h-8 w-8 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-white mb-2">Directory</h3>
            <p className="text-gray-400 text-sm">Connect with competitors, shops, and organizations</p>
          </Link>

          <Link
            to="/pricing"
            className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-300 group"
          >
            <Award className="h-8 w-8 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-white mb-2">Membership</h3>
            <p className="text-gray-400 text-sm">Upgrade your account for premium features</p>
          </Link>

          <Link
            to="/support"
            className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-xl p-6 hover:border-orange-500/50 transition-all duration-300 group"
          >
            <HelpCircle className="h-8 w-8 text-orange-400 mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-white mb-2">Get Help</h3>
            <p className="text-gray-400 text-sm">Contact our support team for assistance</p>
          </Link>
        </div>

        {/* Resource Categories */}
        <div className="space-y-12">
          {resourceCategories.map((category) => (
            <div key={category.id} className="bg-gray-800/30 rounded-xl p-8 border border-gray-700/50">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-electric-500/20 p-3 rounded-lg">
                  <category.icon className="h-6 w-6 text-electric-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{category.title}</h2>
                  <p className="text-gray-400">{category.description}</p>
                </div>
              </div>

              {category.pages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.pages.map((page) => {
                    const IconComponent = getIconForPage(page.title);
                    return (
                      <Link
                        key={page.id}
                        to={`/pages/${page.slug}`}
                        className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-6 hover:border-electric-500/50 hover:bg-gray-700/50 transition-all duration-300 group"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="bg-electric-500/20 p-2 rounded-lg flex-shrink-0">
                            <IconComponent className="h-5 w-5 text-electric-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-electric-400 transition-colors">
                              {page.nav_title || page.title}
                            </h3>
                            {page.meta_description && (
                              <p className="text-gray-400 text-sm line-clamp-3">
                                {page.meta_description}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-3 text-xs text-gray-500">
                              <span>Updated {new Date(page.updated_at).toLocaleDateString()}</span>
                              <ExternalLink className="h-3 w-3" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No resources available in this category yet.</p>
                  <p className="text-sm">Check back later for new content!</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* No Results */}
        {searchQuery && filteredPages.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No resources found</h3>
            <p className="text-gray-400 mb-4">
              No resources match your search for "{searchQuery}"
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 