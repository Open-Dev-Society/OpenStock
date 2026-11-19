import { useFormatter, useTranslations } from 'next-intl';
import { alphaiStockUrl, type AlphaiSentiment, type AlphaiTickerNews } from '@/lib/actions/alphai.helpers';
import { cn } from '@/lib/utils';

interface AlphaiNewsCardProps {
    news: AlphaiTickerNews | null;
}

const SENTIMENT_CLASS: Record<AlphaiSentiment, string> = {
    positive: 'text-up',
    negative: 'text-down',
    neutral: 'text-muted-foreground',
};

export default function AlphaiNewsCard({ news }: AlphaiNewsCardProps) {
    const t = useTranslations('AlphaiNews');
    const format = useFormatter();
    if (!news || news.items.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col">
            <ul className="row-list">
                {news.items.map((item) => (
                    <li key={item.id}>
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-hover/50"
                        >
                            <span
                                className={cn('pill num mt-0.5 w-12 flex-none justify-center', item.relevance >= 7 && 'font-bold text-foreground')}
                                title={t('relevanceHint', { score: item.relevance })}
                            >
                                {t('relevanceValue', { score: item.relevance })}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span dir="auto" className="line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-brand-ink">
                                    {item.title}
                                </span>
                                {item.impact && (
                                    <span dir="auto" className="mt-1 line-clamp-2 block text-[12.5px] text-muted-foreground">
                                        {item.sentiment && (
                                            <span className={cn('font-semibold', SENTIMENT_CLASS[item.sentiment])}>
                                                {t(`sentiment.${item.sentiment}`)}:{' '}
                                            </span>
                                        )}
                                        {/* AlphAI writes in English: isolate it so its punctuation stays put after an Arabic label */}
                                        <bdi>{item.impact}</bdi>
                                    </span>
                                )}
                                <span className="mt-1 block truncate text-[12px] text-faint">
                                    {item.source}
                                    {item.publishedAt ? ` · ${format.relativeTime(new Date(item.publishedAt))}` : ''}
                                    {item.outlets > 1 ? ` · ${t('outlets', { count: item.outlets })}` : ''}
                                </span>
                            </span>
                        </a>
                    </li>
                ))}
            </ul>
            <p className="border-t border-line px-3 py-2.5 text-[12.5px] text-faint">
                {t.rich('scoredBy', {
                    link: (chunks) => (
                        <a
                            href={alphaiStockUrl(news.symbol)}
                            target="_blank"
                            rel="noopener"
                            className="font-semibold text-foreground transition-colors hover:text-brand-ink"
                        >
                            {chunks}
                        </a>
                    ),
                })}
            </p>
        </div>
    );
}
