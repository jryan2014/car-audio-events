# Permission System Recovery Guide

## Current Status
- **Date**: January 8, 2025
- **Migration Applied**: `20250108_001_permission_enhancement_safe_final`
- **Feature Flags**: ALL DISABLED (Safe Mode)
- **System Impact**: NONE - Original system still running

## What Was Added (Currently Inactive)

### New Tables Created:
1. `feature_registry` - Dynamic feature registration
2. `feature_usage_tracking` - Usage limit tracking
3. `organization_seats` - Seat management for organizations
4. `support_routing_rules` - Support ticket routing
5. `support_rep_levels` - Support representative levels
6. `permission_change_history` - Audit trail

### New Columns Added:
- `membership_plans`: usage_limits, seat_configuration, feature_tiers, configurable_limits
- `users`: parent_organization_id, organization_role, is_organization_seat, seat_assigned_at, seat_assigned_by

### Feature Flags Created (All Disabled):
- `enhanced_permissions` - New permission system
- `organization_hierarchy` - Multi-user organizations
- `usage_tracking` - Feature usage limits
- `support_routing_rules` - Ticket routing

## Recovery Procedures

### Quick Status Check
```sql
-- Check if new system is active
SELECT feature_name, is_enabled 
FROM feature_flags 
WHERE feature_name LIKE '%permission%' 
   OR feature_name LIKE '%organization%'
   OR feature_name LIKE '%tracking%';
```

### Emergency Rollback (If Needed)
```sql
-- One-command rollback to disable everything
SELECT rollback_permission_enhancement();
```

### Manual Feature Flag Control
```sql
-- To enable a specific feature (test one at a time)
UPDATE feature_flags 
SET is_enabled = true 
WHERE feature_name = 'enhanced_permissions';

-- To disable a specific feature
UPDATE feature_flags 
SET is_enabled = false 
WHERE feature_name = 'enhanced_permissions';

-- To disable ALL new features at once
UPDATE feature_flags 
SET is_enabled = false 
WHERE feature_name IN (
  'enhanced_permissions',
  'organization_hierarchy', 
  'usage_tracking',
  'support_routing_rules'
);
```

### Complete Removal (Nuclear Option)
```sql
-- WARNING: Only use if you want to completely remove the enhancement
-- This will delete all new tables and columns

-- Step 1: Disable feature flags
SELECT rollback_permission_enhancement();

-- Step 2: Drop new tables
DROP TABLE IF EXISTS permission_change_history CASCADE;
DROP TABLE IF EXISTS support_rep_levels CASCADE;
DROP TABLE IF EXISTS support_routing_rules CASCADE;
DROP TABLE IF EXISTS organization_seats CASCADE;
DROP TABLE IF EXISTS feature_usage_tracking CASCADE;
DROP TABLE IF EXISTS feature_registry CASCADE;

-- Step 3: Remove new columns from existing tables
ALTER TABLE membership_plans 
DROP COLUMN IF EXISTS usage_limits,
DROP COLUMN IF EXISTS seat_configuration,
DROP COLUMN IF EXISTS feature_tiers,
DROP COLUMN IF EXISTS configurable_limits;

ALTER TABLE users
DROP COLUMN IF EXISTS parent_organization_id,
DROP COLUMN IF EXISTS organization_role,
DROP COLUMN IF EXISTS is_organization_seat,
DROP COLUMN IF EXISTS seat_assigned_at,
DROP COLUMN IF EXISTS seat_assigned_by;

-- Step 4: Remove feature flags
DELETE FROM feature_flags 
WHERE feature_name IN (
  'enhanced_permissions',
  'organization_hierarchy',
  'usage_tracking',
  'support_routing_rules'
);
```

## Testing Procedure (Safe Activation)

### Phase 1: Test with Admin Account
1. Enable ONE feature flag
2. Test with your admin account
3. Verify no impact on existing users
4. If issues, disable immediately

### Phase 2: Test with Free Users
1. Enable for your 2 free users
2. Monitor for any issues
3. Check existing functionality still works

### Phase 3: Full Activation
1. Enable all features
2. Configure limits and permissions
3. Monitor system performance

## Monitoring Commands

```sql
-- Check if any users are affected by new system
SELECT COUNT(*) as affected_users
FROM users 
WHERE parent_organization_id IS NOT NULL
   OR organization_role IS NOT NULL
   OR is_organization_seat = true;

-- Check if any usage tracking is happening
SELECT COUNT(*) as usage_records
FROM feature_usage_tracking;

-- Check permission change history
SELECT * FROM permission_change_history 
ORDER BY created_at DESC 
LIMIT 10;

-- Check active routing rules
SELECT * FROM support_routing_rules 
WHERE is_active = true;
```

## Support Contact
If any issues arise:
1. Run emergency rollback immediately
2. Check user access is still working
3. Verify billing system is unaffected
4. Document any errors for troubleshooting

## Current System State
✅ Original permission system: ACTIVE
✅ Original billing system: UNAFFECTED  
✅ User access: NORMAL
✅ Feature flags: DISABLED (Safe)
✅ Rollback function: READY

The system is currently in a SAFE state with all enhancements disabled.
No user functionality has been affected.