import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { describe, expect, it, afterEach } from 'vitest';
import { config, middleware } from '@/middleware';
import { isPublicPath, PUBLIC_EXACT_PATHS } from '@/lib/public-paths';
import { GUIDES, findGuide } from '@/lib/seo/comparisons';
import { filingUrl, formatFiscalYearEnd, formatFilingDate, parseSubmissions, stateName } from '@/lib/seo/edgar';
import { sitemapEntries } from '@/lib/seo/sitemap';
import { siteUrl } from '@/lib/seo/site';
import { adjacentTickers, findTicker, relatedTickers, tickerIntro, tickerPath, US_TICKERS } from '@/lib/seo/tickers';

describe('isPublicPath', () => {
    it('lets crawlers and the new public sections through', () => {
        for (const path of ['/', '/about', '/robots.txt', '/sitemap.xml', '/s', '/s/AAPL', '/s/BRK.B', '/compare', '/compare/self-hosted-stock-tracker']) {
            expect(isPublicPath(path), path).toBe(true);
        }
    });

    it('keeps the signed-in app private, including paths that share a prefix', () => {
        for (const path of ['/stocks', '/stocks/AAPL', '/dashboard', '/watchlist', '/profile', '/sign-in', '/something']) {
            expect(isPublicPath(path), path).toBe(false);
        }
        expect(isPublicPath('/sponsor')).toBe(true);
    });
});

describe('middleware', () => {
    it('does not redirect public pages or crawler files', async () => {
        for (const path of ['/robots.txt', '/sitemap.xml', '/s/AAPL', '/compare/free-tradingview-alternative', '/about']) {
            const response = await middleware(new NextRequest(`http://localhost${path}`));
            expect(response.headers.get('location'), path).toBeNull();
        }
    });

    it('sends signed-out visitors on app routes to sign-in', async () => {
        const response = await middleware(new NextRequest('http://localhost/stocks/AAPL'));
        expect(response.status).toBe(307);
        expect(response.headers.get('location')).toBe('http://localhost/sign-in');
    });

    it('leaves a signed-in stock page alone', async () => {
        const request = new NextRequest('http://localhost/stocks/AAPL', {
            headers: { cookie: 'better-auth.session_token=present' },
        });
        const response = await middleware(request);
        expect(response.headers.get('location')).toBeNull();
    });

    it('excludes crawler files from the matcher so they cannot be gated later by accident', () => {
        expect(config.matcher[0]).toContain('robots.txt');
        expect(config.matcher[0]).toContain('sitemap.xml');
    });
});

describe('tickers', () => {
    it('covers the S&P 500 and the Nasdaq-100, with a CIK on every row', () => {
        expect(US_TICKERS.length).toBeGreaterThanOrEqual(500);
        expect(US_TICKERS.length).toBeLessThan(600);
        expect(US_TICKERS.every((ticker) => ticker.cik && ticker.symbol && ticker.name)).toBe(true);
        const gics = new Set(['Communication Services', 'Consumer Discretionary', 'Consumer Staples', 'Energy', 'Financials', 'Health Care', 'Industrials', 'Information Technology', 'Materials', 'Real Estate', 'Utilities']);
        expect(US_TICKERS.every((ticker) => gics.has(ticker.sector))).toBe(true);
        const apple = findTicker('aapl');
        expect(apple?.indexes).toEqual(['SP500', 'NDX100']);
        expect(apple?.cik).toBe('320193');
    });

    it('accepts the dotted class share and the hyphenated form', () => {
        expect(findTicker('BRK.B')?.symbol).toBe('BRK.B');
        expect(findTicker('brk-b')?.symbol).toBe('BRK.B');
        expect(findTicker('not-a-ticker')).toBeUndefined();
        expect(tickerPath('BRK.B')).toBe('/s/BRK.B');
    });

    it('writes an intro from static facts and does not invent a price', () => {
        const intro = tickerIntro(findTicker('AAPL')!);
        expect(intro).toContain('Apple Inc.');
        expect(intro).toContain('S&P 500');
        expect(intro).toContain('Nasdaq-100');
        expect(intro.toLowerCase()).not.toContain('finnhub');
        expect(intro).toContain('does not include a price quote');
    });

    it('links peers in the same sector and the neighbouring symbols', () => {
        const apple = findTicker('AAPL')!;
        const peers = relatedTickers(apple);
        expect(peers.length).toBeGreaterThan(0);
        expect(peers.every((peer) => peer.sector === apple.sector && peer.symbol !== 'AAPL')).toBe(true);
        const { prev, next } = adjacentTickers(apple);
        expect(prev?.symbol.localeCompare('AAPL')).toBeLessThan(0);
        expect(next?.symbol.localeCompare('AAPL')).toBeGreaterThan(0);
    });
});

