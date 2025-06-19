-- Directory Management System Database Structure
-- Supports retailers, manufacturers, and used equipment listings

-- Create directory_categories table
CREATE TABLE IF NOT EXISTS directory_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  parent_id UUID REFERENCES directory_categories(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create directory_listings table
CREATE TABLE IF NOT EXISTS directory_listings (
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
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'United States',
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Business Information
  description TEXT,
  established_year INTEGER,
  employee_count VARCHAR(50),
  business_hours JSONB,
  
  -- Retailer specific fields
  services_offered TEXT[], -- Array of services
  installation_services BOOLEAN DEFAULT false,
  custom_fabrication BOOLEAN DEFAULT false,
  sound_deadening BOOLEAN DEFAULT false,
  tuning_services BOOLEAN DEFAULT false,
  
  -- Manufacturer specific fields
  brands_carried TEXT[], -- For retailers: brands they sell, For manufacturers: their own brands
  preferred_dealers TEXT[], -- Manufacturer's preferred dealers
  product_categories TEXT[], -- Categories of products
  warranty_info TEXT,
  
  -- Used Equipment specific fields
  item_title VARCHAR(255), -- For used equipment listings
  item_description TEXT,
  item_condition VARCHAR(20), -- new, excellent, good, fair, poor
  item_price DECIMAL(10, 2),
  item_category_id UUID REFERENCES directory_categories(id),
  is_negotiable BOOLEAN DEFAULT true,
  
  -- Media
  default_image_url VARCHAR(500),
  additional_images JSONB, -- Array of image URLs
  
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- For membership-based renewals
);

-- Create directory_reviews table
CREATE TABLE IF NOT EXISTS directory_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES directory_listings(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  is_verified BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate reviews from same user
  UNIQUE(listing_id, reviewer_id)
);

-- Create directory_favorites table
CREATE TABLE IF NOT EXISTS directory_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES directory_listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate favorites
  UNIQUE(user_id, listing_id)
);

-- Create directory_listing_views table for analytics
CREATE TABLE IF NOT EXISTS directory_listing_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES directory_listings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  referrer VARCHAR(500),
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_directory_listings_type ON directory_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_directory_listings_status ON directory_listings(status);
CREATE INDEX IF NOT EXISTS idx_directory_listings_location ON directory_listings(city, state, country);
CREATE INDEX IF NOT EXISTS idx_directory_listings_user ON directory_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_directory_listings_featured ON directory_listings(featured, featured_until);
CREATE INDEX IF NOT EXISTS idx_directory_listings_created ON directory_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_directory_reviews_listing ON directory_reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_directory_reviews_rating ON directory_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_directory_favorites_user ON directory_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_directory_listing_views_listing ON directory_listing_views(listing_id);

-- Enable RLS
ALTER TABLE directory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_listing_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for directory_categories
CREATE POLICY "Anyone can read active categories" ON directory_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON directory_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

-- RLS Policies for directory_listings
CREATE POLICY "Anyone can read approved listings" ON directory_listings
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can read their own listings" ON directory_listings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all listings" ON directory_listings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

CREATE POLICY "Eligible users can create listings" ON directory_listings
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type IN ('retailer', 'manufacturer', 'organization', 'competitor', 'admin')
    )
  );

CREATE POLICY "Users can update their own listings" ON directory_listings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can update all listings" ON directory_listings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

-- RLS Policies for directory_reviews
CREATE POLICY "Anyone can read approved reviews" ON directory_reviews
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can read their own reviews" ON directory_reviews
  FOR SELECT USING (reviewer_id = auth.uid());

CREATE POLICY "Authenticated users can create reviews" ON directory_reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Users can update their own reviews" ON directory_reviews
  FOR UPDATE USING (reviewer_id = auth.uid());

CREATE POLICY "Admins can manage all reviews" ON directory_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

-- RLS Policies for directory_favorites
CREATE POLICY "Users can manage their own favorites" ON directory_favorites
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for directory_listing_views
CREATE POLICY "Anyone can insert views" ON directory_listing_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read their own view history" ON directory_listing_views
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all views" ON directory_listing_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_directory_listings_updated_at 
  BEFORE UPDATE ON directory_listings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_directory_reviews_updated_at 
  BEFORE UPDATE ON directory_reviews 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate listing rating
CREATE OR REPLACE FUNCTION update_listing_rating(listing_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_rating DECIMAL(3,2);
  review_count INTEGER;
BEGIN
  SELECT 
    COALESCE(AVG(rating), 0)::DECIMAL(3,2),
    COUNT(*)
  INTO avg_rating, review_count
  FROM directory_reviews 
  WHERE directory_reviews.listing_id = listing_id 
    AND status = 'approved';
  
  UPDATE directory_listings 
  SET 
    rating = avg_rating,
    review_count = review_count
  WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update rating when reviews are added/updated
CREATE OR REPLACE FUNCTION trigger_update_listing_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_listing_rating(NEW.listing_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_listing_rating(OLD.listing_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_directory_review_rating_update
  AFTER INSERT OR UPDATE OR DELETE ON directory_reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_update_listing_rating();

-- Function to record listing view
CREATE OR REPLACE FUNCTION record_listing_view(
  p_listing_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer VARCHAR(500) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert view record
  INSERT INTO directory_listing_views (
    listing_id, user_id, ip_address, user_agent, referrer
  ) VALUES (
    p_listing_id, p_user_id, p_ip_address, p_user_agent, p_referrer
  );
  
  -- Update views count
  UPDATE directory_listings 
  SET views_count = views_count + 1 
  WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get directory statistics
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
    (SELECT COUNT(*) FROM directory_reviews WHERE status = 'approved') as total_reviews,
    (SELECT COALESCE(AVG(rating), 0)::DECIMAL(3,2) FROM directory_listings WHERE status = 'approved') as average_rating
  FROM directory_listings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default categories
INSERT INTO directory_categories (name, slug, description, icon, display_order) VALUES
  ('Amplifiers', 'amplifiers', 'Power amplifiers for car audio systems', 'zap', 10),
  ('Speakers & Subwoofers', 'speakers-subwoofers', 'Speakers, subwoofers, and driver components', 'volume-2', 20),
  ('Head Units & Navigation', 'head-units-navigation', 'Head units, navigation systems, and displays', 'monitor', 30),
  ('Installation Accessories', 'installation-accessories', 'Wiring, mounting, and installation hardware', 'tool', 40),
  ('Sound Deadening', 'sound-deadening', 'Dampening and noise reduction materials', 'shield', 50),
  ('Processors & Crossovers', 'processors-crossovers', 'Signal processors and crossover networks', 'cpu', 60),
  ('Complete Systems', 'complete-systems', 'Full car audio system packages', 'package', 70),
  ('Vintage & Rare', 'vintage-rare', 'Vintage and rare car audio equipment', 'star', 80)
ON CONFLICT (slug) DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON directory_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON directory_listings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON directory_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON directory_favorites TO authenticated;
GRANT SELECT, INSERT ON directory_listing_views TO authenticated;
GRANT EXECUTE ON FUNCTION update_listing_rating TO authenticated;
GRANT EXECUTE ON FUNCTION record_listing_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_directory_stats TO authenticated;

-- Comments for documentation
COMMENT ON TABLE directory_categories IS 'Product categories for directory listings';
COMMENT ON TABLE directory_listings IS 'Main directory listings for retailers, manufacturers, and used equipment';
COMMENT ON TABLE directory_reviews IS 'User reviews and ratings for directory listings';
COMMENT ON TABLE directory_favorites IS 'User favorite listings';
COMMENT ON TABLE directory_listing_views IS 'Analytics tracking for listing views';
COMMENT ON FUNCTION update_listing_rating IS 'Updates the aggregate rating for a listing based on reviews';
COMMENT ON FUNCTION record_listing_view IS 'Records a view event for analytics and updates view count';
COMMENT ON FUNCTION get_directory_stats IS 'Returns aggregate statistics for the directory system'; 