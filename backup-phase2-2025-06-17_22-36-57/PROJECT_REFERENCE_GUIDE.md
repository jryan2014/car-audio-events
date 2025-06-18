# 🎵 Car Audio Events Platform - Project Reference Guide

## 📋 **CRITICAL DEVELOPMENT RULES** ⚠️

**READ THIS FIRST - MANDATORY FOR ALL DEVELOPERS/AGENTS**

### 🔴 **Database & Environment Rules**
1. **PRODUCTION DATABASE** - Remote DB is LIVE production. Use EXTREME caution
2. **NO DATABASE RESETS** - Always ask permission for major DB changes
3. **SQL QUERIES** - Provide all SQL to user for Supabase SQL editor execution
4. **NO ENV MODIFICATIONS** - Never modify .env, .env-local, or .env-remote files
5. **Environment Variables** - Use env vars to switch between local/remote configurations
6. **DATABASE TABLES** - Create all necessary database tables for any new features or functionality

### 🔴 **Development Standards**
7. **EXPERT LEVEL** - Act as top 10 world-class full-stack developer
8. **STEP-BY-STEP** - User is beginner, provide detailed instructions
9. **CAR AUDIO EXPERTISE** - Approach as professional car audio expert/competitor/retailer
10. **COMPLETE INTEGRATION** - Always consider all functions and hook them together
11. **NO MOCK DATA** - Use ONLY real data, this is a production application
12. **MANDATORY QA** - Must run comprehensive QA on every page/component modified

### 🔴 **Backup & Safety**
13. **MANDATORY BACKUPS** - Create backup before ANY major changes
14. **NO REPOSITORY SAVES** - Don't push to GitHub until user approval
15. **GOOGLE MAPS PROTECTION** - Backup before ANY Google Maps modifications

---

## 🏗️ **PROJECT OVERVIEW**

### **Platform Purpose**
Car Audio Events Competition Platform - connecting enthusiasts, competitors, retailers, manufacturers, and organizations in the car audio community.

### **Live Production Site**
- **URL**: caraudioevents.com
- **Status**: Production-ready with real users
- **Database**: Live Supabase production instance

### **Technology Stack**
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Email**: Postmark
- **Maps**: Google Maps API
- **Hosting**: Netlify

---

## 🏛️ **SYSTEM ARCHITECTURE**

### **Core Components**
```
src/
├── components/          # Reusable UI components
├── pages/              # Route-based page components
├── contexts/           # React contexts (Auth, etc.)
├── services/           # API services and utilities
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── lib/                # Third-party integrations
```

### **Key Services**
- **Authentication**: `src/contexts/AuthContext.tsx`
- **Database**: `src/lib/supabase.ts`
- **Email**: `src/services/emailService.ts`
- **Logo Management**: `src/services/logoService.ts`
- **Payments**: `src/lib/stripe.ts`

### **Database Structure**
- **Users**: User accounts and profiles
- **Events**: Car audio competitions and events
- **Organizations**: Retailers, manufacturers, clubs
- **CMS Pages**: Dynamic content management
- **Admin Settings**: System configuration
- **Teams**: Competition teams and memberships

---

## 🎯 **CURRENT PROJECT STATUS**

### ✅ **COMPLETED FEATURES**
- [x] User authentication and registration
- [x] Admin dashboard with real data
- [x] Event management system
- [x] User management (admin)
- [x] CMS page system
- [x] Organization management
- [x] Directory listings
- [x] Logo management system
- [x] Header/Footer branding integration
- [x] Responsive navigation
- [x] Email service integration
- [x] Payment system foundation
- [x] Google Maps integration
- [x] Admin settings panel

### 🔄 **IN PROGRESS**
- [ ] Logo management UI completion
- [ ] Email template optimization
- [ ] Mobile responsiveness refinement

---

## 📝 **DEVELOPMENT TODO LIST**

### 🔥 **HIGH PRIORITY**
- [ ] **Enhanced User Management**: Complete admin user management system
  - [ ] Full user profile editing (address, billing details, personal info)
  - [ ] Invoice creation and management system
  - [ ] Send invoices to users for payment
  - [ ] Billing and membership history tracking
  - [ ] Login analytics (last login, days since login, login frequency)
  - [ ] Advanced user actions (Edit, Suspend, Delete, Cancel Subscriptions)
  - [ ] User activity monitoring and reporting
