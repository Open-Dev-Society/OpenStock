import Panel from '@/components/Panel';
import CompaniesList from '@/components/CompaniesList';
import { TADAWUL_MAIN_COMPANIES, TADAWUL_MAIN_COUNT } from '@/lib/tadawul-companies';
import { getLang } from '@/lib/i18n-server';
import { tx } from '@/lib/i18n';

export const metadata = { title: 'All Tadawul companies | OpenStock' };

// Full Saudi Exchange directory (main market), browsable without spending Finnhub quota.
export default async function CompaniesPage() {
    const lang = await getLang();
    return (
        <>
            <header className="page-head">
                <div>
                    <h1 className="page-title">{tx(lang, 'co.title')}</h1>
                    <p className="page-sub">{tx(lang, 'co.sub').replace('{n}', String(TADAWUL_MAIN_COUNT))}</p>
                </div>
            </header>
            <Panel title={tx(lang, 'co.all')} sub={tx(lang, 'co.tapRow')}>
                <CompaniesList companies={TADAWUL_MAIN_COMPANIES} lang={lang} />
            </Panel>
        </>
    );
}
