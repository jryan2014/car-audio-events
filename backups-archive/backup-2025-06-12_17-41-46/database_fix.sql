-- Add missing approval_status column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]));

-- Update existing events to have approved status
UPDATE events SET approval_status = 'approved' WHERE approval_status IS NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_events_approval_status ON events(approval_status); 