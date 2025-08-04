import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Loader, ArrowUp, ArrowDown } from 'lucide-react';
import { billingService } from '../services/billingService';
import { supabase } from '../lib/supabase';

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  billing_period: 'monthly' | 'yearly';
  features: string[];
  display_order: number;
}

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId?: string;
  currentSubscription?: any;
  userId: string;
  onSuccess: () => void;
}

export const PlanUpgradeModal: React.FC<PlanUpgradeModalProps> = ({
  isOpen,
  onClose,
  currentPlanId,
  currentSubscription,
  userId,
  onSuccess
}) => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [proration, setProration] = useState<{
    amount: number;
    description: string;
    isUpgrade: boolean;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPlan && currentSubscription) {
      calculateProration();
    }
  }, [selectedPlan, billingPeriod]);

  const loadPlans = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      setError('Failed to load membership plans');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProration = () => {
    if (!selectedPlan || !currentSubscription) return;

    const currentPlan = plans.find(p => p.id === currentPlanId);
    if (!currentPlan) return;

    // Calculate days remaining in current period
    const now = new Date();
    const periodEnd = new Date(currentSubscription.current_period_end);
    const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calculate daily rates
    const currentDailyRate = currentPlan.price / (currentPlan.billing_period === 'monthly' ? 30 : 365);
    const newDailyRate = selectedPlan.price / (billingPeriod === 'monthly' ? 30 : 365);
    
    // Calculate proration amount
    const currentCredit = currentDailyRate * daysRemaining;
    const newCharge = newDailyRate * daysRemaining;
    const prorationAmount = newCharge - currentCredit;

    setProration({
      amount: Math.abs(prorationAmount),
      description: `Proration for ${daysRemaining} days remaining`,
      isUpgrade: prorationAmount > 0
    });
  };

  const handlePlanChange = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    setError('');

    try {
      await billingService.updateSubscription(
        userId,
        selectedPlan.id,
        billingPeriod
      );

      onSuccess();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to update subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Change Membership Plan</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Billing Period Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-700/50 p-1 rounded-lg flex">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-electric-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  billingPeriod === 'yearly'
                    ? 'bg-electric-500 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Yearly (Save 20%)
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 text-electric-500 animate-spin" />
            </div>
          ) : (() => {
            const filteredPlans = plans.filter(plan => {
              // Filter by billing period
              if (plan.billing_period !== billingPeriod) return false;
              
              // Get current plan's display order
              const currentPlan = plans.find(p => p.id === currentPlanId);
              const currentOrder = currentPlan?.display_order || 0;
              
              // Only show plans that are upgrades (higher display_order)
              // Special case: If user is on Competitor or Pro Competitor, show Retailer and Manufacturer
              // Exclude Organization plan from upgrades (it's for different use case)
              if (currentPlan?.name === 'Competitor' || currentPlan?.name === 'Pro Competitor') {
                return plan.name === 'Retailer' || plan.name === 'Manufacturer';
              }
              
              // For other plans, show upgrades but exclude Organization
              return plan.display_order > currentOrder && plan.name !== 'Organization';
            });

            return filteredPlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPlans.map((plan) => {
                  const isCurrentPlan = plan.id === currentPlanId;
                  const isSelected = selectedPlan?.id === plan.id;
                  const currentPlan = plans.find(p => p.id === currentPlanId);
                  const isUpgrade = plan.display_order > (currentPlan?.display_order || 0);
                  const isDowngrade = plan.display_order < (currentPlan?.display_order || 999);

                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-lg border-2 transition-all cursor-pointer ${
                        isCurrentPlan
                          ? 'border-gray-600 bg-gray-700/30'
                          : isSelected
                          ? 'border-electric-500 bg-electric-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                      onClick={() => !isCurrentPlan && setSelectedPlan(plan)}
                    >
                      {isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="px-3 py-1 bg-gray-600 text-white text-xs rounded-full">
                            Current Plan
                          </span>
                        </div>
                      )}

                      {(isUpgrade || isDowngrade) && !isCurrentPlan && (
                        <div className="absolute -top-3 right-4">
                          <span className={`px-3 py-1 text-xs rounded-full flex items-center ${
                            isUpgrade
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {isUpgrade ? (
                              <>
                                <ArrowUp className="h-3 w-3 mr-1" />
                                Upgrade
                              </>
                            ) : (
                              <>
                                <ArrowDown className="h-3 w-3 mr-1" />
                                Downgrade
                              </>
                            )}
                          </span>
                        </div>
                      )}

                      <div className="p-6">
                        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className="mb-4">
                          <span className="text-3xl font-bold text-white">{formatAmount(plan.price)}</span>
                          <span className="text-gray-400">/{plan.billing_period}</span>
                        </div>

                        <ul className="space-y-2 mb-6">
                          {plan.features.slice(0, 5).map((feature, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <Check className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-300 text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {!isCurrentPlan && (
                          <button
                            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                              isSelected
                                ? 'bg-electric-500 text-white'
                                : 'bg-gray-700 text-white hover:bg-gray-600'
                            }`}
                            disabled={isCurrentPlan}
                          >
                            {isSelected ? 'Selected' : 'Select Plan'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg">No upgrade options available for your current plan.</p>
                <p className="text-gray-500 mt-2">You're already on the highest tier available.</p>
              </div>
            );
          })()}

          {/* Proration Details */}
          {proration && selectedPlan && (
            <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
              <h4 className="text-white font-medium mb-2">Billing Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>New plan ({selectedPlan.name})</span>
                  <span>{formatAmount(selectedPlan.price)}/{billingPeriod}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>{proration.description}</span>
                  <span className={proration.isUpgrade ? 'text-white' : 'text-green-400'}>
                    {proration.isUpgrade ? '+' : '-'}{formatAmount(proration.amount)}
                  </span>
                </div>
                <div className="border-t border-gray-600 pt-2 flex justify-between font-medium">
                  <span className="text-white">Due today</span>
                  <span className={proration.isUpgrade ? 'text-white' : 'text-green-400'}>
                    {proration.isUpgrade ? formatAmount(proration.amount) : '$0.00'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePlanChange}
              disabled={!selectedPlan || isProcessing}
              className="flex-1 py-3 px-4 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isProcessing ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : (
                'Confirm Change'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 