import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, 
  Loader2, 
  MapPin, 
  Star, 
  DollarSign, 
  Calendar,
  Filter,
  X,
  Users,
  Building2,
  FileText,
  Mic
} from 'lucide-react';
import { globalSearchService, SearchResult, SearchFilters } from '../services/globalSearchService';

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [facets, setFacets] = useState<{
    types: { [key: string]: number };
    categories: { [key: string]: number };
    locations: { [key: string]: number };
  }>({ types: {}, categories: {}, locations: {} });
  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'relevance',
    sortOrder: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      performSearch();
    }
  }, [query, filters]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

  const performSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const response = await globalSearchService.search({
        query: query,
        filters: filters,
        limit: 20
      });

      setResults(response.results);
      setTotalCount(response.totalCount);
      setSearchTime(response.searchTime);
      setFacets(response.facets || { types: {}, categories: {}, locations: {} });
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotalCount(0);
      setSearchTime(0);
      setFacets({ types: {}, categories: {}, locations: {} });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setSearchParams({ q: newQuery });
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'event': return <Calendar className="h-5 w-5" />;
      case 'business': return <MapPin className="h-5 w-5" />;
      case 'content': return <FileText className="h-5 w-5" />;
      case 'user': return <Users className="h-5 w-5" />;
      case 'organization': return <Building2 className="h-5 w-5" />;
      default: return <Search className="h-5 w-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'event': return 'Event';
      case 'business': return 'Business';
      case 'content': return 'Content';
      case 'user': return 'User';
      case 'organization': return 'Organization';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-purple-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Search Results</h1>
        
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={handleSearchInputChange}
              placeholder="Search events, businesses, content..."
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white hover:border-electric-500 transition-colors lg:w-auto"
          >
            <Filter className="h-5 w-5" />
            <span>Filters</span>
            {Object.keys(facets.types).length > 0 && (
              <span className="bg-electric-500 text-black text-xs px-2 py-1 rounded-full">
                {Object.keys(facets.types).length}
              </span>
            )}
          </button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Search Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Content Type Filter */}
              {Object.keys(facets.types).length > 0 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Content Type</label>
                  <div className="space-y-2">
                    {Object.entries(facets.types).map(([type, count]) => (
                      <label key={type} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={filters.type?.includes(type) || false}
                          onChange={(e) => {
                            const currentTypes = filters.type || [];
                            const newTypes = e.target.checked
                              ? [...currentTypes, type]
                              : currentTypes.filter(t => t !== type);
                            handleFilterChange('type', newTypes.length > 0 ? newTypes : undefined);
                          }}
                          className="rounded border-gray-600 bg-gray-700 text-electric-500 focus:ring-electric-500"
                        />
                        <span className="text-gray-300 flex items-center space-x-1">
                          {getResultIcon(type)}
                          <span>{getTypeLabel(type)} ({count})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Sort Options */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Sort By</label>
                <select
                  value={filters.sortBy || 'relevance'}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value as SearchFilters['sortBy'])}
                  className="w-full bg-gray-700 border border-gray-600 rounded text-white px-3 py-2 focus:outline-none focus:border-electric-500"
                >
                  <option value="relevance">Relevance</option>
                  <option value="date">Date</option>
                  <option value="name">Name</option>
                  <option value="rating">Rating</option>
                  <option value="price">Price</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Order</label>
                <select
                  value={filters.sortOrder || 'desc'}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value as SearchFilters['sortOrder'])}
                  className="w-full bg-gray-700 border border-gray-600 rounded text-white px-3 py-2 focus:outline-none focus:border-electric-500"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {query && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <p className="text-gray-400">
              {isLoading ? (
                'Searching...'
              ) : (
                <>
                  {totalCount} results for "{query}" 
                  {searchTime > 0 && <span className="text-gray-500"> ({searchTime}ms)</span>}
                </>
              )}
            </p>
            
            {!isLoading && results.length > 0 && (
              <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                <span className="text-sm text-gray-500">
                  Showing {results.length} of {totalCount}
                </span>
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-electric-500 animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            {results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                to={result.url}
                className="block bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-electric-500 transition-all"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden">
                    {result.imageUrl ? (
                      <img 
                        src={result.imageUrl} 
                        alt={result.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-gray-400">
                        {getResultIcon(result.type)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-white text-lg font-medium">{result.title}</h3>
                      <span className="text-xs text-gray-400 capitalize px-2 py-1 bg-gray-700 rounded">
                        {result.type}
                      </span>
                    </div>
                    
                    <p className="text-gray-400 mb-3 line-clamp-2">{result.description}</p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {result.location && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{result.location}</span>
                        </span>
                      )}
                      
                      {result.price && (
                        <span className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4" />
                          <span>{formatPrice(result.price)}</span>
                        </span>
                      )}

                      {result.rating && (
                        <span className="flex items-center space-x-1">
                          <Star className="h-4 w-4" />
                          <span>{result.rating.toFixed(1)}</span>
                        </span>
                      )}

                      {result.date && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(result.date).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : query ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl text-white mb-2">No results found</h3>
            <p className="text-gray-400">No results found for "{query}". Try different keywords.</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl text-white mb-2">Start your search</h3>
            <p className="text-gray-400">Enter a search term to find events, businesses, and content.</p>
          </div>
        )}
      </div>
    </div>
  );
}
