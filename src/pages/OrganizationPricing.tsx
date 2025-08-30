import React, { useState, useEffect } from 'react';
import { Users, Check, Star, ArrowRight, Shield, Globe, Calendar, Trophy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PricingPlans from '../components/PricingPlans';
import LoadingSpinner from '../components/LoadingSpinner';
import logger from '../utils/logger';
import { useNotifications } from '../components/NotificationSystem';
import SEO from '../components/SEO';

export default function OrganizationPricing() {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrganizationPlans();
  }, []);

  const loadOrganizationPlans = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .eq('hidden_on_frontend', false)
        .eq('show_on_organization_page', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      logger.error('Failed to load organization plans:', error);
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

  const organizationFeatures = [
    {
      icon: Users,
      title: 'Member Management',
      description: 'Manage your organization members and their permissions'
    },
    {
      icon: Calendar,
      title: 'Event Hosting',
      description: 'Host and organize car audio competitions and meetups'
    },
    {
      icon: Globe,
      title: 'Community Building',
      description: 'Build and grow your car audio community with powerful tools'
    },
    {
      icon: Trophy,
      title: 'Competition Management',
      description: 'Organize and manage professional car audio competitions'
    }
  ];

  const organizationTypes = [
    {
      title: 'Car Audio Clubs',
      description: 'Local and regional car audio enthusiast clubs',
      features: ['Member directories', 'Event planning', 'Club communications']
    },
    {
      title: 'Competition Organizations',
      description: 'Professional competition organizing bodies',
      features: ['Judge management', 'Scoring systems', 'Championship tracking']
    },
    {
      title: 'Industry Associations',
      description: 'Trade associations and industry groups',
      features: ['Industry standards', 'Certification programs', 'Professional networking']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <SEO 
        title="Organization Membership - IASCA, MECA & Competition Organizers"
        description="Official membership for car audio competition organizations. Manage events, teams, and connect with the global car audio competition community."
        keywords="car audio organization membership, IASCA membership, MECA membership, competition organizer, event management, car audio sanctioning"
        url="https://caraudioevents.com/organizations"
      />
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-electric-500/20"></div>
        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Users className="h-16 w-16 text-purple-500" />
              <div>
                <h1 className="text-5xl font-black text-white">
                  Organization <span className="text-purple-400">Platform</span>
                </h1>
                <p className="text-xl text-gray-400 mt-2">
                  Unite and grow your car audio community
                </p>
              </div>
            </div>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Whether you're running a local car audio club, organizing competitions, 
              or managing an industry association, our platform provides the tools 
              you need to build and manage your community.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <a
                href="#plans"
                className="bg-purple-500 text-white px-8 py-4 rounded-lg font-bold hover:bg-purple-600 transition-all duration-200 flex items-center space-x-2"
              >
                <span>Get Started Today</span>
                <ArrowRight className="h-5 w-5" />
              </a>
              <Link
                to="/pricing"
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                View Individual Plans →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Types */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Perfect for Any Car Audio Organization
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            From local clubs to professional competition bodies, we support all types of car audio organizations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {organizationTypes.map((type, index) => (
            <div key={index} className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-3">{type.title}</h3>
              <p className="text-gray-400 mb-4">{type.description}</p>
              <ul className="space-y-2">
                {type.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Organization Features */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Powerful Tools for Organization Management
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Everything you need to manage members, organize events, and grow your community
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {organizationFeatures.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <feature.icon className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Plans */}
      <div id="plans" className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Choose Your Organization Plan
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Select the plan that best fits your organization's size and needs
          </p>
        </div>

        {isLoading ? (
          <LoadingSpinner color="purple" message="Loading organization plans..." />
        ) : plans.length > 0 ? (
          <PricingPlans onPlanSelected={handlePlanSelected} preLoadedPlans={plans} />
        ) : (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Organization Plans Available</h3>
            <p className="text-gray-400 mb-6">
              Organization plans are currently being configured. Please check back soon.
            </p>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-500/10 to-electric-500/10 border-t border-gray-700">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Build Your Community?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join leading car audio organizations already using our platform to 
              manage members, organize events, and grow their communities.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                to="/organization-features"
                className="bg-purple-500 text-white px-8 py-4 rounded-lg font-bold hover:bg-purple-600 transition-all duration-200"
              >
                View Plan Features & Benefits
              </Link>
              <Link
                to="/events"
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Browse Community Events →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 