export const NAV_ITEMS = [
    { href: '/', label: '控制面板' },
    { href: '/search', label: '搜索' },
    { href: '/watchlist', label: '自选列表' },
    { href: '/api-docs', label: '系统架构' },
];

// 注册表单选择项
export const INVESTMENT_GOALS = [
    { value: 'Growth', label: '增长型' },
    { value: 'Income', label: '收益型' },
    { value: 'Balanced', label: '平衡型' },
    { value: 'Conservative', label: '保守型' },
];

export const RISK_TOLERANCE_OPTIONS = [
    { value: 'Low', label: '低' },
    { value: 'Medium', label: '中' },
    { value: 'High', label: '高' },
];

export const PREFERRED_INDUSTRIES = [
    { value: 'Technology', label: '科技' },
    { value: 'Healthcare', label: '医疗保健' },
    { value: 'Finance', label: '金融' },
    { value: 'Energy', label: '能源' },
    { value: 'Consumer Goods', label: '消费品' },
];

export const ALERT_TYPE_OPTIONS = [
    { value: 'upper', label: '上限' },
    { value: 'lower', label: '下限' },
];

export const CONDITION_OPTIONS = [
    { value: 'greater', label: '大于 (>)' },
    { value: 'less', label: '小于 (<)' },
];

// TradingView 图表配置
export const MARKET_OVERVIEW_WIDGET_CONFIG = {
    colorTheme: 'dark', // 暗色模式
    dateRange: '12M', // 最近 12 个月
    locale: 'zh_CN', // 语言
    largeChartUrl: '',
    isTransparent: true,
    showFloatingTooltip: true,
    plotLineColorGrowing: '#0FEDBE',
    plotLineColorFalling: '#0FEDBE',
    gridLineColor: 'rgba(240, 243, 250, 0)',
    scaleFontColor: '#DBDBDB',
    belowLineFillColorGrowing: 'rgba(41, 98, 255, 0.12)',
    belowLineFillColorFalling: 'rgba(41, 98, 255, 0.12)',
    belowLineFillColorGrowingBottom: 'rgba(41, 98, 255, 0)',
    belowLineFillColorFallingBottom: 'rgba(41, 98, 255, 0)',
    symbolActiveColor: 'rgba(15, 237, 190, 0.05)',
    tabs: [
        {
            title: '金融',
            symbols: [
                { s: 'NYSE:JPM', d: '摩根大通' },
                { s: 'NYSE:WFC', d: '富国银行' },
                { s: 'NYSE:BAC', d: '美国银行' },
                { s: 'NYSE:HSBC', d: '汇丰控股' },
                { s: 'NYSE:C', d: '花旗集团' },
                { s: 'NYSE:MA', d: '万事达' },
            ],
        },
        {
            title: '科技',
            symbols: [
                { s: 'NASDAQ:AAPL', d: '苹果' },
                { s: 'NASDAQ:GOOGL', d: '谷歌' },
                { s: 'NASDAQ:MSFT', d: '微软' },
                { s: 'NASDAQ:META', d: 'Meta' },
                { s: 'NYSE:ORCL', d: '甲骨文' },
                { s: 'NASDAQ:INTC', d: '英特尔' },
            ],
        },
        {
            title: '服务',
            symbols: [
                { s: 'NASDAQ:AMZN', d: '亚马逊' },
                { s: 'NYSE:BABA', d: '阿里巴巴' },
                { s: 'NYSE:T', d: 'AT&T' },
                { s: 'NYSE:WMT', d: '沃尔玛' },
                { s: 'NYSE:V', d: '维萨' },
            ],
        },
    ],
    support_host: 'https://www.tradingview.com',
    backgroundColor: '#141414',
    width: '100%',
    height: 600,
    showSymbolLogo: true,
    showChart: true,
};

export const HEATMAP_WIDGET_CONFIG = {
    dataSource: 'SPX500',
    blockSize: 'market_cap_basic',
    blockColor: 'change',
    grouping: 'sector',
    isTransparent: true,
    locale: 'zh_CN',
    symbolUrl: '',
    colorTheme: 'dark',
    exchanges: [],
    hasTopBar: false,
    isDataSetEnabled: false,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: '100%',
    height: '600',
};

