import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, MapPin, Eye, EyeOff, Volume2, Building, Wrench, Users, AlertTriangle, Loader, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import HCaptcha, { HCaptchaRef } from '../components/HCaptcha';
import { supabase } from '../lib/supabase';

interface MembershipPlan {
  id: string;
  name: string;
  type: 'competitor' | 'retailer' | 'manufacturer' | 'organization';
  description: string;
  features: string[];
  is_active: boolean;
  hidden_on_frontend: boolean;
}

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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState('');
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  
  const { register } = useAuth();
  const navigate = useNavigate();
  const captchaRef = useRef<HCaptchaRef>(null);

  // Load membership plans from database
  useEffect(() => {
    loadMembershipPlans();
  }, []);

  const loadMembershipPlans = async () => {
    try {
      setPlansLoading(true);
      const { data, error } = await supabase
        .from('membership_plans')
        .select('id, name, type, description, features, is_active, hidden_on_frontend')
        .eq('is_active', true)
        .eq('hidden_on_frontend', false)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const plans: MembershipPlan[] = data.map(plan => ({
          id: plan.id,
          name: plan.name,
          type: plan.type,
          description: plan.description,
          features: Array.isArray(plan.features) ? plan.features : [],
          is_active: plan.is_active,
          hidden_on_frontend: plan.hidden_on_frontend || false
        }));
        
        setMembershipPlans(plans);
        
        // Set default selection to first available plan
        if (plans.length > 0) {
          setFormData(prev => ({ ...prev, membershipType: plans[0].type }));
        }
      } else {
        // Fallback to hardcoded plans if none in database
        setMembershipPlans([
          {
            id: 'competitor-default',
            name: 'Competitor',
            type: 'competitor',
            description: 'Free membership for car audio enthusiasts',
            features: ['Event browsing', 'Score tracking', 'Profile creation', 'Team participation'],
            is_active: true,
            hidden_on_frontend: false
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to load membership plans:', error);
      // Fallback to hardcoded plans on error
      setMembershipPlans([
        {
          id: 'competitor-default',
          name: 'Competitor',
          type: 'competitor',
          description: 'Free membership for car audio enthusiasts',
          features: ['Event browsing', 'Score tracking', 'Profile creation', 'Team participation'],
          is_active: true,
          hidden_on_frontend: false
        }
      ]);
    } finally {
      setPlansLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'competitor': return User;
      case 'retailer': return Building;
      case 'manufacturer': return Wrench;
      case 'organization': return Users;
      default: return User;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setCaptchaError('');
    setDebugInfo('✅ Captcha completed successfully.');
  };

  const handleCaptchaError = (err: any) => {
    setCaptchaError('Captcha verification failed. Please try again.');
    setCaptchaToken(null);
    setDebugInfo(`❌ Captcha error: Error: ${err || 'script-error'}`);
    console.error('hCaptcha error:', err);
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

    // Check if captcha is completed
    if (!captchaToken) {
      setCaptchaError('Please complete the captcha verification.');
      setDebugInfo('❌ Captcha not completed.');
      return;
    }
    
    setIsLoading(true);
    setDebugInfo('🔄 Verifying captcha...');
    setCaptchaError('');

    try {
      // Step 1: Verify hCaptcha token with our backend
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-captcha', {
        body: { token: captchaToken },
      });

      if (verifyError || !verifyData?.success) {
        throw new Error(verifyData?.error || verifyError?.message || 'hCaptcha verification failed.');
      }
      
      setDebugInfo('✅ Captcha verified. Creating user account...');

      // Step 2: Proceed with user registration
      await register(formData);
      setDebugInfo('✅ Registration successful, navigating to dashboard');
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
        if (error.message.includes('hCaptcha')) {
            errorMessage = 'Bot verification failed. Please try the captcha again.';
            debugMessage += '\n\n💡 hCaptcha verification failed at server.';
        } else if (error.message.includes('already registered') || error.message.includes('already exists')) {
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
      
      // Reset captcha on failed registration
      if (captchaRef.current) {
        try {
          captchaRef.current.reset();
        } catch (resetError) {
          console.error('Error resetting captcha:', resetError);
        }
      }
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Show success message if registration completed
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 animate-bounce" />
            <h2 className="mt-6 text-3xl font-black text-white">
              Registration <span className="text-green-400">Successful!</span>
            </h2>
            <p className="mt-2 text-gray-400">
              Welcome to Car Audio Events! Redirecting you to the dashboard...
            </p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {plansLoading ? (
            <div className="col-span-full flex items-center justify-center py-8">
              <Loader className="animate-spin h-8 w-8 text-electric-500" />
              <span className="ml-2 text-gray-400">Loading membership plans...</span>
            </div>
          ) : membershipPlans.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-gray-400">No membership plans available at this time.</p>
            </div>
          ) : (
            membershipPlans.map((type) => (
            <div
              key={type.id}
              onClick={() => setFormData({ ...formData, membershipType: type.type })}
              className={`relative cursor-pointer rounded-xl p-6 transition-all duration-200 border-2 ${
                formData.membershipType === type.type
                  ? 'border-electric-500 bg-electric-500/10 shadow-lg shadow-electric-500/20'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  formData.membershipType === type.type ? 'bg-electric-500' : 'bg-gray-700'
                }`}>
                                      {React.createElement(getTypeIcon(type.type), { className: "h-5 w-5 text-white" })}
                </div>
                <div>
                  <h3 className="font-bold text-white">{type.name}</h3>
                  <p className="text-xs text-gray-400">{type.description}</p>
                </div>
              </div>
              <ul className="space-y-1">
                {type.features.map((feature, index) => (
                  <li key={index} className="text-xs text-gray-300 flex items-center space-x-2">
                    <div className="w-1 h-1 bg-electric-400 rounded-full"></div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              {formData.membershipType === type.type && (
                <div className="absolute top-2 right-2">
                  <CheckCircle className="h-5 w-5 text-electric-500" />
                </div>
              )}
                          </div>
            ))
          )}
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

            {/* Captcha */}
            <div className="mt-6 flex flex-col items-center">
              <HCaptcha
                onVerify={handleCaptchaVerify}
                onError={() => handleCaptchaError('script-error')}
                onExpire={() => {
                  setCaptchaToken(null);
                  setDebugInfo('⏰ Captcha expired. Please complete it again.');
                }}
                ref={captchaRef}
                theme="dark"
              />
              {captchaError && (
                <p className="mt-2 text-sm text-red-400">{captchaError}</p>
              )}
            </div>

            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-electric-600 hover:bg-electric-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-electric-500 focus:ring-offset-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading && <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />}
              Create Account
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