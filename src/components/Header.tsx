import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, Calendar, MapPin, Users, LogOut, Settings, Shield, Package, BarChart3, Target, FileText, Building2, ChevronDown, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import MegaMenu from './MegaMenu';
import MobileMegaMenu from './MobileMegaMenu';
import { GlobalSearch } from './GlobalSearch';
import NotificationCenter from './NotificationCenter';

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
        <div className="flex items-center justify-between py-3">
          {/* Logo - Positioned with proper spacing */}
          <div className="flex-shrink-0 mr-8">
            <Link to="/" className="flex items-center" onClick={() => setIsMenuOpen(false)}>
              <img 
                src="/assets/logos/cae-logo-main.png" 
                alt="Car Audio Events" 
                className="h-20 w-auto"
              />
            </Link>
          </div>

          {/* Centered Desktop Navigation */}
          <div className="hidden lg:flex flex-1 justify-center">
            <MegaMenu 
              isAuthenticated={isAuthenticated} 
              user={user || undefined} 
              onLinkClick={() => {}} 
            />
          </div>
          
          <div className="flex items-center ml-auto">
            {/* Global Search - Desktop */}
            <div className="hidden lg:block flex-shrink-0 mx-4">
              <GlobalSearch 
                className="w-64"
                placeholder="Search events, businesses..."
              />
            </div>

            {/* User & Auth Controls */}
            <div className="flex items-center space-x-4">
              {isAuthenticated && <NotificationCenter />}
              
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    onMouseEnter={() => setIsUserDropdownOpen(true)}
                    className="flex items-center space-x-2 text-gray-300 hover:text-electric-400 transition-colors duration-200 max-w-[200px] min-w-0"
                  >
                    {user?.profileImage ? (
                      <img 
                        src={user.profileImage} 
                        alt={user.name}
                        className="w-8 h-8 rounded-full border-2 border-electric-500 flex-shrink-0"
                      />
                    ) : (
                      <User className="h-8 w-8 p-1 bg-electric-500 rounded-full text-white flex-shrink-0" />
                    )}
                    <span className="hidden sm:block font-medium truncate min-w-0 whitespace-nowrap">{user?.name}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 flex-shrink-0 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isUserDropdownOpen && (
                    <div 
                      className="absolute right-0 top-full mt-2 w-64 max-w-[95vw] sm:max-w-[90vw] bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 rounded-xl shadow-2xl z-50"
                      onMouseLeave={() => setIsUserDropdownOpen(false)}
                    >
                      <div className="p-2">
                        {/* Standard Member Links - Available to ALL authenticated users */}
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

                        {/* Business Tools Section for eligible users */}
                        {user?.membershipType && ['retailer', 'manufacturer', 'organization'].includes(user.membershipType) && (
                          <>
                            <div className="border-t border-gray-700 my-2"></div>
                            <div className="px-4 py-2">
                              <div className="text-xs text-gray-500 font-medium mb-2">Business Tools</div>
                              
                              <Link
                                to="/my-ads"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Target className="h-3 w-3" />
                                <span>My Ads</span>
                              </Link>
                              
                              {user.membershipType === 'organization' && (
                                <Link
                                  to="/admin/organizations"
                                  onClick={() => setIsUserDropdownOpen(false)}
                                  className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                                >
                                  <Building2 className="h-3 w-3" />
                                  <span>My Organization</span>
                                </Link>
                              )}
                            </div>
                          </>
                        )}

                        {/* Admin Tools Section - Only for admins */}
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
                                <span>Users</span>
                              </Link>
                              
                              <Link
                                to="/admin/events"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Calendar className="h-3 w-3" />
                                <span>Events</span>
                              </Link>
                              
                              <Link
                                to="/admin/cms-pages"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <FileText className="h-3 w-3" />
                                <span>CMS</span>
                              </Link>
                              
                              <Link
                                to="/admin/ad-management"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Target className="h-3 w-3" />
                                <span>Ads</span>
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
                                <span>Navigation</span>
                              </Link>
                              
                              <Link
                                to="/admin/system-configuration"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Settings className="h-3 w-3" />
                                <span>System</span>
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
                    className="bg-electric-600 hover:bg-electric-500 text-white font-bold py-2 px-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-electric-500/50"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Hamburger Menu - Mobile Only (hidden for all logged-in users) */}
              {!isAuthenticated && (
                <div className="flex lg:hidden items-center">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  >
                    <span className="sr-only">Open main menu</span>
                    {isMenuOpen ? <X className="block h-6 w-6" aria-hidden="true" /> : <Menu className="block h-6 w-6" aria-hidden="true" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Hidden for all logged-in users */}
      {isMenuOpen && !isAuthenticated && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-black/90 backdrop-blur-md z-40">
          <MobileMegaMenu
            isAuthenticated={isAuthenticated}
            user={user || undefined}
            onLinkClick={() => setIsMenuOpen(false)}
            onLogout={handleLogout}
          />
        </div>
      )}
    </header>
  );
}