describe('edgar helpers', () => {
    it('builds an archives URL and formats filing facts', () => {
        expect(filingUrl('320193', '0000320193-25-000079', 'aapl-20250927.htm'))
            .toBe('https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/aapl-20250927.htm');
        expect(formatFiscalYearEnd('0926')).toBe('September 26');
        expect(formatFiscalYearEnd('nope')).toBeNull();
        expect(formatFilingDate('2025-10-31')).toBe('October 31, 2025');
        expect(stateName('DE')).toBe('Delaware');
    });

    it('picks the annual report ahead of a later amendment', () => {
        const company = parseSubmissions('320193', {
            sic: '3571',
            sicDescription: 'Electronic Computers',
            fiscalYearEnd: '0926',
            stateOfIncorporation: 'CA',
            filings: {
                recent: {
                    form: ['10-K/A', '8-K', '10-Q', '10-K'],
                    filingDate: ['2026-01-01', '2025-12-01', '2025-08-01', '2025-10-31'],
                    accessionNumber: ['0000320193-26-000001', '0000320193-25-000003', '0000320193-25-000002', '0000320193-25-000079'],
                    primaryDocument: ['amend.htm', '8k.htm', '10q.htm', 'aapl-20250927.htm'],
                    primaryDocDescription: ['10-K/A', '8-K', '10-Q', '10-K'],
                },
            },
        });
        expect(company.annual?.form).toBe('10-K');
        expect(company.annual?.url).toContain('aapl-20250927.htm');
        expect(company.quarterly?.form).toBe('10-Q');
        expect(company.sicDescription).toBe('Electronic Computers');
        expect(company.stateOfIncorporation).toBe('California');
    });
});

describe('sitemap', () => {
    it('lists marketing pages, guides and every ticker, and not the signed-in app', () => {
        const entries = sitemapEntries('https://openstock.example/');
        const urls = entries.map((entry) => entry.url);
        expect(urls).toContain('https://openstock.example/');
        expect(urls).toContain('https://openstock.example/s/AAPL');
        expect(urls).toContain('https://openstock.example/s/BRK.B');
        for (const path of PUBLIC_EXACT_PATHS) {
            expect(urls).toContain(`https://openstock.example${path}`);
        }
        for (const guide of GUIDES) {
            expect(urls).toContain(`https://openstock.example/compare/${guide.slug}`);
            expect(findGuide(guide.slug)?.title).toBe(guide.title);
        }
        expect(urls.some((url) => url.includes('/stocks'))).toBe(false);
        expect(urls.some((url) => url.includes('/dashboard'))).toBe(false);
        expect(new Set(urls).size).toBe(urls.length);
    });
});

describe('siteUrl', () => {
    const previous = process.env.BETTER_AUTH_URL;
    afterEach(() => {
        if (previous === undefined) delete process.env.BETTER_AUTH_URL;
        else process.env.BETTER_AUTH_URL = previous;
    });

    it('uses BETTER_AUTH_URL without a trailing slash', () => {
        process.env.BETTER_AUTH_URL = 'https://openstock.example/';
        expect(siteUrl()).toBe('https://openstock.example');
    });
});

describe('public pages do not call Finnhub', () => {
    it('keeps the public ticker, directory and EDGAR code off the quote client', () => {
        const files = [
            'app/(marketing)/s/[ticker]/page.tsx',
            'app/(marketing)/s/page.tsx',
            'app/(marketing)/compare/[slug]/page.tsx',
            'app/(marketing)/compare/page.tsx',
            'lib/seo/edgar.ts',
            'lib/seo/tickers.ts',
            'components/seo/TradingViewEmbed.tsx',
        ];
        for (const file of files) {
            const source = readFileSync(file, 'utf8').toLowerCase();
            expect(source, file).not.toContain('finnhub');
        }
    });
});