export const TOP_STORIES_WIDGET_CONFIG = {
    displayMode: 'regular',
    feedMode: 'market',
    colorTheme: 'dark',
    isTransparent: true,
    locale: 'zh_CN',
    market: 'stock',
    width: '100%',
    height: '600',
};

export const MARKET_DATA_WIDGET_CONFIG = {
    title: '股票',
    width: '100%',
    height: 600,
    locale: 'zh_CN',
    showSymbolLogo: true,
    colorTheme: 'dark',
    isTransparent: false,
    backgroundColor: '#0F0F0F',
    symbolsGroups: [
        {
            name: '金融',
            symbols: [
                { name: 'NYSE:JPM', displayName: '摩根大通' },
                { name: 'NYSE:WFC', displayName: '富国银行' },
                { name: 'NYSE:BAC', displayName: '美国银行' },
                { name: 'NYSE:HSBC', displayName: '汇丰控股' },
                { name: 'NYSE:C', displayName: '花旗集团' },
                { name: 'NYSE:MA', displayName: '万事达' },
            ],
        },
        {
            name: '科技',
            symbols: [
                { name: 'NASDAQ:AAPL', displayName: '苹果' },
                { name: 'NASDAQ:GOOGL', displayName: '谷歌' },
                { name: 'NASDAQ:MSFT', displayName: '微软' },
                { name: 'NASDAQ:FB', displayName: 'Meta' },
                { name: 'NYSE:ORCL', displayName: '甲骨文' },
                { name: 'NASDAQ:INTC', displayName: '英特尔' },
            ],
        },
        {
            name: '服务',
            symbols: [
                { name: 'NASDAQ:AMZN', displayName: '亚马逊' },
                { name: 'NYSE:BABA', displayName: '阿里巴巴' },
                { name: 'NYSE:T', displayName: 'AT&T' },
                { name: 'NYSE:WMT', displayName: '沃尔玛' },
                { name: 'NYSE:V', displayName: '维萨' },
            ],
        },
    ],
};

export const SYMBOL_INFO_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: true,
    locale: 'zh_CN',
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
    locale: 'zh_CN',
    save_image: false,
    style: 1,
    symbol: symbol.toUpperCase(),
    theme: 'dark',
    timezone: 'Etc/UTC',
    backgroundColor: '#141414',
    gridColor: '#141414',
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
    locale: 'zh_CN',
    save_image: false,
    style: 10,
    symbol: symbol.toUpperCase(),
    theme: 'dark',
    timezone: 'Etc/UTC',
    backgroundColor: '#141414',
    gridColor: '#141414',
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
    locale: 'zh_CN',
    width: '100%',
    height: 400,
    interval: '1h',
    largeChartUrl: '',
});

export const COMPANY_PROFILE_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'zh_CN',
    width: '100%',
    height: 440,
});

export const COMPANY_FINANCIALS_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'zh_CN',
    width: '100%',
    height: 464,
    displayMode: 'regular',
    largeChartUrl: '',
});

export const POPULAR_STOCK_SYMBOLS = [
    // 科技巨头
    'AAPL',
    'MSFT',
    'GOOGL',
    'AMZN',
    'TSLA',
    'META',
    'NVDA',
    'NFLX',
    'ORCL',
    'CRM',

    // 成长型科技公司
    'ADBE',
    'INTC',
    'AMD',
    'PYPL',
    'UBER',
    'ZOOM',
    'SPOT',
    'SQ',
    'SHOP',
    'ROKU',

    // 新兴科技公司
    'SNOW',
    'PLTR',
    'COIN',
    'RBLX',
    'DDOG',
    'CRWD',
    'NET',
    'OKTA',
    'TWLO',
    'ZM',

    // 消费与配送应用
    'DOCU',
    'PTON',
    'PINS',
    'SNAP',
    'LYFT',
    'DASH',
    'ABNB',
    'RIVN',
    'LCID',
    'NIO',

    // 国际化公司
    'XPEV',
    'LI',
    'BABA',
    'JD',
    'PDD',
    'TME',
    'BILI',
    'DIDI',
    'GRAB',
    'SE',
];

export const NO_MARKET_NEWS =
    '<p class="mobile-text" style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#4b5563;">今日暂无市场新闻。请明天再来查看。</p>';

export const WATCHLIST_TABLE_HEADER = [
    '公司',
    '代码',
    '价格',
    '涨跌',
    '市值',
    '市盈率',
    '提醒',
    '操作',
];