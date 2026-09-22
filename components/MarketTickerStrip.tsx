import Link from 'next/link';

type MarketTicker = {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
};

const priceFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

export default function MarketTickerStrip({ tickers }: { tickers: MarketTicker[] }) {
    if (tickers.length === 0) return null;

    return (
        <section className="finviz-ticker-strip" aria-label="Cotações rápidas da B3">
            {tickers.map((ticker) => {
                const positive = ticker.changePercent >= 0;
                return (
                    <Link key={ticker.symbol} href={`/stocks/${ticker.symbol}`} className="finviz-ticker-card">
                        <div>
                            <strong>{ticker.symbol}</strong>
                            <span>{ticker.name}</span>
                        </div>
                        <div className="finviz-ticker-value">
                            <strong>R$ {priceFormatter.format(ticker.price)}</strong>
                            <span className={positive ? 'positive' : 'negative'}>
                                {positive ? '+' : ''}{ticker.changePercent.toFixed(2)}%
                            </span>
                        </div>
                    </Link>
                );
            })}
        </section>
    );
}
