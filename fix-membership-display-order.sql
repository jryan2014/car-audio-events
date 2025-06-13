-- Fix missing display_order values in membership_plans table
-- This ensures all plans have proper display_order for sorting and editing

-- First, update any plans missing display_order with simple values
UPDATE public.membership_plans 
SET display_order = (
    CASE 
        WHEN type = 'competitor' AND price = 0 THEN 1
        WHEN type = 'competitor' AND price > 0 THEN 2
        WHEN type = 'retailer' THEN 3
        WHEN type = 'manufacturer' THEN 4
        WHEN type = 'organization' THEN 5
        ELSE 6
    END
)
WHERE display_order IS NULL OR display_order = 0;

-- Then, ensure all plans have unique display_order values (no duplicates)
-- This uses a subquery instead of window functions in UPDATE
UPDATE public.membership_plans 
SET display_order = subquery.new_order
FROM (
    SELECT 
        id,
        ROW_NUMBER() OVER (ORDER BY 
            CASE type 
                WHEN 'competitor' THEN 1 
                WHEN 'retailer' THEN 2 
                WHEN 'manufacturer' THEN 3 
                WHEN 'organization' THEN 4 
                ELSE 5 
            END,
            price ASC,
            name ASC
        ) as new_order
    FROM public.membership_plans
) AS subquery
WHERE public.membership_plans.id = subquery.id;

-- Success message
SELECT 'Membership plans display_order fixed successfully!' as result; 