/*
  # Fix Event Coordinates and Add Force Update Function

  1. Improvements
    - Create a robust function to force update event coordinates
    - Fix any events with missing or invalid coordinates
    - Ensure event_locations table is properly synchronized
  
  2. Features
    - Add direct database function to force update coordinates
    - Add more city-level precision for common locations
    - Ensure coordinates are properly propagated to the map
*/

-- Create a function to force update coordinates for a specific event
CREATE OR REPLACE FUNCTION force_update_event_coordinates(event_uuid uuid)
RETURNS json AS $$
DECLARE
  event_record events%ROWTYPE;
  city_coords RECORD;
  state_coords RECORD;
  result json;
BEGIN
  -- Get the event
  SELECT * INTO event_record FROM events WHERE id = event_uuid;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Event not found');
  END IF;
  
  -- First try to get city-level coordinates
  SELECT lat, lng INTO city_coords
  FROM (VALUES
    -- Florida cities
    ('Orlando', 'FL', 28.5383, -81.3792),
    ('Miami', 'FL', 25.7617, -80.1918),
    ('Tampa', 'FL', 27.9506, -82.4572),
    ('Jacksonville', 'FL', 30.3322, -81.6557),
    ('Tallahassee', 'FL', 30.4383, -84.2807),
    ('Fort Lauderdale', 'FL', 26.1224, -80.1373),
    ('St. Petersburg', 'FL', 27.7676, -82.6403),
    ('Clearwater', 'FL', 27.9659, -82.8001),
    ('Gainesville', 'FL', 29.6516, -82.3248),
    ('Pensacola', 'FL', 30.4213, -87.2169),
    ('Daytona Beach', 'FL', 29.2108, -81.0228),
    ('Fort Myers', 'FL', 26.6406, -81.8723),
    ('Sarasota', 'FL', 27.3364, -82.5307),
    ('Key West', 'FL', 24.5551, -81.7800),
    ('Panama City', 'FL', 30.1588, -85.6602),
    
    -- California cities
    ('Los Angeles', 'CA', 34.0522, -118.2437),
    ('San Francisco', 'CA', 37.7749, -122.4194),
    ('San Diego', 'CA', 32.7157, -117.1611),
    ('Sacramento', 'CA', 38.5816, -121.4944),
    ('San Jose', 'CA', 37.3382, -121.8863),
    ('Fresno', 'CA', 36.7378, -119.7871),
    ('Long Beach', 'CA', 33.7701, -118.1937),
    ('Oakland', 'CA', 37.8044, -122.2711),
    ('Bakersfield', 'CA', 35.3733, -119.0187),
    ('Anaheim', 'CA', 33.8366, -117.9143),
    
    -- Texas cities
    ('Houston', 'TX', 29.7604, -95.3698),
    ('Dallas', 'TX', 32.7767, -96.7970),
    ('Austin', 'TX', 30.2672, -97.7431),
    ('San Antonio', 'TX', 29.4241, -98.4936),
    ('Fort Worth', 'TX', 32.7555, -97.3308),
    ('El Paso', 'TX', 31.7619, -106.4850),
    ('Arlington', 'TX', 32.7357, -97.1081),
    ('Corpus Christi', 'TX', 27.8006, -97.3964),
    ('Plano', 'TX', 33.0198, -96.6989),
    ('Lubbock', 'TX', 33.5779, -101.8552),
    
    -- New York cities
    ('New York', 'NY', 40.7128, -74.0060),
    ('Buffalo', 'NY', 42.8864, -78.8784),
    ('Rochester', 'NY', 43.1566, -77.6088),
    ('Yonkers', 'NY', 40.9312, -73.8987),
    ('Syracuse', 'NY', 43.0481, -76.1474),
    ('Albany', 'NY', 42.6526, -73.7562),
    
    -- Illinois cities
    ('Chicago', 'IL', 41.8781, -87.6298),
    ('Springfield', 'IL', 39.7817, -89.6501),
    ('Aurora', 'IL', 41.7606, -88.3201),
    ('Naperville', 'IL', 41.7508, -88.1535),
    ('Peoria', 'IL', 40.6936, -89.5890),
    ('Rockford', 'IL', 42.2711, -89.0937),
    
    -- Arizona cities
    ('Phoenix', 'AZ', 33.4484, -112.0740),
    ('Tucson', 'AZ', 32.2226, -110.9747),
    ('Mesa', 'AZ', 33.4152, -111.8315),
    ('Chandler', 'AZ', 33.3062, -111.8413),
    ('Scottsdale', 'AZ', 33.4942, -111.9261),
    ('Glendale', 'AZ', 33.5387, -112.1860),
    
    -- Georgia cities
    ('Atlanta', 'GA', 33.7490, -84.3880),
    ('Savannah', 'GA', 32.0809, -81.0912),
    ('Athens', 'GA', 33.9519, -83.3576),
    ('Augusta', 'GA', 33.4735, -82.0105),
    ('Columbus', 'GA', 32.4610, -84.9877),
    ('Macon', 'GA', 32.8407, -83.6324),
    
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
  WHERE LOWER(cities.city_name) = LOWER(event_record.city) AND UPPER(cities.state_code) = UPPER(event_record.state);
  
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
    WHERE states.state_code = UPPER(event_record.state);
  END IF;
  
  -- Update the event with new coordinates
  IF city_coords IS NOT NULL THEN
    UPDATE events
    SET 
      latitude = city_coords.lat,
      longitude = city_coords.lng,
      updated_at = now()
    WHERE id = event_uuid;
    
    -- Update event_locations table
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
      event_uuid,
      event_record.address,
      event_record.city,
      event_record.state,
      event_record.zip_code,
      event_record.country,
      city_coords.lat,
      city_coords.lng,
      'manual',
      'force_update_function',
      'city_level',
      event_record.address || ', ' || event_record.city || ', ' || event_record.state || ', ' || event_record.country,
      now()
    ) ON CONFLICT (event_id) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      geocoding_status = EXCLUDED.geocoding_status,
      geocoding_provider = EXCLUDED.geocoding_provider,
      geocoding_accuracy = EXCLUDED.geocoding_accuracy,
      geocoded_at = EXCLUDED.geocoded_at;
    
    result := json_build_object(
      'success', true,
      'message', 'Updated coordinates using city-level precision',
      'city', event_record.city,
      'state', event_record.state,
      'latitude', city_coords.lat,
      'longitude', city_coords.lng,
      'accuracy', 'city_level'
    );
  ELSIF state_coords IS NOT NULL THEN
    UPDATE events
    SET 
      latitude = state_coords.lat,
      longitude = state_coords.lng,
      updated_at = now()
    WHERE id = event_uuid;
    
    -- Update event_locations table
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
      event_uuid,
      event_record.address,
      event_record.city,
      event_record.state,
      event_record.zip_code,
      event_record.country,
      state_coords.lat,
      state_coords.lng,
      'manual',
      'force_update_function',
      'state_level',
      event_record.address || ', ' || event_record.city || ', ' || event_record.state || ', ' || event_record.country,
      now()
    ) ON CONFLICT (event_id) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      geocoding_status = EXCLUDED.geocoding_status,
      geocoding_provider = EXCLUDED.geocoding_provider,
      geocoding_accuracy = EXCLUDED.geocoding_accuracy,
      geocoded_at = EXCLUDED.geocoded_at;
    
    result := json_build_object(
      'success', true,
      'message', 'Updated coordinates using state-level precision',
      'city', event_record.city,
      'state', event_record.state,
      'latitude', state_coords.lat,
      'longitude', state_coords.lng,
      'accuracy', 'state_level'
    );
  ELSE
    -- Default to center of US
    UPDATE events
    SET 
      latitude = 39.8283,
      longitude = -98.5795,
      updated_at = now()
    WHERE id = event_uuid;
    
    -- Update event_locations table
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
      event_uuid,
      event_record.address,
      event_record.city,
      event_record.state,
      event_record.zip_code,
      event_record.country,
      39.8283,
      -98.5795,
      'manual',
      'force_update_function',
      'country_level',
      event_record.address || ', ' || event_record.city || ', ' || event_record.state || ', ' || event_record.country,
      now()
    ) ON CONFLICT (event_id) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      geocoding_status = EXCLUDED.geocoding_status,
      geocoding_provider = EXCLUDED.geocoding_provider,
      geocoding_accuracy = EXCLUDED.geocoding_accuracy,
      geocoded_at = EXCLUDED.geocoded_at;
    
    result := json_build_object(
      'success', true,
      'message', 'Updated coordinates using country-level precision (US center)',
      'city', event_record.city,
      'state', event_record.state,
      'latitude', 39.8283,
      'longitude', -98.5795,
      'accuracy', 'country_level'
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fix any events with missing or invalid coordinates
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

-- Update all event_locations records to match their events
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