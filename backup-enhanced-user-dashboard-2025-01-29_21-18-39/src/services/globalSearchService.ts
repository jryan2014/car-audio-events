import { supabase } from '../lib/supabase';

export interface SearchResult {
  id: string;
  type: 'event' | 'business' | 'content' | 'user' | 'organization' | 'product';
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  location?: string;
  date?: string;
  rating?: number;
  price?: number;
  category?: string;
  tags?: string[];
  relevanceScore: number;
  metadata?: Record<string, any>;
}

export interface SearchFilters {
  type?: string[];
  location?: string;
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number;
  sortBy?: 'relevance' | 'date' | 'rating' | 'price' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
  includeTypes?: string[];
  excludeTypes?: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
  suggestions?: string[];
  facets?: {
    types: { [key: string]: number };
    categories: { [key: string]: number };
    locations: { [key: string]: number };
  };
}

class GlobalSearchService {
  private searchCache = new Map<string, { results: SearchResponse; timestamp: number }>();
  private readonly cacheExpiry = 5 * 60 * 1000; // 5 minutes

  /**
   * Main search function that searches across all content types
   */
  async search(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    const cacheKey = JSON.stringify(options);
    
    // Check cache first
    const cached = this.searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.results;
    }

    try {
      const { query, filters = {}, limit = 20, offset = 0, includeTypes, excludeTypes } = options;
      
      // Parallel search across all content types
      const searchPromises: Promise<SearchResult[]>[] = [];
      const typesToSearch = this.getTypesToSearch(includeTypes, excludeTypes);

      if (typesToSearch.includes('event')) {
        searchPromises.push(this.searchEvents(query, filters, limit));
      }
      if (typesToSearch.includes('business')) {
        searchPromises.push(this.searchBusinesses(query, filters, limit));
      }
      if (typesToSearch.includes('content')) {
        searchPromises.push(this.searchContent(query, filters, limit));
      }
      if (typesToSearch.includes('user')) {
        searchPromises.push(this.searchUsers(query, filters, limit));
      }
      if (typesToSearch.includes('organization')) {
        searchPromises.push(this.searchOrganizations(query, filters, limit));
      }

      const searchResults = await Promise.all(searchPromises);
      const allResults = searchResults.flat();

      // Sort by relevance and apply pagination
      const sortedResults = this.sortResults(allResults, filters.sortBy, filters.sortOrder);
      const paginatedResults = sortedResults.slice(offset, offset + limit);

      // Generate suggestions and facets
      const suggestions = await this.generateSuggestions(query);
      const facets = this.generateFacets(allResults);

      const response: SearchResponse = {
        results: paginatedResults,
        totalCount: allResults.length,
        searchTime: Date.now() - startTime,
        suggestions,
        facets
      };

      // Cache the results
      this.searchCache.set(cacheKey, { results: response, timestamp: Date.now() });

      // Track the search (fire and forget)
      if (query.trim()) {
        this.trackSearch(query, response.totalCount).catch(() => {
          // Ignore tracking errors
        });
      }

      return response;
    } catch (error) {
      console.error('Global search error:', error);
      throw new Error('Search service temporarily unavailable');
    }
  }

  /**
   * Search events
   */
  private async searchEvents(query: string, filters: SearchFilters, limit: number): Promise<SearchResult[]> {
    try {
      let queryBuilder = supabase
        .from('events')
        .select(`
          id, title, description, venue_name, city, state, 
          start_date, end_date, registration_fee, status
        `)
        .eq('status', 'published')
        .eq('is_public', true);

      // Apply text search
      if (query.trim()) {
        queryBuilder = queryBuilder.or(`
          title.ilike.%${query}%,
          description.ilike.%${query}%,
          venue_name.ilike.%${query}%,
          city.ilike.%${query}%,
          state.ilike.%${query}%
        `);
      }

      const { data, error } = await queryBuilder.limit(limit);
      
      if (error) throw error;

      return (data || []).map(event => ({
        id: event.id,
        type: 'event' as const,
        title: event.title,
        description: event.description || '',
        url: `/events/${event.id}`,
        location: `${event.city}, ${event.state}`,
        date: event.start_date,
        price: event.registration_fee,
        category: 'Car Audio Competition',
        relevanceScore: this.calculateRelevanceScore(query, event.title, event.description),
        metadata: {
          venue: event.venue_name,
          endDate: event.end_date
        }
      }));
    } catch (error) {
      console.error('Event search error:', error);
      return [];
    }
  }

  /**
   * Search directory businesses
   */
  private async searchBusinesses(query: string, filters: SearchFilters, limit: number): Promise<SearchResult[]> {
    try {
      let queryBuilder = supabase
        .from('directory_listings')
        .select(`
          id, business_name, description, listing_type, 
          city, state, website, phone, email,
          services_offered, brands_carried, item_price,
          rating, default_image_url, featured
        `)
        .eq('status', 'approved');

      // Apply text search
      if (query.trim()) {
        queryBuilder = queryBuilder.or(`
          business_name.ilike.%${query}%,
          description.ilike.%${query}%,
          city.ilike.%${query}%,
          state.ilike.%${query}%
        `);
      }

      const { data, error } = await queryBuilder.limit(limit);
      
      if (error) throw error;

      return (data || []).map(business => ({
        id: business.id,
        type: 'business' as const,
        title: business.business_name,
        description: business.description || '',
        url: `/directory/${business.id}`,
        imageUrl: business.default_image_url,
        location: `${business.city}, ${business.state}`,
        rating: business.rating,
        price: business.item_price,
        category: business.listing_type,
        tags: [...(business.services_offered || []), ...(business.brands_carried || [])],
        relevanceScore: this.calculateRelevanceScore(query, business.business_name, business.description),
        metadata: {
          website: business.website,
          phone: business.phone,
          email: business.email,
          featured: business.featured
        }
      }));
    } catch (error) {
      console.error('Business search error:', error);
      return [];
    }
  }

  /**
   * Search CMS content
   */
  private async searchContent(query: string, filters: SearchFilters, limit: number): Promise<SearchResult[]> {
    try {
      let queryBuilder = supabase
        .from('cms_pages')
        .select('id, title, content, meta_description, slug, navigation_placement, created_at')
        .eq('status', 'published');

      // Apply text search
      if (query.trim()) {
        queryBuilder = queryBuilder.or(`
          title.ilike.%${query}%,
          content.ilike.%${query}%,
          meta_description.ilike.%${query}%
        `);
      }

      const { data, error } = await queryBuilder.limit(limit);
      
      if (error) throw error;

      return (data || []).map(page => ({
        id: page.id,
        type: 'content' as const,
        title: page.title,
        description: page.meta_description || this.extractTextFromContent(page.content),
        url: `/page/${page.slug}`,
        date: page.created_at,
        category: 'Resource',
        relevanceScore: this.calculateRelevanceScore(query, page.title, page.content),
        metadata: {
          placement: page.navigation_placement
        }
      }));
    } catch (error) {
      console.error('Content search error:', error);
      return [];
    }
  }

  /**
   * Search users
   */
  private async searchUsers(query: string, filters: SearchFilters, limit: number): Promise<SearchResult[]> {
    try {
      let queryBuilder = supabase
        .from('users')
        .select(`
          id, name, bio, city, state, 
          profile_image, membership_type, created_at
        `)
        .eq('is_public_profile', true);

      // Apply text search
      if (query.trim()) {
        queryBuilder = queryBuilder.or(`
          name.ilike.%${query}%,
          bio.ilike.%${query}%,
          city.ilike.%${query}%,
          state.ilike.%${query}%
        `);
      }

      const { data, error } = await queryBuilder.limit(limit);
      
      if (error) throw error;

      return (data || []).map(user => ({
        id: user.id,
        type: 'user' as const,
        title: user.name,
        description: user.bio || `${user.membership_type} member from ${user.city}, ${user.state}`,
        url: `/profile/${user.id}`,
        imageUrl: user.profile_image,
        location: user.city && user.state ? `${user.city}, ${user.state}` : undefined,
        date: user.created_at,
        category: user.membership_type,
        relevanceScore: this.calculateRelevanceScore(query, user.name, user.bio),
        metadata: {
          membershipType: user.membership_type
        }
      }));
    } catch (error) {
      console.error('User search error:', error);
      return [];
    }
  }

  /**
   * Search organizations
   */
  private async searchOrganizations(query: string, filters: SearchFilters, limit: number): Promise<SearchResult[]> {
    try {
      let queryBuilder = supabase
        .from('organizations')
        .select(`
          id, name, description, website, 
          city, state, logo_url, created_at
        `)
        .eq('status', 'active');

      // Apply text search
      if (query.trim()) {
        queryBuilder = queryBuilder.or(`
          name.ilike.%${query}%,
          description.ilike.%${query}%,
          city.ilike.%${query}%,
          state.ilike.%${query}%
        `);
      }

      const { data, error } = await queryBuilder.limit(limit);
      
      if (error) throw error;

      return (data || []).map(org => ({
        id: org.id,
        type: 'organization' as const,
        title: org.name,
        description: org.description || '',
        url: `/organizations/${org.id}`,
        imageUrl: org.logo_url,
        location: org.city && org.state ? `${org.city}, ${org.state}` : undefined,
        date: org.created_at,
        category: 'Organization',
        relevanceScore: this.calculateRelevanceScore(query, org.name, org.description),
        metadata: {
          website: org.website
        }
      }));
    } catch (error) {
      console.error('Organization search error:', error);
      return [];
    }
  }

  /**
   * Generate search suggestions
   */
  private async generateSuggestions(query: string): Promise<string[]> {
    if (query.length < 2) return [];

    try {
      const suggestions = new Set<string>();

      // Get popular business names
      const { data: businesses } = await supabase
        .from('directory_listings')
        .select('business_name, brands_carried')
        .ilike('business_name', `%${query}%`)
        .limit(5);

      businesses?.forEach(business => {
        if (business.business_name.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(business.business_name);
        }
      });

      return Array.from(suggestions).slice(0, 8);
    } catch (error) {
      console.error('Suggestion generation error:', error);
      return [];
    }
  }

  /**
   * Generate search facets
   */
  private generateFacets(results: SearchResult[]): SearchResponse['facets'] {
    const types: { [key: string]: number } = {};
    const categories: { [key: string]: number } = {};
    const locations: { [key: string]: number } = {};

    results.forEach(result => {
      types[result.type] = (types[result.type] || 0) + 1;
      if (result.category) {
        categories[result.category] = (categories[result.category] || 0) + 1;
      }
      if (result.location) {
        locations[result.location] = (locations[result.location] || 0) + 1;
      }
    });

    return { types, categories, locations };
  }

  /**
   * Calculate relevance score for search results
   */
  private calculateRelevanceScore(query: string, title: string, description?: string): number {
    if (!query.trim()) return 1;

    const queryLower = query.toLowerCase();
    const titleLower = title.toLowerCase();
    const descLower = (description || '').toLowerCase();

    let score = 0;

    if (titleLower === queryLower) score += 100;
    else if (titleLower.startsWith(queryLower)) score += 50;
    else if (titleLower.includes(queryLower)) score += 25;

    if (descLower.includes(queryLower)) score += 10;

    return Math.max(score, 1);
  }

  /**
   * Sort search results
   */
  private sortResults(
    results: SearchResult[], 
    sortBy: SearchFilters['sortBy'] = 'relevance', 
    sortOrder: SearchFilters['sortOrder'] = 'desc'
  ): SearchResult[] {
    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = a.relevanceScore - b.relevanceScore;
          break;
        case 'date':
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'price':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'name':
          comparison = a.title.localeCompare(b.title);
          break;
        default:
          comparison = a.relevanceScore - b.relevanceScore;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Get types to search based on include/exclude filters
   */
  private getTypesToSearch(includeTypes?: string[], excludeTypes?: string[]): string[] {
    const allTypes = ['event', 'business', 'content', 'user', 'organization'];
    
    let typesToSearch = includeTypes || allTypes;
    
    if (excludeTypes) {
      typesToSearch = typesToSearch.filter(type => !excludeTypes.includes(type));
    }
    
    return typesToSearch;
  }

  /**
   * Extract plain text from HTML content
   */
  private extractTextFromContent(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200) + '...';
  }

  /**
   * Track a search query for analytics
   */
  async trackSearch(query: string, resultCount: number, userId?: string): Promise<void> {
    try {
      await supabase
        .from('search_analytics')
        .insert({
          query: query.trim(),
          result_count: resultCount,
          user_id: userId,
          searched_at: new Date().toISOString()
        });
    } catch (error) {
      // Don't throw errors for analytics - fail silently
      console.warn('Search tracking failed:', error);
    }
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit = 10): Promise<{ query: string; count: number }[]> {
    try {
      // Use raw SQL query for aggregation since Supabase client doesn't support group by well
      const { data, error } = await supabase.rpc('get_popular_searches', { 
        search_limit: limit,
        days_back: 30 
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get popular searches:', error);
      // Fallback to mock data
      return [
        { query: 'car audio', count: 125 },
        { query: 'competition', count: 89 },
        { query: 'speakers', count: 67 },
        { query: 'amplifiers', count: 54 },
        { query: 'subwoofers', count: 43 }
      ].slice(0, limit);
    }
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
  }
}

export const globalSearchService = new GlobalSearchService(); 