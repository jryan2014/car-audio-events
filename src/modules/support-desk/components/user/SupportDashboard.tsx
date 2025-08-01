import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TicketList from './TicketList';
import TicketDetail from './TicketDetail';

const SupportDashboard: React.FC = () => {
  return (
    <Routes>
      <Route index element={<TicketList />} />
      <Route path="ticket/:ticketId" element={<TicketDetail />} />
      <Route path="*" element={<Navigate to="/dashboard/support" replace />} />
    </Routes>
  );
};

export default SupportDashboard;