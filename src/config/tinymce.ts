// TinyMCE Configuration
// This API key is domain-restricted and safe to be public
// But we use environment variables for better security practices
export const TINYMCE_API_KEY = import.meta.env.VITE_TINYMCE_API_KEY || '';

// TinyMCE script URL
export const getTinyMCEScriptUrl = () => {
  const apiKey = TINYMCE_API_KEY;
  if (!apiKey) {
    console.error('TinyMCE API key not configured. Please set VITE_TINYMCE_API_KEY in your environment variables.');
    return '';
  }
  return `https://cdn.tiny.cloud/1/${apiKey}/tinymce/6/tinymce.min.js`;
};