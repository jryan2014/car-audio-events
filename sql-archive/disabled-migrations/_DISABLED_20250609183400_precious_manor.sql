/*
  # Fix Event Geocoding and Map Pin Placement

  1. Enhanced Geocoding
    - Improved geocoding function with precise state coordinates
    - Added city-level geocoding for major cities
    - Fixed issues with null or invalid coordinates
  
  2. Data Cleanup
    - Updates existing events with proper coordinates
    - Ensures all events have corresponding event_locations records
    - Fixes any events with (0,0) coordinates
  
  3. Performance
    - Added indexes for faster coordinate lookups
    - Optimized geocoding trigger function
*/

-- Create a more robust geocoding function with city-level precision
CREATE OR REPLACE FUNCTION update_event_geocoding()
RETURNS TRIGGER AS $$
DECLARE
  city_coords RECORD;
  state_coords RECORD;
BEGIN
  -- Only update coordinates if they're not already set or if address changed
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL OR NEW.latitude = 0 OR NEW.longitude = 0 OR
     (TG_OP = 'UPDATE' AND (
       OLD.address != NEW.address OR 
       OLD.city != NEW.city OR 
       OLD.state != NEW.state OR 
       OLD.country != NEW.country
     ))
  THEN
    -- First try to get city-level coordinates for major cities
    SELECT lat, lng INTO city_coords
    FROM (VALUES
      -- Florida cities
      ('Orlando', 'FL', 28.5383, -81.3792),
      ('Miami', 'FL', 25.7617, -80.1918),
      ('Tampa', 'FL', 27.9506, -82.4572),
      ('Jacksonville', 'FL', 30.3322, -81.6557),
      
      -- California cities
      ('Los Angeles', 'CA', 34.0522, -118.2437),
      ('San Francisco', 'CA', 37.7749, -122.4194),
      ('San Diego', 'CA', 32.7157, -117.1611),
      ('Sacramento', 'CA', 38.5816, -121.4944),
      
      -- Texas cities
      ('Houston', 'TX', 29.7604, -95.3698),
      ('Dallas', 'TX', 32.7767, -96.7970),
      ('Austin', 'TX', 30.2672, -97.7431),
      ('San Antonio', 'TX', 29.4241, -98.4936),
      
      -- New York cities
      ('New York', 'NY', 40.7128, -74.0060),
      ('Buffalo', 'NY', 42.8864, -78.8784),
      ('Rochester', 'NY', 43.1566, -77.6088),
      
      -- Illinois cities
      ('Chicago', 'IL', 41.8781, -87.6298),
      ('Springfield', 'IL', 39.7817, -89.6501),
      
      -- Arizona cities
      ('Phoenix', 'AZ', 33.4484, -112.0740),
      ('Tucson', 'AZ', 32.2226, -110.9747),
      
      -- Georgia cities
      ('Atlanta', 'GA', 33.7490, -84.3880),
      ('Savannah', 'GA', 32.0809, -81.0912),
      
      -- Other major cities
      ('Las Vegas', 'NV', 36.1699, -115.1398),
      ('Denver', 'CO', 39.7392, -104.9903),
      ('Seattle', 'WA', 47.6062, -122.3321),
      ('Portland', 'OR', 45.5051, -122.6750),
      ('Boston', 'MA', 42.3601, -71.0589),
      ('Philadelphia', 'PA', 39.9526, -75.1652),
      ('Washington', 'DC', 38.9072, -77.0369),
      ('Nashville', 'TN', 36.1627, -86.7816),
      ('New Orleans', 'LA', 29.9511, -90.0715),
      ('Detroit', 'MI', 42.3314, -83.0458),
      ('Minneapolis', 'MN', 44.9778, -93.2650)
    ) AS cities(city_name, state_code, lat, lng)
    WHERE LOWER(cities.city_name) = LOWER(NEW.city) AND UPPER(cities.state_code) = UPPER(NEW.state);
    
    -- If city not found, fall back to state-level coordinates
    IF city_coords IS NULL THEN
      SELECT lat, lng INTO state_coords
      FROM (VALUES
        ('AL', 32.7794, -86.8287),
        ('AK', 64.0685, -152.2782),
        ('AZ', 34.2744, -111.6602),
        ('AR', 34.8938, -92.4426),
        ('CA', 37.1841, -119.4696),
        ('CO', 38.9972, -105.5478),
        ('CT', 41.6219, -72.7273),
        ('DE', 38.9896, -75.5050),
        ('FL', 28.6305, -82.4497),
        ('GA', 32.6415, -83.4426),
        ('HI', 20.2927, -156.3737),
        ('ID', 44.3509, -114.6130),
        ('IL', 40.0417, -89.1965),
        ('IN', 39.8942, -86.2816),
        ('IA', 42.0751, -93.4960),
        ('KS', 38.4937, -98.3804),
        ('KY', 37.5347, -85.3021),
        ('LA', 31.0689, -91.9968),
        ('ME', 45.3695, -69.2428),
        ('MD', 39.0550, -76.7909),
        ('MA', 42.2596, -71.8083),
        ('MI', 44.3467, -85.4102),
        ('MN', 46.2807, -94.3053),
        ('MS', 32.7364, -89.6678),
        ('MO', 38.3566, -92.4580),
        ('MT', 47.0527, -109.6333),
        ('NE', 41.5378, -99.7951),
        ('NV', 39.3289, -116.6312),
        ('NH', 43.6805, -71.5811),
        ('NJ', 40.1907, -74.6728),
        ('NM', 34.4071, -106.1126),
        ('NY', 42.9538, -75.5268),
        ('NC', 35.5557, -79.3877),
        ('ND', 47.4501, -100.4659),
        ('OH', 40.2862, -82.7937),
        ('OK', 35.5889, -97.4943),
        ('OR', 43.9336, -120.5583),
        ('PA', 40.8781, -77.7996),
        ('RI', 41.6762, -71.5562),
        ('SC', 33.9169, -80.8964),
        ('SD', 44.4443, -100.2263),
        ('TN', 35.8580, -86.3505),
        ('TX', 31.4757, -99.3312),
        ('UT', 39.3055, -111.6703),
        ('VT', 44.0687, -72.6658),
        ('VA', 37.5215, -78.8537),
        ('WA', 47.3826, -120.4472),
        ('WV', 38.6409, -80.6227),
        ('WI', 44.6243, -89.9941),
        ('WY', 42.9957, -107.5512),
        ('DC', 38.9072, -77.0369)
      ) AS states(state_code, lat, lng)
      WHERE states.state_code = UPPER(NEW.state);
    END IF;
    
    -- Set coordinates based on city or state lookup
    IF city_coords IS NOT NULL THEN
      NEW.latitude := city_coords.lat;
      NEW.longitude := city_coords.lng;
      
      RAISE NOTICE 'Using city-level coordinates for %: %, %', NEW.city, city_coords.lat, city_coords.lng;
    ELSIF state_coords IS NOT NULL THEN
      NEW.latitude := state_coords.lat;
      NEW.longitude := state_coords.lng;
      
      RAISE NOTICE 'Using state-level coordinates for %: %, %', NEW.state, state_coords.lat, state_coords.lng;
    ELSE
      -- Default to center of US if state not recognized
      NEW.latitude := 39.8283;
      NEW.longitude := -98.5795;
      
      RAISE NOTICE 'Using default US coordinates: 39.8283, -98.5795';
    END IF;
    
    -- Log the geocoding operation
    INSERT INTO event_locations (
      event_id,
      raw_address,
      city,
      state,
      zip_code,
      country,
      latitude,
      longitude,
      geocoding_status,
      geocoding_provider,
      geocoding_accuracy,
      formatted_address,
      geocoded_at
    ) VALUES (
      NEW.id,
      NEW.address,
      NEW.city,
      NEW.state,
      NEW.zip_code,
      NEW.country,
      NEW.latitude,
      NEW.longitude,
      'manual',
      'database_function',
      CASE 
        WHEN city_coords IS NOT NULL THEN 'city_level'
        WHEN state_coords IS NOT NULL THEN 'state_level'
        ELSE 'country_level'
      END,
      NEW.address || ', ' || NEW.city || ', ' || NEW.state || ', ' || NEW.country,
      now()
    ) ON CONFLICT (event_id) DO UPDATE SET
      raw_address = EXCLUDED.raw_address,
      city = EXCLUDED.city,
      state = EXCLUDED.state,
      zip_code = EXCLUDED.zip_code,
      country = EXCLUDED.country,
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      geocoding_status = EXCLUDED.geocoding_status,
      geocoding_accuracy = EXCLUDED.geocoding_accuracy,
      formatted_address = EXCLUDED.formatted_address,
      geocoded_at = EXCLUDED.geocoded_at;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure the trigger is properly set up
