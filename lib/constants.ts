export const NAV_ITEMS = [
    { href: '/', label: 'Mercado' },
    { href: '/#noticias', label: 'Notícias' },
    { href: '/api-docs', label: 'Dados & API' },
    { href: '/help', label: 'Ajuda' },
    { href: '/about', label: 'Sobre' },
];


export const ALERT_TYPE_OPTIONS = [
    { value: 'upper', label: 'Upper' },
    { value: 'lower', label: 'Lower' },
];

export const CONDITION_OPTIONS = [
    { value: 'greater', label: 'Greater than (>)' },
    { value: 'less', label: 'Less than (<)' },
];

// TradingView widgets configured exclusively for B3/BM&FBOVESPA symbols.
export const MARKET_OVERVIEW_WIDGET_CONFIG = {
    colorTheme: 'dark',
    dateRange: '12M',
    locale: 'br',
    largeChartUrl: '',
    isTransparent: true,
    showFloatingTooltip: true,
    plotLineColorGrowing: '#0FEDBE',
    plotLineColorFalling: '#EF4444',
    gridLineColor: 'rgba(240, 243, 250, 0)',
    scaleFontColor: '#DBDBDB',
    belowLineFillColorGrowing: 'rgba(15, 237, 190, 0.12)',
    belowLineFillColorFalling: 'rgba(239, 68, 68, 0.12)',
    belowLineFillColorGrowingBottom: 'rgba(15, 237, 190, 0)',
    belowLineFillColorFallingBottom: 'rgba(239, 68, 68, 0)',
    symbolActiveColor: 'rgba(15, 237, 190, 0.05)',
    tabs: [
        {
            title: 'Índices',
            symbols: [
                { s: 'BMFBOVESPA:IBOV', d: 'Ibovespa' },
                { s: 'BMFBOVESPA:IFIX', d: 'Índice de Fundos Imobiliários' },
                { s: 'BMFBOVESPA:ICON', d: 'Índice de Consumo' },
                { s: 'BMFBOVESPA:IMAT', d: 'Índice de Materiais Básicos' },
            ],
        },
        {
            title: 'Bancos',
            symbols: [
                { s: 'BMFBOVESPA:ITUB4', d: 'Itaú Unibanco' },
                { s: 'BMFBOVESPA:BBDC4', d: 'Bradesco' },
                { s: 'BMFBOVESPA:BBAS3', d: 'Banco do Brasil' },
                { s: 'BMFBOVESPA:BPAC11', d: 'BTG Pactual' },
            ],
        },
        {
            title: 'Empresas',
            symbols: [
                { s: 'BMFBOVESPA:PETR4', d: 'Petrobras' },
                { s: 'BMFBOVESPA:VALE3', d: 'Vale' },
                { s: 'BMFBOVESPA:WEGE3', d: 'WEG' },
                { s: 'BMFBOVESPA:ABEV3', d: 'Ambev' },
            ],
        },
    ],
    support_host: 'https://www.tradingview.com',
    backgroundColor: '#121820',
    width: '100%',
    height: 600,
    showSymbolLogo: true,
    showChart: true,
};

export const B3_HOTLIST_WIDGET_CONFIG = {
    colorTheme: 'dark',
    dateRange: '1D',
    exchange: 'BMFBOVESPA',
    showChart: true,
    locale: 'br',
    width: '100%',
    height: 600,
    largeChartUrl: '',
    isTransparent: true,
    showSymbolLogo: true,
    showFloatingTooltip: true,
    plotLineColorGrowing: '#0FEDBE',
    plotLineColorFalling: '#EF4444',
    gridLineColor: 'rgba(240, 243, 250, 0)',
    scaleFontColor: '#DBDBDB',
    belowLineFillColorGrowing: 'rgba(15, 237, 190, 0.12)',
    belowLineFillColorFalling: 'rgba(239, 68, 68, 0.12)',
    belowLineFillColorGrowingBottom: 'rgba(15, 237, 190, 0)',
    belowLineFillColorFallingBottom: 'rgba(239, 68, 68, 0)',
    symbolActiveColor: 'rgba(15, 237, 190, 0.05)',
};