- [ ] **Email System**: Complete Postmark integration and templates
- [ ] **Payment Processing**: Finalize Stripe payment flows
- [ ] **Event Registration**: Complete event signup/payment process
- [ ] **Mobile Optimization**: Ensure all components are mobile-friendly
- [ ] **Performance**: Optimize large bundle sizes (1850KB+ chunks)

### 🔶 **MEDIUM PRIORITY**
- [ ] **Search Functionality**: Add search across events, organizations, users
- [ ] **Notification System**: In-app and email notifications
- [ ] **Advanced Filtering**: Event and directory filtering options
- [ ] **User Profiles**: Enhanced profile customization
- [ ] **Team Management**: Complete team creation and management

### 🔵 **LOW PRIORITY**
- [ ] **Analytics Dashboard**: Enhanced admin analytics
- [ ] **API Documentation**: Document all endpoints
- [ ] **Testing Suite**: Add comprehensive tests
- [ ] **SEO Optimization**: Meta tags and structured data
- [ ] **Social Media Integration**: Share buttons and feeds

---

## 🗂️ **FILE ORGANIZATION**

### **Main Project Structure**
```
project/
├── src/                    # Source code
├── public/                 # Static assets
├── database-scripts/       # SQL files and DB utilities
├── backup-*/              # Automated backups
├── dist/                  # Build output
└── PROJECT_REFERENCE_GUIDE.md  # This file
```

### **Backup Strategy**
- Automated backups before major changes
- Naming: `backup-YYYY-MM-DD_HH-mm-ss/`
- Contains: src/, public/, config files

---

## 🔧 **DEVELOPMENT WORKFLOW**

### **Before Starting Work**
1. **Read this guide completely**
2. **Create backup**: `backup-[feature-name]-YYYY-MM-DD_HH-mm-ss/`
3. **Review current TODO list**
4. **Understand existing codebase**

### **During Development**
1. **Follow all CRITICAL RULES above**
2. **Test thoroughly with real data**
3. **Consider integration with existing features**
4. **Update TODO list as you progress**

### **After Completion**
1. **MANDATORY: Execute comprehensive QA process (see QA section below)**
2. **Test all affected functionality**
3. **Update this guide if needed**
4. **Mark TODO items as complete**
5. **🚨 CRITICAL: NEVER PUSH TO PRODUCTION WITHOUT USER QA APPROVAL 🚨**
6. **Present completed feature to user for testing**
7. **Wait for explicit user approval before any git push to main**

---

## 🧪 **MANDATORY QA PROCESS FOR CHAT AGENTS**

**⚠️ CRITICAL: Every modification MUST include comprehensive QA testing ⚠️**

### **🔴 IMMEDIATE QA REQUIREMENTS**
**For EVERY file/component modified, the chat agent MUST:**

1. **Build Test**: Ensure `npm run build` completes without errors
2. **Functionality Test**: Test the specific feature that was modified
3. **Integration Test**: Test related features that could be affected
4. **Regression Test**: Verify existing functionality wasn't broken
5. **UI Test**: Check visual appearance and responsiveness
6. **Error Handling**: Test error scenarios and edge cases

### **📋 COMPREHENSIVE QA CHECKLIST**

#### **A. BASIC FUNCTIONALITY**
- [ ] Target feature works as expected
- [ ] All buttons/links in modified component work
- [ ] Forms submit correctly (if applicable)
- [ ] Modal open/close functionality works
- [ ] Navigation within the page works
- [ ] Data loads and displays correctly

#### **B. INTEGRATION TESTING**
- [ ] Related components still function correctly
- [ ] Parent-child component communication works
- [ ] API calls still work
- [ ] State management functions properly
- [ ] Context providers work correctly

#### **C. UI/UX TESTING**
- [ ] Layout is not broken
- [ ] Responsive design works (mobile/tablet/desktop)
- [ ] Colors and styling are correct
- [ ] Loading states work properly
- [ ] Error states display correctly
- [ ] Tooltips and help text function

#### **D. ERROR SCENARIOS**
- [ ] Network errors handled gracefully
- [ ] Invalid input handled properly
- [ ] Missing data scenarios work
- [ ] Permission errors handled
- [ ] Timeout scenarios work

#### **E. BROWSER COMPATIBILITY**
- [ ] Chrome functionality
- [ ] Firefox functionality (if possible)
- [ ] Mobile browser functionality

### **🎯 SPECIFIC QA FOR COMMON MODIFICATIONS**

#### **Modal Components**
- [ ] Modal opens correctly
- [ ] Modal closes via X button
- [ ] Modal closes via outside click
- [ ] Modal closes via Escape key
- [ ] Modal content is scrollable if needed
- [ ] Modal is above other elements (z-index)
- [ ] Modal doesn't break parent container

#### **Form Components**
- [ ] All form fields accept input
- [ ] Form validation works
- [ ] Form submission works
- [ ] Form reset works
- [ ] Button types prevent unwanted submission

#### **API Integration**
- [ ] API calls succeed
- [ ] API call failures handled
- [ ] Loading states shown
- [ ] Data displays correctly
- [ ] Error messages are user-friendly

### **📝 QA REPORTING FORMAT**

**When completing QA, provide this report:**

```
## QA REPORT - [Component/Feature Name]

### Files Modified:
- [ ] List all files changed

### Features Tested:
- [ ] Primary functionality
- [ ] Secondary functionality  
- [ ] Related features

### Test Results:
✅ PASS: [Feature] - Works correctly
❌ FAIL: [Feature] - Issue description
⚠️ ISSUE: [Feature] - Minor issue but functional

### Browser Testing:
- [ ] Chrome: ✅ PASS
- [ ] Mobile: ✅ PASS

### Integration Testing:
- [ ] Related Component A: ✅ PASS
- [ ] Related Component B: ✅ PASS

### Regression Testing:
- [ ] Previous functionality: ✅ PASS

### Summary:
[Overall assessment and any concerns]
```

---

## 🎵 **CAR AUDIO DOMAIN EXPERTISE**

### **User Types**
- **Competitors**: Need event registration, results tracking
- **Retailers**: Need business listings, product showcases
- **Manufacturers**: Need brand presence, dealer networks
- **Organizations**: Need event management, member management
- **Enthusiasts**: Need community features, event discovery

### **Key Features for Car Audio Community**
- **Competition Categories**: SPL, SQ, Install, etc.
- **Event Types**: Competitions, shows, meets, training
- **Business Directory**: Shops, installers, manufacturers
- **Results Tracking**: Competition scores and rankings
- **Community Features**: Forums, galleries, networking

---

## 🚨 **EMERGENCY PROCEDURES**

### **If Something Breaks**
1. **STOP immediately**
2. **Restore from most recent backup**
3. **Document what went wrong**
4. **Ask user for guidance**

### **Database Issues**
1. **DO NOT attempt fixes**
2. **Document the error**
3. **Provide SQL to user for manual execution**
4. **Wait for user approval**

---

## 📞 **QUICK REFERENCE**

### **Key Commands**
```bash
# Build project
npm run build

# Create backup
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "backup-$timestamp"
# ... backup commands

# Check git status
git status
git log --oneline -5
```

### **Important Files**
- **Main Config**: `vite.config.ts`, `package.json`
- **Database**: `src/lib/supabase.ts`
- **Auth**: `src/contexts/AuthContext.tsx`
- **Routing**: `src/App.tsx`
- **Styles**: `src/index.css`

---

## 📈 **SUCCESS METRICS**

### **Code Quality**
- No mock data in production
- All features integrated and working
- Mobile-responsive design
- Fast load times (<3s)

### **User Experience**
- Intuitive navigation
- Professional car audio focus
- Real-time data updates
- Seamless payment flows

---

**Last Updated**: 2025-06-14
**Version**: 1.1.0 (Advertisement System with AI Integration)
**Maintainer**: Development Team

---

