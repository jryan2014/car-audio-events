import React, { useState, useEffect } from 'react';
import { Check, Star, Zap, Crown } from 'lucide-react';
import PaymentForm from './PaymentForm';
import { supabase } from '../lib/supabase';

interface PricingPlansProps {
  onPlanSelected?: (planId: string, paymentIntentId: string) => void;
  type?: string;
  preLoadedPlans?: any[];
}

export default function PricingPlans({ onPlanSelected, type, preLoadedPlans }: PricingPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const features = [
        'Browse all events',
        'Basic profile creation',
        'Score tracking',
        'Community access',
        'Mobile app access'
  ];

  useEffect(() => {
    // If pre-loaded plans are provided, use them directly
    if (preLoadedPlans && preLoadedPlans.length > 0) {
      const formattedPlans = formatPlans(preLoadedPlans);
      setPlans(formattedPlans);
      setIsLoading(false);
      return;
    }
    
    // Otherwise load plans from database, respecting visibility settings
    loadPlansFromDatabase();
  }, [type, preLoadedPlans]);

  const loadPlansFromDatabase = async () => {
    try {
      setIsLoading(true);
      
      // Try to fetch using the edge function first
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-membership-plans${type ? `?type=${type}` : ''}`;
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.plans && data.plans.length > 0) {
            // Filter out hidden plans
            const visiblePlans = data.plans.filter((plan: any) => 
              plan.is_active && !plan.hidden_on_frontend
            );
            if (visiblePlans.length > 0) {
              const formattedPlans = formatPlans(visiblePlans);
              setPlans(formattedPlans);
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (edgeFunctionError) {
        console.warn('Edge function failed, falling back to direct query:', edgeFunctionError);
      }

      // Fallback to direct Supabase query
      let query = supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .eq('hidden_on_frontend', false)
        .order('display_order', { ascending: true });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      if (data && data.length > 0) {
        const formattedPlans = formatPlans(data);
        setPlans(formattedPlans);
      } else {
        // Only show default plans if no database plans exist
        // Filter default plans to show basic options only
        const defaultPlans = getDefaultPlans().filter(plan => 
          plan.id === 'competitor' || plan.id === 'pro'
        );
        setPlans(defaultPlans);
      }
    } catch (error) {
      console.warn('Could not load plans from database, using filtered defaults:', error);
      // Show only basic default plans (no business/organization)
      const defaultPlans = getDefaultPlans().filter(plan => 
        plan.id === 'competitor' || plan.id === 'pro'
      );
      setPlans(defaultPlans);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPlans = (plansData: any[]) => {
    return plansData.map(plan => {
      // Determine icon based on plan type or name
      let Icon = Star;
      if (plan.type === 'competitor' || plan.name.toLowerCase().includes('competitor')) {
        Icon = Star;
      } else if (plan.type === 'retailer' || plan.name.toLowerCase().includes('retailer')) {
        Icon = Zap;
      } else if (plan.type === 'manufacturer' || plan.name.toLowerCase().includes('manufacturer') || 
                plan.type === 'organization' || plan.name.toLowerCase().includes('organization') ||
                plan.name.toLowerCase().includes('business')) {
        Icon = Crown;
      }

      // Format period text
      let periodText = 'per month';
      if (plan.billing_period === 'yearly') {
        periodText = 'per year';
      } else if (plan.billing_period === 'lifetime') {
        periodText = 'one-time';
      }

      // Format button text
      let buttonText = 'Select Plan';
      if (plan.price === 0) {
        buttonText = 'Get Started Free';
      } else if (plan.name.toLowerCase().includes('pro')) {
        buttonText = 'Upgrade to Pro';
      } else if (plan.type === 'retailer' || plan.type === 'manufacturer' || plan.type === 'organization') {
        buttonText = `Start ${plan.type.charAt(0).toUpperCase() + plan.type.slice(1)} Plan`;
      }

      return {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        period: periodText,
        description: plan.description,
        icon: Icon,
        features: Array.isArray(plan.features) ? plan.features : [],
        buttonText: buttonText,
        popular: plan.is_featured
      };
    });
  };

  const getDefaultPlans = () => {
    return [
      {
        id: 'competitor',
        name: 'Competitor',
        price: 0,
        period: 'Free Forever',
        description: 'Perfect for getting started in car audio competitions',
        icon: Star,
        features: ['Browse all events', 'Basic profile creation', 'Score tracking', 'Community access', 'Mobile app access'],
        buttonText: 'Get Started Free',
        popular: false
      },
      {
        id: 'pro',
        name: 'Pro Competitor',
        price: 29,
        period: 'per year',
        description: 'Advanced features for serious competitors',
        icon: Zap,
        features: [
          'Everything in Competitor',
          'Advanced analytics',
          'Team management',
          'Priority event registration',
          'Custom system showcase',
          'Competition history export',
          'Early access to new features'
        ],
        buttonText: 'Upgrade to Pro',
        popular: true
      },
      {
        id: 'business',
        name: 'Business',
        price: 99,
        period: 'per year',
        description: 'For retailers, manufacturers, and event organizers',
        icon: Crown,
        features: [
          'Everything in Pro',
          'Business directory listing',
          'Event creation & management',
          'Customer analytics',
          'Advertising opportunities',
          'Sponsorship tools',
          'API access',
          'Priority support'
        ],
        buttonText: 'Start Business Plan',
        popular: false
      }
    ];
  };

  const handlePlanSelect = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan?.price === 0) {
      // Free plan - no payment needed
      if (onPlanSelected) {
        onPlanSelected(planId, 'free');
      }
    } else {
      // Check if Stripe is configured
      const hasStripeConfig = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY && 
                             import.meta.env.VITE_SUPABASE_URL;
      
      if (!hasStripeConfig) {
        // Show demo message instead of payment form
        alert(`Demo Mode: This would upgrade you to ${plan.name} for $${plan.price}/${plan.period}. Payment integration requires Stripe configuration.`);
        return;
      }
      
      setSelectedPlan(planId);
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    if (onPlanSelected && selectedPlan) {
      onPlanSelected(selectedPlan, paymentIntentId);
    }
    setShowPayment(false);
    setSelectedPlan(null);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // Handle payment error
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  if (showPayment && selectedPlanData) {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white mb-2">
            Complete Your {selectedPlanData.name} Subscription
          </h3>
          <p className="text-gray-400">
            You're upgrading to {selectedPlanData.name} for ${selectedPlanData.price}/{selectedPlanData.period}
          </p>
        </div>
        
        <PaymentForm
          amount={selectedPlanData.price}
          description={`${selectedPlanData.name} Subscription`}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          metadata={{
            plan_id: selectedPlanData.id,
            plan_name: selectedPlanData.name
          }}
        />

        <button
          onClick={() => setShowPayment(false)}
          className="w-full mt-4 text-gray-400 hover:text-white transition-colors"
        >
          ← Back to plans
        </button>
      </div>
    );
  }

  // Check if we're in demo mode (no Stripe config)
  const isDemoMode = !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || !import.meta.env.VITE_SUPABASE_URL;

  return (
    <>
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-8 text-center">
          <p className="text-yellow-400 text-sm">
            <strong>Demo Mode:</strong> Payment processing is not configured. Free plans work normally.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center max-w-md mx-auto">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={loadPlansFromDatabase}
            className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className={`grid gap-8 max-w-6xl mx-auto ${
          plans.length === 1
            ? 'grid-cols-1 justify-items-center max-w-md' 
            : plans.length === 2
            ? 'grid-cols-1 md:grid-cols-2 justify-items-center max-w-4xl'
            : 'grid-cols-1 md:grid-cols-3'
        }`}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border-2 transition-all duration-300 hover:scale-105 ${
                plan.popular
                  ? 'border-electric-500 shadow-electric-500/20 shadow-2xl'
                  : 'border-gray-700/50 hover:border-gray-600'
              } ${plans.length <= 2 ? 'max-w-md w-full' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-electric-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                  plan.popular ? 'bg-electric-500' : 'bg-gray-700'
                }`}>
                  <plan.icon className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                
                <div className="mb-4">
                  {plan.price === 0 ? (
                    <div className="text-3xl font-black text-white">Free</div>
                  ) : (
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-black text-white">${typeof plan.price === 'number' ? plan.price.toFixed(2) : plan.price}</span>
                      <span className="text-gray-400 ml-2">{plan.period}</span>
                    </div>
                  )}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-center space-x-3">
                    <Check className="h-5 w-5 text-electric-500 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanSelect(plan.id)}
                className={`w-full py-3 px-4 rounded-lg font-bold transition-all duration-200 ${
                  plan.popular
                    ? 'bg-electric-500 text-white hover:bg-electric-600 shadow-lg'
                    : plan.price === 0
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}