-- Add new user fields to the users table
-- Run this in your Supabase SQL Editor

-- Add personal information fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT;

-- Add competition and team fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS competition_type TEXT CHECK (competition_type IN ('SPL', 'SQL', 'both', 'none')),
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Create teams table if it doesn't exist
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add some sample teams
INSERT INTO teams (name, description) VALUES
  ('Bass Heads', 'Professional SPL competition team'),
  ('Sound Quality Masters', 'SQL focused competition team'),
  ('Thunder Squad', 'Mixed SPL/SQL team'),
  ('Audio Legends', 'Veteran competition team'),
  ('Bass Breakers', 'High-performance SPL specialists')
ON CONFLICT (name) DO NOTHING;

-- Add updated_at column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing users with sample data (optional)
-- This will help with testing - you can remove this section if not needed
UPDATE users SET 
  first_name = SPLIT_PART(name, ' ', 1),
  last_name = CASE 
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(name, ' '), 1) > 1 
    THEN SPLIT_PART(name, ' ', 2)
    ELSE ''
  END,
  competition_type = CASE 
    WHEN membership_type = 'competitor' THEN 'SPL'
    ELSE 'none'
  END
WHERE first_name IS NULL OR last_name IS NULL;

-- Add RLS policies for teams table
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Policy for reading teams (all authenticated users can read)
CREATE POLICY "Teams are viewable by authenticated users" ON teams
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy for admin users to manage teams
CREATE POLICY "Teams are manageable by admins" ON teams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.membership_type = 'admin'
      AND users.status = 'active'
    )
  );

-- Grant permissions
GRANT SELECT ON teams TO authenticated;
GRANT ALL ON teams TO service_role; 