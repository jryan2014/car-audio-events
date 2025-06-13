-- Safe fix for rules_templates table - PRESERVES ALL EXISTING DATA
-- Only adds missing columns that OrganizationManager needs

-- Add missing columns if they don't exist (safe operation)
DO $$
BEGIN
    -- Add rules_content column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'rules_templates' AND column_name = 'rules_content') THEN
        ALTER TABLE public.rules_templates ADD COLUMN rules_content TEXT;
        RAISE NOTICE 'Added rules_content column';
    ELSE
        RAISE NOTICE 'rules_content column already exists';
    END IF;
    
    -- Add organization_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'rules_templates' AND column_name = 'organization_name') THEN
        ALTER TABLE public.rules_templates ADD COLUMN organization_name VARCHAR(255);
        RAISE NOTICE 'Added organization_name column';
    ELSE
        RAISE NOTICE 'organization_name column already exists';
    END IF;
    
    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'rules_templates' AND column_name = 'description') THEN
        ALTER TABLE public.rules_templates ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column';
    ELSE
        RAISE NOTICE 'description column already exists';
    END IF;
    
    -- Add version column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'rules_templates' AND column_name = 'version') THEN
        ALTER TABLE public.rules_templates ADD COLUMN version VARCHAR(50) DEFAULT '1.0';
        RAISE NOTICE 'Added version column';
    ELSE
        RAISE NOTICE 'version column already exists';
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'rules_templates' AND column_name = 'is_active') THEN
        ALTER TABLE public.rules_templates ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column';
    ELSE
        RAISE NOTICE 'is_active column already exists';
    END IF;
END $$;

-- Update any NULL values in the new columns to have defaults
UPDATE public.rules_templates 
SET rules_content = 'Please add rules content for this template'
WHERE rules_content IS NULL;

UPDATE public.rules_templates 
SET organization_name = 'General'
WHERE organization_name IS NULL;

UPDATE public.rules_templates 
SET description = 'Rules template - please add description'
WHERE description IS NULL;

UPDATE public.rules_templates 
SET version = '1.0'
WHERE version IS NULL;

UPDATE public.rules_templates 
SET is_active = true
WHERE is_active IS NULL;

-- Create indexes for better performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_rules_templates_name ON public.rules_templates(name);
CREATE INDEX IF NOT EXISTS idx_rules_templates_active ON public.rules_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_rules_templates_org ON public.rules_templates(organization_name);

-- Add RLS policies if they don't exist
ALTER TABLE public.rules_templates ENABLE ROW LEVEL SECURITY;

-- Only create policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rules_templates' AND policyname = 'Allow authenticated users to read rules templates') THEN
        CREATE POLICY "Allow authenticated users to read rules templates" ON public.rules_templates
            FOR SELECT TO authenticated USING (true);
        RAISE NOTICE 'Created read policy for rules_templates';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rules_templates' AND policyname = 'Allow authenticated users to insert rules templates') THEN
        CREATE POLICY "Allow authenticated users to insert rules templates" ON public.rules_templates
            FOR INSERT TO authenticated WITH CHECK (true);
        RAISE NOTICE 'Created insert policy for rules_templates';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rules_templates' AND policyname = 'Allow authenticated users to update rules templates') THEN
        CREATE POLICY "Allow authenticated users to update rules templates" ON public.rules_templates
            FOR UPDATE TO authenticated USING (true);
        RAISE NOTICE 'Created update policy for rules_templates';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rules_templates' AND policyname = 'Allow authenticated users to delete rules templates') THEN
        CREATE POLICY "Allow authenticated users to delete rules templates" ON public.rules_templates
            FOR DELETE TO authenticated USING (true);
        RAISE NOTICE 'Created delete policy for rules_templates';
    END IF;
END $$;

-- Add sample rules templates only if the table is empty or has very few records
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO record_count FROM public.rules_templates;
    
    IF record_count < 3 THEN
        -- Only add sample data if there are fewer than 3 records
        INSERT INTO public.rules_templates (name, content, rules_content, organization_name, description, version, is_active) VALUES
        ('IASCA Basic Rules', 
         '1. Sound Quality Competition Rules - Vehicles must be street legal and driveable...',
         '1. Sound Quality Competition Rules
- Vehicles must be street legal and driveable
- All equipment must be permanently installed
- No external power sources allowed
- Judging based on tonal accuracy, imaging, and staging

2. Installation Quality Rules
- Professional installation required
- All wiring must be properly secured
- Safety standards must be met
- Aesthetic presentation counts

3. General Competition Rules
- Registration required 24 hours before event
- Vehicles subject to technical inspection
- Protests must be filed within 30 minutes
- Judges decisions are final', 
         'IASCA', 
         'Basic competition rules for sound quality and installation', 
         '2024.1', 
         true),
         
        ('SPL Competition Rules',
         'Sound Pressure Level Competition rules for maximum output contests...',
         '1. Sound Pressure Level Competition
- Maximum 3 attempts per vehicle
- 30-second measurement window
- Microphone placement at driver headrest
- Vehicle doors and windows must be closed

2. Equipment Regulations
- No external amplification allowed
- All equipment must fit in vehicle
- Safety equipment required (fire extinguisher)
- Electrical system must be 12V automotive

3. Safety Requirements
- Driver must exit vehicle during measurement
- Vehicle must be in park/neutral with parking brake
- No loose objects in vehicle
- Hearing protection recommended',
         'dB Drag Racing',
         'Rules for sound pressure level competitions',
         '2024.2',
         true);
         
        RAISE NOTICE 'Added sample rules templates';
    ELSE
        RAISE NOTICE 'Table already has data (% records), skipping sample inserts', record_count;
    END IF;
END $$;

-- Grant permissions
GRANT ALL ON public.rules_templates TO authenticated;
GRANT ALL ON public.rules_templates TO service_role;

-- Success message
SELECT 'Rules templates table updated safely - all existing data preserved' as result; 