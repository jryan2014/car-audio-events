import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface HCaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  size?: 'normal' | 'compact' | 'invisible';
  theme?: 'light' | 'dark';
}

export interface HCaptchaRef {
  execute: () => void;
  reset: () => void;
}

declare global {
  interface Window {
    hcaptcha: {
      render: (container: string | HTMLElement, options: any) => string;
      execute: (widgetID: string) => void;
      reset: (widgetID: string) => void;
      remove: (widgetID: string) => void;
    };
  }
}

const HCaptcha = forwardRef<HCaptchaRef, HCaptchaProps>(({
  onVerify,
  onError,
  onExpire,
  size = 'normal',
  theme = 'dark'
}, ref) => {
  const captchaRef = useRef<HTMLDivElement>(null);
  const widgetID = useRef<string | null>(null);
  const scriptLoaded = useRef(false);
  const [isLoading, setIsLoading] = React.useState(true);

  useImperativeHandle(ref, () => ({
    execute: () => {
      if (widgetID.current && window.hcaptcha) {
        window.hcaptcha.execute(widgetID.current);
      }
    },
    reset: () => {
      if (widgetID.current && window.hcaptcha) {
        window.hcaptcha.reset(widgetID.current);
      }
    }
  }));

  const loadHCaptchaScript = () => {
    if (scriptLoaded.current) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      if (window.hcaptcha) {
        scriptLoaded.current = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      
      // Add timeout for slow connections
      const timeout = setTimeout(() => {
        reject(new Error('HCaptcha script loading timeout'));
      }, 15000); // 15 second timeout
      
      script.onload = () => {
        clearTimeout(timeout);
        scriptLoaded.current = true;
        resolve();
      };
      
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load HCaptcha script'));
      };

      document.head.appendChild(script);
    });
  };

  const renderCaptcha = async () => {
    if (!captchaRef.current) return;
    
    // Check if captcha is already rendered
    if (widgetID.current !== null) return;
    
    // Check if container already has a captcha
    if (captchaRef.current.querySelector('.h-captcha')) return;

    const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || 'acc27e90-e7ae-451e-bbfa-c738c53420fe';
    if (!siteKey) {
      console.warn('hCaptcha site key not found. Please add VITE_HCAPTCHA_SITE_KEY to your environment variables.');
      return;
    }

    try {
      await loadHCaptchaScript();

      if (window.hcaptcha && captchaRef.current && widgetID.current === null) {
        // Check if we're on mobile and adjust size
        const isMobile = window.innerWidth <= 768;
        const captchaSize = isMobile ? 'compact' : size;
        
        widgetID.current = window.hcaptcha.render(captchaRef.current, {
          sitekey: siteKey,
          size: captchaSize,
          theme,
          callback: onVerify,
          'error-callback': onError || (() => console.error('HCaptcha error')),
          'expired-callback': onExpire,
          'chalexpired-callback': onExpire,
          'open-callback': () => console.log('HCaptcha opened'),
          'close-callback': () => console.log('HCaptcha closed')
        });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading or rendering hCaptcha:', error);
      setIsLoading(false);
      if (onError) onError();
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initCaptcha = async () => {
      if (mounted) {
        await renderCaptcha();
      }
    };
    
    initCaptcha();

    return () => {
      mounted = false;
      if (widgetID.current && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetID.current);
          widgetID.current = null;
        } catch (error) {
          console.error('Error removing hCaptcha widget:', error);
        }
      }
    };
  }, []);

  return (
    <div className="hcaptcha-container relative">
      <div 
        ref={captchaRef} 
        className="hcaptcha-widget"
        style={{ 
          display: 'flex', 
          justifyContent: 'center',
          marginTop: '1rem',
          marginBottom: '1rem',
          minHeight: size === 'normal' ? '78px' : '59px', // Reserve space for captcha
          minWidth: size === 'normal' ? '303px' : '164px'
        }}
      />
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
            <p className="text-gray-400 text-sm">Loading security check...</p>
          </div>
        </div>
      )}
    </div>
  );
});

HCaptcha.displayName = 'HCaptcha';

export default HCaptcha; 