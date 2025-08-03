/**
 * Date Formatting Utilities for Consistent Date Display
 * 
 * Ensures consistent date formatting across the entire application
 * as required by QA standards.
 */

// Standard date format options
const DATE_FORMATS = {
  // Display formats
  SHORT_DATE: { year: 'numeric', month: '2-digit', day: '2-digit' } as const,
  LONG_DATE: { year: 'numeric', month: 'long', day: 'numeric' } as const,
  MEDIUM_DATE: { year: 'numeric', month: 'short', day: 'numeric' } as const,
  
  // Date and time formats
  SHORT_DATETIME: { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  } as const,
  
  LONG_DATETIME: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  } as const,
  
  // Time only
  TIME_ONLY: { hour: '2-digit', minute: '2-digit' } as const,
  TIME_WITH_SECONDS: { hour: '2-digit', minute: '2-digit', second: '2-digit' } as const
};

/**
 * Format date for display (MM/DD/YYYY)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    return dateObj.toLocaleDateString('en-US', DATE_FORMATS.SHORT_DATE);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
}

/**
 * Format date with long month name (January 1, 2024)
 */
export function formatLongDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    return dateObj.toLocaleDateString('en-US', DATE_FORMATS.LONG_DATE);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
}

/**
 * Format date with abbreviated month (Jan 1, 2024)
 */
export function formatMediumDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    return dateObj.toLocaleDateString('en-US', DATE_FORMATS.MEDIUM_DATE);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
}

/**
 * Format date and time (MM/DD/YYYY, HH:MM AM/PM)
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    return dateObj.toLocaleString('en-US', DATE_FORMATS.SHORT_DATETIME);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
}

/**
 * Format date and time with seconds
 */
export function formatLongDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    return dateObj.toLocaleString('en-US', DATE_FORMATS.LONG_DATETIME);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
}

/**
 * Format time only (HH:MM AM/PM)
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    return dateObj.toLocaleTimeString('en-US', DATE_FORMATS.TIME_ONLY);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (Math.abs(diffSec) < 60) {
      return diffSec >= 0 ? 'just now' : 'in a moment';
    } else if (Math.abs(diffMin) < 60) {
      return diffMin >= 0 ? `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago` : `in ${-diffMin} minute${-diffMin !== 1 ? 's' : ''}`;
    } else if (Math.abs(diffHour) < 24) {
      return diffHour >= 0 ? `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago` : `in ${-diffHour} hour${-diffHour !== 1 ? 's' : ''}`;
    } else if (Math.abs(diffDay) < 30) {
      return diffDay >= 0 ? `${diffDay} day${diffDay !== 1 ? 's' : ''} ago` : `in ${-diffDay} day${-diffDay !== 1 ? 's' : ''}`;
    } else {
      return formatDate(dateObj);
    }
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
}

/**
 * Format date for form inputs (YYYY-MM-DD)
 */
export function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    return dateObj.toISOString().split('T')[0];
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
}

/**
 * Format date for database storage (ISO 8601)
 */
export function formatDateForDatabase(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return null;
    
    return dateObj.toISOString();
  } catch (error) {
    console.error('Date formatting error:', error);
    return null;
  }
}

/**
 * Format date range (Jan 1 - Jan 3, 2024)
 */
export function formatDateRange(startDate: string | Date | null | undefined, endDate: string | Date | null | undefined): string {
  if (!startDate || !endDate) return 'N/A';
  
  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Invalid Date Range';
    
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const startMonth = start.getMonth();
    const endMonth = end.getMonth();
    
    // Same day
    if (start.toDateString() === end.toDateString()) {
      return formatMediumDate(start);
    }
    
    // Same month and year
    if (startYear === endYear && startMonth === endMonth) {
      const monthStr = start.toLocaleDateString('en-US', { month: 'short' });
      return `${monthStr} ${start.getDate()} - ${end.getDate()}, ${startYear}`;
    }
    
    // Same year
    if (startYear === endYear) {
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${startStr} - ${endStr}, ${startYear}`;
    }
    
    // Different years
    return `${formatMediumDate(start)} - ${formatMediumDate(end)}`;
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date Range';
  }
}

/**
 * Get current timestamp for database
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check if date is within a time window
 */
export function isWithinTimeWindow(date: string | Date, hours: number): boolean {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return false;
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours >= 0 && diffHours <= hours;
  } catch (error) {
    console.error('Date comparison error:', error);
    return false;
  }
}