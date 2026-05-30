/**
 * US Stock Market Hours & Holidays Checker
 *
 * NYSE / NASDAQ regular trading hours:
 *   Mon-Fri, 9:30 AM - 4:00 PM Eastern Time
 *
 * Pre-market:  4:00 AM - 9:30 AM ET
 * After-hours: 4:00 PM - 8:00 PM ET
 *
 * Holidays are calculated dynamically for any year using known US holiday rules.
 * No hardcoded year-specific data needed.
 */

// ── Holiday Calculator ──

/** Nth weekday of a month. weekday: 0=Sun...6=Sat */
function nthWeekday(year: number, month: number, weekday: number, n: number): Date {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const offset = (weekday - first.getUTCDay() + 7) % 7;
    const date = 1 + offset + (n - 1) * 7;
    return new Date(Date.UTC(year, month - 1, date));
}

/** Last weekday of a month */
function lastWeekday(year: number, month: number, weekday: number): Date {
    // Start from last day of month and work backwards
    const lastDay = new Date(Date.UTC(year, month, 0)); // day 0 of next month = last day
    let d = lastDay.getUTCDate();
    while (new Date(Date.UTC(year, month - 1, d)).getUTCDay() !== weekday) d--;
    return new Date(Date.UTC(year, month - 1, d));
}

/**
 * Compute Easter Sunday using Gauss algorithm (works 1900-2099).
 * Returns Date in UTC.
 */
function easterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month - 1, day));
}

/**
 * If a fixed-date holiday falls on Sat, observe Fri before.
 * If Sun, observe Mon after.
 */
function observedDate(year: number, month: number, day: number): Date {
    const d = new Date(Date.UTC(year, month - 1, day));
    const dow = d.getUTCDay();
    if (dow === 6) return new Date(Date.UTC(year, month - 1, day - 1)); // Sat → Fri
    if (dow === 0) return new Date(Date.UTC(year, month - 1, day + 1)); // Sun → Mon
    return d;
}

/**
 * Generate all US stock market holidays for a given year.
 * Returns Date objects in UTC.
 */
function getHolidaysForYear(year: number): Date[] {
    const holidays: Date[] = [];

    // New Year's Day — Jan 1 (observed if weekend)
    holidays.push(observedDate(year, 1, 1));

    // Martin Luther King Jr. Day — 3rd Monday of January
    holidays.push(nthWeekday(year, 1, 1, 3));

    // Presidents' Day — 3rd Monday of February
    holidays.push(nthWeekday(year, 2, 1, 3));

    // Good Friday — 2 days before Easter Sunday
    const easter = easterSunday(year);
    const goodFri = new Date(easter.getTime() - 2 * 86400000);
    holidays.push(goodFri);

    // Memorial Day — Last Monday of May
    holidays.push(lastWeekday(year, 5, 1));

    // Juneteenth — June 19 (observed if weekend)
    holidays.push(observedDate(year, 6, 19));

    // Independence Day — July 4 (observed if weekend)
    holidays.push(observedDate(year, 7, 4));

    // Labor Day — 1st Monday of September
    holidays.push(nthWeekday(year, 9, 1, 1));

    // Thanksgiving — 4th Thursday of November
    holidays.push(nthWeekday(year, 11, 4, 4));

    // Christmas — December 25 (observed if weekend)
    holidays.push(observedDate(year, 12, 25));

    return holidays;
}

/**
 * Check if a given date is a US market holiday
 */
export function isUSHoliday(d: Date): boolean {
    const year = d.getUTCFullYear();
    const holidays = getHolidaysForYear(year);
    // Also check adjacent years for holidays observed before/after New Year
    if (year > 1900) holidays.push(...getHolidaysForYear(year - 1));
    holidays.push(...getHolidaysForYear(year + 1));
    
    const ts = d.getTime();
    return holidays.some(h => Math.abs(h.getTime() - ts) < 86400000 && 
        h.getUTCMonth() === d.getUTCMonth() && 
        h.getUTCDate() === d.getUTCDate());
}

/**
 * Get Eastern Time offset from UTC based on current date.
 * EDT (daylight saving): UTC-4
 * EST (standard): UTC-5
 * 
 * DST starts 2nd Sunday March, ends 1st Sunday November
 */
