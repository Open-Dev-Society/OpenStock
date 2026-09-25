import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, HelpCircle, Search, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Ajuda | OpenStock B3',
    description: 'Ajuda para o terminal local OpenStock B3.',
};

const faqs = [
    {
        question: 'Preciso criar uma conta?',
        answer: 'Não. O dashboard e as páginas de ativos são públicos e locais. Não existe fluxo de login.',
    },
    {
        question: 'De onde vêm as cotações?',
        answer: 'A busca e a faixa de cotações usam brapi. Gráficos e demonstrações incorporadas usam TradingView. Os dados podem ter atraso.',
    },
    {
        question: 'Por que o gráfico não responde a cliques?',
        answer: 'Os embeds são deliberadamente não interativos para impedir que qualquer clique direcione o usuário para um site externo.',
    },
    {
        question: 'Quais notícias aparecem?',
        answer: 'Somente matérias do dia corrente no horário de Brasília que passam pelo filtro de relevância para B3, macro, empresas, commodities ou mercados globais.',
    },
    {
        question: 'O impacto é produzido por IA?',
        answer: 'Não. Alto, Médio e Baixo são calculados por regras determinísticas baseadas em tema, título, fonte, sinais secundários e atualidade.',
    },
    {
        question: 'Posso usar os dados para negociar?',
        answer: 'OpenStock é informativo, não é corretora e não garante dados em tempo real. Confirme qualquer informação em uma fonte licenciada antes de decidir.',
    },
];

export default function HelpPage() {
    return (
        <div className="terminal-page max-w-4xl mx-auto px-4 pb-20">
            <section className="text-center space-y-4 pt-10">
                <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-sky-400" />
                    <span className="finviz-eyebrow">OPENSTOCK / AJUDA</span>
                </div>
                <h1>Como usar o terminal</h1>
                <p className="text-gray-400">Consulte ativos e notícias sem sair do OpenStock.</p>
            </section>

            <section className="grid gap-3 md:grid-cols-2">
                <article className="rounded-lg border border-gray-700 bg-gray-900 p-5">
                    <Search className="mb-3 h-4 w-4 text-sky-400" />
                    <h2 className="mb-2 font-semibold text-gray-100">Buscar um ativo</h2>
                    <p className="mb-3 text-gray-400">Use “Buscar ticker” no cabeçalho ou Ctrl/Cmd + K.</p>
                    <Link href="/" className="text-sky-400">Ir ao mercado</Link>
                </article>
                <article className="rounded-lg border border-gray-700 bg-gray-900 p-5">
                    <BookOpen className="mb-3 h-4 w-4 text-sky-400" />
                    <h2 className="mb-2 font-semibold text-gray-100">Dados e arquitetura</h2>
                    <p className="mb-3 text-gray-400">Veja provedores, limites, filtros e comportamento de falha.</p>
                    <Link href="/api-docs" className="text-sky-400">Abrir documentação</Link>
                </article>
            </section>

            <section className="space-y-2">
                <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-sky-400" />
                    <h2 className="font-semibold text-gray-100">Perguntas frequentes</h2>
                </div>
                {faqs.map((faq) => (
                    <article key={faq.question} className="rounded-lg border border-gray-700 bg-gray-900 p-4">
                        <h3 className="mb-1 font-semibold text-gray-200">{faq.question}</h3>
                        <p className="text-gray-400">{faq.answer}</p>
                    </article>
                ))}
            </section>

            <p className="border-t border-gray-700 pt-4 text-gray-500">
                Contato do projeto: opendevsociety@gmail.com
            </p>
        </div>
    );
}
