import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';
import { AdImageService } from '../services/adImageService';
import { useAuth } from '../contexts/AuthContext';

interface AdImageUploadProps {
  advertisementId?: string;
  currentImageUrl?: string;
  onImageUploaded: (imageUrl: string) => void;
  size: string;
  placement: string;
}

const AD_DIMENSIONS: Record<string, { width: number; height: number; label: string }> = {
  small: { width: 300, height: 150, label: 'Small (300x150)' },
  medium: { width: 300, height: 250, label: 'Medium Rectangle (300x250)' },
  large: { width: 728, height: 90, label: 'Large Banner (728x90)' },
  banner: { width: 970, height: 250, label: 'Large Leaderboard (970x250)' },
  square: { width: 250, height: 250, label: 'Square (250x250)' },
  leaderboard: { width: 728, height: 90, label: 'Leaderboard (728x90)' },
  skyscraper: { width: 160, height: 600, label: 'Skyscraper (160x600)' }
};

export default function AdImageUpload({ 
  advertisementId, 
  currentImageUrl, 
  onImageUploaded, 
  size,
  placement 
}: AdImageUploadProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dimensions = AD_DIMENSIONS[size] || AD_DIMENSIONS.medium;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setError(null);
    setIsUploading(true);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload image
      const result = await AdImageService.uploadImage({
        file,
        userId: user.id,
        advertisementId
      });

      if (result.success) {
        onImageUploaded(result.publicUrl);
        setPreview(result.publicUrl);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload image');
      setPreview(currentImageUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onImageUploaded('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-300">Advertisement Image</h4>
          <p className="text-xs text-gray-500 mt-1">
            Recommended: {dimensions.label} for {placement} placement
          </p>
        </div>
        {preview && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="text-red-400 hover:text-red-300 transition-colors"
            disabled={isUploading}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Advertisement preview"
            className="w-full rounded-lg border border-gray-600/50"
            style={{
              maxWidth: `${dimensions.width}px`,
              maxHeight: `${dimensions.height}px`,
              objectFit: 'cover'
            }}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-electric-500 text-white px-4 py-2 rounded-lg hover:bg-electric-600 transition-colors flex items-center space-x-2"
              disabled={isUploading}
            >
              <Upload className="h-4 w-4" />
              <span>Change Image</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-electric-500/50 transition-colors"
          style={{
            maxWidth: `${dimensions.width}px`,
            height: `${Math.min(dimensions.height, 200)}px`
          }}
        >
          <div className="flex flex-col items-center justify-center h-full">
            {isUploading ? (
              <>
                <Loader className="h-8 w-8 text-electric-500 animate-spin mb-3" />
                <p className="text-gray-400 text-sm">Uploading...</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-8 w-8 text-gray-500 mb-3" />
                <p className="text-gray-400 text-sm mb-1">Click to upload image</p>
                <p className="text-gray-500 text-xs">PNG, JPG, GIF up to 5MB</p>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      <div className="bg-gray-800/50 rounded-lg p-3">
        <h5 className="text-xs font-medium text-gray-400 mb-2">Size Guidelines:</h5>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Leaderboard (728x90): Best for header placements</li>
          <li>• Medium Rectangle (300x250): Ideal for sidebar ads</li>
          <li>• Banner (970x250): Premium header placement</li>
          <li>• Images will be automatically optimized for display</li>
        </ul>
      </div>
    </div>
  );
}