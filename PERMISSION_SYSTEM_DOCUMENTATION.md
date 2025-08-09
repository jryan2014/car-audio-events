# Car Audio Events Enhanced Permission System Documentation

## Overview

The Car Audio Events platform now features a comprehensive, tiered permission system that provides granular control over feature access, usage limits, organization hierarchies, and support desk routing. This system is designed to be fully configurable through the admin interface without requiring code changes.

## System Architecture

### Core Components

1. **Feature Registry**: Dynamic registration of platform features
2. **Permission Manager**: Admin UI for configuring all aspects
3. **Usage Tracking**: Monitor and limit feature usage
4. **Organization Hierarchy**: Multi-user seat management
5. **Support Desk Routing**: Intelligent ticket assignment

## Feature Flags

The system uses feature flags for safe rollout:

```sql
-- Check current status
SELECT * FROM feature_flags WHERE feature_name IN ('enhanced_permissions', 'organization_hierarchy');

-- Enable enhanced permissions (currently DISABLED by default)
UPDATE feature_flags SET is_enabled = true WHERE feature_name = 'enhanced_permissions';
```

## Permission Tiers

### User Types (11 total)
1. **Admin** - Full system access
2. **Organization** - Multi-user business accounts
3. **Manufacturer** - Product manufacturers
4. **Retailer** - Retail businesses
5. **Pro Competitor** - Premium competitor features
6. **Competitor** - Basic competitor features  
7. **Free** - Free tier users
8. **Support** - Support representatives
9. **Sponsor** - Event sponsors
10. **Judge** - Competition judges
11. **Public** - Non-authenticated visitors

### Feature Access Levels

Each feature can be configured with:
- **Tiers**: Which membership types have access
- **Actions**: Specific actions (view, create, edit, delete)
- **Limits**: Daily/weekly/monthly usage limits per tier

Example configuration:
```javascript
{
  feature_name: "spl_calculator",
  tiers: ["free", "competitor", "pro_competitor"],
  actions: ["calculate", "save", "export"],
  default_limits: {
    free: { calculate: 50, save: 0, export: 0 },
    competitor: { calculate: 200, save: 10, export: 5 },
    pro_competitor: { calculate: -1, save: -1, export: -1 } // -1 = unlimited
  }
}
```

## Admin Interface

### Accessing Permission Manager

1. Navigate to `/admin/membership`
2. Click on "Permissions" tab
3. Enable enhanced permissions if not already active

### Managing Features

The Permission Manager has 4 main tabs:

#### 1. Features & Limits
- View all registered features by category
- Set usage limits for each tier
- Enable/disable features
- Configure actions per feature

#### 2. Plan Assignment  
- Assign features to membership plans
- Configure seat settings for organizations
- Set pricing for additional seats

#### 3. Organization Seats
- View seat allocation per organization
- Set base seats included in plans
- Configure additional seat pricing
- Monitor seat usage

#### 4. Support Levels
- Configure support representative permissions
- Set routing categories per level
- Define escalation paths

## Organization Hierarchy

### Structure
```
Organization (Owner)
├── Admin Users (full org permissions)
├── Manager Users (limited admin)
├── Member Users (standard access)
└── Viewer Users (read-only)
```

### Seat Management

Organizations have configurable seat allocation:
- **Base Seats**: Included with plan (default: 5)
- **Additional Seats**: Can purchase more at configured price
- **Max Seats**: Limit on total seats (default: 100)
- **Seat Price**: Monthly cost per additional seat ($29.99 default)

### Adding Users to Organizations

```javascript
// Via admin UI
1. Go to Organization Management
2. Select organization
3. Click "Invite User"
4. Enter email and role
5. User receives invitation email

// Via database function
SELECT add_user_to_organization(
  p_organization_id => 123,
  p_user_id => 'user-uuid',
  p_role => 'member',
  p_added_by => 'admin-uuid'
);
```

## Support Desk Routing

### Routing Rules Configuration

Rules are evaluated by priority (lower number = higher priority):

```javascript
{
  rule_name: "Critical Billing Issues",
  priority: 10,
  conditions: {
    category: ["billing"],
    priority: ["critical", "high"],
    membership_type: ["organization"],
    tags: ["payment"],
    custom_fields: {
      amount: { "$gt": 100 }
    }
  },
  assigned_to_level: 3, // Level 3 support
  auto_tag_with: ["urgent", "billing"]
}
```

### Support Levels

- **Level 1**: Basic support, general inquiries
- **Level 2**: Technical issues, advanced support
- **Level 3+**: Critical issues, escalations, refunds

### Automatic Routing

Tickets are automatically routed based on:
1. Category (billing, technical, general)
2. Priority (low, normal, high, critical)
3. Membership type
4. Custom fields
5. Tags

## Protected Features

### SPL Calculator Protection

The SPL Calculator is now protected with usage limits:

```javascript
// Free users: 50 calculations/day
// Competitors: 200 calculations/day
// Pro Competitors: Unlimited

// Component automatically:
1. Checks user permissions
2. Displays usage counter
3. Tracks each calculation
4. Shows upgrade prompt when limit reached
```

### Adding Protection to New Features

