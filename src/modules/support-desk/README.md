# Support Desk Module

A modular, secure support ticket system for Car Audio Events.

## Structure

```
support-desk/
├── components/           # React components
│   ├── public/          # Public-facing components
│   ├── user/            # User dashboard components
│   ├── organization/    # Organization management components
│   ├── admin/           # Admin management components
│   └── shared/          # Shared components
├── hooks/               # Custom React hooks
├── services/            # Business logic and API services
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── database/            # Database schema and migrations
└── edge-functions/      # Supabase Edge Functions
```

## Features

- **Multi-tenant Support**: Separate views for public, users, organizations, and admins
- **Ticket Routing**: Automatic routing to internal support or organizations
- **Custom Fields**: Dynamic form fields based on request type and user role
- **Spam Protection**: hCaptcha integration and rate limiting
- **Real-time Updates**: Live ticket updates using Supabase subscriptions
- **Email Notifications**: Automated notifications for ticket updates

## Usage

### Public Support Form
```tsx
import { PublicSupportForm } from '@/modules/support-desk/components/public/PublicSupportForm';

// In your page component
<PublicSupportForm />
```

### User Dashboard
```tsx
import { UserTicketList } from '@/modules/support-desk/components/user/UserTicketList';

// In your dashboard
<UserTicketList userId={user.id} />
```

### Organization Management
```tsx
import { OrgSupportDashboard } from '@/modules/support-desk/components/organization/OrgSupportDashboard';

// In organization dashboard
<OrgSupportDashboard organizationId={org.id} />
```

### Admin Management
```tsx
import { AdminSupportDashboard } from '@/modules/support-desk/components/admin/AdminSupportDashboard';

// In admin panel
<AdminSupportDashboard />
```

## Security

- All database operations use Row Level Security (RLS)
- Public forms require hCaptcha verification
- Rate limiting on all public endpoints
- Session-based authentication for logged-in users
- Organization-level access control

## Development

### Database Migrations
```bash
# Apply support desk migrations
npx supabase db push

# Or reset and apply all migrations
npx supabase db reset
```

### Environment Variables
```env
VITE_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key
```

### Testing
```bash
# Run support desk tests
npm test -- support-desk
```