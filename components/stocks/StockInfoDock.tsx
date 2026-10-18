'use client';

import { useState, type ReactNode } from 'react';

// Client Component owns only the tab switch. The panels arrive as already-
// rendered React nodes from the server page, because importing an async Server
// Component from a Client Component pulls it into the client graph and fails the
// render ("X is an async Client Component") — which silently un-hydrates every
// control on the stock page, the chart's timeframes and Transfer included.
export default function StockInfoDock({
    info,
    news,
}: {
    info: ReactNode;
    news: ReactNode;
}) {
    const [tab, setTab] = useState<'info' | 'news'>('info');

    return (
        <div className="border-t border-line">
            <div className="flex gap-1 px-2 pt-2">
                <button
                    type="button"
                    onClick={() => setTab('info')}
                    aria-pressed={tab === 'info'}
                    className={`pill text-[12px] ${tab === 'info' ? 'is-up' : ''}`}
                >
                    Company
                </button>
                <button
                    type="button"
                    onClick={() => setTab('news')}
                    aria-pressed={tab === 'news'}
                    className={`pill text-[12px] ${tab === 'news' ? 'is-up' : ''}`}
                >
                    News
                </button>
            </div>
            <div className="min-h-[80px]">{tab === 'info' ? info : news}</div>
        </div>
    );
}
