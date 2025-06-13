-- Fix rules_templates table for OrganizationManager
-- This table stores competition rules templates that organizations can use

-- Create rules_templates table
CREATE TABLE IF NOT EXISTS public.rules_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rules_content TEXT NOT NULL,
    organization_name VARCHAR(255),
    description TEXT,
    version VARCHAR(50) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rules_templates_name ON public.rules_templates(name);
CREATE INDEX IF NOT EXISTS idx_rules_templates_active ON public.rules_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_rules_templates_org ON public.rules_templates(organization_name);

-- Add RLS policies
ALTER TABLE public.rules_templates ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read all rules templates
CREATE POLICY "Allow authenticated users to read rules templates" ON public.rules_templates
    FOR SELECT TO authenticated USING (true);

-- Policy for authenticated users to insert rules templates
CREATE POLICY "Allow authenticated users to insert rules templates" ON public.rules_templates
    FOR INSERT TO authenticated WITH CHECK (true);

-- Policy for authenticated users to update rules templates
CREATE POLICY "Allow authenticated users to update rules templates" ON public.rules_templates
    FOR UPDATE TO authenticated USING (true);

-- Policy for authenticated users to delete rules templates
CREATE POLICY "Allow authenticated users to delete rules templates" ON public.rules_templates
    FOR DELETE TO authenticated USING (true);

-- Insert sample rules templates
INSERT INTO public.rules_templates (name, rules_content, organization_name, description, version, is_active) VALUES
('IASCA Basic Rules', 
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
- Hearing protection recommended

4. Scoring
- Highest single reading wins
- Ties broken by second highest reading
- Protests allowed within 15 minutes
- Re-runs at judges discretion',
'dB Drag Racing',
'Rules for sound pressure level competitions',
'2024.2',
true),

('Bass Wars Standard Rules',
'1. Competition Categories
- Street Class: Daily driver vehicles
- Modified Class: Heavily modified systems
- Extreme Class: Purpose-built competition vehicles

2. Measurement Standards
- Term-Lab measurement system required
- 5-second averaging window
- Multiple frequency sweeps
- Temperature compensation applied

3. Vehicle Requirements
- Must be registered and insured
- Safety inspection required
- All modifications must be documented
- Vehicle must start and run

4. Judging Criteria
- Peak SPL measurement (70%)
- Installation quality (20%)
- Vehicle presentation (10%)

5. Safety Protocols
- Fire suppression system required for Extreme class
- Electrical disconnect switch mandatory
- Hearing protection provided
- Medical personnel on site',
'Bass Wars',
'Comprehensive rules for multi-class bass competitions',
'2024.3',
true),

('USACI Installation Rules',
'1. Installation Quality Standards
- Professional workmanship required
- All connections must be soldered or crimped
- Wire management and routing critical
- Component mounting must be secure

2. Safety Requirements
- Fusing within 18 inches of battery
- Proper gauge wiring for current draw
- No exposed high-current connections
- Ground connections must be solid

3. Aesthetic Judging
- Overall system presentation
- Component integration with vehicle
- Custom fabrication quality
- Attention to detail

4. Technical Requirements
- System must be fully functional
- No intermittent connections
- Proper impedance matching
- Signal path optimization

5. Scoring Breakdown
- Technical execution (40%)
- Safety compliance (30%)
- Aesthetic presentation (20%)
- Innovation and creativity (10%)',
'USACI',
'Installation quality competition standards',
'2024.1',
true),

('Local Club Basic Rules',
'1. Entry Requirements
- Club membership required
- Vehicle registration fee
- Signed waiver mandatory
- Technical inspection passed

2. Competition Format
- Single elimination brackets
- Best 2 out of 3 runs
- 60-second time limit per run
- Judges score immediately

3. Equipment Standards
- Stock electrical system preferred
- Aftermarket equipment allowed
- No professional installations required
- Safety first approach

4. Judging
- Peer judging system
- Simple scoring rubric
- Focus on participation over perfection
- Sportsmanship emphasized

5. Awards
- Participation certificates for all
- Trophies for top 3 in each class
- Special recognition awards
- Annual championship points',
'Local Audio Club',
'Beginner-friendly competition rules for local clubs',
'2024.1',
true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rules_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_rules_templates_updated_at
    BEFORE UPDATE ON public.rules_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_rules_templates_updated_at();

-- Grant permissions
GRANT ALL ON public.rules_templates TO authenticated;
GRANT ALL ON public.rules_templates TO service_role;

-- Success message
SELECT 'Rules templates table created successfully with sample data' as result; 