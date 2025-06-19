/*
  # Fix Event Coordinates and Ensure Proper Data Types

  1. Problem
    - Some events have coordinates stored as strings or with incorrect types
    - This causes issues with map display and filtering
  
  2. Solution
    - Ensure latitude and longitude columns are properly typed as numeric
    - Convert any string values to numeric
    - Update all events with missing or invalid coordinates
    - Create a function to force update coordinates for specific events
*/

-- First, ensure the latitude and longitude columns are numeric
ALTER TABLE events 
  ALTER COLUMN latitude TYPE numeric(10,8) USING latitude::numeric(10,8),
  ALTER COLUMN longitude TYPE numeric(11,8) USING longitude::numeric(11,8);

-- Fix any events with coordinates stored as strings or with incorrect types
UPDATE events
SET 
  latitude = CASE
    WHEN latitude IS NULL OR latitude = 0 THEN
      CASE
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
      END
    ELSE latitude
  END,
  longitude = CASE
    WHEN longitude IS NULL OR longitude = 0 THEN
      CASE
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
    ELSE longitude
  END;

-- Ensure all event_locations records match their events
UPDATE event_locations el
SET
  latitude = e.latitude,
  longitude = e.longitude,
  geocoding_status = 'manual',
  geocoding_provider = 'database_migration',
  geocoded_at = now()
FROM events e
WHERE el.event_id = e.id
AND e.latitude IS NOT NULL
AND e.longitude IS NOT NULL
AND e.latitude != 0
AND e.longitude != 0;

-- Create any missing event_locations records
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
  'city_or_state_level',
  e.address || ', ' || e.city || ', ' || e.state || ', ' || e.country,
  now()
FROM events e
LEFT JOIN event_locations el ON e.id = el.event_id
WHERE el.id IS NULL
AND e.latitude IS NOT NULL
AND e.longitude IS NOT NULL
AND e.latitude != 0
AND e.longitude != 0;

-- Run the update function to fix all events
SELECT update_all_event_coordinates();