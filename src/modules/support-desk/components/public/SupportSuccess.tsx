import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const SupportSuccess: React.FC = () => {
  const location = useLocation();
  const ticketNumber = location.state?.ticketNumber;
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-md p-8 text-center">
          <div className="w-20 h-20 bg-green-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-4">
            Thank You for Contacting Us!
          </h1>
          
          <p className="text-lg text-gray-300 mb-6">
            Your support request has been submitted successfully.
          </p>
          
          {ticketNumber && (
            <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400 mb-1">
                Your ticket number is:
              </p>
              <p className="text-2xl font-mono font-bold text-white">
                {ticketNumber}
              </p>
            </div>
          )}
          
          <div className="space-y-4 text-left max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-white">
              What happens next?
            </h2>
            
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-electric-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>You'll receive an email confirmation with your ticket details</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-electric-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Our support team will review your request within 24-48 hours</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-electric-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>You'll be notified by email when we respond to your request</span>
              </li>
            </ul>
          </div>
          
          <div className="mt-8 space-y-3">
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-electric-500 hover:bg-electric-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-electric-500"
            >
              Return to Home
            </Link>
            
            <p className="text-sm text-gray-400">
              Need to create an account?{' '}
              <Link to="/register" className="text-electric-400 hover:text-electric-300">
                Sign up here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportSuccess;