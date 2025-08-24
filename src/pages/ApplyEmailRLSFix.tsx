import { useEffect, useState } from 'react';
import { fixEmailRLSPerformance } from '../utils/fixEmailRLSPerformance';

export default function ApplyEmailRLSFix() {
  const [status, setStatus] = useState('Applying email RLS performance fixes...');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const applyFix = async () => {
      try {
        const res = await fixEmailRLSPerformance();
        setResult(res);
        if (res.success) {
          setStatus('✅ Email RLS performance fixes applied successfully!');
        } else {
          setStatus(`❌ Error: ${res.error}`);
        }
      } catch (error: any) {
        setStatus(`❌ Error: ${error.message}`);
        setResult({ success: false, error: error.message });
      }
    };

    applyFix();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Email RLS Performance Fix</h1>
        <p className="text-gray-700 mb-4">{status}</p>
        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
        <div className="mt-6">
          <a 
            href="/admin/dashboard" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Return to Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}