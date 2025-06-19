-- =====================================================
-- AI CONFIGURATION AND USAGE TRACKING SYSTEM
-- Production Database Schema - FIXED VERSION
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. AI SERVICE PROVIDERS CONFIGURATION
-- =====================================================
CREATE TABLE ai_service_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(50) NOT NULL UNIQUE, -- 'openai-dalle', 'stability-ai', etc.
    display_name VARCHAR(100) NOT NULL,
    service_type VARCHAR(20) NOT NULL CHECK (service_type IN ('image', 'text')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. AI PROVIDER CONFIGURATIONS (Per User/Organization)
-- =====================================================
CREATE TABLE ai_provider_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    organization_id INTEGER, -- Changed to INTEGER to match existing organizations table
    provider_id UUID REFERENCES ai_service_providers(id) ON DELETE CASCADE,
    
    -- Configuration Settings
    api_key_encrypted TEXT, -- Encrypted API key
    model VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT false,
    
    -- Image Generation Settings (nullable for text providers)
    quality VARCHAR(20) CHECK (quality IN ('standard', 'hd') OR quality IS NULL),
    style VARCHAR(20) CHECK (style IN ('vivid', 'natural') OR style IS NULL),
    
    -- Text Generation Settings (nullable for image providers)
    max_tokens INTEGER CHECK (max_tokens > 0 OR max_tokens IS NULL),
    temperature DECIMAL(3,2) CHECK (temperature >= 0 AND temperature <= 2 OR temperature IS NULL),
    
    -- Cost and Limit Settings
    cost_per_request DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    daily_request_limit INTEGER NOT NULL DEFAULT 100,
    monthly_cost_limit DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one config per user/org per provider
    UNIQUE(user_id, provider_id),
    UNIQUE(organization_id, provider_id),
    
    -- Must belong to either user or organization, not both
    CHECK ((user_id IS NOT NULL AND organization_id IS NULL) OR 
           (user_id IS NULL AND organization_id IS NOT NULL))
);

-- Add foreign key constraints separately to handle potential issues
ALTER TABLE ai_provider_configs 
ADD CONSTRAINT ai_provider_configs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ai_provider_configs 
ADD CONSTRAINT ai_provider_configs_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- =====================================================
-- 3. AI USAGE TRACKING
-- =====================================================
CREATE TABLE ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID REFERENCES ai_provider_configs(id) ON DELETE CASCADE,
    
    -- Request Details
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('image', 'text')),
    prompt TEXT NOT NULL,
    model_used VARCHAR(100) NOT NULL,
    
    -- Response Details
    success BOOLEAN NOT NULL DEFAULT false,
    response_data JSONB, -- Store generated content metadata
    error_message TEXT,
    
    -- Cost and Usage
    tokens_used INTEGER, -- For text generation
    cost_incurred DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    processing_time_ms INTEGER,
    
    -- Context
    source_feature VARCHAR(50), -- 'ad_generation', 'content_writing', etc.
    source_id UUID, -- Reference to ad, content, etc.
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. AI GENERATED CONTENT STORAGE
-- =====================================================
CREATE TABLE ai_generated_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usage_log_id UUID REFERENCES ai_usage_logs(id) ON DELETE CASCADE,
    
    -- Image Details
    image_url TEXT NOT NULL,
    image_size_name VARCHAR(50) NOT NULL, -- 'banner', 'square', etc.
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    file_size_bytes INTEGER,
    
    -- Generation Details
    prompt TEXT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    generation_settings JSONB, -- Store quality, style, etc.
    
    -- Usage Context
    advertiser_id INTEGER, -- Changed to INTEGER to match existing organizations table
    advertisement_id UUID, -- Reference to ad if used
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint separately
ALTER TABLE ai_generated_images 
ADD CONSTRAINT ai_generated_images_advertiser_id_fkey 
FOREIGN KEY (advertiser_id) REFERENCES organizations(id) ON DELETE SET NULL;

