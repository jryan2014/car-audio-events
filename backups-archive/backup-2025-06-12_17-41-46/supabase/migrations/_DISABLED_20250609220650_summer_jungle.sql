/*
  # Fix Event Approval Workflow

  1. Changes
    - Add a function to properly handle event approval
    - Ensure events go through the correct approval workflow
    - Fix any existing events with incorrect status
  
  2. Security
    - Maintain proper RLS policies
    - Ensure admin approval is properly recorded
*/

-- Create a function to properly handle event approval
CREATE OR REPLACE FUNCTION approve_event(
  event_uuid uuid,
  admin_uuid uuid
)
RETURNS json AS $$
DECLARE
  event_record events%ROWTYPE;
  result json;
BEGIN
  -- Get the event
  SELECT * INTO event_record FROM events WHERE id = event_uuid;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Event not found');
  END IF;
  
  -- Update the event approval status and publish it
  UPDATE events
  SET 
    approval_status = 'approved',
    status = 'published',
    approved_by = admin_uuid,
    approved_at = now(),
    updated_at = now()
  WHERE id = event_uuid;
  
  -- Log the approval in the admin audit log
  INSERT INTO admin_audit_log (
    admin_id,
    action,
    details,
    created_at
  ) VALUES (
    admin_uuid,
    'event_approved',
    jsonb_build_object(
      'event_id', event_uuid,
      'event_title', event_record.title,
      'organizer_id', event_record.organizer_id,
      'previous_status', event_record.status,
      'previous_approval_status', event_record.approval_status,
      'timestamp', now()
    ),
    now()
  );
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Event approved and published successfully',
    'event_id', event_uuid,
    'title', event_record.title
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix any events that might have incorrect status
UPDATE events
SET status = 'pending_approval'
WHERE approval_status = 'pending' AND status != 'pending_approval';

-- Fix any events that should be published
UPDATE events
SET status = 'published'
WHERE approval_status = 'approved' AND status != 'published';

-- Create a function to reject an event
CREATE OR REPLACE FUNCTION reject_event(
  event_uuid uuid,
  admin_uuid uuid,
  rejection_reason text
)
RETURNS json AS $$
DECLARE
  event_record events%ROWTYPE;
  result json;
BEGIN
  -- Get the event
  SELECT * INTO event_record FROM events WHERE id = event_uuid;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Event not found');
  END IF;
  
  -- Update the event approval status and set to draft
  UPDATE events
  SET 
    approval_status = 'rejected',
    status = 'draft',
    rejection_reason = rejection_reason,
    approved_by = admin_uuid,
    approved_at = now(),
    updated_at = now()
  WHERE id = event_uuid;
  
  -- Log the rejection in the admin audit log
  INSERT INTO admin_audit_log (
    admin_id,
    action,
    details,
    created_at
  ) VALUES (
    admin_uuid,
    'event_rejected',
    jsonb_build_object(
      'event_id', event_uuid,
      'event_title', event_record.title,
      'organizer_id', event_record.organizer_id,
      'previous_status', event_record.status,
      'previous_approval_status', event_record.approval_status,
      'rejection_reason', rejection_reason,
      'timestamp', now()
    ),
    now()
  );
  
  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Event rejected successfully',
    'event_id', event_uuid,
    'title', event_record.title,
    'reason', rejection_reason
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;