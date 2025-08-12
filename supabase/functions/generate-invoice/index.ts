import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno';

;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { invoiceId } = await req.json();

    // Get invoice from database
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        subscriptions!subscription_id (
          membership_plans (
            name,
            billing_period,
            price
          )
        )
      `)
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // If invoice has a Stripe invoice ID, fetch from Stripe
    let stripeInvoice = null;
    if (invoice.provider_invoice_id && invoice.payment_provider === 'stripe') {
      try {
        stripeInvoice = await stripe.invoices.retrieve(invoice.provider_invoice_id);
      } catch (error) {
        console.error('Error fetching Stripe invoice:', error);
      }
    }

    // Get user details
    const { data: userData } = await supabase
      .from('users')
      .select('name, email, billing_address')
      .eq('id', user.id)
      .single();

    // Prepare invoice data
    const invoiceData = {
      ...invoice,
      user: userData,
      stripe_invoice: stripeInvoice,
      membership_plan: invoice.subscriptions?.membership_plans,
      line_items: stripeInvoice?.lines?.data || [{
        description: invoice.subscriptions?.membership_plans?.name || 'Subscription',
        amount: invoice.subtotal * 100, // Convert to cents for consistency
        quantity: 1
      }],
      hosted_invoice_url: stripeInvoice?.hosted_invoice_url,
      invoice_pdf: stripeInvoice?.invoice_pdf
    };

    return new Response(
      JSON.stringify({ invoice: invoiceData }),
      { 
        status: 200, 
        headers: corsHeaders 
      }
    );
  } catch (error) {
    console.error('Error generating invoice:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate invoice' }),
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
}); 