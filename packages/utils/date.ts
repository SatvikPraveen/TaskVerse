// File: packages/utils/date.ts

import {
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  isToday,
  isTomorrow,
  isYesterday,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  parseISO,
  isValid,
} from 'date-fns';

/**
 * Format a date for display
 */
export const formatDate = (date: Date | string, pattern = 'MMM dd, yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return 'Invalid Date';
  return format(dateObj, pattern);
};

/**
 * Format a date and time for display
 */
export const formatDateTime = (date: Date | string, pattern = 'MMM dd, yyyy h:mm a'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return 'Invalid Date';
  return format(dateObj, pattern);
};

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return 'Invalid Date';
  
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

/**
 * Get a human-readable description of when the date is
 */
export const getDateDescription = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return 'Invalid Date';

  if (isToday(dateObj)) return 'Today';
  if (isTomorrow(dateObj)) return 'Tomorrow';
  if (isYesterday(dateObj)) return 'Yesterday';
  
  const daysDiff = differenceInDays(dateObj, new Date());
  if (daysDiff > 0 && daysDiff <= 7) return `In ${daysDiff} days`;
  if (daysDiff < 0 && daysDiff >= -7) return `${Math.abs(daysDiff)} days ago`;
  
  return formatDate(dateObj);
};

/**
 * Check if a date is overdue (past current date/time)
 */
export const isOverdue = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return false;
  return isBefore(dateObj, new Date());
};

/**
 * Check if a date is due soon (within next 3 days)
 */
export const isDueSoon = (date: Date | string, days = 3): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return false;
  
  const now = new Date();
  const soonThreshold = addDays(now, days);
  return isAfter(dateObj, now) && isBefore(dateObj, soonThreshold);
};

/**
 * Get the priority color based on due date
 */
export const getDueDatePriority = (date: Date | string): 'high' | 'medium' | 'low' => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return 'low';

  if (isOverdue(dateObj)) return 'high';
  if (isDueSoon(dateObj, 1)) return 'high';
  if (isDueSoon(dateObj, 3)) return 'medium';
  return 'low';
};

/**
 * Get date range presets
 */
export const getDateRangePresets = () => {
  const now = new Date();
  
  return {
    today: {
      start: startOfDay(now),
      end: endOfDay(now),
    },
    yesterday: {
      start: startOfDay(subDays(now, 1)),
      end: endOfDay(subDays(now, 1)),
    },
    thisWeek: {
      start: startOfWeek(now),
      end: endOfWeek(now),
    },
    lastWeek: {
      start: startOfWeek(subDays(now, 7)),
      end: endOfWeek(subDays(now, 7)),
    },
    thisMonth: {
      start: startOfMonth(now),
      end: endOfMonth(now),
    },
    next7Days: {
      start: now,
      end: addDays(now, 7),
    },
    next30Days: {
      start: now,
      end: addDays(now, 30),
    },
  };
};

/**
 * Parse and validate ISO date string
 */
export const parseISODate = (dateString: string): Date | null => {
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
};

/**
 * Convert Date to ISO string for API calls
 */
export const toISOString = (date: Date): string => {
  return date.toISOString();
};

/**
 * Get time remaining until a date
 */
export const getTimeRemaining = (date: Date | string): {
  days: number;
  hours: number;
  minutes: number;
  isOverdue: boolean;
} => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  
  if (!isValid(dateObj)) {
    return { days: 0, hours: 0, minutes: 0, isOverdue: false };
  }

  const isOverdueFlag = isBefore(dateObj, now);
  const targetDate = isOverdueFlag ? now : dateObj;
  const referenceDate = isOverdueFlag ? dateObj : now;

  const days = differenceInDays(targetDate, referenceDate);
  const hours = differenceInHours(targetDate, referenceDate) % 24;
  const minutes = differenceInMinutes(targetDate, referenceDate) % 60;

  return {
    days: Math.abs(days),
    hours: Math.abs(hours),
    minutes: Math.abs(minutes),
    isOverdue: isOverdueFlag,
  };
};

/**
 * Format time remaining as a human-readable string
 */
export const formatTimeRemaining = (date: Date | string): string => {
  const timeRemaining = getTimeRemaining(date);
  
  if (timeRemaining.isOverdue) {
    if (timeRemaining.days > 0) return `${timeRemaining.days} days overdue`;
    if (timeRemaining.hours > 0) return `${timeRemaining.hours} hours overdue`;
    return `${timeRemaining.minutes} minutes overdue`;
  }

  if (timeRemaining.days > 0) return `${timeRemaining.days} days left`;
  if (timeRemaining.hours > 0) return `${timeRemaining.hours} hours left`;
  return `${timeRemaining.minutes} minutes left`;
};

/**
 * Get timezone offset string
 */
export const getTimezoneOffset = (): string => {
  const offset = new Date().getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset > 0 ? '-' : '+';
  
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Check if two dates are on the same day
 */
export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  
  if (!isValid(d1) || !isValid(d2)) return false;
  
  return format(d1, 'yyyy-MM-dd') === format(d2, 'yyyy-MM-dd');
};

/**
 * Get calendar weeks for a month view
 */
export const getCalendarWeeks = (date: Date): Date[][] => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  let currentDate = calendarStart;
  
  while (isBefore(currentDate, calendarEnd) || isSameDay(currentDate, calendarEnd)) {
    currentWeek.push(new Date(currentDate));
    
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  return weeks;
};