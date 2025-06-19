/*
  # Admin Approval Workflow for Events

  1. Admin Functions
    - Event approval/rejection system
    - Bulk approval operations
    - Approval notifications

  2. Enhanced Admin Policies
    - Admin can approve/reject events
    - Admin can manage all events
    - Event status tracking

  3. Notification System
    - Email notifications for approvals
    - Status change tracking
*/

-- Create admin event approval policies
CREATE POLICY "Admins can view all events"
  ON events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin' 
      AND users.status = 'active'
    )
  );

CREATE POLICY "Admins can update all events"
  ON events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin' 
      AND users.status = 'active'
    )
  );

-- Create function for event approval
CREATE OR REPLACE FUNCTION approve_event(
  event_id uuid,
  admin_id uuid,
  approval_decision text,
  rejection_reason text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  event_record events%ROWTYPE;
  result json;
BEGIN
  -- Verify admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = admin_id 
    AND membership_type = 'admin' 
    AND status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get event details
  SELECT * INTO event_record FROM events WHERE id = event_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- Update event approval status
  IF approval_decision = 'approved' THEN
    UPDATE events 
    SET 
      approval_status = 'approved',
      status = 'published',
      approved_by = admin_id,
      approved_at = now(),
      rejection_reason = NULL,
      updated_at = now()
    WHERE id = event_id;
    
    result = json_build_object(
      'success', true, 
      'message', 'Event approved and published',
      'event_id', event_id,
      'status', 'approved'
    );
  ELSIF approval_decision = 'rejected' THEN
    UPDATE events 
    SET 
      approval_status = 'rejected',
      status = 'draft',
      approved_by = admin_id,
      approved_at = now(),
      rejection_reason = rejection_reason,
      updated_at = now()
    WHERE id = event_id;
    
    result = json_build_object(
      'success', true, 
      'message', 'Event rejected',
      'event_id', event_id,
      'status', 'rejected',
      'reason', rejection_reason
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid approval decision');
  END IF;

  -- Log the approval action
  INSERT INTO admin_audit_log (admin_id, action, details)
  VALUES (
    admin_id,
    'event_' || approval_decision,
    json_build_object(
      'event_id', event_id,
      'event_title', event_record.title,
      'organizer_id', event_record.organizer_id,
      'decision', approval_decision,
      'reason', rejection_reason,
      'timestamp', now()
    )
  );

  -- TODO: Send notification to event organizer
  -- This would integrate with an email service

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get pending events for admin review
CREATE OR REPLACE FUNCTION get_pending_events_for_approval()
RETURNS TABLE (
  id uuid,
  title text,
  organizer_name text,
  organizer_email text,
  organization_name text,
  start_date timestamptz,
  venue_name text,
  city text,
  state text,
  submitted_at timestamptz,
  category_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    u.name as organizer_name,
    u.email as organizer_email,
    o.name as organization_name,
    e.start_date,
    e.venue_name,
    e.city,
    e.state,
    e.created_at as submitted_at,
    ec.name as category_name
  FROM events e
  LEFT JOIN users u ON e.organizer_id = u.id
  LEFT JOIN organizations o ON e.organization_id = o.id
  LEFT JOIN event_categories ec ON e.category_id = ec.id
  WHERE e.approval_status = 'pending'
  ORDER BY e.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for bulk event operations
CREATE OR REPLACE FUNCTION bulk_approve_events(
  event_ids uuid[],
  admin_id uuid
)
RETURNS json AS $$
DECLARE
  event_id uuid;
  success_count integer := 0;
  error_count integer := 0;
  errors text[] := '{}';
  result json;
BEGIN
  -- Verify admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = admin_id 
    AND membership_type = 'admin' 
    AND status = 'active'
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Process each event
  FOREACH event_id IN ARRAY event_ids
  LOOP
    BEGIN
      UPDATE events 
      SET 
        approval_status = 'approved',
        status = 'published',
        approved_by = admin_id,
        approved_at = now(),
        updated_at = now()
      WHERE id = event_id AND approval_status = 'pending';
      
      IF FOUND THEN
        success_count := success_count + 1;
        
        -- Log the approval
        INSERT INTO admin_audit_log (admin_id, action, details)
        VALUES (
          admin_id,
          'bulk_event_approved',
          json_build_object(
            'event_id', event_id,
            'timestamp', now()
          )
        );
      ELSE
        error_count := error_count + 1;
        errors := array_append(errors, 'Event ' || event_id || ' not found or not pending');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      errors := array_append(errors, 'Error processing event ' || event_id || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'approved_count', success_count,
    'error_count', error_count,
    'errors', errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;