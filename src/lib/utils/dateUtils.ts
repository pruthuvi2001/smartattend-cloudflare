export const DEFAULT_TIMEZONE = "Asia/Colombo";

/**
 * Returns a normalized YYYY-MM-DD date string for a given date in the specified timezone.
 * Defaults to Asia/Colombo.
 */
export function getNormalizedDate(dateInput?: Date | string | number, timezone: string = DEFAULT_TIMEZONE): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // en-CA produces YYYY-MM-DD
  } catch {
    // Fallback if timezone string is invalid
    return date.toISOString().split('T')[0];
  }
}

/**
 * Formats a given date/time into a clean 12-hour string (e.g., "08:32 AM") in the specified timezone.
 */
export function format12HourTime(dateInput?: Date | string | number, timezone: string = DEFAULT_TIMEZONE): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return "--:-- --";

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return formatter.format(date);
  } catch {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }
}

/**
 * Formats a YYYY-MM-DD string into a human-readable date e.g. "01 Sep 2026"
 */
export function formatDisplayDate(dateStr: string, timezone: string = DEFAULT_TIMEZONE): string {
  if (!dateStr) return "";
  try {
    // Append T12:00:00 to avoid UTC day boundary shift
    const date = new Date(`${dateStr}T12:00:00`);
    if (isNaN(date.getTime())) return dateStr;

    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return formatter.format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Returns full date time string for auditing e.g. "01 Sep 2026, 08:32:15 AM"
 */
export function formatFullDateTime(dateInput?: Date | string | number, timezone: string = DEFAULT_TIMEZONE): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return "";

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return formatter.format(date);
  } catch {
    return date.toLocaleString();
  }
}
