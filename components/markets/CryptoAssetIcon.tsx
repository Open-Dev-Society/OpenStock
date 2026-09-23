'use client';

import type { CryptoAsset } from '@/lib/markets/crypto-assets';
import { getCryptoAsset } from '@/lib/markets/crypto-assets';

const SIZE_CLASSES = {
    sm: 'h-6 w-6 text-[9px]',
    md: 'h-9 w-9 text-[11px]',
    lg: 'h-12 w-12 text-sm',
} as const;

interface CryptoAssetIconProps {
    asset?: CryptoAsset;
    symbol?: string;
    name?: string;
    size?: keyof typeof SIZE_CLASSES;
    className?: string;
}

export default function CryptoAssetIcon({
    asset,
    symbol,
    name,
    size = 'md',
    className = '',
}: CryptoAssetIconProps) {
    const resolvedAsset = asset ?? (symbol ? getCryptoAsset(symbol) : undefined);
    const displaySymbol = resolvedAsset?.symbol ?? symbol?.split(':').pop()?.replace(/USDT$/i, '') ?? 'CRYPTO';
    const displayName = resolvedAsset?.name ?? name ?? displaySymbol;
    const iconUrl = resolvedAsset?.iconUrl;

    return (
        <span
            role="img"
            aria-label={`${displayName} logo`}
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-teal-400/20 to-blue-500/20 font-semibold text-teal-100 ${SIZE_CLASSES[size]} ${className}`}
        >
            <span aria-hidden="true">{displaySymbol.slice(0, 3)}</span>
            {iconUrl && (
                <img
                    src={iconUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain p-0.5"
                    loading="lazy"
                    onError={(event) => {
                        event.currentTarget.style.display = 'none';
                    }}
                />
            )}
        </span>
    );
}
