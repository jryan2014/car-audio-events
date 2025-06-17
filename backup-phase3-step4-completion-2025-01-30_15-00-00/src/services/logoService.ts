import React from 'react';
import { supabase } from '../lib/supabase';

export interface LogoConfig {
  url: string;
  altText: string;
  width: number;
  height: number;
}

export interface LogoSettings {
  main: LogoConfig;
  email: LogoConfig;
  document: LogoConfig;
  signature: LogoConfig;
  uploadEnabled: boolean;
  maxFileSize: number;
  allowedFormats: string[];
}

class LogoService {
  private static instance: LogoService;
  private logoSettings: LogoSettings | null = null;
  private lastFetch: number = 0;
  private cacheDuration: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): LogoService {
    if (!LogoService.instance) {
      LogoService.instance = new LogoService();
    }
    return LogoService.instance;
  }

  /**
   * Get all logo settings with caching
   */
  public async getLogoSettings(forceRefresh: boolean = false): Promise<LogoSettings> {
    const now = Date.now();
    
    // Return cached data if available and not expired
    if (!forceRefresh && this.logoSettings && (now - this.lastFetch) < this.cacheDuration) {
      return this.logoSettings;
    }

    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .like('setting_key', '%logo%');

      if (error) throw error;

      // Convert to settings object
      const settings: Record<string, string> = {};
      data?.forEach(item => {
        settings[item.setting_key] = item.setting_value || '';
      });

      // Build logo settings with defaults
      this.logoSettings = {
        main: {
          url: settings.main_logo_url || '',
          altText: settings.main_logo_alt_text || 'Car Audio Events',
          width: parseInt(settings.main_logo_width || '200'),
          height: parseInt(settings.main_logo_height || '60')
        },
        email: {
          url: settings.email_logo_url || '',
          altText: settings.email_logo_alt_text || 'Car Audio Events',
          width: parseInt(settings.email_logo_width || '150'),
          height: parseInt(settings.email_logo_height || '45')
        },
        document: {
          url: settings.document_logo_url || '',
          altText: settings.document_logo_alt_text || 'Car Audio Events',
          width: parseInt(settings.document_logo_width || '120'),
          height: parseInt(settings.document_logo_height || '36')
        },
        signature: {
          url: settings.signature_logo_url || '',
          altText: settings.signature_logo_alt_text || 'Car Audio Events',
          width: parseInt(settings.signature_logo_width || '100'),
          height: parseInt(settings.signature_logo_height || '30')
        },
        uploadEnabled: settings.logo_upload_enabled === 'true',
        maxFileSize: parseInt(settings.logo_max_file_size || '5242880'),
        allowedFormats: (settings.logo_allowed_formats || 'png,jpg,jpeg,webp,svg').split(',')
      };

      this.lastFetch = now;
      return this.logoSettings;

    } catch (error) {
      console.error('Failed to load logo settings:', error);
      
      // Return default settings on error
      return this.getDefaultSettings();
    }
  }

  /**
   * Get main website logo configuration
   */
  public async getMainLogo(): Promise<LogoConfig> {
    const settings = await this.getLogoSettings();
    return settings.main;
  }

  /**
   * Get email template logo configuration
   */
  public async getEmailLogo(): Promise<LogoConfig> {
    const settings = await this.getLogoSettings();
    return settings.email;
  }

  /**
   * Get document logo configuration
   */
  public async getDocumentLogo(): Promise<LogoConfig> {
    const settings = await this.getLogoSettings();
    return settings.document;
  }

  /**
   * Get signature logo configuration
   */
  public async getSignatureLogo(): Promise<LogoConfig> {
    const settings = await this.getLogoSettings();
    return settings.signature;
  }

  /**
   * Generate logo HTML for use in templates
   */
  public generateLogoHtml(logoConfig: LogoConfig, className?: string): string {
    if (!logoConfig.url) {
      return `<span class="${className || ''}">${logoConfig.altText}</span>`;
    }

    return `<img 
      src="${logoConfig.url}" 
      alt="${logoConfig.altText}" 
      width="${logoConfig.width}" 
      height="${logoConfig.height}"
      class="${className || ''}"
      style="max-width: ${logoConfig.width}px; height: auto;"
    />`;
  }

  /**
   * Generate logo HTML for email templates
   */
  public async getEmailLogoHtml(className?: string): Promise<string> {
    const emailLogo = await this.getEmailLogo();
    return this.generateLogoHtml(emailLogo, className);
  }

  /**
   * Generate logo HTML for documents
   */
  public async getDocumentLogoHtml(className?: string): Promise<string> {
    const documentLogo = await this.getDocumentLogo();
    return this.generateLogoHtml(documentLogo, className);
  }

  /**
   * Generate logo HTML for signatures
   */
  public async getSignatureLogoHtml(className?: string): Promise<string> {
    const signatureLogo = await this.getSignatureLogo();
    return this.generateLogoHtml(signatureLogo, className);
  }

  /**
   * Check if logo uploads are enabled
   */
  public async isUploadEnabled(): Promise<boolean> {
    const settings = await this.getLogoSettings();
    return settings.uploadEnabled;
  }

  /**
   * Get upload constraints
   */
  public async getUploadConstraints(): Promise<{ maxFileSize: number; allowedFormats: string[] }> {
    const settings = await this.getLogoSettings();
    return {
      maxFileSize: settings.maxFileSize,
      allowedFormats: settings.allowedFormats
    };
  }

  /**
   * Validate file for upload
   */
  public async validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
    const constraints = await this.getUploadConstraints();
    
    // Check file size
    if (file.size > constraints.maxFileSize) {
      const maxSizeMB = Math.round(constraints.maxFileSize / 1024 / 1024);
      return {
        valid: false,
        error: `File size exceeds ${maxSizeMB}MB limit`
      };
    }

    // Check file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !constraints.allowedFormats.includes(fileExtension)) {
      return {
        valid: false,
        error: `File type not allowed. Supported formats: ${constraints.allowedFormats.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Clear cache to force refresh
   */
  public clearCache(): void {
    this.logoSettings = null;
    this.lastFetch = 0;
  }

  /**
   * Get default logo settings
   */
  private getDefaultSettings(): LogoSettings {
    return {
      main: {
        url: '',
        altText: 'Car Audio Events',
        width: 200,
        height: 60
      },
      email: {
        url: '',
        altText: 'Car Audio Events',
        width: 150,
        height: 45
      },
      document: {
        url: '',
        altText: 'Car Audio Events',
        width: 120,
        height: 36
      },
      signature: {
        url: '',
        altText: 'Car Audio Events',
        width: 100,
        height: 30
      },
      uploadEnabled: true,
      maxFileSize: 5242880, // 5MB
      allowedFormats: ['png', 'jpg', 'jpeg', 'webp', 'svg']
    };
  }
}

// Export singleton instance
export const logoService = LogoService.getInstance();

// Export React hook for easy use in components
export function useLogoSettings() {
  const [logoSettings, setLogoSettings] = React.useState<LogoSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const settings = await logoService.getLogoSettings();
        setLogoSettings(settings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load logo settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const refreshSettings = async () => {
    try {
      setError(null);
      const settings = await logoService.getLogoSettings(true);
      setLogoSettings(settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh logo settings');
    }
  };

  return {
    logoSettings,
    isLoading,
    error,
    refreshSettings
  };
}

 