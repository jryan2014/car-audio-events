import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { RateLimiter, RateLimitConfigs, createRateLimitHeaders } from '../_shared/rate-limiter.ts'

// SECURITY: Restrict CORS to specific origins
const allowedOrigins = [
  'https://caraudioevents.com',
  'https://www.caraudioevents.com',
  'http://localhost:5173', // Development only
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const corsOrigin = origin && allowedOrigins.includes(origin) 
    ? origin 
    : 'https://caraudioevents.com';
    
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Security headers for responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// File upload configuration
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Initialize rate limiter
const uploadLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 10 uploads per minute per user
  keyPrefix: 'upload_ad'
});

/**
 * Sanitize file name to prevent path traversal and other attacks
 */
function sanitizeFileName(fileName: string): string {
  // Extract extension
  const parts = fileName.split('.');
  const ext = parts[parts.length - 1]?.toLowerCase();
  
  // Validate extension
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error('Invalid file extension');
  }
  
  // Generate secure random filename
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const randomString = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return `${Date.now()}-${randomString}.${ext}`;
}

/**
 * Validate file type by checking magic bytes (file signature)
 */
async function validateFileSignature(arrayBuffer: ArrayBuffer, mimeType: string): Promise<boolean> {
  const bytes = new Uint8Array(arrayBuffer.slice(0, 12));
  
  // File signatures (magic bytes)
  const signatures: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]], // RIFF....WEBP
  };
  
  const expectedSignatures = signatures[mimeType];
  if (!expectedSignatures) return false;
  
  // For WebP, check both RIFF header and WEBP marker
  if (mimeType === 'image/webp') {
    const riffMatch = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    const webpMatch = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    return riffMatch && webpMatch;
  }
  
  // Check if file starts with expected signature
  return expectedSignatures.some(signature => 
    signature.every((byte, index) => bytes[index] === byte)
  );
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { ...corsHeaders, ...securityHeaders } 
    });
  }

  try {
    // Initialize Supabase client with user's auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit
    const rateLimitResult = await uploadLimiter.checkLimit(user.id);
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: rateLimitResult.retryAfter 
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          ...securityHeaders,
          ...createRateLimitHeaders(rateLimitResult),
          'Content-Type': 'application/json'
        },
      });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const advertisementId = formData.get('advertisementId') as string;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ 
        error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }), {
        status: 400,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read file data
    const arrayBuffer = await file.arrayBuffer();
    
    // Validate file signature (magic bytes)
    const isValidSignature = await validateFileSignature(arrayBuffer, file.type);
    if (!isValidSignature) {
      return new Response(JSON.stringify({ 
        error: 'File content does not match declared type. Please upload a valid image.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate secure filename
    const fileName = sanitizeFileName(file.name);
    const storagePath = `${user.id}/${fileName}`;

    // Use service role client for storage operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Upload file with security headers
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('ad-images')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false, // Prevent overwriting existing files
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ 
        error: 'Failed to upload image. Please try again.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('ad-images')
      .getPublicUrl(storagePath);

    // Get image dimensions (safely)
    let width = 0;
    let height = 0;
    try {
      // This would require additional image processing library
      // For now, we'll store as 0 and update client-side
    } catch (e) {
      console.warn('Could not extract image dimensions:', e);
    }

    // Save metadata to database
    const { data: imageRecord, error: dbError } = await supabaseClient
      .from('advertisement_images')
      .insert({
        advertisement_id: advertisementId,
        created_by: user.id,
        image_url: publicUrl,
        image_title: file.name.substring(0, 255), // Limit length
        status: 'active',
        variant_type: 'single',
        width: width || null,
        height: height || null,
        file_size: file.size,
        file_format: file.type,
      })
      .select()
      .single();

    if (dbError) {
      // Try to clean up uploaded file
      await supabaseAdmin.storage.from('ad-images').remove([storagePath]);
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({ 
        error: 'Failed to save image metadata. Please try again.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log successful upload for audit trail
    console.log(`Image uploaded successfully: user=${user.id}, path=${storagePath}, size=${file.size}`);

    return new Response(
      JSON.stringify({
        success: true,
        publicUrl,
        storagePath,
        imageRecord,
      }),
      {
        headers: { 
          ...corsHeaders, 
          ...securityHeaders, 
          ...createRateLimitHeaders(rateLimitResult),
          'Content-Type': 'application/json' 
        },
      }
    );
  } catch (error) {
    console.error('Upload handler error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      {
        status: 500,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});