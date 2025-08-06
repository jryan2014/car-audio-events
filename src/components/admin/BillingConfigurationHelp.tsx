import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Info, AlertCircle, CheckCircle, BookOpen, Lightbulb, Shield, DollarSign, Users, TrendingUp, Zap, Settings } from 'lucide-react';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface BillingConfigurationHelpProps {
  section: 'prorate' | 'rules' | 'dunning' | 'campaigns';
}

export default function BillingConfigurationHelp({ section }: BillingConfigurationHelpProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const proRateHelp: HelpSection[] = [
    {
      id: 'prorate-overview',
      title: 'What are Pro-rate Settings?',
      icon: <Info className="h-5 w-5 text-blue-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <p>Pro-rate settings control how membership upgrades and downgrades are calculated and charged. When a user changes their membership level mid-billing cycle, pro-rating ensures they only pay for what they use.</p>
          <div className="bg-gray-700/30 p-3 rounded-lg">
            <p className="font-medium text-white mb-2">Example:</p>
            <p className="text-sm">If a user upgrades from Competitor ($29/month) to Organizer ($129/month) on day 15 of a 30-day month, they'll be charged ~$50 for the remaining 15 days at the higher rate.</p>
          </div>
        </div>
      )
    },
    {
      id: 'prorate-setup',
      title: 'How to Set Up Pro-rate Rules',
      icon: <Settings className="h-5 w-5 text-green-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Click "Add Pro-rate Rule"</strong> to create a new rule</li>
            <li><strong>Name your rule</strong> (e.g., "Competitor to Organizer Upgrade")</li>
            <li><strong>Select Calculation Method:</strong>
              <ul className="ml-6 mt-1 space-y-1 text-sm">
                <li>• <strong>Daily:</strong> Charges calculated per day (most accurate)</li>
                <li>• <strong>Monthly:</strong> Charges calculated as monthly fraction</li>
                <li>• <strong>None:</strong> No pro-rating (full charge immediately)</li>
              </ul>
            </li>
            <li><strong>Configure Options:</strong>
              <ul className="ml-6 mt-1 space-y-1 text-sm">
                <li>• <strong>Credit Unused Time:</strong> Refund unused days from old plan</li>
                <li>• <strong>Immediate Charge:</strong> Charge difference right away</li>
              </ul>
            </li>
            <li><strong>Save and Activate</strong> the rule</li>
          </ol>
        </div>
      )
    },
    {
      id: 'prorate-best',
      title: 'Best Practices',
      icon: <Lightbulb className="h-5 w-5 text-yellow-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <ul className="space-y-2">
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
              <span>Always credit unused time for upgrades to maintain customer trust</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
              <span>Use daily pro-rating for accuracy with varying month lengths</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
              <span>Set minimum pro-ration amounts to avoid tiny transactions</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
              <span>Create separate rules for upgrades vs downgrades</span>
            </li>
          </ul>
        </div>
      )
    }
  ];

  const billingRulesHelp: HelpSection[] = [
    {
      id: 'rules-overview',
      title: 'What are Billing Rules?',
      icon: <Info className="h-5 w-5 text-blue-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <p>Billing rules automate payment processes and customer communications. They trigger specific actions when certain billing events occur, reducing manual work and improving payment success rates.</p>
          <div className="bg-gray-700/30 p-3 rounded-lg">
            <p className="font-medium text-white mb-2">Common Use Cases:</p>
            <ul className="text-sm space-y-1">
              <li>• Automatically retry failed payments</li>
              <li>• Send payment reminders before card expiration</li>
              <li>• Offer grace periods for failed payments</li>
              <li>• Auto-cancel subscriptions after multiple failures</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'rules-setup',
      title: 'How to Configure Billing Rules',
      icon: <Settings className="h-5 w-5 text-green-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Click "Add Rule"</strong> to create a new automation</li>
            <li><strong>Choose Rule Type:</strong>
              <ul className="ml-6 mt-1 space-y-1 text-sm">
                <li>• <strong>Auto Retry:</strong> Retry failed payments automatically</li>
                <li>• <strong>Grace Period:</strong> Allow time before cancellation</li>
                <li>• <strong>Cancellation:</strong> Auto-cancel after conditions met</li>
                <li>• <strong>Upgrade Reminder:</strong> Promote higher tiers</li>
              </ul>
            </li>
            <li><strong>Set Trigger Conditions</strong> (e.g., "payment_failed")</li>
            <li><strong>Define Actions</strong> (e.g., "retry_payment", "send_email")</li>
            <li><strong>Configure Timing:</strong>
              <ul className="ml-6 mt-1 space-y-1 text-sm">
                <li>• Delay Days: Wait period before action</li>
                <li>• Max Attempts: Number of retries allowed</li>
              </ul>
            </li>
          </ol>
        </div>
      )
    },
    {
      id: 'rules-examples',
      title: 'Common Rule Examples',
      icon: <BookOpen className="h-5 w-5 text-purple-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <div className="space-y-3">
            <div className="bg-gray-700/30 p-3 rounded-lg">
              <p className="font-medium text-white">Smart Retry Rule</p>
              <p className="text-sm mt-1">Trigger: payment_failed</p>
              <p className="text-sm">Action: Retry after 1, 3, and 7 days</p>
              <p className="text-sm">Max Attempts: 3</p>
            </div>
            <div className="bg-gray-700/30 p-3 rounded-lg">
              <p className="font-medium text-white">Card Expiration Warning</p>
              <p className="text-sm mt-1">Trigger: card_expiring_soon</p>
              <p className="text-sm">Action: Send reminder email</p>
              <p className="text-sm">Delay: -7 days (7 days before expiration)</p>
            </div>
            <div className="bg-gray-700/30 p-3 rounded-lg">
              <p className="font-medium text-white">Grace Period Rule</p>
              <p className="text-sm mt-1">Trigger: subscription_past_due</p>
              <p className="text-sm">Action: Maintain access for 3 days</p>
              <p className="text-sm">Follow-up: Cancel if not resolved</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const dunningHelp: HelpSection[] = [
    {
      id: 'dunning-overview',
      title: 'What is Dunning Management?',
      icon: <Info className="h-5 w-5 text-blue-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <p>Dunning is the process of communicating with customers to recover failed payments. Effective dunning reduces involuntary churn by automatically retrying payments and notifying customers of billing issues.</p>
          <div className="bg-gray-700/30 p-3 rounded-lg">
            <p className="font-medium text-white mb-2">Why It's Important:</p>
            <ul className="text-sm space-y-1">
              <li>• Recovers up to 70% of failed payments</li>
              <li>• Reduces involuntary churn by 20-30%</li>
              <li>• Maintains positive customer relationships</li>
              <li>• Automates payment recovery workflow</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'dunning-setup',
      title: 'Setting Up Dunning Processes',
      icon: <Settings className="h-5 w-5 text-green-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Click "Add Settings"</strong> to create a dunning policy</li>
            <li><strong>Name your policy</strong> (e.g., "Standard Recovery Process")</li>
            <li><strong>Set Grace Period:</strong> Days before first retry (typically 3)</li>
            <li><strong>Configure Retry Schedule:</strong>
              <ul className="ml-6 mt-1 space-y-1 text-sm">
                <li>• Day 1: Immediate retry</li>
                <li>• Day 3: Second attempt</li>
                <li>• Day 7: Third attempt</li>
                <li>• Day 14: Final attempt</li>
              </ul>
            </li>
            <li><strong>Set Auto-Cancel Period:</strong> When to give up (30 days)</li>
            <li><strong>Enable Email Notifications:</strong> Keep customers informed</li>
            <li><strong>Configure Escalation:</strong> For high-value accounts</li>
          </ol>
        </div>
      )
    },
    {
      id: 'dunning-emails',
      title: 'Email Communication Strategy',
      icon: <DollarSign className="h-5 w-5 text-green-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <p className="mb-2">Effective dunning emails are crucial for payment recovery:</p>
          <div className="space-y-2">
            <div className="bg-gray-700/30 p-3 rounded-lg">
              <p className="font-medium text-white">First Email (Day 0)</p>
              <p className="text-sm mt-1">Tone: Helpful and informative</p>
              <p className="text-sm">"Your payment couldn't be processed. Click here to update."</p>
            </div>
            <div className="bg-gray-700/30 p-3 rounded-lg">
              <p className="font-medium text-white">Second Email (Day 3)</p>
              <p className="text-sm mt-1">Tone: Gentle reminder with urgency</p>
              <p className="text-sm">"We'll try again soon. Update now to avoid interruption."</p>
            </div>
            <div className="bg-gray-700/30 p-3 rounded-lg">
              <p className="font-medium text-white">Final Email (Day 7+)</p>
              <p className="text-sm mt-1">Tone: Clear consequences</p>
              <p className="text-sm">"Your account will be canceled in X days without payment."</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'dunning-best',
      title: 'Best Practices',
      icon: <Lightbulb className="h-5 w-5 text-yellow-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <ul className="space-y-2">
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
              <span>Use smart retry timing (avoid weekends/holidays)</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
              <span>Include clear update payment links in all emails</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
              <span>Offer multiple payment method options</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 mr-2 flex-shrink-0" />
              <span>Escalate high-value accounts to personal outreach</span>
            </li>
            <li className="flex items-start">
              <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
              <span>Test with small amounts before enabling system-wide</span>
            </li>
          </ul>
        </div>
      )
    }
  ];

  const campaignsHelp: HelpSection[] = [
    {
      id: 'campaigns-overview',
      title: 'What are Coupon Campaigns?',
      icon: <Info className="h-5 w-5 text-blue-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <p>Coupon campaigns are targeted marketing initiatives that offer discounts to specific customer segments. They help drive new sales, reward loyalty, and re-engage inactive users.</p>
          <div className="bg-gray-700/30 p-3 rounded-lg">
            <p className="font-medium text-white mb-2">Campaign Types:</p>
            <ul className="text-sm space-y-1">
              <li>• <strong>Seasonal:</strong> Holiday promotions, summer sales</li>
              <li>• <strong>Promotional:</strong> Product launches, special events</li>
              <li>• <strong>Loyalty:</strong> Reward existing customers</li>
              <li>• <strong>Acquisition:</strong> Attract new customers</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'campaigns-create',
      title: 'Creating Effective Campaigns',
      icon: <TrendingUp className="h-5 w-5 text-green-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <ol className="list-decimal list-inside space-y-2">
            <li><strong>Click "Create Campaign"</strong></li>
            <li><strong>Define Campaign Details:</strong>
              <ul className="ml-6 mt-1 space-y-1 text-sm">
                <li>• Name: Clear and searchable</li>
                <li>• Type: Match to your goal</li>
                <li>• Description: Internal notes</li>
              </ul>
            </li>
            <li><strong>Set Campaign Period:</strong>
              <ul className="ml-6 mt-1 space-y-1 text-sm">
                <li>• Start Date: When coupons become active</li>
                <li>• End Date: Expiration (creates urgency)</li>
              </ul>
            </li>
            <li><strong>Configure Coupon Template:</strong>
              <ul className="ml-6 mt-1 space-y-1 text-sm">
                <li>• Prefix: SUMMER2024, WELCOME, VIP</li>
                <li>• Type: Percentage (10% off) or Fixed ($5 off)</li>
                <li>• Value: Discount amount</li>
                <li>• Limits: Per-user and total usage</li>
              </ul>
            </li>
            <li><strong>Set Budget (Optional):</strong> Cap total discount value</li>
          </ol>
        </div>
      )
    },
    {
      id: 'campaigns-strategy',
      title: 'Campaign Strategy Guide',
      icon: <Users className="h-5 w-5 text-purple-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <div className="space-y-3">
            <div className="bg-gray-700/30 p-3 rounded-lg">
              <p className="font-medium text-white">New Customer Acquisition</p>
              <p className="text-sm mt-1">• 20-30% discount for first month</p>
              <p className="text-sm">• Limited time offer (7-14 days)</p>
              <p className="text-sm">• Single use per customer</p>
            </div>
            <div className="bg-gray-700/30 p-3 rounded-lg">
              <p className="font-medium text-white">Win-Back Campaign</p>
              <p className="text-sm mt-1">• 50% off for 3 months</p>
              <p className="text-sm">• Target: Canceled in last 90 days</p>
              <p className="text-sm">• Personalized email outreach</p>
            </div>
            <div className="bg-gray-700/30 p-3 rounded-lg">
              <p className="font-medium text-white">Loyalty Rewards</p>
              <p className="text-sm mt-1">• 10-15% ongoing discount</p>
              <p className="text-sm">• Target: 12+ month customers</p>
              <p className="text-sm">• Auto-renewing benefit</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'campaigns-tracking',
      title: 'Tracking & Optimization',
      icon: <Zap className="h-5 w-5 text-yellow-400" />,
      content: (
        <div className="space-y-3 text-gray-300">
          <p className="mb-2">Monitor these key metrics:</p>
          <ul className="space-y-2">
            <li className="flex items-start">
              <Shield className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span className="font-medium">Redemption Rate:</span>
                <span className="text-sm block">Target: 15-25% for email campaigns</span>
              </div>
            </li>
            <li className="flex items-start">
              <Shield className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span className="font-medium">Conversion Rate:</span>
                <span className="text-sm block">Coupons used ÷ Coupons generated</span>
              </div>
            </li>
            <li className="flex items-start">
              <Shield className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span className="font-medium">ROI:</span>
                <span className="text-sm block">Revenue generated ÷ Discount cost</span>
              </div>
            </li>
            <li className="flex items-start">
              <Shield className="h-4 w-4 text-blue-400 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <span className="font-medium">Customer Lifetime Value:</span>
                <span className="text-sm block">Track long-term impact</span>
              </div>
            </li>
          </ul>
        </div>
      )
    }
  ];

  const helpSections = {
    prorate: proRateHelp,
    rules: billingRulesHelp,
    dunning: dunningHelp,
    campaigns: campaignsHelp
  };

  const currentHelp = helpSections[section];

  return (
    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6 mb-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
          <HelpCircle className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Configuration Help</h3>
          <p className="text-sm text-gray-400">Learn how to set up and optimize your billing configuration</p>
        </div>
      </div>

      <div className="space-y-3">
        {currentHelp.map((helpItem) => (
          <div key={helpItem.id} className="bg-gray-800/30 rounded-lg border border-gray-700/50">
            <button
              onClick={() => toggleSection(helpItem.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-700/20 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {helpItem.icon}
                <span className="text-white font-medium">{helpItem.title}</span>
              </div>
              {expandedSections.includes(helpItem.id) ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.includes(helpItem.id) && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-700/50">
                {helpItem.content}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-300">
            <p className="font-medium text-yellow-400 mb-1">Important Note:</p>
            <p>Always test billing configurations in a development environment before applying to production. Small configuration errors can significantly impact revenue and customer experience.</p>
          </div>
        </div>
      </div>
    </div>
  );
}