## 🏷️ **VERSION SYSTEM** ⚠️ **MANDATORY PROTOCOL**

### **Current Version**: v1.0.1 (Foundation)
- **Release Date**: 2025-06-14
- **Status**: Production Stable
- **Changelog**: See CHANGELOG.md for detailed changes

### **🔴 CRITICAL VERSION RULES**
1. **ALWAYS INCREMENT VERSION** for ANY production change
2. **FOLLOW SEMANTIC VERSIONING** strictly (MAJOR.MINOR.PATCH)
3. **UPDATE ALL VERSION FILES** in single commit
4. **CREATE GIT TAGS** for every version
5. **NEVER PUSH TO PRODUCTION WITHOUT USER QA APPROVAL**
6. **WAIT FOR DEPLOYMENT** before confirming version is live

### **Version Types & When to Use**
- **PATCH (x.x.X)**: Bug fixes, hotfixes, small corrections
  - Examples: Logo fixes, typo corrections, broken links
- **MINOR (x.X.0)**: New features, enhancements, additions
  - Examples: New admin features, UI improvements, new pages
- **MAJOR (X.0.0)**: Breaking changes, major overhauls
  - Examples: Database schema changes, API changes, major redesigns

### **🔧 MANDATORY VERSION UPDATE PROCESS**
**EVERY production change MUST follow this exact process:**

1. **Update package.json**: Change version number
2. **Update src/utils/version.ts**: 
   - Update VERSION.PATCH/MINOR/MAJOR
   - Add entry to VERSION_HISTORY array
   - Update BUILD timestamp
3. **Update CHANGELOG.md**: Add new version section with changes
4. **Commit version changes**: `git commit -m "VERSION: Increment to vX.X.X for [reason]"`
5. **Create git tag**: `git tag vX.X.X -m "vX.X.X: [description]"`
6. **🚨 STOP - DO NOT PUSH TO PRODUCTION YET 🚨**
7. **WAIT FOR USER QA APPROVAL**: User must test locally and explicitly approve
8. **Only after user approval**: `git push origin main --tags`
9. **Rebuild if needed**: `npm run build` (for local testing)
10. **Verify deployment**: Check admin dashboard shows new version
11. **Wait 2-5 minutes**: Allow production deployment to complete

### **Version File Locations**
- **package.json**: `"version": "1.0.1"`
- **src/utils/version.ts**: VERSION object and VERSION_HISTORY
- **CHANGELOG.md**: Detailed change documentation
- **Admin Dashboard**: Displays current version to users

### **🚨 VERSION DEPLOYMENT TIMING**
- **Local Development**: Shows new version immediately
- **Production**: Takes 2-5 minutes after push to rebuild and deploy
- **Browser Cache**: May need hard refresh (Ctrl+F5) to see changes
- **CDN Cache**: May take additional time to propagate globally

---

> 💡 **Remember**: This is a LIVE PRODUCTION platform serving real car audio enthusiasts. Every change affects real users and real business operations. Develop with care, precision, and expertise. 

## 🤖 **AI CONFIGURATION SYSTEM** - COMPREHENSIVE IMPLEMENTATION

### **✅ COMPLETED AI FEATURES (2025-06-15)**

#### **1. API Key Management**
- **FIXED**: API keys now properly saved for both Image Generation AND Writing Assistant sections
- **Security**: API keys encrypted before database storage using base64 encoding
- **Validation**: Real-time API key validation for all providers
- **Support**: OpenAI DALL-E, Stability AI, Midjourney, Adobe Firefly, OpenAI GPT, Anthropic Claude, Google Gemini

#### **2. Live Status Indicators** 
- **🟢 Connected**: API key valid and service responding
- **🔴 Connection Error**: API key invalid or service error  
- **🟡 Network Issue**: Network connectivity problems
- **🔵 Testing**: Currently checking connection status
- **⚪ Unauthorized**: Invalid API credentials
- **Auto-refresh**: Status checked on page load and manual testing

