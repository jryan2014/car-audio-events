/**
 * Subresource Integrity (SRI) utility for external script loading
 * Provides integrity hashes for external scripts to prevent tampering
 */

export interface SRIConfig {
  url: string;
  integrity?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
}

/**
 * Known SRI hashes for external scripts
 * These should be updated when the external scripts change
 * Note: Google Maps API doesn't support SRI as it's dynamically generated
 */
export const knownSRIHashes: Record<string, string> = {
  // Google Maps API - Cannot use SRI as it's dynamically generated
  // Alternative: Use CSP to restrict sources
  
  // TinyMCE - Example (update with actual hashes when used)
  // 'https://cdn.tiny.cloud/1/...' : 'sha384-...'
};

/**
 * Create a script element with SRI if available
 */
export const createScriptWithSRI = (config: SRIConfig): HTMLScriptElement => {
  const script = document.createElement('script');
  script.src = config.url;
  script.async = true;
  script.defer = true;
  
  // Add SRI hash if available
  if (config.integrity) {
    script.integrity = config.integrity;
    script.crossOrigin = config.crossOrigin || 'anonymous';
  }
  
  return script;
};

/**
 * Load external script with SRI support
 */
export const loadExternalScript = (config: SRIConfig): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${config.url}"]`);
    if (existingScript) {
      resolve();
      return;
    }
    
    const script = createScriptWithSRI(config);
    
    script.onload = () => resolve();
    script.onerror = (error) => {
      console.error(`Failed to load script: ${config.url}`, error);
      reject(new Error(`Failed to load script: ${config.url}`));
    };
    
    document.head.appendChild(script);
  });
};

/**
 * Validate that a script element has proper SRI configuration
 */
export const validateScriptSRI = (script: HTMLScriptElement): boolean => {
  const src = script.src;
  
  // Skip validation for same-origin scripts
  if (!src || src.startsWith(window.location.origin)) {
    return true;
  }
  
  // For external scripts, check if SRI is configured
  if (!script.integrity) {
    console.warn(`External script missing SRI: ${src}`);
    return false;
  }
  
  return true;
};

/**
 * Audit all script elements for SRI compliance
 */
export const auditScriptSRI = (): { passed: number; failed: number; issues: string[] } => {
  const scripts = document.querySelectorAll('script[src]');
  const issues: string[] = [];
  let passed = 0;
  let failed = 0;
  
  scripts.forEach((script) => {
    const htmlScript = script as HTMLScriptElement;
    if (validateScriptSRI(htmlScript)) {
      passed++;
    } else {
      failed++;
      issues.push(htmlScript.src);
    }
  });
  
  return { passed, failed, issues };
};