import TradingViewWidget from "@/components/TradingViewWidget";
import StockSentimentCard from "@/components/stocks/StockSentimentCard";
import {
    SYMBOL_INFO_WIDGET_CONFIG,
    CANDLE_CHART_WIDGET_CONFIG,
    BASELINE_WIDGET_CONFIG,
    TECHNICAL_ANALYSIS_WIDGET_CONFIG,
    COMPANY_PROFILE_WIDGET_CONFIG,
    COMPANY_FINANCIALS_WIDGET_CONFIG,
} from "@/lib/constants";

import { getStockSentimentInsights } from '@/lib/actions/adanos.actions';
import { formatSymbolForTradingView } from '@/lib/utils';

export default async function StockDetails({ params }: StockDetailsPageProps) {
    const { symbol } = await params;
    const tvSymbol = formatSymbolForTradingView(symbol, 'BMFBOVESPA');
    const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

    const sentimentInsights = await getStockSentimentInsights(symbol);

    return (
        <div className="finviz-stock-page">
            <div className="finviz-page-heading">
                <div>
                    <span className="finviz-eyebrow">B3 / ATIVO</span>
                    <h1>{symbol.toUpperCase()}</h1>
                </div>
                <span className="finviz-delay-label">BM&FBOVESPA</span>
            </div>

            <TradingViewWidget
                title="Resumo do ativo"
                scriptUrl={`${scriptUrl}symbol-info.js`}
                config={SYMBOL_INFO_WIDGET_CONFIG(tvSymbol)}
                height={170}
            />

            <section className="finviz-stock-primary">
                <TradingViewWidget
                    title="Gráfico diário"
                    scriptUrl={`${scriptUrl}advanced-chart.js`}
                    config={CANDLE_CHART_WIDGET_CONFIG(tvSymbol)}
                    className="custom-chart"
                    height={520}
                    allowExpand={true}
                />
                <TradingViewWidget
                    title="Análise técnica"
                    scriptUrl={`${scriptUrl}technical-analysis.js`}
                    config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(tvSymbol)}
                    height={520}
                />
            </section>

            {sentimentInsights ? <StockSentimentCard insight={sentimentInsights} /> : null}

            <section className="finviz-stock-secondary">
                <TradingViewWidget
                    title="Desempenho em linha base"
                    scriptUrl={`${scriptUrl}advanced-chart.js`}
                    config={BASELINE_WIDGET_CONFIG(tvSymbol)}
                    className="custom-chart"
                    height={440}
                    allowExpand={true}
                />
                <TradingViewWidget
                    title="Perfil da companhia"
                    scriptUrl={`${scriptUrl}company-profile.js`}
                    config={COMPANY_PROFILE_WIDGET_CONFIG(tvSymbol)}
                    height={440}
                />
            </section>

            <TradingViewWidget
                title="Demonstrativos financeiros"
                scriptUrl={`${scriptUrl}financials.js`}
                config={COMPANY_FINANCIALS_WIDGET_CONFIG(tvSymbol)}
                height={640}
            />
        </div>
    );
}
