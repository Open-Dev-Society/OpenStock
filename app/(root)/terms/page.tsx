import type { Metadata } from 'next';
import { AlertTriangle, Check, Scale } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Termos | OpenStock B3',
    description: 'Condições de uso do terminal OpenStock B3.',
};

const rules = [
    'Use o terminal como ferramenta informativa e educacional.',
    'Confirme cotações e notícias em uma fonte licenciada antes de decidir.',
    'Respeite os termos de brapi, TradingView e dos editores de notícias.',
    'Preserve a licença AGPL-3.0 ao redistribuir ou disponibilizar alterações.',
];

export default function TermsPage() {
    return (
        <div className="terminal-page max-w-4xl mx-auto px-4 pb-20">
            <section className="text-center space-y-4 pt-10">
                <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-sky-400" />
                    <span className="finviz-eyebrow">OPENSTOCK / TERMOS</span>
                </div>
                <h1>Uso responsável e transparente</h1>
                <p className="text-gray-400">Atualizado em 21 de setembro de 2026.</p>
            </section>

            <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
                <div className="mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <h2 className="font-semibold text-amber-200">Aviso de investimento</h2>
                </div>
                <p className="text-amber-100/70">
                    OpenStock não é corretora, consultor financeiro ou fonte de execução. Dados podem ter atraso,
                    falhas ou cobertura parcial. Nada no produto constitui recomendação de compra ou venda.
                </p>
            </section>

            <section className="rounded-lg border border-gray-700 bg-gray-900 p-5">
                <h2 className="mb-4 font-semibold text-gray-100">Condições</h2>
                <ul className="space-y-3">
                    {rules.map((rule) => (
                        <li key={rule} className="flex gap-2 text-gray-400">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                            <span>{rule}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="rounded-lg border border-gray-700 bg-gray-900 p-5">
                <h2 className="mb-3 font-semibold text-gray-100">Privacidade e navegação</h2>
                <p className="text-gray-400">
                    O fluxo ativo não exige conta. O aplicativo não apresenta links externos clicáveis e bloqueia
                    interação com embeds externos. Recursos legados de usuário não fazem parte do produto atual.
                </p>
            </section>

            <p className="border-t border-gray-700 pt-4 text-gray-500">
                Dúvidas: opendevsociety@gmail.com
            </p>
        </div>
    );
}
