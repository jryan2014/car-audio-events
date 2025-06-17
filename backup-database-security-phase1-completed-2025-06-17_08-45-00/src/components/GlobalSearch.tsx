import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp, 
  MapPin, 
  Calendar, 
  Star, 
  DollarSign,
  Loader2
} from 'lucide-react';
import { globalSearchService, SearchResult } from '../services/globalSearchService';
import { useDebounce } from '../hooks/useDebounce';

interface GlobalSearchProps {
  className?: string;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  className = '',
  placeholder = 'Search events, businesses, users, organizations...',
  onFocus,
  onBlur
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<{ query: string; count: number }[]>([]);
  
  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Handle search input changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  // Load recent and popular searches on mount
  useEffect(() => {
    loadRecentSearches();
    loadPopularSearches();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await globalSearchService.search({
        query: searchQuery,
        limit: 6,
        includeTypes: ['event', 'business', 'content', 'user', 'organization']
      });

      setResults(response.results);
      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRecentSearches = useCallback(() => {
    const recent = localStorage.getItem('recentSearches');
    if (recent) {
      setRecentSearches(JSON.parse(recent));
    }
  }, []);

  const loadPopularSearches = useCallback(async () => {
    try {
      const popular = await globalSearchService.getPopularSearches(5);
      setPopularSearches(popular);
    } catch (error) {
      console.error('Failed to load popular searches:', error);
    }
  }, []);

  const saveSearchToRecent = useCallback((searchQuery: string) => {
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const updated = [searchQuery, ...recent.filter((q: string) => q !== searchQuery)].slice(0, 5);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
    setRecentSearches(updated);
  }, []);

  const handleInputFocus = () => {
    setIsOpen(true);
    onFocus?.();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
  };

  const handleSearchSubmit = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;

    saveSearchToRecent(finalQuery);
    setQuery(finalQuery);
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(finalQuery)}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearchSubmit(suggestion);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'event': return <Calendar className="h-4 w-4" />;
      case 'business': return <MapPin className="h-4 w-4" />;
      case 'content': return <Search className="h-4 w-4" />;
      case 'user': return <Clock className="h-4 w-4" />; // Using Clock as Users icon import would need to be added
      case 'organization': return <TrendingUp className="h-4 w-4" />; // Using TrendingUp as Building icon import would need to be added
      default: return <Search className="h-4 w-4" />;
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

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyPress}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-1 focus:ring-electric-500"
        />

        {/* Clear button */}
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-y-0 right-8 flex items-center">
            <Loader2 className="h-4 w-4 text-electric-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Search Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto">
          {/* Search Results */}
          {results.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-gray-400 mb-2 px-2">Search Results</div>
              {results.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  to={result.url}
                  onClick={() => {
                    setIsOpen(false);
                    saveSearchToRecent(query);
                  }}
                  className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
                >
                  {/* Result Image/Icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center overflow-hidden">
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

                  {/* Result Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-white text-sm font-medium truncate">
                        {result.title}
                      </h4>
                      <span className="text-xs text-gray-400 capitalize px-1.5 py-0.5 bg-gray-700 rounded">
                        {result.type}
                      </span>
                    </div>
                    
                    <p className="text-gray-400 text-xs line-clamp-2 mb-1">
                      {result.description}
                    </p>

                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      {result.location && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{result.location}</span>
                        </span>
                      )}
                      
                      {result.price && (
                        <span className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3" />
                          <span>{formatPrice(result.price)}</span>
                        </span>
                      )}

                      {result.rating && (
                        <span className="flex items-center space-x-1">
                          <Star className="h-3 w-3" />
                          <span>{result.rating.toFixed(1)}</span>
                        </span>
                      )}

                      {result.date && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(result.date).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}

              {/* View All Results */}
              <button
                onClick={() => handleSearchSubmit()}
                className="w-full mt-2 p-2 text-center text-sm text-electric-400 hover:text-electric-300 border-t border-gray-700"
              >
                View all results for "{query}"
              </button>
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && query.trim() && (
            <div className="border-t border-gray-700 p-2">
              <div className="text-xs text-gray-400 mb-2 px-2">Suggestions</div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left p-2 rounded-lg hover:bg-gray-700/50 transition-colors text-sm text-gray-300 hover:text-white"
                >
                  <div className="flex items-center space-x-2">
                    <Search className="h-3 w-3 text-gray-500" />
                    <span>{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {!query.trim() && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="text-xs text-gray-400 mb-2 px-2 flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Recent Searches</span>
              </div>
              {recentSearches.map((recent, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(recent)}
                  className="w-full text-left p-2 rounded-lg hover:bg-gray-700/50 transition-colors text-sm text-gray-300 hover:text-white"
                >
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <span>{recent}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {!query.trim() && popularSearches.length > 0 && (
            <div className="border-t border-gray-700 p-2">
              <div className="text-xs text-gray-400 mb-2 px-2 flex items-center space-x-1">
                <TrendingUp className="h-3 w-3" />
                <span>Popular Searches</span>
              </div>
              {popularSearches.map((popular, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(popular.query)}
                  className="w-full text-left p-2 rounded-lg hover:bg-gray-700/50 transition-colors text-sm text-gray-300 hover:text-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-3 w-3 text-gray-500" />
                      <span>{popular.query}</span>
                    </div>
                    <span className="text-xs text-gray-500">{popular.count}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {query.trim() && !isLoading && results.length === 0 && suggestions.length === 0 && (
            <div className="p-4 text-center text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-1">Try different keywords or check your spelling</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
