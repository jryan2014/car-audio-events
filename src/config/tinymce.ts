// TinyMCE Configuration
// This API key is domain-restricted and safe to be public
export const TINYMCE_API_KEY = '2l8fxsmp22j75yhpuwrv2rbm6ygm83mk72jr7per4x4j77hl';

// TinyMCE script URL
export const getTinyMCEScriptUrl = () => {
  // Use environment variable if available (for easy override in development)
  const apiKey = import.meta.env.VITE_TINYMCE_API_KEY || TINYMCE_API_KEY;
  return `https://cdn.tiny.cloud/1/${apiKey}/tinymce/6/tinymce.min.js`;
};