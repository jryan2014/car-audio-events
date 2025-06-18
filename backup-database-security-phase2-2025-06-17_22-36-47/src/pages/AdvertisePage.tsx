import React, { useState } from 'react';
import { Target, BarChart3, Users, Eye, DollarSign, CheckCircle, ArrowRight, Sparkles, MessageSquare, Calendar, MapPin, Building2, Crown, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PricingTier {
  name: string;
  description: string;
  features: string[];
  cpc_range: string;
  cpm_range: string;
  recommended_for: string[];
}

export default function AdvertisePage() {
  const { user } = useAuth();
  const [selectedPlacement, setSelectedPlacement] = useState<string>('header');

  const placementTypes = {
    header: {
      name: 'Header Banner',
      description: 'Premium placement at the top of every page with maximum visibility',
      dimensions: '728x90 (Leaderboard) or 970x250 (Billboard)',
      traffic: '100% of visitors see this placement',
      visibility: 'Excellent - Above the fold on all devices',
      cpc_range: '$2.00 - $5.00',
      cpm_range: '$15 - $25',
      examples: ['Brand awareness campaigns', 'Event announcements', 'Product launches'],
      image: '/api/placeholder/728/90'
    },
    sidebar: {
      name: 'Sidebar Advertisement',
      description: 'Consistent placement on content pages, perfect for targeted campaigns',
      dimensions: '300x250 (Medium Rectangle) or 160x600 (Skyscraper)',
      traffic: 'Visible on 80% of content pages',
      visibility: 'Good - Consistent placement, less intrusive',
      cpc_range: '$1.50 - $3.00',
      cpm_range: '$8 - $15',
      examples: ['Product promotions', 'Service offerings', 'Local business ads'],
      image: '/api/placeholder/300/250'
    },
    event_page: {
      name: 'Event Page Placement',
      description: 'Highly targeted placement on event detail pages with engaged audience',
      dimensions: '300x250 or 728x90',
      traffic: 'Event-specific traffic with high engagement',
      visibility: 'Excellent - Highly relevant to audience',
      cpc_range: '$2.50 - $4.00',
      cpm_range: '$12 - $20',
      examples: ['Event sponsors', 'Related products', 'Competition gear'],
      image: '/api/placeholder/300/250'
    },
    search_results: {
      name: 'Search Results',
      description: 'Premium placement in search results with intent-based targeting',
      dimensions: '300x100 or 728x90',
      traffic: 'High-intent search traffic',
      visibility: 'Excellent - Intent-based audience',
      cpc_range: '$3.00 - $6.00',
      cpm_range: '$20 - $35',
      examples: ['Keyword campaigns', 'Competitive targeting', 'Product searches'],
      image: '/api/placeholder/728/90'
    }
  };

  const audienceTypes = [
    {
      id: 'competitor',
      name: 'Competitors',
      icon: Users,
      description: 'Car audio competitors and enthusiasts',
      size: '15,000+',
      engagement: 'Very High',
      best_for: ['Performance products', 'Competition gear', 'Technical services']
    },
    {
      id: 'retailer',
      name: 'Retailers',
      icon: Building2,
      description: 'Car audio retailers and dealers',
      size: '3,500+',
      engagement: 'High',
      best_for: ['B2B opportunities', 'Wholesale products', 'Business services']
    },
    {
      id: 'manufacturer',
      name: 'Manufacturers',
      icon: Wrench,
      description: 'Car audio manufacturers and brands',
      size: '1,200+',
      engagement: 'High',
      best_for: ['Industry partnerships', 'B2B services', 'Manufacturing solutions']
    },
    {
      id: 'organization',
      name: 'Organizations',
      icon: Crown,
      description: 'Car audio organizations and clubs',
      size: '800+',
      engagement: 'Very High',
      best_for: ['Event sponsorships', 'Community partnerships', 'Brand awareness']
    }
  ];

  const pricingTiers: PricingTier[] = [
    {
      name: 'Starter',
      description: 'Perfect for small businesses and local shops',
      features: [
        'Sidebar and footer placements',
        'Basic targeting options',
        'Standard reporting',
        'Email support',
        'Up to 2 active campaigns'
      ],
      cpc_range: '$0.75 - $2.00',
      cpm_range: '$4 - $12',
      recommended_for: ['Local businesses', 'Small retailers', 'Service providers']
    },
    {
      name: 'Professional',
      description: 'Ideal for growing businesses and established retailers',
      features: [
        'All placement types available',
        'Advanced targeting options',
        'Detailed analytics & reporting',
        'Priority support',
        'Up to 10 active campaigns',
        'A/B testing capabilities'
      ],
      cpc_range: '$1.50 - $4.00',
      cpm_range: '$8 - $20',
      recommended_for: ['Established retailers', 'Regional businesses', 'Product manufacturers']
    },
    {
      name: 'Enterprise',
      description: 'For large brands and major manufacturers',
      features: [
        'Premium placements (header, search)',
        'Custom targeting solutions',
        'Real-time analytics dashboard',
        'Dedicated account manager',
        'Unlimited campaigns',
        'Custom integration options',
        'Priority ad placement'
      ],
      cpc_range: '$2.00 - $6.00',
      cpm_range: '$15 - $35',
      recommended_for: ['Major brands', 'Large manufacturers', 'National campaigns']
    }
  ];

  const stats = [
    { label: 'Monthly Visitors', value: '125,000+', icon: Eye },
    { label: 'Active Members', value: '20,500+', icon: Users },
    { label: 'Events Listed', value: '450+', icon: Calendar },
    { label: 'Average CTR', value: '3.2%', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-electric-500/20 to-purple-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Advertise on the
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-electric-400 to-purple-400"> Premier</span>
              <br />Car Audio Platform
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Reach over 125,000 monthly car audio enthusiasts, competitors, and industry professionals. 
              Get your products and services in front of the most engaged audience in the car audio community.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              {user ? (
                <Link
                  to="/admin/ad-management"
                  className="bg-electric-500 text-white px-8 py-4 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2 text-lg font-medium"
                >
                  <Target className="h-6 w-6" />
                  <span>Create Campaign</span>
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="bg-electric-500 text-white px-8 py-4 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2 text-lg font-medium"
                >
                  <Target className="h-6 w-6" />
                  <span>Get Started</span>
                </Link>
              )}
              <button className="bg-gray-800 text-white px-8 py-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 text-lg font-medium">
                <MessageSquare className="h-6 w-6" />
                <span>Talk to Sales</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-4">
                    <IconComponent className="h-12 w-12 text-electric-400" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-gray-400">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Audience Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Reach Your Perfect Audience</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Our platform connects you with highly engaged car audio enthusiasts across different segments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {audienceTypes.map((audience) => {
              const IconComponent = audience.icon;
              return (
                <div key={audience.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                  <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-electric-500/10 rounded-full mb-4">
                      <IconComponent className="h-8 w-8 text-electric-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{audience.name}</h3>
                    <p className="text-gray-400 text-sm mb-4">{audience.description}</p>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Audience Size:</span>
                      <span className="text-white font-medium">{audience.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Engagement:</span>
                      <span className="text-electric-400 font-medium">{audience.engagement}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-500 mb-2">Best for:</p>
                    <div className="space-y-1">
                      {audience.best_for.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-green-400" />
                          <span className="text-xs text-gray-300">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Placement Types Section */}
      <div className="py-20 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Choose Your Placement</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Select from premium placement options designed to maximize your campaign's impact
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Placement Selector */}
            <div className="space-y-4">
              {Object.entries(placementTypes).map(([key, placement]) => (
                <div
                  key={key}
                  onClick={() => setSelectedPlacement(key)}
                  className={`p-6 rounded-xl border cursor-pointer transition-all ${
                    selectedPlacement === key
                      ? 'border-electric-500 bg-electric-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">{placement.name}</h3>
                      <p className="text-gray-400 text-sm mb-3">{placement.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-gray-500">CPC Range:</span>
                          <span className="text-electric-400 ml-1 font-medium">{placement.cpc_range}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">CPM Range:</span>
                          <span className="text-electric-400 ml-1 font-medium">{placement.cpm_range}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className={`h-5 w-5 transition-colors ${
                      selectedPlacement === key ? 'text-electric-400' : 'text-gray-500'
                    }`} />
                  </div>
                </div>
              ))}
            </div>

            {/* Placement Details */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">
                  {placementTypes[selectedPlacement as keyof typeof placementTypes].name}
                </h3>
                <p className="text-gray-400">
                  {placementTypes[selectedPlacement as keyof typeof placementTypes].description}
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Dimensions:</span>
                    <p className="text-white font-medium">
                      {placementTypes[selectedPlacement as keyof typeof placementTypes].dimensions}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Traffic:</span>
                    <p className="text-white font-medium">
                      {placementTypes[selectedPlacement as keyof typeof placementTypes].traffic}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Visibility:</span>
                    <p className="text-white font-medium">
                      {placementTypes[selectedPlacement as keyof typeof placementTypes].visibility}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Pricing:</span>
                    <p className="text-electric-400 font-medium">
                      {placementTypes[selectedPlacement as keyof typeof placementTypes].cpc_range} CPC
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-white font-medium mb-3">Perfect for:</h4>
                <div className="space-y-2">
                  {placementTypes[selectedPlacement as keyof typeof placementTypes].examples.map((example, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span className="text-gray-300 text-sm">{example}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-700/30 rounded-lg p-4">
                <div className="text-center text-gray-400 text-sm mb-2">Ad Preview</div>
                <div className="bg-gray-600 rounded border-2 border-dashed border-gray-500 h-24 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">
                    {placementTypes[selectedPlacement as keyof typeof placementTypes].dimensions}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Flexible Pricing Options</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Choose the pricing model that works best for your campaign goals and budget
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => (
              <div key={index} className={`bg-gray-800/50 backdrop-blur-sm border rounded-xl p-8 ${
                index === 1 ? 'border-electric-500 relative' : 'border-gray-700/50'
              }`}>
                {index === 1 && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-electric-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                  <p className="text-gray-400 mb-4">{tier.description}</p>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-500">CPC Range</div>
                    <div className="text-2xl font-bold text-electric-400">{tier.cpc_range}</div>
                    <div className="text-sm text-gray-500">CPM: {tier.cpm_range}</div>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  {tier.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mb-6">
                  <div className="text-sm text-gray-500 mb-2">Recommended for:</div>
                  <div className="space-y-1">
                    {tier.recommended_for.map((rec, recIndex) => (
                      <div key={recIndex} className="text-xs text-gray-400">• {rec}</div>
                    ))}
                  </div>
                </div>

                <button className={`w-full py-3 rounded-lg font-medium transition-colors ${
                  index === 1
                    ? 'bg-electric-500 text-white hover:bg-electric-600'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}>
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Powerful Advertising Features</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Advanced tools and features to maximize your campaign performance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Sparkles className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">AI-Powered Optimization</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Get intelligent recommendations for banner design, targeting, and campaign optimization using our AI assistant.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-electric-500/10 rounded-lg">
                  <Target className="h-6 w-6 text-electric-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Advanced Targeting</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Target specific user types, keywords, and event categories to reach your ideal audience with precision.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Real-Time Analytics</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Monitor campaign performance with detailed analytics including clicks, impressions, CTR, and ROI tracking.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Eye className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Premium Visibility</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Ensure maximum exposure with premium placements that guarantee visibility to your target audience.
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-yellow-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Flexible Budgeting</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Control your spending with flexible budget options, daily caps, and multiple pricing models (CPC, CPM, Fixed).
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Dedicated Support</h3>
              </div>
              <p className="text-gray-400 text-sm">
                Get expert help from our advertising specialists to optimize your campaigns and maximize your ROI.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Start Advertising?</h2>
          <p className="text-xl text-gray-400 mb-8">
            Join hundreds of successful advertisers reaching the car audio community
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            {user ? (
              <Link
                to="/admin/ad-management"
                className="bg-electric-500 text-white px-8 py-4 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2 text-lg font-medium"
              >
                <Target className="h-6 w-6" />
                <span>Create Your First Campaign</span>
              </Link>
            ) : (
              <Link
                to="/register"
                className="bg-electric-500 text-white px-8 py-4 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2 text-lg font-medium"
              >
                <Target className="h-6 w-6" />
                <span>Sign Up & Get Started</span>
              </Link>
            )}
            <button className="bg-gray-800 text-white px-8 py-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 text-lg font-medium">
              <MessageSquare className="h-6 w-6" />
              <span>Schedule Demo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 