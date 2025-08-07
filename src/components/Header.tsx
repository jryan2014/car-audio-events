import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, Calendar, MapPin, Users, LogOut, Settings, Shield, Package, BarChart3, Target, FileText, Building2, ChevronDown, Search, CreditCard, MessageSquare, Calculator, Volume2, Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import MegaMenu from './MegaMenu';
import MobileMegaMenu from './MobileMegaMenu';
import { GlobalSearch } from './GlobalSearch';
import NotificationBell from './NotificationBell';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userDropdownTimeout, setUserDropdownTimeout] = useState<NodeJS.Timeout | null>(null);
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (userDropdownTimeout) {
        clearTimeout(userDropdownTimeout);
      }
    };
  }, [userDropdownTimeout]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
    setIsUserDropdownOpen(false);
  };

  const handleDropdownLinkClick = () => {
    if (userDropdownTimeout) {
      clearTimeout(userDropdownTimeout);
      setUserDropdownTimeout(null);
    }
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
              {isAuthenticated && <NotificationBell />}
              
              {isAuthenticated ? (
                <div 
                  className="relative hidden lg:block"
                  onMouseEnter={() => {
                    if (userDropdownTimeout) {
                      clearTimeout(userDropdownTimeout);
                      setUserDropdownTimeout(null);
                    }
                    setIsUserDropdownOpen(true);
                  }}
                  onMouseLeave={() => {
                    const timeout = setTimeout(() => {
                      setIsUserDropdownOpen(false);
                    }, 200);
                    setUserDropdownTimeout(timeout);
                  }}
                >
                  <button
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
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
                    >
                      <div className="p-2">
                        {/* Standard Member Links - Available to ALL authenticated users */}
                        <Link
                          to={user?.membershipType === 'admin' ? '/admin/dashboard' : '/dashboard'}
                          onClick={handleDropdownLinkClick}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors duration-200"
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                        
                        {/* Tools Section - Available to all authenticated users */}
                        <div className="border-t border-gray-700 my-2"></div>
                        <div className="px-4 py-2">
                          <div className="text-xs text-gray-500 font-medium mb-2">
                            <Wrench className="h-3 w-3 inline mr-1" />
                            Pro Tools
                          </div>
                          
                          <Link
                            to="/subwoofer-designer"
                            onClick={handleDropdownLinkClick}
                            className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                          >
                            <Volume2 className="h-3 w-3 text-electric-400" />
                            <span>Subwoofer Designer</span>
                          </Link>
                          
                          <Link
                            to="/spl-calculator"
                            onClick={handleDropdownLinkClick}
                            className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                          >
                            <Calculator className="h-3 w-3 text-purple-400" />
                            <span>SPL Calculator</span>
                          </Link>
                        </div>
                        <div className="border-t border-gray-700 my-2"></div>
                        
                        <Link
                          to="/profile"
                          onClick={handleDropdownLinkClick}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors duration-200"
                        >
                          <User className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                        
                        <Link
                          to="/profile?tab=settings"
                          onClick={handleDropdownLinkClick}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors duration-200"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                        
                        <Link
                          to="/dashboard/support"
                          onClick={handleDropdownLinkClick}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors duration-200"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>Support</span>
                        </Link>
                        
                        <Link
                          to="/billing"
                          onClick={handleDropdownLinkClick}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors duration-200"
                        >
                          <CreditCard className="h-4 w-4" />
                          <span>Billing & Subscription</span>
                        </Link>

                        {/* Business Tools Section for eligible users */}
                        {user?.membershipType && ['retailer', 'manufacturer', 'organization'].includes(user.membershipType) && (
                          <>
                            <div className="border-t border-gray-700 my-2"></div>
                            <div className="px-4 py-2">
                              <div className="text-xs text-gray-500 font-medium mb-2">Business Tools</div>
                              
                              <Link
                                to="/my-ads"
                                onClick={handleDropdownLinkClick}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Target className="h-3 w-3" />
                                <span>My Ads</span>
                              </Link>
                              
                              {user.membershipType === 'organization' && (
                                <>
                                  <Link
                                    to="/admin/organizations"
                                    onClick={handleDropdownLinkClick}
                                    className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                                  >
                                    <Building2 className="h-3 w-3" />
                                    <span>My Organization</span>
                                  </Link>
                                  <Link
                                    to="/organization/support"
                                    onClick={handleDropdownLinkClick}
                                    className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                    <span>Support</span>
                                  </Link>
                                </>
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
                                onClick={handleDropdownLinkClick}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Users className="h-3 w-3" />
                                <span>Users</span>
                              </Link>
                              
                              <Link
                                to="/admin/events"
                                onClick={handleDropdownLinkClick}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Calendar className="h-3 w-3" />
                                <span>Events</span>
                              </Link>
                              
                              <Link
                                to="/admin/cms-pages"
                                onClick={handleDropdownLinkClick}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <FileText className="h-3 w-3" />
                                <span>CMS</span>
                              </Link>
                              
                              <Link
                                to="/admin/ad-management"
                                onClick={handleDropdownLinkClick}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Target className="h-3 w-3" />
                                <span>Ads</span>
                              </Link>
                              
                              <Link
                                to="/admin/organizations"
                                onClick={handleDropdownLinkClick}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Building2 className="h-3 w-3" />
                                <span>Organizations</span>
                              </Link>
                              
                              <Link
                                to="/admin/navigation-manager"
                                onClick={handleDropdownLinkClick}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Menu className="h-3 w-3" />
                                <span>Navigation</span>
                              </Link>
                              
                              <Link
                                to="/admin/system-configuration"
                                onClick={handleDropdownLinkClick}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <Settings className="h-3 w-3" />
                                <span>System</span>
                              </Link>
                              
                              <Link
                                to="/admin/analytics"
                                onClick={handleDropdownLinkClick}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <BarChart3 className="h-3 w-3" />
                                <span>Analytics</span>
                              </Link>
                              
                              <Link
                                to="/admin/support"
                                onClick={handleDropdownLinkClick}
                                className="flex items-center space-x-2 px-2 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700/30 rounded transition-colors duration-200"
                              >
                                <MessageSquare className="h-3 w-3" />
                                <span>Support</span>
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
                    to="/pricing"
                    className="bg-electric-600 hover:bg-electric-500 text-white font-bold py-2 px-4 rounded-full transition-all duration-300 shadow-lg hover:shadow-electric-500/50"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Hamburger Menu - Mobile Only (show for ALL users) */}
              <div className="flex lg:hidden items-center">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <span className="sr-only">Open main menu</span>
                  {isMenuOpen ? <X className="block h-6 w-6" aria-hidden="true" /> : <Menu className="block h-6 w-6" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Show for ALL users */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/95 backdrop-blur-md z-50" style={{ top: '88px' }}>
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