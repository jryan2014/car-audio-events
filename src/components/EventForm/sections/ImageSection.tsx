import React, { useState, useRef, useEffect } from 'react';
import { Upload, Link, Image as ImageIcon, Trash2, AlertCircle, Move, Save, FolderOpen, Star, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { EventFormData } from '../../../types/event';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface ImageSectionProps {
  formData: EventFormData;
  updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
  getFieldError: (field: string) => string | undefined;
  touchField: (field: string) => void;
}

interface FlyerTemplate {
  id: string;
  name: string;
  organization_id: number | null;
  user_id: string;
  image_url: string;
  image_position: number;
  image_position_x: number;
  zoom_level: number;
  crop_x: number;
  crop_y: number;
  crop_width: number | null;
  crop_height: number | null;
  is_default: boolean;
  is_global_default: boolean;
}

const ImageSection: React.FC<ImageSectionProps> = ({
  formData,
  updateField,
  getFieldError,
  touchField
}) => {
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'url'>('url');
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>(formData.image_url || '');
  const [imagePositionY, setImagePositionY] = useState<number>(
    formData.image_position !== null && formData.image_position !== undefined 
      ? formData.image_position 
      : 50
  );
  const [imagePositionX, setImagePositionX] = useState<number>(
    formData.image_position_x !== null && formData.image_position_x !== undefined 
      ? formData.image_position_x 
      : 50
  );
  
  // Zoom and crop states
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [zoom, setZoom] = useState<number>(formData.image_zoom || 1);
  const [showCropMode, setShowCropMode] = useState(false);
  const [applyCropToFill, setApplyCropToFill] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Template states
  const [templates, setTemplates] = useState<FlyerTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLoadingTemplateRef = useRef(false);
  const { user, session } = useAuth();

  // Sync state when formData changes (only on initial load or external changes)
  useEffect(() => {
    if (!isLoadingTemplateRef.current && formData.image_position !== undefined && formData.image_position !== imagePositionY) {
      setImagePositionY(formData.image_position);
    }
  }, [formData.image_position, imagePositionY]);

  useEffect(() => {
    if (!isLoadingTemplateRef.current && formData.image_position_x !== undefined && formData.image_position_x !== imagePositionX) {
      setImagePositionX(formData.image_position_x);
    }
  }, [formData.image_position_x, imagePositionX]);

  useEffect(() => {
    if (!isLoadingTemplateRef.current && formData.image_zoom !== undefined && formData.image_zoom !== zoom) {
      setZoom(formData.image_zoom);
    }
  }, [formData.image_zoom, zoom]);

  // Sync preview URL when formData changes
  useEffect(() => {
    if (formData.image_url) {
      setPreviewUrl(formData.image_url);
    }
  }, [formData.image_url]);

  // Load templates when component mounts or organization changes
  useEffect(() => {
    if (user?.id) {
      loadTemplates();
    }
  }, [formData.sanction_body_id, user?.id]);

  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      
      // Build query to get relevant templates
      let query = supabase
        .from('event_flyer_templates')
        .select('*')
        .order('created_at', { ascending: false });

      // Get user's own templates, organization templates, and global defaults
      const { data, error } = await query;

      if (error) throw error;

      // Filter templates based on relevance
      const filteredTemplates = data?.filter(template => {
        // User's own templates
        if (template.user_id === user?.id) return true;
        // Organization templates
        if (formData.sanction_body_id && template.organization_id === Number(formData.sanction_body_id)) return true;
        // Global defaults
        if (template.is_global_default) return true;
        return false;
      }) || [];

      setTemplates(filteredTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if user is authenticated
    if (!user || !session) {
      alert('Please log in to upload images');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    setIsUploading(true);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `event-fliers/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('event-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      // Update form data
      updateField('image_url', publicUrl);
      setPreviewUrl(publicUrl);
      
      // Create local preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

    } catch (error: any) {
      console.error('Error uploading image:', error);
      
      if (error?.statusCode === '403' || error?.message?.includes('row-level security')) {
        alert('Authentication error: Please try logging out and logging back in, then try uploading again.');
      } else if (error?.message) {
        alert(`Failed to upload image: ${error.message}`);
      } else {
        alert('Failed to upload image. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlChange = (url: string) => {
    // Basic URL validation and sanitization
    const trimmedUrl = url.trim();
    
    // Always update the field to allow user to type/paste
    updateField('image_url', trimmedUrl);
    
    // Update preview URL immediately for better UX
    setPreviewUrl(trimmedUrl);
    
    // Reset error state when URL changes
    setImageLoadError(false);
  };

  // Helper function to validate image URLs
  const isValidImageUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }
      // Be more permissive - allow any valid URL since we can't control CORS policies
      return true;
    } catch {
      return false;
    }
  };

  const handleRemoveImage = () => {
    updateField('image_url', '');
    updateField('image_zoom', 1);
    updateField('image_crop_x', 0);
    updateField('image_crop_y', 0);
    updateField('image_crop_width', null);
    updateField('image_crop_height', null);
    updateField('flyer_template_id', null);
    updateField('image_position', 50);
    updateField('image_position_x', 50);
    setPreviewUrl('');
    setZoom(1);
    setImagePositionY(50);
    setImagePositionX(50);
    setCrop(undefined);
    setCompletedCrop(undefined);
    setApplyCropToFill(false);
    setImageLoadError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePositionYChange = (position: number) => {
    // Validate and clamp position to safe range
    const safePosition = Math.max(-50, Math.min(150, Number(position) || 50));
    if (!isNaN(safePosition)) {
      setImagePositionY(safePosition);
      updateField('image_position', safePosition);
    }
  };

  const handlePositionXChange = (position: number) => {
    // Validate and clamp position to safe range
    const safePosition = Math.max(-50, Math.min(150, Number(position) || 50));
    if (!isNaN(safePosition)) {
      setImagePositionX(safePosition);
      updateField('image_position_x', safePosition);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    // Validate and clamp zoom to safe range
    const safeZoom = Math.max(0.5, Math.min(3, Number(newZoom) || 1));
    if (!isNaN(safeZoom)) {
      setZoom(safeZoom);
      updateField('image_zoom', safeZoom);
    }
  };

  const handleCropComplete = (crop: PixelCrop) => {
    setCompletedCrop(crop);
    
    // Update form data with crop values
    updateField('image_crop_x', Math.round(crop.x));
    updateField('image_crop_y', Math.round(crop.y));
    updateField('image_crop_width', Math.round(crop.width));
    updateField('image_crop_height', Math.round(crop.height));
  };

  const resetCrop = () => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    setApplyCropToFill(false);
    updateField('image_crop_x', 0);
    updateField('image_crop_y', 0);
    updateField('image_crop_width', null);
    updateField('image_crop_height', null);
  };

  const toggleCropToFill = () => {
    setApplyCropToFill(!applyCropToFill);
  };

  const saveAsTemplate = async () => {
    if (!previewUrl || !templateName.trim()) {
      alert('Please provide a template name');
      return;
    }

    setIsSavingTemplate(true);
    try {
      const templateData = {
        name: templateName,
        organization_id: formData.sanction_body_id ? Number(formData.sanction_body_id) : null,
        user_id: user?.id,
        image_url: previewUrl,
        image_position: imagePositionY,
        image_position_x: imagePositionX,
        zoom_level: zoom,
        crop_x: completedCrop?.x || 0,
        crop_y: completedCrop?.y || 0,
        crop_width: completedCrop?.width || null,
        crop_height: completedCrop?.height || null,
        is_default: false,
        is_global_default: false
      };

      const { data, error } = await supabase
        .from('event_flyer_templates')
        .insert([templateData])
        .select()
        .single();

      if (error) throw error;

      // Reload templates
      await loadTemplates();
      
      setShowTemplateModal(false);
      setTemplateName('');
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const loadTemplate = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Set flag to prevent useEffect loops
    isLoadingTemplateRef.current = true;

    try {
      // Batch all state updates to prevent cascading updates
      // Update local state directly
      setPreviewUrl(template.image_url);
      setImagePositionY(template.image_position);
      setImagePositionX(template.image_position_x || 50);
      setZoom(template.zoom_level);
      
      // Update form data in a single batch
      updateField('image_url', template.image_url);
      updateField('image_position', template.image_position);
      updateField('image_position_x', template.image_position_x || 50);
      updateField('image_zoom', template.zoom_level);
    
    // Apply crop if exists
    if (template.crop_width && template.crop_height) {
      const newCrop: PixelCrop = {
        unit: 'px',
        x: template.crop_x,
        y: template.crop_y,
        width: template.crop_width,
        height: template.crop_height
      };
      setCompletedCrop(newCrop);
      setCrop(newCrop);
      
      // Update crop fields
      updateField('image_crop_x', template.crop_x);
      updateField('image_crop_y', template.crop_y);
      updateField('image_crop_width', template.crop_width);
      updateField('image_crop_height', template.crop_height);
    } else {
      // Clear crop if template doesn't have one
      setCompletedCrop(undefined);
      setCrop(undefined);
      updateField('image_crop_x', 0);
      updateField('image_crop_y', 0);
      updateField('image_crop_width', null);
      updateField('image_crop_height', null);
    }
    
      // Track which template was used
      updateField('flyer_template_id', templateId);
      setSelectedTemplateId(templateId);
    } finally {
      // Reset flag after a short delay to ensure all updates have processed
      setTimeout(() => {
        isLoadingTemplateRef.current = false;
      }, 100);
    }
  };

  const setAsDefault = async (templateId: string, isGlobal: boolean = false) => {
    try {
      const updates = isGlobal 
        ? { is_global_default: true }
        : { is_default: true };

      const { error } = await supabase
        .from('event_flyer_templates')
        .update(updates)
        .eq('id', templateId);

      if (error) throw error;

      await loadTemplates();
      alert(`Template set as ${isGlobal ? 'global' : 'organization'} default`);
    } catch (error) {
      console.error('Error setting default:', error);
      alert('Failed to set default template');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('event_flyer_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      await loadTemplates();
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId('');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  // Calculate the image style based on current settings
  const getImageStyle = () => {
    // Convert position percentages to translate values
    // 0% = translate 50%, 50% = translate 0%, 100% = translate -50%
    const translateX = 50 - imagePositionX;
    const translateY = 50 - imagePositionY;
    
    const style: React.CSSProperties = {
      transform: `translate(${translateX}%, ${translateY}%) scale(${zoom})`,
      transition: 'transform 0.2s ease',
      transformOrigin: 'center',
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      maxWidth: 'none',
      maxHeight: 'none',
      width: 'auto',
      height: 'auto',
    };

    // Apply crop if enabled and crop-to-fill is active
    if (completedCrop && applyCropToFill && imgRef.current) {
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      // When cropping, we need to adjust the image size and position
      style.width = `${(imgRef.current.naturalWidth / completedCrop.width) * 100}%`;
      style.height = `${(imgRef.current.naturalHeight / completedCrop.height) * 100}%`;
      
      // Adjust position based on crop
      const cropTranslateX = 50 - imagePositionX - (completedCrop.x * scaleX / imgRef.current.naturalWidth * 100);
      const cropTranslateY = 50 - imagePositionY - (completedCrop.y * scaleY / imgRef.current.naturalHeight * 100);
      
      style.transform = `translate(${cropTranslateX}%, ${cropTranslateY}%) scale(${zoom})`;
    }

    return style;
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
        <ImageIcon className="h-5 w-5 text-electric-500" />
        <span>Event Flier Image</span>
      </h2>

      {/* Template Selector */}
      {templates.length > 0 && (
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-gray-400 text-sm">
              Load from Template
            </label>
            <button
              type="button"
              onClick={loadTemplates}
              className="text-electric-400 hover:text-electric-300 text-sm"
            >
              Refresh Templates
            </button>
          </div>
          
          <select
            value={selectedTemplateId}
            onChange={(e) => {
              if (e.target.value) {
                loadTemplate(e.target.value);
              }
            }}
            className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
          >
            <option value="">Select a template...</option>
            {templates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.is_global_default && ' (Global Default)'}
                {template.is_default && ' (Organization Default)'}
                {template.organization_id && formData.sanction_body_id === String(template.organization_id) && ' (Organization)'}
                {template.user_id === user?.id && ' (Personal)'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Upload Method Selector */}
      <div className="flex space-x-4 mb-6">
        <button
          type="button"
          onClick={() => setUploadMethod('upload')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            uploadMethod === 'upload'
              ? 'bg-electric-500 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          <Upload className="h-4 w-4" />
          <span>Upload Image</span>
        </button>
        <button
          type="button"
          onClick={() => setUploadMethod('url')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            uploadMethod === 'url'
              ? 'bg-electric-500 text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          <Link className="h-4 w-4" />
          <span>Image URL</span>
        </button>
      </div>

      {/* Upload or URL Input */}
      {uploadMethod === 'upload' ? (
        <div className="mb-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileUpload}
            className="hidden"
            id="flier-upload"
          />
          <label
            htmlFor="flier-upload"
            className={`flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isUploading
                ? 'border-gray-600 bg-gray-700/50 cursor-not-allowed'
                : 'border-gray-600 hover:border-electric-500 hover:bg-gray-700/30'
            }`}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-electric-500 mr-3" />
                <span className="text-gray-400">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-gray-400 mr-3" />
                <span className="text-gray-400">
                  Click to upload event flier (JPEG, PNG, WebP - Max 10MB)
                </span>
              </>
            )}
          </label>
        </div>
      ) : (
        <div className="mb-6">
          <label htmlFor="image-url" className="block text-gray-400 text-sm mb-2">
            Image URL
          </label>
          <input
            id="image-url"
            type="url"
            value={formData.image_url || ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            onBlur={() => touchField('image_url')}
            placeholder="https://example.com/event-flier.jpg"
            className={`w-full p-3 bg-gray-700/50 border rounded-lg text-white focus:outline-none focus:border-electric-500 ${
              getFieldError('image_url') ? 'border-red-500' : 'border-gray-600'
            }`}
          />
          {getFieldError('image_url') && (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {getFieldError('image_url')}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Note: Some external images may not load due to CORS restrictions. For best results, upload images directly or use image hosting services like Imgur or Cloudinary.
          </p>
        </div>
      )}

      {/* Image Preview and Controls */}
      {previewUrl && (
        <div className="space-y-4">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            {/* Preview Container */}
            <div className="relative h-96 overflow-hidden bg-gray-800">
              {showCropMode ? (
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => handleCropComplete(c)}
                  aspect={undefined}
                  className="max-h-full"
                >
                  <img
                    ref={imgRef}
                    src={previewUrl}
                    alt="Event flier preview"
                    style={{
                      maxHeight: '100%',
                      width: 'auto',
                      margin: '0 auto',
                      display: 'block'
                    }}
                    onError={(e) => {
                      console.error('Failed to load crop image:', previewUrl);
                      setImageLoadError(true);
                    }}
                  />
                </ReactCrop>
              ) : (
                <div className="w-full h-full relative overflow-hidden">
                  <img
                    ref={imgRef}
                    src={previewUrl}
                    alt="Event flier preview"
                    style={getImageStyle()}
                    onLoad={() => {
                      // Image loaded successfully
                      console.log('Image loaded successfully');
                      setImageLoadError(false);
                    }}
                    onError={(e) => {
                      console.error('Failed to load image:', previewUrl);
                      setImageLoadError(true);
                      // Don't automatically clear the image - let user decide
                      // This prevents clearing the URL while the user is still typing
                    }}
                    loading="lazy"
                  />
                </div>
              )}
              
              {/* Image Load Error Message */}
              {imageLoadError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                  <div className="text-center p-6 max-w-md">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Image</h3>
                    <p className="text-gray-400 mb-4">
                      This may be due to CORS restrictions or an invalid URL. 
                      Try uploading the image directly instead.
                    </p>
                    <div className="flex justify-center space-x-3">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadMethod('upload');
                          setImageLoadError(false);
                        }}
                        className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors"
                      >
                        Switch to Upload
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Clear Image
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Control Buttons */}
              <div className="absolute top-4 right-4 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCropMode(!showCropMode)}
                  className={`p-2 rounded-lg transition-colors ${
                    showCropMode 
                      ? 'bg-electric-500 text-white' 
                      : 'bg-black/70 text-white hover:bg-black/80'
                  }`}
                  title={showCropMode ? 'Exit crop mode' : 'Enter crop mode'}
                >
                  <Move className="h-4 w-4" />
                </button>
                
                {completedCrop && (
                  <>
                    <button
                      type="button"
                      onClick={toggleCropToFill}
                      className={`p-2 rounded-lg transition-colors ${
                        applyCropToFill
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                      title="Apply crop to fill"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                    
                    <button
                      type="button"
                      onClick={resetCrop}
                      className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      title="Reset crop"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                  </>
                )}
                
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  title="Save as template"
                >
                  <Save className="h-4 w-4" />
                </button>
                
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  title="Remove image"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Controls - Always visible */}
            <div className="p-4 bg-gray-800/50 space-y-4">
              {/* Zoom Control */}
              <div className="flex items-center space-x-4">
                <ZoomOut className="h-4 w-4 text-gray-400" />
                <label className="text-sm text-gray-400 min-w-[40px]">Zoom:</label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => handleZoomChange(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-400 w-12 text-right">{zoom.toFixed(1)}x</span>
                <ZoomIn className="h-4 w-4 text-gray-400" />
              </div>

              {/* Vertical Position Control */}
              <div className="flex items-center space-x-4">
                <Move className="h-4 w-4 text-gray-400" />
                <label className="text-sm text-gray-400 min-w-[40px]">Y Pos:</label>
                <input
                  type="range"
                  min="-50"
                  max="150"
                  value={imagePositionY}
                  onChange={(e) => handlePositionYChange(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-400 w-12 text-right">{imagePositionY}%</span>
              </div>

              {/* Horizontal Position Control */}
              <div className="flex items-center space-x-4">
                <Move className="h-4 w-4 text-gray-400" />
                <label className="text-sm text-gray-400 min-w-[40px]">X Pos:</label>
                <input
                  type="range"
                  min="-50"
                  max="150"
                  value={imagePositionX}
                  onChange={(e) => handlePositionXChange(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-400 w-12 text-right">{imagePositionX}%</span>
              </div>
              
              <p className="text-xs text-gray-500">
                {showCropMode 
                  ? 'Click and drag to crop the image. Use the maximize button to apply crop-to-fill.'
                  : 'Adjust zoom and X/Y position to frame your image perfectly. The cropped area can be zoomed to fill the display area.'
                }
              </p>
              
              {completedCrop && !showCropMode && (
                <p className="text-xs text-electric-400">
                  Crop area selected. {applyCropToFill ? 'Crop-to-fill is active.' : 'Click the maximize button to apply crop-to-fill.'}
                </p>
              )}
            </div>
          </div>

          {/* Usage Info */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p>This image will be displayed in:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-xs">
                  <li>Event details page header (large banner)</li>
                  <li>Event listing cards (thumbnail)</li>
                  <li>Social media sharing previews</li>
                </ul>
                <p className="mt-2 text-xs">
                  Use X/Y positioning to pan around the image, zoom to scale, and crop to select a specific area that can be expanded to fill the display.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Save Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Save as Template</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Summer Event Banner"
                  className="w-full p-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-electric-500"
                  autoFocus
                />
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <AlertCircle className="h-4 w-4" />
                <p>This will save the current image URL, zoom, crop, and X/Y position settings.</p>
              </div>
              
              {formData.sanction_body_id && (
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <FolderOpen className="h-4 w-4" />
                  <p>Template will be saved for the selected organization.</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowTemplateModal(false);
                  setTemplateName('');
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAsTemplate}
                disabled={!templateName.trim() || isSavingTemplate}
                className="px-4 py-2 bg-electric-500 text-white rounded-lg hover:bg-electric-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingTemplate ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Management (for user's own templates) */}
      {templates.filter(t => t.user_id === user?.id).length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Manage Your Templates</h3>
          <div className="space-y-2">
            {templates
              .filter(t => t.user_id === user?.id)
              .map(template => (
                <div key={template.id} className="flex items-center justify-between p-2 bg-gray-700/30 rounded-lg">
                  <span className="text-sm text-gray-300">{template.name}</span>
                  <div className="flex items-center space-x-2">
                    {formData.sanction_body_id && (
                      <button
                        type="button"
                        onClick={() => setAsDefault(template.id, false)}
                        className={`p-1 rounded transition-colors ${
                          template.is_default
                            ? 'text-yellow-400'
                            : 'text-gray-500 hover:text-yellow-400'
                        }`}
                        title="Set as organization default"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    {user?.membershipType === 'admin' && (
                      <button
                        type="button"
                        onClick={() => setAsDefault(template.id, true)}
                        className={`p-1 rounded transition-colors ${
                          template.is_global_default
                            ? 'text-electric-400'
                            : 'text-gray-500 hover:text-electric-400'
                        }`}
                        title="Set as global default"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteTemplate(template.id)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      title="Delete template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageSection;