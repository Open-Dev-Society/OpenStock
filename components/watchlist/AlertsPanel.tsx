"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteAlert } from "@/lib/actions/alert.actions";
import { alertsEnabled } from "@/lib/market-data";
import { formatPrice } from "@/lib/utils";
import { tx, type Lang } from "@/lib/i18n";

type AlertRow = {
    _id: string;
    symbol: string;
    targetPrice: number;
    condition: 'ABOVE' | 'BELOW';
    triggered?: boolean;
    active?: boolean;
    expiresAt?: string;
};

const statusOf = (alert: AlertRow, lang: Lang) => {
    if (alert.triggered) return { label: tx(lang, 'alert.triggered'), className: 'pill is-brand' };
    if (!alertsEnabled) return { label: tx(lang, 'alert.paused'), className: 'pill' };
    if (alert.expiresAt && new Date(alert.expiresAt) < new Date()) return { label: tx(lang, 'alert.expired'), className: 'pill' };
    if (alert.active === false) return { label: tx(lang, 'alert.paused'), className: 'pill' };
    return { label: tx(lang, 'alert.watching'), className: 'pill is-up' };
};

export default function AlertsPanel({ alerts, lang }: { alerts: AlertRow[]; lang: Lang }) {
    const router = useRouter();
    const [pendingId, setPendingId] = useState<string | null>(null);

    const handleDelete = async (alert: AlertRow) => {
        setPendingId(alert._id);
        try {
            await deleteAlert(alert._id);
            toast.success(tx(lang, 'alert.removedMsg').replace('{s}', alert.symbol));
            router.refresh();
        } catch {
            toast.error(tx(lang, 'alert.removeFail'));
        } finally {
            setPendingId(null);
        }
    };

    if (alerts.length === 0 && !alertsEnabled) {
        return (
            <div className="empty-state py-10">
                <span className="empty-icon"><BellRing className="size-5" /></span>
                <h3>{tx(lang, 'alert.cloud')}</h3>
                <p className="max-w-64 text-[13px]">{tx(lang, 'alert.cloudSub')}</p>
                <Link href="/#data" className="btn btn-ghost mt-2">{tx(lang, 'alert.cloudBtn')}</Link>
            </div>
        );
    }

    if (alerts.length === 0) {
        return (
            <div className="empty-state py-10">
                <span className="empty-icon"><BellRing className="size-5" /></span>
                <h3>{tx(lang, 'alert.none')}</h3>
                <p className="max-w-60 text-[13px]">{tx(lang, 'alert.noneSub')}</p>
            </div>
        );
    }

    return (
        <>
            {!alertsEnabled && (
                <p className="px-3 pt-3 pb-1 text-[12.5px] text-faint">
                    {tx(lang, 'alert.pausedNote')}
                </p>
            )}
            <ul className="row-list">
                {alerts.map((alert) => {
                    const status = statusOf(alert, lang);
                    return (
                        <li key={alert._id} className="flex items-center gap-3 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                                <p className="mono font-semibold text-foreground">{alert.symbol}</p>
                                <p className="num truncate text-[12.5px] text-faint">
                                    {alert.condition === 'ABOVE' ? tx(lang, 'alert.above') : tx(lang, 'alert.below')} {formatPrice(alert.targetPrice)}
                                    {alert.expiresAt && !alert.triggered && ` · ${tx(lang, 'alert.until').replace('{d}', new Date(alert.expiresAt).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { month: 'short', day: 'numeric' }))}`}
                                </p>
                            </div>
                            <span className={status.className}>{status.label}</span>
                            <button
                                type="button"
                                onClick={() => handleDelete(alert)}
                                disabled={pendingId === alert._id}
                                className="icon-btn is-danger"
                                title={tx(lang, 'alert.remove')}
                                aria-label={`${tx(lang, 'alert.remove')} ${alert.symbol}`}
                            >
                                <Trash2 />
                            </button>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}