```javascript
import { SPLCalculatorProtected } from './components/SPLCalculatorProtected';

// Wrap your component
<SPLCalculatorProtected>
  <YourFeatureComponent />
</SPLCalculatorProtected>

// Or use the hook directly
const permissions = useEnhancedPermissions();
const access = await permissions.checkFeatureAccess('feature_name', 'action');
if (access.allowed) {
  // Allow access
  await permissions.trackUsage('feature_name', 'action');
}
```

## Database Schema

### Key Tables

1. **feature_registry** - All platform features
2. **feature_usage_tracking** - Usage statistics
3. **membership_plans** - Plan configurations
4. **organizations** - Organization accounts
5. **organization_seats** - User seat allocations
6. **support_routing_rules** - Ticket routing configuration
7. **support_tickets** - Support ticket tracking

## Testing Guide

### Enable System (Currently DISABLED)

```javascript
// 1. Enable feature flags
UPDATE feature_flags SET is_enabled = true 
WHERE feature_name IN ('enhanced_permissions', 'organization_hierarchy');

// 2. Test with different user types
- Create test users with different membership types
- Verify feature access matches configuration
- Test usage limit enforcement
- Verify organization seat management
```

### Test Scenarios

1. **Permission Check**
   - Login as free user → Limited SPL Calculator access
   - Login as pro_competitor → Unlimited access
   
2. **Usage Tracking**
   - Use feature until limit reached
   - Verify upgrade prompt appears
   - Check usage resets daily

3. **Organization Management**
   - Create organization
   - Invite users
   - Manage seats
   - Monitor billing

4. **Support Routing**
   - Create tickets with different categories
   - Verify correct assignment
   - Test escalation paths

## Rollback Procedures

### Complete System Rollback

```sql
-- Disable feature flags first
UPDATE feature_flags SET is_enabled = false 
WHERE feature_name IN ('enhanced_permissions', 'organization_hierarchy');

-- If needed, full rollback
SELECT rollback_permission_enhancement();
SELECT rollback_organization_hierarchy();
SELECT rollback_support_desk_routing();
```

### Partial Rollback

```sql
-- Disable specific features
UPDATE feature_registry SET is_active = false WHERE feature_name = 'feature_to_disable';

-- Remove user from organization
SELECT remove_user_from_organization(org_id, user_id, removed_by);
```

## Monitoring

### Usage Analytics

```sql
-- View feature usage by user
SELECT * FROM feature_usage_tracking 
WHERE user_id = 'user-uuid' 
ORDER BY tracked_at DESC;

-- Organization seat usage
SELECT * FROM get_organization_seat_usage(org_id);

-- Support ticket routing effectiveness
SELECT 
  rule_name,
  times_used,
  last_used_at
FROM support_routing_rules
ORDER BY times_used DESC;
```

### Health Checks

```sql
-- Check feature flag status
SELECT * FROM feature_flags;

-- Active organizations
SELECT COUNT(*) FROM organizations WHERE is_active = true;

-- Pending invitations
SELECT COUNT(*) FROM organization_invitations 
WHERE accepted_at IS NULL AND expires_at > NOW();
```

## Migration Path

### For Existing Users

1. System maintains backward compatibility
2. Legacy permissions continue working
3. Enhanced features activate only when flags enabled
4. No data loss during transition

### Gradual Rollout

1. **Phase 1**: Enable for admin testing
2. **Phase 2**: Enable for select organizations
3. **Phase 3**: Enable usage tracking
4. **Phase 4**: Full production rollout

## Best Practices

### Feature Registration

```javascript
// Register new features dynamically
INSERT INTO feature_registry (
  feature_name,
  feature_category,
  tiers,
  actions,
  default_limits
) VALUES (
  'new_feature',
  'tools',
  ARRAY['pro_competitor', 'organization'],
  ARRAY['use', 'export'],
  '{"pro_competitor": {"use": -1, "export": 10}}'::jsonb
);
```

### Permission Checks

```javascript
// Always check permissions before feature access
const permissions = useEnhancedPermissions();

// Simple check
if (permissions.hasPermission('feature_name')) {
  // Allow access
}

// Advanced check with usage tracking
const access = await permissions.checkFeatureAccess('feature_name', 'action');
if (access.allowed) {
  // Use feature
  await permissions.trackUsage('feature_name', 'action');
  
  // Show remaining usage
  if (access.remainingUsage !== undefined) {
    console.log(`${access.remainingUsage} uses remaining today`);
  }
}
```

## Troubleshooting

### Common Issues

1. **Feature not accessible**
   - Check feature flags are enabled
   - Verify user membership type
   - Check feature registry configuration

2. **Usage limits not enforced**
   - Ensure enhanced_permissions flag is enabled
   - Verify usage tracking table has entries
   - Check timezone settings for daily reset

3. **Organization seats not working**
   - Verify organizations table exists
   - Check seat configuration in membership_plans
   - Ensure RLS policies are active

4. **Support routing failing**
   - Check routing rules are active
   - Verify support rep levels configured
   - Ensure conditions match ticket fields

## Support

For issues with the permission system:
1. Check this documentation
2. Review error logs in Supabase dashboard
3. Contact system administrator
4. Use support desk for assistance

## Version History

- **v1.0.0** (2025-01-08): Initial implementation
  - Feature registry and usage tracking
  - Organization hierarchy
  - Support desk routing
  - SPL Calculator protection

---

**Note**: This system is currently DISABLED by default. Enable feature flags to activate.