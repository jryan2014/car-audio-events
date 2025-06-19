-- COMPLETE DATABASE FIX - Add ALL Missing Columns at Once
-- This script adds every column the Car Audio Events Platform expects

-- Add ALL missing columns to events table in one go
DO $$ 
BEGIN
    -- Core identification and categorization
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'category_id') THEN
        ALTER TABLE events ADD COLUMN category_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'organizer_id') THEN
        ALTER TABLE events ADD COLUMN organizer_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'organization_id') THEN
        ALTER TABLE events ADD COLUMN organization_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'sanction_body_id') THEN
        ALTER TABLE events ADD COLUMN sanction_body_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'season_year') THEN
        ALTER TABLE events ADD COLUMN season_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW());
    END IF;

    -- Approval and status fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'approval_status') THEN
        ALTER TABLE events ADD COLUMN approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'rejection_reason') THEN
        ALTER TABLE events ADD COLUMN rejection_reason TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_active') THEN
        ALTER TABLE events ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'is_public') THEN
        ALTER TABLE events ADD COLUMN is_public BOOLEAN DEFAULT true;
    END IF;

    -- Date and time fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'registration_deadline') THEN
        ALTER TABLE events ADD COLUMN registration_deadline TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'early_bird_deadline') THEN
        ALTER TABLE events ADD COLUMN early_bird_deadline TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'display_start_date') THEN
        ALTER TABLE events ADD COLUMN display_start_date TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'display_end_date') THEN
        ALTER TABLE events ADD COLUMN display_end_date TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Pricing fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'registration_fee') THEN
        ALTER TABLE events ADD COLUMN registration_fee DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'ticket_price') THEN
        ALTER TABLE events ADD COLUMN ticket_price DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'early_bird_fee') THEN
        ALTER TABLE events ADD COLUMN early_bird_fee DECIMAL(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'early_bird_name') THEN
        ALTER TABLE events ADD COLUMN early_bird_name TEXT DEFAULT 'Early Bird Special';
    END IF;

    -- Participant tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'current_participants') THEN
        ALTER TABLE events ADD COLUMN current_participants INTEGER DEFAULT 0;
    END IF;

    -- Venue and location fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_name') THEN
        ALTER TABLE events ADD COLUMN event_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'zip_code') THEN
        ALTER TABLE events ADD COLUMN zip_code TEXT;
    END IF;

    -- Contact information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'contact_email') THEN
        ALTER TABLE events ADD COLUMN contact_email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'contact_phone') THEN
        ALTER TABLE events ADD COLUMN contact_phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'website') THEN
        ALTER TABLE events ADD COLUMN website TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'website_url') THEN
        ALTER TABLE events ADD COLUMN website_url TEXT;
    END IF;

    -- Event director contact info
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_director_first_name') THEN
        ALTER TABLE events ADD COLUMN event_director_first_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_director_last_name') THEN
        ALTER TABLE events ADD COLUMN event_director_last_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_director_email') THEN
        ALTER TABLE events ADD COLUMN event_director_email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'event_director_phone') THEN
        ALTER TABLE events ADD COLUMN event_director_phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'use_organizer_contact') THEN
        ALTER TABLE events ADD COLUMN use_organizer_contact BOOLEAN DEFAULT true;
    END IF;

    -- Event content fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'rules') THEN
        ALTER TABLE events ADD COLUMN rules TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'prizes') THEN
        ALTER TABLE events ADD COLUMN prizes JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'schedule') THEN
        ALTER TABLE events ADD COLUMN schedule JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'sponsors') THEN
        ALTER TABLE events ADD COLUMN sponsors JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'shop_sponsors') THEN
        ALTER TABLE events ADD COLUMN shop_sponsors JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Trophy and awards fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'first_place_trophy') THEN
        ALTER TABLE events ADD COLUMN first_place_trophy BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'second_place_trophy') THEN
        ALTER TABLE events ADD COLUMN second_place_trophy BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'third_place_trophy') THEN
        ALTER TABLE events ADD COLUMN third_place_trophy BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'fourth_place_trophy') THEN
        ALTER TABLE events ADD COLUMN fourth_place_trophy BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'fifth_place_trophy') THEN
        ALTER TABLE events ADD COLUMN fifth_place_trophy BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'has_raffle') THEN
        ALTER TABLE events ADD COLUMN has_raffle BOOLEAN DEFAULT false;
    END IF;

    -- Giveaway fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'member_giveaways') THEN
        ALTER TABLE events ADD COLUMN member_giveaways JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'non_member_giveaways') THEN
        ALTER TABLE events ADD COLUMN non_member_giveaways JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- SEO fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'seo_title') THEN
        ALTER TABLE events ADD COLUMN seo_title TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'seo_description') THEN
        ALTER TABLE events ADD COLUMN seo_description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'seo_keywords') THEN
        ALTER TABLE events ADD COLUMN seo_keywords JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Ensure timestamps exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'created_at') THEN
        ALTER TABLE events ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'updated_at') THEN
        ALTER TABLE events ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

END $$;

-- Create event_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS event_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'calendar',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default event categories
INSERT INTO event_categories (name, description, color, icon) 
VALUES 
    ('Bass Competition', 'SPL and bass-focused competitions', '#ef4444', 'volume-2'),
    ('Sound Quality', 'Audio quality and clarity competitions', '#10b981', 'headphones'),
    ('Championship', 'Major championship events', '#f59e0b', 'trophy'),
    ('Local Show', 'Local car audio shows and meets', '#6366f1', 'map-pin'),
    ('Installation', 'Installation and build competitions', '#8b5cf6', 'wrench')
ON CONFLICT (name) DO NOTHING;

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'events_category_id_fkey') THEN
        ALTER TABLE events ADD CONSTRAINT events_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES event_categories(id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'events_organizer_id_fkey') THEN
            ALTER TABLE events ADD CONSTRAINT events_organizer_id_fkey 
            FOREIGN KEY (organizer_id) REFERENCES users(id);
        END IF;
    END IF;
END $$;

-- Enable RLS and create policies
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for event_categories" ON event_categories;
CREATE POLICY "Public read access for event_categories" ON event_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access for event_categories" ON event_categories;
CREATE POLICY "Admin full access for event_categories" ON event_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.membership_type = 'admin'
        )
    );

-- Update existing events with default values
DO $$
DECLARE
    default_category_id UUID;
BEGIN
    SELECT id INTO default_category_id FROM event_categories LIMIT 1;
    
    IF default_category_id IS NOT NULL THEN
        UPDATE events 
        SET 
            category_id = COALESCE(category_id, default_category_id),
            approval_status = COALESCE(approval_status, 'pending'),
            current_participants = COALESCE(current_participants, 0),
            is_active = COALESCE(is_active, true),
            is_public = COALESCE(is_public, true),
            registration_fee = COALESCE(registration_fee, ticket_price, 0),
            ticket_price = COALESCE(ticket_price, registration_fee, 0)
        WHERE category_id IS NULL OR approval_status IS NULL;
    END IF;
END $$;

SELECT 'ALL MISSING COLUMNS ADDED SUCCESSFULLY!' as result; 