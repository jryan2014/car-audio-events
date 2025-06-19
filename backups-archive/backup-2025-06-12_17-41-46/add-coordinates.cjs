const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nqvisvranvjaghvrdaaz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDY2NzcsImV4cCI6MjA2NTE4MjY3N30.OWwP8kH9qTKxgEHCC6ru0QSAJ5KhOupCxMUyxHuYWVY'
);

async function addCoordinates() {
  try {
    console.log('🗺️ Adding coordinates to the event...');
    
    // Elyria, Ohio coordinates (approximate)
    const latitude = 41.3683;
    const longitude = -82.1076;
    
    const { data, error } = await supabase
      .from('events')
      .update({
        latitude: latitude,
        longitude: longitude
      })
      .eq('id', 1)
      .select();
    
    if (error) {
      console.error('❌ Error updating coordinates:', error);
      return;
    }
    
    console.log('✅ Successfully added coordinates to event:');
    console.log(`- Event: ${data[0]?.title}`);
    console.log(`- Location: ${data[0]?.city}, ${data[0]?.state}`);
    console.log(`- Coordinates: ${latitude}, ${longitude}`);
    
  } catch (err) {
    console.error('💥 Exception:', err);
  }
}

addCoordinates(); 