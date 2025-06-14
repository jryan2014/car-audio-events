import React from 'react';
import Header from './Header';
import Footer from './Footer';
import PasswordChangeModal from './PasswordChangeModal';
import PendingApprovalBanner from './PendingApprovalBanner';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <Header />
      <PendingApprovalBanner />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}