# Car Audio Events - Competition Platform

A modern React application for car audio competition enthusiasts to discover events, track scores, and connect with the community.

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: Netlify
- **Maps**: Google Maps API
- **Icons**: Lucide React

## 🏗️ Architecture

### Frontend (Netlify)
- Static React SPA with client-side routing
- Responsive design with Tailwind CSS
- Real-time updates via Supabase subscriptions
- Google Maps integration for event locations

### Backend (Supabase)
- PostgreSQL database with Row Level Security (RLS)
- Real-time subscriptions for live updates
- Built-in authentication (email/password)
- File storage for user profiles and event images
- Edge functions for custom API endpoints

## 📦 Setup Instructions

### 1. Clone and Install
```bash
git clone <repository-url>
cd car-audio-events
npm install
```

### 2. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Create a `.env` file based on `.env.example`
4. Set up the database schema (see Database Schema section)
5. Create the initial admin user (see Admin Setup section)

### 3. Google Maps Setup
1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com)
2. Enable Maps JavaScript API and Places API
3. Add the API key to your `.env` file

### 4. Environment Variables
Create a `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Note: Stripe secret key and webhook secret are configured in Supabase Edge Functions
```

### 5. Development
```bash
npm run dev
```

### 5. Admin Setup
After setting up your Supabase project and running the database migrations, you need to create the initial admin user:

1. **Deploy Edge Functions**: The admin user creation is handled by a Supabase Edge Function. Make sure all edge functions are deployed to your Supabase project.

2. **Create Admin User**: Use the following curl command to create the initial admin user:
```bash
curl -X POST "https://YOUR_SUPABASE_PROJECT_URL/functions/v1/create-admin-user" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```
Replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual Supabase project values.

3. **Default Admin Credentials**: The function creates an admin user with these credentials:
   - **Email**: `admin@caraudioevents.com`
   - **Password**: `TempAdmin123!`

4. **Important**: Change the admin password immediately after first login for security.

### 6. Deployment to Netlify
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Deploy!

## 🗄️ Database Schema

### Core Tables
- `users` - User profiles and authentication
- `events` - Car audio competitions and shows
- `registrations` - Event registrations
- `scores` - Competition scores and rankings
- `teams` - Team memberships
- `businesses` - Directory listings (retailers/manufacturers)

### Features
- Row Level Security (RLS) for data protection
- Real-time subscriptions for live updates
- Full-text search capabilities
- Geospatial queries for location-based features

## 🔐 Authentication

- Email/password authentication via Supabase Auth
- Protected routes for authenticated users
- Role-based access (competitor, retailer, manufacturer, admin)
- Profile management with image uploads

## 💳 Payment Processing

### Stripe Integration
- Secure payment processing via Stripe
- Event registration payments
- Subscription management (Competitor, Pro, Business plans)
- Webhook handling for payment confirmations
- PCI compliant payment forms

### Payment Features
- One-time event registration payments
- Annual subscription billing
- Automatic payment confirmation
- Payment history tracking
- Refund management (via Stripe dashboard)

### Subscription Plans
- **Competitor (Free)**: Basic features for getting started
- **Pro Competitor ($29/year)**: Advanced analytics and features
- **Business ($99/year)**: Full business features and directory listing

## 🌟 Key Features

### For Competitors
- Browse and register for events
- Track competition scores and rankings
- Build and showcase audio system profiles
- Join teams and connect with community

### For Businesses
- Directory listings with contact information
- Event sponsorship opportunities
- Customer analytics and insights
- Advertising and promotion tools

### For Event Organizers
- Create and manage events
- Registration management
- Score tracking and leaderboards
- Real-time event updates

## 🚀 Performance

- Static site generation for fast loading
- Image optimization with Supabase Storage
- CDN delivery via Netlify
- Real-time updates without page refreshes
- Mobile-optimized responsive design

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Organization
- `/src/components` - Reusable UI components
- `/src/pages` - Route components
- `/src/contexts` - React contexts (Auth, etc.)
- `/src/lib` - Utilities and configurations
- `/src/types` - TypeScript type definitions

## 📱 Mobile Support

Fully responsive design optimized for:
- Mobile phones (320px+)
- Tablets (768px+)
- Desktop (1024px+)
- Large screens (1440px+)

## 🔒 Security

- Row Level Security (RLS) on all database tables
- Environment variables for sensitive data
- HTTPS enforcement
- Input validation and sanitization
- Protected API endpoints

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 License

MIT License - see LICENSE file for details