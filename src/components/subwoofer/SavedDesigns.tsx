import React, { useState, useMemo } from 'react';
import { Save, Search, Filter, Share2, Copy, Download, Trash2, Star, Eye, Calendar, Tag } from 'lucide-react';
import type { SubwooferDesign } from '../../types/subwoofer';

// Mock data for demonstration - in a real app, this would come from Supabase
const MOCK_SAVED_DESIGNS: SubwooferDesign[] = [
  {
    id: '1',
    user_id: 'current_user',
    name: 'Daily Driver 12" Ported',
    description: 'Balanced ported box for daily driving. Good bass extension with decent efficiency.',
    box_type: 'ported',
    subwoofer_count: 1,
    subwoofer_quantity: 1,
    box_dimensions: { width: 15, height: 15, depth: 18, material_thickness: 0.75, net_volume: 56.8 },
    port_dimensions: { type: 'slot', quantity: 1, width: 3, height: 12, length: 6.5, area: 36, tuning_frequency: 34.5 },
    subwoofer_specs: {
      fs: 28, qts: 0.46, vas: 85.6, sd: 506, xmax: 32, displacement: 0.18,
      re: 2.3, le: 0.9, bl: 13.2, mms: 250, cms: 0.154, rms: 3.8
    },
    calculations: {
      box_type: 'ported',
      net_volume: 56.8,
      gross_volume: 67.2,
      external_dimensions: { width: 15, height: 15, depth: 18 },
      fb: 34.5,
      port_velocity: 15.2
    },
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    is_public: false,
    tags: ['daily-driver', 'ported', '12-inch']
  },
  {
    id: '2',
    user_id: 'current_user',
    name: 'Competition SPL Dual 15"',
    description: 'High-output ported design optimized for SPL competition. Maximum efficiency.',
    box_type: 'ported',
    subwoofer_count: 2,
    subwoofer_quantity: 2,
    box_dimensions: { width: 36, height: 18, depth: 20, material_thickness: 1, net_volume: 198.4 },
    port_dimensions: { type: 'slot', quantity: 1, width: 6, height: 16, length: 8, area: 96, tuning_frequency: 32.8 },
    subwoofer_specs: {
      fs: 25, qts: 0.42, vas: 120, sd: 820, xmax: 28, displacement: 0.25,
      re: 1.8, le: 1.2, bl: 15.5, mms: 320, cms: 0.125, rms: 4.2
    },
    calculations: {
      box_type: 'ported',
      net_volume: 198.4,
      gross_volume: 225.6,
      external_dimensions: { width: 36, height: 18, depth: 20 },
      fb: 32.8,
      port_velocity: 18.5
    },
    created_at: '2024-01-10T14:15:00Z',
    updated_at: '2024-01-12T09:45:00Z',
    is_public: true,
    tags: ['competition', 'spl', '15-inch', 'high-output']
  },
  {
    id: '3',
    user_id: 'other_user',
    name: 'Stealth Sealed 10"',
    description: 'Compact sealed design for tight installation spaces. Clean, accurate bass.',
    box_type: 'sealed',
    subwoofer_count: 1,
    subwoofer_quantity: 1,
    box_dimensions: { width: 12, height: 10, depth: 14, material_thickness: 0.75, net_volume: 22.1 },
    subwoofer_specs: {
      fs: 35, qts: 0.35, vas: 25, sd: 324, xmax: 15, displacement: 0.08,
      re: 3.2, le: 1.1, bl: 11.8, mms: 165, cms: 0.175, rms: 3.2
    },
    calculations: {
      box_type: 'sealed',
      net_volume: 22.1,
      gross_volume: 27.9,
      external_dimensions: { width: 12, height: 10, depth: 14 },
      qtc: 0.45,
      f3: 48.2
    },
    created_at: '2024-01-05T16:22:00Z',
    updated_at: '2024-01-05T16:22:00Z',
    is_public: true,
    tags: ['stealth', 'sealed', '10-inch', 'compact']
  }
];

const POPULAR_TAGS = [
  'daily-driver', 'competition', 'spl', 'sq', 'sealed', 'ported', 'compact', 
  'stealth', '10-inch', '12-inch', '15-inch', '18-inch', 'high-output', 
  'deep-bass', 'tight-space', 'budget'
];

