# DATABASE SCHEMA REFERENCE
## Car Audio Events Platform - Complete Database Documentation

> **⚠️ CRITICAL:** This file must be updated with EVERY database change. All AI agents MUST reference and update this document when making schema modifications.

### 📊 **Database Overview**
- **Platform**: Supabase (PostgreSQL)
- **Current Schema Version**: 2025-06-16 (Post-Emergency-Restore)
- **Total Tables**: 45+ tables
- **Security Model**: Row Level Security (RLS) with membership-based policies
- **Last Updated**: 2025-06-16 (Emergency restore from backup)

---

## 🎯 **MEMBERSHIP HIERARCHY & ACCESS LEVELS**

### **User Access Levels (Low → High Permissions):**
1. **Anonymous/Public** - Browse only, view public content
2. **Free Registered** - Limited interaction, basic profile
3. **Pro Competitor** - Can purchase directory listings, competition features
4. **Retailer** - Directory listings, retail-specific features
5. **Manufacturer** - Enhanced business features, priority listings
6. **Organization** - Highest member tier, organization management
7. **Admin** - System administration, full access

---

## 📋 **CORE TABLES STRUCTURE**

### **🔐 Authentication & User Management**

#### **`users`** (Core user accounts)
```sql
- id (uuid, PK) - Primary identifier
- email (varchar) - User email address  
- name (varchar) - Display name
- membershipType (varchar) - Membership level
- status (varchar) - Account status
- verificationStatus (varchar) - Account verification
- location (text) - Geographic location
- bio (text) - User biography
- profileImage (text) - Profile photo URL
- carImages (jsonb) - Car photo URLs
- socialLinks (jsonb) - Social media links
- privacySettings (jsonb) - Privacy configuration
- created_at, updated_at (timestamps)
```

#### **`profiles`** (Extended user information)
```sql
- id (uuid, PK)
- user_id (uuid, FK → users.id)
- display_name (varchar)
- bio (text)
- avatar_url (text)
- website (text)
- location (text)
- privacy_settings (jsonb)
- created_at, updated_at (timestamps)
```

### **🎪 Event Management**

#### **`events`** (Competition events)
```sql
- id (uuid, PK)
- title (varchar) - Event name
- description (text) - Event details
- start_date (timestamp) - Event start
- end_date (timestamp) - Event end
- location (text) - Event venue
- address (text) - Physical address
- coordinates (point) - GPS coordinates
- category_id (uuid, FK → event_categories.id)
- organizer_id (uuid, FK → users.id)
- registration_required (boolean)
- registration_fee (decimal)
- max_participants (integer)
- status (varchar) - Event status
- image_url (text) - Event banner
- rules (text) - Competition rules
- prizes (jsonb) - Prize information
- created_by (uuid, FK → users.id)
- created_at, updated_at (timestamps)
```

#### **`event_categories`** (Event classification)
```sql
- id (uuid, PK)
- name (varchar) - Category name
- description (text) - Category description
- color (varchar) - Display color
- icon (varchar) - Icon identifier
- is_active (boolean)
- created_at, updated_at (timestamps)
```

### **📢 Advertisement System**

#### **`advertisements`** (Advertisement management)
```sql
- id (uuid, PK)
- title (varchar) - Ad title
- content (text) - Ad content
- image_urls (jsonb) - Advertisement images
- link_url (text) - Target URL
- placement_type (varchar) - Where ad appears
- priority (integer) - Display priority
- start_date (timestamp) - Campaign start
- end_date (timestamp) - Campaign end
- budget (decimal) - Total budget
- spent (decimal) - Amount spent
- clicks (integer) - Click count
- impressions (integer) - View count
- status (varchar) - Ad status
- advertiser_id (uuid, FK → users.id)
- created_at, updated_at (timestamps)
```

#### **`advertisement_images`** (Ad image variants)
```sql
- id (uuid, PK)
- advertisement_id (uuid, FK → advertisements.id)
- image_url (text) - Image URL
- alt_text (text) - Alt text
- display_order (integer) - Sort order
- is_primary (boolean) - Primary image flag
- created_at (timestamp)
```

### **📂 Directory System**

