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

    return new Promise<void>((resolve) => {
      if (window.hcaptcha) {
        scriptLoaded.current = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        scriptLoaded.current = true;
        resolve();
      };

      document.head.appendChild(script);
    });
  };

  const renderCaptcha = async () => {
    console.log('HCaptcha renderCaptcha called');
    
    if (!captchaRef.current) {
      console.log('HCaptcha: No captcha ref');
      return;
    }
    
    // Check if captcha is already rendered
    if (widgetID.current !== null) {
      console.log('HCaptcha: Already rendered, widget ID:', widgetID.current);
      return;
    }
    
    // Check if container already has a captcha
    if (captchaRef.current.querySelector('.h-captcha')) {
      console.log('HCaptcha: Container already has h-captcha element');
      return;
    }

    const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || 'acc27e90-e7ae-451e-bbfa-c738c53420fe';
    console.log('HCaptcha site key:', siteKey);
    
    if (!siteKey) {
      console.warn('hCaptcha site key not found. Please add VITE_HCAPTCHA_SITE_KEY to your environment variables.');
      return;
    }

    console.log('HCaptcha: Loading script...');
    await loadHCaptchaScript();
    console.log('HCaptcha: Script loaded, window.hcaptcha:', !!window.hcaptcha);

    if (window.hcaptcha && captchaRef.current && widgetID.current === null) {
      try {
        console.log('HCaptcha: Attempting to render with options:', {
          sitekey: siteKey,
          size,
          theme
        });
        
        widgetID.current = window.hcaptcha.render(captchaRef.current, {
          sitekey: siteKey,
          size,
          theme,
          callback: onVerify,
          'error-callback': onError || (() => console.error('HCaptcha error')),
          'expired-callback': onExpire
        });
        
        console.log('HCaptcha: Successfully rendered, widget ID:', widgetID.current);
      } catch (error) {
        console.error('Error rendering hCaptcha:', error);
      }
    } else {
      console.log('HCaptcha: Cannot render - missing requirements', {
        'window.hcaptcha': !!window.hcaptcha,
        'captchaRef.current': !!captchaRef.current,
        'widgetID.current': widgetID.current
      });
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
    <div className="hcaptcha-container">
      <div 
        ref={captchaRef} 
        className="hcaptcha-widget"
        style={{ 
          display: 'flex', 
          justifyContent: 'center',
          marginTop: '1rem',
          marginBottom: '1rem',
          minHeight: '78px', // Reserve space for normal size captcha
          minWidth: '303px', // Reserve space for normal size captcha
          backgroundColor: '#1a1a1a', // Dark background to see if container is visible
          border: '1px solid #333' // Border to see container bounds
        }}
      >
        {/* Temporary loading indicator */}
        {widgetID.current === null && (
          <div style={{ color: '#666', padding: '20px', textAlign: 'center' }}>
            Loading HCaptcha...
          </div>
        )}
      </div>
    </div>
  );
});

HCaptcha.displayName = 'HCaptcha';

export default HCaptcha; 