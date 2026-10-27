export type Guide = {
    slug: string;
    kicker: string;
    title: string;
    description: string;
    lede: string;
    sections: { heading: string; paragraphs: string[] }[];
    faqs: { question: string; answer: string }[];
};

// Honest comparison pages. Names of other products appear because that is the search,
// and the copy says what OpenStock does and does not do.
export const GUIDES: Guide[] = [
    {
        slug: 'free-tradingview-alternative',
        kicker: 'Compare',
        title: 'Free TradingView alternative (open source)',
        description: 'OpenStock is a free, open-source stock tracker. Charts are TradingView widgets with their branding left intact. Watchlists and email alerts are OpenStock’s own.',
        lede: 'If you want Pine Script, a broker login or TradingView’s social network, stay on TradingView. If you want a free watchlist, charts and email alerts you can run yourself, OpenStock is the open-source app built around those charts.',
        sections: [
            {
                heading: 'What you actually get',
                paragraphs: [
                    'OpenStock is an AGPL-3.0 web app. The hosted site is free: create an account, search a company, and open a chart. Candle charts, drawing tools, financials, technicals and the company profile come from TradingView’s embeddable widgets. Their logo and “by TradingView” link stay on the page.',
                    'Around the chart, OpenStock adds an account, a watchlist of up to 50 symbols, browser-style tabs, and a dashboard for US, India, Germany, Canada, Australia, crypto and forex. A weekly email can summarise news for the symbols you watch when email and an AI provider are configured.',
                ],
            },
            {
                heading: 'What this is not',
                paragraphs: [
                    'OpenStock does not replace a TradingView subscription. There is no Pine Script, no strategy tester, no options chain, and no way to place a trade. Indicators you can pin on every chart are the common set: SMA, EMA, Bollinger Bands, VWAP, RSI, MACD, Stochastic and ATR. Anything beyond that lives inside the TradingView widget for that visit.',
                    'Public company pages on this site show the TradingView chart and SEC filings only. They do not show a price quote. Quotes inside the signed-in app come from a separate provider and are not republished here.',
                ],
            },
            {
                heading: 'What it costs',
                paragraphs: [
                    'The community site is free. Quotes there refresh about once an hour, and email price alerts are off. OpenStock Cloud, which is not on sale yet, is planned at $5 a month for live quotes and email alerts. Self-hosting is free: you bring your own market-data key and can turn on realtime mode, which checks alerts every five minutes.',
                ],
            },
        ],
        faqs: [
            {
                question: 'Do I need a TradingView account?',
                answer: 'No. The charts are their free embeds. A TradingView account is only useful if you want features that live on their site, such as saved layouts or Pine Script.',
            },
            {
                question: 'Can I publish a script or set an alert the way TradingView does?',
                answer: 'Not on the chart. OpenStock alerts are an email when a US stock or crypto price crosses a number you set, and only in realtime mode (self-hosted, or Cloud when it launches).',
            },
            {
                question: 'Is the source code actually available?',
                answer: 'Yes. The repository is Open-Dev-Society/OpenStock under AGPL-3.0. You can read it, run it, and modify it. If you offer a modified version as a network service, the AGPL requires you to share your source.',
            },
        ],
    },
    {
        slug: 'self-hosted-stock-tracker',
        kicker: 'Self-host',
        title: 'Self-hosted stock tracker',
        description: 'Run OpenStock on your own server with Docker or the prebuilt image. Your database, your market-data key, and email price alerts when you turn on realtime mode.',
        lede: 'OpenStock is a Next.js app with MongoDB, built to run on a small VPS. The hosted site is the convenient version. The same code is what you run if you want the data and the alerts under your own keys.',
        sections: [
            {
                heading: 'What you run',
                paragraphs: [
                    'Docker Compose starts the app and MongoDB together. MongoDB stays on the Docker network and is not published on the host. A prebuilt image is published to ghcr.io/open-dev-society/openstock for amd64 and arm64 on every push to main. Railway, Vercel and a couple of one-click hosts are documented in the README.',
                    'You need Node 22 if you build from source, a MongoDB database, and a Finnhub API key, the same one the README asks for. Charts still load from TradingView in the browser, so they stay live without that key. Quotes, search and email alerts use the key. Finnhub’s own terms are personal use; these public pages do not display those quotes.',
                ],
            },
            {
                heading: 'How fresh the numbers are',
                paragraphs: [
                    'Two modes. Cached is the default: quotes refresh about once an hour and are shared by everyone using that instance. Realtime refreshes about every 15 seconds and turns on price alerts, which are checked every five minutes and emailed when a target is crossed. Realtime is a build-time setting (NEXT_PUBLIC_OPENSTOCK_DATA_MODE=realtime) plus your own key. The prebuilt image ships in cached mode; build it yourself for realtime.',
                    'Background jobs (welcome email, alerts, the Monday digest) need Inngest. Email needs a mailbox. The digest also needs an AI provider key. Leave those unset and the app still shows charts and a watchlist.',
                ],
            },
            {
                heading: 'Who it is for',
                paragraphs: [
                    'Someone who wants a watchlist on a machine they control, or a team sharing one instance. It is a single web app, not a multi-tenant host. The licence is AGPL-3.0: running a modified copy as a service means offering the source to its users.',
                ],
            },
        ],
        faqs: [
            {
                question: 'Does self-hosting include the charts?',
                answer: 'Yes. Charts are TradingView widgets loaded in the browser. They do not go through your API key.',
            },
            {
                question: 'Will alerts work on the default Docker image?',
                answer: 'The prebuilt image is cached mode, which does not send price alerts. Set realtime mode and rebuild, and configure email plus Inngest, and alerts email you when a price crosses the target.',
            },
            {
                question: 'Where is the install guide?',
                answer: 'The README section “Self-hosting” covers Docker Compose, the container image, Railway and Vercel, including the environment variables.',
            },
        ],
    },
    {
        slug: 'free-stock-watchlist',
        kicker: 'Watchlist',
        title: 'Free stock watchlist with email alerts',
        description: 'A free watchlist for up to 50 symbols, saved to your OpenStock account. Email alerts currently need a self-hosted instance in realtime mode. They are off on the hosted site.',
        lede: 'The watchlist is a list of companies you actually follow, not a feed. Add a symbol from search and keep the chart. Email alerts currently need a self-hosted instance; the hosted site does not send them, and OpenStock Cloud is not on sale.',
        sections: [
            {
                heading: 'On the free hosted site',
                paragraphs: [
                    'Create an account and add up to 50 symbols. The watchlist is stored on your user, shown in the sidebar, and kept when you come back. Quotes on the community site refresh about once an hour. Email price alerts are not turned on there: the shared data plan is too coarse to check a target every few minutes.',
                    'You still get the chart, financials, technicals and the company profile for each symbol, plus a Monday digest when email is configured on that deployment.',
                ],
            },
            {
                heading: 'When the email actually sends',
                paragraphs: [
                    'Alerts are checked every five minutes, and only in realtime mode. That is a self-hosted OpenStock with your own market-data key and NEXT_PUBLIC_OPENSTOCK_DATA_MODE=realtime, or OpenStock Cloud once it is on sale (planned at $5 a month). The email goes to the address on your account. An alert is an upper or lower target: greater than, or less than, a price you type.',
                    'Alerts run for US stocks and crypto. Other markets can sit on the watchlist, but the free quote source used for alerts does not price them, so the alert will not fire.',
                ],
            },
            {
                heading: 'What you will not find',
                paragraphs: [
                    'There is no broker connection and no order button. A watchlist here is for tracking and being told when a price crosses a line. It is not a screener: you cannot filter the whole market by ratio or volume. Search finds a company by name or ticker, and the public stock directory lists the S&P 500 and Nasdaq-100.',
                ],
            },
        ],
        faqs: [
            {
                question: 'How many symbols can I watch?',
                answer: '50 on an account. That cap is in the app today.',
            },
            {
                question: 'Why didn’t my alert email arrive?',
                answer: 'On the public community site, alerts are off. They send in realtime mode, every five minutes, to the account email. Check that the symbol is a US stock or crypto pair, and that the target is on the correct side of the price.',
            },
            {
                question: 'Is the watchlist private?',
                answer: 'Yes. It is stored against your account. Public stock pages on this site are not your watchlist and do not show your alerts.',
            },
        ],
    },
    {
        slug: 'open-source-bloomberg-alternative',
        kicker: 'Compare',
        title: 'Open-source alternatives to a Bloomberg-style terminal',
        description: 'OpenStock is a free, open-source stock tracker for charts, a watchlist and SEC filings. It is not a professional market terminal and does not replace one.',
        lede: 'A professional terminal is a newsroom, a chat system, a bond desk and a pricing engine sold for a four-figure monthly fee. OpenStock is none of those. It is a free way for an individual to follow listed companies, read a chart, and open the filings.',
        sections: [
            {
                heading: 'The slice OpenStock covers',
                paragraphs: [
                    'US, Indian, German, Canadian and Australian stock pages, plus crypto and forex. TradingView charts with drawing tools. A watchlist, email price alerts in realtime mode, and a short weekly news summary. For the S&P 500 and Nasdaq-100, public pages link the latest annual and quarterly reports on SEC EDGAR.',
                    'The source is public (AGPL-3.0), so a developer can see how a quote moves from the provider to the screen. That is the part a closed terminal will not show you.',
                ],
            },
            {
                heading: 'The slice it does not cover',
                paragraphs: [
                    'No real-time news wire, no messenger, no order routing, no fixed income, no derivatives analytics, no Excel add-in, and no compliance archive. Prices in the signed-in app come from Finnhub on a personal-use plan and can be delayed. Nothing in OpenStock is a bid or an offer.',
                    'If your work is trading on behalf of other people, or marking a book to market, you need a vendor that sells a commercial display licence. OpenStock is a personal and educational tool. The public pages deliberately avoid republishing that quote feed.',
                ],
            },
            {
                heading: 'A reasonable way to use it',
                paragraphs: [
                    'Students, self-hosters and retail investors use it to keep a list and read filings without a seat licence. Treat the chart as a chart and the filing as a filing. For a decision that moves money, read the company’s own report and a source you are allowed to rely on.',
                ],
            },
        ],
        faqs: [
            {
                question: 'Is OpenStock a Bloomberg alternative?',
                answer: 'Only for the narrow job of tracking stocks and reading charts and filings at no charge. It is not a substitute for a professional terminal.',
            },
            {
                question: 'Can a company put OpenStock on an office floor?',
                answer: 'The code is AGPL-3.0, so you may run it, with the AGPL’s source-sharing duties if you modify it and provide it as a service. The market-data key most people use is a personal-use plan. A business that displays those quotes needs a commercial licence from a data vendor. OpenStock does not grant one.',
            },
            {
                question: 'Where do the public company pages get their facts?',
                answer: 'The chart is a TradingView widget. Sector and index membership are static. Filing dates and industry codes are loaded from SEC EDGAR. No quote is rendered on those pages.',
            },
        ],
    },
    {
        slug: 'stock-market-app-for-students',
        kicker: 'Students',
        title: 'Stock market app for students',
        description: 'A free stock tracker students can use without a card: charts, a watchlist, SEC filings for large US companies, and source code you can read for a project.',
        lede: 'OpenStock is free to sign up for, and the code is free to read. It is built for learning how a market screen fits together, not for telling you what to buy.',
        sections: [
            {
                heading: 'What a student can do on the site',
                paragraphs: [
                    'Open a large US company, read a TradingView chart, and follow the link to its latest 10-K or 10-Q on EDGAR. Save symbols to a watchlist. The dashboard covers more than the US: India, Germany, Canada, Australia, crypto and forex are in the signed-in app.',
                    'There is no credit card for the community site. Email price alerts are part of realtime mode (self-hosted) or the upcoming paid cloud plan, not the free hosted site. Hourly quotes are enough to learn the screen; they are not a trading signal.',
                ],
            },
            {
                heading: 'What a student can do with the code',
                paragraphs: [
                    'The app is Next.js, TypeScript, Tailwind and MongoDB, with background jobs on Inngest. Issues labelled “good first issue” are a way in. A class project can fork it, point it at a database, and see a real auth flow, a watchlist, and a chart embed. The licence is AGPL-3.0: if the project is only coursework on your machine, that is ordinary use; if you put a modified copy online for other people, share the source.',
                ],
            },
            {
                heading: 'Please don’t use it as advice',
                paragraphs: [
                    'OpenStock is not a broker and not an advisor. Filing facts and charts are information. A student portfolio assignment should cite the company’s filing and say which number came from where. The public company pages say when a figure is an EDGAR fact and when the chart is TradingView’s.',
                ],
            },
        ],
        faqs: [
            {
                question: 'Does signing up cost money?',
                answer: 'No. The community site is free. A paid cloud plan with live quotes and email alerts has been announced and is not on sale yet.',
            },
            {
                question: 'Can I cite OpenStock in homework?',
                answer: 'Cite the primary source. For a US company’s revenue or risk factors, that is the 10-K on EDGAR, which these pages link. For a chart, say the chart is a TradingView widget embedded by OpenStock.',
            },
            {
                question: 'Is there a mobile app?',
                answer: 'No. It is a responsive website. Add it to your home screen if you want an icon.',
            },
        ],
    },
    {
        slug: 'track-nse-stocks',
        kicker: 'India',
        title: 'Track NSE stocks free',
        description: 'How OpenStock shows Indian stocks: BSE charts and end-of-day quotes in the signed-in app. This release does not include Indian ticker pages or EDGAR mappings.',
        lede: 'You can follow Indian names on OpenStock without paying. The signed-in app uses BSE symbols, because free TradingView embeds do not license NSE charts. The public directory on this site is US-only for now.',
        sections: [
            {
                heading: 'What works after you sign in',
                paragraphs: [
                    'The India market on the dashboard lists liquid BSE names: Reliance, TCS, Infosys, HDFC Bank, and others. Quotes for India are end of day, not live. Search accepts the usual NSE-style suffix (.NS). The app maps that suffix onto BSE for the chart, because an NSE embed does not render under TradingView’s free widget licence. The same company on BSE is the one you see.',
                    'Price alerts do not run for these symbols. Alerts need a quote the server can re-check every five minutes, and that path is US stocks and crypto only.',
                ],
            },
            {
                heading: 'What the public pages do not include',
                paragraphs: [
                    'The open stock directory (/s) is the S&P 500 plus the Nasdaq-100, with EDGAR links for those listings. This release does not include Indian ticker pages or EDGAR mappings. NIFTY 50 pages are a later step, after each symbol is checked in a TradingView embed. This site will not invent a public quote page from a data plan that does not allow redistribution.',
                ],
            },
            {
                heading: 'A practical way to track one',
                paragraphs: [
                    'Sign up, open search, and type the company. Pin it to the watchlist. The chart is end of day, the profile and financials come from the TradingView widget, and the page is yours. For a corporate action or a result, read the filing on the exchange or the company’s own investor page. OpenStock is not a broker and does not place orders on NSE or BSE.',
                ],
            },
        ],
        faqs: [
            {
                question: 'Why not an NSE chart?',
                answer: 'TradingView’s free embeds refuse NSE symbols. OpenStock maps an NSE ticker onto the BSE listing of the same company so the chart still loads. That limit is in the app today, and it is a licensing limit, not a bug we can style away.',
            },
            {
                question: 'Are Indian prices live?',
                answer: 'No. The India market is marked end of day. US stocks and crypto are the markets with live or hourly quotes, depending on the deployment.',
            },
            {
                question: 'Can I set an email alert on Reliance or TCS?',
                answer: 'Not today. Email alerts run for US stocks and crypto only.',
            },
        ],
    },
];

const BY_SLUG = new Map(GUIDES.map((guide) => [guide.slug, guide]));

export function findGuide(slug: string): Guide | undefined {
    return BY_SLUG.get(slug);
}
