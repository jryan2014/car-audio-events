import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, MapPin, Eye, EyeOff, Volume2, Building, Wrench, Users, AlertTriangle, Loader, CheckCircle, ArrowLeft, Edit, Phone, CreditCard, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import HCaptcha, { HCaptchaRef } from '../components/HCaptcha';
import { supabase } from '../lib/supabase';
import { registerRateLimiter, getClientIdentifier } from '../utils/rateLimiter';
import SEO from '../components/SEO';

interface MembershipPlan {
  id: string;
  name: string;
  type: 'competitor' | 'retailer' | 'manufacturer' | 'organization';
  description: string;
  features: string[];
  is_active: boolean;
  hidden_on_frontend: boolean;
  is_featured?: boolean;
  price?: number;
  billing_period?: string;
}

export default function Register() {
  const [searchParams] = useSearchParams();
  const preSelectedPlan = searchParams.get('plan');
  
  // Password validation function
  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial
    };
  };
  
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: '',
    membershipType: preSelectedPlan || 'competitor',
    
    // Company Info (for business accounts)
    companyName: '',
    website: '',
    
    // Billing Address
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZip: '',
    billingCountry: 'US',
    
    // Shipping Address
    shippingSameAsBilling: true,
    shippingAddress: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
    shippingCountry: 'US',
    
    // Preferences
    emailNotifications: true,
    marketingEmails: false
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(true);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<MembershipPlan | null>(null);
  
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const captchaRef = useRef<HCaptchaRef>(null);

  // Load membership plans from database
  useEffect(() => {
    loadMembershipPlans();
  }, []);

  // Update selected plan details when membership type changes OR when plans load
  useEffect(() => {
    if (membershipPlans.length > 0 && preSelectedPlan) {
      // Try to find plan by ID first (UUID from pricing page)
      let selected = membershipPlans.find(plan => plan.id === preSelectedPlan);
      
      // If not found by ID, try by type (fallback)
      if (!selected) {
        selected = membershipPlans.find(plan => plan.type === preSelectedPlan);
      }
      
      if (selected) {
        setSelectedPlanDetails(selected);
        setFormData(prev => ({ ...prev, membershipType: selected.type }));
      }
    } else if (membershipPlans.length > 0) {
      // Normal case - find by current membership type
      const selected = membershipPlans.find(plan => plan.type === formData.membershipType);
      setSelectedPlanDetails(selected || null);
    }
  }, [formData.membershipType, membershipPlans, preSelectedPlan]);

  const loadMembershipPlans = async () => {
    try {
      setPlansLoading(true);
      const { data, error } = await supabase
        .from('membership_plans')
        .select('id, name, type, description, features, is_active, hidden_on_frontend, is_featured, price, billing_period')
        .eq('is_active', true)
        .eq('hidden_on_frontend', false)
        .eq('show_on_competitor_page', true)
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
          hidden_on_frontend: plan.hidden_on_frontend || false,
          is_featured: plan.is_featured || false,
          price: plan.price,
          billing_period: plan.billing_period
        }));
        
        setMembershipPlans(plans);
        
        // If no pre-selected plan, set default to first available plan
        if (!preSelectedPlan && plans.length > 0) {
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
            hidden_on_frontend: false,
            is_featured: false,
            price: 0,
            billing_period: 'free'
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
          hidden_on_frontend: false,
          is_featured: false,
          price: 0,
          billing_period: 'free'
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      
      // Auto-copy billing to shipping if checkbox is checked
      if (name === 'shippingSameAsBilling' && checked) {
        setFormData(prev => ({
          ...prev,
          shippingAddress: prev.billingAddress,
          shippingCity: prev.billingCity,
          shippingState: prev.billingState,
          shippingZip: prev.billingZip,
          shippingCountry: prev.billingCountry
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Auto-copy billing to shipping if same as billing is checked
      if (formData.shippingSameAsBilling && name.startsWith('billing')) {
        const shippingField = name.replace('billing', 'shipping');
        setFormData(prev => ({
          ...prev,
          [shippingField]: value
        }));
      }
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.name && formData.email && formData.password && formData.confirmPassword);
      case 2:
        return !!(formData.phone && formData.location);
      case 3:
        return !!(formData.billingAddress && formData.billingCity && formData.billingState && formData.billingZip);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
      setError('');
    } else {
      setError('Please fill in all required fields before continuing.');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError('');
  };

  const isBusinessAccount = () => {
    return ['retailer', 'manufacturer', 'organization'].includes(formData.membershipType);
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setCaptchaError('');
    setDebugInfo('✅ Captcha completed successfully.');
  };

  const handleCaptchaError = (err: any) => {
    // Check for specific mobile issues
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let errorMessage = 'Captcha verification failed. Please try again.';
    
    if (err === 'script-error' || err === 'HCaptcha script loading timeout') {
      errorMessage = isMobile 
        ? 'Security check failed to load. Please check your internet connection and try again.'
        : 'Unable to load security check. Please refresh the page and try again.';
    }
    
    setCaptchaError(errorMessage);
    setCaptchaToken(null);
    setDebugInfo(`❌ Captcha error: ${err || 'unknown error'}`);
    console.error('hCaptcha error:', err);
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      setError('');
      setDebugInfo('🔄 Initiating Google OAuth...');
      
      await loginWithGoogle();
      setDebugInfo('✅ Google OAuth initiated successfully');
    } catch (error: any) {
      console.error('Google signup error:', error);
      setError('Google sign-up failed. Please try again.');
      setDebugInfo('❌ Google OAuth error');
      console.error('Google signup error details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDebugInfo('🎯 Registration form submitted');
    
    // Check rate limiting
    const clientId = getClientIdentifier(formData.email);
    if (registerRateLimiter.isLimited(clientId)) {
      const blockedTime = registerRateLimiter.getBlockedTime(clientId);
      if (blockedTime > 0) {
        const minutes = Math.ceil(blockedTime / 60);
        setError(`Too many registration attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`);
        setDebugInfo('❌ Rate limit exceeded');
        return;
      }
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setDebugInfo('❌ Password confirmation failed');
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      const missing = [];
      if (!passwordValidation.minLength) missing.push('at least 8 characters');
      if (!passwordValidation.hasUpper) missing.push('an uppercase letter');
      if (!passwordValidation.hasLower) missing.push('a lowercase letter');
      if (!passwordValidation.hasNumber) missing.push('a number');
      if (!passwordValidation.hasSpecial) missing.push('a special character');
      
      setError(`Password must contain ${missing.join(', ')}.`);
      setDebugInfo('❌ Password validation failed');
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

      // Step 2: Proceed with user registration with enhanced data
      const enhancedUserData = {
        ...formData,
        // Ensure shipping address is populated if same as billing
        shippingAddress: formData.shippingSameAsBilling ? formData.billingAddress : formData.shippingAddress,
        shippingCity: formData.shippingSameAsBilling ? formData.billingCity : formData.shippingCity,
        shippingState: formData.shippingSameAsBilling ? formData.billingState : formData.shippingState,
        shippingZip: formData.shippingSameAsBilling ? formData.billingZip : formData.shippingZip,
        shippingCountry: formData.shippingSameAsBilling ? formData.billingCountry : formData.shippingCountry,
      };

      await register(enhancedUserData);
      // Registration successful - clear rate limit
      registerRateLimiter.clear(clientId);
      setDebugInfo('✅ Registration successful, navigating to dashboard');
      setRegistrationSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error: any) {
      // Record failed attempt
      registerRateLimiter.recordAttempt(clientId);
      const remainingAttempts = registerRateLimiter.getRemainingAttempts(clientId);
      console.error('Registration failed:', error);
      
      // Use generic error messages to prevent information disclosure
      let errorMessage = 'Registration failed. Please try again.';
      let debugMessage = '❌ Registration error';
      
      // Only show specific messages for safe cases
      if (error?.message) {
        if (error.message.includes('hCaptcha')) {
          errorMessage = 'Bot verification failed. Please try the captcha again.';
          debugMessage += '\n\n💡 hCaptcha verification failed';
        } else if (error.message.includes('already registered') || error.message.includes('already exists')) {
          errorMessage = 'An account with this email already exists. Please try logging in instead.';
          debugMessage += '\n\n💡 User already exists';
        } else if (error.message.includes('timeout') || error.message.includes('aborted')) {
          errorMessage = 'Registration timed out. Please check your internet connection and try again.';
          debugMessage += '\n\n💡 Network timeout';
        }
        // Don't expose other error details
      }
      
      // Log the actual error for debugging (server-side logging should capture this)
      console.error('Registration error:', error);
      
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Account Information</h3>
              <p className="text-gray-400">Let's start with your basic account details</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name *
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address *
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password *
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
                  Confirm Password *
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
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Contact Information</h3>
              <p className="text-gray-400">Help us connect with you</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
                  Location *
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

            {isBusinessAccount() && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">
                    Company Name {isBusinessAccount() ? '*' : ''}
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required={isBusinessAccount()}
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                      placeholder="Your company name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-2">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="website"
                      name="website"
                      type="url"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Billing Address</h3>
              <p className="text-gray-400">Required for payment processing</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="billingAddress" className="block text-sm font-medium text-gray-300 mb-2">
                  Street Address *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="billingAddress"
                    name="billingAddress"
                    type="text"
                    required
                    value={formData.billingAddress}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                    placeholder="123 Main Street"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="billingCity" className="block text-sm font-medium text-gray-300 mb-2">
                    City *
                  </label>
                  <input
                    id="billingCity"
                    name="billingCity"
                    type="text"
                    required
                    value={formData.billingCity}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label htmlFor="billingState" className="block text-sm font-medium text-gray-300 mb-2">
                    State *
                  </label>
                  <input
                    id="billingState"
                    name="billingState"
                    type="text"
                    required
                    value={formData.billingState}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                    placeholder="State"
                  />
                </div>

                <div>
                  <label htmlFor="billingZip" className="block text-sm font-medium text-gray-300 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    id="billingZip"
                    name="billingZip"
                    type="text"
                    required
                    value={formData.billingZip}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                    placeholder="12345"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="billingCountry" className="block text-sm font-medium text-gray-300 mb-2">
                  Country *
                </label>
                <select
                  id="billingCountry"
                  name="billingCountry"
                  required
                  value={formData.billingCountry}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="MX">Mexico</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>

              <div className="border-t border-gray-600 pt-6">
                <h4 className="text-lg font-semibold text-white mb-4">Shipping Address</h4>
                
                <div className="flex items-center space-x-3 mb-4">
                  <input
                    id="shippingSameAsBilling"
                    name="shippingSameAsBilling"
                    type="checkbox"
                    checked={formData.shippingSameAsBilling}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
                  />
                  <label htmlFor="shippingSameAsBilling" className="text-sm text-gray-300">
                    Shipping address is the same as billing address
                  </label>
                </div>

                {!formData.shippingSameAsBilling && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-300 mb-2">
                        Street Address *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          id="shippingAddress"
                          name="shippingAddress"
                          type="text"
                          required={!formData.shippingSameAsBilling}
                          value={formData.shippingAddress}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                          placeholder="123 Main Street"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="shippingCity" className="block text-sm font-medium text-gray-300 mb-2">
                          City *
                        </label>
                        <input
                          id="shippingCity"
                          name="shippingCity"
                          type="text"
                          required={!formData.shippingSameAsBilling}
                          value={formData.shippingCity}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                          placeholder="City"
                        />
                      </div>

                      <div>
                        <label htmlFor="shippingState" className="block text-sm font-medium text-gray-300 mb-2">
                          State *
                        </label>
                        <input
                          id="shippingState"
                          name="shippingState"
                          type="text"
                          required={!formData.shippingSameAsBilling}
                          value={formData.shippingState}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                          placeholder="State"
                        />
                      </div>

                      <div>
                        <label htmlFor="shippingZip" className="block text-sm font-medium text-gray-300 mb-2">
                          ZIP Code *
                        </label>
                        <input
                          id="shippingZip"
                          name="shippingZip"
                          type="text"
                          required={!formData.shippingSameAsBilling}
                          value={formData.shippingZip}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                          placeholder="12345"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="shippingCountry" className="block text-sm font-medium text-gray-300 mb-2">
                        Country *
                      </label>
                      <select
                        id="shippingCountry"
                        name="shippingCountry"
                        required={!formData.shippingSameAsBilling}
                        value={formData.shippingCountry}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500 focus:ring-2 focus:ring-electric-500/20 transition-all duration-200"
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="MX">Mexico</option>
                        <option value="GB">United Kingdom</option>
                        <option value="AU">Australia</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Preferences & Verification</h3>
              <p className="text-gray-400">Almost done! Just a few final settings</p>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-3">Email Preferences</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      id="emailNotifications"
                      name="emailNotifications"
                      type="checkbox"
                      checked={formData.emailNotifications}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
                    />
                    <label htmlFor="emailNotifications" className="text-sm text-gray-300">
                      Receive important account notifications (recommended)
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <input
                      id="marketingEmails"
                      name="marketingEmails"
                      type="checkbox"
                      checked={formData.marketingEmails}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-electric-500 bg-gray-700 border-gray-600 rounded focus:ring-electric-500 focus:ring-2"
                    />
                    <label htmlFor="marketingEmails" className="text-sm text-gray-300">
                      Receive marketing emails and event announcements
                    </label>
                  </div>
                </div>
              </div>

              {/* Captcha */}
              <div className="flex flex-col items-center">
                <div className="w-full max-w-sm">
                  <p className="text-sm text-gray-400 text-center mb-2">
                    Please complete the security check below:
                  </p>
                  <HCaptcha
                    onVerify={(token) => {
                      setCaptchaLoading(false);
                      handleCaptchaVerify(token);
                    }}
                    onError={() => {
                      setCaptchaLoading(false);
                      handleCaptchaError('script-error');
                    }}
                    onExpire={() => {
                      setCaptchaToken(null);
                      setDebugInfo('⏰ Captcha expired. Please complete it again.');
                    }}
                    ref={captchaRef}
                    theme="dark"
                    size="normal"
                  />
                  {captchaError && (
                    <div className="mt-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                      <p className="text-sm text-red-400">{captchaError}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        If you're having trouble, try refreshing the page or using a different browser.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
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
      <SEO 
        title="Register - Join the Car Audio Community"
        description="Create your Car Audio Events account. Choose from competitor, retailer, manufacturer, or organization memberships. Join thousands in the car audio competition community."
        keywords="car audio registration, become a member, competitor registration, retailer signup, manufacturer membership, join car audio events"
        url="https://caraudioevents.com/register"
      />
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

        {/* Plan Selection Section */}
        {preSelectedPlan && selectedPlanDetails ? (
          /* Single Selected Plan Display - Centered */
          <div className="mb-8">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Your Selected Plan</h3>
              <p className="text-gray-400">Complete your registration to get started</p>
            </div>
            
            {/* Single Centered Plan Card */}
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border-2 border-electric-500 shadow-lg shadow-electric-500/20">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-electric-500 rounded-full mb-4">
                    {React.createElement(getTypeIcon(selectedPlanDetails.type), { className: "h-8 w-8 text-white" })}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">{selectedPlanDetails.name}</h3>
                  <p className="text-gray-400 mb-4">{selectedPlanDetails.description}</p>
                  
                  <div className="mb-4">
                    {selectedPlanDetails.price === 0 ? (
                      <div className="text-3xl font-black text-white">Free</div>
                    ) : (
                      <div className="flex items-baseline justify-center">
                        <span className="text-3xl font-black text-white">${selectedPlanDetails.price}</span>
                        {selectedPlanDetails.billing_period && (
                          <span className="text-gray-400 ml-2">/{selectedPlanDetails.billing_period}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {selectedPlanDetails.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-electric-500 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Change Plan Link - Centered Below Card */}
              <div className="text-center mt-4">
                <Link 
                  to="/pricing" 
                  className="text-electric-400 hover:text-electric-300 font-medium transition-colors"
                >
                  View All Plans & Pricing
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Full Plan Selection Grid - Only when no plan selected */
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Choose Your Membership</h3>
              <Link 
                to="/pricing" 
                className="text-electric-400 hover:text-electric-300 font-medium transition-colors"
              >
                View All Plans & Pricing
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    className={`relative cursor-pointer rounded-xl p-6 transition-all duration-300 hover:scale-105 border-2 ${
                      formData.membershipType === type.type
                        ? 'border-electric-500 bg-electric-500/10 shadow-lg shadow-electric-500/20'
                        : type.is_featured
                        ? 'border-electric-500 bg-gradient-to-br from-gray-800 to-gray-900 shadow-electric-500/20 shadow-lg hover:border-electric-400'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                    }`}
                  >
                    {type.is_featured && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <div className="bg-electric-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          Most Popular
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        formData.membershipType === type.type || type.is_featured ? 'bg-electric-500' : 'bg-gray-700'
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
          </div>
        )}

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-gray-300">
                Step {currentStep} of 4
              </div>
              <div className="text-sm text-gray-400">
                {currentStep === 1 && 'Account Information'}
                {currentStep === 2 && 'Contact Details'}
                {currentStep === 3 && 'Billing & Shipping'}
                {currentStep === 4 && 'Verification'}
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-electric-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              ></div>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {renderStepContent()}

            <div className="flex items-center justify-between pt-6">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>
              )}
              
              <div className="flex-1"></div>
              
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="bg-electric-600 hover:bg-electric-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!validateStep(currentStep)}
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  className="group relative flex justify-center py-3 px-6 border border-transparent text-sm font-medium rounded-lg text-white bg-electric-600 hover:bg-electric-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-electric-500 focus:ring-offset-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading || !captchaToken}
                >
                  {isLoading && <Loader className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />}
                  Complete Registration
                </button>
              )}
            </div>
          </form>

          {/* Google OAuth - Only show on step 1 */}
          {currentStep === 1 && (
            <>
              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
                className="w-full bg-white text-gray-900 py-3 px-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
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
            </>
          )}
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