/*
  # Fix Team Members RLS Policies

  1. Security Updates
    - Remove recursive policy that causes infinite recursion
    - Simplify team member access policies
    - Ensure policies don't reference the same table they're protecting

  2. Changes
    - Drop existing problematic policies
    - Create new non-recursive policies for team_members table
    - Maintain security while avoiding circular references
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Team members can view team memberships" ON team_members;
DROP POLICY IF EXISTS "Team admins can manage memberships" ON team_members;

-- Create simplified, non-recursive policies
CREATE POLICY "Users can view their own team memberships"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Team owners can manage all team memberships"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave teams (delete their own membership)"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow team owners to insert new members
CREATE POLICY "Team owners can add members"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
  );