#### **`directory_listings`** (Business/member directory)
```sql
- id (uuid, PK)
- business_name (varchar) - Business name
- description (text) - Business description
- category_id (uuid, FK → directory_categories.id)
- owner_id (uuid, FK → users.id)
- contact_email (varchar)
- contact_phone (varchar)
- website_url (text)
- address (text) - Physical address
- coordinates (point) - GPS location
- business_hours (jsonb) - Operating hours
- services (jsonb) - Services offered
- pricing_info (jsonb) - Pricing details
- images (jsonb) - Business photos
- verification_status (varchar)
- rating (decimal) - Average rating
- review_count (integer) - Number of reviews
- is_featured (boolean) - Featured listing
- membership_required (varchar) - Required membership
- status (varchar) - Listing status
- created_at, updated_at (timestamps)
```

### **⚙️ System Configuration**

#### **`admin_settings`** (System configuration)
```sql
- id (uuid, PK)
- setting_key (varchar, UNIQUE) - Configuration key
- setting_value (text) - Configuration value
- description (text) - Setting description
- is_sensitive (boolean) - Sensitive data flag
- category (varchar) - Setting category
- data_type (varchar) - Value data type
- created_at, updated_at (timestamps)
```

#### **`navigation_menu_items`** (Dynamic navigation)
```sql
- id (uuid, PK)
- title (varchar) - Menu item title
- href (text) - Target URL
- icon (varchar) - Icon identifier
- nav_order (integer) - Sort order
- parent_id (uuid, FK → navigation_menu_items.id)
- target_blank (boolean) - Open in new tab
- visibility_rules (jsonb) - Who can see
- is_active (boolean) - Active status
- membership_context (varchar) - Required membership
- badge_text (varchar) - Badge text
- badge_color (varchar) - Badge color
- description (text) - Item description
- created_at, updated_at (timestamps)
```

---

## 🔒 **SECURITY POLICIES (CURRENT STATE)**

### **🚨 Current Security Issues (42 Total)**

#### **CRITICAL ERRORS (5 tables):**
- `advertisements` - Has policies but RLS disabled ❌
- `event_categories` - Has policies but RLS disabled ❌  
- `events` - Has policies but RLS disabled ❌
- `profiles` - Has policies but RLS disabled ❌
- `users` - Has policies but RLS disabled ❌

#### **HIGH RISK (10 tables):**
- `admin_settings` - No RLS, complete exposure ❌
- `advertisement_analytics` - No RLS ❌
- `backup_configurations` - No RLS ❌
- `cms_pages` - No RLS ❌
- `contact_submissions` - No RLS ❌
- `directory_listings` - No RLS ❌
- `email_templates` - No RLS ❌
- `navigation_menu_items` - No RLS ❌
- `organization_listings` - No RLS ❌
- `team_images` - RLS enabled but no policies ❌

#### **FUNCTION SECURITY (32 functions):**
- All functions have mutable search_path (security risk) ⚠️

### **🎯 Planned Security Model**

#### **Public Access (Anonymous + Authenticated):**
```sql
-- Events: Public viewing, restricted creation
events: READ (all), WRITE (admin/retailer/manufacturer/organization)
event_categories: READ (all), WRITE (admin)
advertisements: READ (all), WRITE (advertiser owns, admin manages)
```

#### **Membership-Based Access:**
```sql
-- Directory: Tiered access based on membership
directory_listings: 
  - READ: Public (basic info), Members (detailed info)
  - WRITE: Retailer/Manufacturer (own listings), Pro Competitors (paid)
  
-- User Data: Privacy-controlled
users/profiles:
  - READ: Public fields (if user allows), Member fields (authenticated)
  - WRITE: Own data only, Admin (moderation)
```

#### **Admin-Only Access:**
```sql
-- System Configuration
admin_settings: Admin exclusive
email_templates: Admin exclusive  
backup_configurations: Admin exclusive
navigation_menu_items: Admin exclusive
```

---

## 🔧 **DATABASE FUNCTIONS**

### **Security Functions**
- `get_admin_setting(text)` - Retrieve admin configuration
- `set_admin_setting(text, text, boolean, text)` - Update admin configuration
- `can_manage_team_member(uuid, uuid, text)` - Team permission check

