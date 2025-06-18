-- Create search analytics table for global search tracking
-- Fixes missing get_popular_searches function

-- Create search_analytics table
CREATE TABLE IF NOT EXISTS public.search_analytics (
    id BIGSERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    searched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON public.search_analytics(query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_searched_at ON public.search_analytics(searched_at);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON public.search_analytics(user_id);

-- Enable RLS
ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- Allow inserts for authenticated users (for tracking)
CREATE POLICY "Anyone can insert search analytics" ON public.search_analytics
    FOR INSERT
    WITH CHECK (true);

-- Allow reading aggregated data (no personal info exposed)
CREATE POLICY "Anyone can read aggregated search analytics" ON public.search_analytics
    FOR SELECT
    USING (true);

-- Create function to get popular searches
CREATE OR REPLACE FUNCTION public.get_popular_searches(
    search_limit INTEGER DEFAULT 10,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    query TEXT,
    count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        sa.query,
        COUNT(*) as count
    FROM public.search_analytics sa
    WHERE sa.searched_at >= (NOW() - (days_back || ' days')::INTERVAL)
    AND sa.query IS NOT NULL
    AND LENGTH(TRIM(sa.query)) > 0
    GROUP BY sa.query
    ORDER BY COUNT(*) DESC, sa.query ASC
    LIMIT search_limit;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT ON public.search_analytics TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.search_analytics_id_seq TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_popular_searches TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE public.search_analytics IS 'Tracks search queries for analytics and popular search suggestions';
COMMENT ON FUNCTION public.get_popular_searches IS 'Returns popular search queries from the last N days'; 