CREATE TABLE ai_generated_text (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usage_log_id UUID REFERENCES ai_usage_logs(id) ON DELETE CASCADE,
    
    -- Text Details
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'product_description', 'ad_copy', etc.
    word_count INTEGER NOT NULL,
    
    -- Generation Details
    prompt TEXT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    generation_settings JSONB, -- Store temperature, max_tokens, etc.
    
    -- Usage Context
    advertiser_id INTEGER, -- Changed to INTEGER to match existing organizations table
    advertisement_id UUID, -- Reference to ad if used
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_archived BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint separately
ALTER TABLE ai_generated_text 
ADD CONSTRAINT ai_generated_text_advertiser_id_fkey 
FOREIGN KEY (advertiser_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- =====================================================
-- 5. CONTENT DIRECTION CONFIGURATIONS
-- =====================================================
CREATE TABLE ai_content_directions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    organization_id INTEGER, -- Changed to INTEGER to match existing organizations table
    
    -- Brand Voice Settings
    brand_voice VARCHAR(50) NOT NULL DEFAULT 'professional',
    writing_style VARCHAR(50) NOT NULL DEFAULT 'informative',
    target_audience TEXT NOT NULL DEFAULT 'car audio enthusiasts',
    
    -- Key Messages (JSON array)
    key_messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    tone_guidelines TEXT,
    
    -- Format Preferences
    format_preferences JSONB NOT NULL DEFAULT '{
        "includeIntroduction": true,
        "includeConclusion": true,
        "includeCallToAction": true,
        "useHeadings": true,
        "useSubheadings": false,
        "useBulletPoints": true,
        "useNumberedLists": false,
        "useEmphasisFormatting": true,
        "includeTechnicalSpecs": true,
        "includeStatistics": false,
        "useQuotes": false,
        "addSourceReferences": false,
        "preferredLength": "medium"
    }'::jsonb,
    
    -- Content Types
    content_types JSONB NOT NULL DEFAULT '{
        "productDescriptions": true,
        "eventAnnouncements": true,
        "blogPosts": true,
        "socialMediaPosts": true,
        "emailCampaigns": true
    }'::jsonb,
    
    -- Content Restrictions
    restrictions JSONB NOT NULL DEFAULT '{
        "avoidSuperlatives": false,
        "requireFactChecking": true,
        "includeDisclaimer": false,
        "maxWordCount": 500,
        "minWordCount": 50
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Must belong to either user or organization, not both
    CHECK ((user_id IS NOT NULL AND organization_id IS NULL) OR 
           (user_id IS NULL AND organization_id IS NOT NULL))
);

