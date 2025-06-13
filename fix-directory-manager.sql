-- Fix Directory Manager Database Issues
-- This addresses the multiple relationship error and ensures the directory system works

-- First, check if directory_listings table exists, if not create a basic version
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'directory_listings') THEN
        -- Create a minimal directory_listings table if it doesn't exist
        CREATE TABLE directory_listings (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            business_name VARCHAR(255) NOT NULL,
            listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('retailer', 'manufacturer', 'used_equipment')),
            status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
            
            -- Contact Information
            contact_name VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            website VARCHAR(500),
            
            -- Location Information
            city VARCHAR(100) NOT NULL,
            state VARCHAR(100) NOT NULL,
            country VARCHAR(100) NOT NULL DEFAULT 'United States',
            
            -- Business Information
            description TEXT,
            
            -- Metadata
            featured BOOLEAN DEFAULT false,
            featured_until TIMESTAMP WITH TIME ZONE,
            views_count INTEGER DEFAULT 0,
            rating DECIMAL(3, 2) DEFAULT 0,
            review_count INTEGER DEFAULT 0,
            
            -- Admin fields
            admin_notes TEXT,
            reviewed_by UUID REFERENCES users(id),
            reviewed_at TIMESTAMP WITH TIME ZONE,
            rejection_reason TEXT,
            
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created directory_listings table';
    ELSE
        RAISE NOTICE 'directory_listings table already exists';
    END IF;
END $$;

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add reviewed_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directory_listings' AND column_name = 'reviewed_by'
    ) THEN
        ALTER TABLE directory_listings ADD COLUMN reviewed_by UUID REFERENCES users(id);
        RAISE NOTICE 'Added reviewed_by column to directory_listings';
    END IF;
    
    -- Add reviewed_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directory_listings' AND column_name = 'reviewed_at'
    ) THEN
        ALTER TABLE directory_listings ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added reviewed_at column to directory_listings';
    END IF;
    
    -- Add admin_notes column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directory_listings' AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE directory_listings ADD COLUMN admin_notes TEXT;
        RAISE NOTICE 'Added admin_notes column to directory_listings';
    END IF;
    
    -- Add rejection_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directory_listings' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE directory_listings ADD COLUMN rejection_reason TEXT;
        RAISE NOTICE 'Added rejection_reason column to directory_listings';
    END IF;
    
    -- Add featured column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directory_listings' AND column_name = 'featured'
    ) THEN
        ALTER TABLE directory_listings ADD COLUMN featured BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added featured column to directory_listings';
    END IF;
    
    -- Add rating column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directory_listings' AND column_name = 'rating'
    ) THEN
        ALTER TABLE directory_listings ADD COLUMN rating DECIMAL(3, 2) DEFAULT 0;
        RAISE NOTICE 'Added rating column to directory_listings';
    END IF;
    
    -- Add review_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directory_listings' AND column_name = 'review_count'
    ) THEN
        ALTER TABLE directory_listings ADD COLUMN review_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added review_count column to directory_listings';
    END IF;
    
    -- Add views_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'directory_listings' AND column_name = 'views_count'
    ) THEN
        ALTER TABLE directory_listings ADD COLUMN views_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added views_count column to directory_listings';
    END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE directory_listings ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies if they don't exist
DO $$
BEGIN
    -- Drop existing policies if they exist to avoid conflicts
    DROP POLICY IF EXISTS "Admins can read all listings" ON directory_listings;
    DROP POLICY IF EXISTS "Users can read their own listings" ON directory_listings;
    DROP POLICY IF EXISTS "Anyone can read approved listings" ON directory_listings;
    
    -- Create policies
    CREATE POLICY "Admins can read all listings" ON directory_listings
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM users 
                WHERE users.id = auth.uid() 
                AND users.membership_type = 'admin'
            )
        );
    
    CREATE POLICY "Users can read their own listings" ON directory_listings
        FOR SELECT USING (user_id = auth.uid());
    
    CREATE POLICY "Anyone can read approved listings" ON directory_listings
        FOR SELECT USING (status = 'approved');
    
    RAISE NOTICE 'Created RLS policies for directory_listings';
END $$;

-- Create the get_directory_stats function if it doesn't exist
CREATE OR REPLACE FUNCTION get_directory_stats()
RETURNS TABLE (
    total_listings BIGINT,
    pending_listings BIGINT,
    approved_listings BIGINT,
    retailer_listings BIGINT,
    manufacturer_listings BIGINT,
    used_equipment_listings BIGINT,
    total_reviews BIGINT,
    average_rating DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_listings,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_listings,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_listings,
        COUNT(*) FILTER (WHERE listing_type = 'retailer') as retailer_listings,
        COUNT(*) FILTER (WHERE listing_type = 'manufacturer') as manufacturer_listings,
        COUNT(*) FILTER (WHERE listing_type = 'used_equipment') as used_equipment_listings,
        0::BIGINT as total_reviews, -- Default to 0 if no reviews table
        COALESCE(AVG(rating), 0)::DECIMAL(3,2) as average_rating
    FROM directory_listings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_directory_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON directory_listings TO authenticated;

-- Create some sample data for testing (optional - remove if you don't want sample data)
INSERT INTO directory_listings (
    user_id, business_name, listing_type, status, contact_name, email, phone, 
    city, state, description
) VALUES (
    (SELECT id FROM users WHERE email = 'admin@caraudioevents.com' LIMIT 1),
    'Sample Car Audio Store', 'retailer', 'approved', 'John Doe', 'john@samplestore.com', '555-1234',
    'Los Angeles', 'CA', 'Premium car audio equipment and installation services'
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE directory_listings IS 'Directory listings for retailers, manufacturers, and used equipment';
COMMENT ON FUNCTION get_directory_stats IS 'Returns aggregate statistics for the directory system';

SELECT 'Directory Manager database setup complete!' as status; 