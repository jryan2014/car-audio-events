import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, Calendar, MapPin, Users, LogOut, Settings, Shield, Package, BarChart3, Target, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-gradient-to-r from-black/90 to-purple-900/90 backdrop-blur-lg border-b border-electric-500/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-electric-500 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-white">Car Audio Events</h1>
              <p className="text-xs text-electric-300">Competition Platform</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium"
            >
              Home
            </Link>
            {isAuthenticated && (
              <Link 
                to={user?.membershipType === 'admin' ? '/admin/dashboard' : '/dashboard'}
                className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium"
              >
                Dashboard
              </Link>
            )}
            <Link 
              to="/events" 
              className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium flex items-center space-x-1"
            >
              <Calendar className="h-4 w-4" />
              <span>Events</span>
            </Link>
            <Link 
              to="/directory" 
              className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium flex items-center space-x-1"
            >
              <MapPin className="h-4 w-4" />
              <span>Directory</span>
            </Link>
            <Link 
              to="/pricing" 
              className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium"
            >
              Pricing
            </Link>
            {isAuthenticated && user?.membershipType && ['retailer', 'manufacturer', 'organization', 'admin'].includes(user.membershipType) && (
              <Link 
                to="/admin/ad-management" 
                className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium flex items-center space-x-1"
              >
                <Target className="h-4 w-4" />
                <span>Advertise</span>
              </Link>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/profile"
                  className="flex items-center space-x-2 text-gray-300 hover:text-electric-400 transition-colors duration-200"
                >
                  {user?.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt={user.name}
                      className="w-8 h-8 rounded-full border-2 border-electric-500"
                    />
                  ) : (
                    <User className="h-8 w-8 p-1 bg-electric-500 rounded-full text-white" />
                  )}
                  <span className="hidden sm:block font-medium">{user?.name}</span>
                </Link>
                
                {user?.membershipType === 'admin' && (
                  <div className="relative">
                    <button
                      onClick={() => setShowAdminMenu(!showAdminMenu)}
                      className="text-gray-300 hover:text-electric-400 transition-colors duration-200 p-2 flex items-center space-x-1"
                      title="Admin Menu"
                    >
                      <Shield className="h-5 w-5" />
                      <span className="hidden sm:block text-sm">Admin</span>
                    </button>
                    
                    {showAdminMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                        <div className="py-2">
                          <Link
                            to="/admin/dashboard"
                            className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                            onClick={() => setShowAdminMenu(false)}
                          >
                            <Shield className="h-4 w-4" />
                            <span>Dashboard</span>
                          </Link>
                          <Link
                            to="/admin/users"
                            className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                            onClick={() => setShowAdminMenu(false)}
                          >
                            <Users className="h-4 w-4" />
                            <span>User Management</span>
                          </Link>
                          <Link
                            to="/admin/settings"
                            className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                            onClick={() => setShowAdminMenu(false)}
                          >
                            <Settings className="h-4 w-4" />
                            <span>System Settings</span>
                          </Link>
                          <Link
                            to="/admin/membership"
                            className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                            onClick={() => setShowAdminMenu(false)}
                          >
                            <Package className="h-4 w-4" />
                            <span>Membership Plans</span>
                          </Link>
                          <Link
                            to="/admin/events"
                            className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                            onClick={() => setShowAdminMenu(false)}
                          >
                            <Calendar className="h-4 w-4" />
                            <span>Event Management</span>
                          </Link>
                          <Link
                            to="/admin/analytics"
                            className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                            onClick={() => setShowAdminMenu(false)}
                          >
                            <BarChart3 className="h-4 w-4" />
                            <span>Analytics</span>
                          </Link>
                          <Link
                            to="/admin/cms-pages"
                            className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                            onClick={() => setShowAdminMenu(false)}
                          >
                            <FileText className="h-4 w-4" />
                            <span>CMS Pages</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <button
                  onClick={handleLogout}
                  className="text-gray-300 hover:text-red-400 transition-colors duration-200 p-2"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-4">
                <Link 
                  to="/login"
                  className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium"
                >
                  Login
                </Link>
                <Link 
                  to="/register"
                  className="bg-electric-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 shadow-lg"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-gray-300 hover:text-white transition-colors duration-200"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-electric-500/20">
            <div className="flex flex-col space-y-4">
              <Link 
                to="/" 
                className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              {isAuthenticated && (
                <Link 
                  to={user?.membershipType === 'admin' ? '/admin/dashboard' : '/dashboard'}
                  className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              <Link 
                to="/events" 
                className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium flex items-center space-x-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <Calendar className="h-4 w-4" />
                <span>Events</span>
              </Link>
              <Link 
                to="/directory" 
                className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium flex items-center space-x-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <MapPin className="h-4 w-4" />
                <span>Directory</span>
              </Link>
              
              <Link 
                to="/pricing" 
                className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              
              {isAuthenticated && user?.membershipType && ['retailer', 'manufacturer', 'organization', 'admin'].includes(user.membershipType) && (
                <Link 
                  to="/admin/ad-management" 
                  className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium flex items-center space-x-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Target className="h-4 w-4" />
                  <span>Advertise</span>
                </Link>
              )}
              
              {user?.membershipType === 'admin' && (
                <>
                  <div className="border-t border-gray-700 pt-4">
                    <div className="text-gray-500 text-sm font-medium mb-2">Admin</div>
                    <Link 
                      to="/admin/dashboard" 
                      className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium flex items-center space-x-2 ml-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Shield className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                    <Link 
                      to="/admin/users" 
                      className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium flex items-center space-x-2 ml-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Users className="h-4 w-4" />
                      <span>User Management</span>
                    </Link>
                    <Link 
                      to="/admin/settings" 
                      className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium flex items-center space-x-2 ml-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      <span>System Settings</span>
                    </Link>
                    <Link 
                      to="/admin/membership" 
                      className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium flex items-center space-x-2 ml-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Package className="h-4 w-4" />
                      <span>Membership Plans</span>
                    </Link>
                    <Link 
                      to="/admin/events" 
                      className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium flex items-center space-x-2 ml-4"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Event Management</span>
                    </Link>
                    <Link
                      to="/admin/analytics"
                      className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Analytics</span>
                    </Link>
                    <Link
                      to="/admin/cms-pages"
                      className="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <FileText className="h-4 w-4" />
                      <span>CMS Pages</span>
                    </Link>
                  </div>
                </>
              )}
              
              {!isAuthenticated && (
                <>
                  <Link 
                    to="/login"
                    className="text-gray-300 hover:text-electric-400 transition-colors duration-200 font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register"
                    className="bg-electric-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-electric-600 transition-all duration-200 shadow-lg text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}