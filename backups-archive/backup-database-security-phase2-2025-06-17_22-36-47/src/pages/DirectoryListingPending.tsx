import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, Clock, ArrowLeft, Mail, Shield } from 'lucide-react';

export default function DirectoryListingPending() {
  const location = useLocation();
  const { listingId, listingType, businessName } = location.state || {};

  const getListingTypeLabel = (type: string) => {
    switch (type) {
      case 'retailer': return 'Retailer Business';
      case 'manufacturer': return 'Manufacturer';
      case 'used_equipment': return 'Used Equipment';
      default: return 'Listing';
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-6">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>

          {/* Main Message */}
          <h1 className="text-3xl font-bold text-white mb-4">
            Listing Submitted Successfully!
          </h1>
          
          <p className="text-xl text-gray-300 mb-8">
            Your {getListingTypeLabel(listingType).toLowerCase()} listing has been submitted for review.
          </p>

          {/* Listing Info Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold text-white mb-4">Submission Details</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Listing ID:</span>
                <span className="text-white font-mono">#{listingId?.slice(-8) || 'N/A'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Type:</span>
                <span className="text-white">{getListingTypeLabel(listingType)}</span>
              </div>
              
              {businessName && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white">{businessName}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className="flex items-center space-x-2 text-yellow-400">
                  <Clock className="h-4 w-4" />
                  <span>Pending Review</span>
                </span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-400 mb-4 flex items-center justify-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>What Happens Next?</span>
            </h3>
            
            <div className="text-left space-y-4 text-blue-100">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-400">1</span>
                </div>
                <div>
                  <p className="font-medium">Review Process</p>
                  <p className="text-sm text-blue-200">Our administrators will review your listing within 1-2 business days.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-400">2</span>
                </div>
                <div>
                  <p className="font-medium">Email Notification</p>
                  <p className="text-sm text-blue-200">You'll receive an email once your listing is approved or if changes are needed.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs font-semibold text-blue-400">3</span>
                </div>
                <div>
                  <p className="font-medium">Go Live</p>
                  <p className="text-sm text-blue-200">Once approved, your listing will appear in the directory for all members to see.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center justify-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Need Help?</span>
            </h3>
            
            <p className="text-gray-400 text-sm mb-4">
              If you have questions about your listing or need to make changes, please contact our support team.
            </p>
            
            <Link
              to="/contact"
              className="inline-flex items-center space-x-2 text-electric-400 hover:text-electric-300 transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>Contact Support</span>
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <Link
              to="/directory"
              className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Directory</span>
            </Link>
            
            <Link
              to="/profile?tab=listings"
              className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-electric-500 text-white rounded-lg font-medium hover:bg-electric-600 transition-colors"
            >
              <span>View My Listings</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 