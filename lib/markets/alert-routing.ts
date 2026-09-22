export type AlertInstrument = {
    symbol: string;
    assetClass?: 'equity' | 'crypto';
    instrumentId?: string;
};

export function getAlertInstrumentKey(alert: AlertInstrument): string {
    return alert.instrumentId ?? `${alert.assetClass ?? 'equity'}:${alert.symbol.toUpperCase()}`;
}
