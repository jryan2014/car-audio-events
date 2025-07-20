import React from 'react';
import { Shield, Mail, Cookie, Database, Lock, Users, Globe, AlertCircle } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  const lastUpdated = new Date('2025-01-20').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="h-8 w-8 text-electric-400" />
              <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
            </div>
            <p className="text-gray-400">Last updated: {lastUpdated}</p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Introduction</h2>
              <p className="text-gray-300">
                Car Audio Events ("we," "our," or "us") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
                when you visit our website caraudioevents.com, use our services, or interact with our platform.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Database className="h-6 w-6 mr-2 text-electric-400" />
                Information We Collect
              </h2>
              
              <h3 className="text-xl font-semibold text-white mt-4 mb-2">Personal Information</h3>
              <p className="text-gray-300 mb-3">When you register or use our services, we may collect:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Name and contact information (email, phone number)</li>
                <li>Account credentials</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Location data (for event searches and listings)</li>
                <li>Profile information and preferences</li>
                <li>Competition results and participation history</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-4 mb-2">Automatically Collected Information</h3>
              <p className="text-gray-300 mb-3">We automatically collect certain information when you visit our site:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>IP address and device information</li>
                <li>Browser type and operating system</li>
                <li>Pages visited and time spent on our site</li>
                <li>Referring website addresses</li>
                <li>Location information (country/region level)</li>
              </ul>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Cookie className="h-6 w-6 mr-2 text-electric-400" />
                Cookies and Tracking Technologies
              </h2>
              <p className="text-gray-300 mb-3">
                We use cookies and similar tracking technologies to enhance your experience. These include:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Essential Cookies:</strong> Required for site functionality and authentication</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site</li>
                <li><strong>Advertising Cookies:</strong> Used to deliver relevant advertisements</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
              </ul>
              <p className="text-gray-300 mt-3">
                You can manage your cookie preferences through our cookie consent banner or your browser settings.
              </p>
            </section>

            {/* How We Use Information */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Users className="h-6 w-6 mr-2 text-electric-400" />
                How We Use Your Information
              </h2>
              <p className="text-gray-300 mb-3">We use collected information to:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Provide and maintain our services</li>
                <li>Process transactions and manage events</li>
                <li>Send event notifications and updates</li>
                <li>Personalize your experience</li>
                <li>Analyze usage patterns and improve our services</li>
                <li>Deliver targeted advertising</li>
                <li>Comply with legal obligations</li>
                <li>Protect against fraud and unauthorized access</li>
              </ul>
            </section>

            {/* Information Sharing */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Globe className="h-6 w-6 mr-2 text-electric-400" />
                Information Sharing and Disclosure
              </h2>
              <p className="text-gray-300 mb-3">We may share your information with:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Event Organizers:</strong> When you register for events</li>
                <li><strong>Service Providers:</strong> Payment processors, email services, hosting providers</li>
                <li><strong>Advertisers:</strong> Aggregated, non-identifiable information only</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
              </ul>
              <p className="text-gray-300 mt-3">
                We do not sell your personal information to third parties.
              </p>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Lock className="h-6 w-6 mr-2 text-electric-400" />
                Data Security
              </h2>
              <p className="text-gray-300">
                We implement appropriate technical and organizational measures to protect your information, including:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-3">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication measures</li>
                <li>Secure data storage with Supabase</li>
                <li>PCI-compliant payment processing through Stripe</li>
              </ul>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Your Rights and Choices</h2>
              <p className="text-gray-300 mb-3">You have the right to:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>Access and update your personal information</li>
                <li>Request deletion of your account and data</li>
                <li>Opt-out of marketing communications</li>
                <li>Manage cookie preferences</li>
                <li>Request a copy of your data</li>
                <li>Object to certain processing activities</li>
              </ul>
              <p className="text-gray-300 mt-3">
                To exercise these rights, please contact us at privacy@caraudioevents.com
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Children's Privacy</h2>
              <p className="text-gray-300">
                Our services are not intended for children under 13 years of age. We do not knowingly 
                collect personal information from children under 13. If you believe we have collected 
                information from a child under 13, please contact us immediately.
              </p>
            </section>

            {/* International Data Transfers */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">International Data Transfers</h2>
              <p className="text-gray-300">
                Your information may be transferred to and processed in countries other than your own. 
                We ensure appropriate safeguards are in place to protect your information in accordance 
                with applicable data protection laws.
              </p>
            </section>

            {/* Changes to Policy */}
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Changes to This Policy</h2>
              <p className="text-gray-300">
                We may update this Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date. 
                Your continued use of our services after changes indicates acceptance of the updated policy.
              </p>
            </section>

            {/* Contact Information */}
            <section className="border-t border-gray-700 pt-8">
              <h2 className="text-2xl font-semibold text-white mb-4 flex items-center">
                <Mail className="h-6 w-6 mr-2 text-electric-400" />
                Contact Us
              </h2>
              <p className="text-gray-300 mb-4">
                If you have questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="bg-gray-700/30 rounded-lg p-4">
                <p className="text-gray-300">
                  <strong>Email:</strong> privacy@caraudioevents.com<br />
                  <strong>Website:</strong> caraudioevents.com<br />
                  <strong>Address:</strong> [Your Business Address]
                </p>
              </div>
            </section>

            {/* Legal Notice */}
            <section className="mt-8 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-semibold mb-1">Legal Compliance</p>
                  <p>
                    This privacy policy is designed to comply with GDPR, CCPA, and other applicable 
                    data protection regulations. We are committed to protecting your privacy rights 
                    regardless of your location.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;