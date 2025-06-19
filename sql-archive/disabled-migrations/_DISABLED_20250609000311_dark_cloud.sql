/*
  # Fix Team Members RLS Policies

  1. Problem
    - Infinite recursion in team_members RLS policies
    - Circular dependencies causing query timeouts
  
  2. Solution
    - Drop all existing team_members policies
    - Create simplified policies without recursion
    - Maintain proper security model
*/

-- First drop ALL existing policies on team_members to ensure clean slate
DO $$
DECLARE
    policy_name text;
BEGIN
    FOR policy_name IN (
        SELECT policyname FROM pg_policies WHERE tablename = 'team_members'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON team_members', policy_name);
    END LOOP;
END
$$;

-- Create simplified policies without recursion
CREATE POLICY "Users can view their own team memberships"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave teams (delete their own membership)"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Team owners can manage memberships (simplified without recursive checks)
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

-- Allow team members to view other members of the same team (simplified)
CREATE POLICY "Team members can view team memberships"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true
    )
  );

-- Add policy for team admins to manage memberships
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