#### **3. Enhanced Brand Guidelines**
- **Brand Voice Examples**: Professional, enthusiastic, direct communication styles
- **Tone Guidelines**: Specific instructions with character limits and live counting
- **Format Preferences**: Color-coded sections (Blue: Structure, Green: Formatting, Yellow: Lists, Purple: Enhancement)
- **Image Guidelines**: Visual styles, color schemes, composition tips, text overlay zones
- **UX Improvements**: Helpful suggestions and examples throughout interface

#### **4. Database Schema Optimization**
- **Fixed**: Removed non-existent `u.organization_id` references
- **Simplified**: RLS policies work with actual database structure
- **Compatible**: INTEGER organization_id fields match existing organizations table
- **Future-ready**: Schema supports user-organization relationships when needed

#### **5. Admin Management System**
- **User Overview**: View all user AI configurations and usage
- **Usage Analytics**: System-wide and per-user statistics
- **Access Control**: Enable/disable AI for individual users
- **Limit Management**: Set custom limits per user and provider
- **Cost Monitoring**: Track spending across all users and providers

#### **6. Usage Limits & Warning System**
- **Membership Tiers**:
  - Free: 5 images/day, 10 text/day, $10/month
  - Pro: 50 images/day, 100 text/day, $100/month  
  - Business: 200 images/day, 500 text/day, $500/month
  - Enterprise: 1000 images/day, 2000 text/day, $2000/month
- **Warning Levels**:
  - 🟡 Near Limit: 80% usage warning
  - 🔴 Limit Reached: Request blocking with clear messaging
- **Credit System**: Purchase additional usage credits
- **Real-time Checking**: Usage validated before each AI request

#### **7. Production Database Integration**
- **Real Data**: No mock data - all statistics from actual usage
- **Usage Tracking**: Every AI request logged with cost and success metrics
- **Analytics**: Pre-computed daily/monthly statistics for performance
- **Triggers**: Automatic analytics updates on usage
- **Views**: Optimized database views for quick data access

### **🔧 TECHNICAL IMPLEMENTATION**

#### **Database Tables Created**
- `ai_service_providers` - Available AI services
- `ai_provider_configs` - User/organization configurations  
- `ai_usage_logs` - Detailed usage tracking
- `ai_generated_images` - Generated image storage
- `ai_generated_text` - Generated text storage
- `ai_content_directions` - Brand voice and content guidelines
- `ai_image_guidelines` - Visual style and composition rules
- `ai_usage_analytics` - Pre-computed usage statistics

#### **Service Layer**
- `aiService.ts` - Comprehensive AI service with real database integration
- Connection testing for all providers
- Usage limit checking and enforcement
- Admin management functions
- Real-time analytics and reporting

#### **Security Features**
- Row Level Security (RLS) policies
- API key encryption
- User data isolation
- Admin-only system access
- Secure credential handling

### **🎯 INTEGRATION POINTS**

#### **Advertisement Manager Integration**
- Usage limit warnings before AI generation
- Real-time cost calculation
- Provider availability checking
- Automatic usage logging

#### **Admin Dashboard Integration**  
- System-wide AI usage monitoring
- User AI access management
- Cost and limit administration
- Usage analytics and reporting

#### **Membership System Integration**
- Tier-based usage limits
- Automatic limit enforcement
- Credit purchasing system
- Upgrade prompts for limit increases

### **📊 MONITORING & ANALYTICS**

#### **Real-time Metrics**
- Daily/monthly usage tracking
- Cost monitoring per provider
- Success/failure rate tracking
- Performance metrics (response times)

#### **Admin Reporting**
- System-wide usage summaries
- Per-user usage breakdowns
- Cost analysis and trends
- Provider performance metrics

### **🚀 FUTURE ENHANCEMENTS**

#### **Planned Features**
- Advanced AI model selection
- Custom prompt templates
- Batch processing capabilities
- API rate limiting
- Advanced analytics dashboard
- Integration with external AI services

#### **Scalability Considerations**
- Database optimization for high usage
- Caching layer for frequent queries
- Background processing for analytics
- Load balancing for AI requests

---

## 🧪 **MANDATORY QA PROCESS FOR CHAT AGENTS**

**⚠️ CRITICAL: Every modification MUST include comprehensive QA testing ⚠️**

