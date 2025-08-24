# 🚗 Car Audio Events Platform

A comprehensive event management platform for the car audio competition community, featuring automatic geocoding, web scraping, and modern responsive design.

![Platform Preview](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![React](https://img.shields.io/badge/React-18.x-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green)

## ✨ Features

### 🎯 **Core Features**
- **Event Management** - Complete CRUD operations for car audio events
- **Auto-Geocoding** - Automatic coordinate generation from city/state
- **Interactive Map** - Real-time event locations with clustering
- **User Authentication** - Secure login/registration system
- **Admin Panel** - Comprehensive event and user management
- **Responsive Design** - Mobile-first, modern UI

### 🗺️ **Geocoding Service**
- **Multiple Providers** - OpenStreetMap (free), Google Maps, Mapbox
- **Automatic Fallbacks** - Ensures coordinates are always found
- **Real-time Processing** - Geocodes as you type
- **Bulk Operations** - Update coordinates for existing events

### 🕷️ **Web Scraper**
- **Multi-site Support** - MECA, IASCA, USACi, dB Drag Racing
- **Event Import** - Automatically import competitor events
- **Duplicate Detection** - Smart filtering of duplicate events
- **Data Validation** - Ensures imported data quality

### 🛡️ **Security & Performance**
- **Row Level Security** - Database-level access control
- **Real-time Updates** - Live data synchronization
- **Optimized Queries** - Fast loading times
- **Error Handling** - Comprehensive error management

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/car-audio-events-platform.git
cd car-audio-events-platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key (optional)
VITE_MAPBOX_API_KEY=your_mapbox_key (optional)
```

4. **Database Setup**
- Import the database schema from `supabase/migrations/`
- Run the complete database fix script if needed
- Set up Row Level Security policies

5. **Start Development Server**
```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AddCoordinatesModal.tsx
│   ├── GoogleMap.tsx
│   ├── Header.tsx
│   └── Footer.tsx
├── pages/              # Main application pages
│   ├── CreateEvent.tsx
│   ├── AdminEvents.tsx
│   ├── Events.tsx
│   └── Dashboard.tsx
├── services/           # Business logic services
│   ├── geocoding.ts    # Auto-geocoding service
│   └── webScraper.ts   # Web scraping service
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── hooks/              # Custom React hooks
└── lib/                # Utilities and configurations
    └── supabase.ts
```

## 🗺️ Geocoding Service

The platform includes a robust geocoding service that automatically converts addresses to coordinates:

```typescript
import { geocodingService } from './services/geocoding';

// Geocode a single address
const result = await geocodingService.geocodeAddress('Cleveland', 'Ohio', 'United States');

// Batch geocode multiple addresses
const results = await geocodingService.batchGeocode([
  { id: '1', city: 'Cleveland', state: 'Ohio' },
  { id: '2', city: 'Detroit', state: 'Michigan' }
]);
```

### Supported Providers
1. **OpenStreetMap Nominatim** (Free, no API key required)
2. **Google Maps Geocoding API** (Requires API key)
3. **Mapbox Geocoding API** (Requires API key)

## 🕷️ Web Scraper

Import events from major car audio competition websites:

```typescript
import { webScraperService } from './services/webScraper';

// Scrape all sources
const results = await webScraperService.scrapeAllSources();

// Scrape specific source
const mecaEvents = await webScraperService.scrapeSource('MECA Events');
```

### Supported Sites
- **MECA** - Mobile Electronics Competition Association
- **IASCA** - International Auto Sound Challenge Association  
- **USACi** - United States Autosound Competition International
- **dB Drag Racing** - Sound pressure level competitions

## 🎯 Admin Features

### Event Management
- Approve/reject event submissions
- Bulk coordinate updates
- Event editing and deletion
- Status management

### User Management
- User role assignment
- Membership management
- Activity monitoring

### Analytics
- Event statistics
- User engagement metrics
- Geographic distribution

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Database Migrations
Database migrations are located in `supabase/migrations/`. Key migrations:
- Initial schema setup
- Event categories and organizations
- Complete database schema with all columns
- RLS policies

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Netlify
1. Connect repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Configure environment variables

### Custom Server
1. Build the project: `npm run build`
2. Serve the `dist` folder with any static file server
3. Configure environment variables on your server

## 🔧 Configuration

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key | No |
| `VITE_MAPBOX_API_KEY` | Mapbox API key | No |

### Database Configuration
The platform requires a Supabase database with:
- Events table with 50+ columns
- User authentication
- Row Level Security policies
- Event categories and organizations

## 📋 TODO Roadmap

See [TODO.md](TODO.md) for the complete development roadmap including:
- 🔥 Immediate priorities (1-2 weeks)
- 🎯 Core features (2-4 weeks)  
- 🚀 Advanced features (1-3 months)
- 🔧 Technical improvements (ongoing)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [TODO.md](TODO.md) for detailed feature information
- **Issues**: Report bugs and request features via GitHub Issues
- **Community**: Join the car audio competition community discussions

## 🏆 Acknowledgments

- Car audio competition community for requirements and feedback
- Supabase for the excellent backend-as-a-service platform
- OpenStreetMap for free geocoding services
- React and TypeScript communities for amazing tools

---

**Built with ❤️ for the car audio competition community**

![Car Audio Events](https://img.shields.io/badge/Car%20Audio-Events%20Platform-orange)
![Community Driven](https://img.shields.io/badge/Community-Driven-purple)
