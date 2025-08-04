import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PricingPlans from '../components/PricingPlans';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import SEO from '../components/SEO';

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [googleBlockedMessage, setGoogleBlockedMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCompetitorPlans();
    
    // Check for Google OAuth block message
    const urlParams = new URLSearchParams(window.location.search);
    const googleBlocked = urlParams.get('google_blocked');
    const blockedData = localStorage.getItem('google_oauth_blocked');
    
    if (googleBlocked === 'true' && blockedData) {
      const data = JSON.parse(blockedData);
      setGoogleBlockedMessage(data.message);
      localStorage.removeItem('google_oauth_blocked');
    }
  }, []);

  const loadCompetitorPlans = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .eq('hidden_on_frontend', false)
        .eq('show_on_competitor_page', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Failed to load competitor plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelected = async (planId: string, paymentIntentId: string, userInfo?: any) => {
    console.log('Plan selected:', planId, 'Payment:', paymentIntentId, 'User Info:', userInfo);
    
    // Check if user is logged in
    if (!user) {
      // User not logged in - need to create account with membership
      if (userInfo && paymentIntentId !== 'free') {
        // User provided information during payment - create account directly
        try {
          // Create user account with the collected information
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userInfo.email,
            password: generateTempPassword(), // Generate temporary password
            options: {
              data: {
                name: `${userInfo.firstName} ${userInfo.lastName}`,
                phone: userInfo.phone,
                membership_type: getPlanType(planId),
                billing_address: userInfo.address,
                payment_intent_id: paymentIntentId
              }
            }
          });

          if (authError) throw authError;

          // Show success message and redirect
          alert('Account created successfully! Please check your email to verify your account.');
          navigate('/login?message=account_created');
        } catch (error) {
          console.error('Error creating account:', error);
          alert('Failed to create account. Please try again or contact support.');
        }
      } else {
        // Free plan or no user info - redirect to registration with selected plan
        navigate(`/register?plan=${planId}`);
      }
      return;
    }
    
    // User is logged in - update their membership
    try {
      const { error } = await supabase
        .from('users')
        .update({
          membership_type: getPlanType(planId),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      // Show success message and redirect to dashboard
      alert('Membership updated successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating membership:', error);
      alert('Failed to update membership. Please try again or contact support.');
    }
  };

  const generateTempPassword = (): string => {
    // Generate a random temporary password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const getPlanType = (planId: string): string => {
    // Map plan IDs to membership types
    const planTypeMap: { [key: string]: string } = {
      'competitor': 'competitor',
      'pro': 'competitor', // Pro is still competitor type but with enhanced features
      'business': 'retailer',
      'retailer': 'retailer',
      'manufacturer': 'manufacturer',
      'organization': 'organization'
    };
    
    return planTypeMap[planId] || 'competitor';
  };

  return (
    <div className="min-h-screen py-8">
      <SEO 
        title="Competitor Membership Pricing"
        description="Join Car Audio Events as a competitor. Access exclusive member pricing, event registrations, competition tracking, and connect with the car audio community."
        keywords="car audio membership, competitor pricing, IASCA membership, MECA membership, competition registration, member benefits, car audio community"
        url="https://caraudioevents.com/pricing"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link 
          to="/"
          className="inline-flex items-center space-x-2 text-electric-400 hover:text-electric-300 font-semibold mb-8 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </Link>

        {/* Google OAuth Block Message */}
        {googleBlockedMessage && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-red-400 text-lg">!</span>
              </div>
              <div>
                <h3 className="text-red-400 font-semibold">Google Sign-In Blocked</h3>
                <p className="text-gray-400">{googleBlockedMessage}</p>
                <p className="text-gray-400 text-sm mt-1">
                  Please select a membership plan below to register for an account.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-black text-white mb-6">
            Choose Your <span className="text-electric-400">Membership</span>
          </h1>
          <p className="page-subtitle">
            Join the car audio community with a membership plan designed for your needs. 
            Access exclusive features and connect with fellow enthusiasts.
          </p>
        </div>

        {/* Membership Plans */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
          </div>
        ) : (
          <PricingPlans onPlanSelected={handlePlanSelected} preLoadedPlans={plans} />
        )}

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Membership Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-3">
                Can I upgrade my membership later?
              </h3>
              <p className="text-gray-400">
                Absolutely! You can upgrade or change your membership plan at any time. Your new benefits 
                take effect immediately, and we'll handle any billing adjustments.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-3">
                Is there a free membership option?
              </h3>
              <p className="text-gray-400">
                Yes! Our Competitor membership is completely free and gives you access to core features. 
                You can also try Pro benefits with a 14-day free trial.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-3">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-400">
                We accept all major credit cards (Visa, MasterCard, American Express) and 
                digital wallets through our secure Stripe integration.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-3">
                Can I cancel my membership anytime?
              </h3>
              <p className="text-gray-400">
                Of course! You can cancel your membership at any time. You'll continue to have 
                access to member benefits until the end of your current billing period.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-electric-500/10 to-accent-500/10 border border-electric-500/20 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">
              Need Help Choosing a Membership?
            </h3>
            <p className="text-gray-400 mb-6">
              Our team is here to help you find the perfect membership plan for your car audio journey.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center space-x-2 bg-electric-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200"
            >
              <span>Contact Support</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}