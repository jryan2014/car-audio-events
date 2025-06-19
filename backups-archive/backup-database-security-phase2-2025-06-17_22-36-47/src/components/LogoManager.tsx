import React, { useState, useEffect, useRef } from 'react';
import { Upload, Image, Trash2, Eye, Settings, AlertCircle, CheckCircle, Download, RefreshCw, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface LogoSettings {
  main_logo_url: string;
  main_logo_alt_text: string;
  main_logo_width: string;
  main_logo_height: string;
  email_logo_url: string;
  email_logo_alt_text: string;
  email_logo_width: string;
  email_logo_height: string;
  document_logo_url: string;
  document_logo_alt_text: string;
  document_logo_width: string;
  document_logo_height: string;
  signature_logo_url: string;
  signature_logo_alt_text: string;
  signature_logo_width: string;
  signature_logo_height: string;
  logo_upload_enabled: string;
  logo_max_file_size: string;
  logo_allowed_formats: string;
}

interface LogoType {
  id: string;
  name: string;
  description: string;
  bucket: string;
  maxSize: number;
  maxSizeMB: string;
  icon: React.ComponentType<any>;
  urlKey: keyof LogoSettings;
  altKey: keyof LogoSettings;
  widthKey: keyof LogoSettings;
  heightKey: keyof LogoSettings;
  usageAreas: string[];
}

const logoTypes: LogoType[] = [
  {
    id: 'main',
    name: 'Main Website Logo',
    description: 'Primary logo displayed in header, navigation, and main branding areas',
    bucket: 'website-logos',
    maxSize: 5242880, // 5MB
    maxSizeMB: '5MB',
    icon: Palette,
    urlKey: 'main_logo_url',
    altKey: 'main_logo_alt_text',
    widthKey: 'main_logo_width',
    heightKey: 'main_logo_height',
    usageAreas: ['Header Navigation', 'Homepage Hero', 'Footer', 'Login/Register Pages']
  },
  {
    id: 'email',
    name: 'Email Template Logo',
    description: 'Logo used in all email communications and templates',
    bucket: 'email-logos',
    maxSize: 2097152, // 2MB
    maxSizeMB: '2MB',
    icon: Image,
    urlKey: 'email_logo_url',
    altKey: 'email_logo_alt_text',
    widthKey: 'email_logo_width',
    heightKey: 'email_logo_height',
    usageAreas: ['Welcome Emails', 'Event Notifications', 'Password Resets', 'Newsletters']
  },
  {
    id: 'document',
    name: 'Document Logo',
    description: 'Logo for invoices, payments, billing documents, and official paperwork',
    bucket: 'document-logos',
    maxSize: 2097152, // 2MB
    maxSizeMB: '2MB',
    icon: Settings,
    urlKey: 'document_logo_url',
    altKey: 'document_logo_alt_text',
    widthKey: 'document_logo_width',
    heightKey: 'document_logo_height',
    usageAreas: ['Invoices', 'Payment Receipts', 'Billing Statements', 'Official Documents']
  },
  {
    id: 'signature',
    name: 'Signature Logo',
    description: 'Small logo for email signatures and footer branding',
    bucket: 'signature-logos',
    maxSize: 1048576, // 1MB
    maxSizeMB: '1MB',
    icon: Eye,
    urlKey: 'signature_logo_url',
    altKey: 'signature_logo_alt_text',
    widthKey: 'signature_logo_width',
    heightKey: 'signature_logo_height',
    usageAreas: ['Email Signatures', 'Footer Branding', 'Small Watermarks', 'Contact Cards']
  }
];

export default function LogoManager() {
  const { user } = useAuth();
  const [logoSettings, setLogoSettings] = useState<LogoSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    loadLogoSettings();
  }, []);

  const loadLogoSettings = async () => {
    try {
      setIsLoading(true);
      
      // Load logo settings directly from admin_settings table
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .like('setting_key', '%logo%');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Convert array to object format
        const settings: Partial<LogoSettings> = {};
        data.forEach(item => {
          settings[item.setting_key as keyof LogoSettings] = item.setting_value || '';
        });
        
        // Set defaults for missing values
        const logoSettingsWithDefaults: LogoSettings = {
          main_logo_url: settings.main_logo_url || '',
          main_logo_alt_text: settings.main_logo_alt_text || 'Car Audio Events',
          main_logo_width: settings.main_logo_width || '200',
          main_logo_height: settings.main_logo_height || '60',
          email_logo_url: settings.email_logo_url || '',
          email_logo_alt_text: settings.email_logo_alt_text || 'Car Audio Events',
          email_logo_width: settings.email_logo_width || '150',
          email_logo_height: settings.email_logo_height || '45',
          document_logo_url: settings.document_logo_url || '',
          document_logo_alt_text: settings.document_logo_alt_text || 'Car Audio Events',
          document_logo_width: settings.document_logo_width || '120',
          document_logo_height: settings.document_logo_height || '36',
          signature_logo_url: settings.signature_logo_url || '',
          signature_logo_alt_text: settings.signature_logo_alt_text || 'Car Audio Events',
          signature_logo_width: settings.signature_logo_width || '100',
          signature_logo_height: settings.signature_logo_height || '30',
          logo_upload_enabled: settings.logo_upload_enabled || 'true',
          logo_max_file_size: settings.logo_max_file_size || '5242880',
          logo_allowed_formats: settings.logo_allowed_formats || 'png,jpg,jpeg,webp,svg'
        };
        
        setLogoSettings(logoSettingsWithDefaults);
        
        // Generate preview URLs for existing logos
        const previews: Record<string, string> = {};
        logoTypes.forEach(type => {
          const url = logoSettingsWithDefaults[type.urlKey];
          if (url) {
            previews[type.id] = url;
          }
        });
        setPreviewUrls(previews);
      }
    } catch (error) {
      console.error('Failed to load logo settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (logoType: LogoType, file: File) => {
    // Validate file size
    if (file.size > logoType.maxSize) {
      alert(`File size exceeds ${logoType.maxSizeMB} limit for ${logoType.name}`);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (PNG, JPG, JPEG, WebP, or SVG)');
      return;
    }

    try {
      setUploadingType(logoType.id);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrls(prev => ({ ...prev, [logoType.id]: previewUrl }));

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${logoType.id}-logo-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(logoType.bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(logoType.bucket)
        .getPublicUrl(fileName);

      // Update logo settings in database
      await updateLogoSetting(logoType.urlKey, publicUrl);
      
      // Update local state
      setLogoSettings(prev => prev ? {
        ...prev,
        [logoType.urlKey]: publicUrl
      } : null);

      // Update preview URL to the actual uploaded URL
      setPreviewUrls(prev => ({ ...prev, [logoType.id]: publicUrl }));

      console.log(`✅ ${logoType.name} uploaded successfully`);
      
    } catch (error) {
      console.error(`Failed to upload ${logoType.name}:`, error);
      alert(`Failed to upload ${logoType.name}. Please try again.`);
      
      // Remove preview on error
      setPreviewUrls(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[logoType.id];
        return newPreviews;
      });
    } finally {
      setUploadingType(null);
    }
  };

  const updateLogoSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        setting_key: key,
        setting_value: value,
        updated_by: user!.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });

    if (error) throw error;
  };

  const handleSettingChange = (key: keyof LogoSettings, value: string) => {
    setLogoSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  const handleSaveSettings = async () => {
    if (!logoSettings) return;

    try {
      setSaveStatus('saving');

      // Save all non-URL settings
      const settingsToSave = Object.entries(logoSettings).filter(([key]) => 
        !key.endsWith('_url') // URLs are saved when files are uploaded
      );

      for (const [key, value] of settingsToSave) {
        await updateLogoSetting(key, value);
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
      
    } catch (error) {
      console.error('Failed to save logo settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleRemoveLogo = async (logoType: LogoType) => {
    if (!confirm(`Are you sure you want to remove the ${logoType.name}?`)) return;

    try {
      // Remove from storage if exists
      const currentUrl = logoSettings?.[logoType.urlKey];
      if (currentUrl) {
        // Extract filename from URL
        const urlParts = currentUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        await supabase.storage
          .from(logoType.bucket)
          .remove([fileName]);
      }

      // Update database
      await updateLogoSetting(logoType.urlKey, '');
      
      // Update local state
      setLogoSettings(prev => prev ? {
        ...prev,
        [logoType.urlKey]: ''
      } : null);

      // Remove preview
      setPreviewUrls(prev => {
        const newPreviews = { ...prev };
        delete newPreviews[logoType.id];
        return newPreviews;
      });

      console.log(`✅ ${logoType.name} removed successfully`);
      
    } catch (error) {
      console.error(`Failed to remove ${logoType.name}:`, error);
      alert(`Failed to remove ${logoType.name}. Please try again.`);
    }
  };

  const triggerFileInput = (logoTypeId: string) => {
    fileInputRefs.current[logoTypeId]?.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-500"></div>
        <span className="ml-3 text-gray-400">Loading logo settings...</span>
      </div>
    );
  }

  if (!logoSettings) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-red-400 font-medium">Failed to Load Logo Settings</span>
        </div>
        <p className="text-red-300 text-sm mt-1">
          Unable to load logo configuration. Please refresh the page or contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Logo Management</h2>
          <p className="text-gray-400">
            Upload and configure logos for different areas of your platform
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={saveStatus === 'saving'}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            saveStatus === 'success'
              ? 'bg-green-600 text-white'
              : saveStatus === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-electric-500 text-white hover:bg-electric-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {saveStatus === 'saving' ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : saveStatus === 'success' ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>Saved</span>
            </>
          ) : saveStatus === 'error' ? (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>Error</span>
            </>
          ) : (
            <>
              <Settings className="h-4 w-4" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>

      {/* Logo Types Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {logoTypes.map((logoType) => {
          const IconComponent = logoType.icon;
          const currentUrl = logoSettings[logoType.urlKey];
          const previewUrl = previewUrls[logoType.id];
          const isUploading = uploadingType === logoType.id;

          return (
            <div key={logoType.id} className="bg-gray-700/30 rounded-lg p-6 border border-gray-600/50">
              {/* Logo Type Header */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-electric-500/20 rounded-lg flex items-center justify-center">
                  <IconComponent className="h-5 w-5 text-electric-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{logoType.name}</h3>
                  <p className="text-sm text-gray-400">{logoType.description}</p>
                </div>
              </div>

              {/* Current Logo Preview */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Logo
                </label>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600/30 min-h-[120px] flex items-center justify-center">
                  {previewUrl || currentUrl ? (
                    <div className="text-center">
                      <img
                        src={previewUrl || currentUrl}
                        alt={logoSettings[logoType.altKey]}
                        className="max-w-full max-h-20 object-contain mx-auto mb-2"
                        style={{
                          width: `${logoSettings[logoType.widthKey]}px`,
                          height: `${logoSettings[logoType.heightKey]}px`
                        }}
                      />
                      <p className="text-xs text-gray-400">
                        {logoSettings[logoType.widthKey]}×{logoSettings[logoType.heightKey]}px
                      </p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No logo uploaded</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Controls */}
              <div className="space-y-3 mb-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => triggerFileInput(logoType.id)}
                    disabled={isUploading}
                    className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-electric-500/20 hover:bg-electric-500/30 border border-electric-500/30 text-electric-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Upload New</span>
                      </>
                    )}
                  </button>
                  
                  {(currentUrl || previewUrl) && (
                    <button
                      onClick={() => handleRemoveLogo(logoType)}
                      disabled={isUploading}
                      className="flex items-center justify-center space-x-2 py-2 px-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <input
                  ref={el => fileInputRefs.current[logoType.id] = el}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(logoType, file);
                    }
                  }}
                  className="hidden"
                />

                <p className="text-xs text-gray-500">
                  Max size: {logoType.maxSizeMB} • Formats: PNG, JPG, WebP, SVG
                </p>
              </div>

              {/* Logo Settings */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={logoSettings[logoType.widthKey]}
                      onChange={(e) => handleSettingChange(logoType.widthKey, e.target.value)}
                      className="w-full p-2 bg-gray-800/50 border border-gray-600/50 rounded text-white text-sm focus:outline-none focus:border-electric-500"
                      min="10"
                      max="500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      value={logoSettings[logoType.heightKey]}
                      onChange={(e) => handleSettingChange(logoType.heightKey, e.target.value)}
                      className="w-full p-2 bg-gray-800/50 border border-gray-600/50 rounded text-white text-sm focus:outline-none focus:border-electric-500"
                      min="10"
                      max="200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Alt Text (Accessibility)
                  </label>
                  <input
                    type="text"
                    value={logoSettings[logoType.altKey]}
                    onChange={(e) => handleSettingChange(logoType.altKey, e.target.value)}
                    className="w-full p-2 bg-gray-800/50 border border-gray-600/50 rounded text-white text-sm focus:outline-none focus:border-electric-500"
                    placeholder="Descriptive text for screen readers"
                  />
                </div>
              </div>

              {/* Usage Areas */}
              <div className="mt-4 pt-4 border-t border-gray-600/30">
                <h4 className="text-xs font-medium text-gray-400 mb-2">Used In:</h4>
                <div className="flex flex-wrap gap-1">
                  {logoType.usageAreas.map((area, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage Guidelines */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
        <h3 className="text-blue-400 font-medium mb-3 flex items-center space-x-2">
          <Eye className="h-5 w-5" />
          <span>Logo Usage Guidelines</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-300 text-sm">
          <div>
            <h4 className="font-medium mb-2">Best Practices:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Use high-resolution images for crisp display</li>
              <li>Maintain consistent branding across all logo types</li>
              <li>Test logos on different background colors</li>
              <li>Keep file sizes optimized for web performance</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Technical Requirements:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>PNG recommended for logos with transparency</li>
              <li>SVG ideal for scalable vector graphics</li>
              <li>JPG suitable for photographic logos</li>
              <li>WebP for modern browsers with smaller file sizes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 