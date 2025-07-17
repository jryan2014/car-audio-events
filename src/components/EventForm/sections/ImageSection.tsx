import React, { useState, useRef } from 'react';
import { Upload, Link, Image as ImageIcon, Trash2, AlertCircle, Move } from 'lucide-react';
import { EventFormData } from '../../../types/event';
import { supabase } from '../../../lib/supabase';

interface ImageSectionProps {
  formData: EventFormData;
  updateField: <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => void;
  getFieldError: (field: string) => string | undefined;
  touchField: (field: string) => void;
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
  const [imagePosition, setImagePosition] = useState<number>(50); // Default center position
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlChange = (url: string) => {
    updateField('image_url', url);
    setPreviewUrl(url);
  };

  const handleRemoveImage = () => {
    updateField('image_url', '');
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePositionChange = (position: number) => {
    setImagePosition(position);
    // Store position in metadata or as a separate field
    updateField('image_position' as any, position);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
        <ImageIcon className="h-5 w-5 text-electric-500" />
        <span>Event Flier Image</span>
      </h2>

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
        </div>
      )}

      {/* Image Preview and Position Control */}
      {previewUrl && (
        <div className="space-y-4">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            {/* Preview Container */}
            <div className="relative h-64 overflow-hidden">
              <img
                src={previewUrl}
                alt="Event flier preview"
                className="w-full h-full object-cover"
                style={{
                  objectPosition: `center ${imagePosition}%`
                }}
              />
              
              {/* Position Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent pointer-events-none" />
              
              {/* Remove Button */}
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                title="Remove image"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Position Control */}
            <div className="p-4 bg-gray-800/50">
              <div className="flex items-center space-x-4">
                <Move className="h-4 w-4 text-gray-400" />
                <label className="text-sm text-gray-400">Header Display Position:</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={imagePosition}
                  onChange={(e) => handlePositionChange(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-400 w-12 text-right">{imagePosition}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Adjust the vertical position of the image in the event header
              </p>
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageSection;