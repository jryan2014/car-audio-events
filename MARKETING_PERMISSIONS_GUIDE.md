# Marketing/Advertising Permissions Guide

## Two-Tier Ad System: AI Creation vs Manual Upload

### AI Ad Creation (Premium Feature)
Actions that use AI to generate ads automatically:
- `ai_create_728x90` - AI generates 728x90 banner ads
- `ai_create_300x250` - AI generates 300x250 medium rectangle ads
- `ai_create_160x600` - AI generates 160x600 skyscraper ads
- `ai_create_320x50` - AI generates 320x50 mobile banner ads

**Who Gets AI Access:**
- ❌ Public - No access
- ❌ Free - No access
- ❌ Competitor - No access
- ❌ Pro Competitor - No access
- ✅ Retailer - Limited AI (728x90, 300x250)
- ✅ Manufacturer - Most AI sizes
- ✅ Organization - All AI sizes

### Manual Upload (Basic Feature)
Actions for uploading pre-made ads:
- `upload_728x90` - Upload existing 728x90 banner ads
- `upload_300x250` - Upload existing 300x250 ads
- `upload_160x600` - Upload existing 160x600 ads
- `upload_320x50` - Upload existing 320x50 ads
- `submit_for_approval` - Submit uploaded ads for review

**Who Gets Upload Access:**
- ❌ Public - No access
- ❌ Free - No access
- ❌ Competitor - View analytics only
- ✅ Pro Competitor - Can upload basic sizes (728x90, 300x250)
- ✅ Retailer - Can upload most sizes
- ✅ Manufacturer - Can upload all sizes
- ✅ Organization - Can upload all sizes

### Approval Workflow
- `submit_for_approval` - Ads go to review queue
- `auto_approve` - Ads bypass review (trusted tiers only)

**Auto-Approval Privilege:**
- Only Manufacturer and Organization tiers
- All others must submit for review

## Permission Breakdown by Tier

### Public & Free
- No advertising features

### Competitor
- `view_analytics` - Can see ad performance data only

### Pro Competitor
- `view_analytics` - View ad performance
- `upload_728x90` - Upload banner ads
- `upload_300x250` - Upload medium rectangles
- `submit_for_approval` - Must submit for review

### Retailer
- Everything Pro Competitor has, PLUS:
- `upload_160x600` - Upload skyscraper ads
- `ai_create_728x90` - AI banner creation
- `ai_create_300x250` - AI medium rectangle creation

### Manufacturer
- Everything Retailer has, PLUS:
- `upload_320x50` - Upload mobile banners
- `ai_create_160x600` - AI skyscraper creation
- `auto_approve` - Bypass review process
- `manage_campaigns` - Campaign management
- `create_newsletter` - Newsletter creation

### Organization
- Everything Manufacturer has, PLUS:
- `ai_create_320x50` - AI mobile banner creation
- `send_campaign` - Send marketing campaigns
- `manage_subscribers` - Subscriber list management

## Usage Limits Configuration

When setting limits, consider:
- **AI Creation**: More expensive, lower limits
  - Example: Retailer gets 5 AI ads/month
  - Example: Organization gets 20 AI ads/month

- **Manual Upload**: Cheaper, higher limits
  - Example: Pro Competitor gets 10 uploads/month
  - Example: Organization gets 100 uploads/month

## Key Distinctions

1. **AI vs Upload**: AI creation is a premium feature for higher tiers
2. **Approval Required**: Lower tiers must submit for approval
3. **Ad Sizes**: More sizes available at higher tiers
4. **Campaign Management**: Only top tiers can manage full campaigns

This structure creates clear upgrade paths:
- Want AI? Upgrade to Retailer+
- Want auto-approval? Upgrade to Manufacturer+
- Want full campaign management? Upgrade to Organization