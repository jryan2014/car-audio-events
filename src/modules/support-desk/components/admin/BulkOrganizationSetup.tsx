import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface ImportResult {
  organization: string;
  status: 'success' | 'error';
  message: string;
}

const BulkOrganizationSetup: React.FC = () => {
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [error, setError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      setError('Please upload a CSV file or paste CSV data');
      return;
    }

    setImporting(true);
    setError('');
    setImportResults([]);

    try {
      // Parse CSV
      const lines = csvContent.trim().split('\n');
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['organization_name'];
      const hasRequiredHeaders = requiredHeaders.every(h => 
        headers.some(header => header.includes(h.replace('_', ' ')) || header.includes(h))
      );

      if (!hasRequiredHeaders) {
        setError('CSV must include at least: organization_name');
        return;
      }

      const results: ImportResult[] = [];

      // Process each organization
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const orgName = values[headers.findIndex(h => h.includes('organization') && h.includes('name'))];

        if (!orgName) {
          results.push({
            organization: `Row ${i + 1}`,
            status: 'error',
            message: 'Missing organization name'
          });
          continue;
        }

        try {
          // Check if organization exists
          const { data: existingOrg, error: searchError } = await supabase
            .from('organizations')
            .select('id, name')
            .ilike('name', orgName)
            .single();

          if (searchError && searchError.code !== 'PGRST116') {
            throw searchError;
          }

          if (!existingOrg) {
            results.push({
              organization: orgName,
              status: 'error',
              message: 'Organization not found in system'
            });
            continue;
          }

          // Check if support is already enabled
          const { data: existingSettings } = await supabase
            .from('support_organization_settings')
            .select('id')
            .eq('organization_id', existingOrg.id)
            .single();

          if (existingSettings) {
            results.push({
              organization: orgName,
              status: 'error',
              message: 'Support already enabled'
            });
            continue;
          }

          // Enable support for the organization
          const { error: insertError } = await supabase
            .from('support_organization_settings')
            .insert({
              organization_id: existingOrg.id,
              is_provisioned: true,
              provisioned_at: new Date().toISOString(),
              support_team_user_ids: [],
              auto_assign_enabled: false,
              email_notifications_enabled: true
            });

          if (insertError) {
            throw insertError;
          }

          results.push({
            organization: orgName,
            status: 'success',
            message: 'Support enabled successfully'
          });

        } catch (error: any) {
          results.push({
            organization: orgName,
            status: 'error',
            message: error.message || 'Failed to enable support'
          });
        }
      }

      setImportResults(results);
    } catch (error: any) {
      console.error('Import error:', error);
      setError('Failed to process CSV file');
    } finally {
      setImporting(false);
    }
  };

  const successCount = importResults.filter(r => r.status === 'success').length;
  const errorCount = importResults.filter(r => r.status === 'error').length;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <Link
              to="/admin/support/settings"
              className="inline-flex items-center text-gray-400 hover:text-white mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Settings
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Bulk Organization Setup
          </h1>
          <p className="mt-2 text-sm text-gray-300">
            Enable support for multiple organizations at once using CSV import
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-700 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-400 mb-2">CSV Format Instructions</h3>
          <p className="text-blue-300 text-sm mb-2">
            Your CSV file should contain at least the following column:
          </p>
          <ul className="list-disc list-inside text-blue-300 text-sm space-y-1">
            <li><strong>organization_name</strong> - The exact name of the organization in the system</li>
          </ul>
          <div className="mt-3 p-3 bg-blue-800/30 rounded text-xs font-mono text-blue-200">
            organization_name<br />
            Acme Corporation<br />
            Widget Industries<br />
            Tech Solutions Inc
          </div>
        </div>

        {/* Import Form */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upload CSV File
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-electric-500 file:text-white hover:file:bg-electric-600"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800/50 text-gray-400">OR</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Paste CSV Data
              </label>
              <textarea
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                rows={8}
                className="block w-full rounded-md bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-electric-500 focus:ring-electric-500 font-mono text-sm"
                placeholder="organization_name&#10;Acme Corporation&#10;Widget Industries"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleImport}
                disabled={importing || !csvContent.trim()}
                className="inline-flex items-center px-4 py-2 bg-electric-500 text-white rounded-md hover:bg-electric-600 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Organizations
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Import Results */}
        {importResults.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Import Results
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-400 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-green-400">{successCount}</div>
                    <div className="text-sm text-green-300">Successfully Enabled</div>
                  </div>
                </div>
              </div>

              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <div className="flex items-center">
                  <XCircle className="h-8 w-8 text-red-400 mr-3" />
                  <div>
                    <div className="text-2xl font-bold text-red-400">{errorCount}</div>
                    <div className="text-sm text-red-300">Failed</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-600">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-200 uppercase">
                      Organization
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-200 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-200 uppercase">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {importResults.map((result, index) => (
                    <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-800/50'}`}>
                      <td className="px-4 py-2 text-sm font-medium text-white">
                        {result.organization}
                      </td>
                      <td className="px-4 py-2">
                        {result.status === 'success' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-400">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/50 text-red-400">
                            <XCircle className="h-3 w-3 mr-1" />
                            Error
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-300">
                        {result.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => navigate('/admin/support/organizations')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                View All Organizations
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkOrganizationSetup;