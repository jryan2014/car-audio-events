/**
 * Convert a date string from the database to a format suitable for datetime-local input
 * Handles timezone conversion to ensure the displayed time matches what was saved
 */
export function formatDateForInput(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    // If the date string is just a date (YYYY-MM-DD), return with default noon time
    // This happens when database columns are date-only type
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return `${dateString}T12:00`;
    }
    
    // CRITICAL FIX: Handle database timestamps correctly
    // If it's a timestamp from the database (YYYY-MM-DD HH:MM:SS format)
    // Just reformat it without timezone conversion
    if (dateString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)) {
      // Replace space with T and take only date and time parts
      const [datePart, timePart] = dateString.split(' ');
      const [hour, minute] = timePart.split(':');
      return `${datePart}T${hour}:${minute}`;
    }
    
    // If it's already in the correct format (YYYY-MM-DDTHH:MM)
    if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      return dateString;
    }
    
    // If it's an ISO string with timezone (ends with Z or has timezone offset)
    // Extract just the date and time parts WITHOUT timezone conversion
    if (dateString.includes('T')) {
      // Split on T to get date and time parts
      const [datePart, timeWithTz] = dateString.split('T');
      // Get just the HH:MM part, removing seconds and timezone
      const timeMatch = timeWithTz.match(/^(\d{2}):(\d{2})/);
      if (timeMatch) {
        return `${datePart}T${timeMatch[1]}:${timeMatch[2]}`;
      }
    }
    
    // As a last resort, try parsing but this can cause timezone issues
    console.warn('Using Date parsing as fallback for:', dateString);
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return '';
    }
    
    // Get the year, month, day, hours, and minutes in local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // Return in the format required by datetime-local input
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return '';
  }
}

/**
 * Convert a date string from the database to a format suitable for date input
 */
export function formatDateForDateInput(dateString: string | null | undefined): string {
  if (!dateString) return '';
  
  try {
    // If it's just a date string (YYYY-MM-DD), return as is
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateString;
    }
    
    // Otherwise parse and format
    const date = parseLocalDate(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Parse a date string as local date (not UTC)
 * This prevents timezone shifts when displaying dates
 */
export function parseLocalDate(dateString: string | null | undefined): Date {
  if (!dateString) return new Date();
  
  // If it's just a date (YYYY-MM-DD), parse it as local midnight
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Otherwise parse normally
  return new Date(dateString);
}

/**
 * Convert 24-hour time format to 12-hour format with AM/PM
 * @param time24 - Time in 24-hour format (e.g., "14:30", "08:00")
 * @returns Time in 12-hour format with AM/PM (e.g., "2:30 PM", "8:00 AM")
 */
export function formatTime12Hour(time24: string | null | undefined): string {
  if (!time24) return '';
  
  try {
    // Handle time strings that might have seconds
    const timeParts = time24.split(':');
    if (timeParts.length < 2) return time24; // Return original if invalid format
    
    let hours = parseInt(timeParts[0], 10);
    const minutes = timeParts[1];
    
    if (isNaN(hours)) return time24; // Return original if invalid
    
    // Determine AM/PM
    const period = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    if (hours === 0) {
      hours = 12; // Midnight
    } else if (hours > 12) {
      hours = hours - 12;
    }
    
    // Format the time string
    return `${hours}:${minutes} ${period}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return time24; // Return original on error
  }
}

/**
 * Convert a datetime-local input value to a PostgreSQL timestamp with time zone
 * This ensures the date and time are properly preserved when saving to the database
 */
export function formatDateForDatabase(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  
  try {
    // If it's already in the YYYY-MM-DDTHH:mm format from datetime-local input
    if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      // Append seconds and timezone to make it a valid ISO string
      // This preserves the exact time entered by the user
      return `${dateString}:00`;
    }
    
    // If it has seconds already, just return it
    if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return dateString;
    }
    
    // For other formats, parse and convert
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date for database:', dateString);
      return null;
    }
    
    // Return ISO string which PostgreSQL handles correctly
    return date.toISOString();
  } catch (error) {
    console.error('Error formatting date for database:', error, dateString);
    return null;
  }
}