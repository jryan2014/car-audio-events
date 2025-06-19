-- Fix Missing Columns in Advertisement Tables
-- This script adds any missing columns to the tables we created

SELECT 'Checking and fixing missing columns...' as step;

-- Check what columns exist in advertisement_ab_tests
SELECT 'Current columns in advertisement_ab_tests:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'advertisement_ab_tests' 
ORDER BY ordinal_position;

-- Add missing advertisement_id column to advertisement_ab_tests if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advertisement_ab_tests' 
        AND column_name = 'advertisement_id'
    ) THEN
        ALTER TABLE advertisement_ab_tests 
        ADD COLUMN advertisement_id UUID NOT NULL DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added advertisement_id column to advertisement_ab_tests';
    ELSE
        RAISE NOTICE 'advertisement_id column already exists in advertisement_ab_tests';
    END IF;
END $$;

-- Check advertisement_image_analytics table
SELECT 'Current columns in advertisement_image_analytics:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'advertisement_image_analytics' 
ORDER BY ordinal_position;

-- Add missing advertisement_id column to advertisement_image_analytics if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advertisement_image_analytics' 
        AND column_name = 'advertisement_id'
    ) THEN
        ALTER TABLE advertisement_image_analytics 
        ADD COLUMN advertisement_id UUID NOT NULL DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added advertisement_id column to advertisement_image_analytics';
    ELSE
        RAISE NOTICE 'advertisement_id column already exists in advertisement_image_analytics';
    END IF;
END $$;

-- Check advertisement_images table
SELECT 'Current columns in advertisement_images:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'advertisement_images' 
ORDER BY ordinal_position;

-- Add missing advertisement_id column to advertisement_images if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'advertisement_images' 
        AND column_name = 'advertisement_id'
    ) THEN
        ALTER TABLE advertisement_images 
        ADD COLUMN advertisement_id UUID NOT NULL DEFAULT gen_random_uuid();
        RAISE NOTICE 'Added advertisement_id column to advertisement_images';
    ELSE
        RAISE NOTICE 'advertisement_id column already exists in advertisement_images';
    END IF;
END $$;

-- Now let's make sure all tables have the basic structure we need
SELECT 'Verifying table structures...' as step;

-- Show final structure of all tables
SELECT 'Final advertisement_images columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'advertisement_images' 
ORDER BY ordinal_position;

SELECT 'Final advertisement_image_analytics columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'advertisement_image_analytics' 
ORDER BY ordinal_position;

SELECT 'Final advertisement_ab_tests columns:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'advertisement_ab_tests' 
ORDER BY ordinal_position;

SELECT 'Column fix completed! Now the frontend should stop getting column not found errors.' as result; 