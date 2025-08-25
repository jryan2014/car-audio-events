import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Eye, Target, DollarSign, Calendar, MapPin, Tag, BarChart3, Settings, X, HelpCircle, Info, Sparkles, MessageSquare, Upload, Image as ImageIcon, ExternalLink, Users, Building2, Crown, Wrench, Wand2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import BannerAICreator from '../components/BannerAICreator';
import AdvertisementImageManager from '../components/AdvertisementImageManager';
import AdImageUpload from '../components/AdImageUpload';
import AdRotationSettings from '../components/admin-settings/AdRotationSettings';
import FrequencyCapManager from '../components/admin-settings/FrequencyCapManager';
import type { GeneratedImage } from '../lib/imageGeneration';
import type { AdvertisementImage } from '../types/advertisement';

interface Advertisement {
  id: string;
  title: string;
  description: string;
  image_url: string;
  click_url: string;
  advertiser_name: string;
  advertiser_email: string;
  advertiser_user_id?: string; // Link to user account
  placement_type: 'header' | 'sidebar' | 'event_page' | 'mobile_banner' | 'footer' | 'directory_listing' | 'search_results';
  size: 'small' | 'medium' | 'large' | 'banner' | 'square' | 'leaderboard' | 'skyscraper';
  target_pages: string[];
  target_keywords: string[];
  target_categories: string[];
  target_user_types: string[];
  budget: number;
  cost_per_click: number;
  cost_per_impression: number;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'active' | 'paused' | 'completed' | 'rejected';
  clicks: number;
  impressions: number;
  spent: number;
  conversion_rate: number;
  roi: number;
  created_at: string;
  updated_at: string;
  // New fields for enhanced system
  priority: number;
  frequency_cap: number;
  geographic_targeting: string[];
  device_targeting: string[];
  time_targeting: any;
  a_b_test_variant?: string;
  notes: string;
  rotation_mode?: 'timer' | 'priority';
}

interface AdFormData {
  title: string;
  description: string;
  image_url: string;
  click_url: string;
  advertiser_name: string;
  advertiser_email: string;
  advertiser_user_id?: string;
  placement_type: Advertisement['placement_type'];
  size: Advertisement['size'];
  target_pages: string[];
  target_keywords: string[];
  target_categories: string[];
  target_user_types: string[];
  budget: number;
  cost_per_click: number;
  cost_per_impression: number;
  start_date: string;
  end_date: string;
  status?: Advertisement['status'];
  pricing_model: 'cpc' | 'cpm' | 'fixed';
  priority: number;
  frequency_cap: number;
  geographic_targeting: string[];
  device_targeting: string[];
  notes: string;
  rotation_mode?: 'timer' | 'priority';
}

interface PlacementInfo {
  type: string;
  name: string;
  description: string;
  dimensions: string;
  traffic: string;
  visibility: string;
  recommended_sizes: string[];
  pricing_range: string;
  examples: string[];
}

