import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Profile from './pages/Profile';
import Directory from './pages/Directory';
import Resources from './pages/Resources';
import Login from './pages/Login';
import Register from './pages/Register';
import Pricing from './pages/Pricing';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminSettings from './pages/AdminSettings';
import AdminUsers from './pages/AdminUsers';
import AdminMembership from './pages/AdminMembership';
import AdminDashboard from './pages/AdminDashboard';
import AdminEvents from './pages/AdminEvents';
import CreateEvent from './pages/CreateEvent';
import EditEvent from './pages/EditEvent';
import UserDetails from './pages/UserDetails';
import EditUser from './pages/EditUser';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminBackup from './pages/AdminBackup';
import AdManagement from './pages/AdManagement';
import AdvertisePage from './pages/AdvertisePage';
import MemberAdDashboard from './pages/MemberAdDashboard';
import AIConfiguration from './pages/AIConfiguration';
import CMSPages from './pages/CMSPages';
import DynamicPage from './pages/DynamicPage';
import SystemConfiguration from './pages/SystemConfiguration';
import SystemConfigurationDemo from './pages/SystemConfigurationDemo';
import OrganizationManager from './pages/OrganizationManager';
import AdminContactSettingsPage from './pages/AdminContactSettings';
import AdminEmailSettingsPage from './pages/AdminEmailSettings';
import NavigationManager from './pages/NavigationManager';
import DirectoryManager from './pages/DirectoryManager';
import CreateDirectoryListing from './pages/CreateDirectoryListing';
import DirectoryListingPending from './pages/DirectoryListingPending';
import ClaimOrganization from './pages/ClaimOrganization';
import { AuthProvider } from './contexts/AuthContext';

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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/directory" element={<Directory />} />
            <Route path="/resources" element={<Resources />} />
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
            <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
            <Route path="/admin/users/:userId" element={<AdminLayout><UserDetails /></AdminLayout>} />
            <Route path="/admin/users/:userId/edit" element={<AdminLayout><EditUser /></AdminLayout>} />
            <Route path="/admin/membership" element={<AdminLayout><AdminMembership /></AdminLayout>} />
            <Route path="/admin/events" element={<AdminLayout><AdminEvents /></AdminLayout>} />
            <Route path="/admin/backup" element={<AdminLayout><AdminBackup /></AdminLayout>} />
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/events/:id/edit" element={<EditEvent />} />
            <Route path="/admin/analytics" element={<AdminLayout><AdminAnalytics /></AdminLayout>} />
            <Route path="/admin/ad-management" element={<AdminLayout><AdManagement /></AdminLayout>} />
            <Route path="/admin/ai-configuration" element={<AdminLayout><AIConfiguration /></AdminLayout>} />
            <Route path="/admin/cms-pages" element={<AdminLayout><CMSPages /></AdminLayout>} />
            <Route path="/pages/:slug" element={<DynamicPage />} />
            <Route path="/admin/system-configuration" element={<AdminLayout><SystemConfiguration /></AdminLayout>} />
            <Route path="/admin/system-configuration-demo" element={<AdminLayout><SystemConfigurationDemo /></AdminLayout>} />
            <Route path="/admin/organizations" element={<AdminLayout><OrganizationManager /></AdminLayout>} />
            <Route path="/admin/contact-settings" element={<AdminLayout><AdminContactSettingsPage /></AdminLayout>} />
            <Route path="/admin/email-settings" element={<AdminLayout><AdminEmailSettingsPage /></AdminLayout>} />
            <Route path="/admin/navigation-manager" element={<AdminLayout><NavigationManager /></AdminLayout>} />
            <Route path="/admin/directory-manager" element={<AdminLayout><DirectoryManager /></AdminLayout>} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;