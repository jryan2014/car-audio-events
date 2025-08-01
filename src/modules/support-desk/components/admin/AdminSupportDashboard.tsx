import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminTicketList from './AdminTicketList';
import AdminSupportSettings from './AdminSupportSettings';
import OrganizationManagement from './OrganizationManagement';
import BulkOrganizationSetup from './BulkOrganizationSetup';
import SupportAnalytics from './SupportAnalytics';
import TicketDetail from '../user/TicketDetail'; // Reuse the same detail component

const AdminSupportDashboard: React.FC = () => {
  return (
    <Routes>
      <Route index element={<AdminTicketList />} />
      <Route path="ticket/:ticketId" element={<TicketDetail />} />
      <Route path="settings" element={<AdminSupportSettings />} />
      <Route path="organizations" element={<OrganizationManagement />} />
      <Route path="organizations/bulk-setup" element={<BulkOrganizationSetup />} />
      <Route path="analytics" element={<SupportAnalytics />} />
      <Route path="analytics/tickets" element={<SupportAnalytics initialTab="tickets" />} />
      <Route path="analytics/agents" element={<SupportAnalytics initialTab="agents" />} />
      <Route path="analytics/satisfaction" element={<SupportAnalytics initialTab="satisfaction" />} />
      <Route path="*" element={<Navigate to="/admin/support" replace />} />
    </Routes>
  );
};

export default AdminSupportDashboard;