-- Add foreign key constraints separately
ALTER TABLE ai_content_directions 
ADD CONSTRAINT ai_content_directions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ai_content_directions 
ADD CONSTRAINT ai_content_directions_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- =====================================================
-- 6. IMAGE GENERATION GUIDELINES
-- =====================================================
CREATE TABLE ai_image_guidelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    organization_id INTEGER, -- Changed to INTEGER to match existing organizations table
    
    -- Visual Style Settings
    visual_style VARCHAR(50) NOT NULL DEFAULT 'modern',
    color_scheme JSONB NOT NULL DEFAULT '{
        "primary": "#0ea5e9",
        "secondary": "#64748b",
        "accent": "#f59e0b",
        "background": "#ffffff",
        "text": "#1e293b"
    }'::jsonb,
    
    -- Composition Guidelines
    composition_style VARCHAR(50) NOT NULL DEFAULT 'balanced',
    preferred_layouts JSONB NOT NULL DEFAULT '["centered", "rule-of-thirds", "asymmetrical"]'::jsonb,
    
    -- Text Overlay Zones (for ad images)
    text_overlay_zones JSONB NOT NULL DEFAULT '{
        "header": {"position": "top", "height": "25%", "alignment": "center"},
        "cta": {"position": "bottom-right", "width": "30%", "height": "20%"},
        "contact": {"position": "bottom", "height": "15%", "alignment": "center"},
        "product": {"position": "center", "width": "60%", "height": "40%"},
        "offer": {"position": "top-right", "width": "25%", "height": "25%"}
    }'::jsonb,
    
    -- Brand Elements
    logo_placement VARCHAR(50) NOT NULL DEFAULT 'bottom-right',
    brand_colors_required BOOLEAN DEFAULT true,
    watermark_required BOOLEAN DEFAULT false,
    
    -- Technical Specifications
    preferred_dimensions JSONB NOT NULL DEFAULT '{
        "banner": {"width": 1200, "height": 400},
        "square": {"width": 800, "height": 800},
        "portrait": {"width": 600, "height": 900},
        "story": {"width": 1080, "height": 1920}
    }'::jsonb,
    
    -- Content Guidelines
    avoid_elements JSONB NOT NULL DEFAULT '["cluttered_backgrounds", "small_text", "too_many_colors"]'::jsonb,
    required_elements JSONB NOT NULL DEFAULT '["clear_focal_point", "readable_text", "brand_consistency"]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Must belong to either user or organization, not both
    CHECK ((user_id IS NOT NULL AND organization_id IS NULL) OR 
           (user_id IS NULL AND organization_id IS NOT NULL))
);

-- Add foreign key constraints separately
ALTER TABLE ai_image_guidelines 
ADD CONSTRAINT ai_image_guidelines_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ai_image_guidelines 
ADD CONSTRAINT ai_image_guidelines_organization_id_fkey 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- =====================================================
-- 7. USAGE ANALYTICS (Pre-computed for performance)
-- =====================================================
CREATE TABLE ai_usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_id UUID REFERENCES ai_provider_configs(id) ON DELETE CASCADE,
    
    -- Time Period
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    date_period DATE NOT NULL,
    
    -- Usage Statistics
    total_requests INTEGER NOT NULL DEFAULT 0,
    successful_requests INTEGER NOT NULL DEFAULT 0,
    failed_requests INTEGER NOT NULL DEFAULT 0,
    total_cost DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    total_tokens INTEGER DEFAULT 0,
    avg_processing_time_ms INTEGER DEFAULT 0,
    
    -- Content Statistics
    images_generated INTEGER NOT NULL DEFAULT 0,
    text_pieces_generated INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for period analytics
    UNIQUE(config_id, period_type, date_period)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_ai_usage_logs_config_id ON ai_usage_logs(config_id);
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);
CREATE INDEX idx_ai_usage_logs_success ON ai_usage_logs(success);
CREATE INDEX idx_ai_usage_logs_source ON ai_usage_logs(source_feature, source_id);

-- Generated content indexes
CREATE INDEX idx_ai_generated_images_usage_log ON ai_generated_images(usage_log_id);
CREATE INDEX idx_ai_generated_images_advertiser ON ai_generated_images(advertiser_id);
CREATE INDEX idx_ai_generated_images_active ON ai_generated_images(is_active, is_archived);

CREATE INDEX idx_ai_generated_text_usage_log ON ai_generated_text(usage_log_id);
CREATE INDEX idx_ai_generated_text_advertiser ON ai_generated_text(advertiser_id);
CREATE INDEX idx_ai_generated_text_active ON ai_generated_text(is_active, is_archived);

