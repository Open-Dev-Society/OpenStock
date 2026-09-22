import type { Metadata } from 'next';
import { Activity, Database, Newspaper, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Dados e API | OpenStock B3',
    description: 'Arquitetura de dados e integrações do OpenStock B3.',
};

const boundaries = [
    {
        icon: Database,
        title: 'brapi',
        rows: [
            '/api/v2/tickers — busca, catálogo e resumos de cotação',
            '/api/v2/stocks/quote — snapshot explícito quando autorizado',
            'fila global — no máximo uma requisição simultânea',
        ],
    },
    {
        icon: Newspaper,
        title: 'RSS e Atom',
        rows: [
            'Bloomberg, Reuters e Valor via consultas editoriais no Google News',
            'InfoMoney, Banco Central e Agência Brasil por feed nativo',
            'janela — somente o dia corrente em America/Sao_Paulo',
        ],
    },
    {
        icon: Activity,
        title: 'TradingView',
        rows: [
            'símbolos — BMFBOVESPA:<TICKER>',
            'visões — mercado, gráfico, técnicas, perfil e financeiros',
            'interação — bloqueada para impedir navegação externa',
        ],
    },
];

export default function ApiDocsPage() {
    return (
        <div className="terminal-page max-w-5xl mx-auto space-y-6 pb-20">
            <section className="text-center space-y-4 pt-10">
                <span className="finviz-eyebrow">OPENSTOCK / DADOS & API</span>
                <h1>Arquitetura ativa do terminal</h1>
                <p className="max-w-3xl text-gray-400">
                    O produto atual é renderizado pelo servidor e não oferece uma API pública própria.
                    As fronteiras abaixo alimentam diretamente as páginas do dashboard.
                </p>
            </section>

            <section className="grid gap-3 lg:grid-cols-3">
                {boundaries.map(({ icon: Icon, title, rows }) => (
                    <article key={title} className="rounded-lg border border-gray-700 bg-gray-900 p-5">
                        <div className="mb-4 flex items-center gap-2">
                            <Icon className="h-4 w-4 text-sky-400" />
                            <h2 className="font-semibold text-gray-100">{title}</h2>
                        </div>
                        <ul className="space-y-3 text-xs text-gray-400">
                            {rows.map((row) => <li key={row}>{row}</li>)}
                        </ul>
                    </article>
                ))}
            </section>

            <section className="rounded-lg border border-gray-700 bg-gray-900 p-5">
                <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-sky-400" />
                    <h2 className="font-semibold text-gray-100">Contratos de integridade</h2>
                </div>
                <ul className="grid gap-2 text-gray-400 md:grid-cols-2">
                    <li>• valores ausentes nunca recebem dados sintéticos;</li>
                    <li>• falhas do provedor ficam visíveis nos logs;</li>
                    <li>• feeds têm timeout e limite de tamanho;</li>
                    <li>• notícias futuras, antigas ou irrelevantes são descartadas;</li>
                    <li>• URLs externas não são expostas como navegação;</li>
                    <li>• dados podem estar atrasados.</li>
                </ul>
            </section>

            <section className="rounded-lg border border-gray-700 bg-gray-900 p-5">
                <h2 className="mb-3 font-semibold text-gray-100">Variáveis opcionais</h2>
                <pre className="overflow-x-auto bg-black/30 p-4 text-xs text-gray-300">{`BRAPI_BASE_URL=https://brapi.dev
BRAPI_API_TOKEN=
ADANOS_API_KEY=
ADANOS_API_BASE_URL=https://api.adanos.org`}</pre>
            </section>
        </div>
    );
}
