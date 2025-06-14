import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, Calendar, MapPin, Users, LogOut, Settings, Shield, Package, BarChart3, Target, FileText, Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import MegaMenu from './MegaMenu';
import MobileMegaMenu from './MobileMegaMenu';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
    setIsUserDropdownOpen(false);
  };

  return (
    <header className="bg-gradient-to-r from-black/90 to-purple-900/90 backdrop-blur-lg border-b border-electric-500/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 flex-shrink-0">
            <img 
              src="/CAE_Logo_noBgColor.png" 
              alt="Car Audio Events" 
              className="h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation - Mega Menu */}
          <div className="hidden md:flex flex-1 justify-center">
            <MegaMenu 
              isAuthenticated={isAuthenticated} 
              user={user || undefined} 
              onLinkClick={() => {}} 
            />
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    onMouseEnter={() => setIsUserDropdownOpen(true)}
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
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                      isUserDropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserDropdownOpen && (
                    <div 
                      className="absolute right-0 top-full mt-2 w-72 bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl z-50"
                      onMouseLeave={() => setIsUserDropdownOpen(false)}
                    >
                      <div className="p-2">
                        <Link
                          to={user?.membershipType === 'admin' ? '/admin/dashboard' : '/dashboard'}
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors duration-200"
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                        <Link
                          to="/profile"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors duration-200"
                        >
                          <User className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                        <Link
                          to="/profile?tab=settings"
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors duration-200"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Settings</span>
                        </Link>

                        {/* Admin Navigation Section */}
                        {user?.membershipType === 'admin' && (
                          <>
                            <div className="border-t border-gray-700 my-2"></div>
                            <div className="px-4 py-2">
                              <div className="text-xs text-gray-500 font-medium mb-2">Admin Tools</div>
                              
                              <Link
                                to="/admin/users"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Users className="h-3 w-3" />
                                <span>User Management</span>
                              </Link>
                              
                              <Link
                                to="/admin/events"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Calendar className="h-3 w-3" />
                                <span>Event Management</span>
                              </Link>
                              
                              <Link
                                to="/admin/cms-pages"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <FileText className="h-3 w-3" />
                                <span>CMS Pages</span>
                              </Link>
                              
                              <Link
                                to="/admin/ad-management"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Target className="h-3 w-3" />
                                <span>Advertisement Management</span>
                              </Link>
                              
                              <Link
                                to="/admin/organizations"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Building2 className="h-3 w-3" />
                                <span>Organizations</span>
                              </Link>
                              
                              <Link
                                to="/admin/navigation-manager"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Menu className="h-3 w-3" />
                                <span>Navigation Manager</span>
                              </Link>
                              
                              <Link
                                to="/admin/system-configuration"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Settings className="h-3 w-3" />
                                <span>System Config</span>
                              </Link>
                              
                              <Link
                                to="/admin/analytics"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <BarChart3 className="h-3 w-3" />
                                <span>Analytics</span>
                              </Link>
                            </div>
                          </>
                        )}

                        {/* Business Tools Section for eligible users */}
                        {user?.membershipType && ['retailer', 'manufacturer', 'organization'].includes(user.membershipType) && (
                          <>
                            <div className="border-t border-gray-700 my-2"></div>
                            <div className="px-4 py-2">
                              <div className="text-xs text-gray-500 font-medium mb-2">Business Tools</div>
                              
                              <Link
                                to="/admin/ad-management"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Target className="h-3 w-3" />
                                <span>Advertisement Management</span>
                              </Link>
                              
                              {user.membershipType === 'organization' && (
                                <Link
                                  to="/admin/organizations"
                                  onClick={() => setIsUserDropdownOpen(false)}
                                  className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                                >
                                  <Building2 className="h-3 w-3" />
                                  <span>Organization Management</span>
                                </Link>
                              )}
                            </div>
                          </>
                        )}

                        <div className="border-t border-gray-700 my-2"></div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-gray-300 hover:text-red-400 hover:bg-gray-700/50 rounded-lg transition-colors duration-200"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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

        {/* Mobile Navigation - Mega Menu */}
        <MobileMegaMenu 
          isAuthenticated={isAuthenticated} 
          user={user || undefined} 
          onLinkClick={() => setIsMenuOpen(false)}
          isOpen={isMenuOpen}
        />
      </div>
    </header>
  );
}