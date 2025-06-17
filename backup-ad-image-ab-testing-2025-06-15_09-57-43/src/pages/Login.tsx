import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Volume2, AlertCircle, Loader, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [error, setError] = useState('');
  const [adminCreationMessage, setAdminCreationMessage] = useState('');
  const navigate = useNavigate();
  const { login, user, loading, isAuthenticated } = useAuth();
  
  // Handle navigation after successful login
  React.useEffect(() => {
    console.log('Navigation check:', { loading, user: !!user, membershipType: user?.membershipType });
    if (!loading && user) {
      console.log('Navigating to dashboard for user:', user.email);
      // Navigate based on user type
      setIsLoading(false); // Clear form loading state
      
      if (user.membershipType === 'admin') {
        console.log('Redirecting to admin dashboard');
        navigate('/admin/dashboard', { replace: true });
      } else {
        console.log('Redirecting to regular dashboard');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  // Additional effect to handle immediate navigation for already authenticated users
  React.useEffect(() => {
    // If user is already authenticated when component mounts, navigate immediately
    if (user && !loading) {
      if (user.membershipType === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await login(email, password);
      // Login successful - force navigation as backup
      console.log('Login completed, forcing navigation...');
      navigate('/admin/dashboard', { replace: true });
    } catch (error: any) {
      console.error('Login failed:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error?.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. If you need to create an admin user, use the button above.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait before trying again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setIsLoading(false); // Only set loading to false on error
    }
  };

  const createAdminUser = async () => {
    setIsCreatingAdmin(true);
    setAdminCreationMessage('');
    setError('');
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        setError('Error: Missing Supabase configuration. Please check your .env file.');
        setIsCreatingAdmin(false);
        return;
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-admin-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAdminCreationMessage('Admin user created successfully! You can now log in with the credentials below.');
        setEmail('admin@caraudioevents.com');
        setPassword('TempAdmin123!');
      } else {
        setError('Error creating admin user: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setError('Error creating admin user: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Volume2 className="h-12 w-12 text-electric-500 animate-pulse-glow" />
            <div>
              <h1 className="text-2xl font-bold text-white">Car Audio Events</h1>
              <p className="text-electric-400 text-sm">Competition Platform</p>
            </div>
          </div>
          <h2 className="text-3xl font-black text-white">
            Welcome Back
          </h2>
          <p className="mt-2 text-gray-400">
            Sign in to your account to continue competing
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-400">Login Failed</h3>
                  <p className="text-sm text-red-300 mt-1">{error}</p>
                </div>
              </div>
            )}

            {adminCreationMessage && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-start space-x-3">
                <UserPlus className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-green-400">Admin User Created</h3>
                  <p className="text-sm text-green-300 mt-1">{adminCreationMessage}</p>
                  <div className="mt-2 text-xs text-green-200 bg-green-500/10 rounded p-2">
                    <p><strong>Email:</strong> admin@caraudioevents.com</p>
                    <p><strong>Password:</strong> TempAdmin123!</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>



            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-300">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-electric-400 hover:text-electric-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-electric-500 text-white py-3 px-4 rounded-lg font-bold text-lg hover:bg-electric-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-electric-400 hover:text-electric-300 font-semibold transition-colors">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}