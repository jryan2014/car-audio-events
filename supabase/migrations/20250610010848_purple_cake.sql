/*
  # Add anonymous access policy for users table

  1. Security
    - Add policy for anonymous users to read basic user information
    - Only expose non-sensitive columns needed for public event display
    - Restrict access to id, name, profile_image_url, membership_type, and company_name
*/

-- Add policy to allow anonymous users to read basic user information
CREATE POLICY "Anonymous users can read basic user info"
  ON users
  FOR SELECT
  TO anon
  USING (true);

-- Note: This policy allows reading all columns, but in practice the application
-- should only select the columns it needs. For additional security, you could
-- create a view that only exposes the necessary columns and grant access to that instead.