export default function AdManagement() {
  const { user } = useAuth();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdModal, setShowAdModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showAIBannerCreator, setShowAIBannerCreator] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [placementFilter, setPlacementFilter] = useState<string>('all');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  
  // AI Chat state
  const [aiMessages, setAiMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Modal refs
  const modalRef = useRef<HTMLDivElement>(null);
  const aiModalRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<AdFormData>({
    title: '',
    description: '',
    image_url: '',
    click_url: '',
    advertiser_name: '',
    advertiser_email: '',
    advertiser_user_id: '',
    placement_type: 'sidebar',
    size: 'medium',
    target_pages: [],
    target_keywords: [],
    target_categories: [],
    target_user_types: [],
    budget: 100,
    cost_per_click: 0.50,
    cost_per_impression: 0.01,
    start_date: '',
    end_date: '',
    pricing_model: 'cpc',
    priority: 1,
    frequency_cap: 3,
    geographic_targeting: [],
    device_targeting: ['desktop', 'mobile'],
    notes: '',
    rotation_mode: 'timer'
  });

  // Placement information with detailed specs
  const placementInfo: Record<string, PlacementInfo> = {
    header: {
      type: 'header',
      name: 'Header Banner',
      description: 'Premium placement at the top of every page, maximum visibility',
      dimensions: '728x90 (Leaderboard) or 970x250 (Billboard)',
      traffic: 'High - Seen by 100% of visitors',
      visibility: 'Excellent - Above the fold on all devices',
      recommended_sizes: ['banner', 'leaderboard'],
      pricing_range: '$2.00-5.00 CPC, $15-25 CPM',
      examples: ['Brand awareness campaigns', 'Event announcements', 'Product launches']
    },
    sidebar: {
      type: 'sidebar',
      name: 'Sidebar Advertisement',
      description: 'Consistent placement on content pages, good for targeted campaigns',
      dimensions: '300x250 (Medium Rectangle) or 160x600 (Skyscraper)',
      traffic: 'Medium-High - Visible on most content pages',
      visibility: 'Good - Consistent placement, less intrusive',
      recommended_sizes: ['medium', 'square', 'skyscraper'],
      pricing_range: '$1.50-3.00 CPC, $8-15 CPM',
      examples: ['Product promotions', 'Service offerings', 'Local business ads']
    },
    event_page: {
      type: 'event_page',
      name: 'Event Page Placement',
      description: 'Targeted placement on event detail pages, highly relevant audience',
      dimensions: '300x250 or 728x90',
      traffic: 'Medium - Event-specific traffic',
      visibility: 'Excellent - Highly engaged audience',
      recommended_sizes: ['medium', 'banner', 'square'],
      pricing_range: '$2.50-4.00 CPC, $12-20 CPM',
      examples: ['Event sponsors', 'Related products', 'Competition gear']
    },
    mobile_banner: {
      type: 'mobile_banner',
      name: 'Mobile Banner',
      description: 'Mobile-optimized placement for smartphone users',
      dimensions: '320x50 or 300x250',
      traffic: 'High - 60%+ mobile traffic',
      visibility: 'Good - Mobile-optimized display',
      recommended_sizes: ['small', 'medium'],
      pricing_range: '$1.00-2.50 CPC, $6-12 CPM',
      examples: ['Mobile apps', 'Local services', 'Quick purchases']
    },
    footer: {
      type: 'footer',
      name: 'Footer Placement',
      description: 'Bottom of page placement, budget-friendly option',
      dimensions: '728x90 or 300x250',
      traffic: 'Low-Medium - Scroll-dependent visibility',
      visibility: 'Fair - Requires user scroll',
      recommended_sizes: ['banner', 'medium'],
      pricing_range: '$0.75-1.50 CPC, $4-8 CPM',
      examples: ['Budget campaigns', 'Brand reinforcement', 'Secondary offers']
    },
    directory_listing: {
      type: 'directory_listing',
      name: 'Directory Listing',
      description: 'Integrated with business directory, highly targeted',
      dimensions: '300x150 or 250x250',
      traffic: 'Medium - Directory browsers',
      visibility: 'Excellent - Contextually relevant',
      recommended_sizes: ['medium', 'square'],
      pricing_range: '$2.00-3.50 CPC, $10-18 CPM',
      examples: ['Business listings', 'Service providers', 'Local shops']
    },
    search_results: {
      type: 'search_results',
      name: 'Search Results',
      description: 'Appears in search results, keyword-targeted placement',
      dimensions: '300x100 or 728x90',
      traffic: 'High - Search-driven traffic',
      visibility: 'Excellent - Intent-based audience',
      recommended_sizes: ['banner', 'medium'],
      pricing_range: '$3.00-6.00 CPC, $20-35 CPM',
      examples: ['Keyword campaigns', 'Competitive targeting', 'Product searches']
    }
  };

  // User type targeting options
  const userTypes = [
    { id: 'competitor', name: 'Competitors', icon: Users, description: 'Car audio competitors and enthusiasts' },
    { id: 'retailer', name: 'Retailers', icon: Building2, description: 'Car audio retailers and dealers' },
    { id: 'manufacturer', name: 'Manufacturers', icon: Wrench, description: 'Car audio manufacturers and brands' },
    { id: 'organization', name: 'Organizations', icon: Crown, description: 'Car audio organizations and clubs' },
    { id: 'general', name: 'General Public', icon: Users, description: 'General car audio enthusiasts' }
  ];

  useEffect(() => {
    loadAds();
  }, []);

  // Check if user is admin or has advertiser permissions
  if (!user || (user.membershipType !== 'admin' && !['retailer', 'manufacturer', 'organization'].includes(user.membershipType || ''))) {
    return <Navigate to="/" replace />;
  }

  const loadAds = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });

      // If not admin, only show user's own ads
      if (user?.membershipType !== 'admin') {
        query = query.eq('advertiser_email', user?.email);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error loading ads:', error);
      setError('Failed to load advertisements');
      setAds([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaveStatus('saving');
      
      // Prepare data for database - exclude pricing_model as it's not in the table
      const { pricing_model, ...dbData } = formData;
      
      const adData = {
        ...dbData,
        status: user?.membershipType === 'admin' ? formData.status || 'active' : 'pending',
        clicks: editingAd?.clicks || 0,
        impressions: editingAd?.impressions || 0,
        spent: editingAd?.spent || 0,
        conversion_rate: editingAd?.conversion_rate || 0,
        roi: editingAd?.roi || 0,
        advertiser_user_id: user?.id,
        // Ensure arrays are properly initialized
        target_pages: formData.target_pages || [],
        target_keywords: formData.target_keywords || [],
        target_categories: formData.target_categories || [],
        target_user_types: formData.target_user_types || [],
        geographic_targeting: formData.geographic_targeting || [],
        // Ensure device_targeting is properly formatted
        device_targeting: formData.device_targeting || ['desktop', 'mobile'],
        // Add time_targeting if it exists
        time_targeting: {}
      };

      if (editingAd) {
        const { error } = await supabase
          .from('advertisements')
          .update(adData)
          .eq('id', editingAd.id);
          
        if (error) throw error;
        setSuccess('Advertisement updated successfully');
      } else {
        const { error } = await supabase
          .from('advertisements')
          .insert([adData]);
          
        if (error) throw error;
        setSuccess('Advertisement created successfully');
      }

      setShowAdModal(false);
      setEditingAd(null);
      resetForm();
      loadAds();
      setSaveStatus('success');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving ad:', error);
      setError('Failed to save advertisement. Please try again.');
      setSaveStatus('error');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleEdit = (ad: Advertisement) => {
    setEditingAd(ad);
    
    // Convert timestamp dates to YYYY-MM-DD format for date inputs
    const formatDateForInput = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };
    
    setFormData({
      title: ad.title,
      description: ad.description,
      image_url: ad.image_url,
      click_url: ad.click_url,
      advertiser_name: ad.advertiser_name,
      advertiser_email: ad.advertiser_email,
      advertiser_user_id: ad.advertiser_user_id,
      placement_type: ad.placement_type,
      size: ad.size,
      target_pages: ad.target_pages,
      target_keywords: ad.target_keywords,
      target_categories: ad.target_categories,
      target_user_types: ad.target_user_types || [],
      budget: ad.budget,
      cost_per_click: ad.cost_per_click,
      cost_per_impression: ad.cost_per_impression,
      start_date: formatDateForInput(ad.start_date),
      end_date: formatDateForInput(ad.end_date),
      pricing_model: ad.cost_per_click > 0 ? 'cpc' : 'cpm',
      priority: ad.priority || 1,
      status: ad.status,
      frequency_cap: ad.frequency_cap || 3,
      geographic_targeting: ad.geographic_targeting || [],
      device_targeting: ad.device_targeting || ['desktop', 'mobile'],
      notes: ad.notes || '',
      rotation_mode: ad.rotation_mode || 'timer'
    });
    setShowAdModal(true);
  };

  const handleStatusChange = async (adId: string, newStatus: Advertisement['status']) => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('You must be logged in to update advertisements');
        setTimeout(() => setError(''), 5000);
        return;
      }
      
      // For admin users, also update advertiser_user_id if it's null
      // This ensures the ad can be updated even if it has no owner
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      // If user is admin and ad might not have an owner, claim it
      if (user?.membershipType === 'admin') {
        // First check if the ad has an owner
        const { data: ad } = await supabase
          .from('advertisements')
          .select('advertiser_user_id')
          .eq('id', adId)
          .single();
          
        if (ad && !ad.advertiser_user_id) {
          updateData.advertiser_user_id = user.id;
        }
      }
      
      const { data: updateResult, error } = await supabase
        .from('advertisements')
        .update(updateData)
        .eq('id', adId)
        .select();
        
      if (error) {
        console.error('Detailed update error:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          updateData,
          adId,
          user: user?.email
        });
        throw error;
      }
      
      console.log('Update successful:', updateResult);
      
      loadAds();
      setSuccess(`Advertisement ${newStatus} successfully`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating ad status:', error);
      setError('Failed to update advertisement status');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDelete = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this advertisement?')) return;
    
    try {
      // For admin users deleting ads without owners, first claim ownership
      if (user?.membershipType === 'admin') {
        const { data: ad } = await supabase
          .from('advertisements')
          .select('advertiser_user_id')
          .eq('id', adId)
          .single();
          
        if (ad && !ad.advertiser_user_id) {
          // Claim ownership first
          await supabase
            .from('advertisements')
            .update({ advertiser_user_id: user.id })
            .eq('id', adId);
        }
      }
      
      const { error } = await supabase
        .from('advertisements')
        .delete()
        .eq('id', adId);
        
      if (error) throw error;
      loadAds();
      setSuccess('Advertisement deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting ad:', error);
      setError('Failed to delete advertisement');
      setTimeout(() => setError(''), 5000);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      image_url: '',
      click_url: '',
      advertiser_name: user?.name || '',
      advertiser_email: user?.email || '',
      advertiser_user_id: user?.id || '',
      placement_type: 'sidebar',
      size: 'medium',
      target_pages: [],
      target_keywords: [],
      target_categories: [],
      target_user_types: [],
      budget: 100,
      cost_per_click: 0.50,
      cost_per_impression: 0.01,
      start_date: '',
      end_date: '',
      pricing_model: 'cpc',
      priority: 1,
      frequency_cap: 3,
      geographic_targeting: [],
      device_targeting: ['desktop', 'mobile'],
      notes: '',
      rotation_mode: 'timer'
    });
  };

  // Helper component for tooltips
  const Tooltip = ({ content, children }: { content: string; children: React.ReactNode }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [position, setPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
    const [adjustedPosition, setAdjustedPosition] = useState({ x: 0, y: 0 });
    const tooltipRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    
    // Only hide tooltips when AI Assistant or Help modals are open
    // Allow tooltips to show when ad creation modal is open (users need form field help)
    const shouldShowTooltip = showTooltip && !showAIModal && !showHelpModal;

    useEffect(() => {
      if (shouldShowTooltip && tooltipRef.current && triggerRef.current) {
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
    }, [shouldShowTooltip, showAIModal, showHelpModal]);

    const getTooltipClasses = () => {
      const baseClasses = "absolute z-[9999] px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-xl border border-gray-700 w-max max-w-[280px] sm:max-w-[320px]";
      
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
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="cursor-help"
        >
          {children}
        </div>
        {shouldShowTooltip && (
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

  // AI Chat functionality with image generation
  const handleAIChat = async () => {
    if (!aiInput.trim()) return;
    
    setAiLoading(true);
    const userMessage = aiInput;
    setAiInput('');
    
    // Add user message
    setAiMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    try {
      let response = '';
      
      if (userMessage.toLowerCase().includes('banner') || userMessage.toLowerCase().includes('design') || userMessage.toLowerCase().includes('create')) {
        response = "I can help you create professional banner designs! I now have AI image generation capabilities:\n\n🎨 **AI Banner Creator Features:**\n• Generate custom banners with DALL-E 3\n• Multiple size options (leaderboard, rectangle, skyscraper, etc.)\n• Car audio-specific design prompts\n• Professional automotive styling\n• High-quality HD options available\n\n💡 **Design Tips:**\n• Use high-contrast colors (electric blue, red, black, silver)\n• Include clear product imagery\n• Add compelling headlines\n• Ensure text is readable at banner size\n• Include space for your logo\n\n**Click the 'Create with AI' button in the ad form to generate custom banners!**\n\nWhat type of banner would you like to create?";
      } else if (userMessage.toLowerCase().includes('targeting')) {
        response = "Great question about targeting! For car audio ads, I recommend:\n\n• Target 'Competitors' for performance products\n• Target 'Retailers' for B2B opportunities\n• Use keywords like 'SPL', 'sound quality', 'subwoofer'\n• Focus on event pages for maximum engagement\n\nWhat type of product or service are you advertising?";
      } else if (userMessage.toLowerCase().includes('ai') || userMessage.toLowerCase().includes('generate')) {
        response = "🤖 **AI Features Available:**\n\n**Image Generation:**\n• DALL-E 3 powered banner creation\n• Multiple variations per request\n• Professional car audio themes\n• Custom sizing for different placements\n\n**Content Assistance:**\n• Ad copy suggestions\n• Targeting recommendations\n• Placement optimization\n• Budget planning\n\n**Getting Started:**\n1. Click 'Create with AI' in the ad form\n2. Choose your banner size and placement\n3. Describe what you want\n4. Get 3 professional variations\n5. Download or use directly\n\nWhat would you like to create first?";
      } else {
        response = "I'm your AI assistant for car audio advertisements! I can help with:\n\n🎨 **Banner Creation** - Generate custom banners with AI\n📊 **Targeting Strategies** - Optimize your audience reach\n📍 **Placement Optimization** - Choose the best ad positions\n💰 **Budget Planning** - Maximize your ROI\n✍️ **Copy Writing** - Create compelling ad text\n\n**New: AI Image Generation!** Click 'Create with AI' in the ad form to generate professional banners.\n\nWhat specific aspect would you like help with?";
      }
      
      // Add AI response
      setAiMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('AI chat error:', error);
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Handle AI-generated image selection
  const handleAIImageSelect = (image: GeneratedImage) => {
    setFormData(prev => ({
      ...prev,
      image_url: image.url
    }));
    setSuccess('AI-generated banner selected successfully!');
  };

  // Filtered ads
  const filteredAds = ads.filter(ad => {
    const matchesSearch = ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ad.advertiser_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ad.status === statusFilter;
    const matchesPlacement = placementFilter === 'all' || ad.placement_type === placementFilter;
    
    return matchesSearch && matchesStatus && matchesPlacement;
  });

  // Helper function to update image URL based on size
  const updateImageUrlForSize = (originalUrl: string, newSize: string): string => {
    if (!originalUrl) return '';
    
    const sizeMap: Record<string, { width: number; height: number }> = {
      small: { width: 300, height: 150 },
      medium: { width: 300, height: 250 },
      large: { width: 728, height: 90 },
      banner: { width: 970, height: 250 },
      square: { width: 250, height: 250 },
      leaderboard: { width: 728, height: 90 },
      skyscraper: { width: 160, height: 600 }
    };

    const dimensions = sizeMap[newSize];
    if (!dimensions) return originalUrl;

    // Handle Unsplash URLs
    if (originalUrl.includes('unsplash.com')) {
      const baseUrl = originalUrl.split('?')[0];
      return `${baseUrl}?w=${dimensions.width}&h=${dimensions.height}&fit=crop&crop=center`;
    }

    // Handle other image services or return original
    return originalUrl;
  };

  // Handle size change and update image URL accordingly
  const handleSizeChange = (newSize: string) => {
    setFormData(prev => ({ 
      ...prev, 
      size: newSize as Advertisement['size'],
      image_url: updateImageUrlForSize(prev.image_url, newSize)
    }));
  };

  // Generate automatic naming convention for ads
  const generateAdName = (placement: string, size: string, variant?: string) => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const placementCode = placement.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    const sizeCode = size.toUpperCase().slice(0, 3);
    const variantCode = variant ? `_${variant.toUpperCase()}` : '';
    return `AD_${placementCode}_${sizeCode}_${timestamp}${variantCode}`;
  };

  // Auto-generate title when placement or size changes
  const handlePlacementChange = (newPlacement: string) => {
    const autoTitle = generateAdName(newPlacement, formData.size);
    setFormData(prev => ({ 
      ...prev, 
      placement_type: newPlacement as Advertisement['placement_type'],
      title: prev.title || autoTitle // Only set if title is empty
    }));
  };

  const handleSizeChangeWithTitle = (newSize: string) => {
    const autoTitle = generateAdName(formData.placement_type, newSize);
    setFormData(prev => ({ 
      ...prev, 
      size: newSize as Advertisement['size'],
      image_url: updateImageUrlForSize(prev.image_url, newSize),
      title: prev.title || autoTitle // Only set if title is empty
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Toast Notifications */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-500/90 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
          <CheckCircle className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Advertisement Management</h1>
            <p className="text-gray-400">Create and manage advertising campaigns with AI assistance</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Tooltip content="Get help with advertisement creation and optimization">
              <button
                onClick={() => setShowHelpModal(true)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
              >
                <HelpCircle className="h-5 w-5" />
                <span>Help</span>
              </button>
            </Tooltip>
            
            <button
              onClick={() => setShowAIModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            >
              <Sparkles className="h-5 w-5" />
              <span>AI Assistant</span>
            </button>
            
            <button
              onClick={() => {
                setShowAdModal(true);
                setEditingAd(null);
                resetForm();
              }}
              className="bg-electric-500 text-white px-6 py-3 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Create Advertisement</span>
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400 font-medium">{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-red-400 font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Search Advertisements</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or advertiser..."
                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              />
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-2">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-2">Placement Filter</label>
              <select
                value={placementFilter}
                onChange={(e) => setPlacementFilter(e.target.value)}
                className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
              >
                <option value="all">All Placements</option>
                {Object.entries(placementInfo).map(([key, info]) => (
                  <option key={key} value={key}>{info.name}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <div className="text-sm text-gray-400">
                Showing {filteredAds.length} of {ads.length} advertisements
              </div>
            </div>
          </div>
        </div>

        {/* Admin Settings - Only for admins */}
        {user?.membershipType === 'admin' && (
          <div className="space-y-4 mb-8">
            <AdRotationSettings />
            <FrequencyCapManager />
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Ads</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{ads.length}</p>
              </div>
              <Target className="h-8 w-8 text-electric-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Campaigns</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{ads.filter(ad => ad.status === 'active').length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Spent</p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  ${ads.reduce((sum, ad) => sum + ad.spent, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-electric-500" />
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Pending Approval</p>
                <p className="text-xl sm:text-2xl font-bold text-white">{ads.filter(ad => ad.status === 'pending').length}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading advertisements...</p>
          </div>
        ) : (
          /* Advertisements List */
          <div className="space-y-6">
            {filteredAds.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-400 mb-2">No advertisements found</h3>
                <p className="text-gray-500">Create your first advertisement to get started.</p>
              </div>
            ) : (
              filteredAds.map((ad) => {
                const placement = placementInfo[ad.placement_type];
                const roi = ad.spent > 0 ? ((ad.clicks * 2.5 - ad.spent) / ad.spent * 100) : 0;
                
                return (
                  <div key={ad.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-semibold text-white">{ad.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ad.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            ad.status === 'approved' ? 'bg-blue-500/20 text-blue-400' :
                            ad.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            ad.status === 'paused' ? 'bg-gray-500/20 text-gray-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {ad.status.charAt(0).toUpperCase() + ad.status.slice(1)}
                          </span>
                        </div>
                        
                        {/* Ad ID and Placement Info */}
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                          <span className="flex items-center space-x-1">
                            <span className="font-mono text-xs bg-gray-700/50 px-2 py-1 rounded">ID: {ad.id.slice(0, 8)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <span>{placement.name}</span>
                          </span>
                          <span>{placement.dimensions}</span>
                          <span>{ad.advertiser_name}</span>
                        </div>
                        
                        {ad.description && (
                          <p className="text-gray-300 mb-3">{ad.description}</p>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Budget</p>
                            <p className="text-white font-medium">${ad.budget.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Spent</p>
                            <p className="text-white font-medium">${ad.spent.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Clicks</p>
                            <p className="text-white font-medium">{ad.clicks.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Impressions</p>
                            <p className="text-white font-medium">{ad.impressions.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">ROI</p>
                            <p className={`font-medium ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {roi.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <Tooltip content="Edit advertisement">
                          <button
                            onClick={() => handleEdit(ad)}
                            className="p-2 text-gray-400 hover:text-electric-400 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </Tooltip>
                        
                        {user?.membershipType === 'admin' && ad.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(ad.id, 'approved')}
                              className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(ad.id, 'rejected')}
                              className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        
                        {ad.status === 'active' && (
                          <button
                            onClick={() => handleStatusChange(ad.id, 'paused')}
                            className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded text-sm hover:bg-orange-500/30 transition-colors"
                          >
                            Pause
                          </button>
                        )}
                        
                        {ad.status === 'paused' && (
                          <button
                            onClick={() => handleStatusChange(ad.id, 'active')}
                            className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30 transition-colors"
                          >
                            Resume
                          </button>
                        )}
                        
                        <Tooltip content="Delete advertisement">
                          <button
                            onClick={() => handleDelete(ad.id)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-700">
                      <span>Campaign: {ad.start_date} to {ad.end_date}</span>
                      <span>Created: {new Date(ad.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Advertisement Modal */}
        {showAdModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div ref={modalRef} className="bg-gray-800 rounded-xl max-w-sm sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingAd ? 'Edit Advertisement' : 'Create New Advertisement'}
                  </h3>
                  <button
                    onClick={() => setShowAdModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
                    <Info className="h-5 w-5 text-electric-400" />
                    <span>Basic Information</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                        <span>Advertisement Title *</span>
                        <Tooltip content="Clear, descriptive title for your advertisement campaign">
                          <HelpCircle className="h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 pr-12"
                          placeholder="e.g., Premium Subwoofer Sale"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const autoTitle = generateAdName(formData.placement_type, formData.size);
                            setFormData(prev => ({ ...prev, title: autoTitle }));
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors"
                          title="Auto-generate naming convention"
                        >
                          <Wand2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        💡 Auto-naming format: AD_[PLACEMENT]_[SIZE]_[DATE] (e.g., AD_SID_MED_20250115)
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                        <span>Advertiser Name *</span>
                        <Tooltip content="Your company or business name as it will appear in the ad">
                          <HelpCircle className="h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.advertiser_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, advertiser_name: e.target.value }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="Your Company Name"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                        <span>Contact Email *</span>
                        <Tooltip content="Email address for campaign notifications and billing">
                          <HelpCircle className="h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.advertiser_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, advertiser_email: e.target.value }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="contact@company.com"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                        <span>Click URL *</span>
                        <Tooltip content="Where users will be taken when they click your ad">
                          <HelpCircle className="h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </label>
                      <input
                        type="url"
                        required
                        value={formData.click_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, click_url: e.target.value }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        placeholder="https://yourwebsite.com/landing-page"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                      <span>Description</span>
                      <Tooltip content="Brief description of your advertisement for internal reference">
                        <HelpCircle className="h-4 w-4 text-gray-500" />
                      </Tooltip>
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Brief description of your advertisement campaign"
                    />
                  </div>

                  {/* Enhanced Image Management */}
                  <div className="mt-6">
                    <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                      <span>Advertisement Images</span>
                      <Tooltip content="Upload or manage advertisement images">
                        <HelpCircle className="h-4 w-4 text-gray-500" />
                      </Tooltip>
                    </label>
                    
                    {/* New Image Upload Component */}
                    <div className="space-y-4">
                      <AdImageUpload
                        advertisementId={editingAd?.id}
                        currentImageUrl={formData.image_url}
                        onImageUploaded={(imageUrl) => setFormData(prev => ({ ...prev, image_url: imageUrl }))}
                        size={formData.size}
                        placement={placementInfo[formData.placement_type]?.name || 'Advertisement'}
                      />
                      
                      {/* AI Banner Creator Button */}
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAIBannerCreator(true)}
                          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center space-x-2 shadow-lg"
                        >
                          <Wand2 className="h-5 w-5" />
                          <span>Create with AI</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* URL Input Fallback */}
                    <div className="mt-4">
                      <label className="block text-gray-400 text-xs mb-1">Or enter image URL directly:</label>
                      <input
                        type="url"
                        value={formData.image_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                        className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-electric-500"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>

                    {/* Image Manager Component for existing advertisements */}
                    {editingAd?.id && (
                      <div className="mt-4">
                        <AdvertisementImageManager
                          advertisementId={editingAd.id}
                          onImageSelect={(image: AdvertisementImage) => {
                            setFormData(prev => ({ ...prev, image_url: image.image_url }));
                          }}
                          placement={placementInfo[formData.placement_type]?.name || 'Advertisement'}
                          size={formData.size}
                        />
                      </div>
                    )}

                    {/* Image preview - show for both new and editing if image_url is set */}
                    {formData.image_url && (
                      <div className="mt-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                        <p className="text-sm text-gray-400 mb-2">Banner Preview:</p>
                        <img
                          src={formData.image_url}
                          alt="Banner preview"
                          className="max-w-full h-auto max-h-32 rounded border border-gray-600"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden text-sm text-red-400">
                          Failed to load image. Please check the URL.
                        </div>
                      </div>
                    )}

                    {/* Notice for new advertisements */}
                    {!editingAd?.id && (
                      <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-blue-400 text-sm">
                          💡 <strong>Pro Tip:</strong> After creating this advertisement, you'll be able to manage multiple images, 
                          set up A/B tests, and track individual image performance using our advanced image management system.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Placement & Targeting */}
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
                    <Target className="h-5 w-5 text-electric-400" />
                    <span>Placement & Targeting</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                        <span>Placement Type *</span>
                        <Tooltip content="Choose where your ad will be displayed. Each placement has different visibility and pricing.">
                          <HelpCircle className="h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </label>
                      <select
                        value={formData.placement_type}
                        onChange={(e) => handlePlacementChange(e.target.value)}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        {Object.entries(placementInfo).map(([key, info]) => (
                          <option key={key} value={key}>{info.name} - {info.pricing_range}</option>
                        ))}
                      </select>
                      
                      {/* Placement Details */}
                      {formData.placement_type && placementInfo[formData.placement_type] && (
                        <div className="mt-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                          <div className="text-sm">
                            <p className="text-white font-medium mb-1">{placementInfo[formData.placement_type].name}</p>
                            <p className="text-gray-400 mb-2">{placementInfo[formData.placement_type].description}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">Dimensions:</span>
                                <span className="text-gray-300 ml-1">{placementInfo[formData.placement_type].dimensions}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Traffic:</span>
                                <span className="text-gray-300 ml-1">{placementInfo[formData.placement_type].traffic}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Visibility:</span>
                                <span className="text-gray-300 ml-1">{placementInfo[formData.placement_type].visibility}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Pricing:</span>
                                <span className="text-gray-300 ml-1">{placementInfo[formData.placement_type].pricing_range}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                        <span>Ad Size *</span>
                        <Tooltip content="Choose the size that best fits your placement and design">
                          <HelpCircle className="h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </label>
                      <select
                        value={formData.size}
                        onChange={(e) => {
                          handleSizeChangeWithTitle(e.target.value);
                        }}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        <option value="small">Small (300x150)</option>
                        <option value="medium">Medium (300x250)</option>
                        <option value="large">Large (728x90)</option>
                        <option value="banner">Banner (970x250)</option>
                        <option value="square">Square (250x250)</option>
                        <option value="leaderboard">Leaderboard (728x90)</option>
                        <option value="skyscraper">Skyscraper (160x600)</option>
                      </select>
                    </div>
                  </div>

                  {/* Target User Types */}
                  <div className="mt-6">
                    <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                      <span>Target Audience</span>
                      <Tooltip content="Select which types of users should see your ad">
                        <HelpCircle className="h-4 w-4 text-gray-500" />
                      </Tooltip>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {userTypes.map((userType) => {
                        const IconComponent = userType.icon;
                        const isSelected = formData.target_user_types.includes(userType.id);
                        
                        return (
                          <div
                            key={userType.id}
                            onClick={() => {
                              const newTypes = isSelected
                                ? formData.target_user_types.filter(t => t !== userType.id)
                                : [...formData.target_user_types, userType.id];
                              setFormData(prev => ({ ...prev, target_user_types: newTypes }));
                            }}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-electric-500 bg-electric-500/10 text-electric-400'
                                : 'border-gray-600 bg-gray-700/30 text-gray-400 hover:border-gray-500'
                            }`}
                          >
                            <div className="text-center">
                              <IconComponent className="h-6 w-6 mx-auto mb-1" />
                              <div className="text-xs font-medium">{userType.name}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Budget & Pricing */}
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-electric-400" />
                    <span>Budget & Pricing</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                        <span>Total Budget ($) *</span>
                        <Tooltip content="Maximum amount you want to spend on this campaign">
                          <HelpCircle className="h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        step="0.01"
                        value={formData.budget}
                        onChange={(e) => setFormData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                        <span>Pricing Model *</span>
                        <Tooltip content="CPC: Pay per click, CPM: Pay per 1000 views, Fixed: One-time payment">
                          <HelpCircle className="h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </label>
                      <select
                        value={formData.pricing_model}
                        onChange={(e) => setFormData(prev => ({ ...prev, pricing_model: e.target.value as any }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        <option value="cpc">Cost Per Click (CPC)</option>
                        <option value="cpm">Cost Per 1000 Impressions (CPM)</option>
                        <option value="fixed">Fixed Rate</option>
                      </select>
                    </div>

                    {formData.pricing_model === 'cpc' && (
                      <div>
                        <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                          <span>Cost Per Click ($)</span>
                          <Tooltip content="Amount you pay each time someone clicks your ad">
                            <HelpCircle className="h-4 w-4 text-gray-500" />
                          </Tooltip>
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={formData.cost_per_click}
                          onChange={(e) => setFormData(prev => ({ ...prev, cost_per_click: parseFloat(e.target.value) || 0 }))}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        />
                      </div>
                    )}

                    {formData.pricing_model === 'cpm' && (
                      <div>
                        <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                          <span>Cost Per 1000 Impressions ($)</span>
                          <Tooltip content="Amount you pay for every 1000 times your ad is shown">
                            <HelpCircle className="h-4 w-4 text-gray-500" />
                          </Tooltip>
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={formData.cost_per_impression}
                          onChange={(e) => setFormData(prev => ({ ...prev, cost_per_impression: parseFloat(e.target.value) || 0 }))}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                        <span>Start Date *</span>
                        <Tooltip content="When your campaign should begin">
                          <HelpCircle className="h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                        <span>End Date *</span>
                        <Tooltip content="When your campaign should end">
                          <HelpCircle className="h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Advanced Settings */}
                <div className="border-t border-gray-700 pt-6">
                  <h4 className="text-lg font-medium text-white mb-4 flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-electric-400" />
                    <span>Advanced Settings</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                        <span>Priority Level</span>
                        <Tooltip content="Higher priority ads are shown more frequently (1-10, 10 being highest)">
                          <HelpCircle className="h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        {[1,2,3,4,5,6,7,8,9,10].map(num => (
                          <option key={num} value={num}>Priority {num} {num >= 8 ? '(High)' : num >= 5 ? '(Medium)' : '(Low)'}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status field for admin users */}
                    {user?.membershipType === 'admin' && (
                      <div>
                        <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                          <span>Ad Status</span>
                          <Tooltip content="Control the visibility and state of this advertisement">
                            <HelpCircle className="h-4 w-4 text-gray-500" />
                          </Tooltip>
                        </label>
                        <select
                          value={formData.status || 'active'}
                          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Advertisement['status'] }))}
                          className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                        >
                          <option value="pending">Pending Review</option>
                          <option value="approved">Approved</option>
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="completed">Completed</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                        <span>Frequency Cap</span>
                        <Tooltip content="Maximum times to show this ad to the same user per day">
                          <HelpCircle className="h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.frequency_cap}
                        onChange={(e) => setFormData(prev => ({ ...prev, frequency_cap: parseInt(e.target.value) || 3 }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                        <span>Rotation Mode</span>
                        <Tooltip content="Timer: Rotates based on time interval. Priority: Shows ads based on priority weight and frequency cap.">
                          <HelpCircle className="h-4 w-4 text-gray-500" />
                        </Tooltip>
                      </label>
                      <select
                        value={formData.rotation_mode || 'timer'}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotation_mode: e.target.value as 'timer' | 'priority' }))}
                        className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      >
                        <option value="timer">Timer-Based (Simple Rotation)</option>
                        <option value="priority">Priority-Based (Weighted Selection)</option>
                      </select>
                      <div className="mt-2 text-xs text-gray-500">
                        {formData.rotation_mode === 'priority' 
                          ? '📊 Ad will be shown based on priority weight (1-10) and frequency cap limits'
                          : '⏱️ Ad will rotate evenly with others based on the global timer setting'
                        }
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-gray-400 text-sm mb-2 flex items-center space-x-2">
                      <span>Campaign Notes</span>
                      <Tooltip content="Internal notes about this campaign for your reference">
                        <HelpCircle className="h-4 w-4 text-gray-500" />
                      </Tooltip>
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      placeholder="Internal notes about this campaign..."
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdModal(false);
                      setEditingAd(null);
                      resetForm();
                    }}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveStatus === 'saving'}
                    className="bg-electric-500 text-white px-6 py-2 rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {saveStatus === 'saving' && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    <span>{editingAd ? 'Update Advertisement' : 'Create Advertisement'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Help Modal */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-sm sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Advertisement Help & Documentation</h3>
                  <button
                    onClick={() => setShowHelpModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* Ad Placement Taxonomy */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <Target className="h-5 w-5 text-electric-400" />
                    <span>Advertisement Placement Taxonomy</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Primary Placements */}
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h5 className="font-semibold text-electric-400 mb-3">Primary Placements</h5>
                      <div className="space-y-3 text-sm">
                        <div>
                          <div className="font-medium text-white">Header Banner (HB)</div>
                          <div className="text-gray-400">Top of page, maximum visibility</div>
                          <div className="text-xs text-gray-500">ID Format: HB-001, HB-002, etc.</div>
                        </div>
                        <div>
                          <div className="font-medium text-white">Sidebar Rectangle (SR)</div>
                          <div className="text-gray-400">Content page sidebars</div>
                          <div className="text-xs text-gray-500">ID Format: SR-001, SR-002, etc.</div>
                        </div>
                        <div>
                          <div className="font-medium text-white">Footer Banner (FB)</div>
                          <div className="text-gray-400">Bottom of page placement</div>
                          <div className="text-xs text-gray-500">ID Format: FB-001, FB-002, etc.</div>
                        </div>
                      </div>
                    </div>

                    {/* Specialized Placements */}
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h5 className="font-semibold text-electric-400 mb-3">Specialized Placements</h5>
                      <div className="space-y-3 text-sm">
                        <div>
                          <div className="font-medium text-white">Event Page (EP)</div>
                          <div className="text-gray-400">Event detail and listing pages</div>
                          <div className="text-xs text-gray-500">ID Format: EP-001, EP-002, etc.</div>
                        </div>
                        <div>
                          <div className="font-medium text-white">Directory Listing (DL)</div>
                          <div className="text-gray-400">Business directory pages</div>
                          <div className="text-xs text-gray-500">ID Format: DL-001, DL-002, etc.</div>
                        </div>
                        <div>
                          <div className="font-medium text-white">Search Results (SR)</div>
                          <div className="text-gray-400">Search and filter result pages</div>
                          <div className="text-xs text-gray-500">ID Format: SRP-001, SRP-002, etc.</div>
                        </div>
                        <div>
                          <div className="font-medium text-white">Mobile Banner (MB)</div>
                          <div className="text-gray-400">Mobile-optimized placements</div>
                          <div className="text-xs text-gray-500">ID Format: MB-001, MB-002, etc.</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Size Standards */}
                  <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
                    <h5 className="font-semibold text-electric-400 mb-3">Standard Ad Sizes</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-white">Banner Sizes</div>
                        <div className="text-gray-400">• Leaderboard: 728×90px</div>
                        <div className="text-gray-400">• Banner: 970×250px</div>
                        <div className="text-gray-400">• Large: 728×90px</div>
                      </div>
                      <div>
                        <div className="font-medium text-white">Rectangle Sizes</div>
                        <div className="text-gray-400">• Medium Rectangle: 300×250px</div>
                        <div className="text-gray-400">• Square: 250×250px</div>
                        <div className="text-gray-400">• Small: 300×150px</div>
                      </div>
                      <div>
                        <div className="font-medium text-white">Vertical Sizes</div>
                        <div className="text-gray-400">• Skyscraper: 160×600px</div>
                        <div className="text-gray-400">• Wide Skyscraper: 300×600px</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">Getting Started</h4>
                  <div className="space-y-2 text-gray-300">
                    <p>• Choose your placement type based on your target audience and budget</p>
                    <p>• Upload high-quality banner images that match the recommended dimensions</p>
                    <p>• Set realistic budgets and monitor performance regularly</p>
                    <p>• Use our AI Assistant for design recommendations and optimization tips</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Assistant Modal */}
        {showAIModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div ref={aiModalRef} className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                    <Sparkles className="h-6 w-6 text-purple-400" />
                    <span>AI Advertisement Assistant</span>
                  </h3>
                  <button
                    onClick={() => setShowAIModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <p className="text-gray-400 mt-2">Get help with banner design, targeting strategies, and campaign optimization</p>
              </div>

              <div className="flex-1 flex flex-col">
                {/* Chat Messages */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {aiMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-400 mb-2">AI Assistant Ready</h4>
                      <p className="text-gray-500">Ask me about banner design, targeting strategies, or campaign optimization!</p>
                    </div>
                  ) : (
                    aiMessages.map((message, index) => (
                      <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user' 
                            ? 'bg-electric-500 text-white' 
                            : 'bg-gray-700 text-gray-100'
                        }`}>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {aiLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-700 text-gray-100 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                          <span>AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-6 border-t border-gray-700">
                  <div className="flex space-x-4">
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !aiLoading && handleAIChat()}
                      placeholder="Ask about banner design, targeting, or optimization..."
                      className="flex-1 p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                      disabled={aiLoading}
                    />
                    <button
                      onClick={handleAIChat}
                      disabled={!aiInput.trim() || aiLoading}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Banner Creator Modal */}
        {showAIBannerCreator && (
          <BannerAICreator
            externalOpen={showAIBannerCreator}
            onClose={() => setShowAIBannerCreator(false)}
            onImageSelect={(image) => {
              handleAIImageSelect(image);
              setShowAIBannerCreator(false);
            }}
            initialPlacement={formData.placement_type}
            initialSize={formData.size}
          />
        )}
      </div>
    </div>
  );
} 