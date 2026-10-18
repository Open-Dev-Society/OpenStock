import { cache } from 'react';

// SEC fair-access rules: https://www.sec.gov/os/accessing-edgar-data
// Declare a User-Agent with a contact address, and stay under 10 requests per second.
export const SEC_USER_AGENT = 'OpenStock (opendevsociety@gmail.com)';

const ANNUAL_FORMS = ['10-K', '20-F', '40-F', '10-K/A', '20-F/A', '40-F/A'];
const QUARTERLY_FORMS = ['10-Q', '10-Q/A'];

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const STATES: Record<string, string> = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
    FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
    IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
    ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
    MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
    NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
    NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
    PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
    TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
    WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

export type EdgarFiling = {
    form: string;
    filed: string;
    description: string;
    url: string;
};

export type EdgarCompany = {
    sic: string;
    sicDescription: string;
    fiscalYearEnd: string;
    stateOfIncorporation: string;
    annual: EdgarFiling | null;
    quarterly: EdgarFiling | null;
    filingsUrl: string;
};

type RecentFilings = {
    form?: string[];
    filingDate?: string[];
    accessionNumber?: string[];
    primaryDocument?: string[];
    primaryDocDescription?: string[];
};

export function filingUrl(cik: string, accession: string, primaryDocument: string): string {
    const cikInt = String(Number(cik));
    const accessionNoDashes = accession.replace(/-/g, '');
    return `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accessionNoDashes}/${primaryDocument}`;
}

export function companyBrowseUrl(cik: string): string {
    return `https://www.sec.gov/edgar/browse/?CIK=${Number(cik)}&owner=exclude`;
}

export function formatFiscalYearEnd(mmdd: string): string | null {
    if (!/^\d{4}$/.test(mmdd)) return null;
    const month = Number(mmdd.slice(0, 2));
    const day = Number(mmdd.slice(2));
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${MONTHS[month - 1]} ${day}`;
}

export function formatFilingDate(iso: string): string {
    const [year, month, day] = iso.split('-').map(Number);
    if (!year || !month || !day) return iso;
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    });
}

export function stateName(code: string): string {
    if (!code) return '';
    return STATES[code] ?? code;
}

function pickFiling(recent: RecentFilings, forms: string[], cik: string): EdgarFiling | null {
    const filed = recent.form ?? [];
    for (const form of forms) {
        const index = filed.indexOf(form);
        if (index < 0) continue;
        const accession = recent.accessionNumber?.[index];
        const primaryDocument = recent.primaryDocument?.[index];
        const date = recent.filingDate?.[index];
        if (!accession || !primaryDocument || !date) continue;
        return {
            form,
            filed: date,
            description: recent.primaryDocDescription?.[index] || form,
            url: filingUrl(cik, accession, primaryDocument),
        };
    }
    return null;
}

export function parseSubmissions(cik: string, body: {
    sic?: string;
    sicDescription?: string;
    fiscalYearEnd?: string;
    stateOfIncorporation?: string;
    filings?: { recent?: RecentFilings };
}): EdgarCompany {
    const recent = body.filings?.recent ?? {};
    return {
        sic: body.sic ?? '',
        sicDescription: body.sicDescription ?? '',
        fiscalYearEnd: formatFiscalYearEnd(body.fiscalYearEnd ?? '') ?? '',
        stateOfIncorporation: stateName(body.stateOfIncorporation ?? ''),
        annual: pickFiling(recent, ANNUAL_FORMS, cik),
        quarterly: pickFiling(recent, QUARTERLY_FORMS, cik),
        filingsUrl: companyBrowseUrl(cik),
    };
}

// ponytail: one gap shared by this process. A second instance can double the rate; the Next
// data cache (24h) is what keeps a crawl from asking EDGAR twice for the same company.
const GAP_MS = 125;
let nextSlot = 0;
const memory = new Map<string, { expires: number; value: EdgarCompany | null }>();
const pending = new Map<string, Promise<EdgarCompany | null>>();
const OK_MS = 12 * 60 * 60 * 1000;
const FAIL_MS = 10 * 60 * 1000;

function pace(): Promise<void> {
    const now = Date.now();
    const at = Math.max(now, nextSlot);
    nextSlot = at + GAP_MS;
    const wait = at - now;
    return wait > 0 ? new Promise((resolve) => setTimeout(resolve, wait)) : Promise.resolve();
}

async function loadEdgarCompany(cik: string): Promise<EdgarCompany | null> {
    const key = cik.replace(/\D/g, '').padStart(10, '0');
    if (!Number(key)) return null;

    const hit = memory.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;

    const inflight = pending.get(key);
    if (inflight) return inflight;

    const job = (async () => {
        try {
            // Static generation must not call EDGAR. The page is dynamic; this is a backstop so
            // `next build` still passes if a page is pre-rendered without a network.
            if (process.env.NEXT_PHASE === 'phase-production-build') return null;

            await pace();
            const res = await fetch(`https://data.sec.gov/submissions/CIK${key}.json`, {
                headers: { 'User-Agent': SEC_USER_AGENT, Accept: 'application/json' },
                next: { revalidate: 60 * 60 * 24 },
                signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) throw new Error(`SEC submissions ${res.status}`);
            const value = parseSubmissions(cik, await res.json());
            memory.set(key, { expires: Date.now() + OK_MS, value });
            return value;
        } catch (error) {
            console.error('EDGAR submissions failed', key, error);
            memory.set(key, { expires: Date.now() + FAIL_MS, value: null });
            return null;
        } finally {
            pending.delete(key);
        }
    })();

    pending.set(key, job);
    return job;
}

// One lookup per request, shared by generateMetadata and the page.
export const getEdgarCompany = cache((cik: string) => (cik ? loadEdgarCompany(cik) : Promise.resolve(null)));
