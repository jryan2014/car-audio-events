import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  Trophy, 
  BarChart3, 
  Shield, 
  Megaphone,
  Globe,
  CreditCard,
  Award,
  UserCheck,
  MessageSquare,
  Zap,
  Clock,
  CheckCircle,
  ArrowRight,
  Star,
  Building,
  Target
} from 'lucide-react';

export default function OrganizationFeatures() {
  const navigate = useNavigate();
  
  const handleViewPlans = () => {
    navigate('/organizations');
    setTimeout(() => {
      const plansSection = document.getElementById('plans');
      if (plansSection) {
        plansSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const topBenefits = [
    {
      icon: Users,
      title: "Centralized Member Management",
      description: "Keep all your member information organized in one secure platform with easy access and updates."
    },
    {
      icon: Calendar,
      title: "Streamlined Event Organization",
      description: "Create, manage, and promote events with built-in registration and payment processing."
    },
    {
      icon: Trophy,
      title: "Competition Management",
      description: "Run professional competitions with automated scoring, brackets, and real-time results."
    },
    {
      icon: Globe,
      title: "Expand Your Reach",
      description: "Connect with the global car audio community and attract new members to your organization."
    }
  ];

  const coreFeatures = [
    {
      icon: UserCheck,
      title: "Member Database & Profiles",
      description: "Comprehensive member management system with detailed profiles and history tracking.",
      benefits: [
        "Unlimited member accounts",
        "Custom membership tiers",
        "Renewal tracking & reminders",
        "Member activity history",
        "Bulk import/export tools"
      ]
    },
    {
      icon: Calendar,
      title: "Event Creation & Management",
      description: "Professional event tools for competitions, meets, and educational workshops.",
      benefits: [
        "Unlimited event creation",
        "Online registration system",
        "Payment processing integration",
        "Attendee communications",
        "Check-in & badge printing"
      ]
    },
    {
      icon: Trophy,
      title: "Competition Platform",
      description: "Complete competition management from registration to awards ceremony.",
      benefits: [
        "Custom competition classes",
        "Judge scoring system",
        "Real-time leaderboards",
        "Bracket generation",
        "Results publishing"
      ]
    },
    {
      icon: BarChart3,
      title: "Analytics & Reporting",
      description: "Data-driven insights to help grow and improve your organization.",
      benefits: [
        "Member growth tracking",
        "Event attendance analytics",
        "Revenue reporting",
        "Engagement metrics",
        "Custom report builder"
      ]
    }
  ];

  const advancedFeatures = [
    {
      icon: CreditCard,
      title: "Financial Management",
      description: "Streamline dues collection and financial tracking.",
      benefits: [
        "Automated dues collection",
        "Payment reminders",
        "Financial reporting",
        "Multiple payment methods",
        "Refund management"
      ]
    },
    {
      icon: Megaphone,
      title: "Communication Tools",
      description: "Keep members informed and engaged with built-in communication.",
      benefits: [
        "Email blast system",
        "SMS notifications",
        "In-app messaging",
        "Newsletter integration",
        "Announcement board"
      ]
    },
    {
      icon: Shield,
      title: "Access Control & Security",
      description: "Manage permissions and keep your organization's data secure.",
      benefits: [
        "Role-based permissions",
        "Multi-admin support",
        "Activity audit logs",
        "Data encryption",
        "GDPR compliance"
      ]
    },
    {
      icon: Award,
      title: "Recognition & Awards",
      description: "Celebrate member achievements and track organization milestones.",
      benefits: [
        "Digital certificates",
        "Achievement badges",
        "Points system",
        "Leaderboards",
        "Hall of fame"
      ]
    }
  ];

  const organizationTypes = [
    {
      type: "Car Audio Clubs",
      description: "Perfect for local and regional car audio enthusiast groups",
      features: ["Member meetups", "Group builds", "Local competitions", "Educational workshops"]
    },
    {
      type: "Competition Organizations",
      description: "Ideal for groups that host regular sound competitions",
      features: ["Multi-format events", "Judge certification", "Season championships", "Sponsor management"]
    },
    {
      type: "Industry Associations",
      description: "Built for professional trade organizations",
      features: ["Dealer networks", "Training programs", "Industry standards", "Certification tracking"]
    },
    {
      type: "Educational Groups",
      description: "Supporting technical schools and training programs",
      features: ["Course management", "Student tracking", "Resource library", "Instructor tools"]
    }
  ];

  const testimonials = [
    {
      quote: "This platform transformed how we manage our 500+ member organization. Everything is streamlined now.",
      author: "Robert Chen",
      organization: "West Coast Audio Society",
      rating: 5
    },
    {
      quote: "The competition management tools alone are worth it. We've doubled our event attendance.",
      author: "Maria Rodriguez",
      organization: "Southern Bass Championships",
      rating: 5
    },
    {
      quote: "Member engagement is up 300% since we started using the platform's communication tools.",
      author: "James Wilson",
      organization: "National Car Audio Association",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-electric-500/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-black text-white mb-6">
              Empower Your Car Audio Organization
            </h1>
            <p className="text-2xl text-gray-300 max-w-3xl mx-auto mb-8">
              The complete platform for managing members, organizing events, and growing your car audio community
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={handleViewPlans}
                className="bg-purple-500 text-white px-8 py-4 rounded-lg font-bold hover:bg-purple-600 transition-all duration-200 flex items-center space-x-2"
              >
                <span>View Organization Plans</span>
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
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-500/20 rounded-full mb-4">
                <benefit.icon className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
              <p className="text-gray-400">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Core Features Section */}
      <div className="bg-gray-800/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Core Organization Features
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to run a successful car audio organization
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {coreFeatures.map((feature, index) => (
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

      {/* Advanced Features Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Advanced Management Tools
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Professional features to take your organization to the next level
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {advancedFeatures.map((feature, index) => (
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

      {/* Organization Types */}
      <div className="bg-gray-800/50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for Every Type of Organization
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Whether you're a local club or national association, we have the tools you need
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {organizationTypes.map((org, index) => (
              <div key={index} className="bg-gray-900/50 rounded-xl p-8 border border-gray-700">
                <h3 className="text-2xl font-bold text-white mb-2">{org.type}</h3>
                <p className="text-gray-400 mb-4">{org.description}</p>
                <ul className="space-y-2">
                  {org.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-purple-400 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
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
              Trusted by Leading Organizations
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Join hundreds of successful car audio organizations
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
                  <p className="text-gray-400 text-sm">{testimonial.organization}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-electric-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Organization?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join the leading platform for car audio organizations worldwide
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              onClick={handleViewPlans}
              className="bg-white text-purple-600 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2"
            >
              <span>Choose Your Plan</span>
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
            Why Organizations Choose Our Platform
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Clock className="h-8 w-8 text-purple-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-white mb-2">Save Time</h4>
              <p className="text-gray-400">Automate repetitive tasks and focus on growing your community</p>
            </div>
            <div className="text-center">
              <Building className="h-8 w-8 text-purple-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-white mb-2">Professional Image</h4>
              <p className="text-gray-400">Present a modern, professional face to members and sponsors</p>
            </div>
            <div className="text-center">
              <Zap className="h-8 w-8 text-purple-400 mx-auto mb-3" />
              <h4 className="text-lg font-bold text-white mb-2">Scale Effortlessly</h4>
              <p className="text-gray-400">Grow from 10 to 10,000 members without missing a beat</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}