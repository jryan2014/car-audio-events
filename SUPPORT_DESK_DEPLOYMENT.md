# Support Desk System - Step-by-Step Deployment Guide

This guide will walk you through deploying the modular support desk system for Car Audio Events.

## 📋 Prerequisites

- Supabase project with existing auth and database
- Netlify deployment setup
- hCaptcha account with site key and secret key
- Email queue system already configured

## 🚀 Step-by-Step Deployment

### Step 1: Database Migration

1. **Apply the support desk tables migration:**
   ```bash
   npx supabase db push
   ```

2. **Verify tables were created:**
   - Check Supabase dashboard for new tables:
     - `support_tickets`
     - `support_ticket_messages`
     - `support_request_types`
     - `support_organization_settings`
     - `support_field_definitions`
     - `support_field_visibility_rules`
     - `support_ticket_assignments`
     - `support_email_verification_tokens`
     - `support_rate_limits`

3. **Verify RLS policies are enabled:**
   - Each table should show "RLS enabled" in Supabase dashboard

### Step 2: Deploy Edge Functions

1. **Deploy the email verification function:**
   ```bash
   npx supabase functions deploy support-verify-email
   ```

2. **Set environment variables for the Edge Function:**
   ```bash
   npx supabase secrets set HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key
   ```

### Step 3: Create Storage Bucket

1. **Create storage bucket for attachments:**
   - Go to Supabase Dashboard > Storage
   - Create new bucket: `support-attachments`
   - Set to "Public" (files will still be protected by unique URLs)
   - Add policy for authenticated users to upload

### Step 4: Frontend Integration

1. **Add support routes to your main router:**
   ```tsx
   // In App.tsx or your main router file
   import { PublicSupportForm } from './modules/support-desk/components/public/PublicSupportForm';
   import { SupportSuccess } from './modules/support-desk/components/public/SupportSuccess';
   
   // Add these routes
   <Route path="/support" element={<PublicSupportForm />} />
   <Route path="/support/success" element={<SupportSuccess />} />
   ```

2. **Add navigation links:**
   ```tsx
   // In your header/navigation component
   <Link to="/support">Support</Link>
   ```

### Step 5: Environment Variables

1. **Ensure these are set in your `.env` file:**
   ```env
   VITE_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key
   ```

2. **Add to Netlify environment variables:**
   - Go to Netlify Dashboard > Site Settings > Environment Variables
   - Add the same variables

### Step 6: Test the Public Form

1. **Test as anonymous user:**
   - Navigate to `/support`
   - Fill out the form
   - Complete hCaptcha
   - Enter email for verification
   - Submit ticket

2. **Test as logged-in user:**
   - Login to your account
   - Navigate to `/support`
   - Form should not require email or captcha
   - Submit ticket

### Step 7: Create Admin Components (Next Phase)

The following components need to be created for full functionality:

1. **User Dashboard Components:**
   ```
   src/modules/support-desk/components/user/
   ├── UserTicketList.tsx
   ├── UserTicketDetail.tsx
   └── UserTicketReply.tsx
   ```

2. **Organization Components:**
   ```
   src/modules/support-desk/components/organization/
   ├── OrgSupportDashboard.tsx
   ├── OrgTicketQueue.tsx
   └── OrgSupportSettings.tsx
   ```

3. **Admin Components:**
   ```
   src/modules/support-desk/components/admin/
   ├── AdminSupportDashboard.tsx
   ├── AdminTicketManager.tsx
   ├── AdminRequestTypes.tsx
   ├── AdminCustomFields.tsx
   └── AdminOrgProvisioning.tsx
   ```

### Step 8: Add Dashboard Routes

1. **User dashboard route:**
   ```tsx
   <Route path="/dashboard/support" element={<UserTicketList />} />
   <Route path="/dashboard/support/ticket/:id" element={<UserTicketDetail />} />
   ```

2. **Organization dashboard route:**
   ```tsx
   <Route path="/dashboard/org/support" element={<OrgSupportDashboard />} />
   ```

3. **Admin dashboard route:**
   ```tsx
   <Route path="/dashboard/admin/support" element={<AdminSupportDashboard />} />
   ```

## 🔧 Configuration

### Default Request Types

The migration includes these default request types:
- General Inquiry
- Technical Support
- Billing Question
- Event Support
- Event Registration Issue
- Account Issue
- Organization Support
- Partnership Inquiry

### Custom Fields

To add custom fields:
1. Insert into `support_field_definitions` table
2. Set visibility rules in `support_field_visibility_rules`
3. Fields will automatically appear in forms

### Organization Provisioning

To enable support for an organization:
1. Insert record in `support_organization_settings`
2. Set `is_provisioned = true`
3. Add support team members to `support_team_user_ids`

## 🧪 Testing Checklist

- [ ] Public form loads correctly
- [ ] hCaptcha appears for anonymous users
- [ ] Email verification works
- [ ] Tickets are created with correct routing
- [ ] Request types load based on user role
- [ ] Custom fields appear when configured
- [ ] Rate limiting prevents spam
- [ ] Error messages display properly

## 🐛 Troubleshooting

### Common Issues

1. **"Table not found" errors:**
   - Run `npx supabase db reset` to apply all migrations
   - Check migration files were created correctly

2. **Edge function not working:**
   - Check logs: `npx supabase functions logs support-verify-email`
   - Verify environment variables are set

3. **hCaptcha not showing:**
   - Verify `VITE_HCAPTCHA_SITE_KEY` is set
   - Check browser console for errors

4. **Email verification failing:**
   - Check email queue is working
   - Verify rate limits aren't blocking
   - Check Edge Function logs

## 📝 Next Steps

1. **Create remaining UI components** for users, organizations, and admins
2. **Set up email notifications** for ticket updates
3. **Implement real-time updates** using Supabase subscriptions
4. **Add file upload** functionality for attachments
5. **Create admin UI** for managing custom fields and request types
6. **Add analytics** for support metrics

## 🔐 Security Notes

- All tables use Row Level Security (RLS)
- Public submissions require hCaptcha
- Rate limiting prevents abuse
- Email verification for anonymous users
- Attachments stored in secure bucket
- Internal notes hidden from end users

## 📞 Support

For issues with this deployment:
1. Check Supabase logs for database errors
2. Check Edge Function logs for API errors
3. Check browser console for frontend errors
4. Review this guide for missed steps