-- Enhance Organizations for System Configuration Integration
-- This migration adds fields to support logos, rules templates, and competition classes

-- Add new fields to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS 
  small_logo_url TEXT; -- For map pins and small displays

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS 
  competition_classes JSONB DEFAULT '[]'; -- Array of competition classes this org uses

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS 
  default_rules_template_id UUID; -- Links to rules_templates table

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS 
  organization_type VARCHAR(50) DEFAULT 'general'; -- sanctioning_body, club, retailer, etc.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS 
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended'));

-- Update the configuration_options table to link to organizations for rules templates
ALTER TABLE rules_templates ADD COLUMN IF NOT EXISTS 
  organization_name VARCHAR(200); -- For display purposes

-- Add foreign key constraint for default rules template
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'organizations_default_rules_template_fkey' 
    AND table_name = 'organizations'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_default_rules_template_fkey 
      FOREIGN KEY (default_rules_template_id) REFERENCES rules_templates(id);
  END IF;
END $$;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(organization_type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- Insert default organizations if they don't exist (matching our configuration system)
INSERT INTO organizations (name, type, organization_type, status) 
SELECT name, 'organization', 'sanctioning_body', 'active'
FROM (VALUES 
  ('IASCA'),
  ('MECA'),
  ('dB Drag Racing'),
  ('USACi'),
  ('BASS'),
  ('SQC'),
  ('Independent'),
  ('Local Club')
) AS orgs(name)
WHERE NOT EXISTS (
  SELECT 1 FROM organizations WHERE organizations.name = orgs.name
);

-- Update rules_templates to link to organizations
UPDATE rules_templates 
SET organization_name = 
  CASE 
    WHEN name LIKE 'IASCA%' THEN 'IASCA'
    WHEN name LIKE 'MECA%' THEN 'MECA'
    WHEN name LIKE 'dB Drag%' THEN 'dB Drag Racing'
    WHEN name LIKE 'Local%' THEN 'Local Club'
    ELSE organization_name
  END
WHERE organization_name IS NULL;

-- Create form field configurations for create_event form
-- Get the category IDs we need
DO $$
DECLARE
  event_cat_id UUID;
  org_cat_id UUID;
  season_cat_id UUID;
BEGIN
  -- Get category IDs
  SELECT id INTO event_cat_id FROM configuration_categories WHERE name = 'event_categories';
  SELECT id INTO org_cat_id FROM configuration_categories WHERE name = 'organizations';
  SELECT id INTO season_cat_id FROM configuration_categories WHERE name = 'competition_seasons';
  
  -- Insert form field configurations if they don't exist
  INSERT INTO form_field_configurations (form_name, field_name, configuration_category_id, field_type, is_required, placeholder, is_multiple)
  SELECT * FROM (VALUES
    ('create_event', 'category_id', event_cat_id, 'select', true, 'Select event category', false),
    ('create_event', 'sanction_body_id', org_cat_id, 'select', true, 'Select sanctioning organization', false),
    ('create_event', 'season_year', season_cat_id, 'select', true, 'Select competition season', false),
    ('create_event', 'rules_regulations', NULL, 'rules_textarea', false, 'Enter rules and regulations...', false)
  ) AS new_configs(form_name, field_name, configuration_category_id, field_type, is_required, placeholder, is_multiple)
  WHERE NOT EXISTS (
    SELECT 1 FROM form_field_configurations 
    WHERE form_field_configurations.form_name = new_configs.form_name 
    AND form_field_configurations.field_name = new_configs.field_name
  );
END $$;

-- Create a view to easily get organization configuration options
CREATE OR REPLACE VIEW organization_config_view AS
SELECT 
  o.id,
  o.name,
  o.type,
  o.organization_type,
  o.logo_url,
  o.small_logo_url,
  o.status,
  o.competition_classes,
  o.default_rules_template_id,
  rt.name as default_rules_template_name,
  rt.content as default_rules_content
FROM organizations o
LEFT JOIN rules_templates rt ON o.default_rules_template_id = rt.id
WHERE o.status = 'active';

-- Grant appropriate permissions
GRANT SELECT ON organization_config_view TO authenticated;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON rules_templates TO authenticated; 