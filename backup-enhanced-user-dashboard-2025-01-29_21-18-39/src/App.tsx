import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import { AuthProvider } from './contexts/AuthContext';

// Convert all page imports to lazy loading for code splitting
const Home = React.lazy(() => import('./pages/Home'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Events = React.lazy(() => import('./pages/Events'));
const EventDetails = React.lazy(() => import('./pages/EventDetails'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Directory = React.lazy(() => import('./pages/Directory'));
const Resources = React.lazy(() => import('./pages/Resources'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const AdminSettings = React.lazy(() => import('./pages/AdminSettings'));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'));
const AdminMembership = React.lazy(() => import('./pages/AdminMembership'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminEvents = React.lazy(() => import('./pages/AdminEvents'));
const CreateEvent = React.lazy(() => import('./pages/CreateEvent'));
const EditEvent = React.lazy(() => import('./pages/EditEvent'));
const UserDetails = React.lazy(() => import('./pages/UserDetails'));
const EditUser = React.lazy(() => import('./pages/EditUser'));
const AdminAnalytics = React.lazy(() => import('./pages/AdminAnalytics'));
const AdminBackup = React.lazy(() => import('./pages/AdminBackup'));
const AdManagement = React.lazy(() => import('./pages/AdManagement'));
const AdvertisePage = React.lazy(() => import('./pages/AdvertisePage'));
const MemberAdDashboard = React.lazy(() => import('./pages/MemberAdDashboard'));
const AIConfiguration = React.lazy(() => import('./pages/AIConfiguration'));
const CMSPages = React.lazy(() => import('./pages/CMSPages'));
const DynamicPage = React.lazy(() => import('./pages/DynamicPage'));
const SystemConfiguration = React.lazy(() => import('./pages/SystemConfiguration'));
const SystemConfigurationDemo = React.lazy(() => import('./pages/SystemConfigurationDemo'));
const OrganizationManager = React.lazy(() => import('./pages/OrganizationManager'));
const AdminContactSettingsPage = React.lazy(() => import('./pages/AdminContactSettings'));
const AdminEmailSettingsPage = React.lazy(() => import('./pages/AdminEmailSettings'));
const NavigationManager = React.lazy(() => import('./pages/NavigationManager'));
const DirectoryManager = React.lazy(() => import('./pages/DirectoryManager'));
const CreateDirectoryListing = React.lazy(() => import('./pages/CreateDirectoryListing'));
const DirectoryListingPending = React.lazy(() => import('./pages/DirectoryListingPending'));
const ClaimOrganization = React.lazy(() => import('./pages/ClaimOrganization'));
const SearchResults = React.lazy(() => import('./pages/SearchResults'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

function App() {
  useEffect(() => {
    // Initialize backup system when app starts
    const initializeBackupSystem = async () => {
      try {
        const { initializeBackupSystem } = await import('./utils/backup');
        initializeBackupSystem();
      } catch (error) {
        console.error('Failed to initialize backup system:', error);
      }
    };

    initializeBackupSystem();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:id" element={<EventDetails />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/directory" element={<Directory />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/advertise" element={<AdvertisePage />} />
              <Route path="/my-ads" element={<MemberAdDashboard />} />
              <Route path="/directory/create" element={<CreateDirectoryListing />} />
              <Route path="/directory/pending" element={<DirectoryListingPending />} />
              <Route path="/claim-organization/:organizationId" element={<ClaimOrganization />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/admin" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminDashboard /></Suspense></AdminLayout>} />
              <Route path="/admin/dashboard" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminDashboard /></Suspense></AdminLayout>} />
              <Route path="/admin/settings" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminSettings /></Suspense></AdminLayout>} />
              <Route path="/admin/users" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminUsers /></Suspense></AdminLayout>} />
              <Route path="/admin/users/:userId" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><UserDetails /></Suspense></AdminLayout>} />
              <Route path="/admin/users/:userId/edit" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><EditUser /></Suspense></AdminLayout>} />
              <Route path="/admin/membership" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminMembership /></Suspense></AdminLayout>} />
              <Route path="/admin/events" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminEvents /></Suspense></AdminLayout>} />
              <Route path="/admin/backup" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminBackup /></Suspense></AdminLayout>} />
              <Route path="/create-event" element={<CreateEvent />} />
              <Route path="/events/:id/edit" element={<EditEvent />} />
              <Route path="/admin/analytics" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminAnalytics /></Suspense></AdminLayout>} />
              <Route path="/admin/ad-management" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdManagement /></Suspense></AdminLayout>} />
              <Route path="/ai-configuration" element={<AIConfiguration />} />
              <Route path="/admin/ai-configuration" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AIConfiguration /></Suspense></AdminLayout>} />
              <Route path="/admin/cms-pages" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><CMSPages /></Suspense></AdminLayout>} />
              <Route path="/pages/:slug" element={<DynamicPage />} />
              <Route path="/admin/system-configuration" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><SystemConfiguration /></Suspense></AdminLayout>} />
              <Route path="/admin/system-configuration-demo" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><SystemConfigurationDemo /></Suspense></AdminLayout>} />
              <Route path="/admin/organizations" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><OrganizationManager /></Suspense></AdminLayout>} />
              <Route path="/admin/contact-settings" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminContactSettingsPage /></Suspense></AdminLayout>} />
              <Route path="/admin/email-settings" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminEmailSettingsPage /></Suspense></AdminLayout>} />
              <Route path="/admin/navigation-manager" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><NavigationManager /></Suspense></AdminLayout>} />
              <Route path="/admin/directory-manager" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><DirectoryManager /></Suspense></AdminLayout>} />
            </Routes>
          </Suspense>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;