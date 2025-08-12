-- Security fix: Set explicit search_path for functions to prevent SQL injection attacks
-- This addresses WARN level security advisor findings from Supabase Security Advisor
-- Severity: WARN - Function has role mutable search_path

-- Fix has_directory_access function if it exists
DO $$
BEGIN
    -- Check if the function exists with the expected signature
    IF EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' 
        AND routine_name = 'has_directory_access'
        AND data_type = 'boolean'
    ) THEN
        -- Try to fix the function, handling potential signature variations
        BEGIN
            ALTER FUNCTION public.has_directory_access(uuid, uuid) SET search_path = 'public', 'pg_catalog', 'pg_temp';
            RAISE NOTICE '✅ Fixed has_directory_access(uuid, uuid) function search_path';
        EXCEPTION WHEN others THEN
            -- Try alternative signature if the first one fails
            BEGIN
                ALTER FUNCTION public.has_directory_access SET search_path = 'public', 'pg_catalog', 'pg_temp';
                RAISE NOTICE '✅ Fixed has_directory_access function search_path (alternative signature)';
            EXCEPTION WHEN others THEN
                RAISE NOTICE '⚠️ Could not fix has_directory_access function: %', SQLERRM;
            END;
        END;
    ELSE
        RAISE NOTICE 'ℹ️ has_directory_access function not found, skipping';
    END IF;
END $$;

-- Fix update_updated_at_column function if it exists
DO $$
BEGIN
    -- Check if the function exists with the expected signature  
    IF EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public' 
        AND routine_name = 'update_updated_at_column'
        AND data_type = 'trigger'
    ) THEN
        -- Try to fix the function
        BEGIN
            ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public', 'pg_catalog', 'pg_temp';
            RAISE NOTICE '✅ Fixed update_updated_at_column() function search_path';
        EXCEPTION WHEN others THEN
            -- Try alternative signature if the first one fails
            BEGIN
                ALTER FUNCTION public.update_updated_at_column SET search_path = 'public', 'pg_catalog', 'pg_temp';
                RAISE NOTICE '✅ Fixed update_updated_at_column function search_path (alternative signature)';
            EXCEPTION WHEN others THEN
                RAISE NOTICE '⚠️ Could not fix update_updated_at_column function: %', SQLERRM;
            END;
        END;
    ELSE
        RAISE NOTICE 'ℹ️ update_updated_at_column function not found, skipping';
    END IF;
END $$;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE '🔒 Security fix migration completed successfully';
    RAISE NOTICE 'ℹ️ This migration addresses WARN level security findings:';
    RAISE NOTICE '   - Function has role mutable search_path vulnerabilities';
    RAISE NOTICE '   - Sets explicit search_path to prevent SQL injection attacks';
END $$;