-- Analytics indexes
CREATE INDEX idx_ai_usage_analytics_config_period ON ai_usage_analytics(config_id, date_period);
CREATE INDEX idx_ai_usage_analytics_period_type ON ai_usage_analytics(period_type, date_period);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update usage analytics automatically
CREATE OR REPLACE FUNCTION update_ai_usage_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update daily analytics
    INSERT INTO ai_usage_analytics (config_id, period_type, date_period, total_requests, successful_requests, failed_requests, total_cost, total_tokens, images_generated, text_pieces_generated)
    VALUES (
        NEW.config_id,
        'daily',
        DATE(NEW.created_at),
        1,
        CASE WHEN NEW.success THEN 1 ELSE 0 END,
        CASE WHEN NOT NEW.success THEN 1 ELSE 0 END,
        NEW.cost_incurred,
        COALESCE(NEW.tokens_used, 0),
        CASE WHEN NEW.request_type = 'image' AND NEW.success THEN 1 ELSE 0 END,
        CASE WHEN NEW.request_type = 'text' AND NEW.success THEN 1 ELSE 0 END
    )
    ON CONFLICT (config_id, period_type, date_period)
    DO UPDATE SET
        total_requests = ai_usage_analytics.total_requests + 1,
        successful_requests = ai_usage_analytics.successful_requests + CASE WHEN NEW.success THEN 1 ELSE 0 END,
        failed_requests = ai_usage_analytics.failed_requests + CASE WHEN NOT NEW.success THEN 1 ELSE 0 END,
        total_cost = ai_usage_analytics.total_cost + NEW.cost_incurred,
        total_tokens = ai_usage_analytics.total_tokens + COALESCE(NEW.tokens_used, 0),
        images_generated = ai_usage_analytics.images_generated + CASE WHEN NEW.request_type = 'image' AND NEW.success THEN 1 ELSE 0 END,
        text_pieces_generated = ai_usage_analytics.text_pieces_generated + CASE WHEN NEW.request_type = 'text' AND NEW.success THEN 1 ELSE 0 END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update analytics
CREATE TRIGGER trigger_update_ai_usage_analytics
    AFTER INSERT ON ai_usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_usage_analytics();

-- =====================================================
-- VIEWS FOR EASY DATA ACCESS
-- =====================================================

-- View for provider usage summary
CREATE VIEW ai_provider_usage_summary AS
SELECT 
    asp.provider_name,
    asp.display_name,
    asp.service_type,
    COUNT(apc.id) as total_configurations,
    COUNT(CASE WHEN apc.enabled THEN 1 END) as active_configurations,
    COALESCE(SUM(aua.total_requests), 0) as total_requests_today,
    COALESCE(SUM(aua.successful_requests), 0) as successful_requests_today,
    COALESCE(SUM(aua.total_cost), 0) as total_cost_today,
    COALESCE(SUM(aua.images_generated), 0) as images_generated_today,
    COALESCE(SUM(aua.text_pieces_generated), 0) as text_pieces_generated_today
FROM ai_service_providers asp
LEFT JOIN ai_provider_configs apc ON asp.id = apc.provider_id
LEFT JOIN ai_usage_analytics aua ON apc.id = aua.config_id 
    AND aua.period_type = 'daily' 
    AND aua.date_period = CURRENT_DATE
WHERE asp.is_active = true
GROUP BY asp.id, asp.provider_name, asp.display_name, asp.service_type
ORDER BY asp.service_type, asp.display_name;

-- View for user/organization usage summary
CREATE VIEW ai_user_usage_summary AS
SELECT 
    COALESCE(apc.user_id::text, apc.organization_id::text) as entity_id,
    CASE WHEN apc.user_id IS NOT NULL THEN 'user' ELSE 'organization' END as entity_type,
    COUNT(apc.id) as total_configurations,
    COUNT(CASE WHEN apc.enabled THEN 1 END) as active_configurations,
    COALESCE(SUM(aua.total_requests), 0) as total_requests_today,
    COALESCE(SUM(aua.successful_requests), 0) as successful_requests_today,
    COALESCE(SUM(aua.total_cost), 0) as total_cost_today,
    COALESCE(SUM(aua.images_generated), 0) as images_generated_today,
    COALESCE(SUM(aua.text_pieces_generated), 0) as text_pieces_generated_today
FROM ai_provider_configs apc
LEFT JOIN ai_usage_analytics aua ON apc.id = aua.config_id 
    AND aua.period_type = 'daily' 
    AND aua.date_period = CURRENT_DATE
