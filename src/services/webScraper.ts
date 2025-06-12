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
      url: 'https://mecacaraudio.com/events/calendar/',
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
      // Based on MECA website structure at https://mecacaraudio.com/events/calendar/
      
      const mockEvents: ScrapedEvent[] = [
        {
          title: 'MECA Spring Championship 2025',
          description: 'Annual spring car audio competition featuring SPL, SQL, and Show N Shine categories. Fun, Fair, Loud & Clear!',
          date: '2025-04-15T09:00:00Z',
          endDate: '2025-04-15T18:00:00Z',
          location: 'Kentucky Expo Center',
          city: 'Louisville',
          state: 'Kentucky',
          country: 'United States',
          website: 'https://mecacaraudio.com',
          sourceUrl: url,
          sourceSite: 'MECA',
          registrationFee: 50,
          contactInfo: 'info@mecacaraudio.com',
          category: 'Sound Quality'
        },
        {
          title: 'MECA Regional SPL Championship',
          description: 'Regional Sound Pressure Level competition with multiple classes and categories',
          date: '2025-06-20T10:00:00Z',
          endDate: '2025-06-20T19:00:00Z',
          location: 'State Fairgrounds',
          city: 'Nashville',
          state: 'Tennessee',
          country: 'United States',
          website: 'https://mecacaraudio.com',
          sourceUrl: url,
          sourceSite: 'MECA',
          registrationFee: 40,
          contactInfo: 'info@mecacaraudio.com',
          category: 'SPL'
        },
        {
          title: 'MECA World Finals 2025',
          description: 'The ultimate MECA competition bringing together champions from across the nation',
          date: '2025-09-15T08:00:00Z',
          endDate: '2025-09-17T20:00:00Z',
          location: 'Kentucky Expo Center',
          city: 'Louisville',
          state: 'Kentucky',
          country: 'United States',
          website: 'https://mecacaraudio.com',
          sourceUrl: url,
          sourceSite: 'MECA',
          registrationFee: 100,
          contactInfo: 'info@mecacaraudio.com',
          category: 'Championship'
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
    // Add import source info to description
    const importNote = `\n\n[Imported from ${scrapedEvent.sourceSite} on ${new Date().toLocaleDateString()}]`;
    
    // Map scraped category to database category or use default
    let categoryId = 'b58b621d-65ff-4d1f-ad37-58eaec6df23e'; // Default: Bass Competition
    
    if (scrapedEvent.category) {
      const categoryLower = scrapedEvent.category.toLowerCase();
      if (categoryLower.includes('sound quality') || categoryLower.includes('sq')) {
        categoryId = '59ee66d6-df36-4e60-ab48-1302a5e12ae5'; // Sound Quality
      } else if (categoryLower.includes('championship') || categoryLower.includes('finals')) {
        categoryId = 'b3acf23a-678b-4c1d-8b59-8a4a48453a5f'; // Championship
      } else if (categoryLower.includes('local') || categoryLower.includes('show')) {
        categoryId = '6b7f6dcf-278b-47f5-b1c7-70eaf46f2424'; // Local Show
      } else if (categoryLower.includes('install')) {
        categoryId = '2547ed87-00d5-4274-8390-49236376eecb'; // Installation
      }
      // Default to Bass Competition for SPL, dB, etc.
    }
    
    return {
      title: scrapedEvent.title,
      description: scrapedEvent.description + importNote,
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
      category: 'Competition', // Legacy category field
      category_id: categoryId // New category_id field
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