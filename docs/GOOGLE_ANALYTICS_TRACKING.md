# Google Analytics 4 (GA4) Tracking Documentation

## Configuration
- **Measurement ID**: G-X0E2DPE4F7
- **Environment Variable**: `VITE_GA_MEASUREMENT_ID`
- **Location**: Stored in Netlify environment variables for production

## Automatic Page View Tracking

**ALL pages are automatically tracked**, including:
- Static pages (Home, Events, Directory, Resources, etc.)
- Dynamic event pages (`/events/123`, `/events/456`, etc.)
- Dynamic profile pages (`/member/xxx`, `/public-profile/xxx`)
- Any new pages added in the future

### How It Works
The `useGoogleAnalytics` hook in `src/hooks/useGoogleAnalytics.ts` automatically:
1. Detects route changes via React Router
2. Sends pageview to GA4 with page path and title
3. Categorizes pages into sections (events, directory, resources)

### Page Titles Sent to GA4
- **Home**: "Home"
- **Events List**: "Events Directory"
- **Event Details**: "Event Details - [Event ID]"
- **Directory**: "Business Directory"
- **Community**: "Community Members"
- **Resources**: "Resources"
- **Member Profiles**: "Member Profile" or "Public Profile"
- **Dynamic Pages**: Automatically uses the path if not specifically mapped

## Event Tracking

### User Authentication Events
- **Registration**: `trackUserRegistration(method)`
- **Login**: `trackUserLogin(method)`

### Event Interaction Events
- **View Event**: Automatically tracked when event details load
  - Action: `view_event`
  - Category: `engagement`
  - Label: Event name and ID
  
- **Start Registration**: When user clicks "Register for This Event"
  - Action: `registration_started`
  - Category: `conversion`
  - Label: Event name and ID

- **Favorite Event**: When user saves an event
  - Action: `favorite_event` or `unfavorite_event`
  - Category: `engagement`
  - Label: Event name and ID

- **Event Category View**: Tracks which types of events are viewed
  - Action: `view_event_category`
  - Category: `engagement`
  - Label: Category name (IASCA, MECA, Bass Wars, etc.)

### E-commerce Events
- **Payment Completion**: `trackPaymentCompletion(amount, method)`
- **Event Registration**: `trackEventRegistration(eventName, eventId)`

### User Engagement Events
- **Search**: `trackSearch(searchTerm)`
- **Form Submission**: `trackFormSubmission(formName)`
- **Social Click**: `trackSocialClick(network, action)`
- **Ad Click**: `trackAdClick(adId, advertiserName)`

### Page Section Navigation
Automatically tracks when users enter major sections:
- `events_section` - Any `/events/*` page
- `directory_section` - Any `/directory/*` or `/public-directory/*` page
- `resources_section` - Any `/resources/*` page

## How to Add Tracking to New Features

### Import the GA utilities:
```typescript
import * as ga from '../utils/googleAnalytics';
```

### Track a custom event:
```typescript
ga.event({
  action: 'button_click',
  category: 'engagement',
  label: 'header_cta',
  value: 1
});
```

### Track specific actions:
```typescript
// User registration
ga.trackUserRegistration('email');

// Payment completion
ga.trackPaymentCompletion(25.00, 'stripe');

// Search
ga.trackSearch('IASCA events near me');
```

## Viewing Analytics

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select the Car Audio Events property
3. View real-time data in **Reports > Realtime**
4. View historical data in **Reports > Life cycle**

### Key Reports to Monitor:
- **Acquisition**: Where users come from
- **Engagement**: Page views, events, engagement time
- **Monetization**: Payment completions, event registrations
- **User**: Demographics, devices, locations

## Privacy & Compliance

- GA4 respects user privacy settings
- No personally identifiable information (PII) is sent
- Cookie consent is handled via the Cookie Consent component
- Users can opt-out of tracking

## Testing

To test tracking in development:
1. Open Chrome DevTools > Network tab
2. Filter by "google-analytics" or "gtag"
3. Navigate pages and interact with features
4. Verify requests are sent with correct parameters

## Future Enhancements

The tracking system is designed to be extensible. Consider adding:
- Scroll depth tracking for long pages
- Video engagement tracking
- Form abandonment tracking
- Enhanced e-commerce tracking with product impressions
- Custom audiences based on user behavior

---
Last Updated: January 2025