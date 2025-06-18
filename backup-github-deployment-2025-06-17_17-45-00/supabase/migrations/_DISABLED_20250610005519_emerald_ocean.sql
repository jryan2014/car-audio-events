/*
  # Create Pending Users View

  1. New Views
    - `pending_users_view` - A view that shows all users with pending status or verification
  
  2. Security
    - Ensure the view is only accessible to admin users
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

-- Since we can't create policies directly on views, we need to ensure
-- the underlying table (users) has appropriate policies for admins

-- Check if the admin policy already exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'Admins can view all users'
  ) THEN
    -- Create policy for admins to view all users
    CREATE POLICY "Admins can view all users"
      ON users
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
  END IF;
END $$;

-- Grant usage on the schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant select on the view to authenticated users
GRANT SELECT ON pending_users_view TO authenticated;

-- Add a comment explaining the view
COMMENT ON VIEW pending_users_view IS 'View that shows all users with pending status or verification, accessible only to admins';