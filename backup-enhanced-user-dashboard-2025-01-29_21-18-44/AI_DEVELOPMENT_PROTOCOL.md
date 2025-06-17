# 🤖 AI Development Protocol - Car Audio Competition Platform

## 🚨 **CRITICAL RULES - READ FIRST**

### **🔴 ABSOLUTE REQUIREMENTS**
1. **NEVER disable RLS (Row Level Security) as a "quick fix"** - This is a production system with real users
2. **ALWAYS create backups before making significant changes** - Use naming: `backup-[feature-name]-YYYY-MM-DD_HH-mm-ss`
3. **FOLLOW the 5-phase database security implementation plan** - Never deviate from established security procedures
4. **TEST everything thoroughly before presenting** - No exceptions to comprehensive QA
5. **⭐ NEW: STEP-BY-STEP DEVELOPMENT WITH USER CONFIRMATION** - See detailed requirements below

### **🟡 MANDATORY DEVELOPMENT APPROACH FOR NEW DEVELOPERS**
**CRITICAL: The user is new to development and coding. You MUST follow this approach:**

#### **Step-by-Step Execution Rules:**
1. **ONE TASK AT A TIME** - Never give multiple instructions simultaneously
2. **WAIT FOR CONFIRMATION** - User must confirm each step completion before proceeding
3. **BREAK DOWN COMPLEX TASKS** - Split large tasks into small, manageable steps
4. **EXPLAIN WHAT EACH STEP DOES** - Provide context for why each action is needed
5. **TEST AT EACH STAGE** - Verify functionality after each change
6. **GET EXPLICIT APPROVAL** - User must say "proceed" or "continue" before next step

#### **Prohibited Approaches:**
❌ **DON'T**: Give a bunch of SQL commands to run all at once
❌ **DON'T**: Provide multiple file changes in one response
❌ **DON'T**: Continue to next step without user confirmation
❌ **DON'T**: Assume user knows how to test or verify changes
❌ **DON'T**: Skip explanation of what each step accomplishes

#### **Required Approach:**
✅ **DO**: Give ONE SQL command, wait for confirmation it worked
✅ **DO**: Make ONE file change, ask user to test it works
✅ **DO**: Explain exactly what to test and how to verify success
✅ **DO**: Ask "Did this work as expected? Can I proceed to the next step?"
✅ **DO**: Provide clear instructions on where to click, what to look for

#### **Example of Correct Step-by-Step Approach:**
```
STEP 1: First, I'll fix one specific database function. 
Please run this single SQL command in your Supabase SQL editor:

[ONE SQL COMMAND]

After running it:
1. Check for any error messages
2. Confirm it says "Success. No rows returned" or similar
3. Reply "Step 1 complete" so I can proceed to Step 2

Do NOT continue until I get your confirmation that Step 1 worked.
```

### **🔴 FORBIDDEN ACTIONS**
- **Database Security**: Never disable RLS, modify auth policies without approval, or change security settings
- **Breaking Changes**: Never modify core authentication, break existing functionality, or change database schemas without explicit approval
- **Bulk Operations**: Never give multiple instructions without confirmation between each step
- **Development Shortcuts**: Never skip testing, bypass QA processes, or make assumptions about user knowledge level

### **✅ REQUIRED ACTIONS**
- **Backup First**: Always create backup before significant changes
- **Incremental Development**: Make small, testable changes
- **User Confirmation**: Wait for explicit approval at each step
- **Comprehensive Testing**: Test each change before proceeding
- **Clear Communication**: Explain what each step does and why

---

## 🛡️ **DATABASE SECURITY CONSTRAINTS**

### **Current Security Status**
- **42 Total Issues Identified** requiring remediation
- **5-Phase Implementation Plan** must be followed exactly
- **Zero tolerance** for security shortcuts or quick fixes

### **Security Implementation Phases**
1. **Phase 1**: Fix function search_path issues (32 functions) - **ZERO RISK**
2. **Phase 2**: Enable RLS on tables with existing policies - **MEDIUM RISK**
3. **Phase 3**: Fix security definer views - **LOW RISK**  
4. **Phase 4**: Enable RLS on high-risk tables - **MEDIUM RISK**
5. **Phase 5**: Create missing RLS policies - **LOW RISK**

### **Phase 1 Details (CURRENT PRIORITY)**
**Must be completed first before any other development work**

