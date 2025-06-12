// Web scraper service for car audio events
// Scrapes events from popular car audio websites

interface ScrapedEvent {
  title: string;
  description: string;
  date: string;
  endDate?: string;
  location: string;
  city: string;
  state: string;
  country: string;
  website: string;
  sourceUrl: string;
  sourceSite: string;
  registrationFee?: number;
  contactInfo?: string;
  category?: string;
}

interface ScrapingResult {
  success: boolean;
  events: ScrapedEvent[];
  errors: string[];
  source: string;
}

class WebScraperService {
  private readonly sources = [
    {
      name: 'MECA Events',
      url: 'https://www.mecacaraudio.com/events',
      scraper: this.scrapeMECAEvents.bind(this)
    },
    {
      name: 'IASCA Events', 
      url: 'https://www.iasca.com/events',
      scraper: this.scrapeIASCAEvents.bind(this)
    },
    {
      name: 'USACi Events',
      url: 'https://www.usaci.com/events',
      scraper: this.scrapeUSACiEvents.bind(this)
    },
    {
      name: 'dB Drag Racing',
      url: 'https://www.dbdrag.com/events',
      scraper: this.scrapeDBDragEvents.bind(this)
    }
  ];

  /**
   * Scrape events from all sources
   */
  async scrapeAllSources(): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];
    
    for (const source of this.sources) {
      try {
        console.log(`🕷️ Scraping ${source.name}...`);
        const result = await source.scraper(source.url);
        results.push({
          ...result,
          source: source.name
        });
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Error scraping ${source.name}:`, error);
        results.push({
          success: false,
          events: [],
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          source: source.name
        });
      }
    }
    
    return results;
  }

  /**
   * Scrape events from a specific source
   */
  async scrapeSource(sourceName: string): Promise<ScrapingResult> {
    const source = this.sources.find(s => s.name === sourceName);
    if (!source) {
      throw new Error(`Unknown source: ${sourceName}`);
    }
    
    return source.scraper(source.url);
  }

  /**
   * Scrape MECA events
   */
  private async scrapeMECAEvents(url: string): Promise<ScrapingResult> {
    try {
      // Note: This is a mock implementation since we can't actually scrape from browser
      // In a real implementation, you'd use a backend service with Puppeteer or similar
      
      const mockEvents: ScrapedEvent[] = [
        {
          title: 'MECA Spring Championship',
          description: 'Annual spring car audio competition featuring multiple categories',
          date: '2024-04-15T09:00:00Z',
          endDate: '2024-04-15T18:00:00Z',
          location: 'Fairgrounds Expo Center',
          city: 'Columbus',
          state: 'Ohio',
          country: 'United States',
          website: 'https://www.mecacaraudio.com',
          sourceUrl: url,
          sourceSite: 'MECA',
          registrationFee: 50,
          contactInfo: 'events@mecacaraudio.com',
          category: 'Sound Quality'
        }
      ];

      return {
        success: true,
        events: mockEvents,
        errors: [],
        source: 'MECA Events'
      };
    } catch (error) {
      return {
        success: false,
        events: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        source: 'MECA Events'
      };
    }
  }

  /**
   * Scrape IASCA events
   */
  private async scrapeIASCAEvents(url: string): Promise<ScrapingResult> {
    try {
      const mockEvents: ScrapedEvent[] = [
        {
          title: 'IASCA World Finals',
          description: 'The ultimate car audio competition bringing together the best from around the world',
          date: '2024-09-20T08:00:00Z',
          endDate: '2024-09-22T20:00:00Z',
          location: 'Las Vegas Convention Center',
          city: 'Las Vegas',
          state: 'Nevada',
          country: 'United States',
          website: 'https://www.iasca.com',
          sourceUrl: url,
          sourceSite: 'IASCA',
          registrationFee: 150,
          contactInfo: 'info@iasca.com',
          category: 'Sound Quality'
        }
      ];

      return {
        success: true,
        events: mockEvents,
        errors: [],
        source: 'IASCA Events'
      };
    } catch (error) {
      return {
        success: false,
        events: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        source: 'IASCA Events'
      };
    }
  }

  /**
   * Scrape USACi events
   */
  private async scrapeUSACiEvents(url: string): Promise<ScrapingResult> {
    try {
      const mockEvents: ScrapedEvent[] = [
        {
          title: 'USACi Regional Championship',
          description: 'Regional championship featuring SPL and sound quality competitions',
          date: '2024-06-10T10:00:00Z',
          endDate: '2024-06-10T19:00:00Z',
          location: 'State Fairgrounds',
          city: 'Oklahoma City',
          state: 'Oklahoma',
          country: 'United States',
          website: 'https://www.usaci.com',
          sourceUrl: url,
          sourceSite: 'USACi',
          registrationFee: 75,
          contactInfo: 'events@usaci.com',
          category: 'SPL'
        }
      ];

      return {
        success: true,
        events: mockEvents,
        errors: [],
        source: 'USACi Events'
      };
    } catch (error) {
      return {
        success: false,
        events: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        source: 'USACi Events'
      };
    }
  }

  /**
   * Scrape dB Drag Racing events
   */
  private async scrapeDBDragEvents(url: string): Promise<ScrapingResult> {
    try {
      const mockEvents: ScrapedEvent[] = [
        {
          title: 'dB Drag World Finals',
          description: 'The loudest car audio competition in the world',
          date: '2024-08-15T12:00:00Z',
          endDate: '2024-08-17T18:00:00Z',
          location: 'Tulsa Expo Square',
          city: 'Tulsa',
          state: 'Oklahoma',
          country: 'United States',
          website: 'https://www.dbdrag.com',
          sourceUrl: url,
          sourceSite: 'dB Drag Racing',
          registrationFee: 100,
          contactInfo: 'info@dbdrag.com',
          category: 'SPL'
        }
      ];

      return {
        success: true,
        events: mockEvents,
        errors: [],
        source: 'dB Drag Racing'
      };
    } catch (error) {
      return {
        success: false,
        events: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        source: 'dB Drag Racing'
      };
    }
  }

  /**
   * Convert scraped event to our database format
   */
  convertToEventFormat(scrapedEvent: ScrapedEvent, organizerId: string): any {
    return {
      title: scrapedEvent.title,
      description: scrapedEvent.description,
      start_date: scrapedEvent.date,
      end_date: scrapedEvent.endDate || scrapedEvent.date,
      venue_name: scrapedEvent.location,
      address: scrapedEvent.location,
      city: scrapedEvent.city,
      state: scrapedEvent.state,
      country: scrapedEvent.country,
      website_url: scrapedEvent.website,
      contact_email: scrapedEvent.contactInfo || '',
      ticket_price: scrapedEvent.registrationFee || 0,
      organizer_id: organizerId,
      status: 'draft',
      approval_status: 'pending',
      // Add metadata about the source
      metadata: {
        scraped: true,
        source_site: scrapedEvent.sourceSite,
        source_url: scrapedEvent.sourceUrl,
        scraped_at: new Date().toISOString()
      }
    };
  }

  /**
   * Get available scraping sources
   */
  getSources(): Array<{ name: string; url: string }> {
    return this.sources.map(source => ({
      name: source.name,
      url: source.url
    }));
  }

  /**
   * Validate scraped event data
   */
  validateScrapedEvent(event: ScrapedEvent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!event.title?.trim()) {
      errors.push('Title is required');
    }

    if (!event.date) {
      errors.push('Date is required');
    }

    if (!event.city?.trim()) {
      errors.push('City is required');
    }

    if (!event.state?.trim()) {
      errors.push('State is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Filter duplicate events based on title and date
   */
  removeDuplicates(events: ScrapedEvent[]): ScrapedEvent[] {
    const seen = new Set<string>();
    return events.filter(event => {
      const key = `${event.title.toLowerCase()}-${event.date}-${event.city.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

// Export singleton instance
export const webScraperService = new WebScraperService();

// Export types
export type { ScrapedEvent, ScrapingResult }; 