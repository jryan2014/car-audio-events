-- Create AI Generated Images table
CREATE TABLE IF NOT EXISTS ai_generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    provider VARCHAR(50) NOT NULL, -- 'openai-dalle', 'stability-ai', etc.
    cost DECIMAL(10,4) NOT NULL DEFAULT 0,
    size_name VARCHAR(50) NOT NULL,
    size_width INTEGER NOT NULL,
    size_height INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    advertiser_id UUID REFERENCES advertisers(id) ON DELETE CASCADE,
    advertiser_name VARCHAR(255) NOT NULL,
    ad_id UUID REFERENCES advertisements(id) ON DELETE SET NULL,
    ad_title VARCHAR(255),
    is_active BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}', -- For storing additional provider-specific data
    
    -- Indexes for performance
    INDEX idx_ai_images_advertiser_id (advertiser_id),
    INDEX idx_ai_images_ad_id (ad_id),
    INDEX idx_ai_images_provider (provider),
    INDEX idx_ai_images_created_at (created_at),
    INDEX idx_ai_images_is_active (is_active),
    INDEX idx_ai_images_is_archived (is_archived)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE ai_generated_images ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see images from their own team's advertisers
CREATE POLICY ai_images_select_policy ON ai_generated_images
    FOR SELECT
    USING (
        advertiser_id IN (
            SELECT a.id 
            FROM advertisers a 
            JOIN team_members tm ON a.team_id = tm.team_id 
            WHERE tm.user_id = auth.uid()
        )
    );

-- Policy: Users can only insert images for their own team's advertisers
CREATE POLICY ai_images_insert_policy ON ai_generated_images
    FOR INSERT
    WITH CHECK (
        advertiser_id IN (
            SELECT a.id 
            FROM advertisers a 
            JOIN team_members tm ON a.team_id = tm.team_id 
            WHERE tm.user_id = auth.uid()
        )
    );

-- Policy: Users can only update images from their own team's advertisers
CREATE POLICY ai_images_update_policy ON ai_generated_images
    FOR UPDATE
    USING (
        advertiser_id IN (
            SELECT a.id 
            FROM advertisers a 
            JOIN team_members tm ON a.team_id = tm.team_id 
            WHERE tm.user_id = auth.uid()
        )
    );

-- Policy: Users can only delete images from their own team's advertisers
CREATE POLICY ai_images_delete_policy ON ai_generated_images
    FOR DELETE
    USING (
        advertiser_id IN (
            SELECT a.id 
            FROM advertisers a 
            JOIN team_members tm ON a.team_id = tm.team_id 
            WHERE tm.user_id = auth.uid()
        )
    );

-- Create a view for image statistics
CREATE OR REPLACE VIEW ai_image_stats AS
SELECT 
    COUNT(*) as total_images,
    SUM(cost) as total_cost,
    COUNT(*) FILTER (WHERE is_active = true) as active_images,
    COUNT(*) FILTER (WHERE is_active = false AND is_archived = false) as inactive_images,
    COUNT(*) FILTER (WHERE is_archived = true) as archived_images,
    provider,
    advertiser_name,
    MIN(created_at) as oldest_image,
    MAX(created_at) as newest_image
FROM ai_generated_images
GROUP BY provider, advertiser_name;

-- Add a function to automatically update ad_title when ad_id changes
CREATE OR REPLACE FUNCTION update_ai_image_ad_title()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ad_id IS NOT NULL AND (OLD.ad_id IS NULL OR OLD.ad_id != NEW.ad_id) THEN
        SELECT title INTO NEW.ad_title
        FROM advertisements
        WHERE id = NEW.ad_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating ad_title
CREATE TRIGGER update_ai_image_ad_title_trigger
    BEFORE INSERT OR UPDATE ON ai_generated_images
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_image_ad_title();

-- Add comments for documentation
COMMENT ON TABLE ai_generated_images IS 'Stores AI-generated images with metadata and cost tracking';
COMMENT ON COLUMN ai_generated_images.cost IS 'Cost in USD for generating this image';
COMMENT ON COLUMN ai_generated_images.is_active IS 'Whether this image is currently being used in an active ad';
COMMENT ON COLUMN ai_generated_images.is_archived IS 'Whether this image has been archived for cleanup';
COMMENT ON COLUMN ai_generated_images.metadata IS 'Additional provider-specific metadata (model version, quality settings, etc.)'; 