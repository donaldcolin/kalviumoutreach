import { format as dateFnsFormat } from 'date-fns';

export function format(date: Date | number, formatStr: string, options?: any): string {
  try {
    let d = date;
    if (!(d instanceof Date)) {
      d = new Date(d);
    }
    
    // If the date is invalid, new Date() creates an object whose getTime() is NaN.
    if (isNaN(d.getTime())) {
      console.warn(`[safeFormat] Invalid Date passed to format:`, date);
      return ''; // Gracefully fallback to empty string instead of crashing
    }

    return dateFnsFormat(d, formatStr, options);
  } catch (err) {
    console.error(`[safeFormat] Exception in formatting date:`, err);
    return ''; // Crash prevention
  }
}

export function parseSafeDate(dateStr: string | number | Date | null | undefined): Date {
  if (!dateStr) return new Date();
  
  if (dateStr instanceof Date) {
    if (!isNaN(dateStr.getTime())) return new Date(dateStr.getTime());
    return new Date();
  }

  // Handle space-separated date strings like "2023-10-12 10:00:00" which fail on older Hermes/JSC
  if (typeof dateStr === 'string' && dateStr.includes(' ') && !dateStr.includes('T')) {
    dateStr = dateStr.replace(' ', 'T');
    if (!dateStr.endsWith('Z')) {
      dateStr += 'Z'; // Force ISO 8601 parsing approximation
    }
  }

  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return new Date(); // Fallback to now if totally unparseable
  }
  
  return d;
}
