// AI Content Generation Service
// Uses secure edge function to protect API keys

import { supabase } from './supabase';

interface AIContentRequest {
  message: string;
  pageType: string;
  currentContent?: string;
}

export async function generateAIContent({ message, pageType, currentContent }: AIContentRequest): Promise<string> {
  try {
    // Get authenticated session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('No authenticated session for AI content generation');
      // Return template response for unauthenticated users
      return getAIResponse(message, pageType, currentContent);
    }
    
    // Get Supabase URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      console.error('Missing Supabase URL for AI content generation');
      return getAIResponse(message, pageType, currentContent);
    }
    
    // Call secure edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-ai-content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        pageType,
        currentContent
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('AI content generation error:', errorData);
      
      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = errorData.retryAfter || 60;
        throw new Error(`Please wait ${retryAfter} seconds before trying again.`);
      }
      
      // Fall back to template response
      return getAIResponse(message, pageType, currentContent);
    }
    
    const data = await response.json();
    return data.content || getAIResponse(message, pageType, currentContent);
    
  } catch (error) {
    console.error('Error generating AI content:', error);
    // Fall back to template response
    return getAIResponse(message, pageType, currentContent);
  }
}

function getAIResponse(message: string, pageType: string, currentContent?: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Privacy Policy responses
  if (pageType === 'privacy-policy' || lowerMessage.includes('privacy')) {
    if (lowerMessage.includes('gdpr') || lowerMessage.includes('compliance')) {
      return `## GDPR Compliance

We are committed to protecting your privacy in accordance with the General Data Protection Regulation (GDPR). As a data subject, you have the following rights:

**Right to Access:** You can request access to your personal data
**Right to Rectification:** You can request correction of inaccurate data
**Right to Erasure:** You can request deletion of your personal data
**Right to Portability:** You can request transfer of your data
**Right to Object:** You can object to processing of your data

To exercise these rights, contact us at privacy@caraudioevents.com

**Data Retention:** We retain personal data only as long as necessary for the purposes outlined in this policy or as required by law.

**International Transfers:** When we transfer data outside the EU, we ensure appropriate safeguards are in place.`;
    }
    
    if (lowerMessage.includes('data collection') || lowerMessage.includes('information')) {
      return `## Information We Collect

### Personal Information
- **Account Information:** Name, email address, phone number, and mailing address
- **Profile Data:** Competition preferences, team affiliations, and experience level
- **Payment Information:** Credit card details and billing information (processed securely)

### Event-Related Data
- **Registration Data:** Event preferences, dietary restrictions, and special accommodations
- **Competition Results:** Scores, rankings, and performance history
- **Photos and Videos:** Media from events (with your consent)

### Technical Information
- **Usage Data:** How you interact with our platform, pages visited, and features used
- **Device Information:** IP address, browser type, operating system, and device identifiers
- **Cookies:** We use cookies to enhance your experience and analyze site usage

### Communication Data
- **Support Interactions:** Messages, emails, and chat conversations with our team
- **Marketing Preferences:** Your communication preferences and subscription status`;
    }
    
    return `## Privacy Policy

### Our Commitment to Privacy
Car Audio Events is committed to protecting your privacy and ensuring the security of your personal information. This policy explains how we collect, use, and safeguard your data.

### Information Collection
We collect information when you:
- Create an account on our platform
- Register for events or competitions
- Make purchases or payments
- Contact our support team
- Subscribe to newsletters or updates

### Data Usage
Your information helps us:
- Provide and improve our services
- Process event registrations and payments
- Send important updates and notifications
- Ensure platform security and prevent fraud
- Comply with legal requirements

### Data Protection
We implement industry-standard security measures to protect your information, including encryption, secure servers, and regular security audits.`;
  }
  
  // Terms of Service responses
  if (pageType === 'terms-of-service' || lowerMessage.includes('terms')) {
    if (lowerMessage.includes('user responsibilities') || lowerMessage.includes('responsibilities')) {
      return `## User Responsibilities

### Account Security
- Maintain the confidentiality of your login credentials
- Notify us immediately of any unauthorized account access
- Use strong passwords and enable two-factor authentication when available
- Do not share your account with others

### Acceptable Use
- Use the platform only for lawful purposes
- Respect other users and maintain professional conduct
- Do not post inappropriate, offensive, or harmful content
- Follow all event rules and safety regulations
- Respect intellectual property rights

### Event Participation
- Provide accurate information during registration
- Arrive on time and prepared for events
- Follow all competition rules and guidelines
- Treat equipment, venues, and other participants with respect
- Accept judges' decisions gracefully

### Content Guidelines
- Ensure all uploaded content is appropriate and legal
- Do not post copyrighted material without permission
- Respect privacy of other participants
- Report inappropriate behavior or content`;
    }
    
    if (lowerMessage.includes('liability') || lowerMessage.includes('limitations')) {
      return `## Limitation of Liability

### Platform Disclaimer
Car Audio Events provides this platform "as is" without warranties of any kind. We strive for accuracy but cannot guarantee:
- Uninterrupted service availability
- Error-free operation
- Complete accuracy of all information
- Compatibility with all devices or browsers

### Event Participation Risks
Participation in car audio events involves inherent risks. By participating, you acknowledge:
- Physical risks associated with loud sound levels
- Potential equipment damage during competitions
- Risk of injury from electrical equipment or installations
- Responsibility for your own safety and equipment

### Liability Limitations
To the maximum extent permitted by law, Car Audio Events shall not be liable for:
- Indirect, incidental, or consequential damages
- Loss of profits, data, or business opportunities
- Damages exceeding the amount paid for services
- Third-party actions or content

### Indemnification
You agree to indemnify and hold harmless Car Audio Events from claims arising from your use of the platform or participation in events.`;
    }
    
    return `## Terms of Service

### Agreement Acceptance
By using Car Audio Events, you agree to these terms and conditions. If you disagree with any part of these terms, please do not use our platform.

### Service Description
Car Audio Events provides a platform for:
- Discovering and registering for car audio competitions
- Connecting with the car audio community
- Managing event participation and results
- Accessing industry resources and information

### User Accounts
- You must be at least 18 years old to create an account
- Provide accurate and complete registration information
- Maintain the security of your account credentials
- Accept responsibility for all account activity

### Payment Terms
- Registration fees are due at the time of booking
- Refunds are subject to our cancellation policy
- We reserve the right to change pricing with notice
- All payments are processed securely through trusted providers`;
  }
  
  // About page responses
  if (pageType === 'about' || lowerMessage.includes('about')) {
    if (lowerMessage.includes('mission') || lowerMessage.includes('values')) {
      return `## Our Mission & Values

### Mission Statement
To elevate the car audio industry by creating the premier platform where enthusiasts, competitors, and professionals connect, compete, and celebrate their passion for exceptional sound.

### Our Values

**Excellence:** We strive for the highest standards in everything we do, from platform functionality to event organization.

**Community:** We believe in fostering a welcoming, inclusive environment where all car audio enthusiasts can thrive.

**Innovation:** We continuously evolve our platform to meet the changing needs of the car audio community.

**Integrity:** We operate with transparency, fairness, and honesty in all our interactions.

**Passion:** We share your love for car audio and are dedicated to supporting this amazing community.

### Our Vision
To be the global hub for car audio excellence, where every enthusiast can find their place, every competitor can showcase their skills, and every business can connect with their ideal customers.`;
    }
    
    if (lowerMessage.includes('team') || lowerMessage.includes('staff')) {
      return `## Our Team

### Leadership
Our experienced team combines deep industry knowledge with technical expertise to deliver the best possible platform for the car audio community.

**Founder & CEO:** Passionate car audio enthusiast with over 15 years in the industry
**CTO:** Technology leader with expertise in platform development and user experience
**Community Manager:** Dedicated to fostering connections and supporting our users
**Event Coordinators:** Experienced professionals ensuring smooth, fair competitions

### Advisory Board
We're proud to work with respected industry veterans who guide our strategic direction and ensure we serve the community's best interests.

### Community Contributors
Our platform thrives thanks to the active participation of:
- Event organizers who create amazing competitions
- Judges who ensure fair and professional scoring
- Competitors who bring their passion and skills
- Enthusiasts who make our community vibrant and welcoming

### Join Our Team
We're always looking for talented individuals who share our passion for car audio. Check our careers page for current opportunities.`;
    }
    
    return `## About Car Audio Events

### Who We Are
Car Audio Events is the premier platform connecting the global car audio community. We bring together competitors, enthusiasts, organizers, and industry professionals in one comprehensive ecosystem.

### What We Do
- **Event Discovery:** Find competitions, meets, and exhibitions worldwide
- **Competition Management:** Professional tools for organizers and judges
- **Community Building:** Connect with fellow enthusiasts and professionals
- **Industry Resources:** Access to the latest news, trends, and educational content

### Our Story
Founded by passionate car audio enthusiasts, we recognized the need for a centralized platform that could serve the entire community. From local sound-offs to international championships, we provide the tools and connections that make great events possible.

### Why Choose Us
- **Comprehensive Platform:** Everything you need in one place
- **Professional Standards:** Industry-leading event management tools
- **Global Reach:** Connect with the worldwide car audio community
- **Trusted by Thousands:** Used by competitors, organizers, and businesses worldwide

### Get Involved
Whether you're a competitor looking for your next challenge, an organizer planning an event, or a business wanting to connect with customers, Car Audio Events is your gateway to the car audio world.`;
  }
  
  // General content assistance
  if (lowerMessage.includes('improve') || lowerMessage.includes('better')) {
    return `I'd be happy to help improve your content! Here are some suggestions based on best practices:

**Structure Improvements:**
- Start with a compelling headline that clearly states the page purpose
- Use descriptive subheadings to break up content into digestible sections
- Include bullet points or numbered lists for easy scanning
- Add a clear call-to-action at the end

**Content Enhancements:**
- Write in an active voice for more engaging content
- Use specific examples relevant to the car audio industry
- Include benefits and value propositions for your users
- Add social proof like testimonials or user statistics

**SEO Optimization:**
- Include relevant keywords naturally throughout the content
- Use proper heading hierarchy (H1, H2, H3)
- Write compelling meta descriptions
- Add internal links to related pages

**User Experience:**
- Keep paragraphs short and readable
- Use conversational tone while maintaining professionalism
- Address common user questions and concerns
- Ensure mobile-friendly formatting

Would you like me to help with any specific section or provide more detailed suggestions?`;
  }
  
  if (lowerMessage.includes('write') || lowerMessage.includes('create')) {
    return `I can help you create professional content for your car audio events platform! Here's what I can assist with:

**Content Types:**
- **Legal Pages:** Privacy policies, terms of service, cookie policies
- **Company Pages:** About us, team bios, company history
- **Help Documentation:** User guides, FAQs, troubleshooting
- **Marketing Content:** Landing pages, feature descriptions, announcements
- **Event Content:** Competition rules, safety guidelines, judging criteria

**Writing Approach:**
- **Industry-Specific:** Tailored for the car audio community
- **Professional Tone:** Appropriate for business and legal content
- **User-Friendly:** Clear, accessible language for all skill levels
- **SEO-Optimized:** Includes relevant keywords and proper structure
- **Compliance-Ready:** Meets legal and regulatory requirements

**Content Features:**
- Engaging headlines and introductions
- Well-organized sections with clear headings
- Actionable information and clear next steps
- Professional formatting and structure
- Mobile-responsive design considerations

What specific type of content would you like me to help you create? Just let me know the page purpose and any specific requirements!`;
  }
  
  // Default helpful response
  return `I'm here to help you create amazing content for your car audio events platform! I can assist with:

**Content Creation:**
• Write professional pages from scratch
• Create engaging copy that converts
• Develop industry-specific content
• Ensure legal compliance for policies

**Content Improvement:**
• Enhance existing text for better readability
• Optimize for search engines (SEO)
• Improve structure and organization
• Add compelling calls-to-action

**Specialized Content:**
• Privacy policies and terms of service
• About us and company information
• Event rules and competition guidelines
• User guides and help documentation

**Platform-Specific Features:**
• Car audio industry terminology
• Competition and event language
• Community-focused messaging
• Professional yet approachable tone

What would you like me to help you write or improve today? Just describe what you need, and I'll create content that fits perfectly with your car audio events platform!`;
} 