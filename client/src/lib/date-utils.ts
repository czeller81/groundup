import { format, parseISO, addMinutes, startOfDay, endOfDay, isToday, isBefore, isAfter, isSameDay } from 'date-fns';

// Format a date for display
export const formatDate = (date: Date | string, formatString = 'MMM dd, yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
};

// Format a time for display
export const formatTime = (date: Date | string, formatString = 'h:mm a'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
};

// Format a date range for display
export const formatDateRange = (start: Date | string, end: Date | string): string => {
  const startObj = typeof start === 'string' ? parseISO(start) : start;
  const endObj = typeof end === 'string' ? parseISO(end) : end;
  
  if (isSameDay(startObj, endObj)) {
    return `${formatDate(startObj)} ${formatTime(startObj)} - ${formatTime(endObj)}`;
  } else {
    return `${formatDate(startObj)} ${formatTime(startObj)} - ${formatDate(endObj)} ${formatTime(endObj)}`;
  }
};

// Get day name from date
export const getDayName = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'EEEE');
};

// Check if a date is in the past
export const isPastDate = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isBefore(dateObj, startOfDay(new Date()));
};

// Check if a date is today
export const isDateToday = (date: Date | string): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isToday(dateObj);
};

// Add minutes to a date
export const addMinutesToDate = (date: Date | string, minutes: number): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addMinutes(dateObj, minutes);
};

// Convert time string to Date object for a given date
export const timeStringToDate = (dateString: string, timeString: string): Date => {
  return new Date(`${dateString}T${timeString}`);
};

// Generate time slots for a day
export const generateTimeSlots = (startHour = 6, endHour = 22, intervalMinutes = 30): string[] => {
  const slots: string[] = [];
  const start = new Date();
  start.setHours(startHour, 0, 0, 0);
  
  const end = new Date();
  end.setHours(endHour, 0, 0, 0);
  
  let current = new Date(start);
  
  while (current < end) {
    slots.push(format(current, 'HH:mm'));
    current = addMinutes(current, intervalMinutes);
  }
  
  return slots;
};

// Check if two time ranges overlap
export const doTimeRangesOverlap = (
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string
): boolean => {
  const start1Obj = typeof start1 === 'string' ? parseISO(start1) : start1;
  const end1Obj = typeof end1 === 'string' ? parseISO(end1) : end1;
  const start2Obj = typeof start2 === 'string' ? parseISO(start2) : start2;
  const end2Obj = typeof end2 === 'string' ? parseISO(end2) : end2;
  
  return start1Obj < end2Obj && start2Obj < end1Obj;
};

// Get start and end of day for a given date
export const getDayBounds = (date: Date | string): { start: Date; end: Date } => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return {
    start: startOfDay(dateObj),
    end: endOfDay(dateObj)
  };
};

// Generate calendar invite (.ics) content
export const generateICSContent = (
  title: string,
  description: string,
  startDate: Date | string,
  endDate: Date | string,
  location?: string
): string => {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  const formatDateForICS = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss'Z'");
  };
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ground Up BJJ//Personal Training//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@groundupbjj.com`,
    `DTSTART:${formatDateForICS(start)}`,
    `DTEND:${formatDateForICS(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    location ? `LOCATION:${location}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
  
  return icsContent;
};

// Create and download ICS file
export const downloadICSFile = (
  filename: string,
  title: string,
  description: string,
  startDate: Date | string,
  endDate: Date | string,
  location?: string
): void => {
  const icsContent = generateICSContent(title, description, startDate, endDate, location);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
