export interface EmailVariable {
  name: string;
  description: string;
  example: string;
  category: 'user' | 'billing' | 'event' | 'system' | 'organization' | 'date' | 'invoice' | 'receipt' | 'estimate';
}

export const EMAIL_VARIABLES: EmailVariable[] = [
  // User Variables
  { name: '{{firstName}}', description: 'User\'s first name', example: 'John', category: 'user' },
  { name: '{{lastName}}', description: 'User\'s last name', example: 'Smith', category: 'user' },
  { name: '{{fullName}}', description: 'User\'s full name', example: 'John Smith', category: 'user' },
  { name: '{{email}}', description: 'User\'s email address', example: 'john.smith@example.com', category: 'user' },
  { name: '{{username}}', description: 'User\'s username', example: 'johnsmith123', category: 'user' },
  { name: '{{membershipLevel}}', description: 'User\'s membership level', example: 'Pro Competitor', category: 'user' },
  { name: '{{joinDate}}', description: 'Date user joined', example: 'January 15, 2024', category: 'user' },
  { name: '{{profileUrl}}', description: 'Link to user profile', example: 'https://caraudioevents.com/profile/john', category: 'user' },
  { name: '{{customerName}}', description: 'Customer name', example: 'John Smith', category: 'user' },
  { name: '{{contactName}}', description: 'Contact name', example: 'John Smith', category: 'user' },
  { name: '{{payeeName}}', description: 'Payee name', example: 'John Smith', category: 'user' },
  { name: '{{payerName}}', description: 'Payer name', example: 'John Smith', category: 'user' },

  // Date & Time Variables
  { name: '{{day}}', description: 'Current calendar day', example: '15', category: 'date' },
  { name: '{{dayPlus1}}', description: 'Next calendar day', example: '16', category: 'date' },
  { name: '{{dayMinus1}}', description: 'Previous calendar day', example: '14', category: 'date' },
  { name: '{{dayWeek}}', description: 'Current day of the week', example: 'Tuesday', category: 'date' },
  { name: '{{month}}', description: 'Current month', example: 'March', category: 'date' },
  { name: '{{monthPlus1}}', description: 'Next month', example: 'April', category: 'date' },
  { name: '{{monthMinus1}}', description: 'Previous month', example: 'February', category: 'date' },
  { name: '{{today}}', description: 'Today\'s date', example: 'March 15, 2024', category: 'date' },
  { name: '{{todayIntl}}', description: 'Today\'s date (international format)', example: '15/03/2024', category: 'date' },
  { name: '{{year}}', description: 'Current year', example: '2024', category: 'date' },
  { name: '{{yearPlus1}}', description: 'Next year', example: '2025', category: 'date' },
  { name: '{{yearMinus1}}', description: 'Previous year', example: '2023', category: 'date' },
  { name: '{{currentDate}}', description: 'Current date', example: 'March 15, 2024', category: 'date' },
  { name: '{{currentYear}}', description: 'Current year', example: '2024', category: 'date' },

  // Billing & Payment Variables
  { name: '{{invoiceNumber}}', description: 'Invoice number', example: 'INV-2024-001', category: 'billing' },
  { name: '{{invoiceDate}}', description: 'Invoice date', example: 'March 15, 2024', category: 'billing' },
  { name: '{{invoiceDueDate}}', description: 'Invoice due date', example: 'March 30, 2024', category: 'billing' },
  { name: '{{invoiceAmount}}', description: 'Invoice total amount', example: '$99.99', category: 'billing' },
  { name: '{{invoiceSubtotal}}', description: 'Invoice subtotal amount', example: '$89.99', category: 'billing' },
  { name: '{{invoiceTax}}', description: 'Invoice tax amount', example: '$10.00', category: 'billing' },
  { name: '{{invoiceDiscount}}', description: 'Invoice discount amount', example: '$5.00', category: 'billing' },
  { name: '{{paymentMethod}}', description: 'Payment method used', example: 'Visa ending in 4242', category: 'billing' },
  { name: '{{paymentDate}}', description: 'Date payment was made', example: 'March 20, 2024', category: 'billing' },
  { name: '{{paymentStatus}}', description: 'Current payment status', example: 'Paid', category: 'billing' },
  { name: '{{paymentAmount}}', description: 'Amount paid', example: '$99.99', category: 'billing' },
  { name: '{{subscriptionPlan}}', description: 'Subscription plan name', example: 'Pro Competitor Annual', category: 'billing' },
  { name: '{{subscriptionPrice}}', description: 'Subscription price', example: '$99.99/year', category: 'billing' },
  { name: '{{nextBillingDate}}', description: 'Next billing date', example: 'March 15, 2025', category: 'billing' },
  { name: '{{billingPeriod}}', description: 'Billing period', example: 'Annual', category: 'billing' },
  { name: '{{transactionId}}', description: 'Transaction ID', example: 'TXN-ABC123', category: 'billing' },
  { name: '{{receiptUrl}}', description: 'Link to receipt', example: 'https://caraudioevents.com/receipt/123', category: 'billing' },
  { name: '{{accountBalance}}', description: 'Current account balance', example: '$0.00', category: 'billing' },
  { name: '{{outstandingBalance}}', description: 'Outstanding balance', example: '$99.99', category: 'billing' },
  { name: '{{daysPastDue}}', description: 'Number of days past due', example: '15', category: 'billing' },
  { name: '{{referenceNumber}}', description: 'Reference number (e.g., check number)', example: 'CHK-12345', category: 'billing' },

  // Invoice Specific Variables
  { name: '{{amountDue}}', description: 'Invoice total amount due', example: '$99.99', category: 'invoice' },
  { name: '{{amountPaid}}', description: 'Invoice amount paid', example: '$50.00', category: 'invoice' },
  { name: '{{amountSubtotal}}', description: 'Invoice subtotal amount', example: '$89.99', category: 'invoice' },
  { name: '{{amountTax}}', description: 'Taxes invoiced total', example: '$10.00', category: 'invoice' },
  { name: '{{discount}}', description: 'Invoice discount rate', example: '10%', category: 'invoice' },
  { name: '{{invoicePo}}', description: 'Related PO number', example: 'PO-2024-001', category: 'invoice' },
  { name: '{{notes}}', description: 'Default invoice notes', example: 'Payment due within 30 days', category: 'invoice' },
  { name: '{{terms}}', description: 'Default invoice terms', example: 'Net 30', category: 'invoice' },
  { name: '{{invoiceBox}}', description: 'Box which says "View and pay now"', example: '[View and Pay Now]', category: 'invoice' },
  { name: '{{link}}', description: 'Invoice link (web version)', example: 'https://caraudioevents.com/invoice/123', category: 'invoice' },
  { name: '{{linkPdf}}', description: 'Invoice link (PDF version)', example: 'https://caraudioevents.com/invoice/123.pdf', category: 'invoice' },

  // Estimate Variables
  { name: '{{estimateNumber}}', description: 'Estimate number', example: 'EST-2024-001', category: 'estimate' },
  { name: '{{estimatePo}}', description: 'Related PO number', example: 'PO-2024-001', category: 'estimate' },
  { name: '{{estimateLink}}', description: 'Estimate link (web version)', example: 'https://caraudioevents.com/estimate/123', category: 'estimate' },
  { name: '{{estimateLinkPdf}}', description: 'Estimate link (PDF version)', example: 'https://caraudioevents.com/estimate/123.pdf', category: 'estimate' },
  { name: '{{estimateNotes}}', description: 'Default estimate notes', example: 'Valid for 30 days', category: 'estimate' },
  { name: '{{estimateTerms}}', description: 'Default estimate terms', example: 'Payment due upon acceptance', category: 'estimate' },

  // Receipt Variables
  { name: '{{receiptViewButton}}', description: 'Button to view receipt', example: '[View Receipt]', category: 'receipt' },

  // Event Variables
  { name: '{{eventName}}', description: 'Name of the event', example: 'Summer Car Audio Championships', category: 'event' },
  { name: '{{eventDate}}', description: 'Event date', example: 'July 15, 2024', category: 'event' },
  { name: '{{eventTime}}', description: 'Event time', example: '9:00 AM - 6:00 PM', category: 'event' },
  { name: '{{eventLocation}}', description: 'Event location', example: 'Phoenix Convention Center', category: 'event' },
  { name: '{{eventAddress}}', description: 'Event full address', example: '100 N 3rd St, Phoenix, AZ 85004', category: 'event' },
  { name: '{{eventUrl}}', description: 'Link to event details', example: 'https://caraudioevents.com/events/summer-2024', category: 'event' },
  { name: '{{registrationDeadline}}', description: 'Event registration deadline', example: 'July 10, 2024', category: 'event' },
  { name: '{{eventPrice}}', description: 'Event registration price', example: '$75.00', category: 'event' },
  { name: '{{eventCategory}}', description: 'Event category', example: 'Competition', category: 'event' },
  { name: '{{competitionClass}}', description: 'Competition class', example: 'Expert Class', category: 'event' },

  // System Variables
  { name: '{{dashboardUrl}}', description: 'Link to user dashboard', example: 'https://caraudioevents.com/dashboard', category: 'system' },
  { name: '{{loginUrl}}', description: 'Link to login page', example: 'https://caraudioevents.com/login', category: 'system' },
  { name: '{{supportUrl}}', description: 'Link to support page', example: 'https://caraudioevents.com/support', category: 'system' },
  { name: '{{contactEmail}}', description: 'Support contact email', example: 'support@caraudioevents.com', category: 'system' },
  { name: '{{websiteUrl}}', description: 'Main website URL', example: 'https://caraudioevents.com', category: 'system' },
  { name: '{{verificationCode}}', description: 'Email verification code', example: '123456', category: 'system' },
  { name: '{{resetToken}}', description: 'Password reset token', example: 'abc123def456', category: 'system' },
  { name: '{{expirationTime}}', description: 'Token expiration time', example: '24 hours', category: 'system' },

  // Organization/Company Variables
  { name: '{{companyName}}', description: 'Company name', example: 'Car Audio Events', category: 'organization' },
  { name: '{{companyAddress}}', description: 'Company address line', example: '123 Audio St', category: 'organization' },
  { name: '{{companyAddress2}}', description: 'Company address line 2', example: 'Suite 100', category: 'organization' },
  { name: '{{companyCity}}', description: 'Company city', example: 'Sound City', category: 'organization' },
  { name: '{{companyState}}', description: 'Company state/province', example: 'SC', category: 'organization' },
  { name: '{{companyZip}}', description: 'Company zip/postal code', example: '12345', category: 'organization' },
  { name: '{{companyCountry}}', description: 'Company country', example: 'United States', category: 'organization' },
  { name: '{{companyPhone}}', description: 'Company phone', example: '(555) 123-4567', category: 'organization' },
  { name: '{{companyEmail}}', description: 'Company email', example: 'info@caraudioevents.com', category: 'organization' },
  { name: '{{companyDescription}}', description: 'Company description', example: 'Premier car audio competition platform', category: 'organization' },
  { name: '{{companyWebsite}}', description: 'Company website link', example: 'https://caraudioevents.com', category: 'organization' },
  { name: '{{logoUrl}}', description: 'Company logo URL', example: 'https://caraudioevents.com/assets/logos/cae-logo-main.png', category: 'organization' },
  { name: '{{socialMediaLinks}}', description: 'Social media links', example: 'Facebook | Twitter | Instagram', category: 'organization' },
  { name: '{{privacyPolicyUrl}}', description: 'Privacy policy URL', example: 'https://caraudioevents.com/privacy', category: 'organization' },
  { name: '{{termsOfServiceUrl}}', description: 'Terms of service URL', example: 'https://caraudioevents.com/terms', category: 'organization' }
];

export const getVariablesByCategory = (category: string): EmailVariable[] => {
  return EMAIL_VARIABLES.filter(variable => variable.category === category);
};

export const getAllCategories = (): string[] => {
  const categories = [...new Set(EMAIL_VARIABLES.map(variable => variable.category))];
  return categories.sort();
};

export const replaceVariables = (content: string, data: Record<string, any>): string => {
  let result = content;
  
  EMAIL_VARIABLES.forEach(variable => {
    const key = variable.name.replace(/[{}]/g, ''); // Remove {{ }}
    if (data[key] !== undefined) {
      result = result.replace(new RegExp(variable.name.replace(/[{}]/g, '\\{\\}'), 'g'), data[key]);
    }
  });
  
  return result;
}; 