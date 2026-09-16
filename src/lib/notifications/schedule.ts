/**
 * Scheduling helpers — pure timezone / quiet-hours maths, no delivery, no content.
 * Every decision is made in the user's own timezone, never in UTC.
 */

export interface LocalClock {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Minutes since local midnight. */
  minutes: number;
  /** 0 = Sunday. */
  dow: number;
}

/** Current wall-clock time in an IANA timezone. Falls back to UTC when invalid. */
export function localClock(timezone: string, now = new Date()): LocalClock {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    }).formatToParts(now);
  } catch {
    return localClock("UTC", now);
  }

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(get("hour") === "24" ? "0" : get("hour"));
  const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: hour * 60 + Number(get("minute")),
    dow: Math.max(0, dowNames.indexOf(get("weekday"))),
  };
}

/** "21:30" or "21:30:00" -> minutes since midnight. */
export function timeToMinutes(value: string): number {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

export function minutesToTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

/** Quiet hours may wrap past midnight (e.g. 22:00 → 06:30). */
export function inQuietHours(nowMinutes: number, start: string, end: string): boolean {
  const from = timeToMinutes(start);
  const to = timeToMinutes(end);
  return from <= to ? nowMinutes >= from && nowMinutes < to : nowMinutes >= from || nowMinutes < to;
}

/**
 * True when a scheduled time has just come up. The dispatcher runs every 15
 * minutes, so a matching window keeps reminders punctual without duplicates
 * (deduplication is handled separately by dedupe keys).
 */
export function isDue(nowMinutes: number, scheduled: string, windowMinutes = 20): boolean {
  const target = timeToMinutes(scheduled);
  return nowMinutes >= target && nowMinutes < target + windowMinutes;
}

/** Water reminders fire on an interval between waking and quiet hours. */
export function waterSlots(prefs: {
  quiet_hours_end: string;
  quiet_hours_start: string;
  water_interval_hours: number;
}): string[] {
  const start = timeToMinutes(prefs.quiet_hours_end) + 90;
  const end = timeToMinutes(prefs.quiet_hours_start) - 60;
  const step = Math.max(1, prefs.water_interval_hours) * 60;
  const slots: string[] = [];
  for (let minute = start; minute <= end && slots.length < 8; minute += step) {
    slots.push(minutesToTime(minute));
  }
  return slots;
}
