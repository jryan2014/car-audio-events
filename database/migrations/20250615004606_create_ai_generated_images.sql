-- Create AI Generated Images table
CREATE TABLE IF NOT EXISTS ai_generated_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt TEXT NOT NULL,
    image_url TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'openai',
    model TEXT NOT NULL DEFAULT 'dall-e-3',
    size TEXT NOT NULL DEFAULT '1024x1024',
    quality TEXT DEFAULT 'standard',
    style TEXT DEFAULT 'vivid',
    cost_usd DECIMAL(10,4) DEFAULT 0.0400,
    advertiser_id UUID REFERENCES users(id) ON DELETE CASCADE,
    advertiser_name TEXT,
    ad_title TEXT,
    is_active BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create advertisement tracking tables if they don't exist
CREATE TABLE IF NOT EXISTS advertisement_impressions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    page_url TEXT,
    placement_type TEXT,
    device_type TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advertisement_clicks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advertisement_id UUID NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
    page_url TEXT,
    click_url TEXT,
    placement_type TEXT,
    device_type TEXT,
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_advertiser_id ON ai_generated_images(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_created_at ON ai_generated_images(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_is_active ON ai_generated_images(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_is_archived ON ai_generated_images(is_archived);

CREATE INDEX IF NOT EXISTS idx_advertisement_impressions_ad_id ON advertisement_impressions(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_advertisement_impressions_created_at ON advertisement_impressions(created_at);
CREATE INDEX IF NOT EXISTS idx_advertisement_clicks_ad_id ON advertisement_clicks(advertisement_id);
CREATE INDEX IF NOT EXISTS idx_advertisement_clicks_created_at ON advertisement_clicks(created_at);

-- Enable RLS
ALTER TABLE ai_generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisement_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisement_clicks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AI Generated Images
CREATE POLICY "Users can view their own AI generated images" ON ai_generated_images
    FOR SELECT USING (advertiser_id = auth.uid());

CREATE POLICY "Users can insert their own AI generated images" ON ai_generated_images
    FOR INSERT WITH CHECK (advertiser_id = auth.uid());

CREATE POLICY "Users can update their own AI generated images" ON ai_generated_images
    FOR UPDATE USING (advertiser_id = auth.uid());

CREATE POLICY "Users can delete their own AI generated images" ON ai_generated_images
    FOR DELETE USING (advertiser_id = auth.uid());

CREATE POLICY "Admins can manage all AI generated images" ON ai_generated_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- RLS Policies for Advertisement Tracking (Allow anonymous access for tracking)
CREATE POLICY "Allow anonymous impression tracking" ON advertisement_impressions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous click tracking" ON advertisement_clicks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can view impression data" ON advertisement_impressions
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view click data" ON advertisement_clicks
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage all tracking data" ON advertisement_impressions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

CREATE POLICY "Admins can manage all tracking data" ON advertisement_clicks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Allow anonymous users to update impression and click counts on advertisements
CREATE POLICY "Allow anonymous impression count updates" ON advertisements
    FOR UPDATE USING (true)
    WITH CHECK (true);

-- Update function for ai_generated_images
CREATE OR REPLACE FUNCTION update_ai_generated_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_generated_images_updated_at
    BEFORE UPDATE ON ai_generated_images
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_generated_images_updated_at();

-- Create a view for image statistics
CREATE OR REPLACE VIEW ai_image_stats AS
SELECT 
    COUNT(*) as total_images,
    SUM(cost_usd) as total_cost,
    COUNT(*) FILTER (WHERE is_active = true) as active_images,
    COUNT(*) FILTER (WHERE is_active = false AND is_archived = false) as inactive_images,
    COUNT(*) FILTER (WHERE is_archived = true) as archived_images,
    provider,
    advertiser_name,
    MIN(created_at) as oldest_image,
    MAX(created_at) as newest_image
FROM ai_generated_images
GROUP BY provider, advertiser_name;

-- Add comments for documentation
COMMENT ON TABLE ai_generated_images IS 'Stores AI-generated images with metadata and cost tracking';
COMMENT ON COLUMN ai_generated_images.cost_usd IS 'Cost in USD for generating this image';
COMMENT ON COLUMN ai_generated_images.is_active IS 'Whether this image is currently being used in an active ad';
COMMENT ON COLUMN ai_generated_images.is_archived IS 'Whether this image has been archived for cleanup'; 