GROUP BY COALESCE(apc.user_id::text, apc.organization_id::text), CASE WHEN apc.user_id IS NOT NULL THEN 'user' ELSE 'organization' END
ORDER BY total_cost_today DESC;

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Insert default AI service providers
INSERT INTO ai_service_providers (provider_name, display_name, service_type) VALUES
-- Image Generation Providers
('openai-dalle', 'OpenAI DALL-E', 'image'),
('stability-ai', 'Stability AI', 'image'),
('midjourney', 'Midjourney', 'image'),
('adobe-firefly', 'Adobe Firefly', 'image'),

-- Text Generation Providers
('openai-gpt', 'OpenAI GPT', 'text'),
('anthropic-claude', 'Anthropic Claude', 'text'),
('google-gemini', 'Google Gemini', 'text')
ON CONFLICT (provider_name) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - SIMPLIFIED
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE ai_service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generated_text ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_content_directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_image_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_analytics ENABLE ROW LEVEL SECURITY;

-- Service providers are readable by all authenticated users
CREATE POLICY "Service providers are viewable by authenticated users" ON ai_service_providers
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only access their own configurations (simplified - no organization relationship)
CREATE POLICY "Users can view own AI configurations" ON ai_provider_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI configurations" ON ai_provider_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI configurations" ON ai_provider_configs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI configurations" ON ai_provider_configs
    FOR DELETE USING (auth.uid() = user_id);

-- Usage logs - users can only see their own
CREATE POLICY "Users can view own usage logs" ON ai_usage_logs
    FOR SELECT USING (
        config_id IN (
            SELECT id FROM ai_provider_configs 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert usage logs" ON ai_usage_logs
    FOR INSERT WITH CHECK (true); -- Allow system to insert logs

-- Generated content - users can only see their own
CREATE POLICY "Users can view own generated images" ON ai_generated_images
    FOR SELECT USING (
        usage_log_id IN (
            SELECT aul.id FROM ai_usage_logs aul
            JOIN ai_provider_configs apc ON aul.config_id = apc.id
            WHERE apc.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert generated images" ON ai_generated_images
    FOR INSERT WITH CHECK (true); -- Allow system to insert generated content

CREATE POLICY "Users can view own generated text" ON ai_generated_text
    FOR SELECT USING (
        usage_log_id IN (
            SELECT aul.id FROM ai_usage_logs aul
            JOIN ai_provider_configs apc ON aul.config_id = apc.id
            WHERE apc.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert generated text" ON ai_generated_text
    FOR INSERT WITH CHECK (true); -- Allow system to insert generated content

-- Content directions - users can manage their own
CREATE POLICY "Users can manage own content directions" ON ai_content_directions
    FOR ALL USING (auth.uid() = user_id);

-- Image guidelines - users can manage their own
CREATE POLICY "Users can manage own image guidelines" ON ai_image_guidelines
    FOR ALL USING (auth.uid() = user_id);

-- Analytics - users can view their own
CREATE POLICY "Users can view own analytics" ON ai_usage_analytics
    FOR SELECT USING (
        config_id IN (
            SELECT id FROM ai_provider_configs 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can manage analytics" ON ai_usage_analytics
    FOR ALL WITH CHECK (true); -- Allow system to manage analytics

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'AI Configuration and Usage Tracking System has been successfully installed!';
    RAISE NOTICE 'Tables created: 8 main tables + 2 views';
    RAISE NOTICE 'Default providers added: 7 AI services (4 image, 3 text)';
    RAISE NOTICE 'Row Level Security enabled with simplified access policies';
    RAISE NOTICE 'Ready for production use with real usage tracking!';
    RAISE NOTICE 'IMPORTANT: organization_id fields use INTEGER to match existing organizations table';
    RAISE NOTICE 'NOTE: RLS policies simplified due to no user-organization relationship in current schema';
END $$; 