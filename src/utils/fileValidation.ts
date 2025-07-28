/**
 * File validation utilities for secure file uploads
 * Provides client-side validation (must be duplicated server-side for security)
 */

// Allowed MIME types for different upload contexts
export const ALLOWED_IMAGE_TYPES = {
  event: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  advertisement: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  logo: ['image/png', 'image/svg+xml', 'image/webp'],
  profile: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

// Maximum file sizes by context (in bytes)
export const MAX_FILE_SIZES = {
  event: 10 * 1024 * 1024, // 10MB
  advertisement: 5 * 1024 * 1024, // 5MB
  logo: 2 * 1024 * 1024, // 2MB
  profile: 5 * 1024 * 1024, // 5MB
};

// File extension whitelist
export const ALLOWED_EXTENSIONS = {
  event: ['jpg', 'jpeg', 'png', 'webp'],
  advertisement: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  logo: ['png', 'svg', 'webp'],
  profile: ['jpg', 'jpeg', 'png', 'webp'],
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate file type
 */
export function validateFileType(
  file: File, 
  context: keyof typeof ALLOWED_IMAGE_TYPES
): FileValidationResult {
  const allowedTypes = ALLOWED_IMAGE_TYPES[context];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    };
  }
  
  // Also check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ALLOWED_EXTENSIONS[context];
  
  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`
    };
  }
  
  return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(
  file: File, 
  context: keyof typeof MAX_FILE_SIZES
): FileValidationResult {
  const maxSize = MAX_FILE_SIZES[context];
  
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`
    };
  }
  
  return { valid: true };
}

/**
 * Sanitize file name for safe storage
 */
export function sanitizeFileName(fileName: string): string {
  // Remove any path components
  const baseName = fileName.split('/').pop() || fileName;
  const nameParts = baseName.split('\\').pop() || baseName;
  
  // Extract name and extension
  const lastDotIndex = nameParts.lastIndexOf('.');
  const name = lastDotIndex > 0 ? nameParts.substring(0, lastDotIndex) : nameParts;
  const extension = lastDotIndex > 0 ? nameParts.substring(lastDotIndex + 1) : '';
  
  // Sanitize name: keep only alphanumeric, dash, underscore
  const sanitizedName = name.replace(/[^a-zA-Z0-9\-_]/g, '_').substring(0, 100);
  
  // Return with extension if valid
  return extension ? `${sanitizedName}.${extension.toLowerCase()}` : sanitizedName;
}

/**
 * Generate a secure random filename
 */
export function generateSecureFileName(originalFileName: string): string {
  const extension = originalFileName.split('.').pop()?.toLowerCase() || '';
  const timestamp = Date.now();
  const randomString = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${timestamp}-${randomString}${extension ? `.${extension}` : ''}`;
}

/**
 * Validate image dimensions (requires FileReader)
 */
export function validateImageDimensions(
  file: File,
  minWidth?: number,
  minHeight?: number,
  maxWidth?: number,
  maxHeight?: number
): Promise<FileValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      if (minWidth && img.width < minWidth) {
        resolve({
          valid: false,
          error: `Image width must be at least ${minWidth}px`
        });
        return;
      }
      
      if (minHeight && img.height < minHeight) {
        resolve({
          valid: false,
          error: `Image height must be at least ${minHeight}px`
        });
        return;
      }
      
      if (maxWidth && img.width > maxWidth) {
        resolve({
          valid: false,
          error: `Image width must not exceed ${maxWidth}px`
        });
        return;
      }
      
      if (maxHeight && img.height > maxHeight) {
        resolve({
          valid: false,
          error: `Image height must not exceed ${maxHeight}px`
        });
        return;
      }
      
      resolve({ valid: true });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: 'Failed to load image. File may be corrupted.'
      });
    };
    
    img.src = url;
  });
}

/**
 * Check file signature (magic bytes) for extra security
 * Note: This is client-side only and can be bypassed - server must validate too
 */
export async function validateFileSignature(file: File): Promise<FileValidationResult> {
  const signatures: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  };
  
  const expectedSignatures = signatures[file.type];
  if (!expectedSignatures) {
    return { valid: true }; // Skip validation for unsupported types
  }
  
  try {
    const arrayBuffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Special handling for WebP
    if (file.type === 'image/webp') {
      const riffMatch = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
      const webpMatch = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
      
      if (!riffMatch || !webpMatch) {
        return {
          valid: false,
          error: 'File content does not match WebP format'
        };
      }
      return { valid: true };
    }
    
    // Check other formats
    const isValid = expectedSignatures.some(signature =>
      signature.every((byte, index) => bytes[index] === byte)
    );
    
    if (!isValid) {
      return {
        valid: false,
        error: 'File content does not match declared type'
      };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error validating file signature:', error);
    return { valid: true }; // Don't block on client-side validation errors
  }
}

/**
 * Comprehensive file validation combining all checks
 */
export async function validateFile(
  file: File,
  context: keyof typeof ALLOWED_IMAGE_TYPES,
  options?: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    checkSignature?: boolean;
  }
): Promise<FileValidationResult> {
  // Check file type
  const typeValidation = validateFileType(file, context);
  if (!typeValidation.valid) return typeValidation;
  
  // Check file size
  const sizeValidation = validateFileSize(file, context);
  if (!sizeValidation.valid) return sizeValidation;
  
  // Check file signature if requested
  if (options?.checkSignature) {
    const signatureValidation = await validateFileSignature(file);
    if (!signatureValidation.valid) return signatureValidation;
  }
  
  // Check image dimensions if provided
  if (options?.minWidth || options?.minHeight || options?.maxWidth || options?.maxHeight) {
    const dimensionValidation = await validateImageDimensions(
      file,
      options.minWidth,
      options.minHeight,
      options.maxWidth,
      options.maxHeight
    );
    if (!dimensionValidation.valid) return dimensionValidation;
  }
  
  return { valid: true };
}

/**
 * Strip EXIF data from images for privacy
 * Note: This requires a library like piexifjs in production
 */
export async function stripExifData(file: File): Promise<File> {
  // For now, return the original file
  // In production, use a library to strip EXIF data
  console.warn('EXIF stripping not implemented - privacy risk');
  return file;
}