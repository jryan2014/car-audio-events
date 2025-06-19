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
    if (!captchaRef.current) return;

    const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;
    if (!siteKey) {
      console.warn('hCaptcha site key not found. Please add VITE_HCAPTCHA_SITE_KEY to your environment variables.');
      return;
    }

    await loadHCaptchaScript();

    if (window.hcaptcha && captchaRef.current) {
      try {
        widgetID.current = window.hcaptcha.render(captchaRef.current, {
          sitekey: siteKey,
          size,
          theme,
          callback: onVerify,
          'error-callback': onError,
          'expired-callback': onExpire
        });
      } catch (error) {
        console.error('Error rendering hCaptcha:', error);
      }
    }
  };

  useEffect(() => {
    renderCaptcha();

    return () => {
      if (widgetID.current && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetID.current);
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
          marginBottom: '1rem'
        }}
      />
    </div>
  );
});

HCaptcha.displayName = 'HCaptcha';

export default HCaptcha; 