/**
 * Get the client's IP address
 * This works in the browser by making a request to an IP detection service
 */
export async function getClientIp(): Promise<string | null> {
  try {
    // Try multiple services for redundancy
    const services = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://api.my-ip.io/ip.json'
    ];

    for (const service of services) {
      try {
        const response = await fetch(service);
        if (response.ok) {
          const data = await response.json();
          // Different services return IP in different fields
          const ip = data.ip || data.IPv4 || data.query;
          if (ip) {
            console.log('Client IP detected:', ip);
            return ip;
          }
        }
      } catch (err) {
        // Try next service
        continue;
      }
    }

    console.warn('Could not detect client IP address');
    return null;
  } catch (error) {
    console.error('Error getting client IP:', error);
    return null;
  }
}

/**
 * Store the IP address in session storage for quick access
 */
export function getCachedClientIp(): string | null {
  return sessionStorage.getItem('client_ip');
}

export function setCachedClientIp(ip: string): void {
  sessionStorage.setItem('client_ip', ip);
}