/**
 * Registration Validator - Detects and prevents bogus/spam registrations
 */

// Common fake/test addresses that spammers use
const BOGUS_ADDRESS_PATTERNS = [
  // Generic test addresses
  /^123\s+main\s+(st|street|ave|avenue|road|rd)/i,
  /^123\s+fake\s+/i,
  /^111\s+test\s+/i,
  /^1234\s+abcd/i,
  /^test\s+(street|ave|road)/i,
  /^fake\s+(street|ave|road)/i,
  /^asdf/i,
  /^qwerty/i,
  /^abc\s+123/i,
  /^xxx\s+xxx/i,
  
  // Single letters or numbers repeated
  /^([a-z])\1{3,}/i,
  /^(\d)\1{3,}/i,
  
  // Just numbers or single words
  /^\d+$/,
  /^[a-z]+$/i,
  
  // Common spam patterns
  /^no\s+address/i,
  /^none/i,
  /^n\/a/i,
  /^not\s+applicable/i,
];

// Fake city names
const BOGUS_CITIES = [
  'faketown',
  'testville',
  'testcity',
  'fakecity',
  'asdf',
  'qwerty',
  'test',
  'fake',
  'none',
  'na',
  'n/a',
  'xxx',
  'abc',
  '123'
];

// Common test/fake names
const BOGUS_NAMES = [
  { first: 'test', last: 'user' },
  { first: 'john', last: 'doe' },
  { first: 'jane', last: 'doe' },
  { first: 'foo', last: 'bar' },
  { first: 'asdf', last: 'asdf' },
  { first: 'first', last: 'last' },
  { first: 'fname', last: 'lname' },
  { first: 'abc', last: 'xyz' },
  { first: 'xxx', last: 'xxx' },
];

