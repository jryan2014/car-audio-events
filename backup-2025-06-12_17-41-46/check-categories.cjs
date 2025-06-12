const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nqvisvranvjaghvrdaaz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdmlzdnJhbnZqYWdodnJkYWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2MDY2NzcsImV4cCI6MjA2NTE4MjY3N30.OWwP8kH9qTKxgEHCC6ru0QSAJ5KhOupCxMUyxHuYWVY'
);

async function checkCategories() {
  try {
    console.log('🔍 Checking event_categories table...');
    const { data, error } = await supabase.from('event_categories').select('*');
    
    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Available categories:');
      data.forEach(category => {
        console.log(`  - ${category.name} (ID: ${category.id})`);
      });
      
      // Check if we have a default category
      const defaultCategory = data.find(c => c.name.toLowerCase().includes('general') || c.name.toLowerCase().includes('competition'));
      if (defaultCategory) {
        console.log(`\n🎯 Default category found: ${defaultCategory.name} (${defaultCategory.id})`);
      } else {
        console.log(`\n🎯 Using first category as default: ${data[0]?.name} (${data[0]?.id})`);
      }
    }
  } catch (err) {
    console.error('💥 Exception:', err);
  }
}

checkCategories(); 