export const TOP_STORIES_WIDGET_CONFIG = {
    displayMode: 'regular',
    feedMode: 'symbol',
    symbol: 'BMFBOVESPA:IBOV',
    colorTheme: 'dark',
    isTransparent: true,
    locale: 'br',
    width: '100%',
    height: '600',
};

export const MARKET_DATA_WIDGET_CONFIG = {
    title: 'B3',
    width: '100%',
    height: 600,
    locale: 'br',
    showSymbolLogo: true,
    colorTheme: 'dark',
    isTransparent: false,
    backgroundColor: '#121820',
    symbolsGroups: [
        {
            name: 'Bancos',
            symbols: [
                { name: 'BMFBOVESPA:ITUB4', displayName: 'Itaú Unibanco' },
                { name: 'BMFBOVESPA:BBDC4', displayName: 'Bradesco' },
                { name: 'BMFBOVESPA:BBAS3', displayName: 'Banco do Brasil' },
                { name: 'BMFBOVESPA:BPAC11', displayName: 'BTG Pactual' },
            ],
        },
        {
            name: 'Commodities e energia',
            symbols: [
                { name: 'BMFBOVESPA:PETR4', displayName: 'Petrobras PN' },
                { name: 'BMFBOVESPA:VALE3', displayName: 'Vale' },
                { name: 'BMFBOVESPA:PRIO3', displayName: 'PRIO' },
                { name: 'BMFBOVESPA:SUZB3', displayName: 'Suzano' },
            ],
        },
        {
            name: 'Indústria e consumo',
            symbols: [
                { name: 'BMFBOVESPA:WEGE3', displayName: 'WEG' },
                { name: 'BMFBOVESPA:ABEV3', displayName: 'Ambev' },
                { name: 'BMFBOVESPA:RENT3', displayName: 'Localiza' },
                { name: 'BMFBOVESPA:RADL3', displayName: 'Raia Drogasil' },
            ],
        },
    ],
};

export const SYMBOL_INFO_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: true,
    locale: 'br',
    width: '100%',
    height: 170,
});

export const CANDLE_CHART_WIDGET_CONFIG = (symbol: string) => ({
    allow_symbol_change: false,
    calendar: false,
    details: true,
    hide_side_toolbar: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: false,
    interval: 'D',
    locale: 'br',
    save_image: false,
    style: 1,
    symbol: symbol.toUpperCase(),
    theme: 'dark',
    timezone: 'exchange',
    backgroundColor: '#121820',
    gridColor: '#242d38',
    watchlist: [],
    withdateranges: false,
    compareSymbols: [],
    studies: [],
    width: '100%',
    height: 600,
});

export const BASELINE_WIDGET_CONFIG = (symbol: string) => ({
    allow_symbol_change: false,
    calendar: false,
    details: false,
    hide_side_toolbar: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: false,
    interval: 'D',
    locale: 'br',
    save_image: false,
    style: 10,
    symbol: symbol.toUpperCase(),
    theme: 'dark',
    timezone: 'exchange',
    backgroundColor: '#121820',
    gridColor: '#242d38',
    watchlist: [],
    withdateranges: false,
    compareSymbols: [],
    studies: [],
    width: '100%',
    height: 600,
});

export const TECHNICAL_ANALYSIS_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'br',
    width: '100%',
    height: 400,
    interval: '1h',
    largeChartUrl: '',
});

export const COMPANY_PROFILE_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'br',
    width: '100%',
    height: 440,
});

export const COMPANY_FINANCIALS_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'br',
    width: '100%',
    height: 464,
    displayMode: 'regular',
    largeChartUrl: '',
});

export const NO_MARKET_NEWS =
    '<p class="mobile-text" style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#4b5563;">No market news available today. Please check back tomorrow.</p>';

export const WATCHLIST_TABLE_HEADER = [
    'Company',
    'Symbol',
    'Price',
    'Change',
    'Market Cap',
    'P/E Ratio',
    'Alert',
    'Action',
];
