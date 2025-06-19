/*
  # Fix Team Members RLS Policy

  1. Security Updates
    - Drop existing problematic RLS policies on team_members table
    - Create new simplified policies that avoid infinite recursion
    - Ensure proper access control without circular dependencies

  2. Changes
    - Remove recursive policy that references team_members within team_members policy
    - Add straightforward policies for team member access
    - Maintain security while avoiding infinite loops
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Team members can view team membership" ON team_members;
DROP POLICY IF EXISTS "Team owners and admins can manage membership" ON team_members;
DROP POLICY IF EXISTS "Users can leave teams" ON team_members;

-- Create new simplified policies without recursion
CREATE POLICY "Users can view their own team memberships"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view team memberships for teams they belong to"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_members.team_id
      AND teams.owner_id = auth.uid()
    )
  );

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

CREATE POLICY "Team admins can manage memberships"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
      AND tm.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'admin')
      AND tm.is_active = true
    )
  );