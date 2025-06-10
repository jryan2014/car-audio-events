import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Trophy, Users, Star, ArrowRight, Volume2, Zap } from 'lucide-react';
import GoogleMap from '../components/GoogleMap';

export default function Home() {
  const featuredEvents = [
    {
      id: 1,
      title: "IASCA World Finals 2025",
      date: "March 15-17, 2025",
      location: "Orlando, FL",
      image: "https://images.pexels.com/photos/1127000/pexels-photo-1127000.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&dpr=2",
      category: "Championship",
      participants: 150
    },
    {
      id: 2,
      title: "dB Drag National Event",
      date: "April 22-24, 2025",
      location: "Phoenix, AZ",
      image: "https://images.pexels.com/photos/1644888/pexels-photo-1644888.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&dpr=2",
      category: "SPL Competition",
      participants: 89
    },
    {
      id: 3,
      title: "MECA Spring Championship",
      date: "May 10-12, 2025",
      location: "Atlanta, GA",
      image: "https://images.pexels.com/photos/2449600/pexels-photo-2449600.jpeg?auto=compress&cs=tinysrgb&w=800&h=400&dpr=2",
      category: "Sound Quality",
      participants: 67
    }
  ];

  const stats = [
    { label: "Active Events", value: "250+", icon: Calendar },
    { label: "Registered Competitors", value: "5,000+", icon: Users },
    { label: "Partner Retailers", value: "150+", icon: MapPin },
    { label: "Championships", value: "25", icon: Trophy }
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden h-[70vh] md:h-[80vh]">
        <div className="h-full relative">
          {/* World Map Background - NO OVERLAY */}
          <div className="absolute inset-0 z-0">
            <GoogleMap />
          </div>
          
          {/* Content positioned on the left side - NO OVERLAY ON MAP */}
          <div className="absolute left-0 top-0 h-full flex items-center z-10">
            <div className="max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-4 md:ml-8 animate-slide-up">
              {/* Clean text container positioned to left - doesn't cover map */}
              <div className="bg-black/80 backdrop-blur-md rounded-2xl p-3 sm:p-4 md:p-5 border border-white/20 shadow-2xl">
              <div className="flex items-center space-x-1 mb-2 md:mb-3">
                <Volume2 className="h-5 w-5 md:h-6 md:w-6 text-electric-500 animate-pulse-glow" />
                <span className="text-electric-400 font-semibold text-xs sm:text-sm">TURN IT UP LOUD</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 md:mb-3 leading-tight">
                Car Audio 
                <span className="text-electric-400"> 
                  Competition
                </span>
                <br />Events
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-300 mb-3 md:mb-4 leading-relaxed">
                Connect with the car audio community. Find competitions, track your scores, 
                showcase your system, and compete with the best sound enthusiasts worldwide.
              </p>
              <div className="flex space-x-2">
                <Link to="/register" className="flex-1 bg-electric-500 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-electric-600 transition-all duration-200 shadow-lg flex items-center justify-center">Join</Link>
                <Link to="/events" className="flex-1 bg-white/10 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-white/20 transition-all duration-200 border border-white/20 flex items-center justify-center">Events</Link>
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="inline-flex items-center justify-center w-16 h-16 bg-electric-500 rounded-full mb-4">
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
                <div className="text-3xl font-black text-white mb-2">{stat.value}</div>
                <div className="text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Zap className="h-6 w-6 text-electric-500" />
              <span className="text-electric-400 font-semibold">UPCOMING EVENTS</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
              Featured <span className="text-electric-400">Competitions</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Don't miss these high-energy competitions featuring the loudest and most refined car audio systems
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredEvents.map((event, index) => (
              <div 
                key={event.id} 
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden shadow-2xl hover:shadow-electric-500/10 transition-all duration-300 hover:scale-105 animate-slide-up border border-gray-700/50"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="relative">
                  <img 
                    src={event.image} 
                    alt={event.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-electric-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    {event.category}
                  </div>
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                    <Users className="h-3 w-3" />
                    <span>{event.participants}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-3 leading-tight">
                    {event.title}
                  </h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-gray-400 text-sm">
                      <Calendar className="h-4 w-4 mr-2 text-electric-500" />
                      {event.date}
                    </div>
                    <div className="flex items-center text-gray-400 text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-electric-500" />
                      {event.location}
                    </div>
                  </div>
                  <Link 
                    to={`/events/${event.id}`}
                    className="inline-flex items-center space-x-2 text-electric-400 hover:text-electric-300 font-semibold transition-colors duration-200"
                  >
                    <span>View Details</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link 
              to="/events"
              className="inline-flex items-center space-x-2 bg-electric-500 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-electric-600 transition-all duration-200 shadow-lg"
            >
              <span>View All Events</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-electric-500/10 to-accent-500/10 border-y border-electric-500/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Star className="h-8 w-8 text-electric-500 animate-pulse-glow" />
            <span className="text-electric-400 font-semibold text-lg">JOIN THE COMMUNITY</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
            Ready to <span className="text-electric-400">Compete</span>?
          </h2>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            Create your competitor profile, showcase your sound system, and start tracking your competition scores today.
          </p>
          <Link 
            to="/register"
            className="inline-flex items-center space-x-2 bg-electric-500 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-electric-600 transition-all duration-200 shadow-lg"
          >
            <span>Get Started Now</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}