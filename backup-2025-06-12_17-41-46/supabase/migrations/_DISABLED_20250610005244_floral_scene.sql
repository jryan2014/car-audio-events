/*
  # Create pending users view

  1. New View
    - `pending_users_view` - A view that shows all users with pending status or verification
  
  2. Purpose
    - Provides a simple way for admins to see users that need approval
    - Includes all relevant user information for approval decisions
*/

-- Create a view for pending users
CREATE OR REPLACE VIEW pending_users_view AS
SELECT 
  u.id,
  u.email,
  u.name,
  u.membership_type,
  u.status,
  u.verification_status,
  u.location,
  u.phone,
  u.company_name,
  u.business_license,
  u.tax_id,
  u.verification_documents,
  u.subscription_plan,
  u.created_at,
  u.updated_at
FROM 
  users u
WHERE 
  u.status = 'pending' 
  OR u.verification_status = 'pending';

-- Grant access to the view for authenticated users with admin role
CREATE POLICY "Admins can view pending users"
  ON pending_users_view
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.membership_type = 'admin'
      AND users.status = 'active'
    )
  );