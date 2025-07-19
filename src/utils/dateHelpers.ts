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
    
    // If it includes time, parse and format properly
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date:', dateString);
      return '';
    }
    
    // Get the year, month, day, hours, and minutes
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
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}