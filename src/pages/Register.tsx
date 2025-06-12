import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, MapPin, Eye, EyeOff, Volume2, Building, Wrench, Users, AlertTriangle, Loader, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    location: '',
    membershipType: 'competitor'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const membershipTypes = [
    {
      id: 'competitor',
      title: 'Competitor',
      description: 'Free membership for car audio enthusiasts',
      icon: User,
      features: ['Event browsing', 'Score tracking', 'Profile creation', 'Team participation']
    },
    {
      id: 'retailer',
      title: 'Retailer',
      description: 'For car audio retailers and installers',
      icon: Building,
      features: ['Directory listing', 'Event submissions', 'Customer analytics', 'Advertising options']
    },
    {
      id: 'manufacturer',
      title: 'Manufacturer',
      description: 'For car audio equipment manufacturers',
      icon: Wrench,
      features: ['Product listings', 'Brand promotion', 'Event sponsorship', 'Market insights']
    },
    {
      id: 'organization',
      title: 'Organization',
      description: 'For car audio organizations and clubs',
      icon: Users,
      features: ['Event hosting', 'Member management', 'Community building', 'Sponsorship opportunities']
    }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDebugInfo('🎯 Registration form submitted');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setDebugInfo('❌ Password confirmation failed');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setDebugInfo('❌ Password too short');
      return;
    }
    
    setIsLoading(true);
    setDebugInfo('🔄 Creating user account...');
    
    try {
      await register(formData);
      setDebugInfo('✅ Registration successful, navigating to home');
      setRegistrationSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      let debugMessage = `❌ Registration error: ${error.message || 'Unknown error'}`;
      
      // More detailed error messages
      if (error?.message) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          errorMessage = 'An account with this email already exists. Please try logging in instead.';
          debugMessage += '\n\n💡 User already exists - try logging in';
        } else if (error.message.includes('timeout') || error.message.includes('aborted')) {
          errorMessage = 'Registration timed out. Please check your internet connection and try again.';
          debugMessage += '\n\n💡 Network timeout - check connection';
        } else if (error.message.includes('profile')) {
          errorMessage = 'Account created but profile setup failed. Please contact support.';
          debugMessage += '\n\n💡 Profile creation failed after auth user created';
        } else if (error.message.includes('Invalid input')) {
          errorMessage = 'Please check your input and try again.';
          debugMessage += '\n\n💡 Input validation failed';
        } else if (error.message.includes('Email')) {
          errorMessage = 'Email validation failed. Please check your email address.';
          debugMessage += '\n\n💡 Email format or validation issue';
        } else if (error.message.includes('Password')) {
          errorMessage = 'Password does not meet requirements.';
          debugMessage += '\n\n💡 Password validation failed';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      setDebugInfo(debugMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white">Registration Successful!</h2>
          <p className="text-xl text-gray-400">
            Your account has been created and is pending approval.
          </p>
          <p className="text-gray-500">
            You'll be redirected to your dashboard in a moment...
          </p>
          <div className="animate-pulse">
            <Loader className="h-8 w-8 text-electric-500 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Volume2 className="h-12 w-12 text-electric-500 animate-pulse-glow" />
            <div>
              <h1 className="text-2xl font-bold text-white">Car Audio Events</h1>
              <p className="text-electric-400 text-sm">Competition Platform</p>
            </div>
          </div>
          <h2 className="text-3xl font-black text-white">
            Join the <span className="text-electric-400">Community</span>
          </h2>
          <p className="mt-2 text-gray-400">
            Create your account and start competing today
          </p>
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="text-blue-400 text-sm font-mono whitespace-pre-wrap">
              {debugInfo}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-400">Registration Failed</h3>
                <p className="text-sm text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Membership Type Selection */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-white mb-6 text-center">Choose Your Membership Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {membershipTypes.map((type) => (
              <div
                key={type.id}
                className={`cursor-pointer rounded-xl p-6 border-2 transition-all duration-200 ${
                  formData.membershipType === type.id
                    ? 'border-electric-500 bg-electric-500/10'
                    : 'border-gray-700/50 bg-gray-800/50 hover:border-gray-600'
                }`}
                onClick={() => setFormData({ ...formData, membershipType: type.id })}
              >
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
                    formData.membershipType === type.id
                      ? 'bg-electric-500 text-white'
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    <type.icon className="h-6 w-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{type.title}</h4>
                  <p className="text-gray-300 text-sm mb-4">{type.description}</p>
                  <ul className="text-xs text-gray-300 space-y-1">
                    {type.features.map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="location"
                    name="location"
                    type="text"
                    required
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                    placeholder="City, State"
                  />
                </div>
              </div>
            </div>

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
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                    placeholder="Create a password"
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

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-gray-300">
                I agree to the{' '}
                <Link to="/pages/terms-of-service" className="text-electric-400 hover:text-electric-300 transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/pages/privacy-policy" className="text-electric-400 hover:text-electric-300 transition-colors">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-blue-400">Account Approval Notice</h3>
                  <p className="text-sm text-blue-300 mt-1">
                    New accounts require admin approval before full access is granted. 
                    You'll be notified by email once your account is approved.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-electric-500 text-white py-3 px-4 rounded-lg font-bold text-lg hover:bg-electric-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              className="w-full bg-white text-gray-900 py-3 px-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 1C7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Sign up with Google</span>
            </button>
          </form>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-electric-400 hover:text-electric-300 font-semibold transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}