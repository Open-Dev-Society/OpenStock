type ImpactLevel = 'Alto' | 'Médio' | 'Baixo';

interface NewsGridProps {
    news: MarketNewsArticle[];
    title?: string;
}

const IMPACT_STYLES: Record<ImpactLevel, string> = {
    Alto: 'border-red-500/40 bg-red-500/15 text-red-300',
    Médio: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    Baixo: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
};

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

export default function MarketNewsGrid({ news, title = 'Notícias de hoje' }: NewsGridProps) {
    const referenceDate = news[0] ? new Date(news[0].datetime * 1000) : new Date();

    return (
        <section id="noticias" className="finviz-news-panel" aria-labelledby="market-news-title">
            <div className="finviz-section-heading">
                <div>
                    <h2 id="market-news-title">{title}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Somente publicações de {dateFormatter.format(referenceDate)}, no horário de Brasília.
                    </p>
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    {news.length} notícias
                </span>
            </div>

            {news.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-black/30 p-6 text-sm text-gray-400">
                    Nenhuma notícia de mercado publicada hoje passou pelo filtro de relevância.
                </div>
            ) : (
                <div role="table" aria-label="Notícias do mercado de hoje" className="finviz-news-table">
                    <div role="row" className="finviz-news-header hidden grid-cols-[86px_60px_120px_130px_minmax(0,1fr)] gap-3 px-3 py-2 md:grid">
                        <span role="columnheader">Impacto</span>
                        <span role="columnheader">Hora</span>
                        <span role="columnheader">Fonte</span>
                        <span role="columnheader">Categoria</span>
                        <span role="columnheader">Notícia</span>
                    </div>
                    {news.map((item, index) => {
                        const impact = item.impact ?? 'Baixo';
                        return (
                            <article
                                role="row"
                                key={`${item.id}-${item.url}`}
                                className={`finviz-news-row grid grid-cols-[74px_52px_minmax(0,1fr)] items-center gap-2 px-3 py-2 md:grid-cols-[86px_60px_120px_130px_minmax(0,1fr)] md:gap-3 ${index % 2 ? 'alternate' : ''}`}
                            >
                                <span role="cell" className={`w-fit rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${IMPACT_STYLES[impact]}`}>
                                    {impact}
                                </span>
                                <time role="cell" dateTime={new Date(item.datetime * 1000).toISOString()} className="font-mono text-xs text-gray-400">
                                    {timeFormatter.format(new Date(item.datetime * 1000))}
                                </time>
                                <span role="cell" className="hidden truncate text-xs font-medium text-gray-400 md:block">{item.source}</span>
                                <span role="cell" className="hidden truncate text-xs text-sky-400 md:block">{item.related || 'Mercados'}</span>
                                <h3 role="cell" className="min-w-0 text-sm font-medium leading-snug text-gray-100">
                                    {item.headline}
                                </h3>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
