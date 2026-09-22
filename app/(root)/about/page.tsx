import type { Metadata } from 'next';
import { BarChart3, Database, Newspaper, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Sobre | OpenStock B3',
    description: 'Princípios e arquitetura do terminal local OpenStock B3.',
};

const principles = [
    {
        icon: Database,
        title: 'Dados reais',
        text: 'Campos ausentes permanecem indisponíveis. O produto não inventa cotações, fundamentos ou notícias.',
    },
    {
        icon: BarChart3,
        title: 'B3 primeiro',
        text: 'Busca, cotações, símbolos e painéis são configurados para ativos negociados no mercado brasileiro.',
    },
    {
        icon: Newspaper,
        title: 'Informação do dia',
        text: 'O feed aceita somente publicações do calendário atual no horário de Brasília e mostra a procedência.',
    },
    {
        icon: ShieldCheck,
        title: 'Local e sem conta',
        text: 'O dashboard funciona sem cadastro, login ou identidade simulada e não direciona cliques para fora do app.',
    },
];

export default function AboutPage() {
    return (
        <div className="terminal-page max-w-5xl mx-auto pb-20 px-4">
            <section className="text-center space-y-4 pt-10">
                <span className="finviz-eyebrow">OPENSTOCK / SOBRE</span>
                <h1>Inteligência de mercado aberta para a B3</h1>
                <p className="max-w-3xl text-gray-400">
                    OpenStock é um terminal local de consulta, construído para concentrar preços, gráficos,
                    fundamentos e notícias relevantes sem assinatura ou barreira de autenticação.
                </p>
            </section>

            <section className="grid gap-3 md:grid-cols-2">
                {principles.map(({ icon: Icon, title, text }) => (
                    <article key={title} className="rounded-lg border border-gray-700 bg-gray-900 p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <Icon className="h-4 w-4 text-sky-400" />
                            <h2 className="font-semibold text-gray-100">{title}</h2>
                        </div>
                        <p className="text-gray-400">{text}</p>
                    </article>
                ))}
            </section>

            <section className="rounded-lg border border-gray-700 bg-gray-900 p-5">
                <h2 className="mb-3 font-semibold text-gray-100">Provedores e responsabilidade</h2>
                <p className="text-gray-400">
                    brapi fornece o catálogo e snapshots da B3; TradingView fornece visualizações incorporadas;
                    feeds RSS/Atom fornecem as manchetes. Cada provedor mantém suas próprias regras de atraso,
                    disponibilidade e licenciamento. OpenStock é informativo e não executa ordens.
                </p>
            </section>
        </div>
    );
}
