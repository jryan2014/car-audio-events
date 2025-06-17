import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings, ArrowRight, CheckCircle, Zap, Database, Cog } from 'lucide-react';
import ConfigurableField from '../components/ConfigurableField';

interface DemoFormData {
  category: string;
  organizations: string[];
  seasonYear: string;
  rulesRegulations: string;
}

export default function SystemConfigurationDemo() {
  const [demoData, setDemoData] = useState<DemoFormData>({
    category: '',
    organizations: [],
    seasonYear: '',
    rulesRegulations: ''
  });

  // Mock hardcoded options (what we had before)
  const hardcodedCategories = [
    'Bass Competition',
    'Championship', 
    'Competition',
    'Exhibition',
    'Installation',
    'SPL Competition',
    'Trade Show',
    'Training',
    'Workshop'
  ];

  const hardcodedOrganizations = [
    'IASCA',
    'MECA', 
    'dB Drag Racing',
    'USACi',
    'BASS',
    'SQC',
    'Independent',
    'Local Club'
  ];

  const hardcodedSeasons = [
    '2024 Season',
    '2025 Season',
    '2026 Season',
    '2027 Season',
    '2028 Season'
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-electric-500 rounded-lg flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">System Configuration Demo</h1>
              <p className="text-gray-400">Compare hardcoded fields with configurable dynamic fields</p>
            </div>
          </div>
        </div>

        {/* Benefits Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-electric-500/20 to-electric-600/20 border border-electric-500/30 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <Database className="h-8 w-8 text-electric-400" />
              <h3 className="text-white font-semibold">Dynamic Options</h3>
            </div>
            <p className="text-gray-300 text-sm">
              Manage dropdown options through admin interface without code changes
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <Zap className="h-8 w-8 text-green-400" />
              <h3 className="text-white font-semibold">Auto-Save & Reuse</h3>
            </div>
            <p className="text-gray-300 text-sm">
              Automatically save and suggest previously entered values
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-3">
              <Cog className="h-8 w-8 text-purple-400" />
              <h3 className="text-white font-semibold">Smart Templates</h3>
            </div>
            <p className="text-gray-300 text-sm">
              Rules templates with organization-specific defaults
            </p>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Before: Hardcoded Fields */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">OLD</span>
              </div>
              <h2 className="text-xl font-bold text-white">Hardcoded Fields</h2>
            </div>

            <div className="space-y-6">
              {/* Hardcoded Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Category *
                </label>
                <select
                  value={demoData.category}
                  onChange={(e) => setDemoData({...demoData, category: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                >
                  <option value="">Select a category</option>
                  {hardcodedCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Fixed options in code</p>
              </div>

              {/* Hardcoded Organizations */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sanctioning Organization
                </label>
                <select
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value && !demoData.organizations.includes(value)) {
                      setDemoData({
                        ...demoData, 
                        organizations: [...demoData.organizations, value]
                      });
                    }
                  }}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                >
                  <option value="">Select an organization</option>
                  {hardcodedOrganizations.map(org => (
                    <option key={org} value={org}>{org}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">No multi-select, no search</p>
              </div>

              {/* Hardcoded Season */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Competition Season *
                </label>
                <select
                  value={demoData.seasonYear}
                  onChange={(e) => setDemoData({...demoData, seasonYear: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                >
                  <option value="">Select season year</option>
                  {hardcodedSeasons.map(season => (
                    <option key={season} value={season}>{season}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Years must be manually updated</p>
              </div>

              {/* Hardcoded Rules */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rules & Regulations
                </label>
                <textarea
                  value={demoData.rulesRegulations}
                  onChange={(e) => setDemoData({...demoData, rulesRegulations: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-red-500 resize-vertical"
                  placeholder="Enter rules manually each time..."
                />
                <p className="text-xs text-gray-500 mt-1">No templates, manual entry every time</p>
              </div>
            </div>

            {/* Problems List */}
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <h4 className="text-red-400 font-medium mb-2">Problems:</h4>
              <ul className="text-red-300 text-sm space-y-1">
                <li>• Options hardcoded in components</li>
                <li>• Requires developer to add new options</li>
                <li>• No reusability or templates</li>
                <li>• Manual updates across multiple forms</li>
                <li>• No auto-save functionality</li>
              </ul>
            </div>
          </div>

          {/* After: Configurable Fields */}
          <div className="bg-gray-800/50 border border-electric-500/30 rounded-xl p-6">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-electric-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Configurable Fields</h2>
            </div>

            <div className="space-y-6">
              {/* Configurable Category */}
              <ConfigurableField
                formName="demo"
                fieldName="category"
                value={demoData.category}
                onChange={(value) => setDemoData({...demoData, category: value})}
              />

              {/* Configurable Organizations */}
              <ConfigurableField
                formName="demo"
                fieldName="organization"
                value={demoData.organizations}
                onChange={(value) => setDemoData({...demoData, organizations: value})}
              />

              {/* Configurable Season */}
              <ConfigurableField
                formName="demo"
                fieldName="season_year"
                value={demoData.seasonYear}
                onChange={(value) => setDemoData({...demoData, seasonYear: value})}
              />

              {/* Configurable Rules */}
              <ConfigurableField
                formName="demo"
                fieldName="rules_regulations"
                value={demoData.rulesRegulations}
                onChange={(value) => setDemoData({...demoData, rulesRegulations: value})}
              />
            </div>

            {/* Benefits List */}
            <div className="mt-6 p-4 bg-electric-500/10 border border-electric-500/20 rounded-lg">
              <h4 className="text-electric-400 font-medium mb-2">Benefits:</h4>
              <ul className="text-electric-300 text-sm space-y-1">
                <li>• Admin-configurable options</li>
                <li>• Search & multi-select support</li>
                <li>• Auto-save & smart suggestions</li>
                <li>• Rules templates by organization</li>
                <li>• Consistent across all forms</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Current Values Display */}
        <div className="mt-8 bg-gray-900/50 border border-gray-600 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4">Current Form Values:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-gray-400 text-sm mb-2">Category:</h4>
              <p className="text-white">{demoData.category || 'None selected'}</p>
            </div>
            <div>
              <h4 className="text-gray-400 text-sm mb-2">Organizations:</h4>
              <p className="text-white">{demoData.organizations.length > 0 ? demoData.organizations.join(', ') : 'None selected'}</p>
            </div>
            <div>
              <h4 className="text-gray-400 text-sm mb-2">Season Year:</h4>
              <p className="text-white">{demoData.seasonYear || 'None selected'}</p>
            </div>
            <div>
              <h4 className="text-gray-400 text-sm mb-2">Rules:</h4>
              <p className="text-white text-sm">{demoData.rulesRegulations || 'No rules entered'}</p>
            </div>
          </div>
        </div>

        {/* Implementation Guide */}
        <div className="mt-8 bg-gradient-to-r from-electric-500/10 to-purple-500/10 border border-electric-500/20 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
            <ArrowRight className="h-5 w-5 text-electric-400" />
            <span>Ready to Implement?</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-electric-400 font-medium mb-2">1. Setup Configuration</h4>
              <p className="text-gray-300 text-sm">Go to Admin → System Configuration to set up your options</p>
            </div>
            <div>
              <h4 className="text-electric-400 font-medium mb-2">2. Replace Fields</h4>
              <p className="text-gray-300 text-sm">Replace hardcoded dropdowns with ConfigurableField components</p>
            </div>
            <div>
              <h4 className="text-electric-400 font-medium mb-2">3. Enjoy Benefits</h4>
              <p className="text-gray-300 text-sm">Let admins manage options without touching code</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/admin/system-configuration"
              className="inline-flex items-center px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Open System Configuration
            </Link>
            <a
              href="/SYSTEM_CONFIGURATION_GUIDE.md"
              target="_blank"
              className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              <Database className="h-4 w-4 mr-2" />
              View Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 