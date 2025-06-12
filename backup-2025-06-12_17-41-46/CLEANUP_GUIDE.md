# Car Audio Events - Production Cleanup Guide

## Overview
This guide will help you remove mock data and set up your platform with real content for production use.

## ✅ Already Completed
- **Footer Navigation**: Now fully dynamic through CMS
- **Contact Us Link**: Fixed to work with CMS pages
- **Duplicate Links**: Eliminated duplicate Privacy Policy and Terms links

## 🔧 Required Actions

### 1. Essential CMS Pages Setup
**Action Required**: Create these pages in your admin panel at `http://localhost:5173/admin/cms-pages`

#### Privacy Policy
- **Title**: Privacy Policy
- **Slug**: privacy-policy
- **Navigation Placement**: Footer
- **Footer Section**: Legal
- **Status**: Published
- **Content**: Update with your actual privacy policy

#### Terms of Service
- **Title**: Terms of Service
- **Slug**: terms-of-service
- **Navigation Placement**: Footer
- **Footer Section**: Legal
- **Status**: Published
- **Content**: Update with your actual terms

#### About Us
- **Title**: About Us
- **Slug**: about-us
- **Navigation Placement**: Footer
- **Footer Section**: Company
- **Status**: Published
- **Content**: Your company's story and mission

#### Help Center
- **Title**: Help Center
- **Slug**: help-center
- **Navigation Placement**: Footer
- **Footer Section**: Support
- **Status**: Published
- **Content**: User help and FAQ content

### 2. Contact Information Update
**Current Issue**: Footer shows placeholder text
**Action**: Update the Footer component with real contact info or create a settings system

**Files to Update**:
- `src/components/Footer.tsx` - Replace placeholder contact info

### 3. Database Mock Data Cleanup
**Issues Found**: Extensive mock data in database migrations

**Files with Mock Data**:
- `consolidated_migration.sql` - Contains sample events, organizations, users
- `supabase/migrations/20250609020224_shrill_heart.sql` - Sample membership plans and users
- `database/migrations/create_cms_pages_table.sql` - Sample CMS pages
- `supabase/migrations/20250608132857_broad_gate.sql` - Sample events and organizations

**Recommended Actions**:
1. Keep the table structure but remove INSERT statements for sample data
2. Keep essential data like event_categories and membership_plans
3. Remove sample users, events, and organizations

### 4. Frontend Mock Data Removal
**Files with Mock/Fallback Data**:

#### Admin Dashboard (`src/pages/AdminDashboard.tsx`)
- Line 176+: Mock dashboard statistics
- **Action**: Remove mock data, show loading states instead

#### Admin Users (`src/pages/AdminUsers.tsx`)
- Line 195+: Mock user data
- **Action**: Remove mock users, show empty state when no data

#### Dashboard (`src/pages/Dashboard.tsx`)
- Line 172+: Mock upcoming events
- Line 278+: Mock user statistics
- **Action**: Show empty states instead of mock data

#### Google Map (`src/components/GoogleMap.tsx`)
- Line 576+: Mock events for map display
- **Action**: Show empty map when no real events exist

#### Ad Management (`src/pages/AdManagement.tsx`)
- Line 88+: Mock advertisement data
- **Action**: Show empty state for new installations

### 5. Configuration Updates

#### Environment Variables
Update these with real values:
```env
# Contact Information
VITE_CONTACT_EMAIL=your-email@domain.com
VITE_CONTACT_PHONE=+1-XXX-XXX-XXXX
VITE_COMPANY_ADDRESS=Your Address

# Social Media
VITE_FACEBOOK_URL=https://facebook.com/yourpage
VITE_TWITTER_URL=https://twitter.com/yourhandle
VITE_INSTAGRAM_URL=https://instagram.com/yourhandle
VITE_YOUTUBE_URL=https://youtube.com/yourchannel
```

### 6. Content Updates Needed

#### Replace Placeholder Content:
1. **Company Description**: Footer brand description
2. **Contact Information**: Email and phone numbers
3. **Social Media Links**: Update with real social profiles
4. **Email Templates**: Any email content with placeholder text
5. **Meta Tags**: Update default meta descriptions

#### Update Branding:
1. **Logo**: Replace any placeholder logos
2. **Brand Colors**: Ensure consistent brand colors
3. **Company Name**: Verify all references are correct

### 7. Database Migration Cleanup

**Recommended Approach**:
1. Create a new clean migration file
2. Keep essential reference data (categories, default settings)
3. Remove all sample users, events, organizations
4. Keep table structures and constraints

### 8. Testing Data vs Production Data

**Current State**: Mix of real and mock data
**Goal**: Clean separation between development and production

**Action Items**:
1. Create separate seed files for development vs production
2. Use environment-based data loading
3. Clear instructions for initial production setup

## 🚀 Production Readiness Checklist

### Data Cleanup
- [ ] Remove mock users from database
- [ ] Remove sample events and organizations
- [ ] Create essential CMS pages
- [ ] Update contact information
- [ ] Test all footer links work correctly

### Content Updates
- [ ] Write real privacy policy and terms
- [ ] Create about us content
- [ ] Set up help center with real FAQ
- [ ] Update all meta descriptions
- [ ] Replace placeholder text throughout

### Configuration
- [ ] Set real contact information
- [ ] Update social media links
- [ ] Configure email settings
- [ ] Set up real payment processing
- [ ] Configure domain and SSL

### Testing
- [ ] Test all navigation links
- [ ] Verify CMS page creation works
- [ ] Test footer displays correctly
- [ ] Confirm no mock data appears in production
- [ ] Test user registration and login flows

## 🛠️ Technical Implementation

### Quick Wins (Do First)
1. ✅ Footer navigation (already complete)
2. Create essential CMS pages
3. Update contact information
4. Remove admin dashboard mock data

### Medium Priority
1. Clean up database sample data
2. Update all placeholder content
3. Configure real social media links

### Low Priority
1. Optimize loading states
2. Enhanced error handling
3. Performance improvements

## 📝 Notes
- Keep this document updated as you complete tasks
- Test each change in development before deploying
- Consider creating a staging environment for testing
- Document any custom changes you make 