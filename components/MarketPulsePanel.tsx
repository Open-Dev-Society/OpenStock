type ImpactLevel = 'Alto' | 'Médio' | 'Baixo';

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

const impactClass: Record<ImpactLevel, string> = {
    Alto: 'high',
    Médio: 'medium',
    Baixo: 'low',
};

export default function MarketPulsePanel({ news }: { news: MarketNewsArticle[] }) {
    const sources = new Set(news.map((item) => item.source)).size;
    const categories = new Set(news.map((item) => item.related)).size;
    const highImpact = news.filter((item) => item.impact === 'Alto').length;

    return (
        <section className="finviz-panel finviz-pulse-panel">
            <div className="finviz-panel-title">
                <h2>Pulso do mercado</h2>
                <span>● HOJE</span>
            </div>
            <div className="finviz-pulse-stats">
                <div><strong>{news.length}</strong><span>notícias</span></div>
                <div><strong>{highImpact}</strong><span>alto impacto</span></div>
                <div><strong>{sources}</strong><span>fontes</span></div>
                <div><strong>{categories}</strong><span>categorias</span></div>
            </div>
            <div className="finviz-pulse-list">
                {news.slice(0, 6).map((item) => {
                    const impact = item.impact ?? 'Baixo';
                    return (
                        <article key={`${item.id}-pulse`}>
                            <time dateTime={new Date(item.datetime * 1000).toISOString()}>
                                {timeFormatter.format(new Date(item.datetime * 1000))}
                            </time>
                            <span className={impactClass[impact]}>{impact}</span>
                            <h3>{item.headline}</h3>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
