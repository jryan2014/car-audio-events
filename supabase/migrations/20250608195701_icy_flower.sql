/*
  # Complete User Profile and Competition System

  1. New Tables
    - `user_audio_systems` - Car audio system configurations
    - `audio_components` - Individual audio components
    - `competition_results` - User competition scores and placements
    - `teams` - Team management
    - `team_members` - Team membership
    - `team_invitations` - Team invitation system
    - `user_preferences` - User settings and preferences

  2. Enhanced Tables
    - Enhanced `users` table with additional profile fields
    - Enhanced `events` table for competition tracking

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for user data access
    - Team-based access controls

  4. Functions
    - Team management functions
    - Competition result tracking
    - Audio system management
*/

-- Enhanced user audio systems table
CREATE TABLE IF NOT EXISTS user_audio_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'My Audio System',
  description text,
  vehicle_year integer,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  system_type text CHECK (system_type IN ('sound_quality', 'spl', 'hybrid', 'show')) DEFAULT 'sound_quality',
  total_power_watts integer,
  estimated_cost numeric(10,2),
  installation_date date,
  is_primary boolean DEFAULT true,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Audio components table
CREATE TABLE IF NOT EXISTS audio_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  system_id uuid REFERENCES user_audio_systems(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL CHECK (category IN (
    'head_unit', 'amplifier', 'speakers', 'subwoofers', 'processor', 
    'crossover', 'capacitor', 'wiring', 'enclosure', 'damping', 'other'
  )),
  brand text NOT NULL,
  model text NOT NULL,
  description text,
  power_watts integer,
  impedance_ohms numeric(5,2),
  frequency_response text,
  price numeric(10,2),
  purchase_date date,
  installation_notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Competition results table
CREATE TABLE IF NOT EXISTS competition_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  class text,
  overall_score numeric(5,2),
  placement integer,
  total_participants integer,
  points_earned integer DEFAULT 0,
  
  -- Detailed scores
  sound_quality_score numeric(5,2),
  spl_score numeric(5,2),
  installation_score numeric(5,2),
  presentation_score numeric(5,2),
  
  -- Additional details
  notes text,
  judge_comments text,
  system_used uuid REFERENCES user_audio_systems(id),
  
  -- Metadata
  competed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, event_id, category)
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  team_type text CHECK (team_type IN ('competitive', 'social', 'professional', 'club')) DEFAULT 'competitive',
  location text,
  website text,
  logo_url text,
  
  -- Team settings
  is_public boolean DEFAULT true,
  requires_approval boolean DEFAULT true,
  max_members integer DEFAULT 50,
  
  -- Team stats
  total_points integer DEFAULT 0,
  competitions_won integer DEFAULT 0,
  
  -- Management
  owner_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role text CHECK (role IN ('owner', 'admin', 'member', 'guest')) DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  points_contributed integer DEFAULT 0,
  is_active boolean DEFAULT true,
  
  UNIQUE(team_id, user_id)
);

-- Team invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  invited_user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  invited_by_user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  message text,
  status text CHECK (status IN ('pending', 'accepted', 'declined', 'expired')) DEFAULT 'pending',
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  responded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(team_id, invited_user_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Notification preferences
  email_notifications boolean DEFAULT true,
  event_reminders boolean DEFAULT true,
  team_notifications boolean DEFAULT true,
  competition_updates boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  
  -- Privacy preferences
  profile_visibility text CHECK (profile_visibility IN ('public', 'members_only', 'private')) DEFAULT 'public',
  show_competition_results boolean DEFAULT true,
  show_audio_system boolean DEFAULT true,
  show_location boolean DEFAULT true,
  
  -- Display preferences
  preferred_units text CHECK (preferred_units IN ('metric', 'imperial')) DEFAULT 'imperial',
  timezone text DEFAULT 'UTC',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_audio_systems_user_id ON user_audio_systems(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audio_systems_primary ON user_audio_systems(user_id, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_audio_components_system_id ON audio_components(system_id);
CREATE INDEX IF NOT EXISTS idx_audio_components_category ON audio_components(category);
CREATE INDEX IF NOT EXISTS idx_competition_results_user_id ON competition_results(user_id);
CREATE INDEX IF NOT EXISTS idx_competition_results_event_id ON competition_results(event_id);
CREATE INDEX IF NOT EXISTS idx_competition_results_placement ON competition_results(placement);
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_public ON teams(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_user_id ON team_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- Enable RLS on all tables
ALTER TABLE user_audio_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_audio_systems
CREATE POLICY "Users can manage their own audio systems"
  ON user_audio_systems
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public audio systems are viewable"
  ON user_audio_systems
  FOR SELECT
  TO public
  USING (is_public = true);

-- RLS Policies for audio_components
CREATE POLICY "Users can manage components of their systems"
  ON audio_components
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_audio_systems 
      WHERE id = audio_components.system_id 
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_audio_systems 
      WHERE id = audio_components.system_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Public system components are viewable"
  ON audio_components
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM user_audio_systems 
      WHERE id = audio_components.system_id 
      AND is_public = true
    )
  );

-- RLS Policies for competition_results
CREATE POLICY "Users can manage their own competition results"
  ON competition_results
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Competition results are publicly viewable"
  ON competition_results
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM user_preferences 
      WHERE user_id = competition_results.user_id 
      AND show_competition_results = true
    )
  );

