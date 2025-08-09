# Comprehensive Tiered Permission System Design

## Executive Summary

This document outlines a complete tiered permission system for the Car Audio Events platform that provides granular access control over features and sub-features. The system supports dynamic permission checking, usage tracking, and administrative management while maintaining backward compatibility with the existing membership system.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [Permission Checking Architecture](#permission-checking-architecture)
4. [Usage Tracking & Billing Integration](#usage-tracking--billing-integration)
5. [Admin Management Interface](#admin-management-interface)
6. [Migration Strategy](#migration-strategy)
7. [Implementation Examples](#implementation-examples)
8. [API Documentation](#api-documentation)
9. [Security Considerations](#security-considerations)
10. [Performance Optimization](#performance-optimization)

## System Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Components                           │
│  - useTieredPermissions Hook                                    │
│  - PermissionGate Component                                     │  
│  - Feature-specific Components (SPL Calculator, etc.)           │
└────────────────────┬───────────────────────────┬────────────────┘
                     │                           │
                     ▼                           ▼
┌─────────────────────────────┐     ┌───────────────────────────┐
│   Edge Functions (API)      │     │   Database Layer          │
│  - permission-service       │     │  - Permission Tables      │
│  - track-usage              │     │  - Usage Tracking         │
│  - admin-management         │     │  - Audit Logs            │
└─────────────┬───────────────┘     └───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                           │
│  - Permission Resolution Engine                                 │
│  - Usage Limit Enforcement                                      │
│  - Tier Assignment Logic                                       │
│  - Condition Evaluation                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Granular Control**: Features can have sub-features, and both can have action-specific permissions
2. **Flexible Tiers**: Users can have different tiers for different features
3. **Usage Tracking**: Built-in usage tracking for billing and analytics
4. **Condition Support**: Permissions can have conditions (usage limits, time restrictions, etc.)
5. **Organization Support**: Organizations can override individual user permissions
6. **Admin Flexibility**: Complete administrative control over all permission aspects

## Database Schema

### Core Tables

#### Permission Tiers
```sql
CREATE TABLE permission_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,           -- 'public', 'basic', 'pro', etc.
    display_name VARCHAR(150) NOT NULL,          -- 'Public Access', 'Basic Plan', etc.
    description TEXT,
    priority_level INTEGER NOT NULL DEFAULT 0,   -- Higher = more permissions
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Features & Sub-Features
```sql
CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,           -- 'spl_calculator', 'subwoofer_designer'
    display_name VARCHAR(150) NOT NULL,          -- 'SPL Calculator', 'Subwoofer Designer'
    description TEXT,
    category VARCHAR(100),                       -- 'calculator', 'design', 'support'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sub_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,                  -- 'basic_calculations', 'advanced_modeling'
    display_name VARCHAR(150) NOT NULL,          -- 'Basic Calculations', 'Advanced Modeling'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(feature_id, name)
);
```

#### Permission Actions
```sql
CREATE TABLE permission_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,           -- 'view', 'create', 'export', 'unlimited_usage'
    display_name VARCHAR(150) NOT NULL,          -- 'View Access', 'Create Items', 'Export Data'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Permission Configuration
```sql
CREATE TABLE tier_feature_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_id UUID NOT NULL REFERENCES permission_tiers(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES permission_actions(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT TRUE,
    conditions JSONB,                            -- {"usage_limit": 50, "expires_after": "30d"}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tier_id, feature_id, action_id)
);

CREATE TABLE tier_sub_feature_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_id UUID NOT NULL REFERENCES permission_tiers(id) ON DELETE CASCADE,
    sub_feature_id UUID NOT NULL REFERENCES sub_features(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES permission_actions(id) ON DELETE CASCADE,
    is_granted BOOLEAN DEFAULT TRUE,
    conditions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tier_id, sub_feature_id, action_id)
);
```

#### User & Organization Assignments
```sql
CREATE TABLE user_tier_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES permission_tiers(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,         -- Optional expiration
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    UNIQUE(user_id, feature_id)
);

CREATE TABLE organization_tier_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id INTEGER NOT NULL,            -- References organizations table
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    tier_id UUID NOT NULL REFERENCES permission_tiers(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    UNIQUE(organization_id, feature_id)
);
```

#### Usage Tracking
```sql
CREATE TABLE feature_usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    sub_feature_id UUID REFERENCES sub_features(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES permission_actions(id) ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 1,
    usage_data JSONB,                            -- Store calculation results, file sizes, etc.
    usage_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE monthly_feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    year_month DATE NOT NULL,                    -- First day of month
    total_usage INTEGER DEFAULT 0,
    unique_actions INTEGER DEFAULT 0,
    usage_data JSONB,                            -- Aggregated metrics
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, feature_id, year_month)
);
```

### Permission Resolution Priority

1. **Individual User Assignment** (highest priority)
2. **Organization Assignment** (if user belongs to organization)
3. **Membership Plan Defaults** (fallback based on user's membership type)
4. **Public Tier** (lowest priority, for unauthenticated users)

## Permission Checking Architecture

### Permission Resolution Engine

```typescript
interface PermissionCheck {
  userId: string;
  feature: string;
  subFeature?: string;
  action: string;
  organizationId?: number;
}

interface PermissionResult {
  hasPermission: boolean;
  tier: string;
  conditions?: Record<string, any>;
  usageRemaining?: number;
  reason: string;
}
```

### Resolution Process

1. **Validate Input**: Ensure all required parameters are present
2. **Admin Override**: Admin users get all permissions automatically
3. **Get Feature/Action IDs**: Resolve string names to database IDs
4. **Find User Tier**: Check in order of priority (individual → org → default)
5. **Check Permission**: Query tier permissions for the specific combination
6. **Evaluate Conditions**: Check usage limits, expiration dates, etc.
7. **Return Result**: Structured permission result with metadata

### Edge Functions

#### permission-service
- **Purpose**: Central permission checking service
- **Input**: User ID, feature, sub-feature (optional), action, organization ID (optional)
- **Output**: Permission result with tier, conditions, and usage information
- **Performance**: Sub-100ms response time with database indexing

#### track-usage
- **Purpose**: Record feature usage for billing and analytics
- **Input**: User ID, feature, sub-feature, action, usage data, count
- **Output**: Success status and updated usage totals
- **Features**: Automatic monthly aggregation, duplicate handling

## Usage Tracking & Billing Integration

### Daily Usage Tracking

```json
{
  "user_id": "uuid",
  "feature_id": "uuid", 
  "sub_feature_id": "uuid",
  "action_id": "uuid",
  "usage_count": 1,
  "usage_data": {
    "calculation_type": "advanced_modeling",
    "input_parameters": {...},
    "result_complexity": "high"
  },
  "usage_date": "2025-01-08"
}
```

### Monthly Aggregations

- **Automatic Summarization**: Daily usage automatically aggregated monthly
- **Performance Optimization**: Reduces query load for analytics and billing
- **Billing Integration**: Monthly summaries used for overage billing calculations

### Condition Types

1. **Usage Limits**: `{"usage_limit": 50}` - Daily usage limits
2. **Time Restrictions**: `{"expires_after": "30d"}` - Time-based access
3. **Feature Conditions**: `{"requires_verification": true}` - Additional requirements
4. **Billing Conditions**: `{"overage_rate": 0.10}` - Pricing for usage above limits

## Admin Management Interface

### TieredPermissionManager Component

Features:
- **Permission Matrix View**: Visual grid of tiers vs features/actions
- **Real-time Toggle**: Instant permission grant/revoke
- **Bulk Operations**: Assign permissions to multiple tiers simultaneously
- **Usage Analytics**: View usage patterns and limits across the platform
- **Tier Management**: Create, edit, and deactivate permission tiers
- **Feature Management**: Add new features and sub-features to the system

### Admin Capabilities

1. **Global Permission Management**: 
   - Configure tier permissions for all features
   - Set usage limits and conditions
   - Create custom tiers for special cases

2. **User Override Management**:
   - Assign individual users to specific tiers
   - Override default membership plan permissions
   - Set expiration dates for temporary access

3. **Organization Management**:
   - Configure organization-wide permissions
   - Override member permissions at the org level
   - Track organization usage and billing

4. **Analytics & Reporting**:
   - Usage reports by feature, user, and organization
   - Permission utilization analysis
   - Billing and overage reporting

## Migration Strategy

### Phase 1: Database Migration
1. **Deploy Schema**: Run migration files to create new tables
2. **Populate Base Data**: Insert tiers, features, actions, and default permissions
3. **Map Existing Users**: Assign users to appropriate tiers based on current membership types
4. **Data Validation**: Verify all existing users have appropriate permissions

### Phase 2: API Integration  
1. **Deploy Edge Functions**: Deploy permission-service and track-usage functions
2. **Test Permission Checking**: Validate permission resolution for all user types
3. **Test Usage Tracking**: Ensure usage recording works correctly
4. **Performance Testing**: Verify sub-100ms response times

### Phase 3: Frontend Integration
1. **Deploy Hooks**: Deploy useTieredPermissions hook and utilities
2. **Update Components**: Integrate permission checking into existing features
3. **Add Permission Gates**: Implement visual permission restrictions
4. **User Testing**: Validate user experience across all permission levels

### Phase 4: Admin Tools
1. **Deploy Admin Interface**: TieredPermissionManager component
2. **Admin Training**: Train administrators on new permission system
3. **Documentation**: Provide admin documentation and guides
4. **Monitoring**: Set up alerts for permission errors and usage spikes

### Backward Compatibility

- **Existing Users**: All existing users automatically get appropriate tier assignments
- **API Compatibility**: Existing permission check methods remain functional
- **Graceful Degradation**: System falls back to old permissions if new system fails

## Implementation Examples

### SPL Calculator Implementation

The SPL Calculator demonstrates all three permission tiers:

#### Public Tier (Unauthenticated Users)
- **Access**: Basic calculations only
- **Limits**: 5 calculations per day
- **Restrictions**: No export, no advanced features, no history

#### Free Competitor Tier
- **Access**: Basic calculations + frequency analysis + historical tracking
- **Limits**: 50 calculations per day, 20 frequency analyses, 10 exports
- **Features**: Save calculation history, basic export functionality

#### Pro Competitor Tier  
- **Access**: All features including advanced modeling and optimization
- **Limits**: Unlimited usage
- **Features**: AI-powered optimization, complex acoustic modeling, unlimited export

### Permission Gate Component

```typescript
const PermissionGate: React.FC<{
  hasPermission: boolean;
  children: React.ReactNode;
  upgradeMessage?: string;
  usageRemaining?: number;
  usageLimit?: number;
}> = ({ hasPermission, children, upgradeMessage, usageRemaining, usageLimit }) => {
  if (!hasPermission) {
    return (
      <div className="permission-gate-locked">
        <div className="upgrade-prompt">
          <Lock className="icon" />
          <p>{upgradeMessage || 'This feature requires a higher subscription tier'}</p>
          <button className="upgrade-button">Upgrade Plan</button>
        </div>
        <div className="content-preview-blurred">{children}</div>
      </div>
    );
  }

  return (
    <div className="permission-gate-unlocked">
      {children}
      {usageRemaining !== undefined && usageLimit !== undefined && (
        <div className="usage-indicator">
          <AlertCircle />
          <span>{usageRemaining} / {usageLimit} uses remaining today</span>
        </div>
      )}
    </div>
  );
};
```

### Usage Tracking Example

```typescript
const handleAdvancedCalculation = async () => {
  // Check permission and track usage in one call
  const result = await permissions.checkAndTrack(
    { feature: 'spl_calculator', subFeature: 'advanced_modeling', action: 'view' },
    { 
      calculationType: 'advanced',
      parameters: calculationData,
      complexity: 'high'
    }
  );

  if (result.canProceed) {
    // Perform the calculation
    performAdvancedCalculation();
  } else {
    // Show upgrade prompt
    showUpgradeModal(result.reason);
  }
};
```

## API Documentation

### Permission Check API

**Endpoint**: `POST /functions/v1/permission-service`

**Request Body**:
```json
{
  "userId": "uuid",
  "feature": "spl_calculator", 
  "subFeature": "advanced_modeling",
  "action": "view",
  "organizationId": 123
}
```

**Response**:
```json
{
  "hasPermission": true,
  "tier": "pro_competitor",
  "conditions": {
    "usage_limit": 100
  },
  "usageRemaining": 85,
  "reason": "Sub-feature permission granted"
}
```

### Usage Tracking API

**Endpoint**: `POST /functions/v1/track-usage`

**Request Body**:
```json
{
  "userId": "uuid",
  "feature": "spl_calculator",
  "subFeature": "advanced_modeling", 
  "action": "view",
  "usageData": {
    "calculationType": "advanced",
    "processingTime": 1.5,
    "inputComplexity": "high"
  },
  "usageCount": 1
}
```

**Response**:
```json
{
  "success": true,
  "total_usage": 16,
  "message": "Usage tracked successfully"
}
```

## Security Considerations

### Row Level Security (RLS)

All permission tables have RLS policies:

1. **Configuration Tables**: Admin-only access for management
2. **User Assignments**: Users can view their own, admins can manage all
3. **Usage Tracking**: Users can view their own data, admins can view all
4. **Organization Data**: Organization members can view org permissions

### API Security

1. **Authentication Required**: All API calls require valid Supabase JWT
2. **Input Validation**: Comprehensive validation of all input parameters
3. **Rate Limiting**: Built-in rate limiting to prevent abuse
4. **Audit Logging**: All permission changes and usage tracking logged

### Data Privacy

1. **Usage Data Anonymization**: Personal data removed from usage analytics
2. **GDPR Compliance**: Users can request deletion of usage data
3. **Data Retention**: Automatic cleanup of old usage tracking data

## Performance Optimization

### Database Optimization

#### Indexes
```sql
-- Core permission checking indexes
CREATE INDEX idx_user_tier_assignments_user_feature ON user_tier_assignments(user_id, feature_id) WHERE is_active = TRUE;
CREATE INDEX idx_tier_feature_perms_lookup ON tier_feature_permissions(tier_id, feature_id, action_id) WHERE is_granted = TRUE;
CREATE INDEX idx_tier_sub_feature_perms_lookup ON tier_sub_feature_permissions(tier_id, sub_feature_id, action_id) WHERE is_granted = TRUE;

-- Usage tracking indexes  
CREATE INDEX idx_feature_usage_user_date ON feature_usage_tracking(user_id, usage_date);
CREATE INDEX idx_monthly_usage_lookup ON monthly_feature_usage(user_id, feature_id, year_month);
```

#### Query Optimization
- **Single Query Resolution**: Permission checking requires only 2-3 database queries
- **Batch Processing**: Usage tracking supports bulk inserts and updates
- **Connection Pooling**: Edge Functions use connection pooling for performance

### Caching Strategy

1. **Frontend Caching**: React hook caches permissions for 5 minutes
2. **Edge Function Caching**: Database results cached in memory
3. **CDN Caching**: Static permission configuration cached at CDN level

### Performance Targets

- **Permission Check**: Sub-100ms response time
- **Usage Tracking**: Sub-50ms response time
- **Admin Interface**: Sub-200ms for management operations
- **Database Load**: <5ms query times with proper indexing

## Monitoring & Analytics

### System Metrics

1. **Permission Check Performance**: Response times and error rates
2. **Usage Tracking Volume**: Daily/monthly usage recording volume
3. **Feature Adoption**: Track which features are most used by tier
4. **Conversion Metrics**: Track upgrades driven by permission restrictions

### Business Intelligence

1. **Feature Usage Analytics**: Understand which features drive subscriptions
2. **User Journey Analysis**: Track progression through permission tiers
3. **Revenue Attribution**: Connect permission-driven upgrades to revenue
4. **A/B Testing Support**: Test different permission configurations

## Conclusion

This tiered permission system provides a comprehensive, scalable solution for granular access control across the Car Audio Events platform. The system supports complex business logic while maintaining high performance and administrative flexibility. The implementation follows security best practices and provides detailed analytics for business optimization.

The system is designed to grow with the platform, supporting new features, tiers, and business models as they evolve. The administrative interface provides complete control over permissions without requiring code changes, making it easy to adapt to changing business requirements.

## Next Steps

1. **Review and Approve**: Review this design with stakeholders
2. **Implementation Planning**: Create detailed implementation timeline  
3. **Testing Strategy**: Develop comprehensive testing plan
4. **User Documentation**: Create user guides for new permission features
5. **Admin Training**: Plan training for administrators on new system