### **🔴 IMMEDIATE QA REQUIREMENTS**
**For EVERY file/component modified, the chat agent MUST:**

1. **Build Test**: Ensure `npm run build` completes without errors
2. **Functionality Test**: Test the specific feature that was modified
3. **Integration Test**: Test related features that could be affected
4. **Regression Test**: Verify existing functionality wasn't broken
5. **UI Test**: Check visual appearance and responsiveness
6. **Error Handling**: Test error scenarios and edge cases

### **📋 COMPREHENSIVE QA CHECKLIST**

#### **A. BASIC FUNCTIONALITY**
- [ ] Target feature works as expected
- [ ] All buttons/links in modified component work
- [ ] Forms submit correctly (if applicable)
- [ ] Modal open/close functionality works
- [ ] Navigation within the page works
- [ ] Data loads and displays correctly

#### **B. INTEGRATION TESTING**
- [ ] Related components still function correctly
- [ ] Parent-child component communication works
- [ ] API calls still work
- [ ] State management functions properly
- [ ] Context providers work correctly

#### **C. UI/UX TESTING**
- [ ] Layout is not broken
- [ ] Responsive design works (mobile/tablet/desktop)
- [ ] Colors and styling are correct
- [ ] Loading states work properly
- [ ] Error states display correctly
- [ ] Tooltips and help text function

#### **D. ERROR SCENARIOS**
- [ ] Network errors handled gracefully
- [ ] Invalid input handled properly
- [ ] Missing data scenarios work
- [ ] Permission errors handled
- [ ] Timeout scenarios work

#### **E. BROWSER COMPATIBILITY**
- [ ] Chrome functionality
- [ ] Firefox functionality (if possible)
- [ ] Mobile browser functionality

### **🎯 SPECIFIC QA FOR COMMON MODIFICATIONS**

#### **Modal Components**
- [ ] Modal opens correctly
- [ ] Modal closes via X button
- [ ] Modal closes via outside click
- [ ] Modal closes via Escape key
- [ ] Modal content is scrollable if needed
- [ ] Modal is above other elements (z-index)
- [ ] Modal doesn't break parent container

#### **Form Components**
- [ ] All form fields accept input
- [ ] Form validation works
- [ ] Form submission works
- [ ] Form reset works
- [ ] Button types prevent unwanted submission

#### **API Integration**
- [ ] API calls succeed
- [ ] API call failures handled
- [ ] Loading states shown
- [ ] Data displays correctly
- [ ] Error messages are user-friendly

### **📝 QA REPORTING FORMAT**

**When completing QA, provide this report:**

```
## QA REPORT - [Component/Feature Name]

### Files Modified:
- [ ] List all files changed

### Features Tested:
- [ ] Primary functionality
- [ ] Secondary functionality  
- [ ] Related features

### Test Results:
✅ PASS: [Feature] - Works correctly
❌ FAIL: [Feature] - Issue description
⚠️ ISSUE: [Feature] - Minor issue but functional

### Browser Testing:
- [ ] Chrome: ✅ PASS
- [ ] Mobile: ✅ PASS

### Integration Testing:
- [ ] Related Component A: ✅ PASS
- [ ] Related Component B: ✅ PASS

### Regression Testing:
- [ ] Previous functionality: ✅ PASS

### Summary:
[Overall assessment and any concerns]
```

---

## 🎵 **CAR AUDIO DOMAIN EXPERTISE**

### **User Types**
- **Competitors**: Need event registration, results tracking
- **Retailers**: Need business listings, product showcases
- **Manufacturers**: Need brand presence, dealer networks
- **Organizations**: Need event management, member management
- **Enthusiasts**: Need community features, event discovery

### **Key Features for Car Audio Community**
- **Competition Categories**: SPL, SQ, Install, etc.
- **Event Types**: Competitions, shows, meets, training
- **Business Directory**: Shops, installers, manufacturers
- **Results Tracking**: Competition scores and rankings
- **Community Features**: Forums, galleries, networking

---

## 🚨 **EMERGENCY PROCEDURES**

### **If Something Breaks**
1. **STOP immediately**
2. **Restore from most recent backup**
3. **Document what went wrong**
4. **Ask user for guidance**

