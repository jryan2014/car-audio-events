import React, { useState } from 'react';
import { X, Download, Globe, CheckCircle, AlertCircle, Loader, Edit3, RotateCcw } from 'lucide-react';
import { webScraperService, ScrapingResult, ScrapedEvent } from '../services/webScraper';
import { geocodingService } from '../services/geocoding';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface WebScraperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventsImported: () => void;
}

export default function WebScraperModal({ isOpen, onClose, onEventsImported }: WebScraperModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [customUrls, setCustomUrls] = useState<Record<string, string>>({});
  const [useCustomUrl, setUseCustomUrl] = useState<Record<string, boolean>>({});
  const [scrapingResults, setScrapingResults] = useState<ScrapingResult[]>([]);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] }>({
    success: 0,
    failed: 0,
    errors: []
  });
  const [step, setStep] = useState<'select' | 'scraping' | 'results' | 'importing' | 'complete'>('select');

  const sources = webScraperService.getSources();

  if (!isOpen) return null;

  const handleSourceToggle = (sourceName: string) => {
    setSelectedSources(prev => 
      prev.includes(sourceName) 
        ? prev.filter(s => s !== sourceName)
        : [...prev, sourceName]
    );
  };

  const handleCustomUrlToggle = (sourceName: string) => {
    setUseCustomUrl(prev => ({
      ...prev,
      [sourceName]: !prev[sourceName]
    }));
  };

  const handleCustomUrlChange = (sourceName: string, url: string) => {
    setCustomUrls(prev => ({
      ...prev,
      [sourceName]: url
    }));
  };

  const getUrlForSource = (sourceName: string) => {
    const source = sources.find(s => s.name === sourceName);
    if (!source) return '';
    
    return useCustomUrl[sourceName] && customUrls[sourceName] 
      ? customUrls[sourceName] 
      : source.url;
  };

  const handleScrapeEvents = async () => {
    if (selectedSources.length === 0) {
      alert('Please select at least one source to scrape');
      return;
    }

    setIsLoading(true);
    setStep('scraping');
    setScrapingResults([]);

    try {
      const results: ScrapingResult[] = [];
      
      for (const sourceName of selectedSources) {
        const urlToUse = getUrlForSource(sourceName);
        console.log(`🕷️ Scraping ${sourceName} from ${urlToUse}...`);
        
        // Pass custom URL to the scraper if one is provided
        const customUrl = useCustomUrl[sourceName] && customUrls[sourceName] 
          ? customUrls[sourceName] 
          : undefined;
          
        const result = await webScraperService.scrapeSource(sourceName, customUrl);
        
        // Add a note about custom URL usage in the result
        if (useCustomUrl[sourceName] && customUrls[sourceName]) {
          result.source = `${result.source} (Custom URL)`;
        }
        
        results.push(result);
        setScrapingResults(prev => [...prev, result]);
        
        // Add delay between requests
        if (selectedSources.indexOf(sourceName) < selectedSources.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      setStep('results');
    } catch (error) {
      console.error('Scraping error:', error);
      alert(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportEvents = async () => {
    if (!user) {
      alert('You must be logged in to import events');
      return;
    }

    setIsLoading(true);
    setStep('importing');
    
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      // Get all scraped events
      const allEvents = scrapingResults.flatMap(result => result.events);
      
      // Remove duplicates
      const uniqueEvents = webScraperService.removeDuplicates(allEvents);
      
      console.log(`📥 Importing ${uniqueEvents.length} unique events...`);

      for (const scrapedEvent of uniqueEvents) {
        try {
          // Validate event
          const validation = webScraperService.validateScrapedEvent(scrapedEvent);
          if (!validation.valid) {
            errors.push(`${scrapedEvent.title}: ${validation.errors.join(', ')}`);
            failedCount++;
            continue;
          }

          // Geocode the event
          console.log(`🗺️ Geocoding ${scrapedEvent.city}, ${scrapedEvent.state}...`);
          const geocodeResult = await geocodingService.geocodeAddress(
            scrapedEvent.city, 
            scrapedEvent.state, 
            scrapedEvent.country
          );

          let latitude = null;
          let longitude = null;
          
          if ('latitude' in geocodeResult) {
            latitude = geocodeResult.latitude;
            longitude = geocodeResult.longitude;
          }

          // Convert to our database format using the web scraper service
          const eventData = webScraperService.convertToEventFormat(scrapedEvent, user.id);
          
          // Add geocoded coordinates
          eventData.latitude = latitude;
          eventData.longitude = longitude;

          // Insert into database
          const { error } = await supabase
            .from('events')
            .insert([eventData]);

          if (error) {
            console.error(`❌ Failed to import ${scrapedEvent.title}:`, error);
            errors.push(`${scrapedEvent.title}: ${error.message}`);
            failedCount++;
          } else {
            console.log(`✅ Imported ${scrapedEvent.title}`);
            successCount++;
          }

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`💥 Error importing ${scrapedEvent.title}:`, error);
          errors.push(`${scrapedEvent.title}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failedCount++;
        }
      }

      setImportResults({ success: successCount, failed: failedCount, errors });
      setStep('complete');
      
      if (successCount > 0) {
        onEventsImported();
      }

    } catch (error) {
      console.error('Import error:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedSources([]);
    setScrapingResults([]);
    setImportResults({ success: 0, failed: 0, errors: [] });
    onClose();
  };

  const getTotalEvents = () => {
    return scrapingResults.reduce((total, result) => total + result.events.length, 0);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Web Scraper</h2>
              <p className="text-gray-400 text-sm">Import events from car audio competition websites</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {step === 'select' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Select Sources to Scrape</h3>
                <div className="space-y-4">
                  {sources.map((source) => (
                    <div
                      key={source.name}
                      className={`p-4 rounded-lg border transition-all ${
                        selectedSources.includes(source.name)
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-600'
                      }`}
                    >
                      {/* Source Header */}
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => handleSourceToggle(source.name)}
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{source.name}</h4>
                          <p className="text-sm text-gray-400">
                            {useCustomUrl[source.name] && customUrls[source.name] 
                              ? customUrls[source.name] 
                              : source.url}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedSources.includes(source.name)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-400'
                        }`}>
                          {selectedSources.includes(source.name) && (
                            <CheckCircle className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>

                      {/* URL Configuration */}
                      {selectedSources.includes(source.name) && (
                        <div className="mt-4 pt-4 border-t border-gray-600">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-300">URL Configuration</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCustomUrlToggle(source.name);
                              }}
                              className={`flex items-center space-x-2 px-3 py-1 rounded text-xs font-medium transition-colors ${
                                useCustomUrl[source.name]
                                  ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                              }`}
                            >
                              {useCustomUrl[source.name] ? (
                                <>
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Use Default</span>
                                </>
                              ) : (
                                <>
                                  <Edit3 className="h-3 w-3" />
                                  <span>Custom URL</span>
                                </>
                              )}
                            </button>
                          </div>

                          {useCustomUrl[source.name] ? (
                            <div className="space-y-2">
                              <label className="block text-xs text-gray-400">Custom URL:</label>
                              <input
                                type="url"
                                value={customUrls[source.name] || ''}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleCustomUrlChange(source.name, e.target.value);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder={`Enter custom URL for ${source.name}`}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
                              />
                              <p className="text-xs text-gray-500">
                                Default: {source.url}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="block text-xs text-gray-400">Default URL:</label>
                              <div className="px-3 py-2 bg-gray-700/50 border border-gray-600 rounded text-gray-300 text-sm">
                                {source.url}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScrapeEvents}
                  disabled={selectedSources.length === 0}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Scrape Events</span>
                </button>
              </div>
            </div>
          )}

          {step === 'scraping' && (
            <div className="text-center py-12">
              <Loader className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Scraping Events...</h3>
              <p className="text-gray-400">Please wait while we gather events from selected sources</p>
              
              {scrapingResults.length > 0 && (
                <div className="mt-6 space-y-2">
                  {scrapingResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-gray-300">
                        {result.source}: {result.events.length} events found
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  Scraping Results ({getTotalEvents()} events found)
                </h3>
                
                <div className="space-y-4">
                  {scrapingResults.map((result, index) => (
                    <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{result.source}</h4>
                        <div className="flex items-center space-x-2">
                          {result.success ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                          <span className="text-sm text-gray-300">
                            {result.events.length} events
                          </span>
                        </div>
                      </div>
                      
                      {result.events.length > 0 && (
                        <div className="space-y-2">
                          {result.events.slice(0, 3).map((event, eventIndex) => (
                            <div key={eventIndex} className="text-sm text-gray-400">
                              • {event.title} - {event.city}, {event.state}
                            </div>
                          ))}
                          {result.events.length > 3 && (
                            <div className="text-sm text-gray-500">
                              ... and {result.events.length - 3} more events
                            </div>
                          )}
                        </div>
                      )}
                      
                      {result.errors.length > 0 && (
                        <div className="mt-2 text-sm text-red-400">
                          Errors: {result.errors.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setStep('select')}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImportEvents}
                  disabled={getTotalEvents() === 0}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Import {getTotalEvents()} Events</span>
                </button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <Loader className="h-12 w-12 text-green-500 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Importing Events...</h3>
              <p className="text-gray-400">Adding events to your database with automatic geocoding</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Import Complete!</h3>
              
              <div className="bg-gray-700/50 rounded-lg p-4 mb-6 text-left max-w-md mx-auto">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Successfully imported:</span>
                    <span className="text-green-400 font-medium">{importResults.success}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Failed to import:</span>
                    <span className="text-red-400 font-medium">{importResults.failed}</span>
                  </div>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-left max-w-2xl mx-auto">
                  <h4 className="text-red-400 font-medium mb-2">Import Errors:</h4>
                  <div className="space-y-1 text-sm text-red-300 max-h-32 overflow-y-auto">
                    {importResults.errors.map((error, index) => (
                      <div key={index}>• {error}</div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleClose}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 