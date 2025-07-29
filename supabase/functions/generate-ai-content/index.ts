import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { RateLimiter, RateLimitConfigs } from '../_shared/rate-limiter.ts'
import { AuditLogger } from '../_shared/audit-logger.ts'

interface AIContentRequest {
  message: string;
  pageType: string;
  currentContent?: string;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Initialize rate limiter and audit logger
  const rateLimiter = new RateLimiter({
    maxRequests: 10, // 10 requests per minute for AI generation
    windowMs: 60000,
    tableName: 'rate_limit_ai_content'
  });
  const auditLogger = new AuditLogger();
  const requestInfo = auditLogger.getRequestInfo(req);

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check rate limit
    const rateLimitResult = await rateLimiter.checkLimit(`ai_content:${user.id}`);
    
    if (!rateLimitResult.allowed) {
      await auditLogger.log({
        user_id: user.id,
        action: AuditLogger.Actions.RATE_LIMIT_EXCEEDED,
        metadata: { 
          endpoint: 'generate-ai-content'
        },
        ...requestInfo
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Too many AI content requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
        }),
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const { message, pageType, currentContent }: AIContentRequest = await req.json()

    // Validate inputs
    if (!message || !pageType) {
      return new Response(
        JSON.stringify({ error: 'Message and pageType are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Sanitize inputs
    const sanitizedMessage = message.slice(0, 1000); // Limit message length
    const sanitizedPageType = pageType.slice(0, 50);
    const sanitizedCurrentContent = currentContent ? currentContent.slice(0, 2000) : '';

    // Check if OpenAI API key is configured
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIKey || openAIKey === 'your_openai_api_key_here') {
      console.log('OpenAI API key not configured, using template response');
      
      // Return template response for specific page types
      const templateResponse = getTemplateResponse(sanitizedMessage, sanitizedPageType, sanitizedCurrentContent);
      
      return new Response(
        JSON.stringify({ content: templateResponse }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Prepare OpenAI API request
    const systemPrompt = `You are a professional content writer specializing in car audio events and competitions. You help create high-quality, engaging content for a car audio events platform.

Context:
- Platform: Car Audio Events - connecting competitors, organizers, and enthusiasts
- Industry: Car audio competitions, sound quality events, SPL competitions
- Audience: Car audio enthusiasts, competitors, event organizers, industry professionals
- Tone: Professional yet approachable, industry-knowledgeable

Current page type: ${sanitizedPageType}
${sanitizedCurrentContent ? `Current content: ${sanitizedCurrentContent}` : ''}

Guidelines:
- Write professional, engaging content appropriate for the car audio industry
- Use industry terminology correctly
- Ensure legal compliance for policy pages
- Make content SEO-friendly with proper structure
- Keep tone consistent with a professional events platform
- Include relevant calls-to-action where appropriate`;

    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: sanitizedMessage }
    ];

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: messages,
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error('OpenAI API error:', errorData);
      
      // Log API error
      await auditLogger.log({
        user_id: user.id,
        action: 'AI_CONTENT_GENERATION_FAILED',
        error_message: errorData.error?.message || 'OpenAI API error',
        metadata: {
          page_type: sanitizedPageType,
          status_code: openAIResponse.status
        },
        ...requestInfo
      });
      
      // Return fallback template response
      const templateResponse = getTemplateResponse(sanitizedMessage, sanitizedPageType, sanitizedCurrentContent);
      
      return new Response(
        JSON.stringify({ content: templateResponse }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const openAIData = await openAIResponse.json();
    const generatedContent = openAIData.choices[0]?.message?.content || 'Sorry, I could not generate content at this time.';

    // Log successful generation
    await auditLogger.log({
      user_id: user.id,
      action: 'AI_CONTENT_GENERATED',
      metadata: {
        page_type: sanitizedPageType,
        content_length: generatedContent.length,
        model: 'gpt-4'
      },
      ...requestInfo
    });

    return new Response(
      JSON.stringify({ content: generatedContent }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in AI content generation:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate AI content',
        content: 'I apologize, but I was unable to generate content at this time. Please try again later.'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Template responses for when OpenAI is not available
function getTemplateResponse(message: string, pageType: string, currentContent?: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Map page types to template categories
  const templates: Record<string, string> = {
    'privacy-policy': `## Privacy Policy

### Our Commitment to Privacy
Car Audio Events is committed to protecting your privacy and ensuring the security of your personal information. This policy explains how we collect, use, and safeguard your data.

### Information Collection
We collect information when you:
- Create an account on our platform
- Register for events or competitions
- Make purchases or payments
- Contact our support team

### Data Protection
We implement industry-standard security measures to protect your information, including encryption, secure servers, and regular security audits.`,
    
    'terms-of-service': `## Terms of Service

### Agreement Acceptance
By using Car Audio Events, you agree to these terms and conditions. If you disagree with any part of these terms, please do not use our platform.

### User Accounts
- You must be at least 18 years old to create an account
- Provide accurate and complete registration information
- Maintain the security of your account credentials
- Accept responsibility for all account activity`,
    
    'about': `## About Car Audio Events

### Who We Are
Car Audio Events is the premier platform connecting the global car audio community. We bring together competitors, enthusiasts, organizers, and industry professionals in one comprehensive ecosystem.

### What We Do
- Event Discovery: Find competitions, meets, and exhibitions worldwide
- Competition Management: Professional tools for organizers and judges
- Community Building: Connect with fellow enthusiasts and professionals
- Industry Resources: Access to the latest news, trends, and educational content`,
    
    'default': `I'd be happy to help you create professional content for your car audio events platform! 

Based on your request, I can assist with:
- Writing engaging copy that resonates with the car audio community
- Creating SEO-optimized content for better visibility
- Developing clear and professional documentation
- Crafting compelling event descriptions and announcements

Please provide more specific details about what you'd like me to help you write, and I'll create content that perfectly fits your needs.`
  };

  // Return appropriate template based on page type
  return templates[pageType] || templates['default'];
}