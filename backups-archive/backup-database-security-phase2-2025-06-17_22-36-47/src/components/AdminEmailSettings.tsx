import React, { useState, useEffect } from 'react';
import { Mail, Send, Settings, TestTube, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { emailService, EmailType } from '../services/emailService';

interface EmailSettings {
  postmark_api_key: string;
  from_email: string;
  from_name: string;
  reply_to_email: string;
  test_email: string;
}

export default function AdminEmailSettings() {
  const [settings, setSettings] = useState<EmailSettings>({
    postmark_api_key: '',
    from_email: 'noreply@caraudioevents.com',
    from_name: 'Car Audio Events Platform',
    reply_to_email: 'support@caraudioevents.com',
    test_email: ''
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load from localStorage for now (in production, this would come from your backend)
      const savedSettings = localStorage.getItem('email_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      // Save to localStorage for now (in production, this would save to your backend)
      localStorage.setItem('email_settings', JSON.stringify(settings));
      
      // Force email service to reinitialize with new settings
      emailService.reinitialize();

      setMessage('Email settings saved successfully! 🎉');
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const testEmailService = async () => {
    if (!settings.test_email) {
      setTestResult({ success: false, message: 'Please enter a test email address' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await emailService.sendTemplatedEmail(
        settings.test_email,
        'system_notification',
        {
          subject: 'Postmark Integration Test',
          message: 'This is a test email to verify your Postmark integration is working correctly. If you received this email, your configuration is successful!',
          firstName: 'Admin'
        }
      );

      if (result.success) {
        setTestResult({
          success: true,
          message: `Test email sent successfully! Message ID: ${result.messageId}`
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Failed to send test email'
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Failed to send test email'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const sendWelcomeEmail = async () => {
    if (!settings.test_email) {
      setTestResult({ success: false, message: 'Please enter a test email address' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await emailService.sendTemplatedEmail(
        settings.test_email,
        'welcome',
        {
          firstName: 'Test User',
          dashboardUrl: `${window.location.origin}/dashboard`
        }
      );

      if (result.success) {
        setTestResult({
          success: true,
          message: `Welcome email sent successfully! Message ID: ${result.messageId}`
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Failed to send welcome email'
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'Failed to send welcome email'
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500 mx-auto"></div>
        <p className="text-center text-gray-400 mt-2">Loading email settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Email Configuration */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="h-6 w-6 text-electric-400" />
          <h2 className="text-xl font-bold text-white">Postmark Email Configuration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Postmark API Key *
            </label>
            <input
              type="password"
              value={settings.postmark_api_key}
              onChange={(e) => setSettings(prev => ({ ...prev, postmark_api_key: e.target.value }))}
              placeholder="Enter your Postmark Server API Token"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Get your API key from your Postmark account dashboard
            </p>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              From Email *
            </label>
            <input
              type="email"
              value={settings.from_email}
              onChange={(e) => setSettings(prev => ({ ...prev, from_email: e.target.value }))}
              placeholder="noreply@yourdomain.com"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be a verified sender in Postmark
            </p>
          </div>

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              From Name
            </label>
            <input
              type="text"
              value={settings.from_name}
              onChange={(e) => setSettings(prev => ({ ...prev, from_name: e.target.value }))}
              placeholder="Car Audio Events Platform"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Reply-To Email
            </label>
            <input
              type="email"
              value={settings.reply_to_email}
              onChange={(e) => setSettings(prev => ({ ...prev, reply_to_email: e.target.value }))}
              placeholder="support@yourdomain.com"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Where replies to automated emails will be sent
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-600 mt-6">
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="flex items-center space-x-2 px-6 py-3 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>

          {message && (
            <div className={`text-sm ${message.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Email Testing */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <TestTube className="h-6 w-6 text-electric-400" />
          <h2 className="text-xl font-bold text-white">Test Email Service</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Test Email Address
            </label>
            <input
              type="email"
              value={settings.test_email}
              onChange={(e) => setSettings(prev => ({ ...prev, test_email: e.target.value }))}
              placeholder="your-email@example.com"
              className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
            />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={testEmailService}
              disabled={isTesting || !settings.test_email}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              <span>{isTesting ? 'Sending...' : 'Send Test Email'}</span>
            </button>

            <button
              onClick={sendWelcomeEmail}
              disabled={isTesting || !settings.test_email}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="h-4 w-4" />
              <span>{isTesting ? 'Sending...' : 'Send Welcome Email'}</span>
            </button>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success 
                ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              <div className="flex items-start space-x-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <h4 className="font-medium">
                    {testResult.success ? 'Test Successful!' : 'Test Failed'}
                  </h4>
                  <p className="text-sm mt-1">{testResult.message}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Service Status */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Mail className="h-6 w-6 text-electric-400" />
          <h2 className="text-xl font-bold text-white">Service Status</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700/30 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${emailService.isReady() ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-gray-300 font-medium">Email Service</span>
            </div>
            <p className="text-sm text-gray-400">
              {emailService.isReady() ? 'Connected and ready' : 'Not configured'}
            </p>
          </div>

          <div className="bg-gray-700/30 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-300 font-medium">Templates</span>
            </div>
            <p className="text-sm text-gray-400">10 email templates available</p>
          </div>

          <div className="bg-gray-700/30 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-300 font-medium">Delivery</span>
            </div>
            <p className="text-sm text-gray-400">Monitoring via Postmark</p>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
        <h3 className="text-lg font-bold text-blue-400 mb-4">🚀 Postmark Setup Instructions</h3>
        <div className="space-y-3 text-sm text-blue-300">
          <div>
            <strong>1. Create a Postmark Account:</strong>
            <p className="ml-4 text-blue-200">Sign up at <a href="https://postmarkapp.com" target="_blank" rel="noopener noreferrer" className="underline">postmarkapp.com</a></p>
          </div>
          <div>
            <strong>2. Add Your Domain:</strong>
            <p className="ml-4 text-blue-200">Verify your sending domain in Postmark settings</p>
          </div>
          <div>
            <strong>3. Get Your API Key:</strong>
            <p className="ml-4 text-blue-200">Copy your Server API Token from the Postmark dashboard</p>
          </div>
          <div>
            <strong>4. Configure Settings:</strong>
            <p className="ml-4 text-blue-200">Enter your API key and sender details above</p>
          </div>
          <div>
            <strong>5. Test Integration:</strong>
            <p className="ml-4 text-blue-200">Use the test buttons to verify everything works</p>
          </div>
        </div>
      </div>
    </div>
  );
} 