DROP TRIGGER IF EXISTS geocode_event_location ON events;
CREATE TRIGGER geocode_event_location
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  WHEN (NEW.address IS NOT NULL AND NEW.city IS NOT NULL)
  EXECUTE FUNCTION update_event_geocoding();

-- Update existing events with invalid or missing coordinates
UPDATE events e
SET 
  latitude = CASE
    -- Florida cities
    WHEN LOWER(city) = 'orlando' AND UPPER(state) = 'FL' THEN 28.5383
    WHEN LOWER(city) = 'miami' AND UPPER(state) = 'FL' THEN 25.7617
    WHEN LOWER(city) = 'tampa' AND UPPER(state) = 'FL' THEN 27.9506
    WHEN LOWER(city) = 'jacksonville' AND UPPER(state) = 'FL' THEN 30.3322
    
    -- California cities
    WHEN LOWER(city) = 'los angeles' AND UPPER(state) = 'CA' THEN 34.0522
    WHEN LOWER(city) = 'san francisco' AND UPPER(state) = 'CA' THEN 37.7749
    WHEN LOWER(city) = 'san diego' AND UPPER(state) = 'CA' THEN 32.7157
    WHEN LOWER(city) = 'sacramento' AND UPPER(state) = 'CA' THEN 38.5816
    
    -- Texas cities
    WHEN LOWER(city) = 'houston' AND UPPER(state) = 'TX' THEN 29.7604
    WHEN LOWER(city) = 'dallas' AND UPPER(state) = 'TX' THEN 32.7767
    WHEN LOWER(city) = 'austin' AND UPPER(state) = 'TX' THEN 30.2672
    WHEN LOWER(city) = 'san antonio' AND UPPER(state) = 'TX' THEN 29.4241
    
    -- New York cities
    WHEN LOWER(city) = 'new york' AND UPPER(state) = 'NY' THEN 40.7128
    WHEN LOWER(city) = 'buffalo' AND UPPER(state) = 'NY' THEN 42.8864
    WHEN LOWER(city) = 'rochester' AND UPPER(state) = 'NY' THEN 43.1566
    
    -- Illinois cities
    WHEN LOWER(city) = 'chicago' AND UPPER(state) = 'IL' THEN 41.8781
    WHEN LOWER(city) = 'springfield' AND UPPER(state) = 'IL' THEN 39.7817
    
    -- Arizona cities
    WHEN LOWER(city) = 'phoenix' AND UPPER(state) = 'AZ' THEN 33.4484
    WHEN LOWER(city) = 'tucson' AND UPPER(state) = 'AZ' THEN 32.2226
    
    -- Georgia cities
    WHEN LOWER(city) = 'atlanta' AND UPPER(state) = 'GA' THEN 33.7490
    WHEN LOWER(city) = 'savannah' AND UPPER(state) = 'GA' THEN 32.0809
    
    -- Other major cities
    WHEN LOWER(city) = 'las vegas' AND UPPER(state) = 'NV' THEN 36.1699
    WHEN LOWER(city) = 'denver' AND UPPER(state) = 'CO' THEN 39.7392
    WHEN LOWER(city) = 'seattle' AND UPPER(state) = 'WA' THEN 47.6062
    WHEN LOWER(city) = 'portland' AND UPPER(state) = 'OR' THEN 45.5051
    WHEN LOWER(city) = 'boston' AND UPPER(state) = 'MA' THEN 42.3601
    WHEN LOWER(city) = 'philadelphia' AND UPPER(state) = 'PA' THEN 39.9526
    WHEN LOWER(city) = 'washington' AND UPPER(state) = 'DC' THEN 38.9072
    WHEN LOWER(city) = 'nashville' AND UPPER(state) = 'TN' THEN 36.1627
    WHEN LOWER(city) = 'new orleans' AND UPPER(state) = 'LA' THEN 29.9511
    WHEN LOWER(city) = 'detroit' AND UPPER(state) = 'MI' THEN 42.3314
    WHEN LOWER(city) = 'minneapolis' AND UPPER(state) = 'MN' THEN 44.9778
    
    -- State fallbacks
    WHEN UPPER(state) = 'AL' THEN 32.7794
    WHEN UPPER(state) = 'AK' THEN 64.0685
    WHEN UPPER(state) = 'AZ' THEN 34.2744
    WHEN UPPER(state) = 'AR' THEN 34.8938
    WHEN UPPER(state) = 'CA' THEN 37.1841
    WHEN UPPER(state) = 'CO' THEN 38.9972
    WHEN UPPER(state) = 'CT' THEN 41.6219
    WHEN UPPER(state) = 'DE' THEN 38.9896
    WHEN UPPER(state) = 'FL' THEN 28.6305
    WHEN UPPER(state) = 'GA' THEN 32.6415
    WHEN UPPER(state) = 'HI' THEN 20.2927
    WHEN UPPER(state) = 'ID' THEN 44.3509
    WHEN UPPER(state) = 'IL' THEN 40.0417
    WHEN UPPER(state) = 'IN' THEN 39.8942
    WHEN UPPER(state) = 'IA' THEN 42.0751
    WHEN UPPER(state) = 'KS' THEN 38.4937
    WHEN UPPER(state) = 'KY' THEN 37.5347
    WHEN UPPER(state) = 'LA' THEN 31.0689
    WHEN UPPER(state) = 'ME' THEN 45.3695
    WHEN UPPER(state) = 'MD' THEN 39.0550
    WHEN UPPER(state) = 'MA' THEN 42.2596
    WHEN UPPER(state) = 'MI' THEN 44.3467
    WHEN UPPER(state) = 'MN' THEN 46.2807
    WHEN UPPER(state) = 'MS' THEN 32.7364
    WHEN UPPER(state) = 'MO' THEN 38.3566
    WHEN UPPER(state) = 'MT' THEN 47.0527
    WHEN UPPER(state) = 'NE' THEN 41.5378
    WHEN UPPER(state) = 'NV' THEN 39.3289
    WHEN UPPER(state) = 'NH' THEN 43.6805
    WHEN UPPER(state) = 'NJ' THEN 40.1907
    WHEN UPPER(state) = 'NM' THEN 34.4071
    WHEN UPPER(state) = 'NY' THEN 42.9538
    WHEN UPPER(state) = 'NC' THEN 35.5557
    WHEN UPPER(state) = 'ND' THEN 47.4501
    WHEN UPPER(state) = 'OH' THEN 40.2862
    WHEN UPPER(state) = 'OK' THEN 35.5889
    WHEN UPPER(state) = 'OR' THEN 43.9336
    WHEN UPPER(state) = 'PA' THEN 40.8781
    WHEN UPPER(state) = 'RI' THEN 41.6762
    WHEN UPPER(state) = 'SC' THEN 33.9169
    WHEN UPPER(state) = 'SD' THEN 44.4443
    WHEN UPPER(state) = 'TN' THEN 35.8580
    WHEN UPPER(state) = 'TX' THEN 31.4757
    WHEN UPPER(state) = 'UT' THEN 39.3055
    WHEN UPPER(state) = 'VT' THEN 44.0687
    WHEN UPPER(state) = 'VA' THEN 37.5215
    WHEN UPPER(state) = 'WA' THEN 47.3826
    WHEN UPPER(state) = 'WV' THEN 38.6409
    WHEN UPPER(state) = 'WI' THEN 44.6243
    WHEN UPPER(state) = 'WY' THEN 42.9957
    WHEN UPPER(state) = 'DC' THEN 38.9072
    ELSE 39.8283
  END,
  longitude = CASE
    -- Florida cities
    WHEN LOWER(city) = 'orlando' AND UPPER(state) = 'FL' THEN -81.3792
    WHEN LOWER(city) = 'miami' AND UPPER(state) = 'FL' THEN -80.1918
    WHEN LOWER(city) = 'tampa' AND UPPER(state) = 'FL' THEN -82.4572
    WHEN LOWER(city) = 'jacksonville' AND UPPER(state) = 'FL' THEN -81.6557
    
    -- California cities
    WHEN LOWER(city) = 'los angeles' AND UPPER(state) = 'CA' THEN -118.2437
    WHEN LOWER(city) = 'san francisco' AND UPPER(state) = 'CA' THEN -122.4194
    WHEN LOWER(city) = 'san diego' AND UPPER(state) = 'CA' THEN -117.1611
    WHEN LOWER(city) = 'sacramento' AND UPPER(state) = 'CA' THEN -121.4944
    
    -- Texas cities
    WHEN LOWER(city) = 'houston' AND UPPER(state) = 'TX' THEN -95.3698
    WHEN LOWER(city) = 'dallas' AND UPPER(state) = 'TX' THEN -96.7970
    WHEN LOWER(city) = 'austin' AND UPPER(state) = 'TX' THEN -97.7431
    WHEN LOWER(city) = 'san antonio' AND UPPER(state) = 'TX' THEN -98.4936
    
    -- New York cities
    WHEN LOWER(city) = 'new york' AND UPPER(state) = 'NY' THEN -74.0060
    WHEN LOWER(city) = 'buffalo' AND UPPER(state) = 'NY' THEN -78.8784
    WHEN LOWER(city) = 'rochester' AND UPPER(state) = 'NY' THEN -77.6088
    
    -- Illinois cities
    WHEN LOWER(city) = 'chicago' AND UPPER(state) = 'IL' THEN -87.6298
    WHEN LOWER(city) = 'springfield' AND UPPER(state) = 'IL' THEN -89.6501
    
    -- Arizona cities
    WHEN LOWER(city) = 'phoenix' AND UPPER(state) = 'AZ' THEN -112.0740
    WHEN LOWER(city) = 'tucson' AND UPPER(state) = 'AZ' THEN -110.9747
    
    -- Georgia cities
    WHEN LOWER(city) = 'atlanta' AND UPPER(state) = 'GA' THEN -84.3880
    WHEN LOWER(city) = 'savannah' AND UPPER(state) = 'GA' THEN -81.0912
    
    -- Other major cities
    WHEN LOWER(city) = 'las vegas' AND UPPER(state) = 'NV' THEN -115.1398
    WHEN LOWER(city) = 'denver' AND UPPER(state) = 'CO' THEN -104.9903
    WHEN LOWER(city) = 'seattle' AND UPPER(state) = 'WA' THEN -122.3321
    WHEN LOWER(city) = 'portland' AND UPPER(state) = 'OR' THEN -122.6750
    WHEN LOWER(city) = 'boston' AND UPPER(state) = 'MA' THEN -71.0589
    WHEN LOWER(city) = 'philadelphia' AND UPPER(state) = 'PA' THEN -75.1652
    WHEN LOWER(city) = 'washington' AND UPPER(state) = 'DC' THEN -77.0369
    WHEN LOWER(city) = 'nashville' AND UPPER(state) = 'TN' THEN -86.7816
    WHEN LOWER(city) = 'new orleans' AND UPPER(state) = 'LA' THEN -90.0715
    WHEN LOWER(city) = 'detroit' AND UPPER(state) = 'MI' THEN -83.0458
    WHEN LOWER(city) = 'minneapolis' AND UPPER(state) = 'MN' THEN -93.2650
    
    -- State fallbacks
    WHEN UPPER(state) = 'AL' THEN -86.8287
    WHEN UPPER(state) = 'AK' THEN -152.2782
    WHEN UPPER(state) = 'AZ' THEN -111.6602
    WHEN UPPER(state) = 'AR' THEN -92.4426
    WHEN UPPER(state) = 'CA' THEN -119.4696
    WHEN UPPER(state) = 'CO' THEN -105.5478
    WHEN UPPER(state) = 'CT' THEN -72.7273
    WHEN UPPER(state) = 'DE' THEN -75.5050
    WHEN UPPER(state) = 'FL' THEN -82.4497
    WHEN UPPER(state) = 'GA' THEN -83.4426
    WHEN UPPER(state) = 'HI' THEN -156.3737
    WHEN UPPER(state) = 'ID' THEN -114.6130
    WHEN UPPER(state) = 'IL' THEN -89.1965
    WHEN UPPER(state) = 'IN' THEN -86.2816
    WHEN UPPER(state) = 'IA' THEN -93.4960
    WHEN UPPER(state) = 'KS' THEN -98.3804
    WHEN UPPER(state) = 'KY' THEN -85.3021
    WHEN UPPER(state) = 'LA' THEN -91.9968
    WHEN UPPER(state) = 'ME' THEN -69.2428
    WHEN UPPER(state) = 'MD' THEN -76.7909
    WHEN UPPER(state) = 'MA' THEN -71.8083
    WHEN UPPER(state) = 'MI' THEN -85.4102
    WHEN UPPER(state) = 'MN' THEN -94.3053
    WHEN UPPER(state) = 'MS' THEN -89.6678
    WHEN UPPER(state) = 'MO' THEN -92.4580
    WHEN UPPER(state) = 'MT' THEN -109.6333
    WHEN UPPER(state) = 'NE' THEN -99.7951
    WHEN UPPER(state) = 'NV' THEN -116.6312
    WHEN UPPER(state) = 'NH' THEN -71.5811
    WHEN UPPER(state) = 'NJ' THEN -74.6728
    WHEN UPPER(state) = 'NM' THEN -106.1126
    WHEN UPPER(state) = 'NY' THEN -75.5268
    WHEN UPPER(state) = 'NC' THEN -79.3877
    WHEN UPPER(state) = 'ND' THEN -100.4659
    WHEN UPPER(state) = 'OH' THEN -82.7937
    WHEN UPPER(state) = 'OK' THEN -97.4943
    WHEN UPPER(state) = 'OR' THEN -120.5583
    WHEN UPPER(state) = 'PA' THEN -77.7996
    WHEN UPPER(state) = 'RI' THEN -71.5562
    WHEN UPPER(state) = 'SC' THEN -80.8964
    WHEN UPPER(state) = 'SD' THEN -100.2263
    WHEN UPPER(state) = 'TN' THEN -86.3505
    WHEN UPPER(state) = 'TX' THEN -99.3312
    WHEN UPPER(state) = 'UT' THEN -111.6703
    WHEN UPPER(state) = 'VT' THEN -72.6658
    WHEN UPPER(state) = 'VA' THEN -78.8537
    WHEN UPPER(state) = 'WA' THEN -120.4472
    WHEN UPPER(state) = 'WV' THEN -80.6227
    WHEN UPPER(state) = 'WI' THEN -89.9941
    WHEN UPPER(state) = 'WY' THEN -107.5512
    WHEN UPPER(state) = 'DC' THEN -77.0369
    ELSE -98.5795
  END
WHERE (latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0)
AND address IS NOT NULL
AND city IS NOT NULL
AND state IS NOT NULL;

-- Ensure all events have corresponding event_locations records
INSERT INTO event_locations (
  event_id,
  raw_address,
  city,
  state,
  zip_code,
  country,
  latitude,
  longitude,
  geocoding_status,
  geocoding_provider,
  geocoding_accuracy,
  formatted_address,
  geocoded_at
)
SELECT 
  e.id,
  e.address,
  e.city,
  e.state,
  e.zip_code,
  e.country,
  e.latitude,
  e.longitude,
  'manual',
  'database_migration',
  CASE 
    WHEN LOWER(e.city) IN ('orlando', 'miami', 'tampa', 'jacksonville', 'los angeles', 'san francisco', 
                          'san diego', 'sacramento', 'houston', 'dallas', 'austin', 'san antonio', 
                          'new york', 'buffalo', 'rochester', 'chicago', 'springfield', 'phoenix', 
                          'tucson', 'atlanta', 'savannah', 'las vegas', 'denver', 'seattle', 
                          'portland', 'boston', 'philadelphia', 'washington', 'nashville', 
                          'new orleans', 'detroit', 'minneapolis') THEN 'city_level'
    ELSE 'state_level'
  END,
  e.address || ', ' || e.city || ', ' || e.state || ', ' || e.country,
  now()
FROM events e
LEFT JOIN event_locations el ON e.id = el.event_id
WHERE el.id IS NULL
AND e.latitude IS NOT NULL
AND e.longitude IS NOT NULL;

-- Update any event_locations records with invalid coordinates
UPDATE event_locations el
SET
  latitude = e.latitude,
  longitude = e.longitude,
  geocoding_status = 'manual',
  geocoding_provider = 'database_migration',
  geocoded_at = now()
FROM events e
WHERE el.event_id = e.id
AND (el.latitude IS NULL OR el.longitude IS NULL OR el.latitude = 0 OR el.longitude = 0)
AND e.latitude IS NOT NULL
AND e.longitude IS NOT NULL
AND e.latitude != 0
AND e.longitude != 0;

-- Add index for faster coordinate lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_events_valid_coordinates ON events (id)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND latitude != 0 AND longitude != 0;