interface SavedDesignsProps {
  onDesignSelect?: (design: SubwooferDesign) => void;
  onDesignDelete?: (designId: string) => void;
  className?: string;
}

const SavedDesigns: React.FC<SavedDesignsProps> = ({
  onDesignSelect,
  onDesignDelete,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'type'>('date');
  const [filterBy, setFilterBy] = useState<'all' | 'mine' | 'public' | 'favorites'>('all');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<SubwooferDesign | null>(null);
  const [favorites, setFavorites] = useState<string[]>(['2']); // Mock favorites

  // Filter and sort designs
  const filteredDesigns = useMemo(() => {
    let filtered = MOCK_SAVED_DESIGNS.filter(design => {
      // Search filter
      const matchesSearch = !searchTerm || 
        design.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        design.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        design.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      // Tag filter
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.every(tag => design.tags?.includes(tag));

      // Ownership filter
      const matchesFilter = filterBy === 'all' ||
        (filterBy === 'mine' && design.user_id === 'current_user') ||
        (filterBy === 'public' && design.is_public) ||
        (filterBy === 'favorites' && favorites.includes(design.id || ''));

      return matchesSearch && matchesTags && matchesFilter;
    });

    // Sort designs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.box_type.localeCompare(b.box_type);
        case 'date':
        default:
          return new Date(b.updated_at || b.created_at || '').getTime() - 
                 new Date(a.updated_at || a.created_at || '').getTime();
      }
    });

    return filtered;
  }, [searchTerm, selectedTags, sortBy, filterBy, favorites]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleFavoriteToggle = (designId: string) => {
    setFavorites(prev => 
      prev.includes(designId)
        ? prev.filter(id => id !== designId)
        : [...prev, designId]
    );
  };

  const handleShare = (design: SubwooferDesign) => {
    setSelectedDesign(design);
    setShowShareModal(true);
  };

  const handleClone = (design: SubwooferDesign) => {
    const clonedDesign = {
      ...design,
      id: undefined,
      name: `${design.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: false
    };
    
    if (onDesignSelect) {
      onDesignSelect(clonedDesign);
    }
    
    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-green-400 z-50';
    notification.innerHTML = 'Design cloned successfully!';
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  const handleExport = (design: SubwooferDesign) => {
    const dataStr = JSON.stringify(design, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${design.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_design.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const DesignCard: React.FC<{ design: SubwooferDesign }> = ({ design }) => {
    const isOwner = design.user_id === 'current_user';
    const isFavorite = favorites.includes(design.id || '');
    
    return (
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{design.name}</h3>
            <p className="text-gray-400 text-sm line-clamp-2">{design.description}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleFavoriteToggle(design.id || '')}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite 
                  ? 'text-yellow-400 bg-yellow-400/20' 
                  : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10'
              }`}
            >
              <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Specifications */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Configuration</div>
            <div className="text-white text-sm">
              {design.box_type.charAt(0).toUpperCase() + design.box_type.slice(1)} • 
              {design.subwoofer_count}× Sub{design.subwoofer_count > 1 ? 's' : ''}
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Dimensions</div>
            <div className="text-white text-sm">
              {design.box_dimensions.width}"×{design.box_dimensions.height}"×{design.box_dimensions.depth}"
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Air Space</div>
            <div className="text-electric-400 text-sm font-semibold">
              {design.calculations?.net_volume?.toFixed(1) || 'N/A'}L
            </div>
          </div>
          
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {design.box_type === 'sealed' ? 'F3' : 'Tuning'}
            </div>
            <div className="text-electric-400 text-sm font-semibold">
              {design.box_type === 'sealed' 
                ? `${design.calculations.f3?.toFixed(1) || 'N/A'}Hz`
                : `${design.calculations.fb?.toFixed(1) || 'N/A'}Hz`
              }
            </div>
          </div>
        </div>

        {/* Tags */}
        {design.tags && design.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {design.tags.map(tag => (
              <span 
                key={tag}
                className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Warnings */}
        {design.calculations?.warnings && design.calculations.warnings.length > 0 && (
          <div className="mb-4 p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg">
            <div className="text-orange-400 text-xs font-medium mb-1">Design Notes:</div>
            {design.calculations.warnings.map((warning, index) => (
              <div key={index} className="text-orange-300 text-xs">• {warning}</div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-700/50">
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(design.updated_at || design.created_at)}</span>
            </div>
            {design.is_public && (
              <div className="flex items-center space-x-1 text-green-400">
                <Eye className="h-3 w-3" />
                <span>Public</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onDesignSelect && onDesignSelect(design)}
              className="px-3 py-1 bg-electric-500/20 text-electric-400 rounded-lg text-xs hover:bg-electric-500/30 transition-colors"
            >
              Load
            </button>
            
            <button
              onClick={() => handleClone(design)}
              className="px-3 py-1 bg-gray-600/20 text-gray-300 rounded-lg text-xs hover:bg-gray-600/30 transition-colors flex items-center space-x-1"
            >
              <Copy className="h-3 w-3" />
              <span>Clone</span>
            </button>
            
            <button
              onClick={() => handleShare(design)}
              className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs hover:bg-purple-500/30 transition-colors flex items-center space-x-1"
            >
              <Share2 className="h-3 w-3" />
              <span>Share</span>
            </button>
            
            <button
              onClick={() => handleExport(design)}
              className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs hover:bg-blue-500/30 transition-colors"
            >
              <Download className="h-3 w-3" />
            </button>
            
            {isOwner && (
              <button
                onClick={() => onDesignDelete && onDesignDelete(design.id || '')}
                className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-electric-500/20 to-purple-500/20 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center space-x-3 mb-4">
          <Save className="h-8 w-8 text-electric-500" />
          <h2 className="text-2xl font-bold text-white">Saved Designs</h2>
        </div>
        <p className="text-gray-300">
          Manage your saved subwoofer designs and browse the community gallery
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search designs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-500"
              />
            </div>
          </div>

          {/* Filter by ownership */}
          <div>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as 'all' | 'mine' | 'public' | 'favorites')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="all">All Designs</option>
              <option value="mine">My Designs</option>
              <option value="public">Public Gallery</option>
              <option value="favorites">Favorites</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'type')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="type">Sort by Type</option>
            </select>
          </div>
        </div>

        {/* Tag Filter */}
        <div>
          <div className="text-sm font-medium text-gray-300 mb-2 flex items-center">
            <Tag className="h-4 w-4 mr-2" />
            Filter by Tags
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-electric-500/20 text-electric-400 border border-electric-500/30'
                    : 'bg-gray-700/50 text-gray-400 border border-gray-600/50 hover:bg-gray-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-gray-400 text-sm">
        Showing {filteredDesigns.length} design{filteredDesigns.length !== 1 ? 's' : ''}
        {selectedTags.length > 0 && (
          <span> with tags: {selectedTags.join(', ')}</span>
        )}
      </div>

      {/* Design Grid */}
      {filteredDesigns.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredDesigns.map(design => (
            <DesignCard key={design.id} design={design} />
          ))}
        </div>
      ) : (
        <div className="bg-gray-800/50 rounded-xl p-12 border border-gray-700/50 text-center">
          <Save className="h-12 w-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Designs Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedTags.length > 0 
              ? 'Try adjusting your search terms or filters'
              : 'Start by saving your first subwoofer design'
            }
          </p>
          {(searchTerm || selectedTags.length > 0) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedTags([]);
                setFilterBy('all');
              }}
              className="px-4 py-2 bg-electric-500 hover:bg-electric-600 rounded-lg text-white transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && selectedDesign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Share Design</h3>
            <p className="text-gray-400 mb-4">
              Share "{selectedDesign.name}" with other users
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Share Link</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={`https://caraudioevents.com/designs/${selectedDesign.id}`}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://caraudioevents.com/designs/${selectedDesign.id}`);
                      // Show copied notification
                    }}
                    className="px-4 py-2 bg-electric-500 hover:bg-electric-600 rounded-lg text-white transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedDesign.is_public}
                  readOnly
                  className="rounded border-gray-600 bg-gray-700"
                />
                <label className="text-sm text-gray-300">
                  Design is {selectedDesign.is_public ? 'public' : 'private'}
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedDesigns;