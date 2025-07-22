import { supabase } from '../lib/supabase';

interface UploadAdImageParams {
  file: File;
  userId: string;
  advertisementId?: string;
}

interface AdImageMetadata {
  advertisementId?: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  altText?: string;
}

export class AdImageService {
  /**
   * Upload an ad image to Supabase storage
   */
  static async uploadImage({ file, userId, advertisementId }: UploadAdImageParams) {
    try {
      // Validate file
      if (!file) throw new Error('No file provided');
      if (!file.type.startsWith('image/')) throw new Error('File must be an image');
      if (file.size > 5 * 1024 * 1024) throw new Error('File size must be less than 5MB');

      // Debug: Check auth status
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('Auth check:', { 
        userId: user?.id, 
        providedUserId: userId,
        authError,
        match: user?.id === userId 
      });

      // Generate unique filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Create storage path organized by user ID
      const storagePath = `${userId}/${fileName}`;

      // Upload to Supabase storage
      console.log('Attempting to upload:', { storagePath, fileName: file.name, fileSize: file.size });
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ad-images')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }
      
      console.log('Upload successful:', uploadData);

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ad-images')
        .getPublicUrl(storagePath);

      // Get image dimensions
      const dimensions = await this.getImageDimensions(file);

      // Save metadata to database
      const metadata: AdImageMetadata = {
        advertisementId,
        userId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        width: dimensions.width,
        height: dimensions.height
      };

      // Insert into advertisement_images table with correct columns
      const { data: imageRecord, error: dbError } = await supabase
        .from('advertisement_images')
        .insert({
          advertisement_id: advertisementId,
          image_url: publicUrl,
          image_title: file.name,
          status: 'active',
          variant_type: 'single',
          width: dimensions.width,
          height: dimensions.height,
          file_size: file.size,
          file_format: file.type,
          created_by: userId
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        // Try to clean up the uploaded file
        await supabase.storage.from('ad-images').remove([storagePath]);
        throw new Error(`Failed to save image metadata: ${dbError.message}`);
      }

      return {
        success: true,
        publicUrl,
        storagePath,
        imageRecord
      };
    } catch (error) {
      console.error('Error uploading ad image:', error);
      throw error;
    }
  }

  /**
   * Delete an ad image from storage and database
   */
  static async deleteImage(storagePath: string, imageId?: string) {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('ad-images')
        .remove([storagePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        throw new Error(`Failed to delete image from storage: ${storageError.message}`);
      }

      // Delete from database if imageId provided
      if (imageId) {
        const { error: dbError } = await supabase
          .from('advertisement_images')
          .delete()
          .eq('id', imageId);

        if (dbError) {
          console.error('Database deletion error:', dbError);
          throw new Error(`Failed to delete image record: ${dbError.message}`);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting ad image:', error);
      throw error;
    }
  }

  /**
   * Get image dimensions from a File object
   */
  static getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          width: img.width,
          height: img.height
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Get all images for an advertisement
   */
  static async getAdvertisementImages(advertisementId: string) {
    try {
      const { data, error } = await supabase
        .from('advertisement_images')
        .select('*')
        .eq('advertisement_id', advertisementId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching ad images:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting advertisement images:', error);
      throw error;
    }
  }

  /**
   * Update image metadata (e.g., alt text, primary status)
   */
  static async updateImageMetadata(imageId: string, updates: Partial<{
    alt_text: string;
    is_primary: boolean;
  }>) {
    try {
      const { data, error } = await supabase
        .from('advertisement_images')
        .update(updates)
        .eq('id', imageId)
        .select()
        .single();

      if (error) {
        console.error('Error updating image metadata:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating ad image metadata:', error);
      throw error;
    }
  }

  /**
   * Set an image as primary for an advertisement
   */
  static async setPrimaryImage(advertisementId: string, imageId: string) {
    try {
      // First, unset all other images as primary
      await supabase
        .from('advertisement_images')
        .update({ is_primary: false })
        .eq('advertisement_id', advertisementId);

      // Then set the selected image as primary
      const { data, error } = await supabase
        .from('advertisement_images')
        .update({ is_primary: true })
        .eq('id', imageId)
        .select()
        .single();

      if (error) {
        console.error('Error setting primary image:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error setting primary ad image:', error);
      throw error;
    }
  }
}