-- RLS Policies for teams
CREATE POLICY "Anyone can view public teams"
  ON teams
  FOR SELECT
  TO public
  USING (is_public = true);

CREATE POLICY "Team owners can manage their teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create teams"
  ON teams
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- RLS Policies for team_members
CREATE POLICY "Team members can view team membership"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid() 
      AND tm.is_active = true
    )
  );

CREATE POLICY "Team owners and admins can manage membership"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_members.team_id 
      AND owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can leave teams"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for team_invitations
CREATE POLICY "Users can view their own invitations"
  ON team_invitations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by_user_id);

CREATE POLICY "Team members can create invitations"
  ON team_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = invited_by_user_id AND
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = team_invitations.team_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can respond to their invitations"
  ON team_invitations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = invited_user_id)
  WITH CHECK (auth.uid() = invited_user_id);

-- RLS Policies for user_preferences
CREATE POLICY "Users can manage their own preferences"
  ON user_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_audio_systems_updated_at
  BEFORE UPDATE ON user_audio_systems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audio_components_updated_at
  BEFORE UPDATE ON audio_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competition_results_updated_at
  BEFORE UPDATE ON competition_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user preferences
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences when user is created
CREATE TRIGGER on_user_created_preferences
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_user_preferences();

-- Function to handle team invitation responses
CREATE OR REPLACE FUNCTION respond_to_team_invitation(
  invitation_id uuid,
  response text
)
RETURNS json AS $$
DECLARE
  invitation_record team_invitations%ROWTYPE;
  result json;
BEGIN
  -- Get the invitation
  SELECT * INTO invitation_record
  FROM team_invitations
  WHERE id = invitation_id
  AND invited_user_id = auth.uid()
  AND status = 'pending'
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invitation not found or expired'
    );
  END IF;
  
  -- Update invitation status
  UPDATE team_invitations
  SET status = response,
      responded_at = now()
  WHERE id = invitation_id;
  
  -- If accepted, add user to team
  IF response = 'accepted' THEN
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (invitation_record.team_id, invitation_record.invited_user_id, 'member')
    ON CONFLICT (team_id, user_id) DO UPDATE SET
      is_active = true,
      joined_at = now();
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Invitation ' || response
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user competition points
CREATE OR REPLACE FUNCTION calculate_user_points(user_uuid uuid)
RETURNS integer AS $$
DECLARE
  total_points integer := 0;
BEGIN
  SELECT COALESCE(SUM(points_earned), 0)
  INTO total_points
  FROM competition_results
  WHERE user_id = user_uuid;
  
  RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's competition statistics
CREATE OR REPLACE FUNCTION get_user_competition_stats(user_uuid uuid)
RETURNS json AS $$
DECLARE
  stats json;
BEGIN
  SELECT json_build_object(
    'total_competitions', COUNT(*),
    'total_points', COALESCE(SUM(points_earned), 0),
    'average_score', ROUND(AVG(overall_score), 2),
    'best_placement', MIN(placement),
    'wins', COUNT(*) FILTER (WHERE placement = 1),
    'podium_finishes', COUNT(*) FILTER (WHERE placement <= 3),
    'categories_competed', COUNT(DISTINCT category)
  )
  INTO stats
  FROM competition_results
  WHERE user_id = user_uuid;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql;