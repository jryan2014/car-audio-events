import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, MapPin, Star, 
  ChevronDown, X, Sliders,
  Grid, List, SortAsc, SortDesc, RotateCcw
} from 'lucide-react';

interface SearchFilters {
  query: string;
  type: string;
  state: string;
  category: string;
  services: string[];
  brands: string[];
  minRating: number;
  minPrice: number | null;
  maxPrice: number | null;
  condition: string[];
  featured: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onReset: () => void;
  totalResults: number;
  isLoading: boolean;
  availableServices: string[];
  availableBrands: string[];
  availableCategories: any[];
  availableStates: string[];
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  onReset,
  totalResults,
  isLoading,
  availableServices,
  availableBrands,
  availableCategories,
  availableStates
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: 'all',
    state: 'all',
    category: 'all',
    services: [],
    brands: [],
    minRating: 0,
    minPrice: null,
    maxPrice: null,
    condition: [],
    featured: false,
    sortBy: 'relevance',
    sortOrder: 'desc',
    viewMode: 'grid'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    onSearch(filters);
  }, [filters, onSearch]);

  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: 'services' | 'brands' | 'condition', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
  };

  const resetFilters = () => {
    const defaultFilters: SearchFilters = {
      query: '',
      type: 'all',
      state: 'all',
      category: 'all',
      services: [],
      brands: [],
      minRating: 0,
      minPrice: null,
      maxPrice: null,
      condition: [],
      featured: false,
      sortBy: 'relevance',
      sortOrder: 'desc',
      viewMode: 'grid'
    };
    setFilters(defaultFilters);
    onReset();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.query) count++;
    if (filters.type !== 'all') count++;
    if (filters.state !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.services.length > 0) count++;
    if (filters.brands.length > 0) count++;
    if (filters.minRating > 0) count++;
    if (filters.minPrice !== null) count++;
    if (filters.maxPrice !== null) count++;
    if (filters.condition.length > 0) count++;
    if (filters.featured) count++;
    return count;
  };

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'rating', label: 'Rating' },
    { value: 'price', label: 'Price' },
    { value: 'date', label: 'Date Added' },
    { value: 'name', label: 'Name' },
    { value: 'views', label: 'Popularity' }
  ];

  const conditionOptions = [
    { value: 'new', label: 'New' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'needs_repair', label: 'Needs Repair' }
  ];

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
      {/* Main Search Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Search Input */}
        <div className="lg:col-span-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search businesses, products, or keywords..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 transition-colors"
          />
        </div>

        {/* Type Filter */}
        <div className="lg:col-span-2 relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={filters.type}
            onChange={(e) => updateFilter('type', e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
          >
            <option value="all">All Types</option>
            <option value="retailer">Retailers</option>
            <option value="manufacturer">Manufacturers</option>
            <option value="used_equipment">Used Equipment</option>
          </select>
        </div>

        {/* Location Filter */}
        <div className="lg:col-span-3 relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            value={filters.state}
            onChange={(e) => updateFilter('state', e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
          >
            <option value="all">All States</option>
            {availableStates.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        {/* Sort & View Controls */}
        <div className="lg:col-span-3 flex space-x-2">
          <div className="flex-1 relative">
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="w-full pr-8 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none text-sm"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-electric-500 transition-all"
          >
            {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </button>
          
          <button
            onClick={() => updateFilter('viewMode', filters.viewMode === 'grid' ? 'list' : 'grid')}
            className="px-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-electric-500 transition-all"
          >
            {filters.viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
        >
          <Sliders className="h-4 w-4" />
          <span>Advanced Filters</span>
          {getActiveFilterCount() > 0 && (
            <span className="bg-electric-500 text-white text-xs px-2 py-1 rounded-full">
              {getActiveFilterCount()}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            {isLoading ? 'Searching...' : `${totalResults} results`}
          </span>
          
          {getActiveFilterCount() > 0 && (
            <button
              onClick={resetFilters}
              className="flex items-center space-x-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="w-full py-2 px-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors appearance-none"
              >
                <option value="all">All Categories</option>
                {availableCategories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Minimum Rating
              </label>
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={filters.minRating}
                  onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-300 w-8">
                  {filters.minRating > 0 ? filters.minRating : 'Any'}
                </span>
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Price Range</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ''}
                  onChange={(e) => updateFilter('minPrice', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full py-2 px-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ''}
                  onChange={(e) => updateFilter('maxPrice', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full py-2 px-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 transition-colors"
                />
              </div>
            </div>

            {/* Featured Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Options</label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.featured}
                  onChange={(e) => updateFilter('featured', e.target.checked)}
                  className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                />
                <span className="text-sm text-gray-300">Featured only</span>
              </label>
            </div>
          </div>

          {/* Services Filter */}
          {(filters.type === 'retailer' || filters.type === 'all') && availableServices.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Services Offered</label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {availableServices.slice(0, 12).map(service => (
                  <label key={service} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.services.includes(service)}
                      onChange={() => toggleArrayFilter('services', service)}
                      className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                    />
                    <span className="text-sm text-gray-300">{service}</span>
                  </label>
                ))}
              </div>
              
              {filters.services.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {filters.services.map(service => (
                    <span key={service} className="bg-electric-500/20 text-electric-400 px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                      <span>{service}</span>
                      <button
                        onClick={() => toggleArrayFilter('services', service)}
                        className="hover:text-electric-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Brands Filter */}
          {(filters.type === 'manufacturer' || filters.type === 'all') && availableBrands.length > 0 && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Brands</label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {availableBrands.slice(0, 12).map(brand => (
                  <label key={brand} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.brands.includes(brand)}
                      onChange={() => toggleArrayFilter('brands', brand)}
                      className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                    />
                    <span className="text-sm text-gray-300">{brand}</span>
                  </label>
                ))}
              </div>
              
              {filters.brands.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {filters.brands.map(brand => (
                    <span key={brand} className="bg-electric-500/20 text-electric-400 px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                      <span>{brand}</span>
                      <button
                        onClick={() => toggleArrayFilter('brands', brand)}
                        className="hover:text-electric-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Condition Filter */}
          {filters.type === 'used_equipment' && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Condition</label>
              <div className="flex flex-wrap gap-2">
                {conditionOptions.map(option => (
                  <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.condition.includes(option.value)}
                      onChange={() => toggleArrayFilter('condition', option.value)}
                      className="rounded border-gray-600 text-electric-500 focus:ring-electric-500"
                    />
                    <span className="text-sm text-gray-300">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
