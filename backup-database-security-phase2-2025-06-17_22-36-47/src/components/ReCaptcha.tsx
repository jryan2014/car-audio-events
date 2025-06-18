import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

interface ReCaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  action?: string; // reCAPTCHA v3 action (LOGIN, REGISTER, etc.)
}

export interface ReCaptchaRef {
  execute: () => Promise<void>;
  reset: () => void;
}

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const ReCaptcha = forwardRef<ReCaptchaRef, ReCaptchaProps>(({
  onVerify,
  onError,
  onExpire,
  action = 'submit'
}, ref) => {
  const scriptLoaded = useRef(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use your site key directly - no database lookups
  const siteKey = '6LcJoTMqAAAAAMNPd_PUJNN-OeiVpxo8sRbe13_v';

  useImperativeHandle(ref, () => ({
    execute: async () => {
      if (isExecuting) return;
      
      setIsExecuting(true);
      setError(null);
      
      try {
        if (!window.grecaptcha) {
          await loadReCaptchaScript();
        }
        
        if (window.grecaptcha) {
          const token = await window.grecaptcha.execute(siteKey, { action });
          console.log('reCAPTCHA token received:', token.substring(0, 50) + '...');
          onVerify(token);
        } else {
          throw new Error('reCAPTCHA not available');
        }
      } catch (error) {
        console.error('reCAPTCHA execution failed:', error);
        setError('Security verification failed');
        if (onError) onError();
      } finally {
        setIsExecuting(false);
      }
    },
    reset: () => {
      setIsExecuting(false);
      setError(null);
    }
  }));

  const loadReCaptchaScript = () => {
    if (scriptLoaded.current) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      if (window.grecaptcha) {
        scriptLoaded.current = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        scriptLoaded.current = true;
        if (window.grecaptcha) {
          window.grecaptcha.ready(() => {
            console.log('reCAPTCHA ready and script loaded');
            resolve();
          });
        } else {
          reject(new Error('reCAPTCHA not loaded properly'));
        }
      };

      script.onerror = () => {
        reject(new Error('Failed to load reCAPTCHA script'));
      };

      document.head.appendChild(script);
    });
  };

  // Auto-execute on mount
  useEffect(() => {
    const autoExecute = async () => {
      try {
        await loadReCaptchaScript();
        // Auto-execute for better UX
        if (ref && 'current' in ref && ref.current) {
          setTimeout(() => {
            ref.current?.execute();
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to initialize reCAPTCHA:', error);
        console.log('Providing fallback token to allow form submission');
        // Provide fallback token so form can still work
        onVerify('fallback_token_' + Date.now());
        setError('Security verification unavailable (using fallback)');
      }
    };
    
    autoExecute();
  }, []);

  if (error) {
    return (
      <div className="recaptcha-container">
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recaptcha-container">
      <div className="bg-green-900/20 border border-green-600 rounded-lg p-3 text-center">
        <div className="flex items-center justify-center space-x-2">
          <Shield className="h-4 w-4 text-green-500" />
          <p className="text-green-300 text-sm">
            {isExecuting ? 'Verifying security...' : 'Protected by reCAPTCHA v3'}
          </p>
        </div>
        <p className="text-gray-400 text-xs mt-1">
          This site is protected by reCAPTCHA and the Google{' '}
          <a href="https://policies.google.com/privacy" className="text-electric-400 hover:underline">
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="https://policies.google.com/terms" className="text-electric-400 hover:underline">
            Terms of Service
          </a>{' '}
          apply.
        </p>
      </div>
    </div>
  );
});

ReCaptcha.displayName = 'ReCaptcha';

export default ReCaptcha; 