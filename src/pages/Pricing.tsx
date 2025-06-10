import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PricingPlans from '../components/PricingPlans';
import { useAuth } from '../contexts/AuthContext';

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handlePlanSelected = (planId: string, paymentIntentId: string) => {
    // Here you would typically update the user's subscription in your database
    console.log('Plan selected:', planId, 'Payment:', paymentIntentId);
    
    // Redirect to dashboard
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link 
          to="/"
          className="inline-flex items-center space-x-2 text-electric-400 hover:text-electric-300 font-semibold mb-8 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Home</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-black text-white mb-6">
            Choose Your <span className="text-electric-400">Plan</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Select the perfect plan for your car audio competition journey. 
            Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Pricing Plans */}
        <PricingPlans onPlanSelected={handlePlanSelected} />

        {/* FAQ Section */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-3">
                Can I change my plan later?
              </h3>
              <p className="text-gray-400">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                and we'll prorate any billing differences.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-3">
                Is there a free trial?
              </h3>
              <p className="text-gray-400">
                Our Competitor plan is free forever! You can also try Pro features with a 14-day 
                free trial when you upgrade.
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
                Can I cancel anytime?
              </h3>
              <p className="text-gray-400">
                Absolutely! You can cancel your subscription at any time. You'll continue to have 
                access to paid features until the end of your billing period.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-electric-500/10 to-accent-500/10 border border-electric-500/20 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">
              Need Help Choosing?
            </h3>
            <p className="text-gray-400 mb-6">
              Our team is here to help you find the perfect plan for your needs.
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