# Permission System Examples

This document provides practical examples of how the hierarchical permission system works for different user types in various scenarios.

## Example User Types and Permissions

### 1. Public User (Unauthenticated)

**User Context:**
- No authentication
- IP-based rate limiting
- Basic feature access only

**Example Permission Check:**
```typescript
// SPL Calculator access
const result = await permissionSystem.checkPermission('anonymous', {
  featureName: 'spl_calculator',
  actionName: 'view'
});

// Result:
{
  granted: true,
  conditions: { usage_limit: 5, time_window: 'daily' },
  usageToday: 2,
  tierName: 'public',
  reason: undefined
}
```

**Available Features:**
- SPL Calculator: 5 calculations per day
- Subwoofer Designer: 3 designs per day
- Support Desk: Can create tickets (with CAPTCHA)

### 2. Free Competitor

**User Context:**
```typescript
const user = {
  id: 'user-123',
  membership_type: 'competitor',
  organization_id: null
}
```

**Example Permission Checks:**

```typescript
// Enhanced SPL Calculator access
const splResult = await permissionSystem.checkPermission('user-123', {
  featureName: 'spl_calculator',
  actionName: 'view'
});

// Result:
{
  granted: true,
  conditions: { usage_limit: 50, time_window: 'daily' },
  usageToday: 23,
  tierName: 'free_competitor'
}

// Advanced features check
const advancedResult = await permissionSystem.checkPermission('user-123', {
  featureName: 'spl_calculator',
  actionName: 'view',
  subFeatureName: 'advanced_modeling'
});

// Result:
{
  granted: false,
  reason: 'sub_feature_not_allowed',
  tierName: 'free_competitor'
}
```

**Available Features:**
- SPL Calculator: 50 calculations/day + frequency analysis
- Subwoofer Designer: 25 designs/day + database access
- Team Management: Can join teams only
- Support Desk: Create tickets with normal priority

### 3. Pro Competitor

**User Context:**
```typescript
const user = {
  id: 'user-456',
  membership_type: 'pro_competitor',
  organization_id: null
}
```

**Example Permission Checks:**

```typescript
// Unlimited access
const result = await permissionSystem.checkPermission('user-456', {
  featureName: 'spl_calculator',
  actionName: 'unlimited_usage'
});

// Result:
{
  granted: true,
  conditions: {},
  tierName: 'pro_competitor'
}

// Advanced sub-features
const advancedResult = await permissionSystem.checkPermission('user-456', {
  featureName: 'spl_calculator',
  actionName: 'view',
  subFeatureName: 'optimization'
});

// Result:
{
  granted: true,
  tierName: 'pro_competitor'
}
```

**Available Features:**
- All features unlimited
- Can create and manage up to 3 teams
- Priority support tickets
- Export capabilities

### 4. Organization Employee

**User Context:**
```typescript
const user = {
  id: 'user-789',
  membership_type: 'retailer',
  organization_id: 42
}

const employee = {
  organization_id: 42,
  user_id: 'user-789',
  employee_role: 'employee',
  feature_restrictions: {
    'spl_calculator': {
      allowed_actions: ['view', 'export'],
      usage_limits: { daily_limit: 100 }
    },
    'advertisement_system': {
      allowed_actions: ['view'],
      usage_limits: {}
    }
  }
}
```

**Example Permission Checks:**

```typescript
// Organization tier access with employee restrictions
const result = await permissionSystem.checkPermission('user-789', {
  featureName: 'spl_calculator',
  actionName: 'create',
  organizationId: 42
});

// Result:
{
  granted: false,
  reason: 'action_not_allowed_by_organization',
  tierName: 'business',
  organizationRole: 'employee',
  restrictions: ['create_not_allowed']
}

// Allowed action check
const allowedResult = await permissionSystem.checkPermission('user-789', {
  featureName: 'spl_calculator',
  actionName: 'view',
  organizationId: 42
});

// Result:
{
  granted: true,
  conditions: { usage_limit: 100, time_window: 'daily' },
  usageToday: 45,
  tierName: 'business',
  organizationRole: 'employee'
}
```

### 5. Organization Admin

**User Context:**
```typescript
const user = {
  id: 'user-999',
  membership_type: 'manufacturer',
  organization_id: 42
}

const employee = {
  organization_id: 42,
  user_id: 'user-999',
  employee_role: 'admin',
  feature_restrictions: {} // No restrictions for admin
}
```

**Example Permission Checks:**

```typescript
// Full organization access
const result = await permissionSystem.checkMultiplePermissions('user-999', [
  { featureName: 'advertisement_system', actionName: 'create' },
  { featureName: 'support_desk', actionName: 'manage' },
  { featureName: 'analytics', actionName: 'analyze' },
  { featureName: 'api_access', actionName: 'view' }
]);

// Result:
{
  'advertisement_system:create': { granted: true, tierName: 'business' },
  'support_desk:manage': { granted: true, tierName: 'business' },
  'analytics:analyze': { granted: true, tierName: 'business' },
  'api_access:view': { granted: true, tierName: 'business' }
}
```

