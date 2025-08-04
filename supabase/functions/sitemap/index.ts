import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const baseUrl = 'https://caraudioevents.com'
    const currentDate = new Date().toISOString().split('T')[0]

    // Static pages with their priorities
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/events', priority: '0.9', changefreq: 'daily' },
      { url: '/directory', priority: '0.8', changefreq: 'weekly' },
      { url: '/resources', priority: '0.7', changefreq: 'weekly' },
      { url: '/leaderboard', priority: '0.8', changefreq: 'daily' },
      { url: '/spl-calculator', priority: '0.6', changefreq: 'monthly' },
      { url: '/pricing', priority: '0.8', changefreq: 'weekly' },
      { url: '/business', priority: '0.7', changefreq: 'weekly' },
      { url: '/business-features', priority: '0.6', changefreq: 'monthly' },
      { url: '/organizations', priority: '0.7', changefreq: 'weekly' },
      { url: '/organization-features', priority: '0.6', changefreq: 'monthly' },
      { url: '/support', priority: '0.6', changefreq: 'monthly' },
      { url: '/login', priority: '0.5', changefreq: 'monthly' },
      { url: '/register', priority: '0.6', changefreq: 'monthly' },
      { url: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
      { url: '/search', priority: '0.5', changefreq: 'weekly' },
    ]

    // Fetch active events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, updated_at, start_date')
      .eq('is_active', true)
      .eq('is_public', true)
      .order('start_date', { ascending: false })

    if (eventsError) {
      console.error('Error fetching events:', eventsError)
    }

    // Fetch active directory listings
    const { data: listings, error: listingsError } = await supabase
      .from('directory_listings')
      .select('id, updated_at')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false })

    if (listingsError) {
      console.error('Error fetching directory listings:', listingsError)
    }

    // Fetch CMS pages
    const { data: cmsPages, error: cmsError } = await supabase
      .from('cms_pages')
      .select('slug, updated_at')
      .eq('is_published', true)
      .order('updated_at', { ascending: false })

    if (cmsError) {
      console.error('Error fetching CMS pages:', cmsError)
    }

    // Build sitemap XML
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    // Add static pages
    for (const page of staticPages) {
      sitemap += '  <url>\n'
      sitemap += `    <loc>${baseUrl}${page.url}</loc>\n`
      sitemap += `    <lastmod>${currentDate}</lastmod>\n`
      sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`
      sitemap += `    <priority>${page.priority}</priority>\n`
      sitemap += '  </url>\n'
    }

    // Add event pages
    if (events) {
      for (const event of events) {
        const eventDate = event.updated_at ? event.updated_at.split('T')[0] : currentDate
        const priority = new Date(event.start_date) > new Date() ? '0.8' : '0.6' // Higher priority for upcoming events
        
        sitemap += '  <url>\n'
        sitemap += `    <loc>${baseUrl}/events/${event.id}</loc>\n`
        sitemap += `    <lastmod>${eventDate}</lastmod>\n`
        sitemap += `    <changefreq>weekly</changefreq>\n`
        sitemap += `    <priority>${priority}</priority>\n`
        sitemap += '  </url>\n'
      }
    }

    // Add directory listing pages
    if (listings) {
      for (const listing of listings) {
        const listingDate = listing.updated_at ? listing.updated_at.split('T')[0] : currentDate
        
        sitemap += '  <url>\n'
        sitemap += `    <loc>${baseUrl}/directory/${listing.id}</loc>\n`
        sitemap += `    <lastmod>${listingDate}</lastmod>\n`
        sitemap += `    <changefreq>monthly</changefreq>\n`
        sitemap += `    <priority>0.5</priority>\n`
        sitemap += '  </url>\n'
      }
    }

    // Add CMS pages
    if (cmsPages) {
      for (const page of cmsPages) {
        const pageDate = page.updated_at ? page.updated_at.split('T')[0] : currentDate
        
        sitemap += '  <url>\n'
        sitemap += `    <loc>${baseUrl}/pages/${page.slug}</loc>\n`
        sitemap += `    <lastmod>${pageDate}</lastmod>\n`
        sitemap += `    <changefreq>monthly</changefreq>\n`
        sitemap += `    <priority>0.5</priority>\n`
        sitemap += '  </url>\n'
      }
    }

    sitemap += '</urlset>'

    return new Response(sitemap, {
      headers: corsHeaders,
    })

  } catch (error) {
    console.error('Error generating sitemap:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})