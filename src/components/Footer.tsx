import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-electric-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-electric-400">
              Car Audio Events
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              The ultimate platform for car audio competition enthusiasts. Connect, compete, and showcase your sound system.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-electric-500 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-electric-500 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-electric-500 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-electric-500 transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Quick Links</h4>
            <div className="space-y-2">
              <Link to="/events" className="block text-gray-400 hover:text-electric-500 transition-colors text-sm">
                Browse Events
              </Link>
              <Link to="/directory" className="block text-gray-400 hover:text-electric-500 transition-colors text-sm">
                Directory
              </Link>
              <Link to="/register" className="block text-gray-400 hover:text-electric-500 transition-colors text-sm">
                Join Community
              </Link>
              <Link to="#" className="block text-gray-400 hover:text-electric-500 transition-colors text-sm">
                Advertise With Us
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Support</h4>
            <div className="space-y-2">
              <Link to="#" className="block text-gray-400 hover:text-electric-500 transition-colors text-sm">
                Help Center
              </Link>
              <Link to="#" className="block text-gray-400 hover:text-electric-500 transition-colors text-sm">
                Contact Us
              </Link>
              <Link to="#" className="block text-gray-400 hover:text-electric-500 transition-colors text-sm">
                Privacy Policy
              </Link>
              <Link to="#" className="block text-gray-400 hover:text-electric-500 transition-colors text-sm">
                Terms of Service
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Contact</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <Mail className="h-4 w-4" />
                <span>info@caraudioevents.com</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </div>
            </div>
            <div className="pt-4">
              <h5 className="text-white font-medium text-sm mb-2">Newsletter</h5>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-l-lg text-white text-sm focus:outline-none focus:border-electric-500"
                />
                <button className="px-4 py-2 bg-electric-500 text-white rounded-r-lg hover:bg-electric-600 transition-all duration-200 text-sm font-medium">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 Car Audio Events. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link to="#" className="text-gray-400 hover:text-electric-500 transition-colors text-sm">
                Privacy
              </Link>
              <Link to="#" className="text-gray-400 hover:text-electric-500 transition-colors text-sm">
                Terms
              </Link>
              <Link to="#" className="text-gray-400 hover:text-electric-500 transition-colors text-sm">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}