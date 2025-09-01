// apps/web/src/utils/date.ts
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, parseISO, isValid } from 'date-fns';

export function formatDate(date: string | Date, formatStr: string = 'MMM d, yyyy'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid date';
    return format(dateObj, formatStr);
  } catch {
    return 'Invalid date';
  }
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, 'MMM d, yyyy h:mm a');
}

export function formatTimeAgo(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid date';
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch {
    return 'Invalid date';
  }
}

export function formatRelativeDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 'Invalid date';
    
    if (isToday(dateObj)) {
      return 'Today';
    } else if (isTomorrow(dateObj)) {
      return 'Tomorrow';
    } else if (isYesterday(dateObj)) {
      return 'Yesterday';
    } else {
      return formatDate(dateObj, 'MMM d');
    }
  } catch {
    return 'Invalid date';
  }
}

export function isOverdue(date: string | Date): boolean {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return false;
    return dateObj < new Date();
  } catch {
    return false;
  }
}

export function getDaysUntil(date: string | Date): number {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 0;
    
    const now = new Date();
    const diffTime = dateObj.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch {
    return 0;
  }
}

export function formatDueDate(date: string | Date): { text: string; color: string } {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return { text: 'Invalid date', color: 'text-gray-500' };
    
    const daysUntil = getDaysUntil(dateObj);
    
    if (daysUntil < 0) {
      return {
        text: `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}`,
        color: 'text-red-600'
      };
    } else if (daysUntil === 0) {
      return {
        text: 'Due today',
        color: 'text-orange-600'
      };
    } else if (daysUntil === 1) {
      return {
        text: 'Due tomorrow',
        color: 'text-yellow-600'
      };
    } else if (daysUntil <= 7) {
      return {
        text: `Due in ${daysUntil} days`,
        color: 'text-yellow-600'
      };
    } else {
      return {
        text: formatDate(dateObj, 'MMM d'),
        color: 'text-gray-600'
      };
    }
  } catch {
    return { text: 'Invalid date', color: 'text-gray-500' };
  }
}

export function toISOString(date: Date): string {
  return date.toISOString();
}

export function fromISOString(dateString: string): Date {
  return parseISO(dateString);
}

export function formatInputDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return format(dateObj, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

export function formatInputDateTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return format(dateObj, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}