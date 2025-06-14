# 🎵 Car Audio Events Platform - Project Reference Guide

## 📋 **CRITICAL DEVELOPMENT RULES** ⚠️

**READ THIS FIRST - MANDATORY FOR ALL DEVELOPERS/AGENTS**

### 🔴 **Database & Environment Rules**
1. **PRODUCTION DATABASE** - Remote DB is LIVE production. Use EXTREME caution
2. **NO DATABASE RESETS** - Always ask permission for major DB changes
3. **SQL QUERIES** - Provide all SQL to user for Supabase SQL editor execution
4. **NO ENV MODIFICATIONS** - Never modify .env, .env-local, or .env-remote files
5. **Environment Variables** - Use env vars to switch between local/remote configurations

### 🔴 **Development Standards**
6. **EXPERT LEVEL** - Act as top 10 world-class full-stack developer
7. **STEP-BY-STEP** - User is beginner, provide detailed instructions
8. **CAR AUDIO EXPERTISE** - Approach as professional car audio expert/competitor/retailer
9. **COMPLETE INTEGRATION** - Always consider all functions and hook them together
10. **NO MOCK DATA** - Use ONLY real data, this is a production application

### 🔴 **Backup & Safety**
11. **MANDATORY BACKUPS** - Create backup before ANY major changes
12. **NO REPOSITORY SAVES** - Don't push to GitHub until user approval
13. **GOOGLE MAPS PROTECTION** - Backup before ANY Google Maps modifications

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
1. **Test all affected functionality**
2. **Update this guide if needed**
3. **Mark TODO items as complete**
4. **Wait for user approval before GitHub push**

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
**Version**: 1.0
**Maintainer**: Development Team

---

> 💡 **Remember**: This is a LIVE PRODUCTION platform serving real car audio enthusiasts. Every change affects real users and real business operations. Develop with care, precision, and expertise. 