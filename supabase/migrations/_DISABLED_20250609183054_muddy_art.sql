/*
  # Fix Event Geocoding

  1. Improvements
    - Enhance the geocoding function to better handle state abbreviations
    - Add a more robust fallback mechanism for geocoding
    - Fix issues with event pins not showing on the map
  
  2. Changes
    - Update the update_event_geocoding function
    - Add state-based coordinate mapping for fallback geocoding
    - Ensure all events have valid coordinates
*/

-- Create a more robust geocoding function
CREATE OR REPLACE FUNCTION update_event_geocoding()
RETURNS TRIGGER AS $$
DECLARE
  state_coords RECORD;
BEGIN
  -- Only update coordinates if they're not already set or if address changed
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL OR 
     (TG_OP = 'UPDATE' AND (
       OLD.address != NEW.address OR 
       OLD.city != NEW.city OR 
       OLD.state != NEW.state OR 
       OLD.country != NEW.country
     ))
  THEN
    -- In a real implementation, this would call a geocoding API
    -- For now, we'll use state-based mapping for approximate coordinates
    
    -- Get coordinates for the state
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
      ('WY', 42.9957, -107.5512)
    ) AS states(state_code, lat, lng)
    WHERE states.state_code = UPPER(NEW.state);
    
    -- Set coordinates based on state
    IF state_coords IS NOT NULL THEN
      NEW.latitude := state_coords.lat;
      NEW.longitude := state_coords.lng;
    ELSE
      -- Default to center of US if state not recognized
      NEW.latitude := 39.8283;
      NEW.longitude := -98.5795;
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
      'state_level',
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

-- Update existing events that might be missing coordinates
UPDATE events e
SET 
  latitude = CASE
    WHEN state = 'AL' THEN 32.7794
    WHEN state = 'AK' THEN 64.0685
    WHEN state = 'AZ' THEN 34.2744
    WHEN state = 'AR' THEN 34.8938
    WHEN state = 'CA' THEN 37.1841
    WHEN state = 'CO' THEN 38.9972
    WHEN state = 'CT' THEN 41.6219
    WHEN state = 'DE' THEN 38.9896
    WHEN state = 'FL' THEN 28.6305
    WHEN state = 'GA' THEN 32.6415
    WHEN state = 'HI' THEN 20.2927
    WHEN state = 'ID' THEN 44.3509
    WHEN state = 'IL' THEN 40.0417
    WHEN state = 'IN' THEN 39.8942
    WHEN state = 'IA' THEN 42.0751
    WHEN state = 'KS' THEN 38.4937
    WHEN state = 'KY' THEN 37.5347
    WHEN state = 'LA' THEN 31.0689
    WHEN state = 'ME' THEN 45.3695
    WHEN state = 'MD' THEN 39.0550
    WHEN state = 'MA' THEN 42.2596
    WHEN state = 'MI' THEN 44.3467
    WHEN state = 'MN' THEN 46.2807
    WHEN state = 'MS' THEN 32.7364
    WHEN state = 'MO' THEN 38.3566
    WHEN state = 'MT' THEN 47.0527
    WHEN state = 'NE' THEN 41.5378
    WHEN state = 'NV' THEN 39.3289
    WHEN state = 'NH' THEN 43.6805
    WHEN state = 'NJ' THEN 40.1907
    WHEN state = 'NM' THEN 34.4071
    WHEN state = 'NY' THEN 42.9538
    WHEN state = 'NC' THEN 35.5557
    WHEN state = 'ND' THEN 47.4501
    WHEN state = 'OH' THEN 40.2862
    WHEN state = 'OK' THEN 35.5889
    WHEN state = 'OR' THEN 43.9336
    WHEN state = 'PA' THEN 40.8781
    WHEN state = 'RI' THEN 41.6762
    WHEN state = 'SC' THEN 33.9169
    WHEN state = 'SD' THEN 44.4443
    WHEN state = 'TN' THEN 35.8580
    WHEN state = 'TX' THEN 31.4757
    WHEN state = 'UT' THEN 39.3055
    WHEN state = 'VT' THEN 44.0687
    WHEN state = 'VA' THEN 37.5215
    WHEN state = 'WA' THEN 47.3826
    WHEN state = 'WV' THEN 38.6409
    WHEN state = 'WI' THEN 44.6243
    WHEN state = 'WY' THEN 42.9957
    ELSE 39.8283
  END,
  longitude = CASE
    WHEN state = 'AL' THEN -86.8287
    WHEN state = 'AK' THEN -152.2782
    WHEN state = 'AZ' THEN -111.6602
    WHEN state = 'AR' THEN -92.4426
    WHEN state = 'CA' THEN -119.4696
    WHEN state = 'CO' THEN -105.5478
    WHEN state = 'CT' THEN -72.7273
    WHEN state = 'DE' THEN -75.5050
    WHEN state = 'FL' THEN -82.4497
    WHEN state = 'GA' THEN -83.4426
    WHEN state = 'HI' THEN -156.3737
    WHEN state = 'ID' THEN -114.6130
    WHEN state = 'IL' THEN -89.1965
    WHEN state = 'IN' THEN -86.2816
    WHEN state = 'IA' THEN -93.4960
    WHEN state = 'KS' THEN -98.3804
    WHEN state = 'KY' THEN -85.3021
    WHEN state = 'LA' THEN -91.9968
    WHEN state = 'ME' THEN -69.2428
    WHEN state = 'MD' THEN -76.7909
    WHEN state = 'MA' THEN -71.8083
    WHEN state = 'MI' THEN -85.4102
    WHEN state = 'MN' THEN -94.3053
    WHEN state = 'MS' THEN -89.6678
    WHEN state = 'MO' THEN -92.4580
    WHEN state = 'MT' THEN -109.6333
    WHEN state = 'NE' THEN -99.7951
    WHEN state = 'NV' THEN -116.6312
    WHEN state = 'NH' THEN -71.5811
    WHEN state = 'NJ' THEN -74.6728
    WHEN state = 'NM' THEN -106.1126
    WHEN state = 'NY' THEN -75.5268
    WHEN state = 'NC' THEN -79.3877
    WHEN state = 'ND' THEN -100.4659
    WHEN state = 'OH' THEN -82.7937
    WHEN state = 'OK' THEN -97.4943
    WHEN state = 'OR' THEN -120.5583
    WHEN state = 'PA' THEN -77.7996
    WHEN state = 'RI' THEN -71.5562
    WHEN state = 'SC' THEN -80.8964
    WHEN state = 'SD' THEN -100.2263
    WHEN state = 'TN' THEN -86.3505
    WHEN state = 'TX' THEN -99.3312
    WHEN state = 'UT' THEN -111.6703
    WHEN state = 'VT' THEN -72.6658
    WHEN state = 'VA' THEN -78.8537
    WHEN state = 'WA' THEN -120.4472
    WHEN state = 'WV' THEN -80.6227
    WHEN state = 'WI' THEN -89.9941
    WHEN state = 'WY' THEN -107.5512
    ELSE -98.5795
  END
WHERE (latitude IS NULL OR longitude IS NULL)
AND address IS NOT NULL
AND city IS NOT NULL
AND state IS NOT NULL;

-- Update event_locations table for any events that don't have a corresponding record
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
  'state_level',
  e.address || ', ' || e.city || ', ' || e.state || ', ' || e.country,
  now()
FROM events e
LEFT JOIN event_locations el ON e.id = el.event_id
WHERE el.id IS NULL
AND e.latitude IS NOT NULL
AND e.longitude IS NOT NULL;