// Invalid phone patterns
const INVALID_PHONE_PATTERNS = [
  /^(\d)\1{9,}$/, // Same digit repeated (1111111111)
  /^0{10}$/, // All zeros
  /^123456789\d?$/, // Sequential numbers
  /^555555\d{4}$/, // 555-555-XXXX (often used in movies/fake)
  /^(\d{3})\1{2}\d?$/, // Repeated area code pattern
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateAddress(address: string): ValidationResult {
  const errors: string[] = [];
  
  if (!address || address.trim().length < 5) {
    errors.push('Address is too short');
    return { isValid: false, errors };
  }
  
  const trimmedAddress = address.trim().toLowerCase();
  
  // Check against bogus patterns
  for (const pattern of BOGUS_ADDRESS_PATTERNS) {
    if (pattern.test(trimmedAddress)) {
      errors.push('Please enter a valid street address. Generic or test addresses are not accepted.');
      return { isValid: false, errors };
    }
  }
  
  // Check for minimum complexity (should have both letters and numbers)
  if (!/\d/.test(address) || !/[a-z]/i.test(address)) {
    errors.push('Please enter a complete street address including the street number.');
    return { isValid: false, errors };
  }
  
  // Check for profanity (basic check)
  const profanityPatterns = [/\bf+u+c+k/i, /\bs+h+i+t/i, /\bd+a+m+n/i];
  for (const pattern of profanityPatterns) {
    if (pattern.test(trimmedAddress)) {
      errors.push('Please enter a appropriate address without profanity.');
      return { isValid: false, errors };
    }
  }
  
  return { isValid: true, errors: [] };
}

export function validateCity(city: string): ValidationResult {
  const errors: string[] = [];
  
  if (!city || city.trim().length < 2) {
    errors.push('City name is too short');
    return { isValid: false, errors };
  }
  
  const trimmedCity = city.trim().toLowerCase();
  
  // Check against bogus cities
  if (BOGUS_CITIES.includes(trimmedCity)) {
    errors.push('Please enter a valid city name.');
    return { isValid: false, errors };
  }
  
  // Should only contain letters, spaces, hyphens, and apostrophes
  if (!/^[a-z\s\-']+$/i.test(city.trim())) {
    errors.push('City name contains invalid characters.');
    return { isValid: false, errors };
  }
  
  return { isValid: true, errors: [] };
}

export function validateName(firstName: string, lastName: string): ValidationResult {
  const errors: string[] = [];
  
  if (!firstName || firstName.trim().length < 2) {
    errors.push('First name is too short');
  }
  
  if (!lastName || lastName.trim().length < 2) {
    errors.push('Last name is too short');
  }
  
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  
  const firstLower = firstName.trim().toLowerCase();
  const lastLower = lastName.trim().toLowerCase();
  
  // Check against known fake names
  const isFakeName = BOGUS_NAMES.some(
    fake => fake.first === firstLower && fake.last === lastLower
  );
  
  if (isFakeName) {
    errors.push('Please enter your real name. Test names are not accepted.');
    return { isValid: false, errors };
  }
  
  // Check for repeated characters
  if (/^(.)\1+$/.test(firstName) || /^(.)\1+$/.test(lastName)) {
    errors.push('Please enter a valid name.');
    return { isValid: false, errors };
  }
  
  // Names should primarily contain letters (allowing for hyphens, apostrophes, spaces)
  const namePattern = /^[a-z\s\-']+$/i;
  if (!namePattern.test(firstName) || !namePattern.test(lastName)) {
    errors.push('Names should only contain letters, hyphens, and apostrophes.');
    return { isValid: false, errors };
  }
  
  return { isValid: true, errors: [] };
}

export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];
  
  if (!phone || phone.trim().length < 10) {
    errors.push('Phone number is too short');
    return { isValid: false, errors };
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10) {
    errors.push('Phone number must have at least 10 digits');
    return { isValid: false, errors };
  }
  
  // Check against invalid patterns
  for (const pattern of INVALID_PHONE_PATTERNS) {
    if (pattern.test(digitsOnly)) {
      errors.push('Please enter a valid phone number. Test numbers are not accepted.');
      return { isValid: false, errors };
    }
  }
  
  // Check for obviously fake numbers
  if (digitsOnly.startsWith('0000000') || digitsOnly.startsWith('1234567')) {
    errors.push('Please enter a valid phone number.');
    return { isValid: false, errors };
  }
  
  return { isValid: true, errors: [] };
}

export function validateCompleteProfile(data: {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}): ValidationResult {
  const errors: string[] = [];
  
  // Validate name
  const nameValidation = validateName(data.firstName, data.lastName);
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors);
  }
  
  // Validate phone
  const phoneValidation = validatePhone(data.phone);
  if (!phoneValidation.isValid) {
    errors.push(...phoneValidation.errors);
  }
  
  // Validate address
  const addressValidation = validateAddress(data.address);
  if (!addressValidation.isValid) {
    errors.push(...addressValidation.errors);
  }
  
  // Validate city
  const cityValidation = validateCity(data.city);
  if (!cityValidation.isValid) {
    errors.push(...cityValidation.errors);
  }
  
  // Basic state validation (should be selected from dropdown)
  if (!data.state || data.state.trim().length === 0) {
    errors.push('Please select a state/province');
  }
  
  // Basic zip validation (handled by country-specific validation)
  if (!data.zip || data.zip.trim().length === 0) {
    errors.push('Please enter a postal code');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// Additional utility to check for VPN/proxy (can be enhanced later)
export function checkSuspiciousActivity(data: {
  ipAddress?: string;
  userAgent?: string;
  registrationTime?: Date;
}): { suspicious: boolean; reason?: string } {
  // This is a placeholder for more advanced checks
  // In production, you might want to:
  // 1. Check IP against known VPN/proxy lists
  // 2. Check for rapid registrations from same IP
  // 3. Check for automated user agents
  // 4. Check for suspicious timing patterns
  
  return { suspicious: false };
}