### **Database Issues**
1. **DO NOT attempt fixes**
2. **Document the error**
3. **Provide SQL to user for manual execution**
4. **Wait for user approval**

---

## 📞 **QUICK REFERENCE**

### **Key Commands**
```bash
# Build project
npm run build

# Create backup
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "backup-$timestamp"
# ... backup commands

# Check git status
git status
git log --oneline -5
```

### **Important Files**
- **Main Config**: `vite.config.ts`, `package.json`
- **Database**: `src/lib/supabase.ts`
- **Auth**: `src/contexts/AuthContext.tsx`
- **Routing**: `src/App.tsx`
- **Styles**: `src/index.css`

---

## 📈 **SUCCESS METRICS**

### **Code Quality**
- No mock data in production
- All features integrated and working
- Mobile-responsive design
- Fast load times (<3s)

### **User Experience**
- Intuitive navigation
- Professional car audio focus
- Real-time data updates
- Seamless payment flows

---

**Last Updated**: 2025-06-14
**Version**: 1.1.0 (Advertisement System with AI Integration)
**Maintainer**: Development Team

---

## 🏷️ **VERSION SYSTEM** ⚠️ **MANDATORY PROTOCOL**

### **Current Version**: v1.0.1 (Foundation)
- **Release Date**: 2025-06-14
- **Status**: Production Stable
- **Changelog**: See CHANGELOG.md for detailed changes

### **🔴 CRITICAL VERSION RULES**
1. **ALWAYS INCREMENT VERSION** for ANY production change
2. **FOLLOW SEMANTIC VERSIONING** strictly (MAJOR.MINOR.PATCH)
3. **UPDATE ALL VERSION FILES** in single commit
4. **CREATE GIT TAGS** for every version
5. **NEVER PUSH TO PRODUCTION WITHOUT USER QA APPROVAL**
6. **WAIT FOR DEPLOYMENT** before confirming version is live

### **Version Types & When to Use**
- **PATCH (x.x.X)**: Bug fixes, hotfixes, small corrections
  - Examples: Logo fixes, typo corrections, broken links
- **MINOR (x.X.0)**: New features, enhancements, additions
  - Examples: New admin features, UI improvements, new pages
- **MAJOR (X.0.0)**: Breaking changes, major overhauls
  - Examples: Database schema changes, API changes, major redesigns

### **🔧 MANDATORY VERSION UPDATE PROCESS**
**EVERY production change MUST follow this exact process:**

1. **Update package.json**: Change version number
2. **Update src/utils/version.ts**: 
   - Update VERSION.PATCH/MINOR/MAJOR
   - Add entry to VERSION_HISTORY array
   - Update BUILD timestamp
3. **Update CHANGELOG.md**: Add new version section with changes
4. **Commit version changes**: `git commit -m "VERSION: Increment to vX.X.X for [reason]"`
5. **Create git tag**: `git tag vX.X.X -m "vX.X.X: [description]"`
6. **🚨 STOP - DO NOT PUSH TO PRODUCTION YET 🚨**
7. **WAIT FOR USER QA APPROVAL**: User must test locally and explicitly approve
8. **Only after user approval**: `git push origin main --tags`
9. **Rebuild if needed**: `npm run build` (for local testing)
10. **Verify deployment**: Check admin dashboard shows new version
11. **Wait 2-5 minutes**: Allow production deployment to complete

### **Version File Locations**
- **package.json**: `"version": "1.0.1"`
- **src/utils/version.ts**: VERSION object and VERSION_HISTORY
- **CHANGELOG.md**: Detailed change documentation
- **Admin Dashboard**: Displays current version to users

### **🚨 VERSION DEPLOYMENT TIMING**
- **Local Development**: Shows new version immediately
- **Production**: Takes 2-5 minutes after push to rebuild and deploy
- **Browser Cache**: May need hard refresh (Ctrl+F5) to see changes
- **CDN Cache**: May take additional time to propagate globally

---

> 💡 **Remember**: This is a LIVE PRODUCTION platform serving real car audio enthusiasts. Every change affects real users and real business operations. Develop with care, precision, and expertise. 