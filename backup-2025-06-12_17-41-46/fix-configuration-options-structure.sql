-- Fix Configuration Options Table Structure
-- This aligns the database columns with what the SystemConfiguration component expects

-- Add missing columns to configuration_options table
ALTER TABLE configuration_options 
ADD COLUMN IF NOT EXISTS key VARCHAR(255),
ADD COLUMN IF NOT EXISTS label VARCHAR(255),
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update existing data to populate the new columns
UPDATE configuration_options 
SET 
  key = value,
  label = name,
  sort_order = display_order
WHERE key IS NULL OR label IS NULL;

-- Make key and label NOT NULL after populating them
ALTER TABLE configuration_options 
ALTER COLUMN key SET NOT NULL,
ALTER COLUMN label SET NOT NULL;

-- Add missing columns to form_field_configurations table
ALTER TABLE form_field_configurations 
ADD COLUMN IF NOT EXISTS placeholder VARCHAR(255),
ADD COLUMN IF NOT EXISTS help_text TEXT;

-- Update existing data
UPDATE form_field_configurations 
SET 
  help_text = COALESCE(help_text, placeholder)
WHERE help_text IS NULL;

-- Verify the structure
SELECT 'Configuration Options Structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'configuration_options' 
ORDER BY ordinal_position;

SELECT 'Sample Configuration Options Data:' as info;
SELECT id, category_id, name, value, key, label, sort_order, display_order, is_active 
FROM configuration_options 
LIMIT 5; 