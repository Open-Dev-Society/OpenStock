"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { deleteAlert } from "@/lib/actions/alert.actions";
import { alertsEnabled } from "@/lib/market-data";
import { formatPrice } from "@/lib/utils";

type AlertRow = {
    _id: string;
    symbol: string;
    targetPrice: number;
    condition: 'ABOVE' | 'BELOW';
    triggered?: boolean;
    active?: boolean;
    expiresAt?: string;
};

const statusOf = (alert: AlertRow) => {
    if (alert.triggered) return { labelKey: 'triggered', className: 'pill is-brand' } as const;
    if (!alertsEnabled) return { labelKey: 'paused', className: 'pill' } as const;
    if (alert.expiresAt && new Date(alert.expiresAt) < new Date()) return { labelKey: 'expired', className: 'pill' } as const;
    if (alert.active === false) return { labelKey: 'paused', className: 'pill' } as const;
    return { labelKey: 'watching', className: 'pill is-up' } as const;
};

export default function AlertsPanel({ alerts }: { alerts: AlertRow[] }) {
    const t = useTranslations('AlertsPanel');
    const format = useFormatter();
    const router = useRouter();
    const [pendingId, setPendingId] = useState<string | null>(null);

    const handleDelete = async (alert: AlertRow) => {
        setPendingId(alert._id);
        try {
            await deleteAlert(alert._id);
            toast.success(t('removed', { symbol: alert.symbol }));
            router.refresh();
        } catch {
            toast.error(t('removeFailed'));
        } finally {
            setPendingId(null);
        }
    };

    if (alerts.length === 0 && !alertsEnabled) {
        return (
            <div className="empty-state py-10">
                <span className="empty-icon"><BellRing className="size-5" /></span>
                <h3>{t('cloudTitle')}</h3>
                <p className="max-w-64 text-[13px]">{t('cloudBody')}</p>
                <Link href="/#data" className="btn btn-ghost mt-2">{t('seeCloud')}</Link>
            </div>
        );
    }

    if (alerts.length === 0) {
        return (
            <div className="empty-state py-10">
                <span className="empty-icon"><BellRing className="size-5" /></span>
                <h3>{t('emptyTitle')}</h3>
                <p className="max-w-60 text-[13px]">{t('emptyBody')}</p>
            </div>
        );
    }

    return (
        <>
            {!alertsEnabled && (
                <p className="px-3 pt-3 pb-1 text-[12.5px] text-faint">
                    {t.rich('movedNotice', {
                        link: (chunks) => <Link href="/#data" className="text-brand-ink hover:underline">{chunks}</Link>,
                    })}
                </p>
            )}
            <ul className="row-list">
                {alerts.map((alert) => {
                    const status = statusOf(alert);
                    return (
                        <li key={alert._id} className="flex items-center gap-3 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                                <p className="mono font-semibold text-foreground">{alert.symbol}</p>
                                <p className="num truncate text-[12.5px] text-faint">
                                    {t(alert.condition === 'ABOVE' ? 'above' : 'below', { price: formatPrice(alert.targetPrice) })}
                                    {alert.expiresAt && !alert.triggered && ` · ${t('until', { date: format.dateTime(new Date(alert.expiresAt), { month: 'short', day: 'numeric' }) })}`}
                                </p>
                            </div>
                            <span className={status.className}>{t(`status.${status.labelKey}`)}</span>
                            <button
                                type="button"
                                onClick={() => handleDelete(alert)}
                                disabled={pendingId === alert._id}
                                className="icon-btn is-danger"
                                title={t('removeTitle')}
                                aria-label={t('removeLabel', { symbol: alert.symbol })}
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
