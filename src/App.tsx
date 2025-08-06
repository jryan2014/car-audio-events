import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './components/NotificationSystem';
import UserBilling from './pages/UserBilling';
import AdminBilling from './pages/AdminBilling';
import CookieConsent from './components/CookieConsent';
import { loadConsentedScripts } from './utils/cookieConsent';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import { useCSRFProtection } from './utils/csrfProtection';
import ImpersonationBanner from './components/ImpersonationBanner';

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
const BusinessPricing = React.lazy(() => import('./pages/BusinessPricing'));
const BusinessFeatures = React.lazy(() => import('./pages/BusinessFeatures'));
const OrganizationPricing = React.lazy(() => import('./pages/OrganizationPricing'));
const OrganizationFeatures = React.lazy(() => import('./pages/OrganizationFeatures'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const AdminSettings = React.lazy(() => import('./pages/AdminSettings'));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'));
const AdminMembership = React.lazy(() => import('./pages/AdminMembership'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminEvents = React.lazy(() => import('./pages/AdminEvents'));
const AdminTeams = React.lazy(() => import('./pages/AdminTeams'));
const CreateEvent = React.lazy(() => import('./pages/CreateEvent'));
const EditEvent = React.lazy(() => import('./pages/EditEvent'));
const EventResults = React.lazy(() => import('./pages/EventResults'));
const UserDetails = React.lazy(() => import('./pages/UserDetails'));
const EditUser = React.lazy(() => import('./pages/EditUserEnhanced'));
const AdminAnalytics = React.lazy(() => import('./pages/AdminAnalytics'));
const AnalyticsSettings = React.lazy(() => import('./pages/AnalyticsSettings'));
const AdminBackup = React.lazy(() => import('./pages/AdminBackup'));
const AdManagement = React.lazy(() => import('./pages/AdManagement'));
const AdvertisePage = React.lazy(() => import('./pages/AdvertisePage'));
// const AdDebug = React.lazy(() => import('./pages/AdDebug')); // TODO: Create this page
const MemberAdDashboard = React.lazy(() => import('./pages/MemberAdDashboard'));
const AIConfiguration = React.lazy(() => import('./pages/AIConfiguration'));
const AIMigration = React.lazy(() => import('./pages/AIMigration'));
const CMSPages = React.lazy(() => import('./pages/CMSPages'));
const DynamicPage = React.lazy(() => import('./pages/DynamicPage'));
const SystemConfiguration = React.lazy(() => import('./pages/SystemConfiguration'));
const SystemConfigurationDemo = React.lazy(() => import('./pages/SystemConfigurationDemo'));
const OrganizationManager = React.lazy(() => import('./pages/OrganizationManager'));
const AdminContactSettingsPage = React.lazy(() => import('./pages/AdminContactSettings'));
const CompleteProfile = React.lazy(() => import('./pages/CompleteProfile'));
const NavigationManager = React.lazy(() => import('./pages/NavigationManager'));
// const TestAds = React.lazy(() => import('./pages/TestAds')); // TODO: Create this page
const DirectoryManager = React.lazy(() => import('./pages/DirectoryManager'));
const CreateDirectoryListing = React.lazy(() => import('./pages/CreateDirectoryListing'));
const DirectoryListingPending = React.lazy(() => import('./pages/DirectoryListingPending'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const ClaimOrganization = React.lazy(() => import('./pages/ClaimOrganization'));
const SearchResults = React.lazy(() => import('./pages/SearchResults'));
const NotificationHistory = React.lazy(() => import('./pages/NotificationHistory'));
const NotificationDetail = React.lazy(() => import('./pages/NotificationDetail'));
const JudgeScoring = React.lazy(() => import('./components/JudgeScoring'));
const CompetitionManagement = React.lazy(() => import('./pages/CompetitionManagement'));
const AdminBillingConfiguration = React.lazy(() => import('./pages/AdminBillingConfiguration'));
const NewsletterConfirm = React.lazy(() => import('./pages/NewsletterConfirm'));
const NewsletterUnsubscribe = React.lazy(() => import('./pages/NewsletterUnsubscribe'));
const AdminNewsletterManager = React.lazy(() => import('./pages/AdminNewsletterManager'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
const AdminLeaderboardManager = React.lazy(() => import('./components/AdminLeaderboardManager'));
const SPLCalculator = React.lazy(() => import('./pages/SPLCalculator'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));

// Support Desk components
const PublicSupportForm = React.lazy(() => import('./modules/support-desk/components/public/PublicSupportForm'));
const SupportSuccess = React.lazy(() => import('./modules/support-desk/components/public/SupportSuccess'));
const EmailVerificationPage = React.lazy(() => import('./modules/support-desk/components/public/EmailVerificationPage'));
const SupportDashboard = React.lazy(() => import('./modules/support-desk/components/user/SupportDashboard'));
const AdminSupportDashboard = React.lazy(() => import('./modules/support-desk/components/admin/AdminSupportDashboard'));
const OrgSupportDashboard = React.lazy(() => import('./modules/support-desk/components/organization/OrgSupportDashboard'));

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

function App() {
  // Initialize CSRF protection
  useCSRFProtection();
  
  // Use refs to prevent duplicate initialization
  const initializationRef = React.useRef({
    backup: false,
    scripts: false
  });
  
  useEffect(() => {
    let isMounted = true;
    
    // Initialize backup system only once
    const initializeBackupSystem = async () => {
      if (initializationRef.current.backup || !isMounted) return;
      initializationRef.current.backup = true;
      
      try {
        const { initializeBackupSystem } = await import('./utils/backup');
        if (isMounted) {
          initializeBackupSystem();
        }
      } catch (error) {
        console.error('Failed to initialize backup system:', error);
        initializationRef.current.backup = false;
      }
    };

    // Load consented tracking scripts only once initially
    const loadInitialScripts = () => {
      if (initializationRef.current.scripts || !isMounted) return;
      initializationRef.current.scripts = true;
      loadConsentedScripts();
    };

    initializeBackupSystem();
    loadInitialScripts();

    // Listen for consent changes (but don't load scripts on mount)
    const handleConsentChange = () => {
      if (isMounted) {
        loadConsentedScripts();
      }
    };

    window.addEventListener('cookieConsentChanged', handleConsentChange);
    
    return () => {
      isMounted = false;
      window.removeEventListener('cookieConsentChanged', handleConsentChange);
    };
  }, []);
  
  return (
    <HelmetProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <ScrollToTop />
            <ImpersonationBanner />
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
              {/* Routes with Layout wrapper */}
              <Route path="/" element={<Layout><Home /></Layout>} />
              <Route path="/dashboard" element={<Layout><ProtectedRoute requireProfileComplete={true}><Dashboard /></ProtectedRoute></Layout>} />
              <Route path="/complete-profile" element={<Layout><CompleteProfile /></Layout>} />
              <Route path="/events" element={<Layout><Events /></Layout>} />
              <Route path="/events/:id" element={<Layout><EventDetails /></Layout>} />
              <Route path="/profile" element={<Layout><ProtectedRoute requireProfileComplete={true}><Profile /></ProtectedRoute></Layout>} />
              <Route path="/directory" element={<Layout><Directory /></Layout>} />
              <Route path="/resources" element={<Layout><Resources /></Layout>} />
              <Route path="/search" element={<Layout><SearchResults /></Layout>} />
              <Route path="/notifications" element={<Layout><ProtectedRoute requireProfileComplete={true}><NotificationHistory /></ProtectedRoute></Layout>} />
              <Route path="/notifications/:id" element={<Layout><ProtectedRoute requireProfileComplete={true}><NotificationDetail /></ProtectedRoute></Layout>} />
              <Route path="/judge-scoring" element={<Layout><ProtectedRoute requireProfileComplete={true}><JudgeScoring /></ProtectedRoute></Layout>} />
              <Route path="/advertise" element={<Layout><ProtectedRoute><AdvertisePage /></ProtectedRoute></Layout>} />
              <Route path="/my-ads" element={<Layout><ProtectedRoute requireProfileComplete={true}><MemberAdDashboard /></ProtectedRoute></Layout>} />
              <Route path="/directory/create" element={<Layout><ProtectedRoute><CreateDirectoryListing /></ProtectedRoute></Layout>} />
              <Route path="/directory/pending" element={<Layout><DirectoryListingPending /></Layout>} />
              <Route path="/claim-organization/:organizationId" element={<Layout><ClaimOrganization /></Layout>} />
              
              {/* Support Routes */}
              <Route path="/support" element={<Layout><Suspense fallback={<LoadingSpinner />}><PublicSupportForm /></Suspense></Layout>} />
              <Route path="/support/verify" element={<Layout><Suspense fallback={<LoadingSpinner />}><EmailVerificationPage /></Suspense></Layout>} />
              <Route path="/support/success" element={<Layout><Suspense fallback={<LoadingSpinner />}><SupportSuccess /></Suspense></Layout>} />
              <Route path="/dashboard/support/*" element={<Layout><ProtectedRoute requireProfileComplete={true}><Suspense fallback={<LoadingSpinner />}><SupportDashboard /></Suspense></ProtectedRoute></Layout>} />
              <Route path="/organization/support/*" element={<Layout><ProtectedRoute requireProfileComplete={true}><Suspense fallback={<LoadingSpinner />}><OrgSupportDashboard /></Suspense></ProtectedRoute></Layout>} />
              
              <Route path="/login" element={<Layout><Login /></Layout>} />
              <Route path="/register" element={<Layout><Register /></Layout>} />
              <Route path="/verify-email" element={<Layout><VerifyEmail /></Layout>} />
              <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
              <Route path="/reset-password" element={<Layout><ResetPassword /></Layout>} />
              {/* <Route path="/test-ads" element={<Layout><TestAds /></Layout>} /> */}
              <Route path="/pricing" element={<Layout><Pricing /></Layout>} />
              <Route path="/business" element={<Layout><BusinessPricing /></Layout>} />
              <Route path="/business-features" element={<Layout><BusinessFeatures /></Layout>} />
              <Route path="/organizations" element={<Layout><OrganizationPricing /></Layout>} />
              <Route path="/organization-features" element={<Layout><OrganizationFeatures /></Layout>} />
              <Route path="/create-event" element={<Layout><ProtectedRoute><CreateEvent /></ProtectedRoute></Layout>} />
              <Route path="/events/:id/edit" element={<Layout><ProtectedRoute><EditEvent /></ProtectedRoute></Layout>} />
              <Route path="/events/:id/results" element={<Layout><ProtectedRoute><EventResults /></ProtectedRoute></Layout>} />
              <Route path="/ai-configuration" element={<Layout><AIConfiguration /></Layout>} />
              <Route path="/pages/:slug" element={<Layout><DynamicPage /></Layout>} />
              <Route path="/privacy-policy" element={<Layout><PrivacyPolicy /></Layout>} />
              <Route path="/newsletter/confirm/:token" element={<Layout><NewsletterConfirm /></Layout>} />
              <Route path="/newsletter/unsubscribe/:token" element={<Layout><NewsletterUnsubscribe /></Layout>} />
              <Route path="/leaderboard" element={<Layout><Leaderboard /></Layout>} />
              <Route path="/spl-calculator" element={<Layout><SPLCalculator /></Layout>} />
              
              {/* Billing routes with their own layout */}
              <Route path="/billing" element={<Layout><ProtectedRoute requireProfileComplete={true}><UserBilling /></ProtectedRoute></Layout>} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminDashboard /></Suspense></AdminLayout>} />
              <Route path="/admin/dashboard" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminDashboard /></Suspense></AdminLayout>} />
              <Route path="/admin/settings" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminSettings /></Suspense></AdminLayout>} />
              <Route path="/admin/users" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminUsers /></Suspense></AdminLayout>} />
              <Route path="/admin/users/:userId" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><UserDetails /></Suspense></AdminLayout>} />
              <Route path="/admin/users/:userId/edit" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><EditUser /></Suspense></AdminLayout>} />
              <Route path="/admin/membership" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminMembership /></Suspense></AdminLayout>} />
              <Route path="/admin/events" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminEvents /></Suspense></AdminLayout>} />
              <Route path="/admin/teams" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminTeams /></Suspense></AdminLayout>} />
              <Route path="/admin/competition-results" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminLeaderboardManager /></Suspense></AdminLayout>} />
              <Route path="/admin/backup" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminBackup /></Suspense></AdminLayout>} />
              <Route path="/admin/analytics" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminAnalytics /></Suspense></AdminLayout>} />
              <Route path="/analytics-settings" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AnalyticsSettings /></Suspense></AdminLayout>} />
              <Route path="/admin/ad-management" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdManagement /></Suspense></AdminLayout>} />
              <Route path="/admin/ai-configuration" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AIConfiguration /></Suspense></AdminLayout>} />
              {/* <Route path="/ad-debug" element={<AdDebug />} /> */}
              <Route path="/admin/ai-migration" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AIMigration /></Suspense></AdminLayout>} />
              <Route path="/admin/cms-pages" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><CMSPages /></Suspense></AdminLayout>} />
              <Route path="/admin/system-configuration" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><SystemConfiguration /></Suspense></AdminLayout>} />
              <Route path="/admin/system-configuration-demo" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><SystemConfigurationDemo /></Suspense></AdminLayout>} />
              <Route path="/admin/organizations" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><OrganizationManager /></Suspense></AdminLayout>} />
              <Route path="/admin/contact-settings" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminContactSettingsPage /></Suspense></AdminLayout>} />
              <Route path="/admin/navigation-manager" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><NavigationManager /></Suspense></AdminLayout>} />
              <Route path="/admin/directory-manager" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><DirectoryManager /></Suspense></AdminLayout>} />
              <Route path="/admin/competition-management" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><CompetitionManagement /></Suspense></AdminLayout>} />
              <Route path="/admin/billing" element={<AdminLayout><AdminBilling /></AdminLayout>} />
              <Route path="/admin/billing-configuration" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminBillingConfiguration /></Suspense></AdminLayout>} />
              <Route path="/admin/newsletter" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminNewsletterManager /></Suspense></AdminLayout>} />
              <Route path="/admin/support/*" element={<AdminLayout><Suspense fallback={<LoadingSpinner />}><AdminSupportDashboard /></Suspense></AdminLayout>} />
            </Routes>
          </Suspense>
          <CookieConsent />
        </Router>
      </NotificationProvider>
    </AuthProvider>
    </HelmetProvider>
  );
}

export default App;