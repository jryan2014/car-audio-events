import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { navigateAndScroll } from '../utils/navigation';
import { 
  Building, 
  TrendingUp, 
  Users, 
  Calendar, 
  Megaphone, 
  BarChart3, 
  Shield, 
  Zap,
  Globe,
  MessageSquare,
  Award,
  Target,
  DollarSign,
  Clock,
  CheckCircle,
  ArrowRight,
  Star
} from 'lucide-react';

export default function BusinessFeatures() {
  const navigate = useNavigate();
  
  const handleViewPlans = () => {
    navigateAndScroll(navigate, '/business', 'plans');
  };
  const topBenefits = [
    {
      icon: TrendingUp,
      title: "Increase Your Sales",
      description: "Connect directly with car audio enthusiasts actively looking for products and services in your area."
    },
    {
      icon: Users,
      title: "Build Your Community",
      description: "Engage with customers, answer questions, and build lasting relationships that drive repeat business."
    },
    {
      icon: Globe,
      title: "Expand Your Reach",
      description: "Get discovered by customers beyond your local area with our nationwide platform."
    },
    {
      icon: Shield,
      title: "Trusted Platform",
      description: "Join a verified network of legitimate businesses serving the car audio community."
    }
  ];

  const retailerFeatures = [
    {
      icon: Building,
      title: "Premium Business Directory Listing",
      description: "Stand out with enhanced listing featuring your logo, photos, services, and direct contact information.",
      benefits: ["Custom business profile", "Photo galleries", "Service listings", "Customer reviews"]
    },
    {
      icon: Calendar,
      title: "Event Creation & Management",
      description: "Host your own events, demos, and competitions to drive foot traffic and sales.",
      benefits: ["Unlimited event creation", "Registration management", "Payment processing", "Attendee communications"]
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics Dashboard",
      description: "Track customer engagement, popular products, and optimize your marketing strategy.",
      benefits: ["Profile view tracking", "Customer demographics", "Engagement metrics", "ROI reporting"]
    },
    {
      icon: Megaphone,
      title: "Targeted Advertising",
      description: "Reach customers actively searching for car audio products and services.",
      benefits: ["Homepage placement", "Category sponsorship", "Event promotion", "Email marketing"]
    }
  ];

  const manufacturerFeatures = [
    {
      icon: Award,
      title: "Brand Showcase",
      description: "Present your entire product line with detailed specifications and dealer locator.",
      benefits: ["Product catalog", "Dealer network map", "Brand storytelling", "New product launches"]
    },
    {
      icon: Target,
      title: "Lead Generation",
      description: "Connect with dealers and installers looking for quality products to carry.",
      benefits: ["Dealer inquiries", "Installer network", "Distribution opportunities", "Partnership requests"]
    },
    {
      icon: MessageSquare,
      title: "Direct Customer Feedback",
      description: "Gather valuable insights and reviews directly from end users.",
      benefits: ["Product reviews", "Feature requests", "Market research", "Customer support"]
    },
    {
      icon: DollarSign,
      title: "Sales Enablement",
      description: "Provide dealers with marketing materials and product information.",
      benefits: ["Marketing assets", "Training materials", "Promotional tools", "Co-op advertising"]
    }
  ];


  const testimonials = [
    {
      quote: "Since joining the platform, we've seen a 40% increase in new customers finding us online.",
      author: "Mike Johnson",
      business: "Sound Waves Audio",
      rating: 5
    },
    {
      quote: "The event management tools have transformed how we run our monthly competitions.",
      author: "Sarah Chen",
      business: "Bass Pro Installations",
      rating: 5
    },
    {
      quote: "Best investment for our brand visibility in the car audio community.",
      author: "David Rodriguez",
      business: "Thunder Audio Systems",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-electric-500/20 to-purple-500/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-black text-white mb-6">
              Grow Your Car Audio Business
            </h1>
            <p className="text-2xl text-gray-300 max-w-3xl mx-auto mb-8">
              Join the premier platform connecting car audio businesses with passionate enthusiasts
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={handleViewPlans}
                className="bg-electric-500 text-white px-8 py-4 rounded-lg font-bold hover:bg-electric-600 transition-all duration-200 flex items-center space-x-2"
              >
                <span>View Pricing Plans</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Top Benefits */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {topBenefits.map((benefit, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-electric-500/20 rounded-full mb-4">
                <benefit.icon className="h-8 w-8 text-electric-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
              <p className="text-gray-400">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* For Retailers Section */}
      <div className="bg-gray-800/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              For Retailers & Installers
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to attract customers and grow your shop
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {retailerFeatures.map((feature, index) => (
              <div key={index} className="bg-gray-900/50 rounded-xl p-8 border border-gray-700">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <feature.icon className="h-8 w-8 text-electric-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-400 mb-4">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                          <span className="text-gray-300">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* For Manufacturers Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              For Manufacturers & Brands
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Connect with dealers and end users to grow your brand presence
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {manufacturerFeatures.map((feature, index) => (
              <div key={index} className="bg-gray-900/50 rounded-xl p-8 border border-gray-700">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <feature.icon className="h-8 w-8 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-400 mb-4">{feature.description}</p>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                          <span className="text-gray-300">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Testimonials */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              What Our Partners Say
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Join hundreds of successful car audio businesses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-900/50 rounded-xl p-8 border border-gray-700">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="text-white font-bold">{testimonial.author}</p>
                  <p className="text-gray-400 text-sm">{testimonial.business}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-electric-600 to-purple-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Grow Your Business?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join the car audio community's trusted business platform today
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handleViewPlans}
              className="bg-white text-electric-600 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2"
            >
              <span>Select Your Plan</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <Link
              to="/contact"
              className="text-white hover:text-gray-200 font-medium transition-colors"
            >
              Have Questions? Contact Us →
            </Link>
          </div>
        </div>
      </div>

      {/* Additional Benefits */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gray-900/50 rounded-xl p-8 border border-gray-700">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">
            Why Car Audio Businesses Choose Us
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Clock className="h-8 w-8 text-electric-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-white mb-2">Save Time</h4>
              <p className="text-gray-400">Automated event management and customer communications</p>
            </div>
            <div className="text-center">
              <DollarSign className="h-8 w-8 text-electric-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-white mb-2">Increase Revenue</h4>
              <p className="text-gray-400">Average 40% increase in new customer acquisition</p>
            </div>
            <div className="text-center">
              <Zap className="h-8 w-8 text-electric-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-white mb-2">Grow Faster</h4>
              <p className="text-gray-400">Reach thousands of car audio enthusiasts instantly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}