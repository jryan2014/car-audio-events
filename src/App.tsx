import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Profile from './pages/Profile';
import Directory from './pages/Directory';
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
            <Route path="/directory/create" element={<CreateDirectoryListing />} />
            <Route path="/directory/pending" element={<DirectoryListingPending />} />
            <Route path="/claim-organization/:organizationId" element={<ClaimOrganization />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/users/:userId" element={<UserDetails />} />
            <Route path="/admin/users/:userId/edit" element={<EditUser />} />
            <Route path="/admin/membership" element={<AdminMembership />} />
            <Route path="/admin/events" element={<AdminEvents />} />
            <Route path="/admin/backup" element={<AdminBackup />} />
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/events/:id/edit" element={<EditEvent />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/ad-management" element={<AdManagement />} />
            <Route path="/admin/cms-pages" element={<CMSPages />} />
            <Route path="/pages/:slug" element={<DynamicPage />} />
            <Route path="/admin/system-configuration" element={<SystemConfiguration />} />
            <Route path="/admin/system-configuration-demo" element={<SystemConfigurationDemo />} />
            <Route path="/admin/organizations" element={<OrganizationManager />} />
            <Route path="/admin/contact-settings" element={<AdminContactSettingsPage />} />
            <Route path="/admin/email-settings" element={<AdminEmailSettingsPage />} />
            <Route path="/admin/navigation-manager" element={<NavigationManager />} />
            <Route path="/admin/directory-manager" element={<DirectoryManager />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;