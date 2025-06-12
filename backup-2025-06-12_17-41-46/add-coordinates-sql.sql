-- Add coordinates to the existing event
UPDATE events 
SET 
  latitude = 41.3683,
  longitude = -82.1076
WHERE id = 1;

-- Verify the update
SELECT 
  id, 
  title, 
  city, 
  state, 
  status, 
  approval_status,
  start_date,
  latitude, 
  longitude,
  created_at
FROM events 
WHERE id = 1; 