import React, { useState, useEffect } from 'react';
import { Building, Check, Star, ArrowRight, Users, Zap, Crown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PricingPlans from '../components/PricingPlans';
import LoadingSpinner from '../components/LoadingSpinner';
import logger from '../utils/logger';
import { useNotifications } from '../components/NotificationSystem';
import SEO from '../components/SEO';

export default function BusinessPricing() {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBusinessPlans();
  }, []);

  const loadBusinessPlans = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .eq('hidden_on_frontend', false)
        .eq('show_on_business_page', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      logger.error('Failed to load business plans:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load pricing plans. Please try again later.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelected = (planId: string, paymentIntentId: string) => {
    if (paymentIntentId === 'free') {
      // Free plan - redirect to registration
      navigate(`/register?plan=${planId}`);
    } else {
      // Paid plan - handle payment success
      navigate('/dashboard');
    }
  };

  const businessFeatures = [
    {
      icon: Building,
      title: 'Business Directory Listing',
      description: 'Get discovered by customers with a premium directory listing'
    },
    {
      icon: Users,
      title: 'Customer Analytics',
      description: 'Track customer engagement and optimize your marketing'
    },
    {
      icon: Zap,
      title: 'Event Creation & Management',
      description: 'Host and manage your own car audio events'
    },
    {
      icon: Crown,
      title: 'Advertising Opportunities',
      description: 'Promote your products and services to our community'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <SEO 
        title="Business Membership - Car Audio Retailers & Manufacturers"
        description="Join Car Audio Events as a business member. Get premium event listings, priority support, directory features, and connect with thousands of car audio enthusiasts."
        keywords="car audio business membership, retailer membership, manufacturer membership, shop directory, business advertising, car audio marketing"
        url="https://caraudioevents.com/business"
      />
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-electric-500/20 to-purple-500/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Building className="h-16 w-16 text-electric-500" />
              <div>
                <h1 className="text-5xl font-black text-white">
                  Business <span className="text-electric-400">Solutions</span>
                </h1>
                <p className="text-xl text-gray-400 mt-2">
                  Grow your car audio business with our platform
                </p>
              </div>
            </div>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Connect with customers, showcase your expertise, and grow your business 
              in the car audio industry. From retailers to manufacturers, we have the 
              tools you need to succeed.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <a
                href="#plans"
                className="bg-electric-500 text-white px-8 py-4 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200 flex items-center space-x-2"
              >
                <span>Get Started Today</span>
                <ArrowRight className="h-5 w-5" />
              </a>
              <Link
                to="/directory"
                className="text-electric-400 hover:text-electric-300 font-medium transition-colors"
              >
                Browse Business Directory →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Business Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Why Choose Our Business Platform?
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Everything you need to connect with customers and grow your car audio business
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {businessFeatures.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-electric-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <feature.icon className="h-8 w-8 text-electric-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Plans */}
      <div id="plans" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Choose Your Business Plan
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Select the plan that best fits your business needs and start growing today
          </p>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Loading business plans..." />
        ) : plans.length > 0 ? (
          <PricingPlans onPlanSelected={handlePlanSelected} preLoadedPlans={plans} />
        ) : (
          <div className="text-center py-12">
            <Building className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Business Plans Available</h3>
            <p className="text-gray-400 mb-6">
              Business plans are currently being configured. Please check back soon.
            </p>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-electric-500/10 to-purple-500/10 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Grow Your Business?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join hundreds of car audio businesses already using our platform to 
              connect with customers and increase sales.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                to="/business-features"
                className="bg-electric-500 text-white px-8 py-4 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200"
              >
                View Plan Features & Benefits
              </Link>
              <Link
                to="/directory"
                className="text-electric-400 hover:text-electric-300 font-medium transition-colors"
              >
                Browse Business Directory →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 