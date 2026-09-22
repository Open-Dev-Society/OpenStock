import TradingViewWidget from "@/components/TradingViewWidget";
import MarketNewsGrid from "@/components/MarketNewsGrid";
import MarketTickerStrip from "@/components/MarketTickerStrip";
import MarketPulsePanel from "@/components/MarketPulsePanel";
import { getRelevantMarketNews } from "@/lib/actions/market-news.actions";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import {
    B3_HOTLIST_WIDGET_CONFIG,
    MARKET_DATA_WIDGET_CONFIG,
    MARKET_OVERVIEW_WIDGET_CONFIG,
} from "@/lib/constants";

const Home = async () => {
    const scriptUrl = 'https://s3.tradingview.com/external-embedding/embed-widget-';
    const [marketNews, marketSnapshot] = await Promise.all([
        getRelevantMarketNews(),
        searchStocks(),
    ]);
    const marketTickers = marketSnapshot
        .filter((stock) => stock.price !== undefined && stock.changePercent !== undefined)
        .slice(0, 5)
        .map((stock) => ({
            symbol: stock.symbol,
            name: stock.name,
            price: stock.price!,
            changePercent: stock.changePercent!,
        }));

    return (
        <div className="home-wrapper">
            <div className="finviz-page-heading">
                <div>
                    <span className="finviz-eyebrow">OPENSTOCK / MERCADO</span>
                    <h1>Visão geral da B3</h1>
                </div>
                <span className="finviz-delay-label">COTAÇÕES PODEM TER ATRASO</span>
            </div>

            <MarketTickerStrip tickers={marketTickers} />

            <section className="finviz-dashboard-grid">
                <TradingViewWidget
                    title="Índices e setores"
                    scriptUrl={`${scriptUrl}market-overview.js`}
                    config={MARKET_OVERVIEW_WIDGET_CONFIG}
                    className="custom-chart"
                    height={420}
                />
                <TradingViewWidget
                    title="Maiores altas, baixas e volume"
                    scriptUrl={`${scriptUrl}hotlists.js`}
                    config={B3_HOTLIST_WIDGET_CONFIG}
                    height={420}
                />
                <TradingViewWidget
                    title="Cotações selecionadas"
                    scriptUrl={`${scriptUrl}market-quotes.js`}
                    config={MARKET_DATA_WIDGET_CONFIG}
                    height={420}
                />
                <MarketPulsePanel news={marketNews} />
            </section>

            <MarketNewsGrid news={marketNews} title="Notícias do mercado" />
        </div>
    );
};

export default Home;