export function getETOffset(d: Date): number {
    const year = d.getUTCFullYear();
    const march8 = new Date(Date.UTC(year, 2, 8)); // March 8 — first candidate
    const nov1 = new Date(Date.UTC(year, 10, 1)); // November 1 — first candidate

    // Find 2nd Sunday of March
    let dstStart = new Date(march8);
    while (dstStart.getUTCDay() !== 0) dstStart.setUTCDate(dstStart.getUTCDate() + 1);
    // Find 1st Sunday of November
    let dstEnd = new Date(nov1);
    while (dstEnd.getUTCDay() !== 0) dstEnd.setUTCDate(dstEnd.getUTCDate() + 1);

    const ts = d.getTime();
    // DST: 2nd Sun Mar 2AM ET → 1st Sun Nov 2AM ET
    return (ts >= dstStart.getTime() && ts < dstEnd.getTime()) ? -4 : -5;
}

/**
 * Get Eastern Time date components from a Date object
 */
function getETDate(d: Date): { hour: number; minute: number; dayOfWeek: number; month: number; day: number } {
    const offset = getETOffset(d);
    const etMs = d.getTime() + offset * 3600000;
    const et = new Date(etMs);
    return {
        hour: et.getUTCHours(),
        minute: et.getUTCMinutes(),
        dayOfWeek: et.getUTCDay(), // 0=Sun, 1=Mon, ..., 6=Sat
        month: et.getUTCMonth() + 1,
        day: et.getUTCDate(),
    };
}

/**
 * Check if US stock market is currently in regular trading hours
 * (Mon-Fri, 9:30 AM - 4:00 PM ET)
 */
export function isMarketOpen(): boolean {
    const now = new Date();
    const et = getETDate(now);

    // Weekend check (ET)
    if (et.dayOfWeek === 0 || et.dayOfWeek === 6) return false;

    // Holiday check (based on ET date)
    if (isUSHoliday(new Date(now.getTime() + getETOffset(now) * 3600000))) return false;

    // Time check: 9:30 AM - 4:00 PM ET
    const minutesSinceMidnight = et.hour * 60 + et.minute;
    return minutesSinceMidnight >= 570 && minutesSinceMidnight < 960; // 9:30 = 570, 16:00 = 960
}

/**
 * Check if market is in pre-market (4:00-9:30 AM ET, same day)
 */
export function isPreMarket(): boolean {
    const now = new Date();
    const et = getETDate(now);
    if (et.dayOfWeek === 0 || et.dayOfWeek === 6) return false;
    if (isUSHoliday(new Date(now.getTime() + getETOffset(now) * 3600000))) return false;
    const minutesSinceMidnight = et.hour * 60 + et.minute;
    return minutesSinceMidnight >= 240 && minutesSinceMidnight < 570; // 4:00-9:30
}

/**
 * Get a human-readable status of the market
 */
export function getMarketStatus(): { isOpen: boolean; label: string; nextOpen: string } {
    const now = new Date();
    const et = getETDate(now);
    const offset = getETOffset(now);
    const etNow = new Date(now.getTime() + offset * 3600000);

    // Helper: format HH:MM ET
    const fmtET = (h: number, m: number = 0) =>
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ET`;

    // Holiday check
    if (isUSHoliday(etNow)) {
        return { isOpen: false, label: 'Market Closed — Holiday', nextOpen: 'Next trading day' };
    }

    // Weekend
    if (et.dayOfWeek === 0 || et.dayOfWeek === 6) {
        return { isOpen: false, label: 'Market Closed — Weekend', nextOpen: 'Monday 9:30 AM ET' };
    }

    const minutes = et.hour * 60 + et.minute;

    // Pre-market
    if (minutes >= 240 && minutes < 570) {
        return { isOpen: false, label: `Pre-market (${fmtET(et.hour, et.minute)})`, nextOpen: `9:30 AM ET (in ${Math.floor((570 - minutes) / 60)}h ${(570 - minutes) % 60}m)` };
    }

    // Regular hours
    if (minutes >= 570 && minutes < 960) {
        const closeIn = 960 - minutes;
        return { isOpen: true, label: `Open — ${fmtET(et.hour, et.minute)}`, nextOpen: `Closes at 4:00 PM ET (${Math.floor(closeIn / 60)}h ${closeIn % 60}m)` };
    }

    // After-hours / closed
    if (minutes >= 960 || minutes < 240) {
        return { isOpen: false, label: `Market Closed — ${fmtET(et.hour, et.minute)}`, nextOpen: 'Next trading day 9:30 AM ET' };
    }

    return { isOpen: false, label: 'Market Closed', nextOpen: 'Next trading day 9:30 AM ET' };
}
