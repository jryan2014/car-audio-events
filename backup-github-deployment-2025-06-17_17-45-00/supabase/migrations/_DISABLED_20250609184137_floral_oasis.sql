/*
  # Fix Event Geocoding and Map Display

  1. Enhanced Geocoding
    - Improve the geocoding function with more precise city-level coordinates
    - Add additional cities for better coverage
    - Ensure all events have valid coordinates
  
  2. Data Repair
    - Fix any existing events with missing or invalid coordinates
    - Update event_locations table with correct data
    - Add validation to prevent 0,0 coordinates
  
  3. Performance Optimization
    - Add indexes for faster coordinate lookups
    - Improve query performance for map display
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
      ('Santa Ana', 'CA', 33.7455, -117.8677),
      ('Riverside', 'CA', 33.9806, -117.3755),
      ('Stockton', 'CA', 37.9577, -121.2908),
      ('Irvine', 'CA', 33.6846, -117.8265),
      ('Chula Vista', 'CA', 32.6401, -117.0842),
      
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
      ('Laredo', 'TX', 27.5306, -99.4803),
      ('Irving', 'TX', 32.8140, -96.9489),
      ('Amarillo', 'TX', 35.2220, -101.8313),
      ('Brownsville', 'TX', 25.9017, -97.4975),
      ('Grand Prairie', 'TX', 32.7459, -96.9978),
      
      -- New York cities
      ('New York', 'NY', 40.7128, -74.0060),
      ('Buffalo', 'NY', 42.8864, -78.8784),
      ('Rochester', 'NY', 43.1566, -77.6088),
      ('Yonkers', 'NY', 40.9312, -73.8987),
      ('Syracuse', 'NY', 43.0481, -76.1474),
      ('Albany', 'NY', 42.6526, -73.7562),
      ('New Rochelle', 'NY', 40.9115, -73.7826),
      ('Mount Vernon', 'NY', 40.9126, -73.8370),
      ('Schenectady', 'NY', 42.8142, -73.9396),
      ('Utica', 'NY', 43.1009, -75.2327),
      ('Binghamton', 'NY', 42.0987, -75.9180),
      ('Troy', 'NY', 42.7284, -73.6918),
      ('Niagara Falls', 'NY', 43.0962, -79.0377),
      
      -- Illinois cities
      ('Chicago', 'IL', 41.8781, -87.6298),
      ('Springfield', 'IL', 39.7817, -89.6501),
      ('Aurora', 'IL', 41.7606, -88.3201),
      ('Naperville', 'IL', 41.7508, -88.1535),
      ('Peoria', 'IL', 40.6936, -89.5890),
      ('Rockford', 'IL', 42.2711, -89.0937),
      ('Joliet', 'IL', 41.5250, -88.0817),
      ('Elgin', 'IL', 42.0354, -88.2825),
      ('Waukegan', 'IL', 42.3636, -87.8447),
      ('Cicero', 'IL', 41.8456, -87.7539),
      ('Champaign', 'IL', 40.1164, -88.2434),
      ('Bloomington', 'IL', 40.4842, -88.9937),
      ('Decatur', 'IL', 39.8403, -88.9548),
      
      -- Arizona cities
      ('Phoenix', 'AZ', 33.4484, -112.0740),
      ('Tucson', 'AZ', 32.2226, -110.9747),
      ('Mesa', 'AZ', 33.4152, -111.8315),
      ('Chandler', 'AZ', 33.3062, -111.8413),
      ('Scottsdale', 'AZ', 33.4942, -111.9261),
      ('Glendale', 'AZ', 33.5387, -112.1860),
      ('Tempe', 'AZ', 33.4255, -111.9400),
      ('Peoria', 'AZ', 33.5806, -112.2374),
      ('Surprise', 'AZ', 33.6292, -112.3680),
      ('Yuma', 'AZ', 32.6927, -114.6277),
      ('Flagstaff', 'AZ', 35.1983, -111.6513),
      ('Prescott', 'AZ', 34.5400, -112.4685),
      ('Sedona', 'AZ', 34.8697, -111.7610),
      
      -- Georgia cities
      ('Atlanta', 'GA', 33.7490, -84.3880),
      ('Savannah', 'GA', 32.0809, -81.0912),
      ('Athens', 'GA', 33.9519, -83.3576),
      ('Augusta', 'GA', 33.4735, -82.0105),
      ('Columbus', 'GA', 32.4610, -84.9877),
      ('Macon', 'GA', 32.8407, -83.6324),
      ('Roswell', 'GA', 34.0232, -84.3616),
      ('Albany', 'GA', 31.5785, -84.1557),
      ('Johns Creek', 'GA', 34.0289, -84.1985),
      ('Warner Robins', 'GA', 32.6211, -83.6241),
      ('Alpharetta', 'GA', 34.0754, -84.2941),
      ('Marietta', 'GA', 33.9526, -84.5499),
      ('Valdosta', 'GA', 30.8327, -83.2785),
      
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
      ('Minneapolis', 'MN', 44.9778, -93.2650),
      ('St. Louis', 'MO', 38.6270, -90.1994),
      ('Kansas City', 'MO', 39.0997, -94.5786),
      ('Omaha', 'NE', 41.2565, -95.9345),
      ('Cleveland', 'OH', 41.4993, -81.6944),
      ('Cincinnati', 'OH', 39.1031, -84.5120),
      ('Pittsburgh', 'PA', 40.4406, -79.9959),
      ('Baltimore', 'MD', 39.2904, -76.6122),
      ('Charlotte', 'NC', 35.2271, -80.8431),
      ('Raleigh', 'NC', 35.7796, -78.6382),
      ('Indianapolis', 'IN', 39.7684, -86.1581),
      ('Louisville', 'KY', 38.2527, -85.7585),
      ('Milwaukee', 'WI', 43.0389, -87.9065),
      ('Oklahoma City', 'OK', 35.4676, -97.5164),
      ('Memphis', 'TN', 35.1495, -90.0490),
      ('Salt Lake City', 'UT', 40.7608, -111.8910),
      ('Honolulu', 'HI', 21.3069, -157.8583),
      ('Anchorage', 'AK', 61.2181, -149.9003),
      ('Boise', 'ID', 43.6150, -116.2023),
      ('Charleston', 'SC', 32.7765, -79.9311),
      ('Richmond', 'VA', 37.5407, -77.4360),
      ('Virginia Beach', 'VA', 36.8529, -75.9780),
      ('Providence', 'RI', 41.8240, -71.4128),
      ('Albuquerque', 'NM', 35.0844, -106.6504),
      ('Birmingham', 'AL', 33.5186, -86.8104),
      ('Jackson', 'MS', 32.2988, -90.1848),
      ('Des Moines', 'IA', 41.5868, -93.6250),
      ('Little Rock', 'AR', 34.7465, -92.2896),
      ('Fargo', 'ND', 46.8772, -96.7898),
      ('Sioux Falls', 'SD', 43.5446, -96.7311),
      ('Billings', 'MT', 45.7833, -108.5007),
      ('Cheyenne', 'WY', 41.1400, -104.8202),
      ('Manchester', 'NH', 42.9956, -71.4548),
      ('Burlington', 'VT', 44.4759, -73.2121),
      ('Wilmington', 'DE', 39.7447, -75.5484),
      ('Bridgeport', 'CT', 41.1792, -73.1894),
      ('Newark', 'NJ', 40.7357, -74.1724)
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
    WHEN LOWER(city) = 'tallahassee' AND UPPER(state) = 'FL' THEN 30.4383
    WHEN LOWER(city) = 'fort lauderdale' AND UPPER(state) = 'FL' THEN 26.1224
    WHEN LOWER(city) = 'st. petersburg' AND UPPER(state) = 'FL' THEN 27.7676
    WHEN LOWER(city) = 'clearwater' AND UPPER(state) = 'FL' THEN 27.9659
    WHEN LOWER(city) = 'gainesville' AND UPPER(state) = 'FL' THEN 29.6516
    WHEN LOWER(city) = 'pensacola' AND UPPER(state) = 'FL' THEN 30.4213
    
    -- California cities
    WHEN LOWER(city) = 'los angeles' AND UPPER(state) = 'CA' THEN 34.0522
    WHEN LOWER(city) = 'san francisco' AND UPPER(state) = 'CA' THEN 37.7749
    WHEN LOWER(city) = 'san diego' AND UPPER(state) = 'CA' THEN 32.7157
    WHEN LOWER(city) = 'sacramento' AND UPPER(state) = 'CA' THEN 38.5816
    WHEN LOWER(city) = 'san jose' AND UPPER(state) = 'CA' THEN 37.3382
    WHEN LOWER(city) = 'fresno' AND UPPER(state) = 'CA' THEN 36.7378
    WHEN LOWER(city) = 'long beach' AND UPPER(state) = 'CA' THEN 33.7701
    WHEN LOWER(city) = 'oakland' AND UPPER(state) = 'CA' THEN 37.8044
    WHEN LOWER(city) = 'bakersfield' AND UPPER(state) = 'CA' THEN 35.3733
    WHEN LOWER(city) = 'anaheim' AND UPPER(state) = 'CA' THEN 33.8366
    
    -- Texas cities
    WHEN LOWER(city) = 'houston' AND UPPER(state) = 'TX' THEN 29.7604
    WHEN LOWER(city) = 'dallas' AND UPPER(state) = 'TX' THEN 32.7767
    WHEN LOWER(city) = 'austin' AND UPPER(state) = 'TX' THEN 30.2672
    WHEN LOWER(city) = 'san antonio' AND UPPER(state) = 'TX' THEN 29.4241
    WHEN LOWER(city) = 'fort worth' AND UPPER(state) = 'TX' THEN 32.7555
    WHEN LOWER(city) = 'el paso' AND UPPER(state) = 'TX' THEN 31.7619
    WHEN LOWER(city) = 'arlington' AND UPPER(state) = 'TX' THEN 32.7357
    WHEN LOWER(city) = 'corpus christi' AND UPPER(state) = 'TX' THEN 27.8006
    WHEN LOWER(city) = 'plano' AND UPPER(state) = 'TX' THEN 33.0198
    WHEN LOWER(city) = 'lubbock' AND UPPER(state) = 'TX' THEN 33.5779
    
    -- New York cities
    WHEN LOWER(city) = 'new york' AND UPPER(state) = 'NY' THEN 40.7128
    WHEN LOWER(city) = 'buffalo' AND UPPER(state) = 'NY' THEN 42.8864
    WHEN LOWER(city) = 'rochester' AND UPPER(state) = 'NY' THEN 43.1566
    WHEN LOWER(city) = 'yonkers' AND UPPER(state) = 'NY' THEN 40.9312
    WHEN LOWER(city) = 'syracuse' AND UPPER(state) = 'NY' THEN 43.0481
    WHEN LOWER(city) = 'albany' AND UPPER(state) = 'NY' THEN 42.6526
    
    -- Illinois cities
    WHEN LOWER(city) = 'chicago' AND UPPER(state) = 'IL' THEN 41.8781
    WHEN LOWER(city) = 'springfield' AND UPPER(state) = 'IL' THEN 39.7817
    WHEN LOWER(city) = 'aurora' AND UPPER(state) = 'IL' THEN 41.7606
    WHEN LOWER(city) = 'naperville' AND UPPER(state) = 'IL' THEN 41.7508
    WHEN LOWER(city) = 'peoria' AND UPPER(state) = 'IL' THEN 40.6936
    WHEN LOWER(city) = 'rockford' AND UPPER(state) = 'IL' THEN 42.2711
    
    -- Arizona cities
    WHEN LOWER(city) = 'phoenix' AND UPPER(state) = 'AZ' THEN 33.4484
    WHEN LOWER(city) = 'tucson' AND UPPER(state) = 'AZ' THEN 32.2226
    WHEN LOWER(city) = 'mesa' AND UPPER(state) = 'AZ' THEN 33.4152
    WHEN LOWER(city) = 'chandler' AND UPPER(state) = 'AZ' THEN 33.3062
    WHEN LOWER(city) = 'scottsdale' AND UPPER(state) = 'AZ' THEN 33.4942
    WHEN LOWER(city) = 'glendale' AND UPPER(state) = 'AZ' THEN 33.5387
    
    -- Georgia cities
    WHEN LOWER(city) = 'atlanta' AND UPPER(state) = 'GA' THEN 33.7490
    WHEN LOWER(city) = 'savannah' AND UPPER(state) = 'GA' THEN 32.0809
    WHEN LOWER(city) = 'athens' AND UPPER(state) = 'GA' THEN 33.9519
    WHEN LOWER(city) = 'augusta' AND UPPER(state) = 'GA' THEN 33.4735
    WHEN LOWER(city) = 'columbus' AND UPPER(state) = 'GA' THEN 32.4610
    WHEN LOWER(city) = 'macon' AND UPPER(state) = 'GA' THEN 32.8407
    
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
    WHEN LOWER(city) = 'tallahassee' AND UPPER(state) = 'FL' THEN -84.2807
    WHEN LOWER(city) = 'fort lauderdale' AND UPPER(state) = 'FL' THEN -80.1373
    WHEN LOWER(city) = 'st. petersburg' AND UPPER(state) = 'FL' THEN -82.6403
    WHEN LOWER(city) = 'clearwater' AND UPPER(state) = 'FL' THEN -82.8001
    WHEN LOWER(city) = 'gainesville' AND UPPER(state) = 'FL' THEN -82.3248
    WHEN LOWER(city) = 'pensacola' AND UPPER(state) = 'FL' THEN -87.2169
    
    -- California cities
    WHEN LOWER(city) = 'los angeles' AND UPPER(state) = 'CA' THEN -118.2437
    WHEN LOWER(city) = 'san francisco' AND UPPER(state) = 'CA' THEN -122.4194
    WHEN LOWER(city) = 'san diego' AND UPPER(state) = 'CA' THEN -117.1611
    WHEN LOWER(city) = 'sacramento' AND UPPER(state) = 'CA' THEN -121.4944
    WHEN LOWER(city) = 'san jose' AND UPPER(state) = 'CA' THEN -121.8863
    WHEN LOWER(city) = 'fresno' AND UPPER(state) = 'CA' THEN -119.7871
    WHEN LOWER(city) = 'long beach' AND UPPER(state) = 'CA' THEN -118.1937
    WHEN LOWER(city) = 'oakland' AND UPPER(state) = 'CA' THEN -122.2711
    WHEN LOWER(city) = 'bakersfield' AND UPPER(state) = 'CA' THEN -119.0187
    WHEN LOWER(city) = 'anaheim' AND UPPER(state) = 'CA' THEN -117.9143
    
    -- Texas cities
    WHEN LOWER(city) = 'houston' AND UPPER(state) = 'TX' THEN -95.3698
    WHEN LOWER(city) = 'dallas' AND UPPER(state) = 'TX' THEN -96.7970
    WHEN LOWER(city) = 'austin' AND UPPER(state) = 'TX' THEN -97.7431
    WHEN LOWER(city) = 'san antonio' AND UPPER(state) = 'TX' THEN -98.4936
    WHEN LOWER(city) = 'fort worth' AND UPPER(state) = 'TX' THEN -97.3308
    WHEN LOWER(city) = 'el paso' AND UPPER(state) = 'TX' THEN -106.4850
    WHEN LOWER(city) = 'arlington' AND UPPER(state) = 'TX' THEN -97.1081
    WHEN LOWER(city) = 'corpus christi' AND UPPER(state) = 'TX' THEN -97.3964
    WHEN LOWER(city) = 'plano' AND UPPER(state) = 'TX' THEN -96.6989
    WHEN LOWER(city) = 'lubbock' AND UPPER(state) = 'TX' THEN -101.8552
    
    -- New York cities
    WHEN LOWER(city) = 'new york' AND UPPER(state) = 'NY' THEN -74.0060
    WHEN LOWER(city) = 'buffalo' AND UPPER(state) = 'NY' THEN -78.8784
    WHEN LOWER(city) = 'rochester' AND UPPER(state) = 'NY' THEN -77.6088
    WHEN LOWER(city) = 'yonkers' AND UPPER(state) = 'NY' THEN -73.8987
    WHEN LOWER(city) = 'syracuse' AND UPPER(state) = 'NY' THEN -76.1474
    WHEN LOWER(city) = 'albany' AND UPPER(state) = 'NY' THEN -73.7562
    
    -- Illinois cities
    WHEN LOWER(city) = 'chicago' AND UPPER(state) = 'IL' THEN -87.6298
    WHEN LOWER(city) = 'springfield' AND UPPER(state) = 'IL' THEN -89.6501
    WHEN LOWER(city) = 'aurora' AND UPPER(state) = 'IL' THEN -88.3201
    WHEN LOWER(city) = 'naperville' AND UPPER(state) = 'IL' THEN -88.1535
    WHEN LOWER(city) = 'peoria' AND UPPER(state) = 'IL' THEN -89.5890
    WHEN LOWER(city) = 'rockford' AND UPPER(state) = 'IL' THEN -89.0937
    
    -- Arizona cities
    WHEN LOWER(city) = 'phoenix' AND UPPER(state) = 'AZ' THEN -112.0740
    WHEN LOWER(city) = 'tucson' AND UPPER(state) = 'AZ' THEN -110.9747
    WHEN LOWER(city) = 'mesa' AND UPPER(state) = 'AZ' THEN -111.8315
    WHEN LOWER(city) = 'chandler' AND UPPER(state) = 'AZ' THEN -111.8413
    WHEN LOWER(city) = 'scottsdale' AND UPPER(state) = 'AZ' THEN -111.9261
    WHEN LOWER(city) = 'glendale' AND UPPER(state) = 'AZ' THEN -112.1860
    
    -- Georgia cities
    WHEN LOWER(city) = 'atlanta' AND UPPER(state) = 'GA' THEN -84.3880
    WHEN LOWER(city) = 'savannah' AND UPPER(state) = 'GA' THEN -81.0912
    WHEN LOWER(city) = 'athens' AND UPPER(state) = 'GA' THEN -83.3576
    WHEN LOWER(city) = 'augusta' AND UPPER(state) = 'GA' THEN -82.0105
    WHEN LOWER(city) = 'columbus' AND UPPER(state) = 'GA' THEN -84.9877
    WHEN LOWER(city) = 'macon' AND UPPER(state) = 'GA' THEN -83.6324
    
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
    WHEN LOWER(e.city) IN (
      'orlando', 'miami', 'tampa', 'jacksonville', 'tallahassee', 'fort lauderdale', 'st. petersburg',
      'los angeles', 'san francisco', 'san diego', 'sacramento', 'san jose', 'fresno', 
      'houston', 'dallas', 'austin', 'san antonio', 'fort worth', 'el paso',
      'new york', 'buffalo', 'rochester', 'yonkers', 'syracuse', 'albany',
      'chicago', 'springfield', 'aurora', 'naperville', 'peoria',
      'phoenix', 'tucson', 'mesa', 'chandler', 'scottsdale',
      'atlanta', 'savannah', 'athens', 'augusta', 'columbus',
      'las vegas', 'denver', 'seattle', 'portland', 'boston', 'philadelphia', 'washington',
      'nashville', 'new orleans', 'detroit', 'minneapolis'
    ) THEN 'city_level'
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
    
    -- Add more cities as needed...
    
    -- Default to a few major cities for other states
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

-- Create a function to update all events with invalid coordinates
CREATE OR REPLACE FUNCTION update_all_event_coordinates()
RETURNS json AS $$
DECLARE
  event_record RECORD;
  updated_count INTEGER := 0;
  failed_count INTEGER := 0;
  result json;
BEGIN
  -- Loop through all events with missing or invalid coordinates
  FOR event_record IN 
    SELECT id, city, state 
    FROM events 
    WHERE (latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0)
    AND city IS NOT NULL 
    AND state IS NOT NULL
  LOOP
    BEGIN
      PERFORM force_update_event_coordinates(event_record.id);
      updated_count := updated_count + 1;
    EXCEPTION WHEN OTHERS THEN
      failed_count := failed_count + 1;
      RAISE NOTICE 'Failed to update coordinates for event %: %', event_record.id, SQLERRM;
    END;
  END LOOP;
  
  result := json_build_object(
    'success', true,
    'updated_count', updated_count,
    'failed_count', failed_count,
    'message', 'Updated coordinates for ' || updated_count || ' events, ' || failed_count || ' failed'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Run the update function to fix all events
SELECT update_all_event_coordinates();