### 6. Support Representative (Platform Staff)

**User Context:**
```typescript
const user = {
  id: 'support-123',
  membership_type: 'support_rep',
  organization_id: null
}
```

**Example Permission Checks:**

```typescript
// Support desk access
const result = await permissionSystem.checkPermission('support-123', {
  featureName: 'support_desk',
  actionName: 'manage'
});

// Result:
{
  granted: true,
  tierName: 'support_rep'
}

// Customer data access
const customerResult = await permissionSystem.checkPermission('support-123', {
  featureName: 'user_management',
  actionName: 'view'
});

// Result:
{
  granted: true,
  conditions: { read_only: true },
  tierName: 'support_rep'
}

// Admin functions denied
const adminResult = await permissionSystem.checkPermission('support-123', {
  featureName: 'billing_management',
  actionName: 'edit'
});

// Result:
{
  granted: false,
  reason: 'insufficient_permissions',
  tierName: 'support_rep'
}
```

## Support Ticket Routing Examples

### Example 1: Event-Related Issue

**Ticket Creation:**
```typescript
const routingRequest = {
  requestTypeId: 'event-support-uuid',
  userId: 'user-456',
  selectedOrganizationId: null, // User didn't select
  eventId: 123,
  customFields: {
    event_name: 'Summer Car Audio Championship',
    issue_category: 'registration'
  },
  issueType: 'event',
  subject: 'Cannot complete event registration',
  description: 'Getting error when trying to pay registration fee'
};

const routing = await supportRouting.determineRouting(routingRequest);

// Result:
{
  routingType: 'organization',
  targetOrganizationId: 15, // Event organizer's ID
  priority: 'high',
  routingReason: 'event_organization_has_support',
  assignedQueue: 'Summer Events LLC Support',
  estimatedResponseTime: '1-2 hours',
  customMessage: 'Welcome to Summer Events support! We typically respond within 2 hours.'
}
```

### Example 2: Technical Issue with User Selection

**Ticket Creation:**
```typescript
const routingRequest = {
  requestTypeId: 'tech-support-uuid',
  userId: 'user-789',
  selectedOrganizationId: 42, // User explicitly selected their org
  eventId: null,
  customFields: {},
  issueType: 'technical',
  subject: 'SPL Calculator showing incorrect results',
  description: 'Advanced modeling feature giving wrong acoustic predictions'
};

const routing = await supportRouting.determineRouting(routingRequest);

// Result:
{
  routingType: 'organization',
  targetOrganizationId: 42,
  priority: 'normal',
  routingReason: 'user_selected_organization',
  assignedQueue: 'Acme Audio Corp Support',
  estimatedResponseTime: '2-6 hours'
}
```

### Example 3: Billing Issue (Internal Only)

**Ticket Creation:**
```typescript
const routingRequest = {
  requestTypeId: 'billing-uuid',
  userId: 'user-456',
  selectedOrganizationId: null,
  eventId: null,
  customFields: {
    subscription_type: 'pro_competitor',
    payment_method: 'credit_card'
  },
  issueType: 'billing',
  subject: 'Charged twice for subscription',
  description: 'Was charged twice for my pro membership this month'
};

const routing = await supportRouting.determineRouting(routingRequest);

// Result:
{
  routingType: 'internal',
  targetOrganizationId: null,
  priority: 'high',
  routingReason: 'request_type_internal_only',
  assignedQueue: 'Platform Support',
  estimatedResponseTime: '2-4 hours'
}
```

## Dynamic Feature Registration Examples

### Example 1: React Component Registration

```typescript
// In a new SPL Calculator component
import { useFeatureRegistration } from '../../utils/dynamicFeatureRegistry';

const AdvancedSPLCalculator: React.FC = () => {
  // Auto-register this feature
  useFeatureRegistration({
    name: 'advanced_spl_calculator',
    displayName: 'Advanced SPL Calculator',
    description: 'Enhanced SPL calculations with room acoustics modeling',
    category: 'calculator',
    modulePath: 'components/calculators/AdvancedSPLCalculator',
    subFeatures: [
      {
        name: 'room_modeling',
        displayName: 'Room Acoustics Modeling',
        description: 'Calculate SPL with room dimensions and materials'
      },
      {
        name: 'multi_driver_optimization',
        displayName: 'Multi-Driver Optimization',
        description: 'Optimize multiple driver configurations'
      }
    ],
    defaultPermissions: [
      {
        tierName: 'pro_competitor',
        actions: ['view', 'calculate', 'export'],
        conditions: { usage_limit: 25 }
      },
      {
        tierName: 'business',
        actions: ['view', 'calculate', 'export', 'unlimited_usage']
      }
    ]
  });

  return (
    <div>
      {/* Component content */}
    </div>
  );
};
```

