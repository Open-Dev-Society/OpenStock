'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { openSearchForList } from '@/components/SearchCommand';

// Opens the app's search palette in "add to this list" mode. The palette is mounted once in the
// shell, so the target list travels with the open event rather than through a prop.
export default function AddToListButton({
    listId,
    listName,
    className = 'btn btn-ghost',
}: {
    listId: string;
    listName: string;
    className?: string;
}) {
    const t = useTranslations('NamedLists');
    return (
        <button
            type="button"
            className={className}
            title={t('addStockTo', { list: listName })}
            onClick={() => openSearchForList(listId, listName)}
        >
            <Plus /> {t('addStock')}
        </button>
    );
}
