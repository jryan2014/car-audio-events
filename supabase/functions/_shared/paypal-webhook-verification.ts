/**
 * PayPal Webhook Signature Verification
 * 
 * This module provides secure verification of PayPal webhook signatures
 * to ensure webhook events are genuinely from PayPal.
 */

interface PayPalVerificationRequest {
  transmission_id: string | null;
  transmission_time: string | null;
  cert_url: string | null;
  auth_algo: string | null;
  transmission_sig: string | null;
  webhook_id: string;
  webhook_event: any;
}

interface PayPalVerificationResponse {
  verification_status: 'SUCCESS' | 'FAILURE';
}

/**
 * Verify PayPal webhook signature
 * @param headers - Request headers containing PayPal signature information
 * @param body - Raw webhook body as string
 * @param webhookId - PayPal webhook ID from environment
 * @returns Promise<boolean> - True if signature is valid
 */
export async function verifyPayPalWebhookSignature(
  headers: Headers,
  body: string,
  webhookId: string
): Promise<boolean> {
  try {
    // Get PayPal credentials
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    const environment = Deno.env.get('PAYPAL_ENVIRONMENT') || 'sandbox';
    
    if (!clientId || !clientSecret) {
      console.error('PayPal credentials not configured');
      return false;
    }
    
    // Get signature headers
    const transmissionId = headers.get('paypal-transmission-id');
    const transmissionTime = headers.get('paypal-transmission-time');
    const transmissionSig = headers.get('paypal-transmission-sig');
    const certUrl = headers.get('paypal-cert-url');
    const authAlgo = headers.get('paypal-auth-algo');
    
    // All signature headers are required
    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      console.error('Missing PayPal signature headers');
      return false;
    }
    
    // PayPal API base URL
    const baseUrl = environment === 'production' 
      ? 'https://api.paypal.com'
      : 'https://api.sandbox.paypal.com';
    
    // First, get OAuth token
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!tokenResponse.ok) {
      console.error('Failed to get PayPal OAuth token');
      return false;
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    // Prepare verification request
    const verificationRequest: PayPalVerificationRequest = {
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: JSON.parse(body)
    };
    
    // Verify webhook signature with PayPal
    const verifyResponse = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verificationRequest)
    });
    
    if (!verifyResponse.ok) {
      console.error('PayPal webhook verification request failed:', await verifyResponse.text());
      return false;
    }
    
    const verificationResult: PayPalVerificationResponse = await verifyResponse.json();
    
    // Log verification result
    console.log(`PayPal webhook verification result: ${verificationResult.verification_status}`);
    
    return verificationResult.verification_status === 'SUCCESS';
    
  } catch (error) {
    console.error('Error verifying PayPal webhook signature:', error);
    return false;
  }
}

/**
 * Get PayPal configuration with webhook ID
 */
export async function getPayPalWebhookConfig(): Promise<{
  webhookId: string;
  environment: string;
  clientId: string;
  clientSecret: string;
} | null> {
  try {
    // Try to get from environment first
    const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    const environment = Deno.env.get('PAYPAL_ENVIRONMENT') || 'sandbox';
    
    if (!webhookId || !clientId || !clientSecret) {
      console.error('PayPal webhook configuration incomplete');
      return null;
    }
    
    return {
      webhookId,
      environment,
      clientId,
      clientSecret
    };
    
  } catch (error) {
    console.error('Error getting PayPal webhook config:', error);
    return null;
  }
}