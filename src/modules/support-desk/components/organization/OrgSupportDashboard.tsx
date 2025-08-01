import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import OrgSupportSettings from './OrgSupportSettings';
import OrgTicketList from './OrgTicketList';
import OrgTicketDetail from './OrgTicketDetail';

const OrgSupportDashboard: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <Routes>
        <Route index element={<Navigate to="tickets" replace />} />
        <Route path="tickets" element={<OrgTicketList />} />
        <Route path="tickets/:ticketId" element={<OrgTicketDetail />} />
        <Route path="settings" element={<OrgSupportSettings />} />
      </Routes>
    </div>
  );
};

export default OrgSupportDashboard;