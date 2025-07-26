# Settings Accordion Update - User Profile

## Summary
The user profile settings tab has been reorganized with an accordion layout for better navigation and organization. Users no longer need to scroll through long lists of settings - everything is now neatly categorized in collapsible sections.

## What Changed

### Before
- All settings were displayed in one long scrollable page
- Notification preferences, email settings, and other options were mixed together
- Users had to scroll to find specific settings

### After
- Settings are organized into 5 accordion sections:
  1. **Notification Preferences** (opens by default)
  2. **Email & Newsletter**
  3. **Privacy Settings**  
  4. **Security**
  5. **Data & Account**

## New Accordion Sections

### 1. Notification Preferences 🔔
- Choose which types of notifications you want to receive
- Options include: Event Reminders, Competition Results, Team Invitations, System Updates, Marketing, Newsletter
- Each category can be individually enabled/disabled
- Save button appears when changes are made

### 2. Email & Newsletter ✉️
- Newsletter subscription preferences
- Email communication settings
- Opt-in/out of various email types

### 3. Privacy Settings 👁️
- Control profile visibility in member directory
- Show/hide competition results
- Display audio system details to other members
- Allow other members to contact you

### 4. Security 🔒
- Two-Factor Authentication setup
- Change password
- View and manage active sessions
- Enhanced account security options

### 5. Data & Account 📥
- Export your data (profile, events, audio system info)
- Request data export in downloadable format
- Account deletion option with clear warnings

## Benefits
- **Better Organization**: Settings grouped by category
- **Easier Navigation**: Click to expand only what you need
- **Cleaner Interface**: Less visual clutter
- **Faster Access**: No more endless scrolling
- **Mobile Friendly**: Works great on all screen sizes

## Technical Details
- Created reusable `Accordion` component in `src/components/ui/Accordion.tsx`
- Multiple sections can be open at once (allowMultiple=true)
- Smooth animations for expand/collapse
- Icons for each section for visual clarity
- Maintains all existing functionality

## File Changes
- `src/components/ui/Accordion.tsx` - New accordion component
- `src/pages/Profile.tsx` - Updated settings tab to use accordion
- All notification and preference components remain unchanged