### Example 2: API Endpoint Registration

```typescript
// In API route handler
import { featureRegistry } from '../../../utils/dynamicFeatureRegistry';

export async function POST(request: Request) {
  // Register this API feature
  await featureRegistry.registerFeature({
    name: 'bulk_event_import',
    displayName: 'Bulk Event Import',
    description: 'Import multiple events from CSV/Excel files',
    category: 'api',
    modulePath: 'api/events/bulk-import',
    apiEndpoints: ['/api/events/bulk-import'],
    defaultPermissions: [
      {
        tierName: 'organization',
        actions: ['create', 'import'],
        conditions: { file_size_limit: 10485760 } // 10MB
      }
    ]
  });

  // API logic here...
}
```

## Organization Seat Management Examples

### Example 1: Adding Employee Near Seat Limit

```typescript
const orgId = 42;
const seatCheck = await permissionSystem.checkSeatAvailability(orgId);

console.log(seatCheck);
// Result:
{
  available: true,
  seatsUsed: 24,
  seatLimit: 25,
  canAddEmployee: true
}

// Add employee (will succeed)
const result = await permissionSystem.addOrganizationEmployee(
  orgId,
  'new-user-123',
  'employee',
  'admin-user-456',
  {
    'advertisement_system': {
      allowed_actions: ['view'],
      usage_limits: { daily_limit: 5 }
    }
  }
);

// Result:
{ success: true }

// Check seats after adding
const newSeatCheck = await permissionSystem.checkSeatAvailability(orgId);
// Result:
{
  available: false,
  seatsUsed: 25,
  seatLimit: 25,
  canAddEmployee: false
}
```

### Example 2: Employee Restriction Override

```typescript
// Organization admin restricts employee access
const restrictions = {
  'spl_calculator': {
    allowed_actions: ['view'], // No create/edit
    usage_limits: { daily_limit: 10 }
  },
  'support_desk': {
    allowed_actions: ['create'], // Can create tickets but not manage
    usage_limits: {}
  }
};

await permissionSystem.updateEmployeeRestrictions(
  42, // orgId
  'employee-user-789',
  restrictions,
  'admin-user-456'
);

// Now when employee tries to create SPL calculation
const result = await permissionSystem.checkPermission('employee-user-789', {
  featureName: 'spl_calculator',
  actionName: 'create',
  organizationId: 42
});

// Result:
{
  granted: false,
  reason: 'action_not_allowed_by_organization',
  tierName: 'business',
  organizationRole: 'employee',
  restrictions: ['create_action_restricted']
}
```

## Usage Tracking Examples

### Example 1: Daily Limit Tracking

```typescript
// User has used 4 out of 5 daily calculations
const result = await permissionSystem.checkPermission('public-user', {
  featureName: 'spl_calculator',
  actionName: 'view'
});

// Result:
{
  granted: true,
  conditions: { usage_limit: 5 },
  usageToday: 4,
  tierName: 'public'
}

// After successful calculation, log usage
await permissionSystem.logUsage(
  'public-user',
  'spl_calculator',
  'view',
  'basic_calculations',
  { 
    calculation_type: 'sealed_box',
    driver_count: 2,
    box_volume: 1.5 
  }
);

// Next check will show limit reached
const nextResult = await permissionSystem.checkPermission('public-user', {
  featureName: 'spl_calculator',
  actionName: 'view'
});

// Result:
{
  granted: false,
  reason: 'usage_limit_exceeded',
  conditions: {
    restriction_reason: 'usage_limit_exceeded',
    daily_usage: 5,
    daily_limit: 5
  },
  usageToday: 5,
  tierName: 'public'
}
```

### Example 2: Organization Usage Analytics

```typescript
// Get organization-wide usage summary
const employees = await permissionSystem.getOrganizationEmployees(42);
const usageSummary = {
  totalEmployees: employees.length,
  activeEmployees: employees.filter(e => e.status === 'active').length,
  featureUsage: {
    spl_calculator: 245, // Total uses this month
    advertisement_system: 67,
    support_desk: 23
  },
  topUsers: [
    { name: 'John Doe', usage: 89 },
    { name: 'Jane Smith', usage: 76 }
  ]
};
```

This hierarchical permission system provides:

1. **Flexible Access Control**: Different permission levels based on user type and organization membership
2. **Employee Restrictions**: Organization admins can limit what their employees can do
3. **Smart Support Routing**: Context-aware ticket routing based on user, event, and organization relationships
4. **Dynamic Feature Detection**: Automatically discover and register new features for permission assignment
5. **Seat-Based Licensing**: Track and enforce organization employee limits
6. **Usage Analytics**: Monitor feature usage for billing and optimization
7. **Granular Permissions**: Control access at feature, sub-feature, and action levels