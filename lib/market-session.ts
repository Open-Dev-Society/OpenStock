// NYSE trading sessions, in New York minutes-of-day.
// ponytail: exchange holidays and half-days are ignored; add a holiday list if it matters.
export const PRE = 4 * 60, OPEN = 9 * 60 + 30, CLOSE = 16 * 60, AFTER_END = 20 * 60;
export const DAY = 24 * 60;

export type Phase = 'pre' | 'open' | 'after' | 'closed';

export function newYorkNow(date: Date) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
            .formatToParts(date).map((p) => [p.type, p.value]),
    );
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    return { weekday, minutes: Number(parts.hour) * 60 + Number(parts.minute), time: `${parts.hour.padStart(2, '0')}:${parts.minute}` };
}

export const isWeekday = (d: number) => d >= 1 && d <= 5;

export function sessionOf(weekday: number, minutes: number): { phase: Phase; line: string } {
    const until = (target: number) => formatSpan(target - minutes);
    if (isWeekday(weekday)) {
        if (minutes >= OPEN && minutes < CLOSE) return { phase: 'open', line: `Market open · closes in ${until(CLOSE)}` };
        if (minutes >= PRE && minutes < OPEN) return { phase: 'pre', line: `Pre-market · opens in ${until(OPEN)}` };
        if (minutes >= CLOSE && minutes < AFTER_END) return { phase: 'after', line: `After hours · ends in ${until(AFTER_END)}` };
        if (minutes < PRE) return { phase: 'closed', line: `Market closed · opens in ${until(OPEN)}` };
    }
    // Next weekday open, counting whole days from today
    let days = 1;
    while (!isWeekday((weekday + days) % 7)) days++;
    return { phase: 'closed', line: `Market closed · opens in ${formatSpan(days * DAY + OPEN - minutes)}` };
}

export function formatSpan(totalMinutes: number) {
    const d = Math.floor(totalMinutes / DAY);
    const h = Math.floor((totalMinutes % DAY) / 60);
    const m = totalMinutes % 60;
    if (d > 0) return `${d}d ${h}h`;
    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

