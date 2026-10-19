"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * Onto's Product Hunt launch, from the team behind OpenStock: a card pinned to the
 * corner of every page. Closing it hides it for this page only; it stops showing
 * on its own after launch week. Browser-only, so the server never renders it.
 */
const PH = "https://www.producthunt.com/products/onto-2?launch=onto-2";
const UNTIL = Date.parse("2026-10-03T00:00:00Z");

const noop = () => () => {};
const shouldShow = () => Date.now() < UNTIL;

export default function OntoLaunchCard() {
    const show = useSyncExternalStore(noop, shouldShow, () => false);
    const [closed, setClosed] = useState(false);
    if (!show || closed) return null;

    return (
        <aside
            aria-label="Onto on Product Hunt"
            className="fixed bottom-5 right-5 z-[60] w-[310px] rounded-2xl border border-[var(--line-strong)] bg-[var(--card)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.5)] max-sm:inset-x-3 max-sm:bottom-3 max-sm:w-auto"
        >
            <button
                type="button"
                onClick={() => setClosed(true)}
                aria-label="Close"
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-lg leading-none text-[var(--faint)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
            >
                ×
            </button>
            <p className="m-0 mb-2 flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--muted)]">
                {/* eslint-disable-next-line @next/next/no-img-element -- Onto's mark, served from its own site */}
                <img src="https://buildonto.dev/icon.png" alt="" width={16} height={16} className="h-4 w-4" />
                From the OpenStock team
            </p>
            <p className="m-0 text-base font-semibold leading-snug text-[var(--text)]">We just launched Onto on Product Hunt.</p>
            <p className="m-0 mt-1 mb-3 text-[13.5px] leading-relaxed text-[var(--muted)]">
                It makes websites readable to AI agents. If you like what we build, an upvote would mean a lot.
            </p>
            <a
                href={PH}
                target="_blank"
                rel="noopener"
                className="flex w-full items-center justify-center rounded-full bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--on-brand)] no-underline hover:bg-[var(--brand-strong)]"
            >
                ▲ Upvote Onto on Product Hunt
            </a>
        </aside>
    );
}