### **Analytics Functions**
- `get_advertisement_metrics(uuid, date, date)` - Ad performance data
- `calculate_advertisement_roi(uuid)` - ROI calculation
- `get_directory_stats()` - Directory statistics
- `get_recent_activity(integer)` - Recent system activity

### **Navigation Functions**
- `get_navigation_for_membership(text, text, uuid)` - Membership-based menus
- `track_navigation_click(uuid, uuid, text, text, text, text, inet, text)` - Usage tracking
- `duplicate_navigation_context(text, text, uuid)` - Menu duplication

### **User Management Functions**
- `handle_new_user()` - New user setup trigger
- `log_user_registration()` - Registration logging
- `start_user_trial(uuid, varchar, integer)` - Trial activation

---

## 📊 **KEY RELATIONSHIPS**

### **User → Content Ownership**
```
users (1) → (∞) events [created_by]
users (1) → (∞) advertisements [advertiser_id]  
users (1) → (∞) directory_listings [owner_id]
users (1) → (1) profiles [user_id]
```

### **Event Management**
```
event_categories (1) → (∞) events [category_id]
users (1) → (∞) events [organizer_id]
events (1) → (∞) competition_results [event_id]
```

### **Advertisement System**
```
advertisements (1) → (∞) advertisement_images [advertisement_id]
advertisements (1) → (∞) advertisement_clicks [advertisement_id]
advertisements (1) → (∞) advertisement_impressions [advertisement_id]
users (1) → (∞) advertisements [advertiser_id]
```

### **Directory System**
```
directory_categories (1) → (∞) directory_listings [category_id]
directory_listings (1) → (∞) directory_reviews [listing_id]
directory_listings (1) → (∞) directory_listing_views [listing_id]
users (1) → (∞) directory_listings [owner_id]
```

---

## 🔄 **CHANGE LOG & VERSIONS**

### **2025-06-16 (Emergency Restore)**
- **CRISIS**: Database changes broke authentication system
- **ACTION**: Restored from `backup-emergency-restore-2025-06-16_14-14-06`
- **STATUS**: System functional, security issues identified
- **NEXT**: Implement security fixes following protocol

### **Planned Changes (Phase 1 - Function Security)**
```sql
-- Fix all 32 functions with mutable search_path
ALTER FUNCTION public.get_admin_setting(text) SET search_path = '';
ALTER FUNCTION public.calculate_advertisement_roi(uuid) SET search_path = '';
-- [... 30 more functions]
```

### **Planned Changes (Phase 2 - RLS Implementation)**
```sql
-- Enable RLS on critical tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
-- [... + create proper policies]
```

---

## 📝 **MAINTENANCE PROCEDURES**

### **Schema Update Protocol:**
1. **ALWAYS backup** before changes
2. **Update this document** with changes
3. **Test thoroughly** after modifications
4. **Document rollback procedures**
5. **Follow security protocols**

### **Required Documentation Updates:**
- **Table Changes**: Update table structure, relationships
- **Function Changes**: Update function signatures, purposes  
- **Security Changes**: Update RLS policies, access controls
- **Index Changes**: Document performance optimizations

### **Version Control:**
- **Schema File**: `current-schema.sql` (auto-generated)
- **Migration Files**: `supabase/migrations/`
- **Backup References**: Document backup restore points

---

## 🚨 **CRITICAL REMINDERS**

### **For All AI Agents:**
1. **READ this document** before making any database changes
2. **UPDATE this document** with all modifications
3. **FOLLOW security protocols** defined in `AI_DEVELOPMENT_PROTOCOL.md`
4. **CREATE backups** before any changes
5. **TEST thoroughly** after modifications

### **Emergency Contacts:**
- **Working Backup**: `backup-emergency-restore-2025-06-16_14-14-06`
- **Schema Reference**: This document + `current-schema.sql`
- **Security Audit**: `DATABASE_SECURITY_AUDIT.md`

---

*This document is the authoritative source for database schema information. Keep it current with all changes to maintain system integrity and development consistency.* 