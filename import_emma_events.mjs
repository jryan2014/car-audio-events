// Import script for EMMA events from CSV
// Run with: node import_emma_events.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Supabase configuration
const supabaseUrl = 'https://tdcgnxdlajismhaebnlv.supabase.co';
// You'll need to provide the service role key as an environment variable
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('You can find this in your Supabase dashboard under Settings > API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parse CSV manually (simple parser for our specific format)
function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCsvLine(lines[0]);
  const events = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCsvLine(line);
    const event = {};
    
    headers.forEach((header, index) => {
      event[header] = values[index] || '';
    });
    
    if (event.event_name) {
      events.push(event);
    }
  }
  
  return events;
}

// Parse a single CSV line handling quoted values
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Parse date strings to ISO format
function parseDateTime(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch (e) {
    console.error('Invalid date:', dateStr);
    return null;
  }
}

// Map CSV format names to our event formats
function mapFormats(formats) {
  if (!formats) return ['SQ Competition'];
  
  const formatMap = {
    'SQ': 'SQ Competition',
    'ESPL': 'SPL Competition',
    'ESQL': 'SQL Competition',
    'DSP': 'Demo/Exhibition',
    'AMP': 'Demo/Exhibition'
  };
  
  const formatList = formats.split(',').map(f => f.trim());
  const mappedFormats = [];
  
  formatList.forEach(format => {
    if (formatMap[format]) {
      if (!mappedFormats.includes(formatMap[format])) {
        mappedFormats.push(formatMap[format]);
      }
    } else if (format.includes('SQ')) {
      if (!mappedFormats.includes('SQ Competition')) {
        mappedFormats.push('SQ Competition');
      }
    } else if (format.includes('SPL') || format.includes('ESPL')) {
      if (!mappedFormats.includes('SPL Competition')) {
        mappedFormats.push('SPL Competition');
      }
    } else if (format.toLowerCase().includes('all')) {
      return ['SQ Competition', 'SPL Competition', 'Demo/Exhibition'];
    }
  });
  
  return mappedFormats.length > 0 ? mappedFormats : ['SQ Competition'];
}

// Main import function
async function main() {
  try {
    console.log('Starting EMMA events import...');
    
    // Read CSV file
    const csvContent = readFileSync('emma_events_aug10_2025.csv', 'utf-8');
    const csvEvents = parseCSV(csvContent);
    
    console.log(`Found ${csvEvents.length} events in CSV`);
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const row of csvEvents) {
      try {
        const event = {
          // Core fields
          title: row.event_name.trim(),
          category: 'Competition',
          status: 'pending_approval',
          approval_status: 'pending',
          is_public: false,
          is_active: false,
          
          // Dates
          start_date: parseDateTime(row.start_datetime_iso),
          end_date: parseDateTime(row.end_datetime_iso),
          
          // Location
          venue_name: row.venue_name?.trim() || null,
          address: row.street?.trim() || null,
          city: row.city?.trim() || null,
          state: row.state_province?.trim() || null,
          zip_code: row.postal_code?.trim() || null,
          country: row.country?.trim() || null,
          
          // Event details
          description: row.description?.trim() || null,
          external_registration_url: row.registration_url?.trim() || null,
          website_url: row.org_website?.trim() || null,
          
          // Director info
          event_director_first_name: row.director_first_name?.trim() || null,
          event_director_last_name: row.director_last_name?.trim() || null,
          event_director_email: row.director_email?.trim() || null,
          event_director_phone: row.director_phone?.trim() || null,
          
          // Competition details  
          competition_categories: ['EMMA'],
          competition_classes: mapFormats(row.formats),
          
          // Fees (default values)
          member_price: 0,
          non_member_price: 0,
          gate_fee: null,
          
          // SEO
          seo_title: `EMMA Event: ${row.event_name.trim()}`,
          seo_description: row.description?.trim() || `EMMA car audio competition event in ${row.city || 'TBD'}, ${row.country || 'TBD'}`,
          seo_keywords: ['EMMA', 'car audio', 'competition', row.city, row.country].filter(Boolean),
          
          // Registration
          allows_online_registration: !!row.registration_url
        };
        
        // Validate required fields
        if (!event.title || !event.start_date) {
          console.log(`⚠ Skipping invalid event (missing title or date): ${row.event_name}`);
          skippedCount++;
          continue;
        }
        
        // Check if event already exists
        const { data: existing } = await supabase
          .from('events')
          .select('id')
          .eq('title', event.title)
          .eq('start_date', event.start_date)
          .maybeSingle();
        
        if (existing) {
          console.log(`⚠ Event already exists: ${event.title}`);
          skippedCount++;
          continue;
        }
        
        // Insert the event
        const { data, error } = await supabase
          .from('events')
          .insert([event])
          .select()
          .single();
        
        if (error) {
          console.error(`❌ Error importing "${event.title}":`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Imported: ${event.title}`);
          successCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err) {
        console.error(`❌ Error processing "${row.event_name}":`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Import Summary');
    console.log('='.repeat(50));
    console.log(`✅ Successfully imported: ${successCount} events`);
    console.log(`⚠ Skipped (duplicates/invalid): ${skippedCount} events`);
    console.log(`❌ Errors: ${errorCount} events`);
    console.log('\n📝 Notes:');
    console.log('• All imported events are set to "pending_approval" status');
    console.log('• Sanctioning body is set to "EMMA" for all events');
    console.log('• Please review and approve them in the admin panel');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import
console.log('🚀 EMMA Events Import Tool');
console.log('='.repeat(50));
main().catch(console.error);