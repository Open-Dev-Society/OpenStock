'use client';

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

import { AFTER_END, CLOSE, DAY, OPEN, PRE, isWeekday, newYorkNow, sessionOf, type Phase } from "@/lib/market-session";

function useNewYorkClock() {
    const [now, setNow] = useState<ReturnType<typeof newYorkNow> | null>(null);
    useEffect(() => {
        const tick = () => setNow(newYorkNow(new Date()));
        tick();
        const id = setInterval(tick, 15_000);
        return () => clearInterval(id);
    }, []);
    return now;
}

// The live session line for the hero; renders a stable line until the client knows the time.
export function MarketStatus() {
    const now = useNewYorkClock();
    const session = now ? sessionOf(now.weekday, now.minutes) : null;
    return (
        <span className="inline-flex h-8 items-center gap-2 rounded-full bg-card px-3.5 text-[13px] font-semibold text-muted-foreground shadow-[inset_0_0_0_1px_var(--line)]">
            <span className={cn('size-1.5 rounded-full', session?.phase === 'open' ? 'bg-up shadow-[0_0_0_3px_oklch(0.70_0.164_150/0.2)]' : session?.phase === 'closed' ? 'bg-faint' : 'bg-warn')} />
            <span className="num">{session?.line ?? 'NYSE · New York time'}</span>
        </span>
    );
}

const R = 88;
const C = 2 * Math.PI * R;
const ARCS: { phase: Phase; from: number; to: number; label: string }[] = [
    { phase: 'pre', from: PRE, to: OPEN, label: 'Pre' },
    { phase: 'open', from: OPEN, to: CLOSE, label: 'Regular' },
    { phase: 'after', from: CLOSE, to: AFTER_END, label: 'After' },
];

// A 24h dial of the New York trading day. Sessions that aren't happening now are hatched.
export function MarketDial() {
    const now = useNewYorkClock();
    const session = now ? sessionOf(now.weekday, now.minutes) : null;
    const weekend = now ? !isWeekday(now.weekday) : false;
    const markerAngle = now ? (now.minutes / DAY) * 360 : null;

    return (
        <figure className="mx-auto w-full max-w-[280px]" aria-label="New York trading sessions">
            <div className="relative aspect-square">
            <svg viewBox="0 0 220 220" className="size-full -rotate-90">
                <defs>
                    <pattern id="dial-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect width="5" height="5" fill="var(--frame)" />
                        <line x1="0" y1="0" x2="0" y2="5" stroke="var(--line-strong)" strokeWidth="1.4" />
                    </pattern>
                </defs>
                <circle cx="110" cy="110" r={R} fill="none" stroke="url(#dial-hatch)" strokeWidth="18" />
                {ARCS.map(({ phase, from, to }) => {
                    const active = !weekend && session?.phase === phase;
                    return (
                        <circle
                            key={phase}
                            cx="110" cy="110" r={R} fill="none"
                            strokeWidth="18"
                            strokeDasharray={`${((to - from) / DAY) * C} ${C}`}
                            strokeDashoffset={-(from / DAY) * C}
                            className={cn('transition-[stroke] duration-300', active ? 'stroke-brand' : phase === 'open' ? 'stroke-line-strong' : 'stroke-hover')}
                        />
                    );
                })}
                {markerAngle !== null && (
                    <g style={{ transform: `rotate(${markerAngle}deg)`, transformOrigin: '110px 110px' }}>
                        <line x1={110 + R - 14} y1="110" x2={110 + R + 14} y2="110" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round" />
                    </g>
                )}
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
                <span>
                    <span className="mono block text-[34px] font-medium tracking-[-0.04em] text-foreground">{now?.time ?? '--:--'}</span>
                    <span className="kicker">New York</span>
                </span>
            </div>
            </div>
            <ul className="mt-4 flex justify-center gap-4 text-[12px] text-faint">
                {ARCS.map(({ phase, label }) => (
                    <li key={phase} className="flex items-center gap-1.5">
                        <span className={cn('size-2 rounded-full', !weekend && session?.phase === phase ? 'bg-brand' : phase === 'open' ? 'bg-line-strong' : 'bg-hover')} />
                        {label}
                    </li>
                ))}
            </ul>
        </figure>
    );
}