**Functions requiring search_path fixes:**
- get_user_analytics
- update_user_last_login  
- get_event_analytics
- calculate_event_attendance
- get_organization_analytics
- validate_organization_membership
- get_advertisement_analytics
- calculate_ad_performance
- get_directory_listing_analytics
- validate_listing_permissions
- get_profile_completion_score
- calculate_membership_benefits
- get_cms_page_analytics
- validate_page_permissions
- get_navigation_analytics
- calculate_menu_performance
- get_backup_analytics
- validate_backup_permissions
- get_ai_usage_analytics
- calculate_ai_costs
- get_contact_form_analytics
- validate_contact_permissions
- get_email_template_analytics
- calculate_email_performance
- get_team_member_analytics
- validate_team_permissions
- get_system_health_metrics
- calculate_performance_scores
- get_competition_analytics
- validate_judge_permissions
- get_payment_analytics
- calculate_revenue_metrics

**Required Fix for Each Function:**
```sql
-- Current problematic pattern:
CREATE OR REPLACE FUNCTION function_name()
RETURNS type
LANGUAGE plpgsql
AS $$
-- Missing: SECURITY DEFINER SET search_path = public
```

**Correct Pattern:**
```sql
-- Fixed secure pattern:
CREATE OR REPLACE FUNCTION function_name()
RETURNS type
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
```

---

## 📋 **BACKUP & RECOVERY PROTOCOLS**

### **Mandatory Backup Requirements**
- **Before any database changes**: Create full backup
- **Before major feature development**: Create codebase backup
- **Naming Convention**: `backup-[feature-name]-YYYY-MM-DD_HH-mm-ss`
- **Storage Location**: Root project directory
- **Verification**: Test backup integrity before proceeding

### **Emergency Recovery Procedures**
1. **Stop all development work immediately**
2. **Assess scope of issue**
3. **Restore from most recent stable backup**
4. **Document what went wrong**
5. **Revise approach before retry**

---

## 🔍 **MANDATORY QA PROCESS**

### **Testing Requirements (CANNOT BE SKIPPED)**
**Every change must pass:**
1. **Functionality Test**: Feature works as intended
2. **Integration Test**: Doesn't break existing features  
3. **Regression Test**: All related features still work
4. **Security Test**: No new vulnerabilities introduced
5. **Performance Test**: No significant slowdown
6. **Mobile Test**: Responsive design maintained (if applicable)

### **QA Checklist Template**
```
□ Feature works as designed
□ No console errors introduced
□ Existing functionality unchanged
□ Mobile responsiveness maintained
□ No security vulnerabilities created
□ Performance impact acceptable
□ Documentation updated
□ User tested and approved
```

---

## 🎯 **IMPLEMENTATION PLAN ADHERENCE**

### **Current Development Priority**
**MUST start with Item #1: Database Security Phase 1**
- Fix 32 function search_path issues
- Zero risk to existing functionality
- Required before any other development work

### **Development Order (CANNOT BE CHANGED)**
1. Database Security Remediation
2. Core Infrastructure Fixes  
3. Authentication & User System Hardening
4. Payment Integration Completion
5. Event System Enhancement
6. Email System Integration
[Continue as defined in STRATEGIC_DEVELOPMENT_ORDER.md]

---

## 📞 **COMMUNICATION PROTOCOLS**

### **Status Reporting Requirements**
- **Regular updates** every 30-45 minutes during active work
- **Completion confirmation** required for each step
- **Issue escalation** immediately when problems arise
- **User approval** required before proceeding to next major step

### **Emergency Communication**
If ANY issue arises:
1. **STOP development immediately**
2. **Report issue with full context**
3. **Wait for user guidance**
4. **Do not attempt fixes without approval**

---

## 🚀 **GETTING STARTED CHECKLIST**

### **Before Beginning Any Work**
□ Read all required documentation completely
□ Understand current system status (v1.3.2)
□ Confirm development environment is ready
□ Create backup following naming convention
□ Get user approval for specific task approach
□ Understand step-by-step confirmation requirement

### **During Development**
□ Make one change at a time
□ Test each change immediately
□ Get user confirmation before proceeding
□ Document any issues encountered
□ Follow established security protocols
□ Update documentation as needed

### **After Completion**
□ Complete comprehensive QA testing
□ Get user acceptance and approval
□ Update relevant documentation
□ Clean up any temporary files
□ Report completion with summary

---

*This protocol ensures safe, methodical development that builds user confidence and maintains system stability.*

**Last Updated**: June 16, 2025  
**Version**: 2.0 (Added Step-by-Step Requirements)  
**Status**: MANDATORY for all AI agents 